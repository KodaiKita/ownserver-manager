# OwnServer Manager Alpha 1.0.0

🎮 **Production-Ready Minecraft Server Manager with CloudFlare DNS Integration**

OwnServer Managerは、Minecraftサーバーの運用・管理を自動化するNode.js製のツールです。Docker環境で動作し、CloudFlare DNS APIと連携してサーバーの公開/非公開を自動化できます。**Alpha 1.0.0** では小規模から中規模のMinecraftサーバー運用に必要な機能が実装されています。

## 🚨 **重要: セキュリティポリシー**

**プロジェクトに参加する前に必ずお読みください:**  
📋 **[セキュリティポリシー](docs/security/SECURITY_POLICY.md)** - 機密情報取り扱いルール（厳守事項）

⚠️ **機密情報（APIキー・トークン等）の直接コピー・ハードコーディングは厳禁です。**

## 🚀 Quick Start

### ワンライナーインストール（Ubuntu Server）
```bash
curl -fsSL https://raw.githubusercontent.com/your-username/ownserver-manager/alpha-1.0.0/scripts/install.sh | bash
```

### クイックセットアップ
```bash
# 1. プロジェクトクローン
git clone https://github.com/your-username/ownserver-manager.git
cd ownserver-manager
git checkout tags/alpha-1.0.0

# 2. 環境設定ファイルの作成
./scripts/setup-environment.sh

# 3. 設定ファイルを編集（YOUR_* 部分を実際の値に置換）
# - config/docker.env
# - config/production.env  
# - config/config.json

# 4. Docker Composeで起動
docker compose -f docker-compose.production.yml up -d

# 動作確認
docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js health
```

## 📚 完全ドキュメント

### 🚀 デプロイメント
- **[クイックスタートガイド](docs/deployment/Quick-Start-Guide.md)** - 最速デプロイ手順
- **[Ubuntu Server完全デプロイガイド](docs/deployment/Ubuntu-Server-Complete-Deployment-Guide.md)** - 新規サーバーでの完全セットアップ

### ⚙️ 設定・構成
- **[設定ガイド](docs/configuration/Configuration-Guide.md)** - 詳細な設定方法
- **[CloudFlareセットアップガイド](docs/configuration/CloudFlare-Setup-Guide.md)** - CloudFlare DNS設定

### 🔧 運用・管理
- **[運用マニュアル](docs/operations/Operations-Manual.md)** - 日常運用・監視・メンテナンス
- **[よくある質問（FAQ）](docs/FAQ.md)** - トラブルシューティング・問題解決

### 📋 リリース情報
- **[Alpha 1.0.0 機能一覧](ALPHA_1_0_0_FEATURES.md)** - 実装済み機能
- **[Alpha 1.0.0 リリースプラン](ALPHA_1_0_0_RELEASE_PLAN.md)** - リリース計画

## ✨ Alpha 1.0.0 主要機能

### 🎮 Minecraftサーバー管理
- ✅ **Java自動ダウンロード・管理** (Eclipse Temurin 8/11/17/21)
- ✅ **Minecraftサーバー起動・停止・監視**
- ✅ **プロセス管理・自動クリーンアップ**
- ✅ **Paper/Spigot/Vanilla/Forge対応**
- ✅ **EULA自動同意**

### 🌐 CloudFlare DNS統合
- ✅ **ドメイン自動管理**
- ✅ **DNSレコード自動更新**
- ✅ **サーバー公開/非公開切り替え**
- ✅ **API認証・エラーハンドリング**

### 🛠️ CLI操作・管理
- ✅ **包括的CLIコマンド**
- ✅ **ヘルスチェック**
- ✅ **ステータス監視**
- ✅ **設定管理・検証**

### 🐳 本番環境対応
- ✅ **Docker最適化**
- ✅ **リソース制限・セキュリティ設定**
- ✅ **ログ管理・ローテーション**
- ✅ **バックアップ・復元機能**

### 📊 監視・ログ
- ✅ **構造化JSON形式ログ**
- ✅ **複数ログレベル・フィルタリング**
- ✅ **自動ログローテーション**
- ✅ **パフォーマンス監視**

## 🏗️ アーキテクチャ

```
Production Docker Container
├── Node.js 18 Alpine (最適化済み)
├── MinecraftServerManager (Java管理・サーバー制御)
├── CloudFlareManager (DNS自動化)
├── ConfigManager (設定管理・検証)
├── Logger (構造化ログ・監視)
└── CLI Interface (運用コマンド)
```

## 🎯 基本的な使用方法

### サーバー公開・非公開
```bash
# エイリアス設定（推奨）
alias osm='docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js'

# サーバー公開
osm public

# サーバー非公開
osm private

# ステータス確認
osm status
```

### 監視・管理
```bash
# ヘルスチェック
osm health

# プレイヤー一覧
osm players --list

# バックアップ作成
osm backup --create

# 設定確認
osm config --show
```

## � システム要件

### 最小要件
- **OS**: Ubuntu Server 20.04/22.04/24.04 LTS
- **CPU**: 2コア以上
- **メモリ**: 4GB以上
- **ストレージ**: 20GB以上
- **ネットワーク**: インターネット接続必須

### 推奨要件
- **CPU**: 4コア以上
- **メモリ**: 8GB以上
- **ストレージ**: 50GB以上 SSD
- **ネットワーク**: 安定したブロードバンド接続

## 🔧 健全性チェック

```bash
# 包括的な健全性確認
./scripts/health-check.sh

# 期待される出力例：
# ✅ システム基本チェック
# ✅ Docker環境チェック  
# ✅ OwnServer Managerチェック
# ✅ 設定ファイルチェック
# ✅ ネットワークチェック
```

## 🚨 緊急時対応

### 即座停止
```bash
docker compose -f docker-compose.production.yml down
```

### バックアップから復元
```bash
osm backup --list
osm backup --restore "backup-name"
```

### ログ確認
```bash
docker compose -f docker-compose.production.yml logs -f
```

## 🧪 テスト済み環境

### 実証済みMinecraft版本
- **Paper**: 1.8.8, 1.18.2, 1.21.5
- **Spigot**: 1.16.5, 1.19.4
- **Vanilla**: 1.20.1
- **Forge**: 1.12.2, 1.18.2

### テスト環境
- **Ubuntu Server**: 20.04 LTS, 22.04 LTS, 24.04 LTS
- **Docker**: 20.10+, 24.0+
- **メモリ**: 4GB〜16GB環境でテスト済み

## 🔗 関連リンク

- **[GitHub Repository](https://github.com/your-username/ownserver-manager)**
- **[Release Notes](https://github.com/your-username/ownserver-manager/releases/tag/alpha-1.0.0)**
- **[Issues & Support](https://github.com/your-username/ownserver-manager/issues)**

## 📜 ライセンス

ISC License - [LICENSE](LICENSE) を参照

## 🤝 コントリビューション

プルリクエストやIssue報告を歓迎します。貢献方法については [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

---

🎉 **Alpha 1.0.0は小規模から中規模のMinecraftサーバー運用に最適化されています。本番環境での利用前に、必ずテスト環境で動作確認を行ってください。**
