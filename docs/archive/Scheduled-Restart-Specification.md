# 定期再起動機能 実装仕様書

## 概要

**機能名**: 定期再起動・スケジュール機能  
**実装ステータス**: 保留中（Phase4以降での実装予定）  
**現在の状況**: CLIオプション存在、機能未実装

## 現在のコード状況

### 既存実装
```javascript
// src/commands/cli.js - Line 154, 1196-1199
.option('--schedule <time>', 'Schedule maintenance at specific time')

if (options.schedule) {
    console.log(`⏰ Scheduling maintenance at: ${options.schedule}`);
    console.log('💡 Scheduled maintenance will be implemented in future versions');
    console.log('   For now, use cron jobs for scheduled tasks');
}
```

### 現在の制限
- `--schedule`オプションは存在するが機能しない
- 「今後実装予定」として表示のみ
- 手動またはcronジョブでの運用を推奨

## 実装予定仕様

### 1. 基本機能

#### CLIコマンド仕様
```bash
# 定期再起動設定
node src/commands/cli.js schedule --add daily --time "04:00" --type restart
node src/commands/cli.js schedule --add weekly --day sunday --time "03:00" --type full-restart

# スケジュール管理
node src/commands/cli.js schedule --list
node src/commands/cli.js schedule --remove daily-restart
node src/commands/cli.js schedule --enable daily-restart
node src/commands/cli.js schedule --disable daily-restart

# 手動予約実行
node src/commands/cli.js restart --at "2025-06-15 04:00"
node src/commands/cli.js restart --in "30m"
node src/commands/cli.js maintenance --schedule "0 4 * * *"
```

#### 設定ファイル仕様
```json
{
  "schedule": {
    "enabled": true,
    "timezone": "Asia/Tokyo",
    "restarts": [
      {
        "id": "daily-restart",
        "name": "Daily Server Restart",
        "cron": "0 4 * * *",
        "type": "restart",
        "enabled": true,
        "options": {
          "warningTime": 300,
          "notification": true,
          "saveBeforeRestart": true,
          "updateCheck": false
        }
      },
      {
        "id": "weekly-maintenance",
        "name": "Weekly Full Maintenance",
        "cron": "0 3 * * 0",
        "type": "full-restart",
        "enabled": true,
        "options": {
          "warningTime": 600,
          "notification": true,
          "saveBeforeRestart": true,
          "updateCheck": true,
          "cleanupLogs": true,
          "backupConfig": true
        }
      }
    ],
    "notifications": {
      "enabled": true,
      "methods": ["ingame", "discord", "log"],
      "warningMessages": [
        "Server restart in 10 minutes!",
        "Server restart in 5 minutes!",
        "Server restart in 1 minute!"
      ]
    }
  }
}
```

### 2. 実装アーキテクチャ

#### ScheduleManager クラス
```javascript
// src/utils/ScheduleManager.js (実装予定)
const cron = require('node-cron');

class ScheduleManager {
    constructor(config, logger, appManager) {
        this.config = config.schedule || {};
        this.logger = logger;
        this.appManager = appManager;
        this.jobs = new Map();
        this.isEnabled = this.config.enabled || false;
    }

    // 初期化・スケジュール登録
    async initialize() {
        if (!this.isEnabled) {
            this.logger.info('Schedule management is disabled');
            return;
        }

        const schedules = this.config.restarts || [];
        for (const schedule of schedules) {
            if (schedule.enabled) {
                await this.addSchedule(schedule);
            }
        }
        
        this.logger.info(`Loaded ${this.jobs.size} scheduled tasks`);
    }

    // スケジュール追加
    async addSchedule(schedule) {
        try {
            const job = cron.schedule(schedule.cron, async () => {
                await this.executeScheduledTask(schedule);
            }, {
                scheduled: false,
                timezone: this.config.timezone || 'Asia/Tokyo'
            });

            this.jobs.set(schedule.id, {
                job: job,
                config: schedule,
                lastRun: null,
                nextRun: null
            });

            job.start();
            this.logger.info(`Scheduled task added: ${schedule.name} (${schedule.cron})`);
            
        } catch (error) {
            this.logger.error(`Failed to add schedule ${schedule.id}:`, error);
        }
    }

    // スケジュール実行
    async executeScheduledTask(schedule) {
        const startTime = new Date();
        this.logger.info(`Executing scheduled task: ${schedule.name}`);

        try {
            // 事前通知
            if (schedule.options.notification && schedule.options.warningTime > 0) {
                await this.sendPreNotification(schedule);
                await this.sleep(schedule.options.warningTime * 1000);
            }

            // メンテナンス実行
            switch (schedule.type) {
                case 'restart':
                    await this.executeRestart(schedule);
                    break;
                case 'full-restart':
                    await this.executeFullRestart(schedule);
                    break;
                case 'maintenance':
                    await this.executeMaintenance(schedule);
                    break;
                default:
                    throw new Error(`Unknown task type: ${schedule.type}`);
            }

            const duration = new Date() - startTime;
            this.logger.info(`Scheduled task completed: ${schedule.name} (${duration}ms)`);

        } catch (error) {
            this.logger.error(`Scheduled task failed: ${schedule.name}`, error);
            await this.handleTaskFailure(schedule, error);
        }
    }

    // 再起動実行
    async executeRestart(schedule) {
        const options = schedule.options || {};

        // 1. セーブ実行
        if (options.saveBeforeRestart) {
            await this.appManager.minecraft.saveAll();
        }

        // 2. プレイヤー通知
        if (options.notification) {
            await this.notifyPlayers('Server restarting...');
        }

        // 3. サーバー再起動
        await this.appManager.restart();

        // 4. 完了通知
        await this.notifyPlayers('Server restart completed!');
    }

    // フル再起動実行
    async executeFullRestart(schedule) {
        const options = schedule.options || {};

        // 1. 設定バックアップ
        if (options.backupConfig) {
            await this.backupConfiguration();
        }

        // 2. ログクリーンアップ
        if (options.cleanupLogs) {
            await this.cleanupLogs();
        }

        // 3. アップデート確認
        if (options.updateCheck) {
            await this.checkForUpdates();
        }

        // 4. 通常の再起動実行
        await this.executeRestart(schedule);
    }

    // 手動スケジュール（一回限り）
    async scheduleOneTime(datetime, taskType, options = {}) {
        const scheduleId = `onetime_${Date.now()}`;
        const cronExpression = this.dateToCron(datetime);

        const schedule = {
            id: scheduleId,
            name: `One-time ${taskType}`,
            cron: cronExpression,
            type: taskType,
            enabled: true,
            options: options,
            oneTime: true
        };

        await this.addSchedule(schedule);
        
        // 一回実行後に削除
        setTimeout(() => {
            this.removeSchedule(scheduleId);
        }, datetime.getTime() - Date.now() + 60000);

        return scheduleId;
    }

    // ユーティリティ関数
    dateToCron(date) {
        return `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async notifyPlayers(message) {
        // Minecraft内通知実装
        // Discord/Slack通知実装
    }
}
```

#### CLI統合
```javascript
// src/commands/cli.js に追加予定

// schedule コマンド
program
    .command('schedule')
    .description('Manage scheduled tasks')
    .option('--add <type>', 'Add new schedule')
    .option('--list', 'List all schedules')
    .option('--remove <id>', 'Remove schedule')
    .option('--enable <id>', 'Enable schedule')
    .option('--disable <id>', 'Disable schedule')
    .option('--time <time>', 'Time (HH:MM format)')
    .option('--cron <expression>', 'Cron expression')
    .action(this.handleSchedule.bind(this));

async handleSchedule(options) {
    const app = await this.getApp();
    const scheduler = app.scheduleManager;

    if (options.list) {
        const schedules = scheduler.listSchedules();
        console.table(schedules);
    } else if (options.add) {
        await scheduler.addScheduleFromCLI(options);
        console.log('✅ Schedule added successfully');
    } else if (options.remove) {
        await scheduler.removeSchedule(options.remove);
        console.log('✅ Schedule removed successfully');
    }
    // ... その他の操作
}

// restart コマンドの拡張
program
    .command('restart')
    .option('--at <datetime>', 'Schedule restart at specific time')
    .option('--in <duration>', 'Schedule restart in duration (e.g., 30m, 2h)')
    .option('--warning <seconds>', 'Warning time before restart')
    .action(this.handleRestart.bind(this));
```

### 3. 通知システム

#### 実装予定通知方法
```javascript
// src/utils/NotificationManager.js (実装予定)
class NotificationManager {
    constructor(config) {
        this.config = config;
        this.channels = {};
        
        if (config.discord?.enabled) {
            this.channels.discord = new DiscordNotifier(config.discord);
        }
        if (config.slack?.enabled) {
            this.channels.slack = new SlackNotifier(config.slack);
        }
        if (config.email?.enabled) {
            this.channels.email = new EmailNotifier(config.email);
        }
    }

    async sendScheduleNotification(type, schedule, data = {}) {
        const message = this.buildMessage(type, schedule, data);
        
        for (const [name, channel] of Object.entries(this.channels)) {
            try {
                await channel.send(message);
            } catch (error) {
                console.error(`Failed to send ${name} notification:`, error);
            }
        }
    }

    buildMessage(type, schedule, data) {
        const templates = {
            warning: `⚠️ Scheduled ${schedule.type} in ${data.minutes} minutes: ${schedule.name}`,
            started: `🔄 Started scheduled ${schedule.type}: ${schedule.name}`,
            completed: `✅ Completed scheduled ${schedule.type}: ${schedule.name} (${data.duration}ms)`,
            failed: `❌ Failed scheduled ${schedule.type}: ${schedule.name} - ${data.error}`
        };
        
        return templates[type] || `📅 Schedule event: ${schedule.name}`;
    }
}
```

### 4. 設定管理

#### スケジュール設定の動的更新
```javascript
// src/utils/ScheduleConfigManager.js (実装予定)
class ScheduleConfigManager {
    constructor(configPath, scheduleManager) {
        this.configPath = configPath;
        this.scheduleManager = scheduleManager;
        this.watcher = null;
    }

    // 設定ファイル監視開始
    startWatching() {
        const fs = require('fs');
        this.watcher = fs.watchFile(this.configPath, async (curr, prev) => {
            console.log('Schedule configuration changed, reloading...');
            await this.reloadSchedules();
        });
    }

    // スケジュール再読み込み
    async reloadSchedules() {
        try {
            const newConfig = require(this.configPath);
            await this.scheduleManager.updateSchedules(newConfig.schedule);
            console.log('✅ Schedule configuration reloaded');
        } catch (error) {
            console.error('❌ Failed to reload schedule configuration:', error);
        }
    }
}
```

## セキュリティ・安全性考慮

### 1. 安全な再起動
- プレイヤー事前通知（設定可能な猶予時間）
- データ保存確認
- 実行前の最終確認プロンプト（手動実行時）

### 2. 障害対策
- スケジュール実行失敗時の通知
- リトライ機能（設定可能）
- 緊急停止機能

### 3. 権限管理
- スケジュール変更の権限制御
- 設定ファイル保護
- 監査ログ記録

## テスト計画

### 1. 単体テスト
```javascript
// tests/ScheduleManager.test.js (実装予定)
describe('ScheduleManager', () => {
    test('should parse cron expressions correctly', () => {
        // cron式の解析テスト
    });
    
    test('should execute scheduled tasks', async () => {
        // スケジュール実行テスト
    });
    
    test('should handle task failures gracefully', async () => {
        // 失敗処理テスト
    });
});
```

### 2. 統合テスト
- 実際のMinecraftサーバーでの再起動テスト
- 複数スケジュール同時実行テスト
- 長期間運用テスト

## 運用ガイド

### 1. 推奨設定
```json
{
  "schedule": {
    "enabled": true,
    "timezone": "Asia/Tokyo",
    "restarts": [
      {
        "id": "daily-restart",
        "cron": "0 4 * * *",
        "type": "restart",
        "options": {
          "warningTime": 300,
          "notification": true
        }
      }
    ]
  }
}
```

### 2. 運用上の注意事項
- プレイヤーの活動時間を避けたスケジュール設定
- 重要なイベント期間中のスケジュール無効化
- バックアップと組み合わせた運用

### 3. トラブルシューティング
- スケジュール実行ログの確認方法
- 失敗したタスクの手動実行方法
- 緊急時のスケジュール無効化手順

---

**作成日**: 2025年6月14日  
**実装予定**: Phase4以降  
**優先度**: 高（長期運用には必須）  
**依存関係**: node-cron, 通知システム, 設定管理システム  

**注意**: この仕様書は実装計画であり、現在は機能していません。
