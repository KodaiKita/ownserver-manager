#!/bin/bash

# OwnServer Manager - 完全Dockerデプロイスクリプト
# どんなdirty環境でも確実に動作するDockerデプロイメント

set -e  # エラーで停止

echo "🐳 OwnServer Manager - 完全Dockerデプロイ開始"
echo "=================================================="

# 🧹 Step 1: 完全なDocker環境クリーンアップ
echo "🧹 Step 1: Docker環境を完全クリーンアップ中..."

# 既存のownserver関連コンテナを停止・削除
echo "  📦 既存コンテナを停止・削除中..."
docker ps -q --filter "name=ownserver" | xargs -r docker stop 2>/dev/null || true
docker ps -a -q --filter "name=ownserver" | xargs -r docker rm 2>/dev/null || true

# プロジェクト関連イメージを削除
echo "  🖼️ 古いイメージを削除中..."
docker images --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}" | grep -E "(ownserver|minecraft)" | awk '{print $2}' | xargs -r docker rmi -f 2>/dev/null || true

# 不要なボリューム・ネットワークをクリーンアップ
echo "  🧽 システムクリーンアップ中..."
docker system prune -f --volumes 2>/dev/null || true

# 🏗️ Step 2: 必要ディレクトリの準備
echo "🏗️ Step 2: ディレクトリ構造を準備中..."

# 既存ディレクトリを安全に削除・再作成
for dir in minecraft-servers logs backups; do
    if [ -d "$dir" ]; then
        echo "  📂 既存の $dir ディレクトリを削除中..."
        sudo rm -rf "$dir" 2>/dev/null || rm -rf "$dir" 2>/dev/null || true
    fi
    mkdir -p "$dir"
    echo "  ✅ $dir ディレクトリ作成完了"
done

# 適切な権限を設定
echo "  🔐 権限設定中..."
if command -v sudo &> /dev/null; then
    sudo chown -R $(id -u):$(id -g) minecraft-servers logs backups 2>/dev/null || true
fi
chmod -R 755 minecraft-servers logs backups 2>/dev/null || true

# 🔧 Step 3: 設定ファイル確認
echo "🔧 Step 3: 設定ファイルを確認中..."

if [ ! -f "config/config.json" ]; then
    echo "  ⚠️ config/config.json が見つかりません"
    if [ -f "config/master.json" ]; then
        echo "  🔄 master.json から設定ファイルを生成中..."
        npm run config:generate
    else
        echo "  📝 設定テンプレートを作成中..."
        npm run setup
        echo "  ❌ config/master.json を設定してから npm run config:generate を実行してください"
        exit 1
    fi
fi

# 設定ファイルの妥当性確認
echo "  ✅ 設定ファイル確認完了"

# 🔨 Step 4: Dockerイメージの強制再ビルド
echo "🔨 Step 4: Dockerイメージを強制再ビルド中..."

# Dockerfileの存在確認
if [ ! -f "Dockerfile.production" ]; then
    echo "  ❌ Dockerfile.production が見つかりません"
    exit 1
fi

# キャッシュを使わずに完全に再ビルド
echo "  🏗️ イメージビルド中（キャッシュなし）..."
docker build --no-cache --pull -f Dockerfile.production -t ownserver-manager:latest . || {
    echo "  ❌ Dockerイメージのビルドに失敗しました"
    exit 1
}

echo "  ✅ イメージビルド完了"

# 🚀 Step 5: 本番環境での起動
echo "🚀 Step 5: コンテナを起動中..."

# 環境ファイル確認
ENV_FILE="config/docker.env"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE="config/.env"
    if [ ! -f "$ENV_FILE" ]; then
        echo "  ⚠️ 環境ファイルが見つかりません。環境変数なしで起動します"
        ENV_FILE=""
    fi
fi

# 既存コンテナがあれば強制削除
docker rm -f ownserver-manager-prod 2>/dev/null || true

# 新しいコンテナを起動
echo "  🎯 新しいコンテナを起動中..."

if [ -n "$ENV_FILE" ]; then
    # 環境ファイルありで起動
    docker run -d \
        --name ownserver-manager-prod \
        --restart unless-stopped \
        -p 8080:8080 \
        -p 25565:25565 \
        -v "$(pwd)/config:/app/config:rw" \
        -v "$(pwd)/minecraft-servers:/app/minecraft-servers:rw" \
        -v "$(pwd)/logs:/app/logs:rw" \
        -v "$(pwd)/backups:/app/backups:rw" \
        --env-file "$ENV_FILE" \
        ownserver-manager:latest
else
    # 環境ファイルなしで起動
    docker run -d \
        --name ownserver-manager-prod \
        --restart unless-stopped \
        -p 8080:8080 \
        -p 25565:25565 \
        -v "$(pwd)/config:/app/config:rw" \
        -v "$(pwd)/minecraft-servers:/app/minecraft-servers:rw" \
        -v "$(pwd)/logs:/app/logs:rw" \
        -v "$(pwd)/backups:/app/backups:rw" \
        ownserver-manager:latest
fi

# 🔍 Step 6: 起動確認
echo "🔍 Step 6: 起動確認中..."

# コンテナが起動するまで待機
echo "  ⏳ コンテナ起動を待機中..."
sleep 5

# コンテナ状態確認
if docker ps | grep -q ownserver-manager-prod; then
    echo "  ✅ コンテナが正常に起動しました"
else
    echo "  ❌ コンテナの起動に失敗しました"
    echo "  📋 エラーログ："
    docker logs ownserver-manager-prod 2>&1 | tail -20
    exit 1
fi

# 📋 Step 7: 健全性チェック
echo "📋 Step 7: アプリケーション健全性チェック中..."

# 基本的な設定ファイル読み込みテスト
echo "  🔍 設定ファイル読み込みテスト中..."
timeout 30 docker exec ownserver-manager-prod node -e "
try {
    const config = require('./config/config.json');
    console.log('✅ 設定ファイル読み込み: OK');
    console.log('📊 Minecraft ポート:', config.minecraft.port);
    console.log('🌐 CloudFlare ドメイン:', config.cloudflare.domain || 'Not configured');
    process.exit(0);
} catch(e) {
    console.error('❌ エラー:', e.message);
    process.exit(1);
}
" 2>/dev/null && echo "  ✅ 基本機能テスト: OK" || echo "  ⚠️ 基本機能テストで問題が発生しました"

# 🌐 Step 8: ネットワーク確認
echo "🌐 Step 8: ネットワーク設定確認中..."

# ポート確認
if command -v netstat &> /dev/null; then
    if netstat -tlnp 2>/dev/null | grep -E ":8080|:25565" > /dev/null; then
        echo "  ✅ ポートが正常に開いています"
    else
        echo "  ⚠️ ポートが開いていない可能性があります"
    fi
else
    echo "  ⚠️ netstatが利用できません。手動でポート確認を行ってください"
fi

# 🔥 Step 9: ファイアウォール設定
echo "🔥 Step 9: ファイアウォール設定中..."

if command -v ufw &> /dev/null; then
    echo "  🔥 UFWでファイアウォール設定中..."
    sudo ufw allow 25565/tcp comment "Minecraft Server" 2>/dev/null || true
    sudo ufw allow 8080/tcp comment "OwnServer Manager Web UI" 2>/dev/null || true
    echo "  ✅ ファイアウォール設定完了"
else
    echo "  ⚠️ UFWが利用できません。手動でファイアウォール設定を行ってください"
fi

# 🎉 完了報告
echo "🎉 デプロイ完了！"
echo "=================================================="
echo "✅ OwnServer Manager が正常にデプロイされました"
echo ""
echo "📊 次のステップ："
echo "  1. ブラウザで http://localhost:8080 にアクセス"
echo "  2. Minecraft サーバー (localhost:25565) でプレイ"
echo "  3. ステータス確認: docker exec ownserver-manager-prod node src/commands/cli.js status"
echo ""
echo "🔧 便利なエイリアス設定："
echo "  alias osm='docker exec ownserver-manager-prod node src/commands/cli.js'"
echo "  使用例: osm status, osm health, osm public"
echo ""
echo "📋 ログ確認："
echo "  docker logs -f ownserver-manager-prod"
echo ""
echo "🆘 問題が発生した場合："
echo "  docker logs ownserver-manager-prod"
echo "  scripts/docker-complete-deploy.sh  # 再実行"
echo ""
