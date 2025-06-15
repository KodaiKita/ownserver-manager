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

## ステップ3: Node.js環境構築

### 3.1 Node.js インストール
```bash
# NodeSourceリポジトリを追加
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Node.jsをインストール
sudo apt install -y nodejs

# バージョン確認
node --version
npm --version

# 推奨: npm の最新版に更新
sudo npm install -g npm@latest
```

## ステップ4: OwnServer Manager デプロイ

### 4.1 プロジェクトファイルの取得
```bash
# 適切なディレクトリに移動（ホームディレクトリまたは/opt推奨）
cd ~

# GitHubからクローン
git clone https://github.com/KodaiKita/ownserver-manager.git

# ディレクトリに移動
cd ownserver-manager

# 最新のalpha-1.0.0タグをチェックアウト
git checkout tags/alpha-1.0.0

# プロジェクト構造確認
ls -la

# Node.js依存関係をインストール
npm install
```

### 4.2 🔧 **新機能: 統合設定管理システム（推奨）**

**統合設定により、複雑な設定作業を大幅に簡素化:**

```bash
# 統合設定システムでセットアップ開始
npm run setup

# または手動でテンプレート生成
npm run config:template
```

**マスター設定ファイルの編集:**
```bash
# テンプレートをコピー
cp config/master.json.example config/master.json

# マスター設定を編集（4項目のみ）
nano config/master.json
```

**config/master.json で編集する必須項目:**
```json
{
  "cloudflare": {
    "domain": "your-domain.com",           // 🔧 あなたのドメイン
    "apiToken": "your-cloudflare-api-token", // 🔧 CloudFlare APIトークン
    "zoneId": "your-cloudflare-zone-id",   // 🔧 CloudFlare Zone ID  
    "email": "your-email@example.com"      // 🔧 CloudFlareアカウントメール
  },
  "environment": "production",
  // ... その他の設定はデフォルトで適切に設定済み
}
```

**CloudFlare設定の取得方法:**
1. **APIトークン**: CloudFlareダッシュボード → マイプロファイル → APIトークン → カスタムトークンを作成
2. **Zone ID**: CloudFlareダッシュボード → 該当ドメイン → Overview → Zone ID（右下）
3. **Email**: CloudFlareアカウントのメールアドレス

```bash
# 全設定ファイルを自動生成
npm run config:generate

# 生成結果を確認
echo "✅ 生成された設定ファイル:"
ls -la config/*.json config/*.env

# ✅ config/config.json       (アプリケーション設定)
# ✅ config/.env              (環境変数)
# ✅ config/docker.env        (Docker環境変数)
# ✅ config/production.env    (本番環境設定)
```

## 💡 統合設定管理システムの詳細

### 🔧 仕組み
1. **master.json**: 一つのマスター設定ファイル
2. **自動生成**: 4つの設定ファイルを自動作成
3. **一元管理**: 重複入力・転記ミスを防止

### 📋 生成される設定ファイル
```bash
npm run config:generate
```
実行後に以下が自動生成：

| ファイル | 用途 | 説明 |
|---------|------|------|
| `config/config.json` | アプリ設定 | メイン設定ファイル |
| `config/.env` | 環境変数 | 開発環境用 |
| `config/docker.env` | Docker環境変数 | Docker Compose用 |
| `config/production.env` | 本番環境設定 | 本番環境用 |

### 🚨 重要な注意事項
- **⚠️ 生成されたファイルは直接編集しない**
- **✅ master.json のみを編集する**
- **🔄 変更後は `npm run config:generate` を再実行**

### 🛠️ トラブルシューティング

#### エラー: 必須設定が不足
```bash
❌ Missing required configuration: cloudflare.domain, cloudflare.apiToken
```
**解決**: `config/master.json` の CloudFlare設定を確認

#### エラー: ファイル権限問題
```bash
❌ Error: EACCES: permission denied
```
**解決**:
```bash
chmod 600 config/master.json
chmod 644 config/*.env config/*.json
```

#### 設定リセット
```bash
# 全設定をリセットして最初からやり直し
rm -f config/master.json config/config.json config/*.env
npm run setup
```

### 📖 上級者向けカスタマイズ

#### カスタム設定項目
`master.json` で以下も設定可能：

```json
{
  "minecraft": {
    "memoryMin": "2G",
    "memoryMax": "4G",
    "port": 25565
  },
  "logging": {
    "level": "info",
    "maxFiles": 5
  },
  "backup": {
    "enabled": true,
    "retention": 14
  },
  "security": {
    "enableSSL": true,
    "sessionSecret": "your-secret-key"
  }
}
```

#### 設定スキーマ確認
```bash
# 利用可能な設定項目を確認
node -e "console.log(JSON.stringify(require('./src/utils/UnifiedConfigManager.js'), null, 2))"
```
</details>

## ステップ5: CloudFlare DNS設定

### 5.1 CloudFlareアカウント準備
1. [CloudFlare](https://www.cloudflare.com)でアカウント作成
2. ドメインを追加してDNSをCloudFlareに移管
3. API トークンを生成

### 5.2 APIトークンの作成
1. CloudFlareダッシュボード → 右上のプロフィール → **マイプロファイル**
2. **APIトークン** タブ → **カスタムトークンを作成**
3. 権限設定:
   - **Zone:Zone:Read**
   - **Zone:DNS:Edit**
4. ゾーンリソース: **特定のゾーンを含める** → あなたのドメインを選択
5. トークンを作成・コピー（安全に保管）

### 5.3 Zone IDの取得
1. CloudFlareダッシュボード → あなたのドメインを選択
2. 右下の **API** セクション → **Zone ID** をコピー

### 5.4 設定の確認
統合設定管理を使用した場合、これらの値は既に `config/master.json` に設定済みです。

```bash
# 設定確認
grep -E "(domain|apiToken|zoneId|email)" config/master.json

# 設定が正しく反映されているか確認
grep -E "(CLOUDFLARE_|cloudflare)" config/docker.env config/production.env
```

### 4.2 API情報の設定
```bash
# 設定ファイルを編集
nano config/config.json
```

## ステップ6: 本番環境でのデプロイ

### 6.1 Docker Composeを使用した簡単デプロイ（推奨）
```bash
# 必要なディレクトリを作成
mkdir -p minecraft-servers logs backups

# 統合設定管理の場合、設定は既に完了しているので直接起動
docker compose -f docker-compose.production.yml up -d

# 起動確認
docker compose -f docker-compose.production.yml ps

# 従来設定の場合（非推奨）
# cp config/production.env config/production.env.local
# nano config/production.env.local
```

### 6.2 初回起動チェック
```bash
# サービス状態確認
docker compose -f docker-compose.production.yml exec ownserver-manager npm run cli status

# ログ確認
docker compose -f docker-compose.production.yml logs ownserver-manager --tail=50

# 設定確認
docker compose -f docker-compose.production.yml exec ownserver-manager npm run cli config --show
```

### 6.3 手動Dockerデプロイ（上級者向け）
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
  --env-file config/docker.env \
  ownserver-manager:alpha-1.0.0-production

# 起動確認
docker ps | grep ownserver-manager-prod

# CLIコマンドテスト
docker exec ownserver-manager-prod node src/commands/cli.js status
```

## ステップ7: サービス自動起動設定

### 7.1 systemdサービスファイル作成（Docker Compose版）
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
