# JavaVersionManager 実装ガイド

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Date**: 2025年6月12日

## 🎯 概要

JavaVersionManagerは、Minecraftサーバーの自動Java環境管理を提供するユーティリティクラスです。Minecraft版本とサーバータイプに基づいて適切なJava版本を自動検出し、必要に応じてJavaランタイムを自動ダウンロード・インストールします。

## 🔧 主要機能

### 1. Minecraft版本検出
JARファイル名から自動的にMinecraft版本とサーバータイプを検出

### 2. Java要件判定
Minecraft版本とサーバータイプに基づいて最適なJava版本を推奨

### 3. Java自動ダウンロード
Eclipse TemurinからJavaランタイムを自動取得・インストール

### 4. 互換性チェック
Java版本とMinecraft版本の互換性を検証

## 📋 対応環境

### Java版本
- **Java 8**: Minecraft 1.8-1.16
- **Java 11**: 推奨（Paper等）
- **Java 17**: Minecraft 1.17-1.20.4  
- **Java 21**: Minecraft 1.20.5+

### サーバータイプ
- **Vanilla**: 公式Minecraftサーバー
- **Spigot**: CraftBukkit系列
- **Paper**: 高性能Spigot派生
- **Forge**: MOD対応サーバー

### プラットフォーム
- **Linux x64**: 完全対応
- **その他**: 拡張可能

## 🏗️ アーキテクチャ

### データ構造

```javascript
const JAVA_VERSION_MAP = {
    minecraft: {
        // Minecraft版本範囲 -> Java要件
        '1.20.5-latest': { 
            java: '21', 
            min: 21, 
            max: 21, 
            recommended: '21' 
        }
    },
    server_software: {
        // サーバー別要件
        paper: {
            '1.20+': { 
                java: '21', 
                min: 21, 
                max: 21, 
                recommended: '21' 
            }
        }
    },
    download_urls: {
        // Java自動ダウンロードURL
        '21': {
            linux_x64: 'https://github.com/adoptium/...',
            checksum: 'sha256:...'
        }
    }
};
```

### メソッド概要

| メソッド | 用途 | 戻り値 |
|---------|------|--------|
| `detectMinecraftVersionFromJar()` | JAR解析 | Minecraft版本 |
| `detectServerTypeFromJar()` | サーバータイプ判定 | サーバータイプ |
| `getRecommendedJavaVersion()` | Java推奨 | Java要件オブジェクト |
| `getJavaDownloadInfo()` | ダウンロード情報 | URL・チェックサム |

## 🔍 使用方法

### 基本的な使用例

```javascript
const JavaVersionManager = require('./JavaVersionManager');

// 1. JAR解析
const version = JavaVersionManager.detectMinecraftVersionFromJar('paper-1.21.5-113.jar');
const serverType = JavaVersionManager.detectServerTypeFromJar('paper-1.21.5-113.jar');

console.log(version);    // '1.21.5'
console.log(serverType); // 'paper'

// 2. Java要件取得
const recommendation = JavaVersionManager.getRecommendedJavaVersion(version, serverType);

console.log(recommendation);
// {
//   version: '21',
//   requirements: {
//     java: '21',
//     min: 21,
//     max: 21,
//     recommended: '21'
//   }
// }

// 3. ダウンロード情報取得
const downloadInfo = JavaVersionManager.getJavaDownloadInfo('21');

console.log(downloadInfo);
// {
//   linux_x64: 'https://github.com/adoptium/...',
//   checksum: 'sha256:...'
// }
```

### 高度な使用例

```javascript
// MinecraftServerManagerとの統合
class MinecraftServerManager {
    async _detectRequiredJavaVersion() {
        // JARファイルから版本検出
        const detectedVersion = JavaVersionManager.detectMinecraftVersionFromJar(
            this.config.serverJar
        );
        const serverType = JavaVersionManager.detectServerTypeFromJar(
            this.config.serverJar
        );
        
        // Java要件取得
        const javaRecommendation = JavaVersionManager.getRecommendedJavaVersion(
            detectedVersion,
            serverType
        );
        
        this.logger.info('Detected Minecraft version and server type', {
            minecraftVersion: detectedVersion,
            serverType: serverType,
            recommendedJava: javaRecommendation.version,
            serverJar: this.config.serverJar
        });
        
        return javaRecommendation.version;
    }
}
```

## 📝 パターンマッチング

### JAR名パターン

JavaVersionManagerは以下のパターンでJARファイルを解析します：

```javascript
const patterns = [
    /paper-(\d+\.\d+(?:\.\d+)?)/i,           // paper-1.18.2-388.jar
    /spigot-(\d+\.\d+(?:\.\d+)?)/i,          // spigot-1.18.2.jar
    /craftbukkit-(\d+\.\d+(?:\.\d+)?)/i,     // craftbukkit-1.18.2.jar
    /server-(\d+\.\d+(?:\.\d+)?)/i,          // server-1.18.2.jar
    /minecraft_server\.(\d+\.\d+(?:\.\d+)?)/i, // minecraft_server.1.18.2.jar
    /(\d+\.\d+(?:\.\d+)?)/                   // fallback: any version pattern
];
```

### サーバータイプ検出

```javascript
function detectServerTypeFromJar(jarFilename) {
    const filename = jarFilename.toLowerCase();
    
    if (filename.includes('paper')) return 'paper';
    if (filename.includes('spigot')) return 'spigot';
    if (filename.includes('forge')) return 'forge';
    if (filename.includes('craftbukkit')) return 'spigot';
    
    return 'vanilla';
}
```

## 🧪 テスト例

### 単体テスト

```javascript
describe('JavaVersionManager', () => {
    test('should detect Minecraft version from Paper JAR', () => {
        const version = JavaVersionManager.detectMinecraftVersionFromJar('paper-1.21.5-113.jar');
        expect(version).toBe('1.21.5');
    });
    
    test('should detect server type from JAR name', () => {
        const serverType = JavaVersionManager.detectServerTypeFromJar('paper-1.21.5-113.jar');
        expect(serverType).toBe('paper');
    });
    
    test('should recommend correct Java version', () => {
        const recommendation = JavaVersionManager.getRecommendedJavaVersion('1.21.5', 'paper');
        expect(recommendation.version).toBe('21');
        expect(recommendation.requirements.min).toBe(21);
        expect(recommendation.requirements.max).toBe(21);
    });
});
```

### 実践テスト結果

```
✅ paper-1.8.8-445.jar   → Minecraft 1.8.8  → Java 8  ✓
✅ paper-1.18.2-388.jar  → Minecraft 1.18.2 → Java 17 ✓  
✅ paper-1.21.5-113.jar  → Minecraft 1.21.5 → Java 21 ✓
```

## ⚙️ 設定とカスタマイズ

### Java版本マップの拡張

新しいMinecraft版本やサーバータイプをサポートする場合：

```javascript
// JAVA_VERSION_MAP に新しいエントリを追加
const JAVA_VERSION_MAP = {
    minecraft: {
        // 新しい版本範囲を追加
        '1.22.0-latest': { java: '22', min: 22, max: 22 }
    },
    server_software: {
        // 新しいサーバータイプを追加
        fabric: {
            '1.20+': { java: '21', min: 21, max: 21 }
        }
    }
};
```

### ダウンロードURL管理

```javascript
download_urls: {
    '22': {
        linux_x64: 'https://github.com/adoptium/temurin22-binaries/...',
        checksum: 'sha256:新しいチェックサム'
    }
}
```

## 🔒 セキュリティ考慮事項

### チェックサム検証
- **SHA256**: 全ダウンロードファイルのチェックサム検証
- **HTTPS**: 安全な通信プロトコル使用
- **公式ソース**: Eclipse Temurin公式リリースのみ使用

### エラーハンドリング
```javascript
// 安全なダウンロード処理
try {
    const downloadInfo = getJavaDownloadInfo(javaVersion);
    if (!downloadInfo) {
        throw new Error(`Java version ${javaVersion} not supported`);
    }
    // ダウンロード実行...
} catch (error) {
    this.logger.error('Java download failed', { error: error.message });
    throw error;
}
```

## 📊 パフォーマンス

### 実行時間
- **版本検出**: <1ms (正規表現マッチング)
- **要件判定**: <1ms (マップ参照)
- **ダウンロード**: 5-30秒 (ネットワーク依存)

### メモリ使用量
- **静的データ**: ~10KB (JAVA_VERSION_MAP)
- **実行時**: ~1MB (一時的)

## 🔮 拡張計画

### Phase2以降での拡張予定
1. **多プラットフォーム対応**: Windows, macOS
2. **カスタムJava版本**: ユーザー独自ビルド
3. **版本自動更新**: 最新版本の自動チェック
4. **パフォーマンス最適化**: 並列ダウンロード

### API拡張
```javascript
// 将来的なAPI拡張例
JavaVersionManager.getLatestJavaVersion(minecraftVersion);
JavaVersionManager.validateJavaInstallation(javaPath);
JavaVersionManager.optimizeJavaArgs(serverSpecs);
```

## 🐛 既知の制限

### 現在の制限事項
1. **Linux x64のみ**: 他プラットフォーム未対応
2. **静的マッピング**: 動的版本情報取得なし
3. **手動更新**: 新版本は手動でマップ更新必要

### 回避方法
```javascript
// プラットフォーム検出の例
const platform = process.platform;
const arch = process.arch;

if (platform !== 'linux' || arch !== 'x64') {
    this.logger.warn('Platform not fully supported', { platform, arch });
    // システムJavaへフォールバック
}
```

## 📚 参考資料

### 公式ドキュメント
- [Minecraft Wiki - Java Edition requirements](https://minecraft.fandom.com/wiki/Java_Edition)
- [Eclipse Temurin Downloads](https://adoptium.net/temurin/releases/)
- [Paper MC System Requirements](https://docs.papermc.io/paper/getting-started)

### 実装参考
- MinecraftServerManager_Phase1.js
- 実践テスト結果
- コミュニティベストプラクティス

---

**作成**: 2025年6月12日  
**更新**: JavaVersionManager v1.0.0  
**ステータス**: 本番運用可能
