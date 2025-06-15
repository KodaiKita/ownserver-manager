#!/bin/bash

# OwnServer Manager - 直接Docker実行スクリプト
# Docker Composeが利用できない環境でのfallback

set -e

echo "🐳 OwnServer Manager - 直接Docker実行"
echo "======================================"

# 設定確認
if [ ! -f "config/config.json" ]; then
    echo "❌ config/config.json が見つかりません"
    echo "先に npm run config:generate を実行してください"
    exit 1
fi

# 既存コンテナを停止・削除
echo "🧹 既存コンテナをクリーンアップ中..."
docker rm -f ownserver-manager-prod 2>/dev/null || true

# 必要ディレクトリの確認・作成
echo "📂 ディレクトリを準備中..."
mkdir -p minecraft-servers logs backups
chmod -R 755 minecraft-servers logs backups 2>/dev/null || true

# 環境ファイル確認
ENV_FILE=""
if [ -f "config/docker.env" ]; then
    ENV_FILE="config/docker.env"
elif [ -f "config/.env" ]; then
    ENV_FILE="config/.env"
fi

# コンテナ起動
echo "🚀 コンテナを起動中..."

if [ -n "$ENV_FILE" ]; then
    echo "  📋 環境ファイルを使用: $ENV_FILE"
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
    echo "  ⚠️ 環境ファイルなしで起動"
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

# 起動確認
echo "🔍 起動確認中..."
sleep 3

if docker ps | grep -q ownserver-manager-prod; then
    echo "✅ コンテナが正常に起動しました"
    echo ""
    echo "📊 ステータス確認:"
    echo "  docker exec ownserver-manager-prod node src/commands/cli.js status"
    echo ""
    echo "📋 ログ確認:"
    echo "  docker logs -f ownserver-manager-prod"
else
    echo "❌ コンテナの起動に失敗しました"
    echo "📋 エラーログ:"
    docker logs ownserver-manager-prod 2>&1
    exit 1
fi
