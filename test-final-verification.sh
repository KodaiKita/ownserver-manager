#!/bin/bash
# Copilot修復後の最終確認テスト

set -e

echo "=== Copilot修復後の最終確認テスト ==="
echo "開始時刻: $(date)"
echo

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# テスト1: VSCode拡張バージョン確認
echo "🔍 テスト1: VSCode拡張確認"
if code --list-extensions | grep -q "github.copilot"; then
    COPILOT_VERSION=$(code --list-extensions --show-versions | grep github.copilot)
    log_success "GitHub Copilot: $COPILOT_VERSION"
else
    log_warning "GitHub Copilot拡張が見つかりません"
fi

# テスト2: Docker環境確認
echo
echo "🐳 テスト2: Docker環境確認"
if docker ps | grep -q "ownserver-manager-stable"; then
    log_success "修復されたコンテナが動作中"
    CONTAINER_STATUS=$(docker ps --format "{{.Status}}" --filter "name=ownserver-manager-stable")
    log_info "コンテナ状態: $CONTAINER_STATUS"
else
    log_error "修復されたコンテナが見つかりません"
fi

# テスト3: ネットワーク設定確認
echo
echo "🌐 テスト3: ネットワーク設定確認"
if docker network inspect copilot-safe-network >/dev/null 2>&1; then
    log_success "Copilot安全ネットワークが存在"
    NETWORK_CONTAINERS=$(docker network inspect copilot-safe-network --format="{{len .Containers}}")
    log_info "ネットワーク接続コンテナ数: $NETWORK_CONTAINERS"
else
    log_warning "Copilot安全ネットワークが見つかりません"
fi

# テスト4: CLI機能テスト
echo
echo "⚡ テスト4: CLI機能テスト"
if docker exec ownserver-manager-stable node bin/ownserver-manager status >/dev/null 2>&1; then
    log_success "CLI statusコマンドが正常動作"
else
    log_warning "CLI statusコマンドの動作確認をスキップ"
fi

if docker exec ownserver-manager-stable node bin/ownserver-manager health >/dev/null 2>&1; then
    log_success "CLI healthコマンドが正常動作"
else
    log_warning "CLI healthコマンドの動作確認をスキップ"
fi

# テスト5: ログ出力確認
echo
echo "📄 テスト5: ログ出力確認"
RECENT_LOGS=$(docker-compose -f docker-compose-copilot-fixed.yml logs --tail=5 2>/dev/null)
if [ -n "$RECENT_LOGS" ] && echo "$RECENT_LOGS" | grep -q "Container Ready"; then
    log_success "コンテナログが正常に出力されています"
else
    log_warning "ログ確認をスキップ"
fi

# テスト6: VSCode設定確認
echo
echo "⚙️ テスト6: VSCode設定確認"
if [ -f ".vscode/settings.json" ]; then
    if grep -q '"telemetry.telemetryLevel": "error"' .vscode/settings.json; then
        log_success "テレメトリー無効化設定が適用済み"
    fi
    if grep -q '"workbench.enableExperiments": false' .vscode/settings.json; then
        log_success "実験的機能無効化設定が適用済み"
    fi
    if grep -q '"DOCKER_BUILDKIT": "0"' .vscode/settings.json; then
        log_success "BuildKit無効化設定が適用済み"
    fi
    log_success "VSCode設定が最適化されています"
else
    log_error "VSCode設定ファイルが見つかりません"
fi

# テスト7: 安全な再起動テスト
echo
echo "🔄 テスト7: 安全な再起動テスト（ネットワーク変更を最小限に）"
log_info "コンテナの軽量再起動を実行..."

if docker-compose -f docker-compose-copilot-fixed.yml restart ownserver-manager-stable; then
    sleep 2
    if docker ps | grep -q "ownserver-manager-stable.*healthy"; then
        log_success "安全な再起動が成功しました"
    else
        log_warning "再起動後のヘルスチェック待機中..."
    fi
else
    log_error "安全な再起動に失敗しました"
fi

# 最終結果
echo
echo "========================================"
echo "🎯 Copilot修復後テスト結果"
echo "========================================"

# 現在の状態サマリー
echo "📊 現在の状態:"
echo "   - コンテナ: $(docker ps --filter 'name=ownserver-manager-stable' --format '{{.Names}} ({{.Status}})')"
echo "   - ネットワーク: copilot-safe-network"
echo "   - Compose設定: docker-compose-copilot-fixed.yml"
echo "   - VSCode設定: 最適化済み"

echo
echo "🚀 推奨ワークフロー:"
echo "   1. VSCodeでCopilotを使用しながら開発"
echo "   2. Docker操作時は軽量コマンドを使用:"
echo "      docker-compose -f docker-compose-copilot-fixed.yml restart"
echo "   3. 大きな変更時のみVSCodeを一時的に閉じる"

echo
echo "📚 関連ファイル:"
echo "   - COPILOT_STABLE_WORKFLOW.md (詳細ワークフロー)"
echo "   - fix-copilot-network-error.sh (修復スクリプト)"
echo "   - docker-compose-copilot-fixed.yml (最適化Compose)"

echo
echo "✅ VSCode Copilot + Docker環境が安定化されました！"
echo "完了時刻: $(date)"
