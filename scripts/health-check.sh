#!/bin/bash

# OwnServer Manager Health Check Script
# システム全体の健全性を確認

set -e

# カラー設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# チェック結果
CHECKS_PASSED=0
CHECKS_TOTAL=0

# チェック実行関数
run_check() {
    local description="$1"
    local command="$2"
    
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
    
    printf "%-50s" "$description"
    
    if eval "$command" &>/dev/null; then
        echo -e "[${GREEN}✓${NC}]"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        return 0
    else
        echo -e "[${RED}✗${NC}]"
        return 1
    fi
}

# 詳細チェック関数（結果も表示）
run_check_with_result() {
    local description="$1"
    local command="$2"
    
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
    
    printf "%-50s" "$description"
    
    result=$(eval "$command" 2>/dev/null)
    if [[ $? -eq 0 && -n "$result" ]]; then
        echo -e "[${GREEN}✓${NC}] $result"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        return 0
    else
        echo -e "[${RED}✗${NC}]"
        return 1
    fi
}

echo "========================================"
echo "OwnServer Manager Health Check"
echo "========================================"
echo

# システム基本チェック
echo "🖥️  システム基本チェック"
echo "----------------------------------------"

run_check "OS確認" "grep -q 'Ubuntu' /etc/os-release"
run_check "インターネット接続" "ping -c 1 8.8.8.8"
run_check_with_result "利用可能メモリ" "free -h | awk 'NR==2{printf \"%.1fGB/%.1fGB\", \$7/1024/1024, \$2/1024/1024}'"
run_check_with_result "ディスク使用量" "df -h / | awk 'NR==2{print \$4\" available\"}'"

echo

# Docker環境チェック
echo "🐳 Docker環境チェック"
echo "----------------------------------------"

run_check "Dockerサービス動作" "systemctl is-active --quiet docker"
run_check "Docker権限" "docker info"
run_check_with_result "Dockerバージョン" "docker --version | awk '{print \$3}' | tr -d ','"
run_check "Docker Composeプラグイン" "docker compose version"

echo

# OwnServer Manager チェック
echo "🎮 OwnServer Manager チェック"
echo "----------------------------------------"

# Docker Composeファイル存在確認
if [[ -f "docker-compose.production.yml" ]]; then
    run_check "Docker Compose設定ファイル" "test -f docker-compose.production.yml"
    
    # コンテナ状況確認
    if docker compose -f docker-compose.production.yml ps | grep -q "Up"; then
        run_check "OwnServer Managerコンテナ稼働" "docker compose -f docker-compose.production.yml ps | grep -q Up"
        
        # アプリケーションレベルチェック
        run_check "OwnServer Manager ヘルスチェック" "docker compose -f docker-compose.production.yml exec -T ownserver-manager node src/commands/cli.js health"
        run_check "CLI コマンド動作" "docker compose -f docker-compose.production.yml exec -T ownserver-manager node src/commands/cli.js --version"
        
    else
        echo "OwnServer Managerコンテナ稼働          [${RED}✗${NC}]"
        CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
    fi
else
    echo "Docker Compose設定ファイル              [${RED}✗${NC}] docker-compose.production.yml not found"
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
fi

echo

# 設定ファイルチェック
echo "⚙️  設定ファイルチェック"
echo "----------------------------------------"

run_check "本番環境設定ファイル" "test -f config/production.env.local"
run_check "CloudFlare設定ファイル" "test -f config/config.json"

if [[ -f config/config.json ]]; then
    run_check "CloudFlare設定有効" "grep -q 'yourdomain.com' config/config.json && echo 'CloudFlare設定が必要' || echo 'CloudFlare設定済み'"
fi

echo

# ネットワークチェック
echo "🌐 ネットワークチェック"
echo "----------------------------------------"

run_check "ポート25565待機" "netstat -tlnp 2>/dev/null | grep -q ':25565'"
run_check "ファイアウォール設定" "sudo ufw status | grep -q '25565/tcp'"

echo

# ファイル・ディレクトリチェック
echo "📁 ファイル・ディレクトリチェック"
echo "----------------------------------------"

run_check "minecraft-serversディレクトリ" "test -d minecraft-servers"
run_check "logsディレクトリ" "test -d logs"
run_check "backupsディレクトリ" "test -d backups"

echo

# 結果サマリー
echo "========================================"
echo "健全性チェック結果"
echo "========================================"

if [[ $CHECKS_PASSED -eq $CHECKS_TOTAL ]]; then
    echo -e "${GREEN}✅ すべてのチェックが成功しました！ ($CHECKS_PASSED/$CHECKS_TOTAL)${NC}"
    echo
    echo "🎉 OwnServer Managerは正常に動作しています。"
    
    # 追加情報表示
    if docker compose -f docker-compose.production.yml ps &>/dev/null; then
        echo
        echo "📊 現在のステータス:"
        docker compose -f docker-compose.production.yml exec -T ownserver-manager node src/commands/cli.js status 2>/dev/null || echo "ステータス取得に失敗"
    fi
    
elif [[ $CHECKS_PASSED -gt $((CHECKS_TOTAL * 2 / 3)) ]]; then
    echo -e "${YELLOW}⚠️  一部のチェックが失敗しました ($CHECKS_PASSED/$CHECKS_TOTAL)${NC}"
    echo "軽微な問題がありますが、基本機能は動作しています。"
    echo
    echo "推奨アクション:"
    echo "- ログファイルを確認: docker compose -f docker-compose.production.yml logs"
    echo "- 設定ファイルを確認: config/config.json, config/production.env.local"
    
else
    echo -e "${RED}❌ 多くのチェックが失敗しました ($CHECKS_PASSED/$CHECKS_TOTAL)${NC}"
    echo "重大な問題があります。OwnServer Managerが正常に動作していません。"
    echo
    echo "トラブルシューティングガイド:"
    echo "1. Docker環境の確認: sudo systemctl status docker"
    echo "2. コンテナログの確認: docker compose -f docker-compose.production.yml logs"
    echo "3. 設定ファイルの確認: config/config.json, config/production.env.local"
    echo "4. ディスク容量の確認: df -h"
    echo "5. メモリ使用量の確認: free -h"
    echo
    echo "詳細なトラブルシューティング: docs/FAQ.md"
fi

echo
echo "📚 参考資料:"
echo "- クイックスタートガイド: docs/deployment/Quick-Start-Guide.md"
echo "- 完全デプロイガイド: docs/deployment/Ubuntu-Server-Complete-Deployment-Guide.md"
echo "- 運用マニュアル: docs/operations/Operations-Manual.md"
echo "- よくある質問: docs/FAQ.md"

# 終了コード設定
if [[ $CHECKS_PASSED -eq $CHECKS_TOTAL ]]; then
    exit 0
elif [[ $CHECKS_PASSED -gt $((CHECKS_TOTAL / 2)) ]]; then
    exit 1
else
    exit 2
fi
