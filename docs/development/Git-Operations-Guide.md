# Git運用ルールガイド

## プロジェクト概要
**ownserver-manager**は段階的開発アプローチを採用したMinecraftサーバー管理システムです。
Logger、ConfigManager、MinecraftServerManagerの各コンポーネントをPhase1-4の段階で開発・テストし、
最終的にownserver連携を実現します。

## 1. ブランチ戦略

### 1.1 メインブランチ
- **main**: 本番リリース用ブランチ
  - 動作確認済みの安定版のみマージ
  - 各フェーズ完了時点でタグ付け
  - プロテクトされ、直接pushを禁止

### 1.2 開発ブランチ
- **develop**: 開発統合ブランチ
  - 各フェーズの統合テスト用
  - feature branchからのマージポイント
  - CI/CDパイプライン実行対象

### 1.3 フィーチャーブランチ
```
feature/component-phaseN-description
```
例:
- `feature/logger-phase1-basic-implementation`
- `feature/configmanager-phase2-validation`
- `feature/minecraft-phase3-monitoring`

### 1.4 ホットフィックスブランチ
```
hotfix/issue-description
```
例:
- `hotfix/memory-leak-fix`
- `hotfix/security-patch`

## 2. コミット規約

### 2.1 コミットメッセージ形式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### 2.2 Type定義
- **feat**: 新機能追加
- **fix**: バグ修正
- **docs**: ドキュメント更新
- **style**: コードフォーマット（機能に影響なし）
- **refactor**: リファクタリング
- **test**: テスト追加・修正
- **chore**: ビルド・補助ツール関連

### 2.3 Scope定義（コンポーネント別）
- **logger**: Logger関連
- **config**: ConfigManager関連
- **minecraft**: MinecraftServerManager関連
- **integration**: コンポーネント間統合
- **docs**: ドキュメント
- **build**: ビルド・依存関係
- **test**: テスト関連

### 2.4 例
```bash
feat(minecraft): implement Phase1 Java auto-detection and EULA handling

- Add JavaVersionManager for automatic Java version detection
- Implement EULAManager for automatic EULA compliance
- Add support for Vanilla/Spigot/Paper/Forge server types
- Successfully tested with Minecraft 1.8.8, 1.18.2, 1.21.5

Closes #15, #23
Test success rate: 100% (3/3 servers)
```

## 3. タグ付けルール

### 3.1 バージョニング
セマンティックバージョニング準拠: `v<major>.<minor>.<patch>`

### 3.2 フェーズ完了タグ
```
v0.<phase>.<iteration>
```
例:
- `v0.1.0`: Logger Phase1完了
- `v0.2.0`: ConfigManager Phase1完了
- `v0.3.0`: MinecraftServerManager Phase1完了

### 3.3 リリースタグ
```
v<major>.<minor>.<patch>[-<pre-release>]
```
例:
- `v1.0.0-alpha.1`: アルファ版
- `v1.0.0-beta.1`: ベータ版
- `v1.0.0`: 正式リリース

## 4. ワークフロー

### 4.1 フィーチャー開発
```bash
# 1. developから新ブランチ作成
git checkout develop
git pull origin develop
git checkout -b feature/minecraft-phase2-command-system

# 2. 開発・テスト・コミット
git add .
git commit -m "feat(minecraft): implement command system for Phase2"

# 3. プッシュとプルリクエスト
git push origin feature/minecraft-phase2-command-system
# GitHub上でPull Request作成
```

### 4.2 フェーズ完了時
```bash
# 1. developへマージ
git checkout develop
git merge feature/minecraft-phase1-complete

# 2. 統合テスト実行
npm test

# 3. mainへマージ
git checkout main
git merge develop

# 4. タグ付け
git tag -a v0.3.0 -m "MinecraftServerManager Phase1 complete"

# 5. プッシュ
git push origin main --tags
```

## 5. ファイル管理ルール

### 5.1 追跡対象
- `/src/` - ソースコード
- `/tests/` - テストファイル
- `/docs/` - ドキュメント
- `/config/` - 設定ファイル
- `package.json`, `package-lock.json`
- `README.md`, `LICENSE`

### 5.2 除外対象（.gitignore）
- `/node_modules/`
- `/logs/` - ログファイル
- `/java-runtimes/` - 自動ダウンロードJava
- `/minecraft-servers/` - テスト用サーバーファイル
- `*.log`
- 一時ファイル・テストファイル

### 5.3 大きなファイルの扱い
- Git LFS使用検討
- 代替リンク・説明文書で代用

## 6. コードレビュールール

### 6.1 必須レビュー
- mainブランチへのマージ
- 重要なリファクタリング
- セキュリティ関連変更

### 6.2 レビュー項目
- コードの品質・可読性
- テストカバレッジ
- ドキュメント更新
- 段階的開発原則の遵守

## 7. リリース管理

### 7.1 リリースブランチ
```
release/v<version>
```
例: `release/v1.0.0`

### 7.2 リリースプロセス
1. release/ブランチ作成
2. 最終テスト・バグ修正
3. リリースノート作成
4. mainへマージ・タグ付け
5. GitHub Release作成

## 8. 緊急対応

### 8.1 ホットフィックス
```bash
# mainから緊急修正ブランチ作成
git checkout main
git checkout -b hotfix/critical-bug-fix

# 修正・テスト・マージ
git commit -m "fix(minecraft): resolve critical memory leak"
git checkout main
git merge hotfix/critical-bug-fix
git tag -a v1.0.1 -m "Hotfix: critical memory leak"
```

## 9. 現在の状況と初期適用

### 9.1 現在の状況
- MinecraftServerManager Phase1完了
- 大量の新規ファイルが未追跡状態
- mainブランチから1コミット進行

### 9.2 初期適用手順
1. 開発ファイルの整理・コミット
2. ブランチ戦略適用
3. タグ付け実施
4. ドキュメント更新

---

**作成日**: 2024年6月12日  
**バージョン**: v1.0.0  
**適用開始**: MinecraftServerManager Phase1完了時点
