/**
 * MinecraftServerManager Phase2 Tests
 * Phase2機能（ログ解析・コマンド送信・自動再起動）のテスト
 */

const path = require('path');
const { promises: fs } = require('fs');
const assert = require('assert');
const MinecraftServerManager_Phase2 = require('../../src/utils/development-phases/MinecraftServerManager_Phase2');
const LogParser = require('../../src/utils/LogParser');

describe('MinecraftServerManager Phase2', () => {
    let manager;
    let testServerDir;
    
    beforeEach(async () => {
        // テスト用サーバーディレクトリ設定
        testServerDir = path.join(__dirname, '../../minecraft-servers/test_1.18.2');
        
        // テスト用設定
        const config = {
            javaVersion: '17',
            serverJar: 'paper-1.18.2-388.jar',
            autoDownloadJava: false, // テストではダウンロードしない
            logAnalysis: {
                enabled: true
            },
            autoRestart: {
                enabled: false // テストでは自動再起動無効
            }
        };
        
        manager = new MinecraftServerManager_Phase2(testServerDir, config);
    });
    
    afterEach(async () => {
        if (manager && manager.isServerRunning()) {
            await manager.stop(true); // 強制停止
        }
    });
    
    describe('LogParser Integration', () => {
        it('should initialize log parser when log analysis is enabled', () => {
            assert(manager.logParser instanceof LogParser, 'LogParser should be initialized');
        });
        
        it('should parse server ready log line', (done) => {
            const testLogLine = '[20:40:13] [Server thread/INFO]: Done (9.123s)! For help, type "help"';
            
            manager.on('server-ready', (data) => {
                assert.strictEqual(data.startupTime, '9.123s');
                done();
            });
            
            if (manager.logParser) {
                manager.logParser.parseLogLine(testLogLine);
            }
        });
        
        it('should parse player join log line', (done) => {
            const testLogLine = '[20:40:15] [Server thread/INFO]: TestPlayer joined the game';
            
            manager.on('player-join', (data) => {
                assert.strictEqual(data.player, 'TestPlayer');
                assert.strictEqual(data.count, 1);
                done();
            });
            
            if (manager.logParser) {
                manager.logParser.parseLogLine(testLogLine);
            }
        });
        
        it('should parse player leave log line', (done) => {
            const testLogLine1 = '[20:40:15] [Server thread/INFO]: TestPlayer joined the game';
            const testLogLine2 = '[20:40:20] [Server thread/INFO]: TestPlayer left the game';
            
            let eventCount = 0;
            
            manager.on('player-leave', (data) => {
                assert.strictEqual(data.player, 'TestPlayer');
                assert.strictEqual(data.count, 0);
                done();
            });
            
            if (manager.logParser) {
                manager.logParser.parseLogLine(testLogLine1); // 参加
                manager.logParser.parseLogLine(testLogLine2); // 離脱
            }
        });
        
        it('should detect server error log line', (done) => {
            const testLogLine = '[20:40:25] [Server thread/ERROR]: Test error message';
            
            manager.on('server-error', (data) => {
                assert.strictEqual(data.message, 'Test error message');
                done();
            });
            
            if (manager.logParser) {
                manager.logParser.parseLogLine(testLogLine);
            }
        });
    });
    
    describe('Server State Management', () => {
        it('should return enhanced server state', () => {
            const state = manager.getServerState();
            
            assert.ok(state.hasOwnProperty('status'), 'State should have status property');
            assert.ok(state.hasOwnProperty('logParserAvailable'), 'State should have logParserAvailable property');
            assert.ok(state.hasOwnProperty('autoRestartEnabled'), 'State should have autoRestartEnabled property');
            assert.ok(state.hasOwnProperty('phase1Status'), 'State should have phase1Status property');
        });
        
        it('should track player count', () => {
            // ログパーサーがプレイヤー参加を検出する前
            assert.strictEqual(manager.getPlayerCount(), 0);
            assert.deepStrictEqual(manager.getPlayerList(), []);
        });
        
        it('should check server ready status', () => {
            // 初期状態では準備完了していない
            assert.strictEqual(manager.isServerReady(), false);
        });
    });
    
    describe('Command Sending', () => {
        it('should reject command when server is not running', async () => {
            try {
                await manager.sendCommand('say Hello');
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.ok(error.message.includes('Server is not running'), `Expected error message to contain 'Server is not running', got: ${error.message}`);
            }
        });
        
        it('should reject invalid commands', async () => {
            try {
                await manager.sendCommand('');
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.ok(error.message.includes('Invalid command'), `Expected error message to contain 'Invalid command', got: ${error.message}`);
            }
            
            try {
                await manager.sendCommand(null);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.ok(error.message.includes('Invalid command'), `Expected error message to contain 'Invalid command', got: ${error.message}`);
            }
        });
    });
    
    describe('Server Properties Management', () => {
        it('should validate properties file path', async () => {
            const invalidServerDir = path.join(__dirname, '../../minecraft-servers/nonexistent');
            const invalidManager = new MinecraftServerManager_Phase2(invalidServerDir, {});
            
            try {
                await invalidManager.loadServerProperties();
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.strictEqual(typeof error, 'object');
            }
        });
        
        it('should handle empty properties file gracefully', async () => {
            const tempServerDir = path.join(__dirname, '../../temp-test-server');
            const tempPropertiesFile = path.join(tempServerDir, 'server.properties');
            
            try {
                await fs.mkdir(tempServerDir, { recursive: true });
                await fs.writeFile(tempPropertiesFile, '');
                
                const tempManager = new MinecraftServerManager_Phase2(tempServerDir, {});
                const properties = await tempManager.loadServerProperties();
                assert.deepStrictEqual(properties, {});
            } finally {
                try {
                    await fs.rm(tempServerDir, { recursive: true });
                } catch (err) {
                    // テスト後のクリーンアップエラーは無視
                }
            }
        });
        
        it('should parse valid properties file', async () => {
            const properties = await manager.loadServerProperties();
            
            assert.strictEqual(properties['server-port'], '25565');
            assert.strictEqual(properties['gamemode'], 'survival');
            assert.strictEqual(properties['difficulty'], 'normal');
            assert.strictEqual(properties['spawn-protection'], '16');
            assert.ok(!properties.hasOwnProperty('#Test properties'), 'Comments should not be included');
        });
        
        it('should save properties file', async () => {
            const newProperties = {
                'server-port': '25566',
                'gamemode': 'creative',
                'difficulty': 'hard'
            };
            
            await manager.saveServerProperties(newProperties);
            
            // 保存後に再読み込みして確認
            const reloadedProperties = await manager.loadServerProperties();
            assert.strictEqual(reloadedProperties['server-port'], '25566');
            assert.strictEqual(reloadedProperties['gamemode'], 'creative');
            assert.strictEqual(reloadedProperties['difficulty'], 'hard');
            
            // 元の設定に戻す
            const originalProperties = {
                'server-port': '25565',
                'gamemode': 'survival',
                'difficulty': 'normal',
                'spawn-protection': '16'
            };
            await manager.saveServerProperties(originalProperties);
        });
    });
    
    describe('Auto Restart Configuration', () => {
        it('should enable auto restart with default settings', () => {
            manager.enableAutoRestart();
            
            assert.strictEqual(manager.config.autoRestart.enabled, true);
            assert.strictEqual(manager.config.autoRestart.conditions.onCrash, true);
            assert.strictEqual(manager.config.autoRestart.conditions.onPlayerEmpty, true);
            assert.strictEqual(manager.config.autoRestart.conditions.maxUptime, 3600000);
            assert.strictEqual(manager.config.autoRestart.maxRetries, 5);
        });
        
        it('should toggle auto restart', () => {
            manager.enableAutoRestart();
            assert.strictEqual(manager.config.autoRestart.enabled, true);
            
            manager.disableAutoRestart();
            assert.strictEqual(manager.config.autoRestart.enabled, false);
        });
    });
    
    describe('Phase1 Compatibility', () => {
        it('should maintain Phase1 methods', () => {
            assert.strictEqual(typeof manager.start, 'function');
            assert.strictEqual(typeof manager.stop, 'function');
            assert.strictEqual(typeof manager.restart, 'function');
            assert.strictEqual(typeof manager.isServerRunning, 'function');
            assert.strictEqual(typeof manager.getServerState, 'function');
        });
    });
});

describe('LogParser Standalone Tests', () => {
    let logParser;
    
    beforeEach(() => {
        // LogParserの単体テスト用設定
        const logConfig = {
            trackServerStatus: true,
            trackPlayerActivity: true,
            trackPerformance: true,
            trackErrors: true
        };
        
        logParser = new LogParser(logConfig);
    });
    
    describe('Log Pattern Recognition', () => {
        it('should recognize server startup log', () => {
            const testLogLine = '[20:40:13] [Server thread/INFO]: Done (9.123s)! For help, type "help"';
            const result = logParser.parseLogLine(testLogLine);
            
            assert.strictEqual(result.type, 'server-ready');
            assert.strictEqual(result.startupTime, '9.123s');
        });
        
        it('should recognize player join/leave logs', () => {
            const joinLog = '[20:40:15] [Server thread/INFO]: TestPlayer joined the game';
            const leaveLog = '[20:40:20] [Server thread/INFO]: TestPlayer left the game';
            
            const joinResult = logParser.parseLogLine(joinLog);
            assert.strictEqual(joinResult.type, 'player-join');
            assert.strictEqual(joinResult.player, 'TestPlayer');
            
            const leaveResult = logParser.parseLogLine(leaveLog);
            assert.strictEqual(leaveResult.type, 'player-leave');
            assert.strictEqual(leaveResult.player, 'TestPlayer');
        });
        
        it('should recognize error logs', () => {
            const errorLog = '[20:40:25] [Server thread/ERROR]: Test error message';
            const result = logParser.parseLogLine(errorLog);
            
            assert.strictEqual(result.type, 'server-error');
            assert.strictEqual(result.message, 'Test error message');
        });
        
        it('should handle unrecognized log patterns', () => {
            const unknownLog = '[20:40:30] [Random thread/DEBUG]: Some debug message';
            const result = logParser.parseLogLine(unknownLog);
            
            assert.strictEqual(result.type, 'unknown');
            assert.strictEqual(result.originalLine, unknownLog);
        });
    });
    
    describe('Player Tracking', () => {
        it('should track player count accurately', () => {
            assert.strictEqual(logParser.getPlayerCount(), 0);
            assert.deepStrictEqual(logParser.getPlayerList(), []);
            
            logParser.parseLogLine('[20:40:15] [Server thread/INFO]: Player1 joined the game');
            assert.strictEqual(logParser.getPlayerCount(), 1);
            assert.ok(logParser.getPlayerList().includes('Player1'));
            
            logParser.parseLogLine('[20:40:16] [Server thread/INFO]: Player2 joined the game');
            assert.strictEqual(logParser.getPlayerCount(), 2);
            assert.ok(logParser.getPlayerList().includes('Player2'));
            
            logParser.parseLogLine('[20:40:20] [Server thread/INFO]: Player1 left the game');
            assert.strictEqual(logParser.getPlayerCount(), 1);
            assert.ok(!logParser.getPlayerList().includes('Player1'));
            assert.ok(logParser.getPlayerList().includes('Player2'));
        });
        
        it('should accumulate statistics', () => {
            const initialStats = logParser.getStats();
            assert.strictEqual(initialStats.totalMessages, 0);
            
            logParser.parseLogLine('[20:40:15] [Server thread/INFO]: Player1 joined the game');
            logParser.parseLogLine('[20:40:16] [Server thread/ERROR]: Test error');
            logParser.parseLogLine('[20:40:17] [Server thread/INFO]: Regular message');
            
            const stats = logParser.getStats();
            assert.strictEqual(stats.totalMessages, 3);
            assert.strictEqual(stats.playerJoins, 1);
            assert.strictEqual(stats.errorCount, 1);
        });
    });
});

module.exports = {
    MinecraftServerManager_Phase2,
    LogParser
};
