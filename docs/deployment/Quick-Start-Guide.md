# OwnServer Manager Alpha 1.0.0 - クイックスタートガイド

## 🚀 最速デプロイ手順（Ubuntu Server）

このガイドは、新規Ubuntu Serverに最も迅速にOwnServer Managerをデプロイする手順です。

### 前提条件
- Ubuntu Server 20.04/22.04/24.04 LTS
- sudo権限を持つユーザー
- インターネット接続

### ⚡ ワンライナーインストール（実験的）

```bash
# 全自動インストールスクリプト（注意：本番環境では内容を確認してから実行）
curl -fsSL https://raw.githubusercontent.com/your-username/ownserver-manager/alpha-1.0.0/scripts/install.sh | bash
```

### 📋 ステップバイステップ（推奨）

#### ステップ1: システム準備
```bash
# システム更新
sudo apt update && sudo apt upgrade -y

# 必要なパッケージインストール
sudo apt install -y curl git

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
git clone https://github.com/your-username/ownserver-manager.git
cd ownserver-manager

# 安定版（alpha-1.0.0）をチェックアウト
git checkout tags/alpha-1.0.0
```

#### ステップ3: 設定
```bash
# 基本設定ファイル準備
cp config/production.env config/production.env.local

# CloudFlare設定（オプション）
cp config/config.json.example config/config.json
nano config/config.json  # ドメイン・APIトークンを設定
```

#### ステップ4: 起動
```bash
# 必要なディレクトリを作成
mkdir -p minecraft-servers logs backups

# Docker Composeで起動
docker compose -f docker-compose.production.yml up -d
```

#### ステップ5: 動作確認
```bash
# ヘルスチェック
docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js health

# ステータス確認
docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js status

# ファイアウォール設定
sudo ufw allow 25565/tcp
sudo ufw enable
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

## 🔧 トラブルシューティング

### よくある問題

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
# 全体的な健全性確認スクリプト
./scripts/health-check.sh

# 期待される出力:
# ✅ Docker動作中
# ✅ OwnServer Manager稼働中
# ✅ ポート25565開放
# ✅ ログファイル正常
# ✅ 設定ファイル有効
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
