# CloudFlare DNS設定完全ガイド

## 概要
このガイドでは、OwnServer ManagerでCloudFlare DNSを使用するための詳細な設定手順を説明します。

## 前提条件
- CloudFlareアカウント
- 管理対象のドメイン
- ドメインのネームサーバーがCloudFlareに設定済み

## ステップ1: CloudFlareアカウント設定

### 1.1 アカウント作成・ドメイン追加
1. [CloudFlare](https://www.cloudflare.com)でアカウント作成
2. **「サイトを追加」**をクリック
3. ドメイン名を入力（例: `yourdomain.com`）
4. 無料プランを選択
5. DNSレコードスキャン完了まで待機

### 1.2 ネームサーバー変更
1. CloudFlareが提供するネームサーバー情報をメモ
   ```
   例:
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
2. ドメイン管理会社でネームサーバーを変更
3. 変更反映まで24-48時間待機

### 1.3 SSL/TLS設定
1. **「SSL/TLS」** → **「概要」**
2. 暗号化モードを**「フル」**に設定
3. **「エッジ証明書」**で「常にHTTPS使用」を有効化

## ステップ2: API認証設定

### 2.1 APIトークン作成（推奨）
1. **プロファイル** → **「APIトークン」**
2. **「トークンを作成」**をクリック
3. **「カスタムトークン」**を選択
4. 以下の設定で作成：

#### 権限設定
```
Zone | Zone Settings | Read
Zone | Zone | Read  
Zone | DNS | Edit
```

#### ゾーンリソース
```
Include | Specific zone | yourdomain.com
```

#### IPアドレス制限（オプション）
```
Is in | [サーバーのIPアドレス]
```

5. **「続行してサマリ」** → **「トークンを作成」**
6. **トークンをコピーして安全に保存**

### 2.2 ゾーンID取得
1. CloudFlareダッシュボードで対象ドメインを選択
2. 右サイドバー「概要」セクション
3. **「ゾーンID」**をコピー

## ステップ3: OwnServer Manager設定

### 3.1 設定ファイル編集
```bash
# 設定ファイルを編集
nano config/config.json
```

### 3.2 CloudFlare設定項目
```json
{
  "cloudflare": {
    "domain": "yourdomain.com",
    "ttl": 60,
    "apiToken": "your_cloudflare_api_token_here",
    "zoneId": "your_zone_id_here",
    "email": "your_email@example.com",
    "proxied": false,
    "retryAttempts": 3,
    "retryDelay": 1000,
    "srvPriority": 0,
    "srvWeight": 5
  }
}
```

#### 設定項目詳細

| 項目 | 説明 | 例 |
|------|------|-----|
| `domain` | メインドメイン | `yourdomain.com` |
| `ttl` | DNS TTL値（秒） | `60` (1分) |
| `apiToken` | CloudFlare APIトークン | `c7Q0Zk7PzZ...` |
| `zoneId` | CloudFlare ゾーンID | `346ec04a51...` |
| `email` | CloudFlareアカウントメール | `user@example.com` |
| `proxied` | CloudFlareプロキシ使用 | `false` |
| `retryAttempts` | API呼び出しリトライ回数 | `3` |
| `retryDelay` | リトライ間隔（ミリ秒） | `1000` |
| `srvPriority` | SRVレコード優先度 | `0` |
| `srvWeight` | SRVレコード重み | `5` |

### 3.3 サブドメイン設定
デフォルトでは `play.yourdomain.com` が使用されます。

カスタマイズしたい場合：
```json
{
  "cloudflare": {
    "domain": "yourdomain.com",
    "subdomain": "minecraft"
  }
}
```
この場合、`minecraft.yourdomain.com` が使用されます。

## ステップ4: DNS設定テスト

### 4.1 API接続テスト
```bash
# CloudFlare API接続テスト
docker exec ownserver-manager-prod node test-cloudflare-dns.js
```

**期待される出力例:**
```
=== CloudFlare DNS Test Script ===
Domain: play.yourdomain.com
Target: shard-xxxx.ownserver.kumassy.com:17343

1. Listing existing DNS records...
Response status: 200
Response success: true

2. Creating/Updating CNAME record...
CNAME operation: SUCCESS

3. Creating/Updating SRV record...
SRV operation: SUCCESS

4. Final verification...
CNAME record: ✅ EXISTS
SRV record: ✅ EXISTS

=== DNS Test Complete ===
```

### 4.2 外部接続テスト
```bash
# 外部からの接続テスト
docker exec ownserver-manager-prod node test-external-connectivity.js
```

### 4.3 手動DNS確認
```bash
# CNAME レコード確認
nslookup play.yourdomain.com

# SRV レコード確認
nslookup -type=SRV _minecraft._tcp.play.yourdomain.com
```

## ステップ5: 高度な設定

### 5.1 複数サブドメイン管理
```json
{
  "cloudflare": {
    "domain": "yourdomain.com",
    "subdomains": {
      "survival": "survival.yourdomain.com",
      "creative": "creative.yourdomain.com",
      "test": "test.yourdomain.com"
    }
  }
}
```

### 5.2 地域別DNS設定
```json
{
  "cloudflare": {
    "domain": "yourdomain.com",
    "geoLocation": {
      "enabled": true,
      "regions": {
        "JP": "jp.yourdomain.com",
        "US": "us.yourdomain.com",
        "EU": "eu.yourdomain.com"
      }
    }
  }
}
```

### 5.3 負荷分散設定
```json
{
  "cloudflare": {
    "domain": "yourdomain.com",
    "loadBalancing": {
      "enabled": true,
      "pools": [
        {
          "name": "primary",
          "weight": 100,
          "endpoint": "server1.yourdomain.com"
        },
        {
          "name": "backup",
          "weight": 0,
          "endpoint": "server2.yourdomain.com"
        }
      ]
    }
  }
}
```

## ステップ6: セキュリティ設定

### 6.1 APIトークン権限最小化
最小権限の原則に従い、必要最小限の権限のみ付与：

```
Zone:Read (対象ゾーンのみ)
DNS:Edit (対象ゾーンのみ)
```

### 6.2 IPアドレス制限
APIトークンに対してサーバーIPアドレス制限を設定：

1. APIトークン編集画面
2. **「IPアドレスフィルタリング」**
3. サーバーの固定IPアドレスを追加

### 6.3 定期的なトークンローテーション
```bash
# 月次でAPIトークンを更新
# 1. 新しいAPIトークンを作成
# 2. 設定ファイルを更新
# 3. サービス再起動
# 4. 古いトークンを削除
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. API認証エラー
**エラー**: `Error 10000: Authentication error`

**解決方法**:
```bash
# APIトークンの確認
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json"

# 設定ファイルのトークン確認
docker exec ownserver-manager-prod node src/commands/cli.js config --get cloudflare.apiToken
```

#### 2. ゾーンID不一致
**エラー**: `Error 1001: DNS zone not found`

**解決方法**:
```bash
# 正しいゾーンIDを確認
curl -X GET "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" | jq '.result[] | {name, id}'
```

#### 3. DNS権限不足
**エラー**: `Error 9109: Access denied`

**解決方法**:
1. APIトークンの権限を確認
2. 必要に応じて`Zone:DNS:Edit`権限を追加
3. 対象ゾーンがトークンの範囲に含まれていることを確認

#### 4. DNS伝播遅延
**症状**: 設定は成功するが、名前解決ができない

**解決方法**:
```bash
# DNS伝播状況確認
dig play.yourdomain.com
dig @8.8.8.8 play.yourdomain.com
dig @1.1.1.1 play.yourdomain.com

# TTL値を一時的に短縮（60秒）
# 伝播完了後は適切な値（300-3600秒）に戻す
```

#### 5. SRVレコード設定エラー
**症状**: CNAMEは正常だが、SRVレコードが作成されない

**解決方法**:
```bash
# SRVレコード設定確認
nslookup -type=SRV _minecraft._tcp.play.yourdomain.com

# 手動でSRVレコード確認
curl -X GET "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/dns_records?type=SRV" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

## 監視とメンテナンス

### 定期的な確認項目
```bash
# 週次実行推奨
#!/bin/bash

# 1. DNS設定確認
docker exec ownserver-manager-prod node test-cloudflare-dns.js

# 2. 外部接続確認
docker exec ownserver-manager-prod node test-external-connectivity.js

# 3. API呼び出し制限確認
curl -X GET "https://api.cloudflare.com/client/v4/user" \
  -H "Authorization: Bearer YOUR_API_TOKEN" | jq '.result.api_rate_limit'

# 4. DNSレコード一覧出力
curl -X GET "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/dns_records" \
  -H "Authorization: Bearer YOUR_API_TOKEN" | jq '.result[] | {name, type, content}'
```

### ログ監視
```bash
# CloudFlare API関連のログ確認
docker logs ownserver-manager-prod 2>&1 | grep -i cloudflare

# DNS更新ログ確認
grep "DNS" logs/app.log | tail -20
```

## パフォーマンス最適化

### TTL設定の最適化
| 用途 | TTL推奨値 | 理由 |
|------|-----------|------|
| 開発・テスト | 60秒 | 迅速な変更反映 |
| 本番運用（安定） | 300-1800秒 | バランス重視 |
| 本番運用（高可用性） | 60-300秒 | 障害時の迅速復旧 |

### API呼び出し最適化
```json
{
  "cloudflare": {
    "retryAttempts": 3,
    "retryDelay": 1000,
    "rateLimitHandling": true,
    "batchUpdates": true
  }
}
```

## 高可用性設定

### フェイルオーバー設定
```json
{
  "cloudflare": {
    "failover": {
      "enabled": true,
      "primaryEndpoint": "primary.ownserver.kumassy.com",
      "backupEndpoint": "backup.ownserver.kumassy.com",
      "healthCheckInterval": 30000,
      "failoverThreshold": 3
    }
  }
}
```

### 健全性監視
```json
{
  "cloudflare": {
    "healthMonitoring": {
      "enabled": true,
      "checkInterval": 60000,
      "endpoints": [
        "https://api.cloudflare.com/client/v4/user/tokens/verify"
      ],
      "alertOnFailure": true
    }
  }
}
```

---

📝 **重要**: CloudFlare APIトークンは機密情報です。適切に管理し、定期的にローテーションしてください。
