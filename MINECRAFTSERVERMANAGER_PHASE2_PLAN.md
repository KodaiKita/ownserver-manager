# MinecraftServerManager Phase2 開発計画書

**作成日**: 2025年6月13日  
**開発対象**: MinecraftServerManager Phase2  
**予定期間**: 3-4時間  
**基盤**: Phase1の安定した実装

## 🎯 Phase2の目標

### コアコンセプト
Phase1の基本プロセス管理に、**高度な監視・制御機能**を追加し、実用的なMinecraftサーバー管理システムを構築。

### 主要機能
1. **リアルタイムログ解析・パース**
2. **コンソールコマンド送信機能**
3. **サーバー状態自動検出**
4. **プレイヤー参加/離脱監視**
5. **自動再起動機能（設定可能）**
6. **詳細エラー分類・ログ**

## 🏗️ 実装設計

### アーキテクチャ拡張
```
MinecraftServerManager_Phase2 (extends Phase1)
├── Phase1 基盤機能
│   ├── Java管理・プロセス制御
│   ├── 基本ログ統合
│   └── エラーハンドリング
└── Phase2 新機能
    ├── ログパーサー・状態検出
    ├── コマンド送信・応答処理
    ├── プレイヤー監視・イベント
    └── 自動再起動・ヘルスチェック
```

### 新規APIメソッド
```javascript
// コマンド制御
await manager.sendCommand(command)      // コンソールコマンド送信
await manager.sendCommandWithResponse(command, timeout) // 応答付きコマンド

// 状態監視
manager.getServerState()                // 詳細サーバー状態
manager.getPlayerCount()                // オンラインプレイヤー数
manager.getPlayerList()                 // プレイヤーリスト
manager.isServerReady()                 // サーバー準備完了状態

// 自動機能
manager.enableAutoRestart(config)       // 自動再起動有効化
manager.disableAutoRestart()            // 自動再起動無効化

// 設定・プロパティ
manager.getServerProperties()           // server.propertiesの読み取り
await manager.updateServerProperty(key, value) // プロパティ更新
```

### 新規イベント
```javascript
// サーバー状態
manager.on('server-ready', (data) => {})    // サーバー起動完了
manager.on('server-stopping', (data) => {}) // サーバー停止開始

// プレイヤー監視
manager.on('player-join', (player) => {})   // プレイヤー参加
manager.on('player-leave', (player) => {})  // プレイヤー離脱
manager.on('player-count-changed', (count) => {}) // プレイヤー数変化

// 自動機能
manager.on('auto-restart-triggered', (reason) => {}) // 自動再起動実行
manager.on('health-check-failed', (details) => {})   // ヘルスチェック失敗
```

## 📝 実装詳細

### 1. ログパーサー・状態検出
```javascript
class LogParser {
    parseLogLine(line) {
        // 正規表現によるログ解析
        const patterns = {
            serverReady: /\[.*\]: Done \(.*\)! For help, type/,
            playerJoin: /\[.*\]: (.*) joined the game/,
            playerLeave: /\[.*\]: (.*) left the game/,
            serverStopping: /\[.*\]: Stopping server/,
            errorPattern: /\[.*ERROR.*\]:/
        };
        
        // パターンマッチング・イベント発火
    }
}
```

### 2. コマンド送信機能
```javascript
async sendCommand(command) {
    if (!this.isServerRunning()) {
        throw new Error('Server is not running');
    }
    
    // stdinにコマンド送信
    this.process.stdin.write(command + '\n');
    
    this.logger.info('Command sent', { command });
    this.emit('command-sent', { command, timestamp: new Date() });
}
```

### 3. プレイヤー監視機能
```javascript
_parsePlayerJoin(logLine) {
    const match = logLine.match(/\[.*\]: (.*) joined the game/);
    if (match) {
        const playerName = match[1];
        this.onlinePlayers.add(playerName);
        
        this.emit('player-join', {
            player: playerName,
            count: this.onlinePlayers.size,
            timestamp: new Date()
        });
    }
}
```

### 4. 自動再起動機能
```javascript
enableAutoRestart(config = {}) {
    this.autoRestartConfig = {
        enabled: true,
        conditions: {
            maxMemoryUsage: config.maxMemoryUsage || '90%',
            maxUptime: config.maxUptime || 24 * 60 * 60 * 1000, // 24時間
            onCrash: config.onCrash !== false,
            onPlayerEmpty: config.onPlayerEmpty || false
        },
        gracePeriod: config.gracePeriod || 60000, // 1分
        ...config
    };
    
    this._startHealthChecks();
}
```

## 🧪 テスト戦略

### 単体テスト
```javascript
// tests/minecraft/MinecraftServerManager_Phase2.test.js
describe('MinecraftServerManager Phase2', () => {
    test('should send commands to server', async () => {
        const manager = new MinecraftServerManager_Phase2();
        await manager.start();
        
        const result = await manager.sendCommand('say Hello World');
        expect(result).toBeDefined();
    });
    
    test('should detect player join/leave', (done) => {
        manager.on('player-join', (data) => {
            expect(data.player).toBe('TestPlayer');
            done();
        });
        
        // ログラインをシミュレート
        manager._parseLogLine('[INFO]: TestPlayer joined the game');
    });
});
```

### 統合テスト
```javascript
// tests/minecraft/MinecraftPracticalTest_Phase2.js
class MinecraftPracticalTest_Phase2 {
    async testFullServerLifecycle() {
        // Phase2機能の実践的テスト
        // - サーバー起動・コマンド送信・プレイヤー監視・停止
    }
}
```

## 📚 ドキュメント更新

### 実装ガイド更新
- `docs/implementation/MinecraftServerManager-Implementation-ja.md`
- Phase2機能の使用例・API仕様を追加

### 完成報告書作成
- `MINECRAFTSERVERMANAGER_PHASE2_COMPLETE_JA.md`
- Phase2達成度・テスト結果・次期計画

## 🗂️ ファイル構成

### 新規作成ファイル
```
src/utils/development-phases/
├── MinecraftServerManager_Phase2.js    # Phase2メイン実装
└── LogParser.js                        # ログ解析ユーティリティ

tests/minecraft/
├── MinecraftServerManager_Phase2.test.js    # Phase2単体テスト
└── MinecraftPracticalTest_Phase2.js         # Phase2実践テスト

docs/implementation/
└── MinecraftServerManager-Phase2-Implementation-ja.md  # Phase2実装ガイド
```

### 更新ファイル
```
src/managers/MinecraftServerManager.js   # Phase2に段階的アップグレード
docs/implementation/MinecraftServerManager-Implementation-ja.md  # 機能追加
docs/README.md                          # ドキュメント索引更新
README.md                               # プロジェクト状況更新
```

## 🔄 開発フロー

### Phase1 → Phase2移行戦略
1. **段階的実装**: Phase1は安定版として維持
2. **後方互換性**: Phase1 APIは完全保持
3. **テスト最優先**: 各機能実装後即座にテスト実行
4. **文書化同期**: 実装と同時にドキュメント更新

### 品質保証
- **コードレビュー**: Git運用ルールに従った開発
- **実践テスト**: 実際のMinecraftサーバーでのテスト実行
- **エラーハンドリング**: Phase1同等の堅牢性確保

## 📈 成功指標

### 技術的目標
- ✅ コマンド送信成功率 95%+
- ✅ ログ解析精度 98%+ 
- ✅ プレイヤー検出精度 100%
- ✅ 自動再起動機能動作確認
- ✅ Phase1機能の安定性維持

### 統合目標
- ✅ 既存Logger・ConfigManagerとの完全連携
- ✅ Phase1からのスムーズなアップグレード
- ✅ ドキュメント完全性・実用性

## 🚀 次のステップ

Phase2完了後は、**Phase3: ownserver連携**に進み、外部公開機能を実装予定。

---

**策定者**: AI Assistant  
**レビュー**: 必要に応じて技術レビューを実施  
**更新履歴**: 2025年6月13日 - 初版作成
