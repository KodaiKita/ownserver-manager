# OwnServer Manager Development Workflow

## 概要

このドキュメントは、OwnServer Manager プロジェクトの開発ワークフローを定義します。

## Docker Compose 実行ワークフロー

### `docker-compose up` 系コマンド

VSCode Copilot Chat Agent で `docker-compose up` 系のコマンド（起動系コマンド）を実行する際は、以下のワークフローに従います：

1. **Copilot Agent**: コマンドを直接実行せず、ユーザーに実行を依頼します
2. **ユーザー**: コマンドを実行し、結果をCopilot Agentに報告します
3. **Copilot Agent**: 結果に基づいて次のアクションを決定します

#### 対象コマンド例
```bash
docker-compose up
docker-compose up -d
docker-compose -f docker-compose.yml up
docker-compose start
```

### `docker-compose down` 系コマンド

停止・削除系のコマンドは、Copilot Agent が直接実行できます。

#### 対象コマンド例
```bash
docker-compose down
docker-compose stop
docker-compose rm
```

## プロジェクト構成

### メインファイル
- `docker-compose.yml`: メイン Docker Compose 設定
- `Dockerfile`: コンテナビルド設定
- `src/index.js`: メインアプリケーション
- `src/commands/cli.js`: CLI インターフェース

### 開発・テスト
```bash
# 依存関係インストール
npm install

# 開発モード起動
npm run dev

# テスト実行
npm test

# CLI テスト
npm run cli
```

## アーカイブされたファイル

Copilot ネットワークエラー修正に関連するファイルは `archived-copilot-fixes/` ディレクトリに移動されました：

- 診断・修正スクリプト群
- 特別な Docker Compose 設定
- Copilot 関連ドキュメント
- システム設定バックアップ

## 復元されたシステム設定

以下のシステム設定をデフォルトに復元しました：

1. `/etc/systemd/resolved.conf`
2. `/etc/docker/daemon.json` (削除)
3. `/etc/NetworkManager/NetworkManager.conf`
4. `~/.config/Code/User/settings.json`
5. `~/.config/Code/User/argv.json` (削除)
6. `.vscode/settings.json`

## 注意事項

- Copilot ネットワークエラー修正は中断されました
- 今後は標準的な開発フローに従います
- Docker Compose の起動は上記ワークフローに従ってください
