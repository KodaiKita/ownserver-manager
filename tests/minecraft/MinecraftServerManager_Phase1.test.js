/**
 * MinecraftServerManager Phase1 テスト
 * 基本プロセス管理機能のテスト
 */

const assert = require('assert');
const path = require('path');
const { promises: fs } = require('fs');
const MinecraftServerManager_Phase1 = require('../../src/utils/development-phases/MinecraftServerManager_Phase1');

describe('MinecraftServerManager Phase1', function() {
    this.timeout(30000); // 30秒タイムアウト（Javaダウンロードのため）
    
    let manager;
    let testServerDir;
    
    before(async function() {
        // テスト用サーバーディレクトリ作成
        testServerDir = path.join(__dirname, '..', 'test-server');
        await fs.mkdir(testServerDir, { recursive: true });
        
        // モックserver.jar作成（空ファイル）
        const serverJarPath = path.join(testServerDir, 'server.jar');
        await fs.writeFile(serverJarPath, '');
    });
    
    after(async function() {
        // クリーンアップ
        if (manager && manager.isServerRunning()) {
            await manager.stop(true);
        }
        
        // テストディレクトリ削除
        try {
            await fs.rm(testServerDir, { recursive: true, force: true });
        } catch (error) {
            console.warn('Failed to cleanup test directory:', error.message);
        }
    });
    
    beforeEach(function() {
        manager = new MinecraftServerManager_Phase1(testServerDir, {
            autoDownloadJava: true,
            javaVersion: '17',
            javaArgs: ['-Xmx512M', '-Xms256M'] // テスト用に軽量化
        });
    });
    
    afterEach(async function() {
        if (manager && manager.isServerRunning()) {
            await manager.stop(true);
        }
    });
    
    describe('Constructor', function() {
        it('should initialize with default configuration', function() {
            const mgr = new MinecraftServerManager_Phase1(testServerDir);
            
            assert.strictEqual(mgr.serverDirectory, path.resolve(testServerDir));
            assert.strictEqual(mgr.config.javaVersion, 'auto');
            assert.strictEqual(mgr.config.autoDownloadJava, true);
            assert.strictEqual(mgr.isRunning, false);
        });
        
        it('should override default configuration', function() {
            const config = {
                javaVersion: '11',
                autoDownloadJava: false,
                javaArgs: ['-Xmx1G']
            };
            
            const mgr = new MinecraftServerManager_Phase1(testServerDir, config);
            
            assert.strictEqual(mgr.config.javaVersion, '11');
            assert.strictEqual(mgr.config.autoDownloadJava, false);
            assert.deepStrictEqual(mgr.config.javaArgs, ['-Xmx1G']);
        });
    });
    
    describe('Environment Validation', function() {
        it('should validate existing server directory and jar', async function() {
            // 正常なケース - エラーが発生しないことを確認
            await manager._validateEnvironment();
        });
        
        it('should throw error for non-existent server directory', async function() {
            const mgr = new MinecraftServerManager_Phase1('/non/existent/path');
            
            try {
                await mgr._validateEnvironment();
                assert.fail('Should have thrown error');
            } catch (error) {
                assert(error.message.includes('Server directory does not exist'));
            }
        });
        
        it('should throw error for missing server.jar', async function() {
            // server.jarを削除
            const serverJarPath = path.join(testServerDir, 'server.jar');
            await fs.unlink(serverJarPath);
            
            try {
                await manager._validateEnvironment();
                assert.fail('Should have thrown error');
            } catch (error) {
                assert(error.message.includes('Server jar not found'));
            }
            
            // 復元
            await fs.writeFile(serverJarPath, '');
        });
    });
    
    describe('Java Management', function() {
        it('should find system Java if available', async function() {
            const javaPath = await manager._findSystemJava('11');
            
            if (javaPath) {
                assert.strictEqual(typeof javaPath, 'string');
                assert(javaPath.length > 0);
            }
            // システムJavaが見つからない場合はnullが返る（正常）
        });
        
        it('should validate Java installation', async function() {
            // システムJavaを使ってテスト
            const javaPath = await manager._findSystemJava('11') || 'java';
            
            try {
                await manager.validateJavaInstallation(javaPath);
                // バリデーション成功
            } catch (error) {
                // システムにJavaがない場合はスキップ
                if (error.message.includes('ENOENT')) {
                    this.skip();
                } else {
                    throw error;
                }
            }
        });
        
        // Note: 実際のJavaダウンロードテストは時間がかかるため、
        // 統合テストまたは手動テストで実行
        it.skip('should download and install Java', async function() {
            const javaPath = await manager.downloadJava('17');
            
            assert.strictEqual(typeof javaPath, 'string');
            assert(javaPath.includes('java-17'));
            
            // インストール検証
            await manager.validateJavaInstallation(javaPath);
        });
    });
    
    describe('Server State Management', function() {
        it('should report correct initial state', function() {
            assert.strictEqual(manager.isServerRunning(), false);
            assert.strictEqual(manager.isRunning, false);
            assert.strictEqual(manager.isStarting, false);
            assert.strictEqual(manager.isStopping, false);
        });
        
        it('should prevent multiple simultaneous starts', async function() {
            // エラーハンドリングのためのイベントリスナー
            let errorReceived = false;
            manager.on('error', () => {
                errorReceived = true; // エラーは期待される（空のserver.jar）
            });
            
            // 最初のstartを開始（完了を待たない）
            const startPromise = manager.start().catch(() => {}); // エラーを無視
            
            // 短時間待機してstartプロセスが開始されることを確認
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // 2回目のstartを試行（プロセスが既に終了している可能性があるため、即座に試行）
            if (manager.isStarting || manager.isRunning) {
                try {
                    await manager.start();
                    assert.fail('Should have thrown error');
                } catch (error) {
                    assert(error.message.includes('already running or starting'));
                }
            } else {
                // プロセスが既に終了している場合はテストをスキップ
                this.skip();
            }
            
            // 最初のstartの完了を待つ
            await startPromise;
        });
    });
    
    describe('Event Emission', function() {
        it('should emit events during lifecycle', function(done) {
            let eventsReceived = [];
            
            manager.on('started', (data) => {
                eventsReceived.push('started');
                assert(data.pid);
                assert(data.startTime);
            });
            
            manager.on('error', (error) => {
                eventsReceived.push('error');
                assert(error instanceof Error);
                
                // エラーは期待される（Javaがない、またはserver.jarが無効）
                assert(eventsReceived.includes('error'));
                done();
            });
            
            manager.on('log', (data) => {
                eventsReceived.push('log');
                assert(['stdout', 'stderr'].includes(data.type));
                assert(typeof data.data === 'string');
            });
            
            manager.on('exit', (data) => {
                eventsReceived.push('exit');
                // code または signal のいずれかは存在する
                assert(data.code !== undefined || data.signal !== undefined);
            });
            
            // サーバー起動（エラーになることを期待）
            manager.start().catch(() => {
                // エラーは期待される
            });
        });
    });
    
    describe('Utility Methods', function() {
        it('should check file existence correctly', async function() {
            const existingFile = path.join(testServerDir, 'server.jar');
            const nonExistentFile = path.join(testServerDir, 'non-existent.jar');
            
            assert.strictEqual(await manager._fileExists(existingFile), true);
            assert.strictEqual(await manager._fileExists(nonExistentFile), false);
        });
        
        it('should handle cleanup properly', function() {
            // 状態を設定
            manager.isRunning = true;
            manager.isStarting = true;
            manager.process = { pid: 12345 };
            manager.startTime = new Date();
            
            // クリーンアップ実行
            manager._cleanup();
            
            // 状態確認
            assert.strictEqual(manager.isRunning, false);
            assert.strictEqual(manager.isStarting, false);
            assert.strictEqual(manager.isStopping, false);
            assert.strictEqual(manager.process, null);
            assert.strictEqual(manager.startTime, null);
        });
    });
    
    describe('Configuration Validation', function() {
        it('should handle various Java version configurations', function() {
            const configs = [
                { javaVersion: 'auto' },
                { javaVersion: '8' },
                { javaVersion: '11' },
                { javaVersion: '17' },
                { javaVersion: '21' }
            ];
            
            configs.forEach(config => {
                const mgr = new MinecraftServerManager_Phase1(testServerDir, config);
                assert.strictEqual(mgr.config.javaVersion, config.javaVersion);
            });
        });
        
        it('should handle custom Java arguments', function() {
            const customArgs = ['-Xmx4G', '-Xms2G', '-XX:+UseG1GC'];
            const mgr = new MinecraftServerManager_Phase1(testServerDir, {
                javaArgs: customArgs
            });
            
            assert.deepStrictEqual(mgr.config.javaArgs, customArgs);
        });
    });
});
