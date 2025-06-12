/**
 * Practical Minecraft Server Test
 * 実際のMinecraftサーバーJARファイルを使用した実践的テスト
 */

const path = require('path');
const MinecraftServerManager = require('../../src/managers/MinecraftServerManager');
const ConfigManager = require('../../src/utils/ConfigManager');
const JavaVersionManager = require('../../src/utils/JavaVersionManager');

class MinecraftPracticalTest {
    constructor() {
        this.configPath = path.join(__dirname, '../../test-config', 'minecraft-test-config.json');
        this.config = null;
        this.servers = new Map();
    }
    
    async initialize() {
        console.log('🚀 Initializing Minecraft Practical Test...\n');
        
        // 設定読み込み
        this.config = new ConfigManager(this.configPath);
        await this.config.load();
        
        console.log('✅ Configuration loaded');
        console.log('📋 EULA Agreement Status:', {
            agreed: this.config.get('minecraft.eula.agreed'),
            userConsent: this.config.get('minecraft.eula.userConsent')
        });
        console.log('');
    }
    
    async testAllServers() {
        const serverConfigs = this.config.get('minecraft.servers');
        
        for (const [serverName, serverConfig] of Object.entries(serverConfigs)) {
            console.log(`\n🎮 Testing Server: ${serverName}`);
            console.log('📁 Directory:', serverConfig.serverDirectory);
            console.log('📦 JAR:', serverConfig.serverJar);
            
            try {
                await this.testSingleServer(serverName, serverConfig);
            } catch (error) {
                console.error(`❌ Server ${serverName} test failed:`, error.message);
            }
        }
    }
    
    async testSingleServer(serverName, serverConfig) {
        const absoluteDir = path.resolve(serverConfig.serverDirectory);
        
        // Minecraft バージョン検出テスト
        console.log('\n🔍 Version Detection:');
        const detectedVersion = JavaVersionManager.detectMinecraftVersionFromJar(serverConfig.serverJar);
        const serverType = JavaVersionManager.detectServerTypeFromJar(serverConfig.serverJar);
        const javaRecommendation = JavaVersionManager.getRecommendedJavaVersion(detectedVersion, serverType);
        
        console.log(`   Minecraft Version: ${detectedVersion}`);
        console.log(`   Server Type: ${serverType}`);
        console.log(`   Recommended Java: ${javaRecommendation.version}`);
        console.log(`   Java Range: ${javaRecommendation.requirements.min}-${javaRecommendation.requirements.max}`);
        
        // MinecraftServerManager 作成
        const mergedConfig = {
            ...serverConfig,
            minecraft: {
                eula: {
                    agreed: this.config.get('minecraft.eula.agreed'),
                    userConsent: this.config.get('minecraft.eula.userConsent')
                }
            }
        };
        
        console.log('🔧 Debug - EULA config:', {
            eulaAgreed: mergedConfig.minecraft?.eula?.agreed,
            eulaUserConsent: mergedConfig.minecraft?.eula?.userConsent
        });
        
        const manager = new MinecraftServerManager(absoluteDir, mergedConfig);
        
        this.servers.set(serverName, manager);
        
        // イベントリスナー設定
        this.setupEventListeners(manager, serverName);
        
        // EULA テスト
        console.log('\n📜 EULA Test:');
        const eulaInfo = await manager.eulaManager.getEULAInfo(absoluteDir);
        console.log(`   EULA exists: ${eulaInfo.exists}`);
        console.log(`   EULA agreed: ${eulaInfo.agreed}`);
        
        // サーバー起動テスト
        console.log('\n🚀 Server Start Test:');
        await manager.start();
        
        // 短時間実行後停止
        console.log('⏱️  Running server for 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        console.log('🛑 Stopping server...');
        await manager.stop();
        
        console.log(`✅ Server ${serverName} test completed successfully`);
    }
    
    setupEventListeners(manager, serverName) {
        manager.on('started', (data) => {
            console.log(`   ✅ Server started (PID: ${data.pid})`);
        });
        
        manager.on('log', (data) => {
            // 重要なログのみ表示
            if (data.data.includes('Done') || 
                data.data.includes('Starting') ||
                data.data.includes('Stopping') ||
                data.data.includes('EULA')) {
                console.log(`   📝 [${data.type}] ${data.data.substring(0, 100)}...`);
            }
        });
        
        manager.on('error', (error) => {
            console.log(`   ⚠️  Error: ${error.message}`);
        });
        
        manager.on('exit', (data) => {
            console.log(`   🏁 Process exited (Code: ${data.code}, Signal: ${data.signal})`);
        });
        
        manager.on('stopped', () => {
            console.log(`   🛑 Server stopped`);
        });
    }
    
    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        
        for (const [serverName, manager] of this.servers) {
            if (manager.isServerRunning()) {
                console.log(`   Stopping ${serverName}...`);
                await manager.stop(true); // Force stop
            }
        }
        
        console.log('✅ Cleanup completed');
    }
    
    async run() {
        try {
            await this.initialize();
            await this.testAllServers();
        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            await this.cleanup();
        }
    }
}

// 実行
if (require.main === module) {
    const test = new MinecraftPracticalTest();
    test.run().then(() => {
        console.log('\n🎉 All tests completed!');
        process.exit(0);
    }).catch((error) => {
        console.error('\n💥 Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = MinecraftPracticalTest;
