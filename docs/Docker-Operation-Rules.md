# Docker運用ルール

## 重要：コマンド実行の役割分担

### ユーザー手動実行が必要なコマンド
以下のコマンドは **必ずユーザーに依頼** し、AIは一時停止して結果を待つこと：

- `docker-compose up` / `docker-compose up -d`
- `docker-compose start`
- `docker start <container>`
- `docker run` （新規コンテナ起動）
- その他のコンテナ起動系コマンド

**理由**: この環境では、AIがDocker起動系コマンドを実行するとエラーが発生する
**追記**: `docker start`もAI実行時にエラーが発生することを確認済み（2024年例）

### AI自動実行可能なコマンド
以下のコマンドはAIが直接実行可能：

- `docker-compose down`
- `docker-compose stop`
- `docker ps`
- `docker logs`
- `docker exec`
- `docker build`
- `docker images`
- その他の状態確認・停止・ビルド系コマンド

## 運用手順

1. Docker起動が必要な場合：
   - AIがユーザーに実行依頼
   - AIは一時停止
   - ユーザーが手動実行
   - ユーザーが結果をAIに報告
   - AIが処理を継続

2. Docker停止・確認が必要な場合：
   - AIが直接実行

## 注意事項

- この運用ルールは環境固有の問題解決策
- Git管理は不要（ローカル環境設定）
- 必ずドキュメント化して記憶すること
- 将来のセッションでも同じルールを適用

## 実際の事例

### 2024年実例：AI実行エラー vs ユーザー実行成功

**AIが実行した場合（エラー）:**
```
docker-compose up -d
ERROR: [エラー内容]
```

**ユーザーが手動実行した場合（成功）:**
```
docker-compose up -d
[+] Running X/X
✓ Container ownserver-manager  Started
```

この実例により、運用ルールの重要性が実証されました。

## 現在の状況

- Docker環境は正常に起動済み（ユーザー手動 `docker-compose up -d` 成功）
- ownserver-manager コンテナが稼働中
- 次のステップでコンテナ内での動作確認を実施予定
