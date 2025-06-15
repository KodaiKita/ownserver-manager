# Node.js 18.x から 20.x/22.x アップグレードガイド

## 問題の概要

Node.js 18.x環境では、npm@11.x との互換性問題により以下のエラーが発生します：

```
npm error code EBADENGINE
npm error engine Unsupported engine
npm error engine Not compatible with your version of node/npm: npm@11.4.2
npm error notsup Required: {"node":"^20.17.0 || >=22.9.0"}
npm error notsup Actual:   {"npm":"10.8.2","node":"v18.20.8"}
```

## 解決方法: Node.js アップグレード

### Ubuntu/Debian系の場合

#### 方法1: 既存Node.jsを削除してクリーンインストール（推奨）

```bash
# 1. 既存Node.jsとnpmを削除
sudo apt remove -y nodejs npm

# 2. パッケージキャッシュをクリア
sudo apt autoremove -y
sudo apt autoclean

# 3. Node.js 22.x（LTS推奨）をインストール
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 4. バージョン確認
node --version  # v22.x.x が表示されることを確認
npm --version   # 10.x.x 以降が表示されることを確認

# 5. npm最新版に更新
sudo npm install -g npm@latest

# 6. 最終確認
node --version
npm --version
```

#### 方法2: Node.js 20.x を使用する場合

```bash
# Node.js 18.x を削除
sudo apt remove -y nodejs npm
sudo apt autoremove -y

# Node.js 20.x をインストール
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# バージョン確認
node --version  # v20.x.x
npm --version
```

### その他の方法

#### NVM（Node Version Manager）を使用

```bash
# NVMをインストール（未インストールの場合）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# 利用可能なNode.jsバージョンを確認
nvm list-remote --lts

# Node.js 22.x LTSをインストール
nvm install --lts
nvm use --lts

# デフォルトに設定
nvm alias default node

# バージョン確認
node --version
npm --version
```

## アップグレード後の確認

```bash
# Node.jsバージョン確認（20.x または 22.x であることを確認）
node --version

# npm バージョン確認（10.x 以降であることを確認）
npm --version

# npm@11.x インストール テスト
npm install -g npm@latest

# 再度確認
npm --version
```

## OwnServer Manager での確認

```bash
# プロジェクトディレクトリに移動
cd ~/ownserver-manager

# 依存関係の再インストール
rm -rf node_modules package-lock.json
npm install

# 統合設定システムのテスト
npm run setup

# 成功すれば、Node.jsアップグレードは完了
```

## トラブルシューティング

### 権限エラーが発生する場合

```bash
# npmのデフォルトディレクトリを変更
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'

# ~/.bashrc または ~/.zshrc に追加
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### パッケージが見つからない場合

```bash
# NodeSourceリポジトリを再追加
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt update
sudo apt install -y nodejs
```

### 複数のNode.jsバージョンが混在している場合

```bash
# すべてのNode.js関連パッケージを削除
sudo apt purge -y nodejs npm
sudo apt autoremove -y

# /usr/local のNode.jsも削除
sudo rm -rf /usr/local/bin/npm /usr/local/share/man/man1/node* /usr/local/lib/dtrace/node.d ~/.npm

# クリーンインストール
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

## 参考リンク

- [Node.js 公式サイト](https://nodejs.org/)
- [NodeSource リポジトリ](https://github.com/nodesource/distributions)
- [NVM（Node Version Manager）](https://github.com/nvm-sh/nvm)
- [npm 公式ドキュメント](https://docs.npmjs.com/)

## 推奨環境

- **Node.js**: 22.x LTS（最新安定版）
- **npm**: 11.x（最新版）
- **OS**: Ubuntu 20.04/22.04/24.04 LTS
