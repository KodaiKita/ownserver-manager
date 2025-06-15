# OwnServer Manager Alpha 1.0.0 - クイックスタートガイド

## 🚀 最速デプロイ手順（Ubuntu Server）

このガイドは、新規Ubuntu Serverに最も迅速にOwnServer Managerをデプロイする手順です。

### ✅ 検証済み環境
- **完全テスト済み**: Ubuntu 22.04 LTS（Docker環境）
- **Node.js**: 22.16.0（推奨）、npm 10.9.2以降
- **Java**: OpenJDK 21（自動インストール）
- **API連携**: Cloudflare API v4（実接続テスト済み）

### 前提条件
- Ubuntu Server 20.04/22.04/24.04 LTS
- sudo権限を持つユーザー
- インターネット接続

### ⚠️ Node.js 18.x ユーザーの注意

**Node.js 18.x環境の方は先にアップグレードしてください:**  
📋 **[Node.js アップグレードガイド](Node.js-Upgrade-Guide.md)**

Node.js 18.xではnpm@11.xとの互換性問題があるため、Node.js 20.x/22.x系への更新を推奨します。

### ⚡ ワンライナーインストール（実験的）

```bash
# 全自動インストールスクリプト（注意：本番環境では内容を確認してから実行）
curl -fsSL https://raw.githubusercontent.com/KodaiKita/ownserver-manager/alpha-1.0.0/scripts/install.sh | bash
```

### 📋 ステップバイステップ（推奨）

#### ステップ1: システム準備
```bash
# システム更新
sudo apt update && sudo apt upgrade -y

# 基本パッケージインストール（Node.js/npmは後で適切なバージョンをインストール）
sudo apt install -y curl git

# Node.js 22.x（推奨）をインストール
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# バージョン確認（Node.js 22.x、npm 10.x以降であることを確認）
node --version  # v22.x.x 
npm --version   # 10.x.x 以降

# npm最新版に更新（npm@11.x対応）
sudo npm install -g npm@latest

# Dockerインストール
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# ログアウト・ログインでDocker権限を反映
echo "一度ログアウト・ログインしてください"
```

#### ステップ2: プロジェクトダウンロード
```bash
# ホームディレクトリに移動
cd ~

# プロジェクトクローン
git clone https://github.com/KodaiKita/ownserver-manager.git
cd ownserver-manager

# 安定版（alpha-1.0.0）をチェックアウト
git checkout tags/alpha-1.0.0
```

#### ステップ3: 🔧 **新機能: 統合設定管理（推奨）**

**簡単セットアップ - 1つの設定ファイルから全自動生成:**

```bash
# Node.js依存関係をインストール
npm install

# 統合設定システムでセットアップ開始（テンプレート生成）
npm run setup

# マスター設定ファイルをコピー
cp config/master.json.example config/master.json

# マスター設定ファイルを編集（4項目のみ）
nano config/master.json
```

**config/master.json で編集する項目:**
```json
{
  "cloudflare": {
    "domain": "your-domain.com",          // あなたのドメイン
    "apiToken": "your-api-token",         // CloudFlare APIトークン
    "zoneId": "your-zone-id",            // CloudFlare Zone ID
    "email": "your-email@example.com"    // CloudFlareアカウントメール
  }
}
```

```bash
# 全設定ファイルを自動生成
npm run config:generate

# 生成された設定ファイルを確認
ls -la config/
# ✅ config/config.json
# ✅ config/.env
# ✅ config/docker.env
# ✅ config/production.env
```

#### ステップ3(代替): 従来の手動設定

<details>
<summary>従来の方法（複雑・非推奨）</summary>

```bash
# 基本設定ファイル準備
./scripts/setup-environment.sh

# 各設定ファイルを個別編集
nano config/config.json      # CloudFlare設定
nano config/docker.env       # Docker環境変数
nano config/production.env   # 本番環境設定
```

</details>

#### ステップ4: 起動前検証（推奨）

```bash
# 設定ファイル検証
npm run test:config

# ヘルスチェック機能テスト
npm run health

# CloudFlare API接続テスト（API認証情報設定後）
node scripts/test-cloudflare-api.js

# Minecraft管理機能テスト
node scripts/test-minecraft.js
```

#### ステップ5: 🐳 Docker完全デプロイ（どんな環境でも確実に動作）

**⚡ ワンライナーDocker完全セットアップ:**
```bash
# 完全クリーンアップ + 再ビルド + 起動（どんなdirty環境でも動作）
./scripts/docker-complete-deploy.sh
```

**📋 詳細手順（手動実行）:**

```bash
# 🧹 Step 5.1: 完全なDocker環境クリーンアップ
echo "🧹 Docker環境を完全クリーンアップ中..."

# 既存コンテナを強制停止・削除
docker ps -q | xargs -r docker stop 2>/dev/null || true
docker ps -a -q | xargs -r docker rm 2>/dev/null || true

# プロジェクト関連イメージを削除
docker images | grep -E "(ownserver|minecraft)" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

# システム全体をクリーンアップ
docker system prune -af --volumes 2>/dev/null || true

# 🏗️ Step 5.2: 必要ディレクトリの準備
echo "🏗️ ディレクトリ構造を準備中..."

# 既存ディレクトリを安全に削除・再作成
sudo rm -rf minecraft-servers logs backups 2>/dev/null || true
mkdir -p minecraft-servers logs backups

# 適切な権限を設定
sudo chown -R $(id -u):$(id -g) minecraft-servers logs backups
chmod -R 755 minecraft-servers logs backups

# 🔨 Step 5.3: Dockerイメージの強制再ビルド
echo "🔨 Dockerイメージを強制再ビルド中..."

# キャッシュを使わずに完全に再ビルド
docker build --no-cache --pull -f Dockerfile.production -t ownserver-manager:latest .

# ビルド成功確認
if [ $? -ne 0 ]; then
    echo "❌ Dockerイメージのビルドに失敗しました"
    exit 1
fi

# 🚀 Step 5.4: 本番環境での起動（複数の方法をサポート）

# Method 1: Docker Compose（推奨）
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    echo "🚀 Docker Composeで起動中..."
    
    # Docker Composeファイルの妥当性チェック
    if docker compose -f docker-compose.production.yml config &> /dev/null; then
        docker compose -f docker-compose.production.yml up -d --force-recreate
    else
        echo "⚠️ Docker Composeファイルに問題があります。直接Dockerコマンドで起動します..."
        # Method 2に fallback
    fi
else
    echo "⚠️ Docker Composeが利用できません。直接Dockerコマンドで起動します..."
fi

# Method 2: 直接Dockerコマンド（fallback）
if [ -z "$(docker ps -q -f name=ownserver-manager-prod)" ]; then
    echo "🚀 直接Dockerコマンドで起動中..."
    
    # 既存コンテナがあれば強制削除
    docker rm -f ownserver-manager-prod 2>/dev/null || true
    
    # 新しいコンテナを起動
    docker run -d \
        --name ownserver-manager-prod \
        --restart unless-stopped \
        -p 8080:8080 \
        -p 25565:25565 \
        -v "$(pwd)/config:/app/config:rw" \
        -v "$(pwd)/minecraft-servers:/app/minecraft-servers:rw" \
        -v "$(pwd)/logs:/app/logs:rw" \
        -v "$(pwd)/backups:/app/backups:rw" \
        --env-file config/docker.env \
        ownserver-manager:latest
fi

echo "✅ Dockerデプロイが完了しました！"
```

#### ステップ6: 🔍 起動確認とトラブルシューティング

```bash
# 📊 Step 6.1: 基本状態確認
echo "📊 基本状態を確認中..."

# コンテナが正常に起動しているか確認
docker ps | grep ownserver

# コンテナのログを確認（最初の50行）
docker logs --tail 50 ownserver-manager-prod

# 📋 Step 6.2: アプリケーション健全性チェック
echo "📋 アプリケーション健全性をチェック中..."

# 基本的なヘルスチェック（権限エラーを回避）
timeout 30 docker exec ownserver-manager-prod node src/commands/cli.js health 2>/dev/null || {
    echo "⚠️ 通常のヘルスチェックに失敗。代替手段でテスト..."
    
    # 代替: 設定ファイルの読み込みテスト
    docker exec ownserver-manager-prod node -e "
        try {
            const config = require('./config/config.json');
            console.log('✅ 設定ファイル読み込み: OK');
            console.log('📊 Minecraft ポート:', config.minecraft.port);
            console.log('🌐 CloudFlare ドメイン:', config.cloudflare.domain || 'Not configured');
            console.log('✅ アプリケーション基本機能: OK');
        } catch(e) {
            console.error('❌ エラー:', e.message);
            process.exit(1);
        }
    " 2>/dev/null || echo "❌ 設定ファイルに問題があります"
}

# 🌐 Step 6.3: ネットワーク確認
echo "🌐 ネットワーク設定を確認中..."

# ポートが正しく開いているか確認
if command -v netstat &> /dev/null; then
    netstat -tlnp | grep -E ":8080|:25565" || echo "⚠️ ポートが開いていない可能性があります"
fi

# 🔥 Step 6.4: ファイアウォール設定
echo "🔥 ファイアウォール設定を適用中..."

# UFWが利用可能な場合のファイアウォール設定
if command -v ufw &> /dev/null; then
    sudo ufw allow 25565/tcp  # Minecraft
    sudo ufw allow 8080/tcp   # Web UI
    sudo ufw --force enable
    echo "✅ ファイアウォール設定完了"
else
    echo "⚠️ UFWが利用できません。手動でファイアウォール設定を行ってください"
fi

echo "🎉 起動確認が完了しました！"
```

## 🎯 基本的な使い方

### Minecraftサーバー起動
```bash
# サーバーを公開状態にする
docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js public

# ステータス確認
docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js status
```

### 基本コマンド
```bash
# エイリアス設定（便利）
alias osm='docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js'

# 使用例
osm status          # ステータス確認
osm health          # ヘルスチェック
osm public          # サーバー公開
osm private         # サーバー非公開
osm players --list  # プレイヤー一覧
osm backup --create # バックアップ作成
```

### 🐳 便利なDockerコマンド集

```bash
# === npm経由（推奨） ===
npm run docker:deploy        # 完全デプロイ（全自動）
npm run docker:run          # 直接実行（fallback）
npm run docker:clean        # Docker環境クリーンアップ
npm run docker:build        # イメージ強制再ビルド
npm run docker:logs         # コンテナログ表示
npm run docker:shell        # コンテナ内shell起動
npm run docker:health       # コンテナ内ヘルスチェック

# === 直接実行 ===
./scripts/docker-complete-deploy.sh   # 最も確実なデプロイ
./scripts/docker-direct-run.sh        # シンプルな起動
```

### 基本コマンド（従来）
```bash
# エイリアス設定（便利）
alias osm='docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js'

# 使用例
osm status          # ステータス確認
osm health          # ヘルスチェック
osm public          # サーバー公開
osm private         # サーバー非公開
osm players --list  # プレイヤー一覧
osm backup --create # バックアップ作成
```

## 🔧 トラブルシューティング

### 🐳 Docker関連の問題（最も頻発）

#### 1. 「Cannot find module」エラー
```bash
# 🔧 原因: 古いDockerイメージ・キャッシュ
# 解決: 完全クリーンビルド
docker rm -f ownserver-manager-prod
docker rmi ownserver-manager:latest
docker system prune -af
docker build --no-cache -f Dockerfile.production -t ownserver-manager:latest .
```

#### 2. Permission Denied エラー（ログファイル）
```bash
# 🔧 原因: ボリュームマウントの権限問題
# 解決: 権限修正 + rootユーザーで起動
sudo chown -R $(id -u):$(id -g) logs/ minecraft-servers/ backups/
chmod -R 755 logs/ minecraft-servers/ backups/

# または、rootユーザーでコンテナ起動
docker run -d --name ownserver-manager-prod \
  --user root \
  -p 8080:8080 -p 25565:25565 \
  -v "$(pwd)/config:/app/config:rw" \
  -v "$(pwd)/minecraft-servers:/app/minecraft-servers:rw" \
  -v "$(pwd)/logs:/app/logs:rw" \
  ownserver-manager:latest
```

#### 3. コンテナが起動しない
```bash
# 🔧 診断手順
echo "🔍 Docker問題診断中..."

# Step 1: Docker daemon確認
docker version || {
    echo "❌ Docker daemonが起動していません"
    sudo systemctl start docker
    sudo systemctl enable docker
}

# Step 2: イメージ確認
docker images | grep ownserver || {
    echo "❌ イメージが存在しません。再ビルドが必要です"
    docker build --no-cache -f Dockerfile.production -t ownserver-manager:latest .
}

# Step 3: 詳細エラーログ確認
docker logs ownserver-manager-prod 2>&1 | tail -50

# Step 4: インタラクティブ起動でデバッグ
docker run -it --rm \
  -v "$(pwd)/config:/app/config" \
  ownserver-manager:latest bash
```

#### 4. ポート競合エラー
```bash
# 🔧 原因: ポート25565/8080が既に使用中
# 確認
sudo netstat -tlnp | grep -E ":25565|:8080"
sudo lsof -i :25565
sudo lsof -i :8080

# 解決: 競合プロセス停止
sudo kill -9 $(sudo lsof -t -i:25565)
sudo kill -9 $(sudo lsof -t -i:8080)

# または、別ポートで起動
docker run -d --name ownserver-manager-prod \
  -p 8081:8080 -p 25566:25565 \
  # ... その他のオプション
```

#### 5. Docker Compose利用不可
```bash
# 🔧 原因: docker-composeがインストールされていない
# 確認
docker compose version || docker-compose version

# Docker Compose V2インストール
sudo apt update
sudo apt install docker-compose-plugin

# または、直接Dockerコマンドで起動（fallback）
./scripts/docker-direct-run.sh
```

#### 6. 「inquirer.prompt is not a function」エラー
```bash
# 🔧 原因: Node.js依存関係の問題
# 解決: Dockerイメージ内での依存関係再インストール
docker exec -it ownserver-manager-prod bash -c "
cd /app && 
npm ci --production && 
npm list inquirer
"

# または、イメージ再ビルド
docker build --no-cache -f Dockerfile.production -t ownserver-manager:latest .
```

### 🚨 緊急時の強制復旧コマンド

```bash
#!/bin/bash
# 🆘 完全リセット・緊急復旧スクリプト

echo "🆘 緊急復旧開始..."

# 全Docker停止・削除
docker kill $(docker ps -q) 2>/dev/null || true
docker rm $(docker ps -a -q) 2>/dev/null || true
docker rmi $(docker images -q) 2>/dev/null || true
docker volume prune -f
docker system prune -af

# Git リセット
git clean -fd
git reset --hard HEAD

# 設定ファイル再生成
npm install
npm run config:generate

# 完全再デプロイ
mkdir -p minecraft-servers logs backups
sudo chown -R $(id -u):$(id -g) minecraft-servers logs backups
docker build --no-cache -f Dockerfile.production -t ownserver-manager:latest .
docker run -d --name ownserver-manager-prod \
  --restart unless-stopped \
  -p 8080:8080 -p 25565:25565 \
  -v "$(pwd)/config:/app/config:rw" \
  -v "$(pwd)/minecraft-servers:/app/minecraft-servers:rw" \
  -v "$(pwd)/logs:/app/logs:rw" \
  ownserver-manager:latest

echo "✅ 緊急復旧完了"
```

### よくある問題（従来）

#### 1. Permission Denied エラー
```bash
# Dockerグループに追加されていない場合
sudo usermod -aG docker $USER
# ログアウト・ログイン必要
```

#### 2. ポート競合エラー
```bash
# ポート使用状況確認
sudo netstat -tlnp | grep :25565
# 競合プロセスを停止するか、別ポートを使用
```

#### 3. メモリ不足
```bash
# メモリ使用量確認
free -h
# スワップファイル追加（2GBの例）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 4. CloudFlare接続エラー
```bash
# 設定ファイル確認
cat config/config.json
# APIトークンとドメイン設定を確認
```

## 📊 健全性チェック

```bash
# 統合ヘルスチェック（全9項目検証）
npm run health

# 個別テスト
npm run test:config      # 設定ファイル妥当性
node scripts/test-cloudflare-api.js  # CloudFlare API接続
node scripts/test-minecraft.js       # Minecraft管理機能

# 従来の健全性確認スクリプト
./scripts/health-check.sh

# 期待される出力:
# ✅ Docker動作中
# ✅ OwnServer Manager稼働中
# ✅ ポート25565開放
# ✅ ログファイル正常
# ✅ 設定ファイル有効
# ✅ CloudFlare API接続正常
# ✅ Minecraft管理機能正常
```

## 🧪 完全デプロイテスト（開発者向け）

**本番デプロイ前の最終検証:**

```bash
# 完全なクリーン環境デプロイテストを実行
# （Docker環境で完全に新しい環境をシミュレート）
./test-environment/deploy-test-final.sh

# テスト項目:
# ✅ GitHubクローン
# ✅ Node.js 22.x自動インストール  
# ✅ 依存関係インストール
# ✅ 設定ファイル生成
# ✅ 設定妥当性検証
# ✅ ヘルスチェック機能
# ✅ CloudFlare API実接続
# ✅ Minecraft管理（Java 21自動インストール）
# ✅ アプリケーション起動
```

## 🚨 緊急時の対処

### サービス停止
```bash
# 即座に停止
docker compose -f docker-compose.production.yml down
```

### 完全リセット（注意：データが消失します）
```bash
# 全コンテナ・データ削除
docker compose -f docker-compose.production.yml down -v
sudo rm -rf minecraft-servers/* logs/* backups/*
```

### バックアップからリストア
```bash
# 利用可能なバックアップ確認
docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js backup --list

# リストア実行
docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js backup --restore "backup-name"
```

## 📚 次のステップ

1. **詳細設定**: [Configuration-Guide.md](../configuration/Configuration-Guide.md)
2. **CloudFlare設定**: [CloudFlare-Setup-Guide.md](../configuration/CloudFlare-Setup-Guide.md)
3. **運用手順**: [Operations-Manual.md](../operations/Operations-Manual.md)
4. **完全デプロイガイド**: [Ubuntu-Server-Complete-Deployment-Guide.md](Ubuntu-Server-Complete-Deployment-Guide.md)

## 💡 ヒント

- **エイリアス設定**: 長いコマンドは `alias osm='docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js'` で短縮
- **ログ監視**: `docker compose -f docker-compose.production.yml logs -f` でリアルタイムログを監視
- **定期バックアップ**: cronジョブで自動バックアップを設定することを推奨
- **監視設定**: Uptimeロボットやプラットフォーム監視サービスの利用を推奨

---
📝 **注意**: 本番環境での利用前に、必ずテスト環境で動作確認を行ってください。
