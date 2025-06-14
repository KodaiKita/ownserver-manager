# OwnServer Manager Alpha 1.0.0 - 運用マニュアル

## 概要
このマニュアルは、OwnServer Managerの日常運用、監視、メンテナンス手順を説明します。

## 日常的な運用コマンド

### 基本状態確認

#### Docker Compose版
```bash
# システム全体の状態確認
docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js status

# ヘルスチェック実行
docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js health

# コンテナ稼働状況確認
docker compose -f docker-compose.production.yml ps

# リソース使用量確認
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" $(docker compose -f docker-compose.production.yml ps -q)
```

#### 手動Docker版
```bash
# システム全体の状態確認
docker exec ownserver-manager-prod node src/commands/cli.js status

# ヘルスチェック実行
docker exec ownserver-manager-prod node src/commands/cli.js health

# コンテナ稼働状況確認
docker ps | grep ownserver-manager-prod

# リソース使用量確認
docker stats ownserver-manager-prod --no-stream
```

### サービス制御

#### Docker Compose版
```bash
# サービス停止
docker compose -f docker-compose.production.yml down

# サービス開始
docker compose -f docker-compose.production.yml up -d

# サービス再起動
docker compose -f docker-compose.production.yml restart

# 強制停止（緊急時のみ）
docker compose -f docker-compose.production.yml kill
```

#### 手動Docker版
```bash
# サービス停止
docker stop ownserver-manager-prod

# サービス開始
docker start ownserver-manager-prod

# サービス再起動
docker restart ownserver-manager-prod

# 強制停止（緊急時のみ）
docker kill ownserver-manager-prod
```

### Minecraftサーバー管理
```bash
# Minecraftサーバー状態確認
docker exec ownserver-manager-prod node src/commands/cli.js status

# プレイヤー一覧表示
docker exec ownserver-manager-prod node src/commands/cli.js players --list

# サーバーコマンド送信
docker exec ownserver-manager-prod node src/commands/cli.js mc "say サーバーメンテナンス中"

# サーバー公開/非公開切り替え
docker exec ownserver-manager-prod node src/commands/cli.js public
docker exec ownserver-manager-prod node src/commands/cli.js private
```

## 監視とログ管理

### ログ確認方法
```bash
# コンテナログ確認（最新100行）
docker logs --tail 100 ownserver-manager-prod

# リアルタイムログ監視
docker logs -f ownserver-manager-prod

# アプリケーションログ確認
tail -f logs/app.log
tail -f logs/minecraft.log
tail -f logs/ownserver.log

# エラーログのみ抽出
docker logs ownserver-manager-prod 2>&1 | grep -i "error\|exception\|failed"
```

### 監視項目とアラート基準

#### システムリソース監視
```bash
# メモリ使用量監視
docker stats ownserver-manager-prod --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# ディスク使用量確認
df -h
du -sh minecraft-servers/ logs/ backups/

# ネットワーク監視
netstat -tlnp | grep :25565
```

#### アラート基準
- **メモリ使用率**: 85%以上で警告、95%以上で緊急
- **CPU使用率**: 80%以上で警告、90%以上で緊急  
- **ディスク使用率**: 80%以上で警告、90%以上で緊急
- **ヘルスチェック失敗**: 3回連続で警告

### パフォーマンス監視
```bash
# 詳細統計情報表示
docker exec ownserver-manager-prod node src/commands/cli.js monitor --stats

# パフォーマンス履歴確認
docker exec ownserver-manager-prod node src/commands/cli.js monitor --history 24

# アラート確認
docker exec ownserver-manager-prod node src/commands/cli.js monitor --alerts
```

## バックアップとリストア

### バックアップ作成
```bash
# 手動バックアップ作成
docker exec ownserver-manager-prod node src/commands/cli.js backup --create "manual-$(date +%Y%m%d-%H%M%S)"

# 自動バックアップ確認
docker exec ownserver-manager-prod node src/commands/cli.js backup --list

# バックアップファイル確認
ls -la backups/
```

### リストア手順
```bash
# 利用可能なバックアップ一覧表示
docker exec ownserver-manager-prod node src/commands/cli.js backup --list

# 特定のバックアップからリストア
docker exec ownserver-manager-prod node src/commands/cli.js backup --restore "backup-20241214-120000"

# 注意: リストア前に現在の状態をバックアップ推奨
```

### バックアップ管理
```bash
# 古いバックアップ削除
docker exec ownserver-manager-prod node src/commands/cli.js backup --delete "old-backup-name"

# バックアップ設定確認
cat config/config.json | grep -A 10 backup
```

## 設定管理

### 設定確認・変更
```bash
# 現在の設定表示
docker exec ownserver-manager-prod node src/commands/cli.js config --show

# 特定設定値の確認
docker exec ownserver-manager-prod node src/commands/cli.js config --get minecraft.port

# 設定値の変更
docker exec ownserver-manager-prod node src/commands/cli.js config --set minecraft.port=25566

# 設定変更後はサービス再起動推奨
docker restart ownserver-manager-prod
```

### CloudFlare DNS管理
```bash
# DNS状態確認
docker exec ownserver-manager-prod node test-cloudflare-dns.js

# 外部接続テスト
docker exec ownserver-manager-prod node test-external-connectivity.js

# DNS設定の手動更新（必要に応じて）
# config/config.jsonを編集後、サービス再起動
```

## トラブルシューティング

### 一般的な問題と解決方法

#### コンテナが起動しない
```bash
# コンテナ状態確認
docker ps -a | grep ownserver-manager-prod

# ログ確認
docker logs ownserver-manager-prod

# イメージ確認
docker images | grep ownserver-manager

# 解決策：
# 1. ログでエラー内容を確認
# 2. 設定ファイルの権限確認
# 3. ディスク容量確認
# 4. 必要に応じてコンテナ再作成
```

#### ヘルスチェック失敗
```bash
# 手動ヘルスチェック実行
docker exec ownserver-manager-prod node src/commands/cli.js health

# サービス状態詳細確認
docker exec ownserver-manager-prod node src/commands/cli.js status

# 解決策：
# 1. 各サービス（Minecraft、OwnServer、CloudFlare）の状態確認
# 2. 設定ファイルの検証
# 3. ネットワーク接続確認
# 4. 必要に応じてサービス再起動
```

#### Minecraftサーバーに接続できない
```bash
# ポート確認
netstat -tlnp | grep :25565

# ファイアウォール確認
sudo ufw status

# DNS設定確認
nslookup your-domain.com

# 解決策：
# 1. ファイアウォール設定確認
# 2. CloudFlare DNS設定確認
# 3. OwnServerサービス状態確認
# 4. Minecraftサーバー設定確認
```

#### メモリ不足
```bash
# メモリ使用量確認
free -h
docker stats

# 解決策：
# 1. 不要なプロセス停止
# 2. スワップファイル追加
# 3. Java メモリ設定調整
# 4. サーバーリソース増強
```

#### ディスク容量不足
```bash
# ディスク使用量確認
df -h
du -sh minecraft-servers/ logs/ backups/

# 解決策：
# 1. 古いログファイル削除
# 2. 古いバックアップ削除
# 3. Minecraftワールドデータ整理
# 4. ディスク容量増設
```

### 緊急時対応手順

#### サービス完全停止時
```bash
# 1. 状況確認
docker ps -a
docker logs ownserver-manager-prod

# 2. 緊急再起動
docker restart ownserver-manager-prod

# 3. 改善しない場合
docker stop ownserver-manager-prod
docker rm ownserver-manager-prod

# 4. コンテナ再作成
docker run -d --name ownserver-manager-prod \
  --restart unless-stopped \
  -p 25565:25565 \
  -v $(pwd)/minecraft-servers:/app/minecraft-servers \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/backups:/app/backups \
  --env-file config/production.env \
  ownserver-manager:alpha-1.0.0-production \
  tail -f /dev/null
```

#### データ破損時
```bash
# 1. サービス停止
docker stop ownserver-manager-prod

# 2. 最新バックアップから復旧
docker exec ownserver-manager-prod node src/commands/cli.js backup --list
docker exec ownserver-manager-prod node src/commands/cli.js backup --restore "latest-backup"

# 3. サービス再開
docker start ownserver-manager-prod

# 4. 動作確認
docker exec ownserver-manager-prod node src/commands/cli.js health
```

## メンテナンス手順

### 定期メンテナンス（週次推奨）
```bash
# 1. バックアップ作成
docker exec ownserver-manager-prod node src/commands/cli.js backup --create "weekly-$(date +%Y%m%d)"

# 2. ログファイル整理
sudo logrotate -f /etc/logrotate.d/ownserver-manager

# 3. 古いバックアップ削除（30日以上古いもの）
find backups/ -name "*.tar.gz" -mtime +30 -delete

# 4. システム更新確認
docker images | grep ownserver-manager

# 5. リソース使用量確認
docker stats ownserver-manager-prod --no-stream
df -h
```

### アップデート手順
```bash
# 1. 現在の設定バックアップ
cp -r config/ config.backup.$(date +%Y%m%d)

# 2. 新しいイメージの取得
git pull origin main
docker build -f Dockerfile.production -t ownserver-manager:alpha-1.0.0-production .

# 3. サービス停止
docker stop ownserver-manager-prod
docker rm ownserver-manager-prod

# 4. 新しいコンテナで起動
docker run -d --name ownserver-manager-prod \
  --restart unless-stopped \
  -p 25565:25565 \
  -v $(pwd)/minecraft-servers:/app/minecraft-servers \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/backups:/app/backups \
  --env-file config/production.env \
  ownserver-manager:alpha-1.0.0-production \
  tail -f /dev/null

# 5. 動作確認
docker exec ownserver-manager-prod node src/commands/cli.js health
```

## 監視スクリプト例

### 自動監視スクリプト
```bash
#!/bin/bash
# health-monitor.sh - 定期ヘルスチェックスクリプト

LOG_FILE="/home/username/ownserver-manager/logs/health-monitor.log"
EMAIL="admin@yourdomain.com"

# ヘルスチェック実行
if ! docker exec ownserver-manager-prod node src/commands/cli.js health > /dev/null 2>&1; then
    echo "$(date): Health check failed" >> $LOG_FILE
    
    # メール通知（mailコマンドが設定されている場合）
    echo "OwnServer Manager health check failed at $(date)" | mail -s "OwnServer Manager Alert" $EMAIL
    
    # 自動復旧試行
    echo "$(date): Attempting automatic recovery" >> $LOG_FILE
    docker restart ownserver-manager-prod
fi

# リソース使用量記録
echo "$(date): $(docker stats ownserver-manager-prod --no-stream --format '{{.CPUPerc}} {{.MemPerc}}')" >> $LOG_FILE
```

### cronジョブ設定例
```bash
# crontab -e で以下を追加

# 5分毎のヘルスチェック
*/5 * * * * /home/username/ownserver-manager/health-monitor.sh

# 日次バックアップ（午前2時）
0 2 * * * cd /home/username/ownserver-manager && docker exec ownserver-manager-prod node src/commands/cli.js backup --create "daily-$(date +\%Y\%m\%d)"

# 週次レポート（日曜日午前3時）
0 3 * * 0 cd /home/username/ownserver-manager && docker stats ownserver-manager-prod --no-stream > logs/weekly-stats-$(date +\%Y\%m\%d).log
```

## パフォーマンス最適化

### メモリ最適化
```bash
# Java ヒープサイズ調整
# config/config.jsonでminecraft.javaArgsを編集
# 例: ["-Xmx2G", "-Xms1G"] → ["-Xmx3G", "-Xms2G"]
```

### ディスク最適化
```bash
# 定期的なクリーンアップ
docker system prune -f
docker volume prune -f

# ログファイルサイズ制限
# /etc/logrotate.d/ownserver-manager で設定
```

---

📝 **注意**: 本マニュアルの手順を実行する前に、必ずバックアップを作成してください。
