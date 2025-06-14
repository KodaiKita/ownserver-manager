/**
 * Simple Entry Point for Docker Testing
 */

const Logger = require('./utils/Logger');

class SimpleApp {
    constructor() {
        // Docker環境では特別なログ設定を使用
        this.logger = new Logger('docker-test', {
            enableFileLogging: false  // ファイルログを無効化
        });
        this.isRunning = false;
    }

    async start() {
        this.isRunning = true;
        this.logger.info('OwnServer Manager Docker container started');
        
        console.log('🐳 OwnServer Manager Container Ready');
        console.log('📊 Status: Running');
        console.log('🔧 CLI available at: node bin/ownserver-manager');
        
        // Keep the container running
        const keepAlive = () => {
            if (this.isRunning) {
                setTimeout(keepAlive, 1000);
            }
        };
        keepAlive();
    }

    async stop() {
        this.isRunning = false;
        this.logger.info('OwnServer Manager Docker container stopping');
        console.log('👋 Container shutting down gracefully');
    }
}

// アプリケーション起動
const app = new SimpleApp();

// Signal handling
process.on('SIGTERM', async () => {
    console.log('📥 Received SIGTERM, shutting down gracefully');
    await app.stop();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('📥 Received SIGINT, shutting down gracefully');
    await app.stop();
    process.exit(0);
});

// Start the application
app.start().catch(console.error);
