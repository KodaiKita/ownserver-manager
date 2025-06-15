#!/bin/bash

# OwnServer Manager Alpha 1.0.0 自動インストールスクリプト
# Ubuntu Server 用

set -e  # エラー時に停止

# カラー設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ機能
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

# エラー処理
error_exit() {
    log_error "$1"
    exit 1
}

# 前提条件チェック
check_prerequisites() {
    log_info "前提条件をチェックしています..."
    
    # OS確認
    if [[ ! -f /etc/os-release ]]; then
        error_exit "OS情報を取得できません"
    fi
    
    . /etc/os-release
    if [[ "$ID" != "ubuntu" ]]; then
        error_exit "このスクリプトはUbuntu専用です（検出されたOS: $ID）"
    fi
    
    # sudo権限確認
    if ! sudo -n true 2>/dev/null; then
        error_exit "sudo権限が必要です"
    fi
    
    # インターネット接続確認
    if ! ping -c 1 8.8.8.8 &> /dev/null; then
        error_exit "インターネット接続が必要です"
    fi
    
    # ディスク容量確認（最低20GB）
    available_space=$(df / | awk 'NR==2 {print $4}')
    required_space=$((20 * 1024 * 1024))  # 20GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        error_exit "ディスク容量が不足しています（必要: 20GB、利用可能: $((available_space / 1024 / 1024))GB）"
    fi
    
    log_success "前提条件チェック完了"
}

# システム更新
update_system() {
    log_info "システムを更新しています..."
    
    sudo apt update -y
    sudo apt upgrade -y
    
    # 基本パッケージインストール
    sudo apt install -y curl wget git nano vim htop unzip software-properties-common \
        apt-transport-https ca-certificates gnupg lsb-release
    
    log_success "システム更新完了"
}

# Dockerインストール
install_docker() {
    log_info "Dockerをインストールしています..."
    
    # Docker がすでにインストールされているかチェック
    if command -v docker &> /dev/null; then
        log_warning "Dockerは既にインストールされています"
    else
        # Docker公式インストールスクリプト使用
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        rm get-docker.sh
        
        # 現在のユーザーをdockerグループに追加
        sudo usermod -aG docker $USER
        
        # Dockerサービス開始・有効化
        sudo systemctl start docker
        sudo systemctl enable docker
        
        log_success "Dockerインストール完了"
    fi
}

# Node.jsインストール
install_nodejs() {
    log_info "Node.js環境を構築しています..."
    
    # Node.jsバージョン確認
    if command -v node &> /dev/null; then
        node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $node_version -ge 20 ]]; then
            log_warning "Node.js $node_version.x は既にインストールされています"
            return
        else
            log_warning "Node.js $node_version.x が検出されました。Node.js 20.x以降が推奨です。"
            read -p "Node.js 22.x にアップグレードしますか？ (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_warning "Node.js 18.x環境では一部機能に制限があります"
                return
            fi
            
            # 既存Node.jsを削除
            sudo apt remove -y nodejs npm 2>/dev/null || true
            sudo apt autoremove -y
        fi
    fi
    
    # Node.js 22.x（LTS推奨）リポジトリ追加
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    
    # Node.jsインストール
    sudo apt install -y nodejs
    
    # バージョン確認
    node_ver=$(node --version)
    npm_ver=$(npm --version)
    log_success "Node.js ${node_ver}, npm ${npm_ver} インストール完了"
    
    # npm最新版に更新
    sudo npm install -g npm@latest
    new_npm_ver=$(npm --version)
    log_success "npm ${new_npm_ver} に更新完了"
}

# OwnServer Managerダウンロード
download_ownserver_manager() {
    log_info "OwnServer Managerをダウンロードしています..."
    
    # ホームディレクトリに移動
    cd "$HOME"
    
    # 既存のディレクトリがある場合の処理
    if [[ -d "ownserver-manager" ]]; then
        log_warning "既存のownserver-managerディレクトリを検出しました"
        read -p "バックアップして続行しますか？ (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            mv ownserver-manager "ownserver-manager.backup.$(date +%Y%m%d-%H%M%S)"
            log_info "既存ディレクトリをバックアップしました"
        else
            error_exit "インストールを中止しました"
        fi
    fi
    
    # リポジトリクローン
    git clone https://github.com/KodaiKita/ownserver-manager.git
    cd ownserver-manager
    
    # alpha-1.0.0タグをチェックアウト
    git checkout tags/alpha-1.0.0 2>/dev/null || log_warning "alpha-1.0.0タグが見つかりません。mainブランチを使用します。"
    
    log_success "OwnServer Managerダウンロード完了"
}

# 設定ファイル準備
prepare_configuration() {
    log_info "設定ファイルを準備しています..."
    
    # 設定ファイルをコピー
    cp config/production.env config/production.env.local
    
    # config.jsonテンプレート作成
    if [[ ! -f config/config.json ]]; then
        cat > config/config.json << 'EOF'
{
  "cloudflare": {
    "domain": "yourdomain.com",
    "apiToken": "your_cloudflare_api_token",
    "zoneId": "your_zone_id", 
    "email": "your_email@example.com"
  },
  "minecraft": {
    "defaultPort": 25565,
    "serverPath": "/app/minecraft-servers"
  }
}
EOF
    fi
    
    # 必要なディレクトリ作成
    mkdir -p minecraft-servers logs backups
    
    # 権限設定
    chmod 600 config/config.json config/production.env.local
    
    log_success "設定ファイル準備完了"
}

# ファイアウォール設定
configure_firewall() {
    log_info "ファイアウォールを設定しています..."
    
    # UFWが有効でない場合のみ設定
    if ! sudo ufw status | grep -q "Status: active"; then
        # SSH接続を許可（現在の接続を維持）
        sudo ufw allow ssh
        
        # Minecraftポートを開放
        sudo ufw allow 25565/tcp
        
        # ファイアウォール有効化
        sudo ufw --force enable
        
        log_success "ファイアウォール設定完了"
    else
        # 既に有効な場合はMinecraftポートのみ追加
        sudo ufw allow 25565/tcp
        log_info "Minecraftポート（25565）を開放しました"
    fi
}

# OwnServer Manager起動
start_ownserver_manager() {
    log_info "OwnServer Managerを起動しています..."
    
    # Docker Composeで起動
    docker compose -f docker-compose.production.yml up -d
    
    # 起動待ち
    log_info "起動を待機しています..."
    sleep 10
    
    # 起動確認
    if docker compose -f docker-compose.production.yml ps | grep -q "Up"; then
        log_success "OwnServer Manager起動完了"
    else
        log_error "起動に失敗しました。ログを確認してください："
        docker compose -f docker-compose.production.yml logs
        exit 1
    fi
}

# 動作確認
verify_installation() {
    log_info "インストールを確認しています..."
    
    # ヘルスチェック実行
    if docker compose -f docker-compose.production.yml exec -T ownserver-manager node src/commands/cli.js health &>/dev/null; then
        log_success "ヘルスチェック正常"
    else
        log_warning "ヘルスチェックに失敗しました（設定が必要な可能性があります）"
    fi
    
    # ポート確認
    if netstat -tlnp 2>/dev/null | grep -q ":25565"; then
        log_success "Minecraftポート（25565）が開放されています"
    else
        log_warning "Minecraftポートが開放されていません"
    fi
    
    log_success "インストール確認完了"
}

# メイン処理
main() {
    echo "=================================="
    echo "OwnServer Manager Alpha 1.0.0"
    echo "自動インストールスクリプト"
    echo "=================================="
    echo
    
    log_info "インストールを開始します..."
    
    check_prerequisites
    update_system
    install_nodejs
    install_docker
    download_ownserver_manager
    prepare_configuration
    configure_firewall
    
    # Dockerグループの変更確認
    if ! groups $USER | grep -q docker; then
        log_warning "Dockerグループの変更を反映するため、一度ログアウト・ログインしてから以下のコマンドを実行してください："
        echo "cd ~/ownserver-manager"
        echo "docker compose -f docker-compose.production.yml up -d"
        echo
        log_info "その後、以下のコマンドで動作確認してください："
        echo "docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js health"
    else
        start_ownserver_manager
        verify_installation
        
        echo
        log_success "🎉 インストール完了！"
        echo
        echo "次のステップ："
        echo "1. CloudFlare設定（オプション）: nano config/config.json"
        echo "2. サーバー公開: docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js public"
        echo "3. ステータス確認: docker compose -f docker-compose.production.yml exec ownserver-manager node src/commands/cli.js status"
        echo
        echo "詳細なドキュメント: docs/deployment/Quick-Start-Guide.md"
    fi
}

# スクリプト実行
main "$@"
