/**
 * MinecraftServerManager Phase2 Practical Test
 * Phase2機能の実際のMinecraftサーバーを使った実践的テスト
 */

const path = require('path');
const MinecraftServerManager = require('../../src/managers/MinecraftServerManager');
const Logger = require('../../src/utils/Logger');

class MinecraftPracticalTest_Phase2 {
    constructor() {
        this.logger = new Logger('minecraft-practical-test-phase2', {
            category: 'test',
            enableConsole: true,
            enableFile: true
        });
        
        // テスト対象サーバー設定
        this.testServers = [
            {
                name: 'Paper 1.18.2',
                directory: path.join(process.cwd(), 'minecraft-servers/test_1.18.2'),
                config: {
                    javaVersion: '17',
                    serverJar: 'paper-1.18.2-388.jar',
                    javaArgs: ['-Xmx2G', '-Xms1G'],
                    autoDownloadJava: true,
                    logAnalysis: { enabled: true },
                    autoRestart: { 
                        enabled: false,  // テストでは無効
                        conditions: {
                            onCrash: true,
                            onPlayerEmpty: false
                        }
                    }
                }
            }
        ];
        
        this.testResults = [];
    }
    
    /**
     * 全テスト実行
     */
    async runAllTests() {
        this.logger.info('='.repeat(60));
        this.logger.info('MinecraftServerManager Phase2 Practical Test Started');
        this.logger.info('='.repeat(60));
        
        try {
            for (const serverConfig of this.testServers) {
                await this.testServerConfiguration(serverConfig);
            }
            
            await this.generateTestReport();
            
        } catch (error) {
            this.logger.error('Test suite failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * サーバー設定ごとのテスト実行
     */
    async testServerConfiguration(serverConfig) {
        this.logger.info(`Testing ${serverConfig.name}...`);
        
        const testResult = {
            serverName: serverConfig.name,
            startTime: new Date(),
            tests: [],
            overallSuccess: true
        };
        
        let manager = null;
        
        try {
            // 1. Manager初期化テスト
            const initResult = await this.testManagerInitialization(serverConfig);
            testResult.tests.push(initResult);
            
            if (!initResult.success) {
                testResult.overallSuccess = false;
                this.testResults.push(testResult);
                return;
            }
            
            manager = initResult.manager;
            
            // 2. サーバー起動・Phase2機能テスト
            const startupResult = await this.testServerStartupWithPhase2(manager);
            testResult.tests.push(startupResult);
            
            if (startupResult.success) {
                // 3. ログ解析テスト
                const logAnalysisResult = await this.testLogAnalysis(manager);
                testResult.tests.push(logAnalysisResult);
                
                // 4. コマンド送信テスト
                const commandResult = await this.testCommandSending(manager);
                testResult.tests.push(commandResult);
                
                // 5. プロパティ管理テスト
                const propertiesResult = await this.testPropertiesManagement(manager);
                testResult.tests.push(propertiesResult);
                
                // 6. サーバー停止テスト
                const stopResult = await this.testServerStop(manager);
                testResult.tests.push(stopResult);
                
                // 全テストの成功判定
                testResult.overallSuccess = testResult.tests.every(test => test.success);
            } else {
                testResult.overallSuccess = false;
            }
            
        } catch (error) {
            this.logger.error(`Test failed for ${serverConfig.name}`, { 
                error: error.message 
            });
            testResult.overallSuccess = false;
            testResult.error = error.message;
            
        } finally {
            // クリーンアップ
            if (manager && manager.isServerRunning()) {
                try {
                    await manager.stop(true);
                    this.logger.info('Server stopped for cleanup');
                } catch (cleanupError) {
                    this.logger.warn('Cleanup failed', { error: cleanupError.message });
                }
            }
        }
        
        testResult.endTime = new Date();
        testResult.duration = testResult.endTime - testResult.startTime;
        this.testResults.push(testResult);
    }
    
    /**
     * Manager初期化テスト
     */
    async testManagerInitialization(serverConfig) {
        const testName = 'Manager Initialization (Phase2)';
        this.logger.info(`Testing: ${testName}`);
        
        try {
            const manager = new MinecraftServerManager(
                serverConfig.directory, 
                serverConfig.config
            );
            
            // Phase2機能の確認
            const isPhase2 = manager.implementationPhase === 'Phase2';
            const hasLogParser = manager.logParser !== null;
            const hasPhase2Methods = [
                'sendCommand',
                'getPlayerCount',
                'getPlayerList',
                'isServerReady',
                'getServerProperties',
                'enableAutoRestart'
            ].every(method => typeof manager[method] === 'function');
            
            const success = isPhase2 && hasLogParser && hasPhase2Methods;
            
            this.logger.info(`${testName}: ${success ? 'PASS' : 'FAIL'}`, {
                phase: manager.implementationPhase,
                hasLogParser,
                hasPhase2Methods
            });
            
            return {
                testName,
                success,
                manager: success ? manager : null,
                details: {
                    phase: manager.implementationPhase,
                    features: manager.features,
                    hasLogParser,
                    hasPhase2Methods
                }
            };
            
        } catch (error) {
            this.logger.error(`${testName}: FAIL`, { error: error.message });
            return {
                testName,
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * サーバー起動テスト（Phase2機能付き）
     */
    async testServerStartupWithPhase2(manager) {
        const testName = 'Server Startup with Phase2 Features';
        this.logger.info(`Testing: ${testName}`);
        
        try {
            let serverReadyDetected = false;
            let logAnalysisWorking = false;
            
            // Phase2イベントリスナー設定
            manager.on('server-ready', () => {
                serverReadyDetected = true;
                this.logger.info('Server ready event detected by Phase2');
            });
            
            manager.on('server-starting', () => {
                logAnalysisWorking = true;
                this.logger.info('Server starting event detected by Phase2');
            });
            
            // サーバー起動
            const startTime = Date.now();
            await manager.start();
            const startupDuration = Date.now() - startTime;
            
            // Phase2状態確認
            const serverState = manager.getServerState();
            const isRunning = manager.isServerRunning();
            
            // 短時間待機してログ解析を確認
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const success = isRunning && serverState.logParserAvailable;
            
            this.logger.info(`${testName}: ${success ? 'PASS' : 'FAIL'}`, {
                startupDuration,
                isRunning,
                serverState: {
                    status: serverState.status,
                    logParserAvailable: serverState.logParserAvailable,
                    phase1Status: serverState.phase1Status
                },
                eventsDetected: {
                    serverReadyDetected,
                    logAnalysisWorking
                }
            });
            
            return {
                testName,
                success,
                details: {
                    startupDuration,
                    serverState,
                    eventsDetected: {
                        serverReadyDetected,
                        logAnalysisWorking
                    }
                }
            };
            
        } catch (error) {
            this.logger.error(`${testName}: FAIL`, { error: error.message });
            return {
                testName,
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * ログ解析機能テスト
     */
    async testLogAnalysis(manager) {
        const testName = 'Log Analysis Functionality';
        this.logger.info(`Testing: ${testName}`);
        
        try {
            // ログ統計取得
            const logStats = manager.getLogStats();
            const hasLogStats = logStats && typeof logStats.totalMessages === 'number';
            
            // サーバー状態確認
            const serverState = manager.getServerState();
            const hasDetailedState = serverState && 
                serverState.hasOwnProperty('onlinePlayers') &&
                serverState.hasOwnProperty('uptime');
            
            // プレイヤー監視機能確認
            const playerCount = manager.getPlayerCount();
            const playerList = manager.getPlayerList();
            const hasPlayerTracking = typeof playerCount === 'number' && 
                Array.isArray(playerList);
            
            const success = hasLogStats && hasDetailedState && hasPlayerTracking;
            
            this.logger.info(`${testName}: ${success ? 'PASS' : 'FAIL'}`, {
                logStats,
                serverState: {
                    status: serverState.status,
                    playerCount: serverState.playerCount,
                    uptime: serverState.uptime
                },
                playerTracking: {
                    count: playerCount,
                    list: playerList
                }
            });
            
            return {
                testName,
                success,
                details: {
                    hasLogStats,
                    hasDetailedState,
                    hasPlayerTracking,
                    logStats,
                    serverState
                }
            };
            
        } catch (error) {
            this.logger.error(`${testName}: FAIL`, { error: error.message });
            return {
                testName,
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * コマンド送信機能テスト
     */
    async testCommandSending(manager) {
        const testName = 'Command Sending Functionality';
        this.logger.info(`Testing: ${testName}`);
        
        try {
            let commandSentEvent = false;
            
            // コマンド送信イベントリスナー
            const eventListener = () => {
                commandSentEvent = true;
            };
            manager.on('command-sent', eventListener);
            
            // テストコマンド送信
            const testCommands = [
                'list',
                'say Hello Phase2!',
                'time query daytime'
            ];
            
            let commandResults = [];
            
            for (const command of testCommands) {
                try {
                    const result = await manager.sendCommand(command);
                    commandResults.push({
                        command,
                        success: result === true,
                        timestamp: new Date()
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (cmdError) {
                    commandResults.push({
                        command,
                        success: false,
                        error: cmdError.message
                    });
                }
            }
            
            const successfulCommands = commandResults.filter(r => r.success).length;
            const success = successfulCommands > 0 && commandSentEvent;
            
            manager.off('command-sent', eventListener);
            
            this.logger.info(`${testName}: ${success ? 'PASS' : 'FAIL'}`, {
                successfulCommands,
                totalCommands: testCommands.length,
                commandSentEvent,
                commandResults
            });
            
            return {
                testName,
                success,
                details: {
                    successfulCommands,
                    totalCommands: testCommands.length,
                    commandSentEvent,
                    commandResults
                }
            };
            
        } catch (error) {
            this.logger.error(`${testName}: FAIL`, { error: error.message });
            return {
                testName,
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * プロパティ管理機能テスト
     */
    async testPropertiesManagement(manager) {
        const testName = 'Properties Management';
        this.logger.info(`Testing: ${testName}`);
        
        try {
            const properties = await manager.getServerProperties();
            const hasProperties = properties && typeof properties === 'object';
            
            let updateSuccess = false;
            
            if (hasProperties) {
                try {
                    const originalValue = properties['motd'] || 'A Minecraft Server';
                    const testValue = 'Phase2 Test Server';
                    
                    await manager.updateServerProperty('motd', testValue);
                    
                    const updatedProperties = await manager.getServerProperties();
                    updateSuccess = updatedProperties['motd'] === testValue;
                    
                    await manager.updateServerProperty('motd', originalValue);
                    
                } catch (updateError) {
                    this.logger.warn('Property update test failed', { 
                        error: updateError.message 
                    });
                }
            }
            
            const success = hasProperties;
            
            this.logger.info(`${testName}: ${success ? 'PASS' : 'FAIL'}`, {
                hasProperties,
                updateSuccess,
                propertiesCount: Object.keys(properties || {}).length
            });
            
            return {
                testName,
                success,
                details: {
                    hasProperties,
                    updateSuccess,
                    propertiesCount: Object.keys(properties || {}).length,
                    sampleProperties: {
                        'server-port': properties['server-port'],
                        'gamemode': properties['gamemode'],
                        'difficulty': properties['difficulty']
                    }
                }
            };
            
        } catch (error) {
            this.logger.error(`${testName}: FAIL`, { error: error.message });
            return {
                testName,
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * サーバー停止テスト
     */
    async testServerStop(manager) {
        const testName = 'Server Stop with Phase2 Cleanup';
        this.logger.info(`Testing: ${testName}`);
        
        try {
            let serverStoppingDetected = false;
            
            const stopListener = () => {
                serverStoppingDetected = true;
                this.logger.info('Server stopping event detected by Phase2');
            };
            manager.on('server-stopping', stopListener);
            
            const stopTime = Date.now();
            await manager.stop();
            const stopDuration = Date.now() - stopTime;
            
            const isRunning = manager.isServerRunning();
            const success = !isRunning;
            
            manager.off('server-stopping', stopListener);
            
            this.logger.info(`${testName}: ${success ? 'PASS' : 'FAIL'}`, {
                stopDuration,
                isRunning,
                serverStoppingDetected
            });
            
            return {
                testName,
                success,
                details: {
                    stopDuration,
                    isRunning,
                    serverStoppingDetected
                }
            };
            
        } catch (error) {
            this.logger.error(`${testName}: FAIL`, { error: error.message });
            return {
                testName,
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * テストレポート生成
     */
    async generateTestReport() {
        this.logger.info('\\n' + '='.repeat(60));
        this.logger.info('MinecraftServerManager Phase2 Test Report');
        this.logger.info('='.repeat(60));
        
        let totalTests = 0;
        let passedTests = 0;
        
        for (const result of this.testResults) {
            this.logger.info(`\\nServer: ${result.serverName}`);
            this.logger.info(`Overall: ${result.overallSuccess ? 'PASS' : 'FAIL'}`);
            this.logger.info(`Duration: ${result.duration}ms`);
            
            if (result.error) {
                this.logger.error(`Error: ${result.error}`);
            }
            
            this.logger.info('Individual Tests:');
            
            for (const test of result.tests) {
                const status = test.success ? 'PASS' : 'FAIL';
                this.logger.info(`  - ${test.testName}: ${status}`);
                
                if (test.error) {
                    this.logger.error(`    Error: ${test.error}`);
                }
                
                totalTests++;
                if (test.success) passedTests++;
            }
            
            if (result.overallSuccess) passedTests++;
        }
        
        const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
        
        this.logger.info('\\n' + '-'.repeat(60));
        this.logger.info('SUMMARY:');
        this.logger.info(`Total Tests: ${totalTests}`);
        this.logger.info(`Passed: ${passedTests}`);
        this.logger.info(`Failed: ${totalTests - passedTests}`);
        this.logger.info(`Success Rate: ${successRate}%`);
        this.logger.info('-'.repeat(60));
        
        const reportData = {
            timestamp: new Date().toISOString(),
            phase: 'Phase2',
            summary: {
                totalTests,
                passedTests,
                failedTests: totalTests - passedTests,
                successRate: parseFloat(successRate)
            },
            results: this.testResults
        };
        
        const reportPath = path.join(process.cwd(), 'logs', 'minecraft-phase2-test-report.json');
        
        try {
            await require('fs').promises.writeFile(
                reportPath, 
                JSON.stringify(reportData, null, 2), 
                'utf8'
            );
            this.logger.info(`Test report saved: ${reportPath}`);
        } catch (saveError) {
            this.logger.warn('Failed to save test report', { error: saveError.message });
        }
        
        if (successRate < 100) {
            throw new Error(`Test suite failed with ${successRate}% success rate`);
        }
        
        this.logger.info('✅ All Phase2 tests passed successfully!');
        return reportData;
    }
}

// テスト実行（直接実行時）
if (require.main === module) {
    const test = new MinecraftPracticalTest_Phase2();
    
    test.runAllTests()
        .then(() => {
            console.log('✅ Phase2 practical tests completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Phase2 practical tests failed:', error.message);
            process.exit(1);
        });
}

module.exports = MinecraftPracticalTest_Phase2;
