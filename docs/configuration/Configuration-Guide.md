# OwnServer Manager Alpha 1.0.0 - 設定ガイド

## 概要
このガイドでは、OwnServer Managerの各種設定方法について詳しく説明します。

## 🔧 **新機能: 統合設定管理システム**

### 🚀 簡単設定 (推奨)

**1つのマスター設定から全設定ファイルを自動生成:**

```bash
# セットアップ開始
npm run setup

# マスター設定を編集（4項目のみ）
nano config/master.json

# 全設定ファイルを自動生成
npm run config:generate
```

### 📋 マスター設定ファイル: `config/master.json`

**必須設定項目（4項目のみ）:**
```json
{
  "cloudflare": {
    "domain": "your-domain.com",           // あなたのドメイン
    "apiToken": "your-cloudflare-token",   // CloudFlare APIトークン
    "zoneId": "your-zone-id",             // CloudFlare Zone ID
    "email": "your-email@example.com"     // CloudFlareアカウントメール
  }
}
```

**オプション設定（デフォルト値で動作、必要に応じて調整）:**
```json
{
  "environment": "production",
  "minecraft": {
    "port": 25565,
    "memoryMin": "1G",
    "memoryMax": "2G",
    "javaArgs": ["-Xmx2G", "-Xms1G", "-XX:+UseG1GC"],
    "autoRestart": true,
    "startupTimeout": 120000
  },
  "ownserver": {
    "autoStart": true,
    "restartOnFailure": true,
    "healthCheckInterval": 30000
  },
  "logging": {
    "level": "info",
    "maxFiles": 3,
    "directory": "/app/logs"
  },
  "backup": {
    "enabled": true,
    "retention": 7,
    "directory": "/app/backups"
  }
}
```

### 🔄 自動生成される設定ファイル

`npm run config:generate` 実行後に以下が生成されます：

#### 1. `config/config.json` (メイン設定)
```json
{
  "minecraft": {
    "serverDirectory": "/app/minecraft-servers/server",
    "port": 25565,
    "javaArgs": ["-Xmx2G", "-Xms1G", "-XX:+UseG1GC"],
    "autoRestart": true,
    "restartDelay": 5000,
    "startupTimeout": 120000,
    "shutdownTimeout": 30000,
    "memoryMin": "1G",
    "memoryMax": "2G",
    "jarFile": "server.jar",
    "eulaAgreed": true
  },
  "ownserver": {
    "binaryPath": "/app/bin/ownserver",
    "autoRestart": true,
    "restartDelay": 3000,
    "autoStart": true,
    "restartOnFailure": true,
    "healthCheckInterval": 30000,
    "startupTimeout": 60000,
    "endpointTimeout": 60000,
    "args": [],
    "enabled": true
  },
  "cloudflare": {
    "domain": "your-domain.com",
    "subdomain": "play",
    "ttl": 60,
    "apiToken": "your-cloudflare-token",
    "zoneId": "your-zone-id",
    "email": "your-email@example.com",
    "_endpoint_note": "ownserverエンドポイントは動的に取得されます（kumassyアドレスは毎回変更されるため）",
    "_endpoint_format": "例: shard-2509.ownserver.kumassy.com:15440",
    "defaultPort": 25565,
    "enableAutoUpdate": true,
    "healthCheckEnabled": true
  },
  "logging": {
    "level": "info",
    "maxFiles": 3,
    "maxSize": "5m",
    "compress": true,
    "directory": "/app/logs",
    "format": "json",
    "enableConsole": true,
    "enableFile": true
  }
}
```
  },
  "logging": {
    "level": "info",
    "maxFileSize": "10MB",
    "maxFiles": 5,
    "compress": true,
    "datePattern": "YYYY-MM-DD"
  }
}
```

### 環境変数設定: `config/production.env`
```bash
# Node.js環境設定
NODE_ENV=production
DOCKER_ENV=true

# ログ設定
APP_LOG_LEVEL=info
APP_LOG_MAX_FILES=3
APP_LOG_MAX_SIZE=5MB
APP_LOG_COMPRESS=true

# パフォーマンス設定
APP_MEMORY_LIMIT=2048
APP_GC_INTERVAL=300000

# セキュリティ設定
APP_SECURITY_MODE=production
```

## 詳細設定項目

### 1. Minecraft サーバー設定

#### 基本設定
```json
{
  "minecraft": {
    "serverDirectory": "/app/minecraft-servers/your-server",
    "port": 25565,
    "javaArgs": ["-Xmx4G", "-Xms2G", "-XX:+UseG1GC"],
    "autoRestart": true,
    "restartDelay": 5000,
    "startupTimeout": 120000,
    "shutdownTimeout": 30000
  }
}
```

**設定項目の説明:**
- `serverDirectory`: Minecraftサーバーファイルの保存場所
- `port`: Minecraftサーバーのポート番号（デフォルト: 25565）
- `javaArgs`: Java実行時引数（メモリ設定等）
- `autoRestart`: 自動再起動の有効/無効
- `restartDelay`: 再起動までの遅延時間（ミリ秒）
- `startupTimeout`: 起動タイムアウト時間（ミリ秒）
- `shutdownTimeout`: 終了タイムアウト時間（ミリ秒）

#### Java メモリ設定の最適化
| サーバー規模 | 推奨メモリ設定 | javaArgs例 |
|------------|-------------|-----------|
| 小規模 (1-10人) | 2-4GB | `["-Xmx2G", "-Xms1G"]` |
| 中規模 (10-30人) | 4-6GB | `["-Xmx4G", "-Xms2G"]` |
| 大規模 (30人以上) | 6GB以上 | `["-Xmx6G", "-Xms3G"]` |

#### 高パフォーマンス設定例
```json
{
  "javaArgs": [
    "-Xmx4G",
    "-Xms2G",
    "-XX:+UseG1GC",
    "-XX:+UnlockExperimentalVMOptions",
    "-XX:MaxGCPauseMillis=100",
    "-XX:+DisableExplicitGC",
    "-XX:TargetSurvivorRatio=90",
    "-XX:G1NewSizePercent=50",
    "-XX:G1MaxNewSizePercent=80",
    "-XX:G1MixedGCLiveThresholdPercent=50",
    "-XX:+AlwaysPreTouch"
  ]
}
```

### 2. OwnServer 設定

#### 基本設定
```json
{
  "ownserver": {
    "binaryPath": "/app/bin/ownserver",
    "autoRestart": true,
    "restartDelay": 3000,
    "autoStart": true,
    "restartOnFailure": true,
    "healthCheckInterval": 30000,
    "startupTimeout": 60000,
    "args": [],
    "endpointTimeout": 60000
  }
}
```

**設定項目の説明:**
- `binaryPath`: OwnServerバイナリファイルのパス
- `autoRestart`: 自動再起動の有効/無効
- `restartDelay`: 再起動までの遅延時間（ミリ秒）
- `autoStart`: システム起動時の自動開始
- `restartOnFailure`: 障害時の自動再起動
- `healthCheckInterval`: ヘルスチェック間隔（ミリ秒）
- `startupTimeout`: 起動タイムアウト時間（ミリ秒）
- `args`: OwnServer追加引数
- `endpointTimeout`: エンドポイント取得タイムアウト（ミリ秒）

### 3. CloudFlare DNS 設定

#### CloudFlare APIトークンの取得方法

1. **CloudFlareダッシュボード**にログイン
2. **「マイプロファイル」** → **「APIトークン」**に移動
3. **「トークンを作成」**をクリック
4. **「カスタムトークン」**を選択
5. 以下の権限を設定：
   - **ゾーン**: `Zone:Read`
   - **DNS**: `Zone:Edit`
   - **ゾーンリソース**: `Include - Specific zone - [あなたのドメイン]`

#### 基本設定
```json
{
  "cloudflare": {
    "domain": "yourdomain.com",
    "ttl": 60,
    "apiToken": "your_cloudflare_api_token",
    "zoneId": "your_cloudflare_zone_id",
    "email": "your_email@example.com",
    "globalApiKey": "your_global_api_key",
    "proxied": false,
    "retryAttempts": 3,
    "retryDelay": 1000,
    "srvPriority": 0,
    "srvWeight": 5
  }
}
```

**設定項目の説明:**
- `domain`: 使用するドメイン名
- `ttl`: DNS レコードのTTL値（秒）
- `apiToken`: CloudFlare APIトークン
- `zoneId`: CloudFlare ゾーンID
- `email`: CloudFlareアカウントのメールアドレス
- `globalApiKey`: グローバルAPIキー（レガシー認証用）
- `proxied`: CloudFlareプロキシの有効/無効
- `retryAttempts`: API呼び出し失敗時のリトライ回数
- `retryDelay`: リトライ間隔（ミリ秒）
- `srvPriority`: SRVレコードの優先度
- `srvWeight`: SRVレコードの重み

#### ゾーンIDの取得方法
1. CloudFlareダッシュボードで対象ドメインを選択
2. 右サイドバーの**「概要」**セクション
3. **「ゾーンID」**をコピー

### 4. ヘルスチェック設定

#### 基本設定
```json
{
  "healthcheck": {
    "enabled": true,
    "interval": 30000,
    "timeout": 5000,
    "retries": 3,
    "actions": ["restart_ownserver", "restart_minecraft"],
    "alertThreshold": 5
  }
}
```

**設定項目の説明:**
- `enabled`: ヘルスチェック機能の有効/無効
- `interval`: チェック間隔（ミリ秒）
- `timeout`: タイムアウト時間（ミリ秒）
- `retries`: 失敗時のリトライ回数
- `actions`: 障害検出時の自動アクション
- `alertThreshold`: アラート発生までの連続失敗回数

#### 利用可能なアクション
- `restart_ownserver`: OwnServerの再起動
- `restart_minecraft`: Minecraftサーバーの再起動
- `restart_all`: 全サービス再起動
- `notify_only`: 通知のみ（自動復旧なし）

### 5. ログ設定

#### 基本設定
```json
{
  "logging": {
    "level": "info",
    "maxFileSize": "10MB",
    "maxFiles": 5,
    "compress": true,
    "datePattern": "YYYY-MM-DD"
  }
}
```

**設定項目の説明:**
- `level`: ログレベル（`debug`, `info`, `warn`, `error`）
- `maxFileSize`: ログファイル最大サイズ
- `maxFiles`: 保持するログファイル数
- `compress`: 古いログファイルの圧縮
- `datePattern`: ログファイル名の日付パターン

#### ログレベルの詳細
| レベル | 説明 | 本番環境推奨 |
|--------|------|-------------|
| `debug` | 詳細なデバッグ情報 | ❌ |
| `info` | 一般的な情報 | ✅ |
| `warn` | 警告メッセージ | ✅ |
| `error` | エラーメッセージのみ | ⚠️ |

## 環境別設定例

### 開発環境設定
```json
{
  "minecraft": {
    "javaArgs": ["-Xmx1G", "-Xms512M"],
    "autoRestart": false
  },
  "ownserver": {
    "autoStart": false,
    "healthCheckInterval": 60000
  },
  "logging": {
    "level": "debug",
    "maxFiles": 10
  },
  "healthcheck": {
    "enabled": false
  }
}
```

### 本番環境設定
```json
{
  "minecraft": {
    "javaArgs": ["-Xmx4G", "-Xms2G", "-XX:+UseG1GC"],
    "autoRestart": true
  },
  "ownserver": {
    "autoStart": true,
    "restartOnFailure": true,
    "healthCheckInterval": 30000
  },
  "logging": {
    "level": "info",
    "maxFiles": 5,
    "compress": true
  },
  "healthcheck": {
    "enabled": true,
    "actions": ["restart_ownserver", "restart_minecraft"]
  }
}
```

### 高負荷環境設定
```json
{
  "minecraft": {
    "javaArgs": [
      "-Xmx8G", "-Xms4G", "-XX:+UseG1GC",
      "-XX:MaxGCPauseMillis=50",
      "-XX:+UnlockExperimentalVMOptions"
    ],
    "startupTimeout": 180000
  },
  "ownserver": {
    "healthCheckInterval": 15000,
    "endpointTimeout": 30000
  },
  "healthcheck": {
    "interval": 15000,
    "retries": 5,
    "alertThreshold": 3
  }
}
```

## 設定変更手順

### 1. 設定ファイル編集
```bash
# 設定ファイルのバックアップ
cp config/config.json config/config.json.backup

# 設定ファイル編集
nano config/config.json
```

### 2. 設定検証
```bash
# 設定ファイルの構文確認
cat config/config.json | jq .

# CLI経由での設定確認
docker exec ownserver-manager-prod node src/commands/cli.js config --show
```

### 3. 設定反映
```bash
# サービス再起動（設定変更を反映）
docker restart ownserver-manager-prod

# 変更確認
docker exec ownserver-manager-prod node src/commands/cli.js status
```

## セキュリティ設定

### CloudFlare API認証強化
```json
{
  "cloudflare": {
    "apiToken": "use_api_token_instead_of_global_key",
    "globalApiKey": "",
    "email": ""
  }
}
```

### ログセキュリティ
```json
{
  "logging": {
    "level": "info",
    "excludeFields": ["apiToken", "globalApiKey", "password"]
  }
}
```

## トラブルシューティング

### 設定エラーの対処法

#### JSON構文エラー
```bash
# JSON構文チェック
cat config/config.json | jq .

# エラーがある場合、バックアップから復元
cp config/config.json.backup config/config.json
```

#### CloudFlare API エラー
```bash
# API設定テスト
docker exec ownserver-manager-prod node test-cloudflare-dns.js

# 一般的な解決策：
# 1. APIトークンの権限確認
# 2. ゾーンIDの確認
# 3. ドメイン設定の確認
```

#### メモリ設定エラー
```bash
# Java メモリ設定の確認
docker exec ownserver-manager-prod java -XX:+PrintGCDetails -version

# 解決策：
# 1. 使用可能メモリの確認
# 2. javaArgs の調整
# 3. システムメモリ増設
```

## 設定最適化のベストプラクティス

### 1. パフォーマンス最適化
- メモリ設定は物理メモリの70%以下に設定
- G1GCガベージコレクターの使用推奨
- ヘルスチェック間隔は負荷に応じて調整

### 2. セキュリティ強化
- CloudFlare APIトークンを使用（Global API Keyは非推奨）
- ログレベルは本番環境では`info`以上に設定
- 定期的な設定ファイルのバックアップ

### 3. 運用効率化
- 自動再起動機能の活用
- 適切なタイムアウト値の設定
- ログローテーション設定

---

📝 **注意**: 設定変更後は必ずサービスを再起動し、動作確認を行ってください。
