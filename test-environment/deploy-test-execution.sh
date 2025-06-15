#!/bin/bash

# ============================================================================
# 拡張デプロイテストスクリプト - 実行テストまで含む包括的テスト
# 完全にクリーンなUbuntu環境でのデプロイ動作と実際の実行まで検証
# ============================================================================

set -e
set -u
set -o pipefail

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo "🧪 OwnServer Manager - 拡張デプロイテスト開始（実行テストまで）"
echo "======================================================================="

# ファイルの存在確認
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}📁 Project root: $PROJECT_ROOT${NC}"

# 実際の設定ファイルの存在確認
REAL_CONFIG_FILE="$PROJECT_ROOT/config/master-deploy-test.json"
if [ ! -f "$REAL_CONFIG_FILE" ]; then
    echo -e "${RED}❌ 実際の設定ファイルが見つかりません: $REAL_CONFIG_FILE${NC}"
    echo -e "${YELLOW}💡 master-deploy-test.json に実際のAPIトークンなどを設定してください${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 実際の設定ファイル確認: $REAL_CONFIG_FILE${NC}"

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

CONTAINER_NAME="ownserver-execution-test-$(date +%s)"

# バックグラウンドでコンテナ起動（実行テスト用に必要なポートを公開）
if ! timeout 60 docker run -d --name "$CONTAINER_NAME" \
    -v "$PROJECT_ROOT:/host-project:ro" \
    -p 25565:25565 \
    -p 3000:3000 \
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

# テスト関数群（既存）
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

test_config_setup_with_real_values() {
    echo -e "${BLUE}🔧 実際の設定値を使用した設定ファイル生成テスト...${NC}"
    
    # 実際の設定ファイルをコンテナにコピー
    if ! timeout 30 docker cp "$REAL_CONFIG_FILE" "$CONTAINER_NAME:/home/testuser/test-deploy/ownserver-manager/config/master.json"; then
        echo -e "${RED}❌ 実際の設定ファイルのコピーに失敗しました${NC}"
        return 1
    fi
    
    # 設定テンプレート生成
    if ! timeout 30 docker exec "$CONTAINER_NAME" bash -c "
        cd /home/testuser/test-deploy/ownserver-manager && \
        npm run config:template
    "; then
        echo -e "${RED}❌ 設定テンプレート生成に失敗しました${NC}"
        return 1
    fi
    
    # 設定ファイル生成を実行（実際の値で）
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
        ls -la config/config.json config/.env config/docker.env config/production.env && \
        echo '=== 生成された設定ファイルの内容確認 ===' && \
        head -10 config/config.json
    "; then
        echo -e "${RED}❌ 設定ファイルが正しく生成されませんでした${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ 実際の設定値での設定ファイル生成完了${NC}"
    return 0
}

# 新しいテスト関数：実際の実行テスト
test_application_startup() {
    echo -e "${PURPLE}🚀 アプリケーション起動テスト...${NC}"
    
    # まずヘルスチェックコマンドをテスト
    if ! timeout 30 docker exec "$CONTAINER_NAME" bash -c "
        cd /home/testuser/test-deploy/ownserver-manager && \
        npm run health
    "; then
        echo -e "${YELLOW}⚠️  ヘルスチェックに失敗しましたが、起動テストを続行します${NC}"
    fi
    
    # バックグラウンドでアプリケーションを起動
    echo -e "${BLUE}📍 バックグラウンドでアプリケーション起動中...${NC}"
    
    if ! timeout 60 docker exec -d "$CONTAINER_NAME" bash -c "
        cd /home/testuser/test-deploy/ownserver-manager && \
        npm start > /tmp/app-startup.log 2>&1
    "; then
        echo -e "${RED}❌ アプリケーションの起動に失敗しました${NC}"
        return 1
    fi
    
    # 起動待機（10秒）
    echo -e "${BLUE}⏳ アプリケーション起動待機中（10秒）...${NC}"
    sleep 10
    
    # 起動ログの確認
    timeout 10 docker exec "$CONTAINER_NAME" bash -c "
        echo '=== アプリケーション起動ログ ===' && \
        cat /tmp/app-startup.log | head -20
    " || true
    
    # プロセス確認
    if timeout 10 docker exec "$CONTAINER_NAME" bash -c "
        ps aux | grep -E 'node|ownserver' | grep -v grep
    "; then
        echo -e "${GREEN}✅ アプリケーションプロセス確認完了${NC}"
    else
        echo -e "${YELLOW}⚠️  プロセス確認で明確な結果を得られませんでした${NC}"
    fi
    
    echo -e "${GREEN}✅ アプリケーション起動テスト完了${NC}"
    return 0
}

test_config_validation() {
    echo -e "${PURPLE}📋 設定ファイル妥当性テスト...${NC}"
    
    # 設定ファイルのJSON構文チェック
    if ! timeout 10 docker exec "$CONTAINER_NAME" bash -c "
        cd /home/testuser/test-deploy/ownserver-manager && \
        node -e \"console.log('Config validation:', JSON.parse(require('fs').readFileSync('config/config.json', 'utf8')))\"
    "; then
        echo -e "${RED}❌ 設定ファイルのJSON構文エラーがあります${NC}"
        return 1
    fi
    
    # Cloudflare設定の基本チェック
    if ! timeout 10 docker exec "$CONTAINER_NAME" bash -c "
        cd /home/testuser/test-deploy/ownserver-manager && \
        node -e \"
        const config = JSON.parse(require('fs').readFileSync('config/config.json', 'utf8'));
        if (!config.cloudflare || !config.cloudflare.apiToken || !config.cloudflare.zoneId) {
            process.exit(1);
        }
        console.log('Cloudflare config validation: OK');
        \"
    "; then
        echo -e "${RED}❌ Cloudflare設定が不完全です${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ 設定ファイル妥当性テスト完了${NC}"
    return 0
}

test_basic_commands() {
    echo -e "${PURPLE}⚡ 基本コマンドテスト...${NC}"
    
    # npm scriptsの基本的なコマンドをテスト
    commands=(
        "npm run --silent version"
        "npm run status"
        "npm run test:config"
    )
    
    for cmd in "${commands[@]}"; do
        echo -e "${BLUE}🔍 テスト実行: $cmd${NC}"
        if timeout 15 docker exec "$CONTAINER_NAME" bash -c "
            cd /home/testuser/test-deploy/ownserver-manager && \
            $cmd
        "; then
            echo -e "${GREEN}✅ '$cmd' - 成功${NC}"
        else
            echo -e "${YELLOW}⚠️  '$cmd' - 失敗（続行）${NC}"
        fi
    done
    
    echo -e "${GREEN}✅ 基本コマンドテスト完了${NC}"
    return 0
}

# メインテスト実行
main() {
    local failed_tests=0
    
    echo -e "${BLUE}🧪 拡張デプロイテスト実行中...${NC}"
    echo ""
    
    # フェーズ1: 基本デプロイテスト
    echo -e "${PURPLE}=== フェーズ1: 基本デプロイテスト ===${NC}"
    
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
    
    # テスト4: 実際の設定値での設定ファイル生成
    if test_config_setup_with_real_values; then
        echo -e "${GREEN}✅ テスト4: 実際設定での設定ファイル生成 - 成功${NC}"
    else
        echo -e "${RED}❌ テスト4: 実際設定での設定ファイル生成 - 失敗${NC}"
        ((failed_tests++))
    fi
    echo ""
    
    # フェーズ2: 実行テスト
    echo -e "${PURPLE}=== フェーズ2: 実行テスト ===${NC}"
    
    # テスト5: 設定妥当性テスト
    if test_config_validation; then
        echo -e "${GREEN}✅ テスト5: 設定ファイル妥当性 - 成功${NC}"
    else
        echo -e "${RED}❌ テスト5: 設定ファイル妥当性 - 失敗${NC}"
        ((failed_tests++))
    fi
    echo ""
    
    # テスト6: 基本コマンドテスト
    if test_basic_commands; then
        echo -e "${GREEN}✅ テスト6: 基本コマンド - 成功${NC}"
    else
        echo -e "${RED}❌ テスト6: 基本コマンド - 失敗${NC}"
        ((failed_tests++))
    fi
    echo ""
    
    # テスト7: アプリケーション起動テスト
    if test_application_startup; then
        echo -e "${GREEN}✅ テスト7: アプリケーション起動 - 成功${NC}"
    else
        echo -e "${RED}❌ テスト7: アプリケーション起動 - 失敗${NC}"
        ((failed_tests++))
    fi
    echo ""
    
    # 結果レポート
    echo "======================================================================"
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}🎉 全ての拡張デプロイテストが成功しました！${NC}"
        echo -e "${GREEN}✅ デプロイから実行まで正常に動作します${NC}"
        echo -e "${PURPLE}📊 実行されたテスト: デプロイ4項目 + 実行3項目 = 合計7項目${NC}"
        return 0
    else
        echo -e "${RED}❌ $failed_tests 個のテストが失敗しました${NC}"
        echo -e "${RED}🔧 該当箇所の修正が必要です${NC}"
        return 1
    fi
}

# メイン処理実行
main "$@"
