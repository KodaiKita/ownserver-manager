# OwnServer Manager Alpha 1.0.0 - よくある質問（FAQ）

## 🔍 一般的な質問

### Q1: OwnServer Managerとは何ですか？
A: Minecraftサーバーを簡単に管理・運用するためのツールです。Docker環境で動作し、CloudFlare DNSと連携してサーバーの公開/非公開を自動化できます。

### Q2: どのような環境で動作しますか？
A: Ubuntu Server 20.04/22.04/24.04 LTS、Docker、Node.js 18以上が必要です。メモリ4GB以上、ストレージ20GB以上を推奨します。

### Q3: CloudFlareは必須ですか？
A: いいえ、オプションです。CloudFlareを使用しない場合でも、ローカルでMinecraftサーバーの管理は可能です。

### Q4: 複数のMinecraftサーバーを管理できますか？
A: Alpha 1.0.0では単一サーバーの管理のみサポートしています。複数サーバー対応は将来のバージョンで予定されています。

## 🔧 インストール・設定

### Q5: インストールに失敗します
A: 以下を確認してください：
- Ubuntu Serverが最新状態に更新されているか
- インターネット接続が安定しているか
- sudo権限があるか
- 十分なディスク容量があるか（最低20GB）

### Q6: Dockerのインストールでエラーが出ます
A: 
```bash
# Docker公式インストールスクリプト使用
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# ユーザーをdockerグループに追加
sudo usermod -aG docker $USER

# ログアウト・ログインでグループ変更を反映
```

### Q7: "Permission denied" エラーが出ます
A: Dockerグループへの追加後、必ずログアウト・ログインしてください：
```bash
sudo usermod -aG docker $USER
# ログアウト・ログイン必要
```

### Q8: ポート25565が使用できません
A: 
```bash
# ポート使用状況確認
sudo netstat -tlnp | grep :25565

# 競合プロセスを停止するか、docker-compose.production.ymlでポートを変更
# ports:
#   - "25566:25565"  # 外部ポートを25566に変更
```

## 💾 バックアップ・復元

### Q9: バックアップはどこに保存されますか？
A: `backups/` ディレクトリに保存されます。バックアップファイルはタイムスタンプ付きで自動命名されます。

### Q10: 自動バックアップを設定できますか？
A: はい、cronジョブで設定可能です：
```bash
crontab -e
# 毎日午前2時にバックアップ
0 2 * * * cd /home/YOUR_USERNAME/ownserver-manager && docker compose -f docker-compose.production.yml exec -T ownserver-manager node src/commands/cli.js backup --create >> logs/backup.log 2>&1
```

### Q11: バックアップから復元する方法は？
A:
```bash
# 利用可能なバックアップ確認
docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js backup --list

# 復元実行
docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js backup --restore "backup-name"
```

## 🌐 CloudFlare設定

### Q12: CloudFlare APIトークンが分かりません
A: CloudFlareダッシュボード → 「マイプロファイル」→ 「APIトークン」→ 「カスタムトークンを作成」で以下の権限で作成：
- Zone:Zone:Read
- Zone:DNS:Edit

### Q13: DNSレコードが更新されません
A: 
1. APIトークンの権限確認
2. ゾーンIDが正しいか確認
3. ドメイン名のスペルチェック
```bash
# 設定確認
cat config/config.json | grep -A 10 cloudflare
```

### Q14: CloudFlare設定なしでも使えますか？
A: はい、config.jsonでCloudFlare設定を空にすることで、ローカル管理のみで使用可能です。

## 🔄 運用・メンテナンス

### Q15: サーバーが応答しません
A: 以下の順序で確認：
1. `docker ps` でコンテナが稼働中か確認
2. `docker logs コンテナ名` でエラーログ確認
3. `docker compose -f docker-compose.production.yml restart` で再起動
4. ファイアウォール設定確認

### Q16: メモリ使用量が多すぎます
A: 
```bash
# 現在のメモリ使用量確認
docker stats --no-stream

# Minecraftサーバーのメモリ制限調整（docker-compose.production.yml）
environment:
  JAVA_OPTS: "-Xmx2G -Xms1G"  # 最大2GB、初期1GB
```

### Q17: ログファイルが大きくなりすぎます
A: ログローテーション設定：
```bash
sudo nano /etc/logrotate.d/ownserver-manager
```
```
/home/YOUR_USERNAME/ownserver-manager/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
```

### Q18: アップデート方法は？
A:
```bash
# 新しいバージョンを取得
git fetch --tags
git checkout tags/alpha-1.0.1  # 新しいバージョン

# Docker イメージ再ビルド
docker compose -f docker-compose.production.yml build

# サービス再起動
docker compose -f docker-compose.production.yml up -d
```

## 🚨 トラブルシューティング

### Q19: "Cannot connect to the Docker daemon" エラー
A:
```bash
# Dockerサービス確認
sudo systemctl status docker

# Dockerサービス開始
sudo systemctl start docker
sudo systemctl enable docker
```

### Q20: Javaのメモリエラーが出ます
A: Javaヒープサイズを調整：
```bash
# docker-compose.production.yml内で
environment:
  JAVA_OPTS: "-Xmx4G -Xms2G"  # システムメモリに応じて調整
```

### Q21: プレイヤーが接続できません
A:
1. ファイアウォール確認：`sudo ufw status`
2. ポート開放確認：`sudo ufw allow 25565/tcp`
3. サーバーステータス確認：CLIの `status` コマンド
4. ログ確認：`docker logs` でエラーをチェック

### Q22: 設定変更が反映されません
A:
```bash
# 設定ファイル構文確認
docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js config --check

# サービス再起動
docker compose -f docker-compose.production.yml restart
```

## 🔒 セキュリティ

### Q23: セキュリティ対策は何が必要ですか？
A:
1. SSH設定強化（公開鍵認証、ポート変更）
2. fail2ban設定
3. 定期的なシステム更新
4. ファイアウォール設定（必要なポートのみ開放）
5. 強力なパスワード使用

### Q24: SSL/TLS証明書は設定できますか？
A: Alpha 1.0.0ではMinecraftサーバー自体がHTTPSを使用しないため、通常は不要です。Web管理画面を追加する場合の将来バージョンで対応予定です。

## 📊 監視・パフォーマンス

### Q25: パフォーマンス監視はできますか？
A: はい、以下のコマンドで可能です：
```bash
# リソース使用量確認
docker stats

# 詳細監視
docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js monitor --stats
```

### Q26: アラート機能はありますか？
A: Alpha 1.0.0では基本的なヘルスチェックのみです。外部監視サービス（UptimeRobot等）との連携を推奨します。

## 📞 サポート

### Q27: 問題が解決しない場合は？
A:
1. [GitHub Issues](https://github.com/your-username/ownserver-manager/issues) で既存の問題を検索
2. 新しいIssueを作成（ログファイルとエラーメッセージを含める）
3. [ドキュメント](https://github.com/your-username/ownserver-manager/wiki) を確認

### Q28: ログを提供する際の注意点は？
A: 
- 個人情報（APIトークン、パスワード等）は除外
- エラーが発生した前後の時間のログを含める
- システム情報（OS、Dockerバージョン等）も合わせて提供

---

📝 **このFAQで解決しない場合は、[GitHub Issues](https://github.com/your-username/ownserver-manager/issues) でお問い合わせください。**
