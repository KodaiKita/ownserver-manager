/**
 * Test Environment Setup for Phase2
 * テスト環境のセットアップとモック機能
 */

const path = require('path');
const { promises: fs } = require('fs');

/**
 * テスト環境の初期化
 */
async function setupTestEnvironment() {
    // テスト専用ログディレクトリ設定
    const testLogDir = path.join(__dirname, '../../test-logs');
    const testMinecraftDir = path.join(__dirname, '../../minecraft-servers');
    
    // 環境変数設定
    process.env.LOG_DIR = testLogDir;
    process.env.LOG_LEVEL = 'error'; // テスト時はエラーレベルのみ
    process.env.NODE_ENV = 'test';
    
    try {
        // 必要なディレクトリ作成
        await fs.mkdir(testLogDir, { recursive: true });
        await fs.mkdir(testMinecraftDir, { recursive: true });
        
        // テスト用サーバーディレクトリ作成
        const testServerDirs = [
            path.join(testMinecraftDir, 'test_1.8.8'),
            path.join(testMinecraftDir, 'test_1.18.2'),
            path.join(testMinecraftDir, 'test_1.21.5')
        ];
        
        for (const dir of testServerDirs) {
            await fs.mkdir(dir, { recursive: true });
            
            // ダミーのserver.jarファイル作成（テスト用）
            const dummyJarPath = path.join(dir, 'server.jar');
            try {
                await fs.access(dummyJarPath);
            } catch {
                // ファイルが存在しない場合のみ作成
                await fs.writeFile(dummyJarPath, 'dummy jar for testing');
            }
        }
        
        console.log('Test environment setup completed');
        return { 
            testLogDir, 
            testMinecraftDir,
            minecraftServerPath: testServerDirs[0] // デフォルトのテストサーバーパス
        };
    } catch (error) {
        console.error('Failed to setup test environment:', error);
        throw error;
    }
}

/**
 * テスト環境のクリーンアップ
 */
async function cleanupTestEnvironment() {
    try {
        // テスト用ログファイルのクリーンアップ（必要に応じて）
        const testLogDir = path.join(__dirname, '../../test-logs');
        
        // ログファイルのみ削除（ディレクトリは保持）
        const files = await fs.readdir(testLogDir).catch(() => []);
        for (const file of files) {
            if (file.endsWith('.log')) {
                await fs.unlink(path.join(testLogDir, file)).catch(() => {});
            }
        }
    } catch (error) {
        // クリーンアップエラーは無視
    }
}

/**
 * Logger用のモック機能
 */
class MockLogger {
    constructor(category) {
        this.category = category;
        this.logs = [];
    }
    
    log(level, message, data = null) {
        this.logs.push({ level, message, data, timestamp: new Date() });
    }
    
    debug(message, data) { this.log('debug', message, data); }
    info(message, data) { this.log('info', message, data); }
    warn(message, data) { this.log('warn', message, data); }
    error(message, data) { this.log('error', message, data); }
    
    getLogs() { return this.logs; }
    clearLogs() { this.logs = []; }
    clear() { this.logs = []; } // clearメソッドのエイリアス
}

/**
 * テスト用のMinecraftServerManager設定
 */
function createTestConfig(overrides = {}) {
    return {
        javaVersion: '17',
        serverJar: 'server.jar',
        autoDownloadJava: false, // テストでは無効
        logAnalysis: {
            enabled: true
        },
        autoRestart: {
            enabled: false // テストでは無効
        },
        ...overrides
    };
}

/**
 * イベント待機用ヘルパー
 */
function waitForEvent(emitter, eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Event '${eventName}' did not fire within ${timeout}ms`));
        }, timeout);
        
        emitter.once(eventName, (data) => {
            clearTimeout(timer);
            resolve(data);
        });
    });
}

module.exports = {
    setupTestEnvironment,
    teardownTestEnvironment: cleanupTestEnvironment, // エイリアス追加
    cleanupTestEnvironment,
    MockLogger,
    createTestConfig,
    waitForEvent
};
