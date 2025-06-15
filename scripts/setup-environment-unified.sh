#!/bin/bash

# ============================================================================
# OwnServer Manager - 簡単セットアップスクリプト
# 統合設定管理により、一つの設定ファイルから全てを自動生成
# ============================================================================

set -e

echo "🚀 OwnServer Manager - 簡単セットアップ"
echo "============================================"

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ディレクトリ設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$PROJECT_ROOT/config"

echo -e "${BLUE}📁 Project directory: $PROJECT_ROOT${NC}"

# config ディレクトリ作成
mkdir -p "$CONFIG_DIR"

# Node.jsの確認
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Node.jsバージョンチェック
node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

if [[ $node_version -lt 20 ]]; then
    echo -e "${YELLOW}⚠️  警告: Node.js $node_version.x が検出されました${NC}"
    echo -e "${YELLOW}   推奨: Node.js 20.x または 22.x系${NC}"
    echo ""
    echo -e "${RED}   Node.js 18.xはnpm@11.xとの互換性問題があります${NC}"
    echo ""
    echo -e "${BLUE}💡 アップグレード方法:${NC}"
    echo "   # 既存Node.jsを削除"
    echo "   sudo apt remove -y nodejs npm"
    echo "   sudo apt autoremove -y"
    echo ""
    echo "   # Node.js 22.x をインストール"  
    echo "   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -"
    echo "   sudo apt install -y nodejs"
    echo ""
    echo "   # 再度このスクリプトを実行"
    echo "   ./scripts/setup-environment-unified.sh"
    echo ""
    read -p "続行しますか？ (Node.js 18.xでは一部機能に制限があります) [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}セットアップを中止しました${NC}"
        exit 1
    fi
    echo -e "${YELLOW}Node.js 18.x環境で続行します（制限付き）${NC}"
    echo ""
elif [[ $node_version -ge 20 ]]; then
    echo -e "${GREEN}✅ Node.js $node_version.x は推奨バージョンです${NC}"
fi

# 統合設定管理システムのセットアップ
echo ""
echo -e "${YELLOW}🔧 統合設定管理システムを使用します${NC}"
echo "   一つのマスター設定から全ての設定ファイルを自動生成"

# master.json が存在するかチェック
if [ ! -f "$CONFIG_DIR/master.json" ]; then
    echo ""
    echo -e "${YELLOW}📝 マスター設定ファイルが見つかりません${NC}"
    echo "   テンプレートを生成します..."
    
    # テンプレート生成
    cd "$PROJECT_ROOT"
    node scripts/config-generator.js --template
    
    echo ""
    echo -e "${BLUE}📋 次の手順で設定を完了してください:${NC}"
    echo ""
    echo "1. 📝 config/master.json.example を config/master.json にコピー:"
    echo "   cp config/master.json.example config/master.json"
    echo ""
    echo "2. ✏️  config/master.json を編集し、以下の必須項目を設定:"
    echo "   - cloudflare.domain (あなたのドメイン)"
    echo "   - cloudflare.apiToken (CloudFlare APIトークン)"
    echo "   - cloudflare.zoneId (CloudFlare Zone ID)"
    echo "   - cloudflare.email (CloudFlareアカウントのメール)"
    echo ""
    echo "3. 🔄 再度このスクリプトを実行:"
    echo "   ./scripts/setup-environment.sh"
    echo "   または"
    echo "   npm run setup"
    echo ""
    echo -e "${GREEN}💡 ヒント: CloudFlare設定は以下で取得できます:${NC}"
    echo "   - APIトークン: CloudFlareダッシュボード → マイプロファイル → APIトークン"
    echo "   - Zone ID: CloudFlareダッシュボード → 該当ドメイン → Overview → Zone ID"
    
    exit 0
fi

# マスター設定から全ての設定ファイルを生成
echo ""
echo -e "${BLUE}🔄 マスター設定から全ての設定ファイルを生成中...${NC}"

cd "$PROJECT_ROOT"
node scripts/config-generator.js

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 設定ファイル生成完了!${NC}"
    echo ""
    echo -e "${BLUE}📄 生成されたファイル:${NC}"
    echo "   ✅ config/config.json"
    echo "   ✅ config/.env"
    echo "   ✅ config/docker.env"
    echo "   ✅ config/production.env"
    echo ""
    echo -e "${GREEN}🚀 セットアップ完了! 次のコマンドで起動できます:${NC}"
    echo ""
    echo -e "${YELLOW}Docker使用の場合:${NC}"
    echo "   docker compose up -d"
    echo "   または"
    echo "   docker compose -f docker-compose.production.yml up -d"
    echo ""
    echo -e "${YELLOW}直接実行の場合:${NC}"
    echo "   npm start"
    echo ""
    echo -e "${BLUE}📊 ステータス確認:${NC}"
    echo "   npm run cli status"
    echo ""
    echo -e "${BLUE}📝 ログ確認:${NC}"
    echo "   npm run cli logs --follow"
    
else
    echo -e "${RED}❌ 設定ファイル生成に失敗しました${NC}"
    echo "config/master.json の内容を確認してください"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ OwnServer Manager セットアップ完了!${NC}"
