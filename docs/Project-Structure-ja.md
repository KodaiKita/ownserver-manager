# プロジェクト構造ドキュメント（日本語版）

## 開発に最適化されたファイル構造

このドキュメントでは、保守性、可読性、および人間とLLMの両方による効率的な開発を目的としたownserver-managerプロジェクトの最適化されたファイル構造について説明します。

## 現在の構造分析

### 強み ✅
- 明確な関心事の分離（managers、modules、utils）
- 専用の設定とドキュメントディレクトリ
- 参考用の段階ベース実装ファイル
- 包括的なテスト構造

### 改善済み ✅
- ドキュメントの体系化（適切なディレクトリに整理）
- テストファイルの整理（実装と分離）
- 開発履歴の保存
- 明確な開発ワークフロードキュメント

## 最適化された構造

```
ownserver-manager/
├── README.md                           # メインプロジェクトドキュメント
├── package.json                        # 依存関係とスクリプト
├── LICENSE                             # ライセンス情報
├── .gitignore                          # Git除外ルール
├── .env.example                        # 環境変数テンプレート
│
├── docs/                               # 📚 全ドキュメント
│   ├── README.md                       # ドキュメント索引（英語）
│   ├── README-ja.md                    # ドキュメント索引（日本語）✅
│   ├── architecture/                   # システム設計ドキュメント
│   │   ├── overview-ja.md
│   │   ├── component-diagram-ja.md
│   │   └── data-flow-ja.md
│   ├── implementation/                 # 実装ガイド
│   │   ├── Logger-Implementation.md    # ✅ 英語版
│   │   ├── Logger-Implementation-ja.md # ✅ 日本語版
│   │   ├── ConfigManager-Implementation-ja.md
│   │   ├── MinecraftServer-Implementation-ja.md
│   │   └── Integration-Guide-ja.md
│   ├── api/                           # APIドキュメント
│   │   ├── logger-api-ja.md
│   │   ├── config-api-ja.md
│   │   └── server-management-api-ja.md
│   ├── development/                   # 開発ガイド
│   │   ├── setup-guide-ja.md
│   │   ├── testing-guide-ja.md
│   │   ├── deployment-guide-ja.md
│   │   ├── troubleshooting-ja.md
│   │   └── Development-Workflow-ja.md  # ✅ 日本語版
│   ├── examples/                      # 使用例
│   │   ├── basic-usage-ja.md
│   │   ├── advanced-configuration-ja.md
│   │   └── integration-examples-ja.md
│   └── development-history/           # 🗃️ 開発履歴
│       ├── Logger_Investigation_Report.md
│       └── What is this.md
│
├── src/                               # 🎯 メインソースコード
│   ├── index.js                       # アプリケーションエントリポイント
│   ├── app.js                         # メインアプリケーションロジック
│   ├── config/                        # 設定処理
│   │   ├── index.js                   # 設定ローダー
│   │   ├── defaults.js                # デフォルト設定
│   │   └── validation.js              # 設定検証スキーマ
│   ├── managers/                      # 🎮 コアマネージャー
│   │   ├── index.js                   # マネージャーエクスポート
│   │   ├── MinecraftServerManager.js
│   │   ├── OwnServerManager.js
│   │   └── CloudFlareManager.js
│   ├── modules/                       # 🔧 機能モジュール
│   │   ├── index.js                   # モジュールエクスポート
│   │   ├── HealthChecker.js
│   │   ├── ServerMonitor.js
│   │   └── NotificationManager.js
│   ├── utils/                         # 🛠️ ユーティリティ
│   │   ├── index.js                   # ユーティリティエクスポート
│   │   ├── Logger.js                  # ✅ 本番Logger
│   │   ├── ConfigManager.js
│   │   ├── ErrorHandler.js
│   │   ├── Events.js
│   │   ├── Validator.js
│   │   ├── FileUtils.js
│   │   └── development-phases/        # 🗃️ 開発段階ファイル
│   │       ├── Logger_Phase1.js
│   │       ├── Logger_Phase2.js
│   │       ├── Logger_Phase3.js
│   │       ├── Logger_Phase4.js
│   │       └── [その他の開発ファイル]
│   ├── commands/                      # 🖥️ CLIコマンド
│   │   ├── index.js                   # コマンドエクスポート
│   │   ├── cli.js                     # メインCLIハンドラー
│   │   ├── server-commands.js         # サーバー管理コマンド
│   │   ├── config-commands.js         # 設定コマンド
│   │   └── monitoring-commands.js     # 監視コマンド
│   ├── types/                         # 📝 型定義
│   │   ├── config.js                  # 設定型
│   │   ├── server.js                  # サーバー関連型
│   │   └── common.js                  # 共通型定義
│   └── middleware/                    # 🔀 Expressミドルウェア
│       ├── auth.js                    # 認証
│       ├── logging.js                 # リクエストログ
│       └── validation.js              # リクエスト検証
│
├── tests/                             # 🧪 全テスト
│   ├── README-ja.md                   # テストガイド
│   ├── setup.js                       # テスト環境セットアップ
│   ├── teardown.js                    # テストクリーンアップ
│   ├── unit/                          # ユニットテスト
│   │   ├── utils/
│   │   │   ├── Logger.test.js
│   │   │   ├── ConfigManager.test.js
│   │   │   └── Validator.test.js
│   │   ├── managers/
│   │   │   ├── MinecraftServerManager.test.js
│   │   │   └── OwnServerManager.test.js
│   │   └── modules/
│   │       └── HealthChecker.test.js
│   ├── integration/                   # 統合テスト
│   │   ├── server-lifecycle.test.js
│   │   ├── config-management.test.js
│   │   └── logging-integration.test.js
│   ├── e2e/                          # エンドツーエンドテスト
│   │   ├── cli-workflows.test.js
│   │   └── full-deployment.test.js
│   ├── fixtures/                     # テストデータ
│   │   ├── configs/
│   │   ├── servers/
│   │   └── logs/
│   └── reference/                    # 実装参考テスト
│       └── logger-phases/            # ✅ Logger段階テスト
│           ├── test_phase1.js
│           ├── test_phase2.js
│           ├── test_phase3.js
│           ├── test_phase4.js
│           └── test_integration.js
│
├── config/                           # 📋 設定ファイル
│   ├── config.json                   # メインアプリケーション設定
│   ├── config.example.json           # 設定テンプレート
│   ├── docker.env                    # Docker環境変数
│   ├── development.json              # 開発用オーバーライド
│   ├── production.json               # 本番用オーバーライド
│   └── schemas/                      # 設定スキーマ
│       ├── server-config.schema.json
│       └── app-config.schema.json
│
├── bin/                              # 🚀 実行可能スクリプト
│   ├── ownserver-manager             # メインCLI実行ファイル
│   ├── setup.sh                      # 初期セットアップスクリプト
│   ├── backup.sh                     # バックアップスクリプト
│   └── health-check.sh               # ヘルスチェックスクリプト
│
├── templates/                        # 📄 テンプレート
│   ├── minecraft-server/
│   │   ├── server.properties
│   │   ├── docker-compose.yml
│   │   └── startup.sh
│   ├── docker/
│   │   ├── Dockerfile.minecraft
│   │   └── Dockerfile.proxy
│   └── configs/
│       ├── nginx.conf
│       └── cloudflare.json
│
├── scripts/                          # 🔧 開発スクリプト
│   ├── build.js                      # ビルドスクリプト
│   ├── deploy.js                     # デプロイメントスクリプト
│   ├── test-runner.js                # カスタムテストランナー
│   └── cleanup.js                    # クリーンアップユーティリティ
│
├── data/                             # 💾 アプリケーションデータ
│   ├── servers/                      # サーバーインスタンスデータ
│   ├── backups/                      # バックアップストレージ
│   └── cache/                        # 一時キャッシュ
│
├── logs/                             # 📝 アプリケーションログ
│   ├── app.log                       # メインアプリケーションログ
│   ├── minecraft-manager.log         # サーバーマネージャーログ
│   ├── health-checker.log            # ヘルスチェックログ
│   └── archived/                     # ローテーションされたログファイル
│
├── docker/                           # 🐳 Docker設定
│   ├── Dockerfile                    # メインアプリケーションコンテナ
│   ├── docker-compose.yml            # マルチサービス構成
│   ├── docker-compose.dev.yml        # 開発用オーバーライド
│   └── nginx/                        # Nginxプロキシ設定
│
└── .github/                          # 🔄 GitHub設定
    ├── workflows/                    # CI/CDワークフロー
    │   ├── test.yml
    │   ├── build.yml
    │   └── deploy.yml
    ├── ISSUE_TEMPLATE/               # イシューテンプレート
    └── PULL_REQUEST_TEMPLATE.md      # PRテンプレート
```

## 主要な組織原則

### 1. 明確な関心事の分離
- **ソースコード** (`src/`): 全実装ファイル
- **テスト** (`tests/`): 全テスト関連ファイル  
- **ドキュメント** (`docs/`): 包括的なドキュメント
- **設定** (`config/`): 全設定ファイル

### 2. 階層的ドキュメント
```
docs/
├── architecture/     # 高レベルシステム設計
├── implementation/   # コンポーネント固有の実装詳細
├── api/             # APIリファレンスドキュメント
├── development/     # 開発とデプロイメントガイド
├── examples/        # 実用的な使用例
└── development-history/ # 開発履歴保存
```

### 3. 段階的テスト構造
```
tests/
├── unit/            # 個別コンポーネントテスト
├── integration/     # コンポーネント間連携テスト
├── e2e/            # 完全ワークフローテスト
├── fixtures/       # テストデータとモック
└── reference/      # 開発履歴と段階テスト
```

### 4. 実装履歴の保存
- 段階ベース実装ファイルを`src/utils/development-phases/`に保存
- 開発調査レポートを維持
- 将来の参考のために意思決定プロセスを文書化

## 実装ガイドライン

### 開発者向け

#### 1. ファイル組織
- **ファイル1つにつき1つの主要責任**
- **明確な命名規則**: クラスは`PascalCase`、ユーティリティは`camelCase`
- **クリーンなインポートのためのインデックスファイル**: 個別インポートではなく`require('./managers')`

#### 2. ドキュメント標準
- 各主要コンポーネントの**実装ドキュメント**
- 例付きの**APIドキュメント**
- アーキテクチャ選択の**決定ログ**

#### 3. テスト戦略
- 個別の関数とクラスの**ユニットテスト**
- コンポーネント間相互作用の**統合テスト**
- 完全ワークフローの**E2Eテスト**
- 開発段階を保存する**参考テスト**

### LLMアシスタント向け

#### 1. コンテキスト発見
```javascript
// 明確なインポート構造
const { Logger } = require('../utils');
const { MinecraftServerManager } = require('../managers');
const config = require('../config');
```

#### 2. ドキュメントナビゲーション
- プロジェクト概要は`docs/README-ja.md`から開始
- コンポーネント詳細は`docs/implementation/`を確認
- 使用パターンは`docs/api/`を参照

#### 3. テストガイダンス
- 一貫したテストデータに`tests/fixtures/`を使用
- `tests/unit/`の既存テストパターンに従う
- 実装例は`tests/reference/`の段階テストを参照

## 移行計画

### フェーズ1: ドキュメント再編成 ✅
- [x] `docs/`ディレクトリ構造作成
- [x] 既存ドキュメントの移動と分類
- [x] Logger実装ドキュメント作成
- [x] 日本語ドキュメント作成

### フェーズ2: テスト再構築 ✅
- [x] `tests/`ディレクトリ構造作成
- [x] 既存テストファイルの適切なカテゴリへの移動
- [x] テストフィクスチャとユーティリティ作成

### フェーズ3: ソース構造最適化（今後）
- [ ] インデックスエクスポートによるソースファイル再編成
- [ ] 型定義作成
- [ ] ミドルウェア構造実装

### フェーズ4: テンプレートとスクリプト追加（将来）
- [ ] 設定テンプレート作成
- [ ] 開発スクリプト追加
- [ ] CI/CDワークフロー設定

## この構造の利点

### 人間の開発者向け
- **迅速なオンボーディング**: 明確なドキュメント階層
- **簡単なメンテナンス**: 論理的なファイル組織
- **優れたテスト**: 包括的なテスト構造
- **クリーンなコード**: 関心事の分離

### LLMアシスタント向け
- **より良いコンテキスト理解**: 明確なファイル関係
- **簡単なナビゲーション**: 予測可能な構造パターン
- **改善されたコード生成**: 一貫したパターンと例
- **高速な問題解決**: 包括的なドキュメントと例

---

**次のアクション**: ConfigManagerの開発を開始し、この構造に従ってドキュメントとテストを作成
