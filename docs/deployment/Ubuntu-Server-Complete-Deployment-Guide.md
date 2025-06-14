# OwnServer Manager Alpha 1.0.0 - Ubuntu Server 完全デプロイガイド

## 対象環境
- **OS**: Ubuntu Server 20.04 LTS / 22.04 LTS / 24.04 LTS
- **状態**: 新規インストール直後（何もインストールされていない状態）
- **権限**: sudo権限を持つユーザー

## システム要件

### 最小要件
- **CPU**: 2コア以上
- **メモリ**: 4GB以上 
- **ストレージ**: 20GB以上の空き容量
- **ネットワーク**: インターネット接続必須

### 推奨環境
- **CPU**: 4コア以上
- **メモリ**: 8GB以上
- **ストレージ**: 50GB以上のSSD
- **ネットワーク**: 安定したブロードバンド接続

## ステップ1: Ubuntu Server初期設定

### 1.1 システムアップデート
```bash
# パッケージリストを更新
sudo apt update

# システム全体をアップデート
sudo apt upgrade -y

# 必要に応じて再起動
sudo reboot
```

### 1.2 基本パッケージのインストール
```bash
# 必要な基本パッケージをインストール
sudo apt install -y curl wget git nano vim htop unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# タイムゾーンの設定（日本時間の場合）
sudo timedatectl set-timezone Asia/Tokyo

# ロケール設定の確認
locale

# 必要に応じてロケール設定
sudo locale-gen en_US.UTF-8
```

### 1.3 ファイアウォール設定
```bash
# UFWファイアウォールを有効化
sudo ufw enable

# SSH接続を許可（現在の接続が切れないよう注意）
sudo ufw allow ssh

# Minecraftポートを開放
sudo ufw allow 25565/tcp

# 設定確認
sudo ufw status
```

### 1.4 スワップファイル設定（メモリが少ない場合）
```bash
# 現在のスワップ状況確認
free -h

# 2GBのスワップファイル作成（メモリが4GB未満の場合推奨）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永続化設定
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 確認
free -h
```

## ステップ2: Docker環境構築

### 2.1 Docker公式リポジトリ追加
```bash
# Docker公式GPGキーを追加
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Dockerリポジトリを追加
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# パッケージリスト更新
sudo apt update
```

### 2.2 Dockerインストール
```bash
# Docker Engine、CLI、containerdをインストール
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Dockerサービス開始・自動起動設定
sudo systemctl start docker
sudo systemctl enable docker

# 現在のユーザーをdockerグループに追加（sudo不要にする）
sudo usermod -aG docker $USER

# グループ変更を反映するため一度ログアウト・ログイン
echo "ログアウト・ログインしてからDocker設定を確認してください"
```

### 2.3 Docker動作確認
```bash
# 再ログイン後、Docker動作確認
docker --version
docker compose version

# テスト実行
docker run hello-world

# 正常に動作すれば成功メッセージが表示されます
```

## ステップ3: OwnServer Manager デプロイ

### 3.1 プロジェクトファイルの取得
```bash
# 適切なディレクトリに移動（ホームディレクトリまたは/opt推奨）
cd ~

# GitHubからクローン
git clone https://github.com/your-username/ownserver-manager.git

# ディレクトリに移動
cd ownserver-manager

# 最新のalpha-1.0.0タグをチェックアウト
git checkout tags/alpha-1.0.0

# プロジェクト構造確認
ls -la
```

### 3.2 設定ファイルの準備
```bash
# 設定用ディレクトリの権限確認
ls -la config/

# 本番環境用設定ファイルをコピー・編集
cp config/production.env config/production.env.local
nano config/production.env.local

# CloudFlare設定ファイルの確認・初期化
ls -la config/config.json

# config.jsonが存在しない場合、テンプレートから作成
if [ ! -f config/config.json ]; then
    echo '{
  "cloudflare": {
    "domain": "yourdomain.com",
    "apiToken": "your_cloudflare_api_token",
    "zoneId": "your_zone_id",
    "email": "your_email@example.com"
  },
  "minecraft": {
    "defaultPort": 25565,
    "serverPath": "/app/minecraft-servers"
  }
}' > config/config.json
fi

# 設定ファイルの権限を適切に設定
chmod 600 config/config.json config/production.env.local
```

### 3.3 環境変数の設定
`config/production.env.local` を編集し、以下の項目を設定：

```bash
# Node.js環境設定
NODE_ENV=production

# ログレベル（error, warn, info, debug）
LOG_LEVEL=info

# データ保存パス
DATA_PATH=/app/minecraft-servers
CONFIG_PATH=/app/config
BACKUP_PATH=/app/backups

# セキュリティ設定
ENABLE_SSL=false
ADMIN_PASSWORD=your_secure_admin_password

# 監視設定
HEALTH_CHECK_INTERVAL=300000
BACKUP_RETENTION_DAYS=7
```

## ステップ4: CloudFlare DNS設定

### 4.1 CloudFlareアカウント準備
1. [CloudFlare](https://www.cloudflare.com)でアカウント作成
2. ドメインを追加してDNSをCloudFlareに移管
3. API トークンを生成

### 4.2 API情報の設定
```bash
# 設定ファイルを編集
nano config/config.json
```

以下の情報を設定：
```json
{
  "cloudflare": {
    "domain": "yourdomain.com",
    "apiToken": "your_cloudflare_api_token",
    "zoneId": "your_zone_id",
    "email": "your_email@example.com"
  }
}
```

## ステップ5: 本番環境でのデプロイ

### 5.1 Docker Composeを使用した簡単デプロイ（推奨）
```bash
# 必要なディレクトリを作成
mkdir -p minecraft-servers logs backups

# 本番環境用設定ファイルをコピー・編集
cp config/production.env config/production.env.local
nano config/production.env.local

# Docker Composeで本番環境を起動
docker compose -f docker-compose.production.yml up -d

# 起動確認
docker compose -f docker-compose.production.yml ps
```

### 5.2 手動Dockerデプロイ（上級者向け）
```bash
# 本番環境用Dockerイメージをビルド
docker build -f Dockerfile.production -t ownserver-manager:alpha-1.0.0-production .

# ビルド完了確認
docker images | grep ownserver-manager

# 本番環境コンテナを起動
docker run -d --name ownserver-manager-prod \
  --restart unless-stopped \
  -p 25565:25565 \
  -v $(pwd)/minecraft-servers:/app/minecraft-servers \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/backups:/app/backups \
  --env-file config/production.env.local \
  ownserver-manager:alpha-1.0.0-production

# 起動確認
docker ps | grep ownserver-manager-prod
```

### 5.3 動作確認
```bash
# Docker Composeでデプロイした場合
docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js health
docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js status
docker compose -f docker-compose.production.yml logs ownserver-manager

# 手動Dockerデプロイの場合
docker exec ownserver-manager-prod node src/commands/cli.js health
docker exec ownserver-manager-prod node src/commands/cli.js status
docker logs ownserver-manager-prod
```

## ステップ6: サービス自動起動設定

### 6.1 systemdサービスファイル作成（Docker Compose版）
```bash
# サービスファイルを作成
sudo nano /etc/systemd/system/ownserver-manager.service
```

以下の内容を記述（パスを実際のユーザーディレクトリに変更）：
```ini
[Unit]
Description=OwnServer Manager
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/YOUR_USERNAME/ownserver-manager
ExecStart=/usr/bin/docker compose -f docker-compose.production.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.production.yml down
TimeoutStartSec=0
User=YOUR_USERNAME
Group=YOUR_USERNAME

[Install]
WantedBy=multi-user.target
```

### 6.1b systemdサービスファイル作成（手動Docker版）
```bash
# 手動Dockerデプロイの場合のサービスファイル
sudo nano /etc/systemd/system/ownserver-manager.service
```

以下の内容を記述：
```ini
[Unit]
Description=OwnServer Manager
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/YOUR_USERNAME/ownserver-manager
ExecStart=/usr/bin/docker start ownserver-manager-prod
ExecStop=/usr/bin/docker stop ownserver-manager-prod
TimeoutStartSec=0
User=YOUR_USERNAME
Group=YOUR_USERNAME

[Install]
WantedBy=multi-user.target
```

### 6.2 サービス有効化
```bash
# サービスファイル再読み込み
sudo systemctl daemon-reload

# サービス有効化
sudo systemctl enable ownserver-manager.service

# サービス状態確認
sudo systemctl status ownserver-manager.service
```

## ステップ7: セキュリティ強化

### 7.1 SSH設定強化
```bash
# SSH設定ファイルをバックアップ
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# SSH設定を編集
sudo nano /etc/ssh/sshd_config
```

推奨設定：
```
Port 22
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
X11Forwarding no
AllowUsers your-username
```

### 7.2 fail2ban設定
```bash
# fail2banインストール
sudo apt install -y fail2ban

# 設定ファイルをコピー
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# SSH保護設定
sudo nano /etc/fail2ban/jail.local
```

## ステップ8: 監視・ログ設定

### 8.1 ログローテーション設定
```bash
# ログローテーション設定
sudo nano /etc/logrotate.d/ownserver-manager
```

以下の設定を追加：
```
/home/username/ownserver-manager/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
```

### 8.2 定期的なヘルスチェック設定
```bash
# cronジョブ設定
crontab -e
```

以下を追加（Docker Compose版）：
```bash
# 5分毎にヘルスチェック実行
*/5 * * * * cd /home/YOUR_USERNAME/ownserver-manager && docker compose -f docker-compose.production.yml exec -T ownserver-manager node src/commands/cli.js health >> logs/health.log 2>&1

# 日次でバックアップ実行
0 2 * * * cd /home/YOUR_USERNAME/ownserver-manager && docker compose -f docker-compose.production.yml exec -T ownserver-manager node src/commands/cli.js backup --create >> logs/backup.log 2>&1
```

以下を追加（手動Docker版）：
```bash
# 5分毎にヘルスチェック実行
*/5 * * * * cd /home/YOUR_USERNAME/ownserver-manager && docker exec ownserver-manager-prod node src/commands/cli.js health >> logs/health.log 2>&1

# 日次でバックアップ実行
0 2 * * * cd /home/YOUR_USERNAME/ownserver-manager && docker exec ownserver-manager-prod node src/commands/cli.js backup --create >> logs/backup.log 2>&1
```

## デプロイ完了後の確認事項

### ✅ チェックリスト
- [ ] Docker、Docker Compose正常動作
- [ ] OwnServer Managerコンテナ起動
- [ ] ヘルスチェック正常
- [ ] CloudFlare DNS設定完了
- [ ] ファイアウォール設定
- [ ] SSL/TLS証明書設定（必要に応じて）
- [ ] バックアップ設定
- [ ] 監視設定
- [ ] ログローテーション設定

### 🔧 基本的な管理コマンド

#### Docker Compose版
```bash
# サービス状態確認
docker compose -f docker-compose.production.yml ps

# ログ確認
docker compose -f docker-compose.production.yml logs ownserver-manager

# コンテナ内でCLI実行
docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js status

# サービス再起動
docker compose -f docker-compose.production.yml restart

# サービス停止・開始
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d

# アップデート（新しいイメージ取得後）
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
```

#### 手動Docker版
```bash
# サービス状態確認
docker ps | grep ownserver-manager-prod

# ログ確認
docker logs ownserver-manager-prod

# コンテナ内でCLI実行
docker exec ownserver-manager-prod node src/commands/cli.js status

# コンテナ再起動
docker restart ownserver-manager-prod

# アップデート（新しいイメージ取得後）
docker stop ownserver-manager-prod
docker rm ownserver-manager-prod
# 新しいイメージでコンテナ再作成
```

## トラブルシューティング

### よくある問題と解決方法

#### Docker Permission Denied
```bash
# ユーザーをdockerグループに追加
sudo usermod -aG docker $USER
# ログアウト・ログインで反映
```

#### ポート競合エラー
```bash
# ポート使用状況確認
sudo netstat -tlnp | grep :25565
# 競合プロセスを停止または異なるポートを使用
```

#### メモリ不足
```bash
# メモリ使用量確認
free -h
docker stats
# スワップファイル追加または不要プロセス停止
```

## サポート・お問い合わせ

- **GitHub Issues**: [リポジトリURL]/issues
- **ドキュメント**: [ドキュメントURL]
- **Wiki**: [WikiURL]

---

📝 **注意**: このガイドに従ってデプロイを行う前に、必ずテスト環境で動作確認を行ってください。
