# ConfigManager実装ガイド（日本語版）

## 概要

ConfigManagerは、ownserver-managerアプリケーション用の包括的な設定管理システムです。設定の読み込み、検証、ホットリロード、キャッシュ、複数エクスポート形式などの高度な機能を提供します。

## 機能一覧

### コア機能（フェーズ1）
- ✅ **設定読み込み**: JSONファイル読み込みと自動ディレクトリ作成
- ✅ **環境変数統合**: 設定可能なプレフィックスによる自動オーバーライド
- ✅ **デフォルト設定**: デフォルト設定ファイルの自動作成
- ✅ **ドット記法アクセス**: ネストした設定値への簡単アクセス

### 検証機能（フェーズ2）
- ✅ **スキーマ検証**: JSONスキーマベースの設定検証
- ✅ **型チェック**: すべての設定値の自動型検証
- ✅ **カスタム検証**: カスタム検証関数のサポート
- ✅ **エラー報告**: 包括的な検証エラーメッセージ

### 動的機能（フェーズ3）
- ✅ **ファイル監視**: 自動ファイル変更検出
- ✅ **ホットリロード**: 再起動なしでのライブ設定更新
- ✅ **設定バックアップ**: 設定可能な保持期間での自動バックアップシステム
- ✅ **イベントシステム**: すべての設定変更に対するEventEmitterベースの通知

### 高度な機能（フェーズ4）
- ✅ **パフォーマンスキャッシュ**: 設定可能なTTLによるMapベースキャッシュ
- ✅ **複数エクスポート形式**: JSON、YAML、ENV、サマリーエクスポート
- ✅ **設定プリセット**: 事前定義された設定テンプレート
- ✅ **パフォーマンスメトリクス**: 包括的なパフォーマンスと使用状況メトリクス
- ✅ **ミドルウェアサポート**: 設定可能なミドルウェアパイプライン
- ✅ **メモリ最適化**: 自動メモリ使用量追跡と最適化

## クイックスタート

### 基本的な使用方法（同期）

```javascript
const ConfigManager = require('./src/utils/ConfigManager');

// 設定を同期的に作成・読み込み
const config = new ConfigManager('/app/config/config.json');
config.load();

// 設定値にアクセス
const port = config.get('minecraft.port', 25565);
const domain = config.get('cloudflare.domain');

// 設定を変更
config.set('minecraft.port', 25566);
await config.save();
```

### 高度な使用方法（非同期）

```javascript
const ConfigManager = require('./src/utils/ConfigManager');

// 高度なオプションで作成
const config = await ConfigManager.create('/app/config/config.json', {
    envPrefix: 'APP_',
    validateConfig: true,
    watchFile: true,
    enableCaching: true,
    enableMetrics: true,
    backupConfig: true,
    maxBackups: 10
});

// 設定変更をリスニング
config.on('config-changed', (event) => {
    console.log(`設定変更: ${event.key} = ${event.newValue}`);
});

config.on('config-reloaded', (event) => {
    console.log('設定がホットリロードされました:', event.timestamp);
});

// キャッシュ付きの設定アクセス
const port = config.get('minecraft.port');
const hasCloudflare = config.has('cloudflare.domain');
const allConfig = config.getAll();
```

## 設定スキーマ

ConfigManagerは以下のスキーマに対して設定を検証します：

```json
{
    "minecraft": {
        "serverDirectory": "/app/minecraft-servers/survival",
        "port": 25565,
        "javaArgs": ["-Xmx2G", "-Xms1G"],
        "autoRestart": true,
        "restartDelay": 5000
    },
    "ownserver": {
        "binaryPath": "/app/bin/ownserver",
        "autoRestart": true,
        "restartDelay": 3000
    },
    "cloudflare": {
        "domain": "play.cspd.net",
        "ttl": 60
    },
    "healthcheck": {
        "enabled": true,
        "interval": 30000,
        "timeout": 5000,
        "retries": 3,
        "actions": ["restart_ownserver", "restart_minecraft"]
    },
    "logging": {
        "level": "info",
        "maxFileSize": "10MB",
        "maxFiles": 5,
        "compress": true
    }
}
```

## 環境変数サポート

ConfigManagerは設定可能なプレフィックス（デフォルト: `APP_`）を使用して環境変数のオーバーライドを自動的に適用します：

```bash
# Minecraftポートをオーバーライド
APP_MINECRAFT_PORT=25566

# CloudFlareドメインをオーバーライド
APP_CLOUDFLARE_DOMAIN=play.example.com

# ログレベルをオーバーライド
APP_LOGGING_LEVEL=debug

# ドット記法をアンダースコアに変換してネストした値をオーバーライド
APP_HEALTHCHECK_ENABLED=false
```

## 設定オプション

```javascript
const options = {
    envPrefix: 'APP_',                // 環境変数プレフィックス
    createIfMissing: true,            // 欠落している場合にデフォルト設定を作成
    validateConfig: true,             // スキーマ検証を有効化
    schema: null,                     // カスタム検証スキーマ
    watchFile: true,                  // ファイル監視を有効化
    hotReload: true,                  // ホットリロードを有効化
    backupConfig: true,               // 設定バックアップを有効化
    maxBackups: 5,                    // 最大バックアップ数
    enableCaching: true,              // パフォーマンスキャッシュを有効化
    cacheMaxAge: 60000,               // キャッシュTTL（ミリ秒）
    enableMetrics: true,              // パフォーマンスメトリクスを有効化
    middleware: [],                   // ミドルウェア関数
    presets: {}                       // 設定プリセット
};
```

## APIリファレンス

### コアメソッド

#### `ConfigManager.create(configPath, options)`
- **型**: 静的非同期メソッド
- **説明**: ConfigManagerを非同期で作成・初期化
- **戻り値**: Promise<ConfigManager>

#### `constructor(configPath, options)`
- **型**: コンストラクタ
- **説明**: ConfigManagerインスタンスを作成（手動初期化が必要）

#### `initialize()`
- **型**: 非同期メソッド
- **説明**: 設定の読み込み、検証、ファイル監視を初期化
- **戻り値**: Promise<ConfigManager>

#### `load()`
- **型**: 同期メソッド
- **説明**: 設定を同期的に読み込み（後方互換性）

### 設定アクセス

#### `get(keyPath, defaultValue)`
- **型**: メソッド
- **説明**: ドット記法を使用して設定値を取得
- **パラメータ**: 
  - `keyPath` (string): ドット記法パス（例: 'minecraft.port'）
  - `defaultValue` (any): キーが見つからない場合のデフォルト値
- **戻り値**: 設定値またはデフォルト値

#### `set(keyPath, value)`
- **型**: メソッド
- **説明**: ドット記法を使用して設定値を設定
- **パラメータ**:
  - `keyPath` (string): ドット記法パス
  - `value` (any): 設定する値

#### `has(keyPath)`
- **型**: メソッド
- **説明**: 設定キーが存在するかチェック
- **パラメータ**: `keyPath` (string): ドット記法パス
- **戻り値**: boolean

#### `getAll()`
- **型**: メソッド
- **説明**: 完全な設定オブジェクトを取得
- **戻り値**: Object（設定のコピー）

### 設定管理

#### `save()`
- **型**: 非同期メソッド
- **説明**: 設定をファイルに保存
- **戻り値**: Promise<void>

#### `exportConfig(format)`
- **型**: メソッド
- **説明**: 指定した形式で設定をエクスポート
- **パラメータ**: `format` (string): 'json'、'yaml'、'env'、'summary'
- **戻り値**: string

#### `applyPreset(presetName)`
- **型**: メソッド
- **説明**: 設定プリセットを適用
- **パラメータ**: `presetName` (string): 適用するプリセット名

### バックアップと復元

#### `backupConfiguration()`
- **型**: メソッド
- **説明**: 設定バックアップを作成
- **戻り値**: void

#### `restoreFromBackup(index)`
- **型**: メソッド
- **説明**: バックアップから設定を復元
- **パラメータ**: `index` (number): バックアップインデックス（0 = 最新）
- **戻り値**: Object（バックアップ情報）

#### `getBackups()`
- **型**: メソッド
- **説明**: 利用可能なバックアップリストを取得
- **戻り値**: Array<Object>

### パフォーマンスとメトリクス

#### `getMetrics()`
- **型**: メソッド
- **説明**: パフォーマンスメトリクスを取得
- **戻り値**: Object（メトリクスデータ）

#### `getCacheStats()`
- **型**: メソッド
- **説明**: キャッシュ統計を取得
- **戻り値**: Object（キャッシュ統計）

#### `clearCache()`
- **型**: メソッド
- **説明**: パフォーマンスキャッシュをクリア
- **戻り値**: void

### ライフサイクル管理

#### `destroy()`
- **型**: メソッド
- **説明**: リソースをクリーンアップし、ファイル監視を停止
- **戻り値**: void

## イベントシステム

ConfigManagerはEventEmitterを拡張し、以下のイベントを発行します：

### 設定イベント
- **`initialized`**: 設定が正常に初期化されたときに発行
- **`loaded`**: 設定が読み込まれたときに発行
- **`config-changed`**: 設定値が変更されたときに発行
- **`config-reloaded`**: 設定がホットリロードされたときに発行
- **`config-saved`**: 設定が保存されたときに発行
- **`config-backed-up`**: 設定バックアップが作成されたときに発行
- **`config-restored`**: 設定がバックアップから復元されたときに発行

### 検証イベント
- **`validation-passed`**: 設定検証が成功したときに発行
- **`validation-failed`**: 設定検証が失敗したときに発行

### システムイベント
- **`watching-started`**: ファイル監視が開始されたときに発行
- **`watching-stopped`**: ファイル監視が停止されたときに発行
- **`error`**: エラーが発生したときに発行
- **`reload-error`**: ホットリロードが失敗したときに発行

### イベント使用例

```javascript
config.on('config-changed', (event) => {
    console.log(`変更: ${event.key} が ${event.oldValue} から ${event.newValue} に`);
});

config.on('validation-failed', (event) => {
    console.error('検証エラー:', event.errors);
});

config.on('config-reloaded', (event) => {
    console.log('設定が再読み込みされました:', event.timestamp);
});
```

## パフォーマンス機能

### キャッシュシステム
- **Mapベースキャッシュ**: 高性能なキー・バリューキャッシュ
- **設定可能TTL**: 自動キャッシュ有効期限
- **キャッシュ統計**: ヒット率とパフォーマンスメトリクス
- **自動無効化**: 設定変更時にキャッシュをクリア

### メモリ最適化
- **メモリ使用量追跡**: リアルタイムメモリ使用量監視
- **オブジェクトクリーンアップ**: undefined値の自動削除
- **リソース管理**: ウォッチャーとリスナーの適切なクリーンアップ

### メトリクス追跡
- **読み込み時間**: 設定読み込みパフォーマンス
- **検証時間**: スキーマ検証パフォーマンス
- **更新回数**: 設定更新の回数
- **エラー回数**: 発生したエラーの回数
- **キャッシュパフォーマンス**: ヒット率とキャッシュ効率

## 検証システム

### スキーマベース検証
ConfigManagerはJSONスキーマライクな検証システムを使用します：

```javascript
const schema = {
    type: 'object',
    properties: {
        minecraft: {
            type: 'object',
            properties: {
                port: { 
                    type: 'number', 
                    minimum: 1, 
                    maximum: 65535 
                },
                serverDirectory: { 
                    type: 'string', 
                    minLength: 1 
                }
            },
            required: ['port', 'serverDirectory']
        }
    }
};
```

### カスタム検証関数
ミドルウェアを通じてカスタム検証ロジックを追加：

```javascript
const config = await ConfigManager.create(configPath, {
    middleware: [
        async (phase, data, configManager) => {
            if (phase === 'initialize') {
                // カスタム検証ロジック
                const port = configManager.get('minecraft.port');
                if (port < 1024) {
                    throw new Error('Minecraftポートは1024以上である必要があります');
                }
            }
        }
    ]
});
```

## ファイル監視とホットリロード

### 自動ファイル監視
- **ファイル変更検出**: 設定ファイルの変更を監視
- **自動リロード**: ファイル変更時に設定を再読み込み
- **リロード時検証**: 再読み込み後に設定を検証
- **リロード前バックアップ**: 変更適用前にバックアップを作成
- **エラーハンドリング**: リロードエラーの適切な処理

### ホットリロードプロセス
1. ファイル変更検出
2. 設定バックアップ作成
3. ファイルから設定を再読み込み
4. 環境変数オーバーライドを適用
5. 設定を検証
6. キャッシュをクリア
7. ミドルウェアを適用
8. リロードイベントを発行

## エクスポート形式

### JSONエクスポート
```javascript
const jsonConfig = config.exportConfig('json');
// フォーマットされたJSON文字列を返す
```

### YAMLエクスポート
```javascript
const yamlConfig = config.exportConfig('yaml');
// YAML形式の文字列を返す
```

### 環境変数エクスポート
```javascript
const envConfig = config.exportConfig('env');
// 環境変数形式を返す
// APP_MINECRAFT_PORT=25565
// APP_CLOUDFLARE_DOMAIN=play.cspd.net
```

### サマリーエクスポート
```javascript
const summary = config.exportConfig('summary');
// メトリクス付きの設定サマリーを返す
```

## 統合例

### Express.js統合
```javascript
const express = require('express');
const ConfigManager = require('./src/utils/ConfigManager');

const app = express();
let config;

async function startServer() {
    // 設定を初期化
    config = await ConfigManager.create('./config/config.json', {
        watchFile: true,
        enableMetrics: true
    });
    
    // 設定変更時にサーバーを更新
    config.on('config-reloaded', () => {
        console.log('設定が更新されました、変更を適用しています...');
        // 設定変更を適用
    });
    
    const port = config.get('server.port', 3000);
    app.listen(port, () => {
        console.log(`サーバーがポート${port}で開始されました`);
    });
}

startServer().catch(console.error);
```

### Docker統合
```dockerfile
# 設定オーバーライド用環境変数
ENV APP_MINECRAFT_PORT=25565
ENV APP_CLOUDFLARE_DOMAIN=play.example.com
ENV APP_LOGGING_LEVEL=info

# 設定ディレクトリをマウント
VOLUME ["/app/config"]
```

## トラブルシューティング

### よくある問題

#### 設定が読み込まれない
```bash
# ファイル権限を確認
ls -la /app/config/config.json

# ディレクトリ権限を確認
ls -la /app/config/

# JSON構文を確認
node -e "console.log(JSON.parse(require('fs').readFileSync('/app/config/config.json', 'utf8')))"
```

#### 検証エラー
```javascript
// 詳細な検証ログを有効化
const config = await ConfigManager.create(configPath, {
    validateConfig: true
});

config.on('validation-failed', (event) => {
    console.error('検証エラー:', event.errors);
    console.error('エラー詳細:', event.error.message);
});
```

#### 環境変数の問題
```javascript
// 環境変数読み込みをデバッグ
console.log('環境変数:', Object.keys(process.env).filter(key => key.startsWith('APP_')));

// パースされた値を確認
config.on('env-overrides-applied', (overrides) => {
    console.log('適用されたオーバーライド:', overrides);
});
```

### パフォーマンス最適化

#### キャッシュを有効化
```javascript
const config = await ConfigManager.create(configPath, {
    enableCaching: true,
    cacheMaxAge: 300000 // 5分
});

// キャッシュパフォーマンスを監視
setInterval(() => {
    const stats = config.getCacheStats();
    console.log('キャッシュヒット率:', stats.hitRate);
}, 60000);
```

#### ファイル監視を最適化
```javascript
const config = await ConfigManager.create(configPath, {
    watchFile: true,
    hotReload: true
});

// 本番環境で不要な場合はファイル監視を無効化
if (process.env.NODE_ENV === 'production') {
    config.stopFileWatching();
}
```

## テスト

### 単体テスト例
```javascript
const ConfigManager = require('./src/utils/ConfigManager');
const fs = require('fs');
const path = require('path');

describe('ConfigManager', () => {
    let config;
    const testConfigPath = './test/config.json';
    
    beforeEach(async () => {
        config = await ConfigManager.create(testConfigPath, {
            createIfMissing: true,
            validateConfig: true
        });
    });
    
    afterEach(() => {
        config.destroy();
        if (fs.existsSync(testConfigPath)) {
            fs.unlinkSync(testConfigPath);
        }
    });
    
    test('デフォルト設定を読み込むべき', () => {
        expect(config.get('minecraft.port')).toBe(25565);
        expect(config.has('cloudflare.domain')).toBe(true);
    });
    
    test('設定値を設定・取得すべき', () => {
        config.set('test.value', 'hello');
        expect(config.get('test.value')).toBe('hello');
    });
    
    test('設定を検証すべき', () => {
        expect(() => {
            config.set('minecraft.port', 'invalid');
        }).not.toThrow(); // setは検証しない、saveが検証する
    });
});
```

## ベストプラクティス

### 1. 本番環境では非同期初期化を使用
```javascript
// 推奨
const config = await ConfigManager.create(configPath, options);

// レガシーコード用の代替
const config = new ConfigManager(configPath, options);
config.load();
```

### 2. 本番環境で検証を有効化
```javascript
const config = await ConfigManager.create(configPath, {
    validateConfig: true,
    schema: customSchema // 必要に応じてカスタムスキーマを使用
});
```

### 3. 機密情報には環境変数を使用
```bash
# 設定ファイルに機密情報を保存しない
export APP_CLOUDFLARE_API_TOKEN=your_secret_token
export APP_DATABASE_PASSWORD=your_db_password
```

### 4. パフォーマンスを監視
```javascript
// 定期的なメトリクス監視
setInterval(() => {
    const metrics = config.getMetrics();
    console.log('設定メトリクス:', {
        loadTime: metrics.loadTime,
        cacheHitRate: metrics.cacheStats.hitRate,
        memoryUsage: `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB`
    });
}, 300000); // 5分毎
```

### 5. 設定エラーを適切に処理
```javascript
config.on('error', (error) => {
    console.error('設定エラー:', error.message);
    // フォールバックロジックを実装
});

config.on('reload-error', (error) => {
    console.error('設定リロードに失敗:', error.message);
    // 現在の設定で継続
});
```

## 移行ガイド

### レガシーConfigManagerから
新しいConfigManagerは後方互換性がありますが、最適なパフォーマンスのために：

```javascript
// 古い方法
const config = new ConfigManager();
config.load();

// 新しい方法（推奨）
const config = await ConfigManager.create(configPath, {
    validateConfig: true,
    enableCaching: true,
    watchFile: true
});
```

### 設定スキーマの更新
設定スキーマを更新する場合：

1. スキーマ定義を更新
2. 既存の設定ファイルでテスト
3. 必要に応じて移行ミドルウェアを提供
4. ドキュメントを更新

## 結論

ConfigManagerは、モダンなNode.jsアプリケーション向けの堅牢で機能豊富な設定管理ソリューションを提供します。同期・非同期操作の両方をサポートし、包括的な検証、パフォーマンス最適化、リアルタイム設定更新機能を備えています。

追加サポートや機能リクエストについては、プロジェクトドキュメントを参照するか、プロジェクトリポジトリでissueを作成してください。
