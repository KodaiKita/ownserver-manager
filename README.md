# OwnServer Manager Alpha 1.0.0

🎮 **Production-Ready Minecraft Server Manager with CloudFlare DNS Integration**

✅ **完全テスト済み**: Ubuntu 22.04環境で9項目の包括的デプロイテストを完了

OwnServer Managerは、Minecraftサーバーの運用・管理を自動化するNode.js製のツールです。Docker環境で動作し、CloudFlareとの連携によりサーバーの公開/非公開を自動化できます。**Alpha 1.0.0** では小規模から中規模のMinecraftサーバー運用に必要な機能が実装されています。

## 🖥️ システム要件

### 最小要件
- **OS**: Ubuntu Server 20.04/22.04/24.04 LTS
- **Node.js**: 20.x または 22.x系（**Node.js 18.xは非推奨**）
- **npm**: 10.x以降（npm@11.x推奨）
- **Docker**: 最新版
- **CPU**: 2コア以上
- **メモリ**: 4GB以上
- **ストレージ**: 20GB以上
- **ネットワーク**: インターネット接続必須

### 推奨要件
- **Node.js**: 22.x LTS（最新安定版）
- **npm**: 11.x（最新版）
- **CPU**: 4コア以上
- **メモリ**: 8GB以上
- **ストレージ**: 50GB以上 SSD
- **ネットワーク**: 安定したブロードバンド接続

### ⚠️ Node.js 18.x互換性の注意

**Node.js 18.xは npm@11.x との互換性問題があるため、以下のバージョンを推奨:**
- **Node.js 20.x LTS** または **Node.js 22.x LTS**
- **npm 10.x 以降**（npm@11.x が利用可能）

既存環境でNode.js 18.xを使用している場合は、[デプロイガイド](docs/deployment/Ubuntu-Server-Complete-Deployment-Guide.md#32-既存nodejs-18xからのアップグレード)を参照してアップグレードしてください。サーバーの公開/非公開を自動化できます。**Alpha 1.0.0** では小規模から中規模のMinecraftサーバー運用に必要な機能が実装されています。

## 🚨 **重要: セキュリティポリシー**

**プロジェクトに参加する前に必ずお読みください:**  
📋 **[セキュリティポリシー](docs/security/SECURITY_POLICY.md)** - 機密情報取り扱いルール（厳守事項）

⚠️ **機密情報（APIキー・トークン等）の直接コピー・ハードコーディングは厳禁です。**

## 🚀 Quick Start

### 🔧 **新機能: 統合設定管理システム**

**これまでの複雑な設定作業を大幅に簡素化しました！**

1つのマスター設定ファイルから、全ての設定ファイルを自動生成できます。

```bash
# 1. プロジェクトクローン
git clone https://github.com/KodaiKita/ownserver-manager.git
cd ownserver-manager

# 2. Node.js依存関係をインストール
npm install

# 3. 簡単セットアップ（統合設定管理）
npm run setup

# 4. マスター設定ファイルを編集（必須項目のみ）
cp config/master.json.example config/master.json
nano config/master.json  # 以下の4項目のみ編集:
# - cloudflare.domain: "your-domain.com"
# - cloudflare.apiToken: "your-api-token"
# - cloudflare.zoneId: "your-zone-id"  
# - cloudflare.email: "your-email@example.com"

# 5. 全設定ファイルを自動生成
npm run config:generate

# 6. 🐳 Docker完全デプロイ（どんな環境でも確実）
./scripts/docker-complete-deploy.sh
```

### 🐳 **Docker特化: 完全に確実なデプロイ**

**どんなdirty環境でも確実に動作するDockerデプロイを提供:**

```bash
# ⚡ ワンライナー完全デプロイ
./scripts/docker-complete-deploy.sh

# 📋 手動実行（詳細制御が必要な場合）

# Step 1: 完全クリーンアップ
docker ps -q | xargs -r docker stop 2>/dev/null || true
docker ps -a -q | xargs -r docker rm 2>/dev/null || true
docker system prune -af --volumes

# Step 2: ディレクトリ準備
mkdir -p minecraft-servers logs backups
sudo chown -R $(id -u):$(id -g) minecraft-servers logs backups
chmod -R 755 minecraft-servers logs backups

# Step 3: 強制再ビルド
docker build --no-cache -f Dockerfile.production -t ownserver-manager:latest .

# Step 4: 確実な起動
docker run -d --name ownserver-manager-prod \
  --restart unless-stopped \
  -p 8080:8080 -p 25565:25565 \
  -v "$(pwd)/config:/app/config:rw" \
  -v "$(pwd)/minecraft-servers:/app/minecraft-servers:rw" \
  -v "$(pwd)/logs:/app/logs:rw" \
  --env-file config/docker.env \
  ownserver-manager:latest

# Step 5: 動作確認
docker ps | grep ownserver
docker exec ownserver-manager-prod node src/commands/cli.js health
```

### 🚨 **Docker環境での緊急復旧**

```bash
# 緊急時の完全リセット（全データ削除注意）
docker kill $(docker ps -q) 2>/dev/null || true
docker rm $(docker ps -a -q) 2>/dev/null || true
docker rmi $(docker images -q) 2>/dev/null || true
docker system prune -af --volumes

# 完全再デプロイ
git clean -fd && git reset --hard HEAD
npm install && npm run config:generate
./scripts/docker-complete-deploy.sh
```

### 📋 **従来の手動セットアップ（非推奨）**

<details>
<summary>従来の方法（複雑・非推奨）</summary>

```bash
# 1. プロジェクトクローン
git clone https://github.com/KodaiKita/ownserver-manager.git
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

</details>

### ワンライナーインストール（Ubuntu Server）
```bash
curl -fsSL https://raw.githubusercontent.com/KodaiKita/ownserver-manager/alpha-1.0.0/scripts/install.sh | bash
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

## 🧪 包括的デプロイテスト

### 本番デプロイ前の検証
```bash
# 完全なクリーン環境デプロイテスト
./test-environment/deploy-test-final.sh

# テスト項目（9項目すべて検証済み）:
# ✅ GitHubクローン（alpha-1.0.0タグ）
# ✅ Node.js 22.x自動インストール
# ✅ 依存関係インストール（119パッケージ）
# ✅ 設定ファイル生成（統合設定管理）
# ✅ 設定妥当性検証
# ✅ ヘルスチェック機能
# ✅ CloudFlare API実接続テスト
# ✅ Minecraft管理（Java 21自動インストール）
# ✅ アプリケーション起動・実行確認
```

### 個別機能テスト
```bash
# 設定ファイル検証
npm run test:config

# ヘルスチェック
npm run health

# CloudFlare API接続テスト
node scripts/test-cloudflare-api.js

# Minecraft管理機能テスト
node scripts/test-minecraft.js
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
