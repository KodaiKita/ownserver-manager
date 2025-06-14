# 🔐 OwnServer Manager セキュリティポリシー

**最終更新**: 2025年6月14日  
**適用範囲**: 全開発者・運用担当者・外部協力者

## 🚨 機密情報取り扱いルール（厳守事項）

### 📵 **絶対禁止事項**

#### 1. 機密情報の直接コピー・貼り付け
- APIキー、トークン、パスワード、秘密鍵等の機密情報を**チャット、メール、Slack、GitHub Issue等に直接貼り付けることを絶対に禁止**
- スクリーンショット、ログファイル、エラーメッセージでの機密情報露出も厳禁

#### 2. ハードコーディングの禁止
```javascript
❌ 禁止例:
const API_TOKEN = 'abc123def456...';  // 絶対禁止
const config = {
    cloudflare: {
        apiKey: 'real_api_key_here'    // 絶対禁止
    }
};

✅ 正しい例:
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const config = {
    cloudflare: {
        apiKey: process.env.CLOUDFLARE_API_TOKEN
    }
};
```

#### 3. 本番認証情報の開発利用禁止
- 本番環境用の認証情報を開発・テスト環境で使用することを禁止
- 開発時は専用のテスト用アカウント・トークンを使用

### 🔐 **必須遵守事項**

#### 1. 環境変数による管理
```bash
# .env ファイルでの管理（Git管理対象外）
CLOUDFLARE_API_TOKEN=actual_token_here
CLOUDFLARE_ZONE_ID=actual_zone_id_here

# コードでの読み取り
const token = process.env.CLOUDFLARE_API_TOKEN;
```

#### 2. 本番環境での高度なセキュリティ
```yaml
# Docker Secrets使用例
version: '3.8'
services:
  app:
    secrets:
      - cloudflare_token
    environment:
      - CLOUDFLARE_API_TOKEN_FILE=/run/secrets/cloudflare_token

secrets:
  cloudflare_token:
    external: true
```

#### 3. 定期的なローテーション
- APIトークン: 3-6ヶ月ごと
- パスワード: 1-3ヶ月ごと
- 緊急時は即座に更新

### 🧪 **開発・テスト時のルール**

#### 1. 一時的なテスト用認証情報
```bash
# テスト用トークンの例（短期間のみ有効）
CLOUDFLARE_API_TOKEN=test_token_expires_in_1hour
TEST_MODE=true
```

#### 2. テスト完了後の即座無効化
- 実験・テスト完了後は即座にテスト用トークンを削除
- CloudFlareダッシュボードで使用状況を定期確認

### 📝 **ドキュメント・コード記述ルール**

#### 1. プレースホルダーの使用
```bash
✅ 正しい例示:
CLOUDFLARE_API_TOKEN=YOUR_CLOUDFLARE_API_TOKEN
CLOUDFLARE_ZONE_ID=your-zone-id-here

❌ 禁止例:
CLOUDFLARE_API_TOKEN=c7Q0Zk7P...  # 実際の値は絶対記述禁止
```

#### 2. コメント・ドキュメントでの配慮
```javascript
// ✅ 良い例
// CloudFlare APIトークンを環境変数から取得
const token = process.env.CLOUDFLARE_API_TOKEN;

// ❌ 悪い例
// APIトークン: c7Q0Zk7P... を使用  // 実際の値を記述するのは禁止
```

## 🛡️ **アクセス制御**

### 1. 最小権限の原則
- 必要最小限の権限のみを付与
- 定期的な権限レビューの実施

### 2. IP制限・地理的制限
```javascript
// CloudFlare APIトークン設定例
{
  "permissions": {
    "Zone": "Zone:Read",
    "DNS": "DNS:Edit"
  },
  "zone_resources": {
    "include": ["specific_zone_id"]
  },
  "ip_address_filtering": {
    "include": ["your.server.ip.address/32"]
  }
}
```

## 🔍 **監査・監視**

### 1. ログ監視
- API使用ログの定期確認
- 異常アクセスパターンの検出

### 2. 定期セキュリティレビュー
- 月次: 認証情報の棚卸し
- 四半期: セキュリティポリシーの見直し

## 🚨 **インシデント対応**

### 1. 機密情報漏洩時の対応手順
1. **即座の無効化**: 漏洩した認証情報の即座無効化
2. **新規生成**: 新しい認証情報の生成
3. **影響調査**: 漏洩範囲・期間の調査
4. **対策実施**: 再発防止策の実施
5. **報告書作成**: インシデント報告書の作成（非公開）

### 2. 緊急連絡体制
- セキュリティインシデント発見時の即座報告
- 24時間以内の初期対応完了

## 📋 **チェックリスト**

### 開発前チェック
- [ ] .envファイルの設定確認
- [ ] 機密情報がハードコーディングされていないか確認
- [ ] テスト用認証情報の準備

### コミット前チェック
- [ ] 機密情報が含まれていないか確認
- [ ] .envファイルがGit管理対象外になっているか確認
- [ ] ログにトークンが出力されていないか確認

### リリース前チェック
- [ ] 本番用認証情報の設定
- [ ] 不要なテスト用認証情報の削除
- [ ] セキュリティスキャンの実施

## 🚨 **リリース・ドキュメント作成時の特別ルール**

### 📝 **GitHub リリース作成時の厳格ルール**

#### 絶対禁止事項
- ❌ **リリースノートに機密情報を含めること**
- ❌ **セキュリティインシデント報告を公開リリースに含めること**
- ❌ **実際の設定値・認証情報の例示**
- ❌ **実際のドメイン名・IPアドレス・ホスト名の記載**

#### 必須事項  
- ✅ **リリース前のセキュリティチェックリスト実行**
- ✅ **プレースホルダーのみの使用**
- ✅ **複数人によるレビュー実施**
- ✅ **機密情報検索スクリプトの実行**

### 🔍 **ドキュメント作成時のチェック体制**

```bash
# リリース前必須実行コマンド
./scripts/security-scan-docs.sh
./scripts/check-sensitive-data.sh
```

#### ダブルチェック体制
1. **作成者**: 初回セキュリティチェック
2. **レビュアー**: 独立したセキュリティレビュー  
3. **承認者**: 最終承認前チェック

## 📚 **参考資料**

- [CloudFlare API セキュリティベストプラクティス](https://developers.cloudflare.com/fundamentals/api/get-started/security/)
- [OWASP セキュリティガイドライン](https://owasp.org/)
- [Node.js セキュリティベストプラクティス](https://nodejs.org/en/docs/guides/security/)

---

**⚠️ このポリシーは法的拘束力を持ちます。違反した場合は、プロジェクトからの除名や法的措置を含む厳格な対応を行います。**
