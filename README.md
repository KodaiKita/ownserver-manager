# ownserver-manager

🎮 **Minecraft Server with OwnServer and CloudFlare DNS management**

ownserver-managerは、Minecraftサーバーの自動公開とDDNS管理を行うNode.js製のツールです。Dockerコンテナ内でMinecraftサーバーとownserverを管理し、CloudFlare DNS APIを通じて動的なドメイン設定を自動化します。

## 📚 Documentation

詳細なドキュメントは [`docs/`](docs/) ディレクトリにあります：

- **[ドキュメント索引](docs/README.md)** - 全ドキュメントの概要
- **[プロジェクト構造](docs/Project-Structure.md)** - 最適化されたファイル構造ガイド
- **[開発ワークフロー](docs/development/Development-Workflow.md)** - 段階的開発手法
- **[Logger実装ガイド](docs/implementation/Logger-Implementation.md)** - 完成済みLogger詳細

## 🏆 実装状況

- ✅ **Logger** - 本番運用可能な高機能ログシステム
  - 構造化JSON形式ログ
  - 複数ログレベル・フィルタリング
  - 自動ログローテーション
  - 非同期ファイル操作
  - パフォーマンス監視
- ✅ **ConfigManager** - 本番運用可能な高機能設定管理システム
  - 動的設定読み込み・検証
  - 環境変数オーバーライド
  - ホットリロード・ファイル監視
  - パフォーマンスキャッシュ
  - 複数エクスポート形式
  - バックアップ・復元機能
- ✅ **MinecraftServerManager** - 本番運用可能なMinecraftサーバー管理システム（**Phase1完了**）
  - ✅ Java自動ダウンロード・バージョン管理（Eclipse Temurin 8/11/17/21）
  - ✅ Minecraftサーバープロセス起動・停止・監視
  - ✅ 基本ログ統合・イベント発火
  - ✅ エラーハンドリング・自動クリーンアップ
  - ✅ EULA自動同意・準拠性確保
  - ✅ Minecraft版本自動検出（Paper/Spigot/Vanilla/Forge対応）
  - ✅ 包括的テストスイート（実際のMinecraft JAR使用テスト済み）
  - 📊 **テスト成功率**: 100% (Paper 1.8.8/1.18.2/1.21.5で実証済み)
- ⏳ **OwnServerManager** - 実装予定
- ⏳ **CloudFlareManager** - 実装予定

## ✨ 機能

- 🚀 **Minecraftサーバー自動管理** - 起動・停止・監視・自動再起動
- 🌐 **ownserverトンネル管理** - 自動エンドポイント取得・接続管理
- 🔗 **CloudFlare DNS自動設定** - CNAME・SRVレコードの自動管理
- ❤️ **ヘルスチェック機能** - 接続監視・自動復旧
- 🛠️ **CLI操作** - 簡単なコマンドライン操作
- 📊 **高機能ログ管理** - 構造化ログ・自動ローテーション・パフォーマンス監視

## 🏗️ アーキテクチャ

```
Docker Container: ownserver-manager
├── Node.js メインプロセス
├── Minecraft Server管理
├── ownserver管理 (Rust バイナリ)
├── CloudFlare DNS管理
├── Health Check モジュール
└── CLI Interface
```

## 🚀 クイックスタート

### 1. 環境設定

```bash
# リポジトリクローン
git clone https://github.com/KodaiKita/ownserver-manager.git
cd ownserver-manager

# 環境変数設定
cp config/docker.env.example config/docker.env
# config/docker.env を編集してCloudFlare APIトークンを設定
```

### 2. Minecraftサーバー配置

```bash
# Minecraftサーバーディレクトリを作成
mkdir -p minecraft-servers/survival
# server.jar を minecraft-servers/survival/ に配置
```

### 3. 起動

```bash
# Docker Composeで起動
docker-compose up -d

# ログ確認
docker-compose logs -f ownserver-manager
```

## 🎛️ CLI コマンド

| コマンド | 説明 | 例 |
|----------|------|-----|
| `mc <command>` | Minecraftコンソールコマンド送信 | `mc "say Hello World"` |
| `restart [service]` | サービス再起動 | `restart all` / `restart mc` / `restart own` |
| `private` | サーバー非公開化 | `private` |
| `public` | サーバー公開化 | `public` |
| `status` | 状態確認 | `status` |
| `logs` | ログ表示 | `logs --follow` |
| `stop` | 全停止 | `stop` |

### 使用例

```bash
# CLIコマンド実行
docker-compose exec ownserver-manager node src/commands/cli.js status
docker-compose exec ownserver-manager node src/commands/cli.js mc "weather clear"
docker-compose exec ownserver-manager node src/commands/cli.js restart own
```

## ⚙️ 設定

### 環境変数 (`config/docker.env`)

```bash
# CloudFlare API設定
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ZONE_ID=your_zone_id_here

# アプリケーション設定
NODE_ENV=production
MINECRAFT_SERVER_DIR=/app/minecraft-servers
CONFIG_PATH=/app/config/config.json
LOG_LEVEL=info
```

### 設定ファイル (`config/config.json`)

```json
{
  "minecraft": {
    "serverDirectory": "/app/minecraft-servers/survival",
    "port": 25565,
    "javaArgs": ["-Xmx2G", "-Xms1G"],
    "autoRestart": true
  },
  "cloudflare": {
    "domain": "play.yourdomain.com",
    "ttl": 60
  },
  "healthcheck": {
    "enabled": true,
    "interval": 30000,
    "retries": 3
  }
}
```

## 📁 ディレクトリ構造

```
ownserver-manager/
├── src/                    # アプリケーションソースコード
│   ├── index.js           # メインプロセス
│   ├── managers/          # 各種マネージャー
│   ├── modules/           # 機能モジュール
│   ├── utils/             # ユーティリティ
│   └── commands/          # CLIコマンド
├── config/                # 設定ファイル
├── minecraft-servers/     # Minecraftサーバー群
├── logs/                  # ログファイル
├── bin/                   # ownserverバイナリ
└── docker-compose.yml     # Docker設定
```

## 🔧 開発

### 必要な環境

- Node.js 18+
- Docker & Docker Compose
- CloudFlare APIトークン

### 開発環境での実行

```bash
# 依存関係インストール
npm install

# 開発モードで実行
npm run dev

# CLIテスト
npm run cli status
```

## 📋 ログ

アプリケーションは以下のログを出力します：

- `logs/minecraft.log` - Minecraftサーバーログ
- `logs/ownserver.log` - ownserverログ  
- `logs/manager.log` - アプリケーションログ
- `logs/dns.log` - DNS操作ログ
- `logs/healthcheck.log` - ヘルスチェックログ

## 🚨 トラブルシューティング

### よくある問題

1. **Minecraft起動失敗**
   ```bash
   # server.jarの存在確認
   ls -la minecraft-servers/survival/server.jar
   
   # 権限確認
   docker-compose exec ownserver-manager ls -la /app/minecraft-servers/survival/
   ```

2. **ownserver接続失敗**
   ```bash
   # バイナリ確認
   docker-compose exec ownserver-manager ls -la /app/bin/ownserver
   
   # ネットワーク確認
   docker-compose exec ownserver-manager ping ownserver.kumassy.com
   ```

3. **DNS設定失敗**
   ```bash
   # APIトークン確認
   docker-compose exec ownserver-manager env | grep CLOUDFLARE
   
   # DNS状態確認
   docker-compose exec ownserver-manager node src/commands/cli.js status
   ```

## 📝 ライセンス

ISC License

## 🤝 コントリビューション

Issue報告やPull Requestを歓迎します。

## 📞 サポート

問題や質問がある場合は、[Issues](https://github.com/KodaiKita/ownserver-manager/issues)にて報告してください。