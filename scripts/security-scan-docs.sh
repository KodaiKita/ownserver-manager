#!/bin/bash

# セキュリティスキャンスクリプト - ドキュメント・リリース前チェック

set -e

echo "🔍 OwnServer Manager - セキュリティスキャン開始"
echo "================================================="

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# エラーカウンタ
ERROR_COUNT=0
WARNING_COUNT=0

# 危険なパターンの定義
DANGEROUS_PATTERNS=(
    "c7Q0Zk7PzZMEsJHkDCd90"
    "346ec04a514234caa47f7883c8431494"
    "kowdai317@gmail.com"
    "a50753ef4aee5aefa174fb54ca7cf2443c92c"
    "play\.cspd\.net"
    "shard-2509\.ownserver\.kumassy\.com"
)

# APIキーパターン
API_KEY_PATTERNS=(
    "[0-9a-f]{32,64}"                    # 長い16進数文字列
    "[A-Za-z0-9]{30,}"                   # 長い英数字文字列  
    "sk-[A-Za-z0-9]{32,}"               # OpenAI形式
    "xoxb-[A-Za-z0-9-]+"                # Slack形式
    "ghp_[A-Za-z0-9]{36}"               # GitHub Personal Access Token
)

# メール・ドメインパターン
EMAIL_DOMAIN_PATTERNS=(
    "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"  # メールアドレス
    "https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"          # URL
)

echo "🔍 ステップ1: 既知の機密情報パターンをスキャン中..."

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
    echo "   チェック中: $pattern"
    
    if find . -name "*.md" -o -name "*.js" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" | \
       xargs grep -l "$pattern" 2>/dev/null; then
        echo -e "   ${RED}❌ 危険: 既知の機密情報が発見されました: $pattern${NC}"
        find . -name "*.md" -o -name "*.js" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" | \
        xargs grep -n "$pattern" 2>/dev/null | head -5
        ERROR_COUNT=$((ERROR_COUNT + 1))
        echo ""
    fi
done

echo ""
echo "🔍 ステップ2: APIキーパターンをスキャン中..."

for pattern in "${API_KEY_PATTERNS[@]}"; do
    echo "   チェック中: APIキーパターン"
    
    matches=$(find . -name "*.md" -o -name "*.js" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" | \
              xargs grep -E "$pattern" 2>/dev/null | \
              grep -v "YOUR_" | \
              grep -v "PLACEHOLDER" | \
              grep -v "example" | \
              grep -v "sample" || true)
    
    if [ ! -z "$matches" ]; then
        echo -e "   ${YELLOW}⚠️  警告: APIキーパターンが発見されました${NC}"
        echo "$matches" | head -5
        WARNING_COUNT=$((WARNING_COUNT + 1))
        echo ""
    fi
done

echo ""
echo "🔍 ステップ3: メール・ドメインパターンをスキャン中..."

for pattern in "${EMAIL_DOMAIN_PATTERNS[@]}"; do
    echo "   チェック中: メール・ドメインパターン"
    
    matches=$(find . -name "*.md" -o -name "*.js" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" | \
              xargs grep -E "$pattern" 2>/dev/null | \
              grep -v "example\.com" | \
              grep -v "yourdomain\.com" | \
              grep -v "your-email@example\.com" | \
              grep -v "mailto:" | \
              grep -v "github\.com" | \
              grep -v "nodejs\.org" | \
              grep -v "npmjs\.com" | \
              grep -v "docker\.com" | \
              grep -v "cloudflare\.com" || true)
    
    if [ ! -z "$matches" ]; then
        echo -e "   ${YELLOW}⚠️  警告: 実際のメール・ドメインが発見されました${NC}"
        echo "$matches" | head -5
        WARNING_COUNT=$((WARNING_COUNT + 1))
        echo ""
    fi
done

echo ""
echo "🔍 ステップ4: 特定ファイルのチェック..."

# リリースノートの特別チェック  
if [ -f "RELEASE_NOTES_ALPHA_1_0_0.md" ]; then
    echo "   チェック中: リリースノート"
    
    if grep -E "(c7Q0|346ec|kowdai|a50753|cspd\.net|kumassy)" RELEASE_NOTES_ALPHA_1_0_0.md > /dev/null 2>&1; then
        echo -e "   ${RED}❌ 重大: リリースノートに機密情報が含まれています${NC}"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    else
        echo -e "   ${GREEN}✅ リリースノート: 安全${NC}"
    fi
fi

# .envファイルの存在チェック（Git管理対象でないことを確認）
if git ls-files | grep -E "\.env$" > /dev/null 2>&1; then
    echo -e "   ${RED}❌ 重大: .envファイルがGit管理されています${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
else
    echo -e "   ${GREEN}✅ .envファイル: Git管理対象外${NC}"
fi

echo ""
echo "🔍 ステップ5: .gitignoreの検証..."

if [ -f ".gitignore" ]; then
    if grep -E "\.env|secrets|api-keys|*secret*" .gitignore > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ .gitignore: セキュリティパターン含有${NC}"
    else
        echo -e "   ${YELLOW}⚠️  警告: .gitignoreにセキュリティパターンが不足${NC}"
        WARNING_COUNT=$((WARNING_COUNT + 1))
    fi
fi

echo ""
echo "================================================="
echo "🎯 セキュリティスキャン結果"
echo "================================================="

if [ $ERROR_COUNT -eq 0 ] && [ $WARNING_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ 素晴らしい! 機密情報は発見されませんでした${NC}"
    echo -e "${GREEN}✅ リリース・デプロイを続行できます${NC}"
    exit 0
elif [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⚠️  警告が ${WARNING_COUNT} 件発見されました${NC}"
    echo -e "${YELLOW}⚠️  確認してからリリースを続行してください${NC}"
    exit 1
else
    echo -e "${RED}❌ エラーが ${ERROR_COUNT} 件発見されました${NC}"
    echo -e "${RED}❌ 警告が ${WARNING_COUNT} 件発見されました${NC}"
    echo -e "${RED}❌ 機密情報を除去してから再実行してください${NC}"
    echo ""
    echo "🔧 対処方法:"
    echo "1. 上記で発見された機密情報をプレースホルダーに置き換え"
    echo "2. .envファイルがGit管理されていないことを確認"  
    echo "3. このスクリプトを再実行"
    echo ""
    exit 2
fi
