# EULAManager 実装ガイド

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Date**: 2025年6月12日

## 🎯 概要

EULAManagerは、MinecraftサーバーのEnd User License Agreement（EULA）の自動管理を提供するユーティリティクラスです。ユーザーの明示的な同意に基づいて、eula.txtファイルの作成・更新を自動化し、法的準拠を確保します。

## ⚖️ 法的考慮事項

### Minecraft EULA要件
Minecraftサーバーを運用するには、[Minecraft EULA](https://aka.ms/MinecraftEULA)への同意が法的に必要です。

### 安全な実装方針
- **明示的ユーザー同意**: 設定ファイルでの明確な同意確認
- **透明性**: EULA URLの明示
- **ログ記録**: 同意プロセスの完全な記録
- **検証可能性**: EULA状態の確認機能

## 🔧 主要機能

### 1. ユーザー同意確認
設定ファイルからユーザーの明示的なEULA同意を確認

### 2. EULAファイル管理
eula.txtファイルの自動作成・更新・検証

### 3. 準拠性チェック
サーバー起動前のEULA準拠状態確認

### 4. 詳細ログ記録
EULA処理の完全な監査ログ

## 🏗️ アーキテクチャ

### クラス設計

```javascript
class EULAManager {
    constructor(logger)
    
    // ユーザー同意確認
    hasUserConsentedToEULA(config)
    
    // EULA ファイル管理
    createEULAFile(serverDirectory, agreed = true)
    checkEULAStatus(serverDirectory)
    
    // 準拠性確保
    ensureEULACompliance(serverDirectory, config)
    
    // 情報取得
    getEULAInfo(serverDirectory)
}
```

### データフロー

```
1. 設定確認     → hasUserConsentedToEULA()
2. EULA状態確認 → checkEULAStatus()
3. ファイル作成 → createEULAFile()
4. 準拠性確保   → ensureEULACompliance()
5. 検証完了     → サーバー起動許可
```

## 📋 設定形式

### 必要な設定項目

```json
{
  "minecraft": {
    "eula": {
      "agreed": true,
      "userConsent": true,
      "note": "By setting this to true, you indicate your agreement to Minecraft EULA (https://aka.ms/MinecraftEULA)"
    }
  }
}
```

### 設定項目説明

| 項目 | 型 | 必須 | 説明 |
|------|----|----|------|
| `agreed` | boolean | ✅ | EULA同意フラグ |
| `userConsent` | boolean | ✅ | ユーザー明示的同意 |
| `note` | string | - | EULA URLと説明 |

## 🔍 使用方法

### 基本的な使用例

```javascript
const EULAManager = require('./EULAManager');
const Logger = require('./Logger');

// 初期化
const logger = new Logger('eula-manager');
const eulaManager = new EULAManager(logger);

// ユーザー同意確認
const config = {
    minecraft: {
        eula: {
            agreed: true,
            userConsent: true
        }
    }
};

if (eulaManager.hasUserConsentedToEULA(config)) {
    console.log('✅ User has consented to EULA');
    
    // EULA ファイル作成
    await eulaManager.createEULAFile('/path/to/server', true);
    
    // 状態確認
    const isAgreed = await eulaManager.checkEULAStatus('/path/to/server');
    console.log('EULA Status:', isAgreed); // true
    
    // 情報取得
    const eulaInfo = await eulaManager.getEULAInfo('/path/to/server');
    console.log(eulaInfo);
    // {
    //   eulaPath: '/path/to/server/eula.txt',
    //   exists: true,
    //   agreed: true,
    //   url: 'https://aka.ms/MinecraftEULA'
    // }
}
```

### MinecraftServerManagerとの統合

```javascript
class MinecraftServerManager {
    async _handleEULA() {
        try {
            // EULA準拠確保
            await this.eulaManager.ensureEULACompliance(
                this.serverDirectory, 
                this.config
            );
            
            this.logger.info('EULA compliance verified', {
                serverDirectory: this.serverDirectory
            });
        } catch (error) {
            this.logger.error('EULA compliance failed', {
                error: error.message,
                serverDirectory: this.serverDirectory
            });
            throw error;
        }
    }
}
```

## 📝 生成されるEULAファイル

### eula.txt内容例

```
# By changing the setting below to TRUE you are indicating your agreement to our EULA (https://aka.ms/MinecraftEULA).
# You also agree that tacos are tasty, and the best food in the world.
# 2025-06-12T05:40:22.362Z
eula=true
```

### ファイル特徴
- **公式形式**: Minecraft公式形式に準拠
- **タイムスタンプ**: 作成日時の記録
- **EULA URL**: 公式EULAへのリンク
- **明確な同意**: `eula=true`設定

## 🔒 セキュリティ機能

### 厳格な同意確認

```javascript
hasUserConsentedToEULA(config) {
    return config.minecraft?.eula?.agreed === true && 
           config.minecraft?.eula?.userConsent === true;
}
```

### エラーハンドリング

```javascript
async ensureEULACompliance(serverDirectory, config) {
    // 1. ユーザー同意確認
    if (!this.hasUserConsentedToEULA(config)) {
        throw new Error(
            'Minecraft EULA consent required. Please set minecraft.eula.agreed=true and minecraft.eula.userConsent=true in configuration to indicate your agreement to Minecraft EULA (https://aka.ms/MinecraftEULA)'
        );
    }
    
    // 2. 現在の状態確認
    const currentStatus = await this.checkEULAStatus(serverDirectory);
    
    // 3. 必要に応じてファイル作成
    if (!currentStatus) {
        await this.createEULAFile(serverDirectory, true);
        this.logger.info('EULA automatically agreed based on user configuration', {
            serverDirectory,
            userConsent: config.minecraft.eula.userConsent
        });
    }
    
    return true;
}
```

## 🧪 テスト例

### 単体テスト

```javascript
describe('EULAManager', () => {
    let eulaManager;
    let mockLogger;
    
    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn()
        };
        eulaManager = new EULAManager(mockLogger);
    });
    
    test('should detect user consent correctly', () => {
        const config = {
            minecraft: {
                eula: {
                    agreed: true,
                    userConsent: true
                }
            }
        };
        
        const hasConsent = eulaManager.hasUserConsentedToEULA(config);
        expect(hasConsent).toBe(true);
    });
    
    test('should reject incomplete consent', () => {
        const config = {
            minecraft: {
                eula: {
                    agreed: true
                    // userConsent missing
                }
            }
        };
        
        const hasConsent = eulaManager.hasUserConsentedToEULA(config);
        expect(hasConsent).toBe(false);
    });
});
```

### 実践テスト結果

```
✅ EULA同意確認    → 設定読み込み成功
✅ eula.txt作成   → 自動ファイル生成
✅ EULA状態検証   → 準拠確認完了
✅ サーバー起動   → EULA処理成功
```

## 📊 ログ出力例

### 成功時のログ

```
[INFO] EULA file created/updated {
  "serverDirectory": "/path/to/minecraft-server",
  "agreed": true,
  "eulaPath": "/path/to/minecraft-server/eula.txt"
}

[INFO] EULA automatically agreed based on user configuration {
  "serverDirectory": "/path/to/minecraft-server", 
  "userConsent": true
}
```

### エラー時のログ

```
[ERROR] EULA compliance failed {
  "error": "Minecraft EULA consent required. Please set minecraft.eula.agreed=true...",
  "serverDirectory": "/path/to/minecraft-server"
}
```

## ⚠️ エラーパターン

### 1. 同意不足

```javascript
// 設定不備
{
  "minecraft": {
    "eula": {
      "agreed": false  // ❌ 同意なし
    }
  }
}

// エラー: Minecraft EULA consent required
```

### 2. 設定不完全

```javascript
// userConsent欠如
{
  "minecraft": {
    "eula": {
      "agreed": true
      // "userConsent": true  ❌ 欠如
    }
  }
}

// エラー: Minecraft EULA consent required
```

### 3. ファイルシステムエラー

```javascript
// 権限不足・ディスク容量等
await eulaManager.createEULAFile('/readonly/path');
// Error: ENOENT: permission denied
```

## 🔧 カスタマイズ

### EULA テンプレート変更

```javascript
async createEULAFile(serverDirectory, agreed = true) {
    const eulaPath = path.join(serverDirectory, 'eula.txt');
    const timestamp = new Date().toISOString();
    
    // カスタムテンプレート
    const eulaContent = `# Custom EULA template
# Organization: Your Organization
# Agreement Date: ${timestamp}
# Official EULA: https://aka.ms/MinecraftEULA
eula=${agreed ? 'true' : 'false'}
`;
    
    await fs.writeFile(eulaPath, eulaContent, 'utf8');
}
```

### 追加検証機能

```javascript
async validateEULACompliance(serverDirectory) {
    const eulaInfo = await this.getEULAInfo(serverDirectory);
    
    // 追加チェック
    const checks = {
        fileExists: eulaInfo.exists,
        agreementStatus: eulaInfo.agreed,
        fileAge: this.checkEULAAge(eulaInfo.eulaPath),
        contentValid: this.validateEULAContent(eulaInfo.eulaPath)
    };
    
    return checks;
}
```

## 🔮 拡張計画

### Phase2以降での拡張予定

1. **EULA版本管理**: EULA更新の自動検出
2. **組織的同意**: チーム・組織レベルの同意管理
3. **監査ログ**: 詳細な同意履歴記録
4. **自動更新**: EULA変更時の自動対応

### API拡張案

```javascript
// 将来的なAPI拡張例
eulaManager.trackEULAHistory(serverDirectory);
eulaManager.validateOrganizationalConsent(orgConfig);
eulaManager.checkEULAUpdates();
eulaManager.generateComplianceReport();
```

## ✅ ベストプラクティス

### 1. 明示的な同意確認

```javascript
// ✅ 良い例
const config = {
    minecraft: {
        eula: {
            agreed: true,
            userConsent: true,
            note: "I have read and agree to the Minecraft EULA"
        }
    }
};

// ❌ 悪い例 - 曖昧な同意
const config = {
    acceptTerms: true  // 何の規約か不明
};
```

### 2. エラーハンドリング

```javascript
// ✅ 良い例
try {
    await eulaManager.ensureEULACompliance(serverDir, config);
} catch (error) {
    logger.error('EULA compliance failed', {
        error: error.message,
        serverDirectory: serverDir,
        action: 'server_start_blocked'
    });
    throw error; // 再スロー
}

// ❌ 悪い例 - エラー無視
try {
    await eulaManager.ensureEULACompliance(serverDir, config);
} catch (error) {
    // エラーを無視 - 危険！
}
```

### 3. ログ記録

```javascript
// ✅ 良い例 - 詳細なログ
this.logger.info('EULA compliance verified', {
    serverDirectory,
    userConsent: config.minecraft.eula.userConsent,
    timestamp: new Date().toISOString(),
    eulaUrl: 'https://aka.ms/MinecraftEULA'
});
```

## 📚 参考資料

### 公式ドキュメント
- [Minecraft EULA](https://aka.ms/MinecraftEULA)
- [Minecraft Server Setup Guide](https://minecraft.fandom.com/wiki/Tutorials/Setting_up_a_server)

### 法的リソース
- Minecraft商用利用ガイドライン
- サーバー運営者向け法的注意事項

### 実装参考
- MinecraftServerManager_Phase1.js
- 実践テスト結果
- コミュニティベストプラクティス

---

**作成**: 2025年6月12日  
**更新**: EULAManager v1.0.0  
**法的注意**: 本ドキュメントは技術実装ガイドであり、法的助言ではありません
