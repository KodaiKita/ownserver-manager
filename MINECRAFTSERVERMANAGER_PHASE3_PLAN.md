# MinecraftServerManager Phase3 開発計画書

**作成日**: 2025年6月13日  
**開発対象**: MinecraftServerManager Phase3 - OwnServer連携  
**予定期間**: 4-5時間  
**基盤**: Phase2の完成した実装

## 🎯 Phase3の目標

### コアコンセプト
Phase2の高度な監視・制御機能に、**外部公開・ownserver連携機能**を追加し、完全なMinecraftサーバー公開システムを構築。

### 主要機能
1. **OwnServer自動管理・制御**
2. **CloudFlare DNS自動更新**
3. **外部アクセス管理・監視**
4. **統合ヘルスチェック・自動復旧**
5. **外部公開状態の一元管理**
6. **セキュリティ・アクセス制御**

## 🏗️ Phase3実装設計

### アーキテクチャ拡張
```
MinecraftServerManager_Phase3 (extends Phase2)
├── Phase2 基盤機能
│   ├── リアルタイムログ解析・制御
│   ├── プレイヤー監視・自動再起動
│   └── コマンド送信・状態管理
└── Phase3 新機能
    ├── OwnServerManager - ownserver制御
    ├── CloudFlareManager - DNS管理
    ├── PublicAccessManager - 外部公開管理
    └── IntegratedHealthCheck - 統合監視
```

### 新規APIメソッド
```javascript
// OwnServer制御
await manager.startOwnServer()              // ownserver起動
await manager.stopOwnServer()               // ownserver停止
await manager.restartOwnServer()            // ownserver再起動
manager.getOwnServerStatus()                // ownserver状態

// 外部公開管理
await manager.enablePublicAccess()         // 外部公開開始
await manager.disablePublicAccess()        // 外部公開停止
manager.getPublicAccessStatus()            // 公開状態取得
manager.getPublicEndpoint()                // 公開エンドポイント

// CloudFlare連携
await manager.updateDNSRecord(subdomain)   // DNS更新
await manager.removeDNSRecord()            // DNS削除
manager.getDNSStatus()                     // DNS状態

// 統合管理
manager.getIntegratedStatus()              // 全体状態
await manager.startFullStack()             // 全システム起動
await manager.stopFullStack()              // 全システム停止
```

### 新規イベント
```javascript
// OwnServer状態
manager.on('ownserver-started', (data) => {})      // ownserver起動
manager.on('ownserver-stopped', (data) => {})      // ownserver停止
manager.on('ownserver-error', (error) => {})       // ownserver エラー

// 外部公開状態
manager.on('public-access-enabled', (endpoint) => {})   // 公開開始
manager.on('public-access-disabled', () => {})          // 公開停止
manager.on('endpoint-changed', (newEndpoint) => {})     // エンドポイント変更

// 統合監視
manager.on('full-stack-ready', (status) => {})     // 全システム準備完了
manager.on('integrated-health-check', (result) => {}) // 統合ヘルスチェック
manager.on('auto-recovery-triggered', (action) => {}) // 自動復旧実行
```

## 📝 実装詳細

### 1. OwnServerManager
```javascript
class OwnServerManager {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.process = null;
        this.status = 'stopped';
        this.endpoint = null;
    }
    
    async start() {
        // ownserver バイナリ実行
        // プロセス監視・ログ解析
        // エンドポイント検出
    }
    
    async stop() {
        // ownserver 停止処理
        // クリーンアップ
    }
    
    getStatus() {
        return {
            status: this.status,
            endpoint: this.endpoint,
            uptime: this.getUptime(),
            processId: this.process?.pid
        };
    }
}
```

### 2. CloudFlareManager
```javascript
class CloudFlareManager {
    constructor(config, logger) {
        this.apiToken = config.cloudflare.apiToken;
        this.zoneId = config.cloudflare.zoneId;
        this.domain = config.cloudflare.domain;
        this.logger = logger;
    }
    
    async updateRecord(subdomain, target) {
        // CloudFlare API呼び出し
        // DNSレコード更新
        // 結果検証
    }
    
    async deleteRecord(subdomain) {
        // DNSレコード削除
    }
    
    async getRecords() {
        // 現在のDNSレコード取得
    }
}
```

### 3. PublicAccessManager
```javascript
class PublicAccessManager {
    constructor(ownServerManager, cloudFlareManager, logger) {
        this.ownServerManager = ownServerManager;
        this.cloudFlareManager = cloudFlareManager;
        this.logger = logger;
        this.publicStatus = 'disabled';
    }
    
    async enable(subdomain) {
        // 1. OwnServer起動確認
        // 2. エンドポイント取得
        // 3. CloudFlare DNS更新
        // 4. 接続性確認
    }
    
    async disable() {
        // 1. DNS削除
        // 2. OwnServer停止（オプション）
        // 3. 状態クリア
    }
}
```

### 4. 統合ヘルスチェック
```javascript
class IntegratedHealthCheck {
    async checkMinecraftServer() {
        // Minecraftサーバー状態確認
    }
    
    async checkOwnServer() {
        // OwnServer状態・接続確認
    }
    
    async checkDNS() {
        // DNS解決確認
    }
    
    async checkPublicConnectivity() {
        // 外部からの接続確認
    }
    
    async performIntegratedCheck() {
        // 全要素の統合チェック
        // 問題検出時の自動復旧
    }
}
```

## 🧪 テスト戦略

### 単体テスト
```javascript
// tests/ownserver/OwnServerManager.test.js
describe('OwnServerManager', () => {
    test('should start ownserver process', async () => {
        const manager = new OwnServerManager(config);
        await manager.start();
        expect(manager.getStatus().status).toBe('running');
    });
});

// tests/cloudflare/CloudFlareManager.test.js
describe('CloudFlareManager', () => {
    test('should update DNS record', async () => {
        const manager = new CloudFlareManager(config);
        const result = await manager.updateRecord('minecraft', 'endpoint');
        expect(result.success).toBe(true);
    });
});
```

### 統合テスト
```javascript
// tests/integration/Phase3Integration.test.js
describe('Phase3 Integration', () => {
    test('should enable full public access', async () => {
        const manager = new MinecraftServerManager_Phase3();
        await manager.startFullStack();
        
        const status = manager.getIntegratedStatus();
        expect(status.minecraft).toBe('running');
        expect(status.ownserver).toBe('running');
        expect(status.publicAccess).toBe('enabled');
    });
});
```

## 📚 設定管理

### Phase3設定拡張
```javascript
{
  // 既存Phase1, Phase2設定...
  
  // Phase3新規設定
  "ownserver": {
    "binaryPath": "/app/bin/ownserver",
    "autoStart": true,
    "restartOnFailure": true,
    "healthCheckInterval": 30000,
    "startupTimeout": 60000
  },
  
  "cloudflare": {
    "apiToken": "your-cloudflare-api-token",
    "zoneId": "your-zone-id", 
    "domain": "example.com",
    "subdomain": "minecraft",
    "ttl": 60,
    "proxied": false
  },
  
  "publicAccess": {
    "autoEnable": false,
    "healthCheckEnabled": true,
    "connectivityTestInterval": 60000,
    "autoRecovery": true
  },
  
  "integration": {
    "startupSequence": ["minecraft", "ownserver", "dns"],
    "shutdownSequence": ["dns", "ownserver", "minecraft"],
    "healthCheckInterval": 30000,
    "autoRecoveryEnabled": true
  }
}
```

## 🗂️ ファイル構成

### 新規作成ファイル
```
src/utils/development-phases/
├── MinecraftServerManager_Phase3.js    # Phase3メイン実装
├── OwnServerManager.js                  # OwnServer制御
├── CloudFlareManager.js                 # CloudFlare API管理
├── PublicAccessManager.js               # 外部公開管理
└── IntegratedHealthCheck.js             # 統合ヘルスチェック

tests/ownserver/
├── OwnServerManager.test.js             # OwnServer単体テスト
└── OwnServerPractical.test.js           # OwnServer実践テスト

tests/cloudflare/
├── CloudFlareManager.test.js            # CloudFlare単体テスト
└── CloudFlarePractical.test.js          # CloudFlare実践テスト

tests/integration/
├── Phase3Integration.test.js            # Phase3統合テスト
└── FullStackTest.js                     # 全システム統合テスト
```

### 更新ファイル
```
src/managers/MinecraftServerManager.js   # Phase3に段階的アップグレード
config/config.json                       # Phase3設定追加
package.json                             # Phase3依存関係追加
```

## 🔄 開発フロー

### Phase2 → Phase3移行戦略
1. **段階的実装**: Phase2は完全保持、Phase3として拡張
2. **後方互換性**: Phase1, Phase2 APIは完全保持
3. **独立性**: 各コンポーネントは独立して動作可能
4. **統合性**: 全システムの統合管理機能提供

### 実装順序
1. **OwnServerManager**: ownserver制御基盤
2. **CloudFlareManager**: DNS管理機能
3. **PublicAccessManager**: 外部公開制御統合
4. **IntegratedHealthCheck**: 統合監視・自動復旧
5. **MinecraftServerManager_Phase3**: 全機能統合

## 📈 成功指標

### 技術的目標
- ✅ OwnServer制御成功率 95%+
- ✅ DNS更新成功率 98%+
- ✅ 外部接続確立成功率 95%+
- ✅ 統合ヘルスチェック精度 99%+
- ✅ Phase1, Phase2機能の完全保持

### 統合目標
- ✅ ワンコマンドでの完全な外部公開
- ✅ 自動復旧・障害対応システム
- ✅ リアルタイム統合監視ダッシュボード
- ✅ 設定ベースの柔軟な運用

## 🚀 Phase3完成後のビジョン

Phase3完了により、ownserver-managerは：
- **完全自動化されたMinecraft公開システム**
- **CloudFlare統合による高可用性DNS**
- **統合監視・自動復旧システム**
- **エンタープライズレベルの運用機能**

として完成し、本格的な本番運用が可能になります。

---

**策定者**: AI Assistant  
**レビュー**: Phase3開発開始前の技術レビュー実施  
**更新履歴**: 2025年6月13日 - Phase3計画初版作成
