/**
 * CloudFlareManager テスト
 * Node.js assert を使用したCloudFlareManagerの単体テスト
 */

const assert = require('assert');
const { EventEmitter } = require('events');
const CloudFlareManager = require('../../src/utils/development-phases/CloudFlareManager');
const { setupTestEnvironment, teardownTestEnvironment, MockLogger } = require('../helpers/testSetup');

describe('CloudFlareManager Tests', function() {
    let testEnv;
    let cloudFlareManager;
    let mockLogger;
    let testConfig;
    
    before(async function() {
        testEnv = await setupTestEnvironment();
        mockLogger = new MockLogger();
        
        testConfig = {
            cloudflare: {
                apiToken: 'test-api-token',
                zoneId: 'test-zone-id',
                domain: 'example.com',
                ttl: 60,
                proxied: false,
                retryAttempts: 1, // テスト用に短縮
                retryDelay: 100
            }
        };
    });
    
    after(async function() {
        if (cloudFlareManager) {
            await cloudFlareManager.cleanup();
        }
        await teardownTestEnvironment(testEnv);
    });
    
    beforeEach(function() {
        mockLogger.clear();
    });
    
    afterEach(async function() {
        if (cloudFlareManager) {
            await cloudFlareManager.cleanup();
        }
    });
    
    describe('基本機能テスト', function() {
        it('CloudFlareManagerが正しく初期化される', function() {
            cloudFlareManager = new CloudFlareManager(testConfig, mockLogger);
            
            assert.ok(cloudFlareManager instanceof EventEmitter, 'EventEmitterを継承している');
            assert.strictEqual(cloudFlareManager.apiToken, testConfig.cloudflare.apiToken, 'APIトークンが設定されている');
            assert.strictEqual(cloudFlareManager.zoneId, testConfig.cloudflare.zoneId, 'ゾーンIDが設定されている');
            assert.strictEqual(cloudFlareManager.domain, testConfig.cloudflare.domain, 'ドメインが設定されている');
            assert.strictEqual(cloudFlareManager.defaultTtl, testConfig.cloudflare.ttl, 'デフォルトTTLが設定されている');
            assert.strictEqual(cloudFlareManager.defaultProxied, testConfig.cloudflare.proxied, 'デフォルトプロキシ設定が設定されている');
        });
        
        it('必須設定不足でエラーになる', function() {
            const incompleteConfig = {
                cloudflare: {
                    apiToken: 'test-token'
                    // zoneIdとdomainが不足
                }
            };
            
            assert.throws(() => {
                new CloudFlareManager(incompleteConfig, mockLogger);
            }, /CloudFlare configuration incomplete/, '設定不足でエラーが発生');
        });
        
        it('管理中レコードの初期状態', function() {
            cloudFlareManager = new CloudFlareManager(testConfig, mockLogger);
            
            const managedRecords = cloudFlareManager.getManagedRecords();
            assert.ok(Array.isArray(managedRecords), '管理レコードが配列');
            assert.strictEqual(managedRecords.length, 0, '初期状態では空');
        });
    });
    
    describe('DNS レコード操作テスト (モック)', function() {
        beforeEach(function() {
            // APIリクエストをモック化
            cloudFlareManager = new CloudFlareManager(testConfig, mockLogger);
            
            // _apiRequestメソッドをモック化
            cloudFlareManager._originalApiRequest = cloudFlareManager._apiRequest;
            cloudFlareManager._mockResponses = new Map();
            
            cloudFlareManager._apiRequest = async function(method, path, data) {
                const key = `${method}:${path}`;
                
                if (this._mockResponses.has(key)) {
                    const response = this._mockResponses.get(key);
                    if (response.error) {
                        throw new Error(response.error);
                    }
                    return response;
                }
                
                // デフォルトの成功レスポンス
                if (method === 'GET' && path.includes('/dns_records?name=')) {
                    return { success: true, result: [] }; // レコードなし
                } else if (method === 'POST' && path.includes('/dns_records')) {
                    return { 
                        success: true, 
                        result: { 
                            id: 'new-record-id', 
                            name: data.name, 
                            content: data.content 
                        } 
                    };
                } else if (method === 'PUT' && path.includes('/dns_records/')) {
                    return { 
                        success: true, 
                        result: { 
                            id: 'updated-record-id', 
                            name: data.name, 
                            content: data.content 
                        } 
                    };
                } else if (method === 'DELETE' && path.includes('/dns_records/')) {
                    return { success: true, result: { id: 'deleted-record-id' } };
                } else if (method === 'GET' && path.includes('/dns_records')) {
                    return { success: true, result: [] };
                }
                
                throw new Error(`Unexpected API call: ${method} ${path}`);
            };
        });
        
        it('新規レコードの作成', async function() {
            this.timeout(5000);
            
            // DNS伝播待機を無効化（テスト用）
            cloudFlareManager._waitForDnsPropagation = async () => true;
            
            const result = await cloudFlareManager.updateRecord('test', '192.168.1.1', 'A');
            
            assert.strictEqual(result.success, true, 'レコード作成が成功');
            assert.strictEqual(result.name, 'test.example.com', 'レコード名が正しい');
            assert.strictEqual(result.target, '192.168.1.1', 'ターゲットが正しい');
            assert.strictEqual(result.type, 'A', 'レコードタイプが正しい');
            
            // 管理レコードに追加されている
            const managedRecords = cloudFlareManager.getManagedRecords();
            assert.strictEqual(managedRecords.length, 1, '管理レコードが1つ');
            assert.strictEqual(managedRecords[0].name, 'test.example.com', '管理レコード名が正しい');
        });
        
        it('既存レコードの更新', async function() {
            this.timeout(5000);
            
            // DNS伝播待機を無効化（テスト用）
            cloudFlareManager._waitForDnsPropagation = async () => true;
            
            // 既存レコードがあることをモック
            cloudFlareManager._mockResponses.set('GET:/zones/test-zone-id/dns_records?name=test.example.com&type=A', {
                success: true,
                result: [{ id: 'existing-record-id', name: 'test.example.com', content: '192.168.1.1' }]
            });
            
            const result = await cloudFlareManager.updateRecord('test', '192.168.1.2', 'A');
            
            assert.strictEqual(result.success, true, 'レコード更新が成功');
            assert.strictEqual(result.target, '192.168.1.2', '新しいターゲットが設定されている');
        });
        
        it('レコードの削除', async function() {
            this.timeout(5000);
            
            // 削除対象レコードがあることをモック
            cloudFlareManager._mockResponses.set('GET:/zones/test-zone-id/dns_records?name=test.example.com&type=A', {
                success: true,
                result: [{ id: 'delete-record-id', name: 'test.example.com', content: '192.168.1.1' }]
            });
            
            const result = await cloudFlareManager.deleteRecord('test', 'A');
            
            assert.strictEqual(result.success, true, 'レコード削除が成功');
            assert.strictEqual(result.name, 'test.example.com', 'レコード名が正しい');
        });
        
        it('存在しないレコードの削除', async function() {
            this.timeout(5000);
            
            // レコードが存在しないことをモック
            cloudFlareManager._mockResponses.set('GET:/zones/test-zone-id/dns_records?name=nonexistent.example.com&type=A', {
                success: true,
                result: []
            });
            
            const result = await cloudFlareManager.deleteRecord('nonexistent', 'A');
            
            assert.strictEqual(result.success, true, '存在しないレコードの削除は成功');
            assert.ok(result.message.includes('not found'), '適切なメッセージが返される');
        });
    });
    
    describe('DNS解決テスト', function() {
        beforeEach(function() {
            cloudFlareManager = new CloudFlareManager(testConfig, mockLogger);
        });
        
        it('DNS解決の確認 (実際のドメイン)', async function() {
            this.timeout(10000);
            
            // localhost.localdomain で実際のDNS解決をテスト（より安全）
            const testDomain = 'localhost';
            const testConfig = {
                cloudflare: {
                    apiToken: 'test-token',
                    zoneId: 'test-zone',
                    domain: 'localdomain',
                    ttl: 60,
                    proxied: false
                }
            };
            
            const testManager = new CloudFlareManager(testConfig, mockLogger);
            
            const result = await testManager.verifyRecord(testDomain, '127.0.0.1'); // localhostの実際のIP
            
            // 実際のDNS解決結果を確認
            assert.ok(typeof result.success === 'boolean', 'DNS解決結果が返される');
            
            if (!result.success) {
                assert.ok(result.error, 'エラーメッセージが含まれている');
            } else {
                assert.ok(Array.isArray(result.resolved), '解決されたIPアドレス配列');
            }
            
            await testManager.cleanup();
        });
        
        it('DNS解決の失敗処理', async function() {
            this.timeout(5000);
            
            const result = await cloudFlareManager.verifyRecord('nonexistent-test-domain-12345', '1.2.3.4');
            
            assert.strictEqual(result.success, false, 'DNS解決が失敗');
            assert.ok(result.error, 'エラーメッセージが含まれている');
        });
    });
    
    describe('エラーハンドリングテスト', function() {
        beforeEach(function() {
            cloudFlareManager = new CloudFlareManager(testConfig, mockLogger);
            
            // エラーレスポンスをモック
            cloudFlareManager._originalApiRequest = cloudFlareManager._apiRequest;
            cloudFlareManager._apiRequest = async function(method, path, data) {
                throw new Error('API request failed');
            };
        });
        
        it('APIエラー時のレコード作成失敗', async function() {
            this.timeout(5000);
            
            const result = await cloudFlareManager.updateRecord('test', '192.168.1.1', 'A');
            
            assert.strictEqual(result.success, false, 'API エラーで失敗');
            assert.ok(result.error, 'エラーメッセージが含まれている');
            assert.ok(result.error.includes('API request failed'), '適切なエラーメッセージ');
        });
        
        it('APIエラー時のレコード削除失敗', async function() {
            this.timeout(5000);
            
            const result = await cloudFlareManager.deleteRecord('test', 'A');
            
            assert.strictEqual(result.success, false, 'API エラーで失敗');
            assert.ok(result.error, 'エラーメッセージが含まれている');
        });
    });
    
    describe('イベント発行テスト', function() {
        beforeEach(function() {
            cloudFlareManager = new CloudFlareManager(testConfig, mockLogger);
            
            // 成功レスポンスをモック
            cloudFlareManager._originalApiRequest = cloudFlareManager._apiRequest;
            cloudFlareManager._apiRequest = async function(method, path, data) {
                if (method === 'GET' && path.includes('/dns_records?name=')) {
                    return { success: true, result: [] };
                } else if (method === 'POST' && path.includes('/dns_records')) {
                    return { 
                        success: true, 
                        result: { 
                            id: 'new-record-id', 
                            name: data.name, 
                            content: data.content 
                        } 
                    };
                }
                throw new Error('Unexpected API call');
            };
        });
        
        it('dns-record-updated イベントの発行', function(done) {
            this.timeout(5000);
            
            cloudFlareManager.once('dns-record-updated', (data) => {
                try {
                    assert.strictEqual(data.name, 'test.example.com', 'レコード名が正しい');
                    assert.strictEqual(data.target, '192.168.1.1', 'ターゲットが正しい');
                    assert.strictEqual(data.type, 'A', 'レコードタイプが正しい');
                    assert.ok(data.id, 'レコードIDが含まれている');
                    done();
                } catch (error) {
                    done(error);
                }
            });
            
            cloudFlareManager.updateRecord('test', '192.168.1.1', 'A').catch(done);
        });
        
        it('dns-error イベントの発行', function(done) {
            this.timeout(5000);
            
            // エラーレスポンスに変更
            cloudFlareManager._apiRequest = async function() {
                throw new Error('Test API error');
            };
            
            cloudFlareManager.once('dns-error', (data) => {
                try {
                    assert.strictEqual(data.operation, 'update', '操作が正しい');
                    assert.strictEqual(data.subdomain, 'test', 'サブドメインが正しい');
                    assert.strictEqual(data.target, '192.168.1.1', 'ターゲットが正しい');
                    assert.ok(data.error, 'エラーメッセージが含まれている');
                    done();
                } catch (error) {
                    done(error);
                }
            });
            
            cloudFlareManager.updateRecord('test', '192.168.1.1', 'A').catch(() => {
                // エラーは期待されるので無視
            });
        });
    });
    
    describe('設定テスト', function() {
        it('カスタム設定の適用', function() {
            const customConfig = {
                cloudflare: {
                    apiToken: 'custom-token',
                    zoneId: 'custom-zone',
                    domain: 'custom.domain',
                    ttl: 300,
                    proxied: true,
                    retryAttempts: 5,
                    retryDelay: 2000
                }
            };
            
            const customManager = new CloudFlareManager(customConfig, mockLogger);
            
            assert.strictEqual(customManager.apiToken, 'custom-token', 'カスタムAPIトークン');
            assert.strictEqual(customManager.zoneId, 'custom-zone', 'カスタムゾーンID');
            assert.strictEqual(customManager.domain, 'custom.domain', 'カスタムドメイン');
            assert.strictEqual(customManager.defaultTtl, 300, 'カスタムTTL');
            assert.strictEqual(customManager.defaultProxied, true, 'カスタムプロキシ設定');
            assert.strictEqual(customManager.retryAttempts, 5, 'カスタムリトライ回数');
            assert.strictEqual(customManager.retryDelay, 2000, 'カスタムリトライ遅延');
            
            customManager.cleanup();
        });
        
        it('デフォルト設定の確認', function() {
            const minimalConfig = {
                cloudflare: {
                    apiToken: 'token',
                    zoneId: 'zone',
                    domain: 'domain.com'
                }
            };
            
            const defaultManager = new CloudFlareManager(minimalConfig, mockLogger);
            
            assert.strictEqual(defaultManager.defaultTtl, 60, 'デフォルトTTL');
            assert.strictEqual(defaultManager.defaultProxied, false, 'デフォルトプロキシ設定');
            assert.strictEqual(defaultManager.retryAttempts, 3, 'デフォルトリトライ回数');
            assert.strictEqual(defaultManager.retryDelay, 1000, 'デフォルトリトライ遅延');
            
            defaultManager.cleanup();
        });
    });
    
    describe('クリーンアップテスト', function() {
        it('クリーンアップ処理', async function() {
            cloudFlareManager = new CloudFlareManager(testConfig, mockLogger);
            
            // イベントリスナー追加
            const testListener = () => {};
            cloudFlareManager.on('dns-record-updated', testListener);
            
            assert.strictEqual(cloudFlareManager.listenerCount('dns-record-updated'), 1, 'イベントリスナーが追加されている');
            
            // クリーンアップ実行
            await cloudFlareManager.cleanup();
            
            // イベントリスナーがクリアされている
            assert.strictEqual(cloudFlareManager.listenerCount('dns-record-updated'), 0, 'イベントリスナーがクリア');
        });
    });
});
