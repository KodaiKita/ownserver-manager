/**
 * MinecraftServerManager Phase2 簡易テスト
 * Phase2機能の基本動作確認
 */

const assert = require('assert');
const path = require('path');
const MinecraftServerManager_Phase2 = require('../../src/utils/development-phases/MinecraftServerManager_Phase2');
const LogParser = require('../../src/utils/LogParser');

describe('MinecraftServerManager Phase2 - Basic Tests', function() {
    this.timeout(10000);
    
    let manager;
    let testServerDir;
    
    beforeEach(function() {
        testServerDir = path.join(__dirname, '../../minecraft-servers/test_1.18.2');
        
        const config = {
            javaVersion: '17',
            serverJar: 'paper-1.18.2-388.jar',
            autoDownloadJava: false,
            logAnalysis: {
                enabled: true
            },
            autoRestart: {
                enabled: false
            }
        };
        
        manager = new MinecraftServerManager_Phase2(testServerDir, config);
    });
    
    afterEach(function() {
        if (manager && manager.isServerRunning()) {
            manager.stop(true);
        }
    });
    
    describe('Phase2 Initialization', function() {
        it('should create manager instance', function() {
            assert(manager instanceof MinecraftServerManager_Phase2);
        });
        
        it('should initialize log parser when enabled', function() {
            assert(manager.logParser instanceof LogParser);
        });
        
        it('should have Phase2 methods', function() {
            assert(typeof manager.sendCommand === 'function');
            assert(typeof manager.getPlayerCount === 'function');
            assert(typeof manager.getPlayerList === 'function');
            assert(typeof manager.isServerReady === 'function');
            assert(typeof manager.getServerProperties === 'function');
        });
        
        it('should have correct phase marker', function() {
            assert.strictEqual(manager.features.phase, 'Phase2');
            assert.strictEqual(manager.features.implementation, 'monitoring-and-control');
        });
    });
    
    describe('Server State', function() {
        it('should return initial state', function() {
            const state = manager.getServerState();
            assert(typeof state === 'object');
            assert(state.hasOwnProperty('status'));
            assert(state.hasOwnProperty('logParserAvailable'));
            assert(state.hasOwnProperty('autoRestartEnabled'));
        });
        
        it('should track player count', function() {
            assert.strictEqual(manager.getPlayerCount(), 0);
            assert(Array.isArray(manager.getPlayerList()));
            assert.strictEqual(manager.getPlayerList().length, 0);
        });
        
        it('should check server ready status', function() {
            assert.strictEqual(manager.isServerReady(), false);
        });
    });
    
    describe('Command Validation', function() {
        it('should reject empty commands', async function() {
            try {
                await manager.sendCommand('');
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert(error.message.includes('Invalid command'));
            }
        });
        
        it('should reject null commands', async function() {
            try {
                await manager.sendCommand(null);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert(error.message.includes('Invalid command'));
            }
        });
        
        it('should reject commands when server not running', async function() {
            try {
                await manager.sendCommand('say Hello');
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert(error.message.includes('Server is not running'));
            }
        });
    });
});

describe('LogParser - Basic Tests', function() {
    let logParser;
    
    beforeEach(function() {
        const mockLogger = {
            info: () => {},
            warn: () => {},
            error: () => {}
        };
        logParser = new LogParser(mockLogger);
    });
    
    describe('Log Parsing', function() {
        it('should create LogParser instance', function() {
            assert(logParser instanceof LogParser);
        });
        
        it('should parse server ready message', function() {
            const result = logParser.parseLogLine(
                '[20:40:13] [Server thread/INFO]: Done (9.123s)! For help, type "help"'
            );
            
            assert.strictEqual(result.type, 'server-ready');
            assert.strictEqual(result.data.startupTime, '9.123s');
            assert.strictEqual(result.parsed, true);
        });
        
        it('should parse player join message', function() {
            const result = logParser.parseLogLine(
                '[20:40:15] [Server thread/INFO]: TestPlayer joined the game'
            );
            
            assert.strictEqual(result.type, 'player-join');
            assert.strictEqual(result.data.player, 'TestPlayer');
            assert.strictEqual(result.data.count, 1);
        });
        
        it('should track player state', function() {
            // Player join
            logParser.parseLogLine('[20:40:15] [Server thread/INFO]: TestPlayer joined the game');
            assert.strictEqual(logParser.getPlayerCount(), 1);
            assert(logParser.getPlayerList().includes('TestPlayer'));
            
            // Player leave
            const result = logParser.parseLogLine('[20:40:20] [Server thread/INFO]: TestPlayer left the game');
            assert.strictEqual(result.type, 'player-leave');
            assert.strictEqual(result.data.player, 'TestPlayer');
            assert.strictEqual(logParser.getPlayerCount(), 0);
        });
        
        it('should return empty result for unmatched logs', function() {
            const result = logParser.parseLogLine('[20:40:15] [Server thread/INFO]: Some random log');
            assert.strictEqual(result.type, 'unknown');
            assert.strictEqual(result.parsed, false);
        });
    });
});
