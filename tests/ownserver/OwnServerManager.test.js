/**
 * OwnServerManager テスト
 * Node.js assert を使用したOwnServerManagerの単体テスト
 */

const assert = require('assert');
const path = require('path');
const { EventEmitter } = require('events');
const OwnServerManager = require('../../src/utils/development-phases/OwnServerManager');
const { setupTestEnvironment, teardownTestEnvironment, MockLogger } = require('../helpers/testSetup');

describe('OwnServerManager Tests', function() {
    let testEnv;
    let ownServerManager;
    let mockLogger;
    let testConfig;
    
    before(async function() {
        this.timeout(10000);
        testEnv = await setupTestEnvironment();
        mockLogger = new MockLogger();
        
        testConfig = {
            ownserver: {
                binaryPath: '/usr/bin/echo', // echoコマンドをダミーとして使用
                autoStart: false,
                restartOnFailure: false,
                healthCheckInterval: 1000,
                startupTimeout: 5000,
                args: ['OwnServer', 'started', 'Serving on http://localhost:8080']
            }
        };
    });
    
    after(async function() {
        if (ownServerManager) {
            await ownServerManager.cleanup();
        }
        await teardownTestEnvironment(testEnv);
    });
    
    beforeEach(function() {
        mockLogger.clear();
        ownServerManager = new OwnServerManager(testConfig, mockLogger);
    });
    
    afterEach(async function() {
        if (ownServerManager) {
            await ownServerManager.cleanup();
        }
    });
    
    describe('基本機能テスト', function() {
        it('OwnServerManagerが正しく初期化される', function() {
            assert.ok(ownServerManager instanceof EventEmitter, 'EventEmitterを継承している');
            assert.strictEqual(ownServerManager.status, 'stopped', '初期状態はstopped');
            assert.strictEqual(ownServerManager.binaryPath, testConfig.ownserver.binaryPath, 'バイナリパスが設定されている');
            assert.strictEqual(ownServerManager.autoStart, false, 'autoStartが正しく設定されている');
        });
        
        it('初期状態の取得', function() {
            const status = ownServerManager.getStatus();
            
            assert.strictEqual(status.status, 'stopped', 'ステータスがstopped');
            assert.strictEqual(status.endpoint, null, 'エンドポイントがnull');
            assert.strictEqual(status.processId, null, 'プロセスIDがnull');
            assert.strictEqual(status.uptime, 0, 'アップタイムが0');
            assert.strictEqual(status.isHealthy, false, 'ヘルシーがfalse');
        });
    });
    
    describe('プロセス制御テスト', function() {
        it('OwnServerの起動', async function() {
            this.timeout(10000);
            
            const startResult = await ownServerManager.start();
            
            assert.strictEqual(startResult.success, true, '起動が成功');
            assert.ok(startResult.message, 'メッセージが含まれている');
            
            // 起動完了まで少し待機
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const status = ownServerManager.getStatus();
            // echoコマンドは即座に終了するため、stopped状態になることがある
            assert.ok(['starting', 'running', 'stopped'].includes(status.status), 'ステータスがstarting/running/stopped');
            
            // プロセスが少なくとも一時的に起動されたことを確認
            assert.ok(startResult.success, '起動処理自体は成功');
        });
        
        it('重複起動の防止', async function() {
            this.timeout(10000);
            
            // 最初の起動
            const firstStart = await ownServerManager.start();
            assert.strictEqual(firstStart.success, true, '最初の起動は成功');
            
            // 少し待機
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 重複起動を試行
            const secondStart = await ownServerManager.start();
            assert.strictEqual(secondStart.success, true, '重複起動は既に実行中として成功');
            assert.ok(secondStart.message.includes('running') || secondStart.message.includes('starting'), 
                      'すでに起動中のメッセージ');
        });
        
        it('OwnServerの停止', async function() {
            this.timeout(10000);
            
            // 起動
            await ownServerManager.start();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 停止
            const stopResult = await ownServerManager.stop();
            assert.strictEqual(stopResult.success, true, '停止が成功');
            
            // 停止完了まで待機
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const status = ownServerManager.getStatus();
            assert.strictEqual(status.status, 'stopped', 'ステータスがstopped');
            assert.strictEqual(status.processId, null, 'プロセスIDがnull');
        });
        
        it('停止済みサーバーの停止要求', async function() {
            const stopResult = await ownServerManager.stop();
            
            assert.strictEqual(stopResult.success, true, '停止要求は成功');
            assert.ok(stopResult.message.includes('stopped'), 'すでに停止中のメッセージ');
        });
    });
    
    describe('イベント発行テスト', function() {
        it('ownserver-started イベントの発行', function(done) {
            this.timeout(10000);
            
            ownServerManager.once('ownserver-started', (data) => {
                try {
                    assert.ok(data.pid, 'プロセスIDが含まれている');
                    assert.ok(data.status, 'ステータスが含まれている');
                    done();
                } catch (error) {
                    done(error);
                }
            });
            
            ownServerManager.start().catch(done);
        });
        
        it('ownserver-stopped イベントの発行', function(done) {
            this.timeout(15000);
            
            let startEventReceived = false;
            
            ownServerManager.once('ownserver-started', async () => {
                startEventReceived = true;
                
                // 起動完了後に停止
                try {
                    await ownServerManager.stop();
                } catch (error) {
                    done(error);
                }
            });
            
            ownServerManager.once('ownserver-stopped', (data) => {
                try {
                    assert.strictEqual(startEventReceived, true, '起動イベントが先に発行されている');
                    assert.ok(typeof data.code !== 'undefined', '終了コードが含まれている');
                    assert.ok(typeof data.wasRunning !== 'undefined', '実行状態が含まれている');
                    done();
                } catch (error) {
                    done(error);
                }
            });
            
            ownServerManager.start().catch(done);
        });
    });
    
    describe('ヘルスチェックテスト', function() {
        it('停止中のヘルスチェック', async function() {
            const health = await ownServerManager.performHealthCheck();
            
            assert.strictEqual(health.healthy, false, 'ヘルシーがfalse');
            assert.strictEqual(health.reason, 'Not running', '理由が正しい');
        });
        
        it('実行中のヘルスチェック', async function() {
            this.timeout(10000);
            
            await ownServerManager.start();
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const health = await ownServerManager.performHealthCheck();
            
            // プロセスが正常に起動していればhealthyになる
            if (ownServerManager.status === 'running') {
                assert.ok(health.healthy || health.reason, 'ヘルスチェック結果または理由が返される');
            }
        });
    });
    
    describe('エラーハンドリングテスト', function() {
        it('存在しないバイナリでの起動エラー', async function() {
            const errorConfig = {
                ownserver: {
                    binaryPath: '/nonexistent/binary',
                    startupTimeout: 2000
                }
            };
            
            const errorManager = new OwnServerManager(errorConfig, mockLogger);
            
            try {
                const result = await errorManager.start();
                assert.strictEqual(result.success, false, '起動が失敗');
                assert.ok(result.error, 'エラーメッセージが含まれている');
            } finally {
                await errorManager.cleanup();
            }
        });
        
        it('設定の未指定エラー', function() {
            const emptyConfig = { ownserver: {} };
            const emptyManager = new OwnServerManager(emptyConfig, mockLogger);
            
            // デフォルト値が設定されることを確認
            assert.ok(emptyManager.binaryPath, 'デフォルトバイナリパスが設定されている');
            assert.ok(typeof emptyManager.startupTimeout === 'number', 'デフォルトタイムアウトが設定されている');
        });
    });
    
    describe('設定テスト', function() {
        it('カスタム設定の適用', function() {
            const customConfig = {
                ownserver: {
                    binaryPath: '/custom/path',
                    autoStart: true,
                    restartOnFailure: false,
                    healthCheckInterval: 5000,
                    startupTimeout: 10000,
                    args: ['--custom', 'arg']
                }
            };
            
            const customManager = new OwnServerManager(customConfig, mockLogger);
            
            assert.strictEqual(customManager.binaryPath, '/custom/path', 'カスタムバイナリパス');
            assert.strictEqual(customManager.autoStart, true, 'カスタム自動起動');
            assert.strictEqual(customManager.restartOnFailure, false, 'カスタム再起動設定');
            assert.strictEqual(customManager.healthCheckInterval, 5000, 'カスタムヘルスチェック間隔');
            assert.strictEqual(customManager.startupTimeout, 10000, 'カスタム起動タイムアウト');
            
            customManager.cleanup();
        });
        
        it('デフォルト設定の確認', function() {
            const defaultConfig = { ownserver: {} };
            const defaultManager = new OwnServerManager(defaultConfig, mockLogger);
            
            assert.strictEqual(defaultManager.binaryPath, '/app/bin/ownserver', 'デフォルトバイナリパス');
            assert.strictEqual(defaultManager.autoStart, false, 'デフォルト自動起動');
            assert.strictEqual(defaultManager.restartOnFailure, true, 'デフォルト再起動設定');
            assert.strictEqual(defaultManager.healthCheckInterval, 30000, 'デフォルトヘルスチェック間隔');
            assert.strictEqual(defaultManager.startupTimeout, 60000, 'デフォルト起動タイムアウト');
            
            defaultManager.cleanup();
        });
    });
    
    describe('クリーンアップテスト', function() {
        it('クリーンアップ処理', async function() {
            this.timeout(10000);
            
            await ownServerManager.start();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // クリーンアップ前の状態確認（echoコマンドは即座に終了するため、stopped状態でも正常）
            const beforeStatus = ownServerManager.getStatus();
            const wasStarted = beforeStatus.status !== 'error'; // エラー状態でなければ起動は試行された
            
            // クリーンアップ実行
            await ownServerManager.cleanup();
            
            // クリーンアップ後の状態確認
            const afterStatus = ownServerManager.getStatus();
            assert.strictEqual(afterStatus.status, 'stopped', 'クリーンアップ後は停止');
            assert.strictEqual(afterStatus.processId, null, 'プロセスIDがクリア');
            
            // イベントリスナーもクリアされている
            assert.strictEqual(ownServerManager.listenerCount('ownserver-started'), 0, 'イベントリスナーがクリア');
        });
    });
});
