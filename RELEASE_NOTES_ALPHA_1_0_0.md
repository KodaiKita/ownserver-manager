# Alpha 1.0.0 - Production-Ready Release

🎉 **OwnServer Manager** の最初のアルファリリースです！

## 🌟 主要機能

### ✨ 完全統合システム
- **Minecraft サーバー管理**: Paper/Spigot/Vanilla/Forge 対応
- **CloudFlare DNS 自動化**: ドメイン・サブドメイン管理
- **Docker ベース運用**: 本番対応コンテナ環境
- **CLI 完全操作**: 豊富なコマンドライン機能

### 🚀 本番運用対応
- **自動インストール**: Ubuntu Server ワンライナー導入
- **健全性監視**: システム状態リアルタイム確認
- **包括的ドキュメント**: デプロイ・運用・設定ガイド完備
- **セキュリティ強化**: 適切な権限・リソース制限

## 📦 クイックスタート

### ワンライナーインストール
```bash
wget -O - https://raw.githubusercontent.com/KodaiKita/ownserver-manager/alpha-1.0.0/scripts/install.sh | bash
```

### 手動インストール
```bash
# リポジトリクローン
git clone https://github.com/KodaiKita/ownserver-manager.git
cd ownserver-manager

# 必要パッケージインストール
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git wget curl

# システム構築
docker compose up -d
```

## 📚 ドキュメント

| ガイド | 説明 | リンク |
|--------|------|--------|
| **クイックスタート** | 5分で始めるセットアップ | [Quick-Start-Guide.md](./docs/deployment/Quick-Start-Guide.md) |
| **完全デプロイガイド** | Ubuntu Server 新規導入 | [Ubuntu-Server-Complete-Deployment-Guide.md](./docs/deployment/Ubuntu-Server-Complete-Deployment-Guide.md) |
| **運用マニュアル** | 日常運用・監視手順 | [Operations-Manual.md](./docs/operations/Operations-Manual.md) |
| **設定ガイド** | 詳細設定・CloudFlare連携 | [Configuration-Guide.md](./docs/configuration/Configuration-Guide.md) |
| **FAQ** | よくある質問・トラブル解決 | [FAQ.md](./docs/FAQ.md) |

## 🔧 CLI コマンド

```bash
# サーバー管理
osm server start               # サーバー開始
osm server stop                # サーバー停止
osm server status              # 状態確認
osm server logs --follow       # ログ監視

# CloudFlare DNS
osm cloudflare status          # CloudFlare接続確認
osm cloudflare update-ip       # IP更新

# システム管理
osm system health              # 健全性チェック
osm system stats               # システム統計
osm config validate            # 設定検証
```

## 🧪 動作確認済み環境

- **OS**: Ubuntu Server 20.04/22.04/24.04 LTS
- **Docker**: 20.10+
- **Node.js**: 18+ (Alpine Linux)
- **Minecraft**: Paper/Spigot/Vanilla/Forge
- **CloudFlare**: DNS API v4

## ⚠️ 重要な注意事項

- **アルファ版**: 本番利用前に十分なテストを実施してください
- **バックアップ**: 重要なデータは必ずバックアップを取ってください
- **設定**: CloudFlare API設定が必要です（[設定ガイド](./docs/configuration/CloudFlare-Setup-Guide.md)参照）

## 🐛 バグレポート・フィードバック

問題を発見した場合は、[Issues](https://github.com/KodaiKita/ownserver-manager/issues) でご報告ください。

## 🎯 次期バージョン予定

- Web管理画面の追加
- より多くのMinecraftバージョン対応
- プラグイン管理機能
- 自動バックアップシステム

---

**リリース責任者**: Kodai Kita  
**リリース日**: 2025年6月14日
