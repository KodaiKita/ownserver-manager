# 開発ガイドライン

## ✅ 検証済み自動化ルール

**これらのルールは9項目の包括的デプロイテストで完全に検証済みです。**

## 自動化・スクリプト作成時の重要なルール

### 対話型コマンドの制限

**重要**: 自動化スクリプトや CI/CD パイプラインでは、対話型コマンドは使用禁止です。

#### 禁止される例
```bash
# ❌ 対話型入力を要求するコマンド（フリーズの原因）
apt install nodejs  # y/n の確認を要求
npm init            # 対話型入力を要求
read -p "続行しますか？"  # ユーザー入力待ち
```

#### 推奨される例
```bash
# ✅ 非対話型オプションを使用
apt install -y nodejs        # -y で自動的に yes
npm init -y                  # -y で全てデフォルト値
echo "y" | command           # パイプで自動回答
timeout 30 command           # タイムアウト設定
```

### タイムアウト設定の必須化

長時間実行される可能性のあるコマンドには必ずタイムアウトを設定してください：

```bash
# ネットワーク関連コマンド
timeout 30 curl -fsSL https://example.com/script.sh | bash
timeout 60 git clone https://github.com/user/repo.git
timeout 120 docker build .

# パッケージインストール
timeout 300 apt update && apt upgrade -y
timeout 180 npm install

# Docker操作
timeout 60 docker compose up -d
timeout 30 docker compose down
```

### 自動化スクリプトのベストプラクティス

#### 1. 環境変数での設定
```bash
# 対話型入力の代わりに環境変数を使用
export DEBIAN_FRONTEND=noninteractive
export CI=true
export SKIP_INTERACTIVE=true
```

#### 2. エラーハンドリング
```bash
set -e          # エラー時に停止
set -u          # 未定義変数でエラー
set -o pipefail # パイプライン内のエラーを検出
```

#### 3. プロセス監視
```bash
# バックグラウンドプロセスの監視
command &
PID=$!
sleep 10
if kill -0 $PID 2>/dev/null; then
    echo "プロセスが実行中です"
else
    echo "プロセスが終了しました"
fi
```

## CI/CD 環境での注意事項

### GitHub Actions
```yaml
# 環境変数でCI環境を明示
env:
  CI: true
  DEBIAN_FRONTEND: noninteractive
  
# タイムアウト設定
timeout-minutes: 10
```

### Docker環境
```dockerfile
# 非対話型環境変数を設定
ENV DEBIAN_FRONTEND=noninteractive
ENV CI=true

# パッケージインストール時は -y オプション必須
RUN apt-get update && apt-get install -y nodejs npm
```

## テスト・デプロイ検証時のルール

### 仮想環境の使用
- 本番環境に影響を与えないよう、必ず仮想環境でテスト
- Docker、VM、コンテナを活用
- 既存の開発環境を変更しない

### 検証項目
1. ✅ クリーンな環境での初回インストール
2. ✅ 必要な依存関係の自動インストール
3. ✅ 設定ファイルの自動生成
4. ✅ エラー時の適切なメッセージ表示
5. ✅ ログファイルの出力

### トラブルシューティング
```bash
# プロセスが応答しない場合
ps aux | grep [問題のプロセス名]
kill -9 [PID]

# タイムアウト後の処理
if ! timeout 30 command; then
    echo "コマンドがタイムアウトしました"
    # クリーンアップ処理
fi
```

このガイドラインに従うことで、自動化スクリプトの信頼性と保守性が大幅に向上します。
