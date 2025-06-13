#!/usr/bin/env node

/**
 * Phase2 Practical Test Runner
 * 実用的なPhase2機能テスト
 */

const path = require('path');
const fs = require('fs');

// 環境設定
process.env.LOG_DIR = path.join(__dirname, '../test-logs');
process.env.LOG_LEVEL = 'error';
process.env.NODE_ENV = 'test';

// テスト結果収集
const testResults = [];

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

function addResult(test, status, message = '') {
    testResults.push({ test, status, message });
    const emoji = status === 'PASS' ? '✅' : status === 'SKIP' ? '⏭️' : '❌';
    log(`${emoji} ${test}: ${status} ${message}`);
}

async function createTestEnvironment() {
    log('Setting up test environment...');
    
    try {
        // Create directories
        const dirs = [
            path.join(__dirname, '../test-logs'),
            path.join(__dirname, '../minecraft-servers/test_1.18.2')
        ];
        
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
        
        // Create dummy server.jar
        const jarPath = path.join(__dirname, '../minecraft-servers/test_1.18.2/server.jar');
        if (!fs.existsSync(jarPath)) {
            fs.writeFileSync(jarPath, 'dummy jar content for testing');
        }
        
        addResult('Environment Setup', 'PASS');
        return true;
    } catch (error) {
        addResult('Environment Setup', 'FAIL', error.message);
        return false;
    }
}

async function testLogParserModule() {
    log('Testing LogParser module...');
    
    try {
        const LogParser = require('../src/utils/LogParser');
        
        if (typeof LogParser === 'function') {
            addResult('LogParser Module Load', 'PASS');
            
            // Try to create instance
            try {
                const parser = new LogParser({ info: () => {}, error: () => {} });
                addResult('LogParser Instance Creation', 'PASS');
                
                // Test pattern matching
                const testLine = '[20:40:13] [Server thread/INFO]: Done (9.123s)! For help, type "help"';
                if (parser.patterns && parser.patterns.serverReady) {
                    const match = testLine.match(parser.patterns.serverReady);
                    addResult('LogParser Pattern Matching', match ? 'PASS' : 'FAIL');
                } else {
                    addResult('LogParser Pattern Matching', 'SKIP', 'No patterns found');
                }
                
                return true;
            } catch (error) {
                addResult('LogParser Instance Creation', 'FAIL', error.message);
                return false;
            }
        } else {
            addResult('LogParser Module Load', 'FAIL', 'Not a constructor function');
            return false;
        }
    } catch (error) {
        addResult('LogParser Module Load', 'FAIL', error.message);
        return false;
    }
}

async function testPhase2Module() {
    log('Testing Phase2 module...');
    
    try {
        const MinecraftServerManager_Phase2 = require('../src/utils/development-phases/MinecraftServerManager_Phase2');
        
        if (typeof MinecraftServerManager_Phase2 === 'function') {
            addResult('Phase2 Module Load', 'PASS');
            
            // Try to create instance with minimal config
            try {
                const testServerDir = path.join(__dirname, '../minecraft-servers/test_1.18.2');
                const config = {
                    javaVersion: '17',
                    serverJar: 'server.jar',
                    autoDownloadJava: false,
                    logAnalysis: { enabled: true },
                    autoRestart: { enabled: false }
                };
                
                const manager = new MinecraftServerManager_Phase2(testServerDir, config);
                addResult('Phase2 Instance Creation', 'PASS');
                
                // Test API methods
                if (typeof manager.getServerState === 'function') {
                    const state = manager.getServerState();
                    addResult('Phase2 getServerState', 'PASS', `Status: ${state.status}`);
                } else {
                    addResult('Phase2 getServerState', 'FAIL', 'Method not found');
                }
                
                if (typeof manager.getPlayerCount === 'function') {
                    const count = manager.getPlayerCount();
                    addResult('Phase2 getPlayerCount', 'PASS', `Count: ${count}`);
                } else {
                    addResult('Phase2 getPlayerCount', 'FAIL', 'Method not found');
                }
                
                return true;
            } catch (error) {
                addResult('Phase2 Instance Creation', 'FAIL', error.message);
                return false;
            }
        } else {
            addResult('Phase2 Module Load', 'FAIL', 'Not a constructor function');
            return false;
        }
    } catch (error) {
        addResult('Phase2 Module Load', 'FAIL', error.message);
        return false;
    }
}

async function testLogParsingLogic() {
    log('Testing log parsing logic...');
    
    try {
        const LogParser = require('../src/utils/LogParser');
        const mockLogger = { info: () => {}, error: () => {}, debug: () => {}, warn: () => {} };
        const parser = new LogParser(mockLogger);
        
        // Test server ready detection
        const serverReadyLine = '[20:40:13] [Server thread/INFO]: Done (9.123s)! For help, type "help"';
        let serverReadyDetected = false;
        
        parser.on('server-ready', (data) => {
            serverReadyDetected = true;
            if (data.startupTime === '9.123s') {
                addResult('Log Parsing - Server Ready', 'PASS', `Startup time: ${data.startupTime}`);
            } else {
                addResult('Log Parsing - Server Ready', 'FAIL', `Wrong startup time: ${data.startupTime}`);
            }
        });
        
        parser.parseLogLine(serverReadyLine);
        
        // Wait a bit for event to fire
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!serverReadyDetected) {
            addResult('Log Parsing - Server Ready', 'FAIL', 'Event not fired');
        }
        
        // Test player join detection
        const playerJoinLine = '[20:40:15] [Server thread/INFO]: TestPlayer joined the game';
        let playerJoinDetected = false;
        
        parser.on('player-join', (data) => {
            playerJoinDetected = true;
            if (data.player === 'TestPlayer') {
                addResult('Log Parsing - Player Join', 'PASS', `Player: ${data.player}`);
            } else {
                addResult('Log Parsing - Player Join', 'FAIL', `Wrong player: ${data.player}`);
            }
        });
        
        parser.parseLogLine(playerJoinLine);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!playerJoinDetected) {
            addResult('Log Parsing - Player Join', 'FAIL', 'Event not fired');
        }
        
        return true;
    } catch (error) {
        addResult('Log Parsing Logic', 'FAIL', error.message);
        return false;
    }
}

async function runTests() {
    log('Starting Phase2 Practical Tests...');
    log('=====================================');
    
    const success = await createTestEnvironment();
    if (!success) {
        log('❌ Environment setup failed, stopping tests');
        return;
    }
    
    await testLogParserModule();
    await testPhase2Module();
    await testLogParsingLogic();
    
    log('=====================================');
    log('Test Summary:');
    
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    const skipped = testResults.filter(r => r.status === 'SKIP').length;
    const total = testResults.length;
    
    log(`Total Tests: ${total}`);
    log(`✅ Passed: ${passed}`);
    log(`❌ Failed: ${failed}`);
    log(`⏭️ Skipped: ${skipped}`);
    
    if (failed > 0) {
        log('\nFailed Tests:');
        testResults.filter(r => r.status === 'FAIL').forEach(r => {
            log(`  - ${r.test}: ${r.message}`);
        });
    }
    
    const successRate = Math.round((passed / (passed + failed)) * 100);
    log(`\nSuccess Rate: ${successRate}%`);
    
    if (successRate >= 80) {
        log('🎉 Phase2 is ready for production!');
    } else if (successRate >= 60) {
        log('⚠️ Phase2 needs some fixes but core functionality works');
    } else {
        log('🚨 Phase2 needs significant work');
    }
}

// Run the tests
runTests().catch(error => {
    log(`❌ Test runner failed: ${error.message}`);
    process.exit(1);
});
