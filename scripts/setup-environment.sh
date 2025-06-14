#!/bin/bash

# ============================================================================
# 🔧 OwnServer Manager 環境設定セットアップスクリプト
# ============================================================================
#
# 目的: 必要な環境設定ファイルをテンプレートからコピーし、初期設定を行う
# 使用: ./scripts/setup-environment.sh
#
# ============================================================================

set -e

# 色付きメッセージ用
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}🔧 OwnServer Manager 環境設定セットアップ${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# 作業ディレクトリを確認
if [ ! -f "package.json" ] || [ ! -d "config" ]; then
    echo -e "${RED}❌ エラー: このスクリプトはプロジェクトルートディレクトリで実行してください${NC}"
    echo -e "${YELLOW}   現在のディレクトリ: $(pwd)${NC}"
    echo -e "${YELLOW}   正しいディレクトリに移動してから再実行してください${NC}"
    exit 1
fi

echo -e "${YELLOW}📂 環境設定ファイルのセットアップを開始します...${NC}"
echo ""

# 必要なテンプレートファイルとその出力先
declare -A TEMPLATE_FILES=(
    ["config/docker.env.example"]="config/docker.env"
    ["config/production.env.example"]="config/production.env"
    ["config/config.json.example"]="config/config.json"
)

# ファイルのコピー処理
CREATED_FILES=()
SKIPPED_FILES=()

for template in "${!TEMPLATE_FILES[@]}"; do
    output="${TEMPLATE_FILES[$template]}"
    
    # テンプレートファイルの存在確認
    if [ ! -f "$template" ]; then
        echo -e "${RED}❌ エラー: テンプレートファイルが見つかりません: $template${NC}"
        continue
    fi
    
    # 出力ファイルが既に存在するかチェック
    if [ -f "$output" ]; then
        echo -e "${YELLOW}⚠️  ファイルが既に存在します: $output${NC}"
        echo -n "   上書きしますか? [y/N]: "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}   スキップしました: $output${NC}"
            SKIPPED_FILES+=("$output")
            continue
        fi
    fi
    
    # ファイルをコピー
    cp "$template" "$output"
    echo -e "${GREEN}✅ 作成しました: $output${NC}"
    CREATED_FILES+=("$output")
done

echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}📋 セットアップ結果${NC}"
echo -e "${BLUE}============================================================================${NC}"

echo ""
echo -e "${GREEN}✅ 作成されたファイル (${#CREATED_FILES[@]}件):${NC}"
for file in "${CREATED_FILES[@]}"; do
    echo -e "${GREEN}   - $file${NC}"
done

if [ ${#SKIPPED_FILES[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  スキップされたファイル (${#SKIPPED_FILES[@]}件):${NC}"
    for file in "${SKIPPED_FILES[@]}"; do
        echo -e "${YELLOW}   - $file${NC}"
    done
fi

echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}📝 次に行うべき作業${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}🔧 必須設定作業:${NC}"
echo "   1. 以下のファイルを編集し、YOUR_* 部分を実際の値に置換:"

for file in "${CREATED_FILES[@]}"; do
    echo -e "${YELLOW}      - $file${NC}"
done

echo ""
echo -e "${YELLOW}📚 設定に必要な情報:${NC}"
echo "   - CloudFlare API Token: CloudFlareダッシュボード → マイプロファイル → APIトークン"
echo "   - CloudFlare Zone ID: CloudFlareダッシュボード → 該当ドメイン → Overview → Zone ID"
echo "   - CloudFlare Email: CloudFlareアカウントのEmailアドレス"
echo "   - ドメイン名: 管理対象のドメイン名（例: yourdomain.com）"
echo "   - サーバーホスト: Minecraftサーバーのホスト名・IPアドレス"

echo ""
echo -e "${YELLOW}📖 詳細な設定ガイド:${NC}"
echo "   - CloudFlare設定: docs/configuration/CloudFlare-Setup-Guide.md"
echo "   - 全体設定ガイド: docs/configuration/Configuration-Guide.md"
echo "   - セキュリティポリシー: docs/security/SECURITY_POLICY.md"

echo ""
echo -e "${YELLOW}🚨 重要な注意事項:${NC}"
echo -e "${RED}   - 機密情報（APIキー・トークン）の直接記述・ハードコーディングは厳禁${NC}"
echo -e "${RED}   - 編集した環境ファイルは絶対にGitにコミットしない${NC}"
echo -e "${RED}   - 機密情報をチャット・メール等で共有しない${NC}"
echo -e "${RED}   - 設定完了後は必ずセキュリティスキャンを実行: ./scripts/security-scan-docs.sh${NC}"

echo ""
echo -e "${GREEN}🎉 環境設定ファイルのセットアップが完了しました！${NC}"
echo -e "${GREEN}   上記の手順に従って設定を完了し、Docker Composeを起動してください。${NC}"

echo ""
echo -e "${BLUE}============================================================================${NC}"
