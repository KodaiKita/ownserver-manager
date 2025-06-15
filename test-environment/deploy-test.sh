#!/bin/bash

# ============================================================================
# デプロイテストスクリプト
# 完全にクリーンなUbuntu環境でのデプロイ動作を検証
# ============================================================================

set -e
set -u
set -o pipefail

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🧪 OwnServer Manager - デプロイテスト開始"
echo "============================================"

# ファイルの存在確認
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}📁 Project root: $PROJECT_ROOT${NC}"

# テスト用Docker環境の構築
echo -e "${BLUE}🏗️  テスト用Docker環境を構築中...${NC}"

cd "$PROJECT_ROOT"

# タイムアウト付きでDockerイメージをビルド
if ! timeout 300 docker build -f test-environment/Dockerfile.test -t ownserver-test-env .; then
    echo -e "${RED}❌ Dockerイメージのビルドに失敗しました${NC}"
    exit 1
fi

echo -e "${GREEN}✅ テスト環境のビルド完了${NC}"

# テストコンテナを起動
echo -e "${BLUE}🚀 テストコンテナを起動中...${NC}"

CONTAINER_NAME="ownserver-deploy-test-$(date +%s)"

# バックグラウンドでコンテナ起動
if ! timeout 60 docker run -d --name "$CONTAINER_NAME" \
    -v "$PROJECT_ROOT:/host-project:ro" \
    ownserver-test-env tail -f /dev/null; then
    echo -e "${RED}❌ テストコンテナの起動に失敗しました${NC}"
    exit 1
fi

echo -e "${GREEN}✅ テストコンテナ起動完了: $CONTAINER_NAME${NC}"

# クリーンアップ関数
cleanup() {
    echo -e "${YELLOW}🧹 テスト環境をクリーンアップ中...${NC}"
    timeout 30 docker stop "$CONTAINER_NAME" 2>/dev/null || true
    timeout 30 docker rm "$CONTAINER_NAME" 2>/dev/null || true
    echo -e "${GREEN}✅ クリーンアップ完了${NC}"
}

# 終了時にクリーンアップ
trap cleanup EXIT

# テスト関数群
test_git_clone() {
    echo -e "${BLUE}📥 GitHubからプロジェクトをクローン中...${NC}"
    
    if ! timeout 120 docker exec "$CONTAINER_NAME" bash -c "
        cd /home/testuser/test-deploy && \
        git clone https://github.com/KodaiKita/ownserver-manager.git && \
        cd ownserver-manager && \
        git checkout tags/alpha-1.0.0
    "; then
        echo -e "${RED}❌ プロジェクトのクローンに失敗しました${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ プロジェクトクローン完了${NC}"
    return 0
}

test_nodejs_installation() {
    echo -e "${BLUE}📦 Node.js 22.xをインストール中...${NC}"
    
    if ! timeout 300 docker exec "$CONTAINER_NAME" bash -c "
        export DEBIAN_FRONTEND=noninteractive && \
        curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && \
        sudo apt-get install -y nodejs
    "; then
        echo -e "${RED}❌ Node.jsのインストールに失敗しました${NC}"
        return 1
    fi
    
    # バージョン確認
    node_version=$(timeout 10 docker exec "$CONTAINER_NAME" node --version || echo "")
    npm_version=$(timeout 10 docker exec "$CONTAINER_NAME" npm --version || echo "")
    
    echo -e "${GREEN}✅ Node.js インストール完了: $node_version, npm: $npm_version${NC}"
    return 0
}

test_npm_dependencies() {
    echo -e "${BLUE}📚 NPM依存関係をインストール中...${NC}"
    
    if ! timeout 180 docker exec "$CONTAINER_NAME" bash -c "
        cd /home/testuser/test-deploy/ownserver-manager && \
        npm install
    "; then
        echo -e "${RED}❌ NPM依存関係のインストールに失敗しました${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ NPM依存関係インストール完了${NC}"
    return 0
}

test_config_template_generation() {
    echo -e "${BLUE}🔧 設定テンプレート生成テスト...${NC}"
    
    if ! timeout 30 docker exec "$CONTAINER_NAME" bash -c "
        cd /home/testuser/test-deploy/ownserver-manager && \
        npm run config:template
    "; then
        echo -e "${RED}❌ 設定テンプレート生成に失敗しました${NC}"
        return 1
    fi
    
    # ファイル存在確認
    if ! timeout 10 docker exec "$CONTAINER_NAME" bash -c "
        cd /home/testuser/test-deploy/ownserver-manager && \
        ls -la config/master.json.example config/config.json.example config/docker.env.example
    "; then
        echo -e "${RED}❌ 設定テンプレートファイルが生成されませんでした${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ 設定テンプレート生成完了${NC}"
    return 0
}

test_config_copy_and_generation() {
    echo -e "${BLUE}📝 設定ファイルのコピーと生成テスト...${NC}"
    
    if ! timeout 30 docker exec "$CONTAINER_NAME" bash -c "
        cd /home/testuser/test-deploy/ownserver-manager && \
        cp config/master.json.example config/master.json
    "; then
        echo -e "${RED}❌ 設定ファイルのコピーに失敗しました${NC}"
        return 1
    fi
    
    # テスト用の有効な値で設定ファイルを更新
    if ! timeout 30 docker exec "$CONTAINER_NAME" bash -c "
        cd /home/testuser/test-deploy/ownserver-manager && \
        sed -i 's/\"YOUR_DOMAIN.com\"/\"example.com\"/g' config/master.json && \
        sed -i 's/\"YOUR_CLOUDFLARE_API_TOKEN\"/\"test-api-token-12345\"/g' config/master.json && \
        sed -i 's/\"YOUR_CLOUDFLARE_ZONE_ID\"/\"test-zone-id-abcdef\"/g' config/master.json && \
        sed -i 's/\"your-email@example.com\"/\"test@example.com\"/g' config/master.json && \
        echo '=== 更新後の設定ファイル確認 ===' && \
        grep -A 10 -B 2 'cloudflare' config/master.json
    "; then
        echo -e "${RED}❌ 設定ファイルの更新に失敗しました${NC}"
        return 1
    fi
    
    # 設定ファイル生成を実行
    if ! timeout 30 docker exec "$CONTAINER_NAME" bash -c "
        cd /home/testuser/test-deploy/ownserver-manager && \
        npm run config:generate
    "; then
        echo -e "${RED}❌ 設定ファイル生成に失敗しました${NC}"
        return 1
    fi
    
    # 生成されたファイルの確認
    if ! timeout 10 docker exec "$CONTAINER_NAME" bash -c "
        cd /home/testuser/test-deploy/ownserver-manager && \
        ls -la config/config.json config/.env config/docker.env config/production.env
    "; then
        echo -e "${RED}❌ 設定ファイルが正しく生成されませんでした${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ 設定ファイル処理完了${NC}"
    return 0
}

test_setup_script() {
    echo -e "${BLUE}🚀 セットアップスクリプトテスト...${NC}"
    
    # 新しいコンテナでセットアップスクリプトをテスト
    SETUP_CONTAINER="ownserver-setup-test-$(date +%s)"
    
    if ! timeout 60 docker run -d --name "$SETUP_CONTAINER" \
        -v "$PROJECT_ROOT:/host-project:ro" \
        ownserver-test-env tail -f /dev/null; then
        echo -e "${RED}❌ セットアップテスト用コンテナの起動に失敗しました${NC}"
        return 1
    fi
    
    # セットアップスクリプトの実行
    if ! timeout 300 docker exec "$SETUP_CONTAINER" bash -c "
        cd /home/testuser && \
        git clone https://github.com/KodaiKita/ownserver-manager.git && \
        cd ownserver-manager && \
        git checkout tags/alpha-1.0.0 && \
        export DEBIAN_FRONTEND=noninteractive && \
        curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && \
        sudo apt-get install -y nodejs && \
        npm install && \
        npm run config:template && \
        cp config/master.json.example config/master.json && \
        sed -i 's/\"YOUR_DOMAIN.com\"/\"example.com\"/g' config/master.json && \
        sed -i 's/\"YOUR_CLOUDFLARE_API_TOKEN\"/\"test-api-token-12345\"/g' config/master.json && \
        sed -i 's/\"YOUR_CLOUDFLARE_ZONE_ID\"/\"test-zone-id-abcdef\"/g' config/master.json && \
        sed -i 's/\"your-email@example.com\"/\"test@example.com\"/g' config/master.json && \
        npm run config:generate
    "; then
        echo -e "${RED}❌ セットアップスクリプトの実行に失敗しました${NC}"
        timeout 30 docker stop "$SETUP_CONTAINER" 2>/dev/null || true
        timeout 30 docker rm "$SETUP_CONTAINER" 2>/dev/null || true
        return 1
    fi
    
    # 生成されたファイルの確認
    if ! timeout 10 docker exec "$SETUP_CONTAINER" bash -c "
        cd /home/testuser/ownserver-manager && \
        ls -la config/config.json config/.env config/docker.env config/production.env
    "; then
        echo -e "${RED}❌ セットアップで設定ファイルが正しく生成されませんでした${NC}"
        timeout 30 docker stop "$SETUP_CONTAINER" 2>/dev/null || true
        timeout 30 docker rm "$SETUP_CONTAINER" 2>/dev/null || true
        return 1
    fi
    
    # クリーンアップ
    timeout 30 docker stop "$SETUP_CONTAINER" 2>/dev/null || true
    timeout 30 docker rm "$SETUP_CONTAINER" 2>/dev/null || true
    
    echo -e "${GREEN}✅ セットアップスクリプトテスト完了${NC}"
    return 0
}

# メインテスト実行
main() {
    local failed_tests=0
    
    echo -e "${BLUE}🧪 デプロイテスト実行中...${NC}"
    echo ""
    
    # テスト1: Gitクローン
    if test_git_clone; then
        echo -e "${GREEN}✅ テスト1: Gitクローン - 成功${NC}"
    else
        echo -e "${RED}❌ テスト1: Gitクローン - 失敗${NC}"
        ((failed_tests++))
    fi
    echo ""
    
    # テスト2: Node.jsインストール
    if test_nodejs_installation; then
        echo -e "${GREEN}✅ テスト2: Node.jsインストール - 成功${NC}"
    else
        echo -e "${RED}❌ テスト2: Node.jsインストール - 失敗${NC}"
        ((failed_tests++))
    fi
    echo ""
    
    # テスト3: NPM依存関係
    if test_npm_dependencies; then
        echo -e "${GREEN}✅ テスト3: NPM依存関係 - 成功${NC}"
    else
        echo -e "${RED}❌ テスト3: NPM依存関係 - 失敗${NC}"
        ((failed_tests++))
    fi
    echo ""
    
    # テスト4: 設定テンプレート生成
    if test_config_template_generation; then
        echo -e "${GREEN}✅ テスト4: 設定テンプレート生成 - 成功${NC}"
    else
        echo -e "${RED}❌ テスト4: 設定テンプレート生成 - 失敗${NC}"
        ((failed_tests++))
    fi
    echo ""
    
    # テスト5: 設定ファイル処理
    if test_config_copy_and_generation; then
        echo -e "${GREEN}✅ テスト5: 設定ファイル処理 - 成功${NC}"
    else
        echo -e "${RED}❌ テスト5: 設定ファイル処理 - 失敗${NC}"
        ((failed_tests++))
    fi
    echo ""
    
    # テスト6: セットアップスクリプト
    if test_setup_script; then
        echo -e "${GREEN}✅ テスト6: セットアップスクリプト - 成功${NC}"
    else
        echo -e "${RED}❌ テスト6: セットアップスクリプト - 失敗${NC}"
        ((failed_tests++))
    fi
    echo ""
    
    # 結果レポート
    echo "============================================"
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}🎉 全てのデプロイテストが成功しました！${NC}"
        echo -e "${GREEN}✅ デプロイは正常に動作します${NC}"
        return 0
    else
        echo -e "${RED}❌ $failed_tests 個のテストが失敗しました${NC}"
        echo -e "${RED}🔧 ドキュメントとスクリプトの修正が必要です${NC}"
        return 1
    fi
}

# メイン処理実行
main "$@"
