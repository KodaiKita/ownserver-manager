# Logger実装ドキュメント（日本語版）

## 概要

Loggerユーティリティは段階ベース開発アプローチにより成功裏に実装され、高度な機能を持つ本番運用可能なログソリューションが完成しました。

## 実装履歴

### 開発段階

#### 段階1: 基本構造 ✅
- **ファイル**: `Logger_Phase1.js`
- **機能**: 基本クラスコンストラクタ、ディレクトリ作成
- **状況**: テスト成功
- **主要成果**: 基盤アーキテクチャの確立

#### 段階2: 基本ログ機能 ✅
- **ファイル**: `Logger_Phase2.js`
- **機能**: JSONログエントリ作成、ファイル書き込み、基本info()メソッド
- **状況**: テスト成功
- **主要成果**: ファイルへの機能的ログ出力

#### 段階3: 複数ログレベル ✅
- **ファイル**: `Logger_Phase3.js`
- **機能**: ログレベルフィルタリング、カラーコンソール出力、debug/info/warn/errorメソッド
- **状況**: テスト成功
- **主要成果**: フィルタリング付き完全ログインターフェース

#### 段階4: 高度機能 ✅
- **ファイル**: `Logger_Phase4.js`
- **機能**: ログローテーション、非同期操作、パフォーマンス監視、クリーンアップ
- **状況**: テスト成功
- **主要成果**: エンタープライズ機能を持つ本番対応

#### 本番統合 ✅
- **ファイル**: `Logger.js`（本番版）
- **機能**: 段階4の全機能を統合
- **状況**: 統合テスト済み・検証済み
- **主要成果**: 本番デプロイメント準備完了

## 現在の機能

### コアログ機能
- **構造化JSONログ**: 全ログエントリはパース容易なJSON形式で保存
- **複数ログレベル**: debug、info、warn、errorと設定可能フィルタリング
- **カラーコンソール出力**: 開発者フレンドリーなカラーコンソールメッセージ
- **非同期ファイル操作**: パフォーマンス向上のためのノンブロッキングファイルI/O

### 高度機能
- **自動ログローテーション**: サイズ制限到達時の自動ファイルローテーション（設定可能）
- **複数ファイル管理**: 設定可能な数の古いログファイルを保持
- **パフォーマンス監視**: ログ統計とパフォーマンスメトリクスの追跡
- **並行ログ処理**: 複数同時ログ操作のサポート
- **エラーハンドリング**: フォールバック機構を持つ堅牢なエラーハンドリング

### 設定オプション
```javascript
const logger = new Logger('category', {
    logDir: './logs',           // ログディレクトリパス
    logLevel: 'info',           // 最小ログレベル
    maxFileSize: 5 * 1024 * 1024, // 5MBローテーション閾値
    maxFiles: 5,                // 保持する古いファイル数
    enableConsole: true         // コンソール出力切り替え
});
```

## API リファレンス

### コンストラクタ
```javascript
new Logger(category, options)
```
- `category`: ログインスタンスの文字列識別子
- `options`: 設定オブジェクト（任意）

### ログメソッド
全メソッドは非同期でPromiseオブジェクトを返します：

```javascript
await logger.debug(message, data?)   // デバッグレベルログ
await logger.info(message, data?)    // 情報レベルログ  
await logger.warn(message, data?)    // 警告レベルログ
await logger.error(message, data?)   // エラーレベルログ
```

### ユーティリティメソッド
```javascript
await logger.getStats()              // パフォーマンス統計取得
await logger.cleanup()               // 強制クリーンアップとローテーション
```

## ログフォーマット

### ファイルフォーマット（JSON）
```json
{
  "timestamp": "2025-06-11T18:16:21.362Z",
  "level": "INFO",
  "category": "app",
  "message": "アプリケーション開始",
  "pid": 12345,
  "data": { "port": 3000, "env": "production" }
}
```

### コンソールフォーマット（カラー付き）
```
[18:16:21] INFO  [app] アプリケーション開始 {"port":3000,"env":"production"}
```

## パフォーマンス特性

### ベンチマーク（テスト結果）
- **並行操作**: 20操作を2msで実行（平均0.10ms）
- **ファイルローテーション**: 設定可能サイズ制限での自動実行
- **メモリ効率**: 非同期操作によりブロッキング防止
- **エラー復旧**: ファイルシステムエラーの優雅な処理

## ファイル構造

### 生成ファイル
```
logs/
├── category.log          # 現在のログファイル
├── category.log.1        # 前回のローテーション
├── category.log.2        # 古いローテーション
└── category.log.N        # 保持される最古ファイル
```

### 実装ファイル
```
src/utils/
├── Logger.js                           # ✅ 本番版
└── development-phases/                 # 🗃️ 開発段階ファイル
    ├── Logger_Phase1.js                # 📚 段階1参考
    ├── Logger_Phase2.js                # 📚 段階2参考  
    ├── Logger_Phase3.js                # 📚 段階3参考
    ├── Logger_Phase4.js                # 📚 段階4参考
    └── Logger_old_backup.js            # 🗃️ 以前の実装
```

## テスト

### テストファイル
```
tests/reference/logger-phases/
├── test_phase1.js                      # 段階1基本機能
├── test_phase2.js                      # 段階2ファイル操作  
├── test_phase3.js                      # 段階3ログレベルとカラー
├── test_phase4.js                      # 段階4ローテーションと非同期機能
└── test_integration.js                 # 本番統合テスト
```

### テスト結果
全テストが正常に完了：
- ✅ モジュールインポートとインスタンス作成
- ✅ 全ログメソッド（debug、info、warn、error）
- ✅ 並行ログサポート
- ✅ 統計追跡
- ✅ エラーオブジェクト処理
- ✅ 自動ログローテーション
- ✅ ファイル管理と検証
- ✅ クリーンアップ機能

## 使用例

### 基本使用法
```javascript
const Logger = require('./src/utils/Logger');
const logger = new Logger('app');

await logger.info('アプリケーション開始', { port: 3000 });
await logger.error('データベース接続失敗', { 
    error: 'ECONNREFUSED',
    host: 'localhost',
    port: 5432 
});
```

### 高度な設定
```javascript
const logger = new Logger('minecraft-server', {
    logDir: './minecraft-servers/logs',
    logLevel: 'debug',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    enableConsole: process.env.NODE_ENV !== 'production'
});
```

### エラーハンドリング
```javascript
try {
    // 何らかの操作
} catch (error) {
    await logger.error('操作失敗', {
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack.split('\n').slice(0, 5)
    });
}
```

## 他コンポーネントとの統合

Loggerはアプリケーション全体で使用されるよう設計されています：

```javascript
// マネージャーでの使用
class MinecraftServerManager {
    constructor() {
        this.logger = new Logger('minecraft-manager');
    }
    
    async startServer(serverName) {
        await this.logger.info('サーバー開始', { serverName });
        // ... 実装
    }
}

// CLIでの使用
class CLI {
    constructor() {
        this.logger = new Logger('cli');
    }
}
```

## 環境変数

Loggerは以下の環境変数を参照します：
- `LOG_DIR`: デフォルトログディレクトリ
- `LOG_LEVEL`: デフォルトログレベル（debug、info、warn、error）

## トラブルシューティング

### よくある問題

1. **権限エラー**: ログディレクトリへの書き込み権限を確認
2. **ディスク容量**: ログローテーションでディスク使用量を監視
3. **パフォーマンス**: 本番環境では適切なログレベルを使用

### デバッグ情報
詳細な操作情報を見るためにデバッグレベルログを有効にする：
```bash
LOG_LEVEL=debug node app.js
```

## 次のステップ

Logger実装は完了し、以下との統合準備が整いました：
1. ConfigManager（次の実装段階）
2. MinecraftServerManager
3. OwnServerManager  
4. CloudFlareManager
5. CLIインターフェース

---

**実装状況**: ✅ 完了・本番運用可能  
**最終更新**: 2025年6月12日  
**バージョン**: 1.0.0
