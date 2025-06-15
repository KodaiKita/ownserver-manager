# 動的エンドポイント管理

## 概要

OwnServer Managerでは、kumassyアドレスが毎回変更される特性を考慮し、エンドポイントを設定ファイルで静的に指定するのではなく、ownserverの出力から動的に取得する方式を採用しています。

## 設計理念

### なぜ静的設定ファイルを使わないのか

1. **kumassyアドレスの特性**
   - `shard-XXXX.ownserver.kumassy.com` のようなアドレスは毎回ランダムに生成される
   - 静的な設定ファイルで指定しても、次回起動時には無効になる
   - 設定ファイルの更新を忘れると接続が失敗する

2. **動的取得の利点**
   - ownserverの出力から自動的にエンドポイントを検出
   - 手動設定の必要がない
   - 常に最新の有効なエンドポイントを使用

## 実装方式

### 1. エンドポイント検出

```javascript
// ownserverプロセスの出力を監視
ownserverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    
    // kumassyアドレスパターンを検出
    const endpointMatch = output.match(/shard-\d+\.ownserver\.kumassy\.com:\d+/);
    
    if (endpointMatch) {
        const endpoint = endpointMatch[0];
        // DNS更新処理をトリガー
        this.updateDNS(endpoint);
    }
});
```

### 2. DNS自動更新

```javascript
async updateDNS(endpoint) {
    try {
        const { host, port } = this.parseEndpoint(endpoint);
        
        // CloudFlare DNS設定を更新
        await this.cloudflareManager.setMinecraftDNS(
            this.config.cloudflare.subdomain + '.' + this.config.cloudflare.domain,
            endpoint
        );
        
        this.logger.info(`DNS updated: ${endpoint}`);
    } catch (error) {
        this.logger.error('DNS update failed:', error);
    }
}
```

### 3. 設定ファイル構造

```json
{
  "cloudflare": {
    "domain": "yourdomain.com",
    "subdomain": "play",
    "ttl": 60,
    "apiToken": "YOUR_CLOUDFLARE_API_TOKEN",
    "zoneId": "YOUR_CLOUDFLARE_ZONE_ID",
    "_endpoint_note": "ownserverエンドポイントは動的に取得されます",
    "_endpoint_format": "例: shard-2509.ownserver.kumassy.com:15440",
    "defaultPort": 25565,
    "enableAutoUpdate": true
  }
}
```

## フロー図

```
1. ownserver起動
   ↓
2. 出力監視開始
   ↓
3. kumassyアドレス検出
   ↓
4. エンドポイント解析 (host:port)
   ↓
5. CloudFlare DNS更新
   ↓
6. 接続可能状態
```

## エラーハンドリング

### 1. エンドポイント検出失敗

```javascript
// タイムアウト設定
const ENDPOINT_DETECTION_TIMEOUT = 120000; // 2分

setTimeout(() => {
    if (!this.currentEndpoint) {
        this.logger.error('Endpoint detection timeout');
        this.emit('endpointTimeout');
    }
}, ENDPOINT_DETECTION_TIMEOUT);
```

### 2. DNS更新失敗

```javascript
async updateDNSWithRetry(endpoint, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await this.updateDNS(endpoint);
            return;
        } catch (error) {
            this.logger.warn(`DNS update retry ${i + 1}/${maxRetries}:`, error);
            if (i === maxRetries - 1) throw error;
            
            // 指数バックオフ
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
}
```

## 監視・ログ

### 1. エンドポイント変更追跡

```javascript
this.endpointHistory = [];

onEndpointDetected(endpoint) {
    this.endpointHistory.push({
        endpoint,
        timestamp: new Date(),
        status: 'detected'
    });
    
    // 履歴保持数制限
    if (this.endpointHistory.length > 100) {
        this.endpointHistory = this.endpointHistory.slice(-50);
    }
}
```

### 2. DNS更新状況

```javascript
this.dnsUpdateLog = {
    lastUpdate: null,
    updateCount: 0,
    lastEndpoint: null,
    errors: []
};
```

## テスト方式

### 1. 単体テスト

```javascript
describe('Dynamic Endpoint Management', () => {
    it('should parse kumassy endpoint correctly', () => {
        const endpoint = 'shard-2509.ownserver.kumassy.com:15440';
        const { host, port } = manager.parseEndpoint(endpoint);
        
        expect(host).toBe('shard-2509.ownserver.kumassy.com');
        expect(port).toBe(15440);
    });
});
```

### 2. 統合テスト

```javascript
// ownserver出力シミュレーション
const mockOwnserverOutput = `
Server started successfully
Endpoint: shard-1234.ownserver.kumassy.com:25565
Ready for connections
`;

// DNS更新確認
await manager.processOwnserverOutput(mockOwnserverOutput);
expect(manager.currentEndpoint).toBe('shard-1234.ownserver.kumassy.com:25565');
```

## 利点

1. **自動化**: 手動設定不要
2. **確実性**: 常に有効なエンドポイントを使用
3. **堅牢性**: エラー処理・リトライ機能
4. **追跡性**: 詳細なログ・履歴

## 注意事項

1. **ownserver出力形式への依存**: 出力形式が変更された場合は検出ロジックの更新が必要
2. **ネットワーク依存**: DNS更新にはインターネット接続が必要
3. **レート制限**: CloudFlare APIのレート制限に注意

## 今後の改善点

1. **複数エンドポイント対応**: 冗長化・負荷分散
2. **健全性チェック**: エンドポイントの生存確認
3. **キャッシュ機能**: 一時的なDNS更新失敗への対応
