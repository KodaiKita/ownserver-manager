# MinecraftServerManager 実装ガイド

## 概要

MinecraftServerManagerコンポーネントは、ownserver-managerプロジェクト内でMinecraftサーバーの包括的な管理機能を提供します。この実装は段階的開発アプローチに従い、機能の段階的開発により信頼性と保守性の高いコードを確保しています。

## 現在のステータス: フェーズ1完了 ✅

### フェーズ1: 基本プロセス管理
**ステータス**: ✅ **完了・本番運用可能**

#### 実装済み機能
- ✅ **Java自動ダウンロード・管理**: 必要なJavaバージョンの自動検出・インストール
- ✅ **Minecraftサーバープロセス制御**: 適切なプロセス管理による起動・停止機能
- ✅ **基本ログ統合**: 既存Loggerシステムとの完全統合
- ✅ **シンプルなエラーハンドリング**: 堅牢なエラーハンドリング・回復メカニズム
- ✅ **プロセス状態監視**: リアルタイムサーバー状態追跡

#### 利用可能なコアメソッド
```javascript
// コンストラクタ
new MinecraftServerManager(serverDirectory, config)

// プロセス管理
await manager.start()                    // Minecraftサーバー起動
await manager.stop(force)               // サーバー停止（グレースフル/強制）
manager.isServerRunning()               // サーバー状態確認

// Java管理
await manager.downloadJava(version)     // 特定Javaバージョンダウンロード
await manager.validateJavaInstallation(javaPath) // Javaインストール検証
```

#### 設定オプション
```javascript
{
    javaVersion: 'auto',        // 'auto', '8', '11', '17', '21'
    javaArgs: ['-Xmx2G', '-Xms1G'],  // JVM引数
    serverJar: 'server.jar',    // サーバーJARファイル名
    autoDownloadJava: true,     // Java自動ダウンロード有効化
    retryAttempts: 3,           // エラー再試行回数
    retryDelay: 5000           // 再試行間隔（ミリ秒）
}
```

#### 発火イベント
- `started` - サーバー正常起動
- `stopped` - サーバー停止
- `error` - エラー発生
- `exit` - プロセス終了
- `log` - ログデータ受信

## Javaバージョン管理

### Java自動検出
システムは以下に基づいて必要なJavaバージョンを自動判定します：
- Minecraftバージョン検出（将来拡張）
- サーバータイプ（Vanilla, Spigot, Paper, Forge）
- 明示的設定

### サポートJavaバージョン
- **Java 8**: レガシーMinecraftバージョン（1.0-1.16）
- **Java 11**: パフォーマンス強化された中間バージョン
- **Java 17**: モダンMinecraftバージョン（1.17-1.20.4）
- **Java 21**: 最新Minecraftバージョン（1.20.5+）

### ダウンロードソース
Javaインストールは信頼性とセキュリティのためEclipse Temurin（AdoptOpenJDK）からダウンロードされます。

## 使用例

### 基本サーバー管理
```javascript
const MinecraftServerManager = require('./src/managers/MinecraftServerManager');

// マネージャー初期化
const manager = new MinecraftServerManager('/path/to/minecraft/server', {
    javaVersion: '17',
    javaArgs: ['-Xmx4G', '-Xms2G']
});

// イベントハンドラー
manager.on('started', (data) => {
    console.log(`サーバー起動完了 PID: ${data.pid}`);
});

manager.on('log', (data) => {
    console.log(`[${data.type}] ${data.data}`);
});

manager.on('error', (error) => {
    console.error('サーバーエラー:', error.message);
});

// サーバー起動
try {
    await manager.start();
    console.log('サーバーが稼働中です！');
} catch (error) {
    console.error('サーバー起動失敗:', error.message);
}

// サーバー停止
await manager.stop(); // グレースフル停止
// await manager.stop(true); // 強制停止
```

### 高度な設定
```javascript
const manager = new MinecraftServerManager('/minecraft-servers/survival', {
    javaVersion: 'auto',              // サーバーベース自動検出
    javaArgs: [
        '-Xmx8G',                     // 最大ヒープサイズ
        '-Xms4G',                     // 初期ヒープサイズ
        '-XX:+UseG1GC',               // G1ガベージコレクター使用
        '-XX:+UnlockExperimentalVMOptions',
        '-XX:MaxGCPauseMillis=200',   // GC最適化
        '-XX:+DisableExplicitGC'      // 明示的GC呼び出し無効化
    ],
    serverJar: 'paper-1.20.1.jar',   // Paperサーバー
    autoDownloadJava: true,           // 自動ダウンロード有効
    retryAttempts: 5,                 // 再試行回数増加
    retryDelay: 10000                 // 10秒再試行間隔
});
```

## アーキテクチャ

### コンポーネント構造
```
MinecraftServerManager (フェーズ1)
├── Javaバージョン管理
│   ├── バージョン検出
│   ├── 自動ダウンロード
│   └── インストール検証
├── プロセス管理
│   ├── サーバー起動・停止
│   ├── プロセス監視
│   └── 状態追跡
├── ログ統合
│   ├── stdout/stderr取得
│   ├── Logger統合
│   └── イベント発火
└── エラーハンドリング
    ├── 再試行ロジック
    ├── クリーンアップ手順
    └── エラー報告
```

### 依存関係
- **内部**: Logger, ConfigManager, JavaVersionManager
- **外部**: Node.js組み込み（child_process, fs, events）、tarパッケージ

## テスト

### テストカバレッジ
- ✅ コンストラクタ・設定検証
- ✅ 環境検証（ディレクトリ、JARファイル存在確認）
- ✅ Java管理（発見、ダウンロード、検証）
- ✅ サーバー状態管理
- ✅ イベント発火・ハンドリング
- ✅ ユーティリティ関数・エラーハンドリング

### テスト実行
```bash
# 全Minecraftテスト
npm run test:minecraft

# フェーズ1特定テスト
npm run test:phase1

# Javaバージョンマネージャーテスト
npm run test:java
```

## インストール要件

### システム要件
- Node.js 18+
- Linux x64環境（Java自動ダウンロード用）
- Javaランタイム・Minecraftサーバー用の十分なディスク容量

### 依存関係インストール
```bash
npm install commander tar mocha
```

## ファイル構造
```
src/
├── managers/
│   └── MinecraftServerManager.js          # メインマネージャー（フェーズ1）
├── utils/
│   ├── JavaVersionManager.js              # Javaバージョン管理
│   └── development-phases/
│       ├── MinecraftServerManager_Phase1.js   # フェーズ1実装
│       └── MinecraftServerManager_Phases.js   # フェーズ定義
tests/
└── minecraft/
    ├── MinecraftServerManager_Phase1.test.js  # フェーズ1テスト
    └── JavaVersionManager.test.js             # Javaマネージャーテスト
```

## 将来の開発ロードマップ

### フェーズ2: サーバー監視・制御（予定）
- ログ解析・パース
- コンソールコマンド送信
- プレイヤー参加・離脱検出
- 自動再起動機能

### フェーズ3: ownserver連携（予定）
- 起動順序制御
- エンドポイント取得・管理
- server.properties自動更新
- ネットワーク状態監視

### フェーズ4: 高度機能（予定）
- 高度設定管理
- パフォーマンス監視
- バックアップ・復元機能
- セキュリティ機能

## トラブルシューティング

### よくある問題

#### Javaダウンロード失敗
```bash
# インターネット接続確認
curl -I https://github.com/adoptium/

# ダウンロードディレクトリ権限確認
ls -la java-runtimes/
```

#### サーバー起動失敗
```bash
# server.jar存在・有効性確認
file minecraft-servers/survival/server.jar

# Javaインストール確認
/path/to/java/bin/java -version

# ログ確認
tail -f logs/minecraft.log
```

#### 権限問題
```bash
# ディレクトリ権限修正
chmod -R 755 minecraft-servers/
chmod +x java-runtimes/*/bin/java
```

## パフォーマンス考慮事項

### メモリ管理
- デフォルトJVM引数は保守的（最大ヒープ2GB）
- サーバー要件に基づき`-Xmx`と`-Xms`を調整
- 4GB以上RAMの場合はG1GCを使用

### プロセス監視
- サーバー状態をリアルタイム追跡
- プロセス終了コードを取得・ログ記録
- 自動クリーンアップによりリソースリーク防止

## セキュリティノート

- Java ダウンロードは信頼できるEclipse Temurinソースから
- ダウンロードファイルのチェックサム検証（拡張予定）
- 適切なchild_process管理によるプロセス分離
- 機密データ露出防止のためのログサニタイズ

## コントリビューション

MinecraftServerManagerへのコントリビューション時は：

1. 段階的開発アプローチに従う
2. フェーズ1 APIとの後方互換性を維持
3. 新機能に対する包括的テストを追加
4. API変更時はドキュメントを更新
5. 既存のコードスタイル・パターンに従う

## API リファレンス

### コンストラクタ
```javascript
new MinecraftServerManager(serverDirectory, config)
```
- `serverDirectory`: Minecraftサーバーディレクトリの絶対パス
- `config`: 設定オブジェクト（オプション）

### メソッド
- `start()`: Minecraftサーバー起動
- `stop(force)`: サーバー停止（グレースフル/強制）
- `isServerRunning()`: サーバー稼働状況確認
- `downloadJava(version)`: 特定Javaバージョンダウンロード
- `validateJavaInstallation(javaPath)`: Javaインストール検証

### イベント
- `started`: サーバー正常起動
- `stopped`: サーバー停止
- `error`: エラー発生
- `exit`: プロセス終了
- `log`: ログデータ受信

---

**実装ステータス**: フェーズ1完了 ✅  
**次フェーズ**: フェーズ2開発  
**メンテナー**: ownserver-manager開発チーム
