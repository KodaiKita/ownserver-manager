/**
 * ownserver-manager - Main Entry Point
 * 全体の制御・イベント調整を行うメインプロセス
 */

const EventEmitter = require('events');
const MinecraftServerManager = require('./managers/MinecraftServerManager');
const OwnServerManager = require('./managers/OwnServerManager');
const CloudFlareManager = require('./managers/CloudFlareManager');
const HealthChecker = require('./modules/HealthChecker');
const Logger = require('./utils/Logger');
const ConfigManager = require('./utils/ConfigManager');

class OwnServerManagerApp extends EventEmitter {
    constructor() {
        super();
        this.config = null;
        this.configManager = null;
        this.minecraftManager = null;
        this.ownserverManager = null;
        this.cloudflareManager = null;
        this.healthChecker = null;
        this.logger = new Logger('main');
    }

    /**
     * アプリケーション初期化
     */
    async initialize() {
        try {
            this.logger.info('Initializing OwnServer Manager');
            
            // ConfigManagerの初期化
            this.configManager = new ConfigManager();
            await this.configManager.load();
            this.config = this.configManager.getAll();
            
            // MinecraftServerManagerの初期化
            if (this.config.minecraft) {
                this.minecraftManager = new MinecraftServerManager(
                    this.config.minecraft.serverDirectory,
                    { 
                        ...this.config.minecraft,
                        // Phase3で必要な全設定を渡す
                        cloudflare: this.config.cloudflare,
                        ownserver: this.config.ownserver,
                        integration: this.config.integration,
                        recovery: this.config.recovery
                    }
                );
                this.logger.info('MinecraftServerManager initialized');
            }
            
            // OwnServerManagerの初期化
            if (this.config.ownserver) {
                this.ownserverManager = new OwnServerManager(this.config, this.logger);
                this.logger.info('OwnServerManager initialized');
            }
            
            // CloudFlareManagerの初期化
            if (this.config.cloudflare) {
                this.cloudflareManager = new CloudFlareManager(
                    this.config.cloudflare.apiToken,
                    this.config.cloudflare.zoneId,
                    this.config.cloudflare
                );
                this.logger.info('CloudFlareManager initialized');
            }
            
            this.logger.info('OwnServer Manager initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize OwnServer Manager', { error: error.message });
            throw error;
        }
    }

    /**
     * サーバー起動処理
     * 起動フロー: Minecraft Server起動 → ownserver起動 → エンドポイント取得 → DNS設定
     */
    async start() {
        // 起動処理の実装
    }

    /**
     * サーバー停止処理
     * 終了フロー: DNS削除 → ownserver停止 → Minecraft Server停止
     */
    async stop() {
        // 停止処理の実装
    }

    /**
     * 全サービスのステータス取得
     */
    async getStatus() {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const status = {
            minecraft: {
                running: false,
                port: 25565,
                onlinePlayers: 0,
                maxPlayers: 20,
                version: 'Unknown'
            },
            ownserver: {
                running: false,
                endpoint: null,
                tunnelStatus: 'Disconnected'
            },
            cloudflare: {
                dnsConfigured: false,
                domain: null,
                lastUpdate: null
            },
            dns: {
                configured: false,
                domain: null,
                cname: false,
                srv: false
            },
            health: {
                status: 'unknown',
                uptime: process.uptime(),
                lastCheck: new Date().toISOString()
            },
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version
            }
        };

        try {
            console.log('DEBUG: Starting status checks...');
            
            // 基本的なMinecraftプロセス検出
            try {
                const { stdout } = await execAsync('ps aux | grep "java.*server.jar" | grep -v grep');
                if (stdout.trim()) {
                    status.minecraft.running = true;
                    console.log('DEBUG: Minecraft detected via process');
                }
            } catch (error) {
                // プロセス検出失敗は無視
            }

            // OwnServerプロセス検出
            try {
                const { stdout } = await execAsync('ps aux | grep "ownserver.*--endpoint" | grep -v grep');
                if (stdout.trim()) {
                    status.ownserver.running = true;
                    console.log('DEBUG: OwnServer detected via process');
                    
                    // エンドポイント情報を抽出
                    const endpointMatch = stdout.match(/--endpoint\s+([^\s]+)/);
                    if (endpointMatch) {
                        status.ownserver.endpoint = endpointMatch[1];
                    }
                }
            } catch (error) {
                // プロセス検出失敗は無視
            }

            // ポート確認
            try {
                const { stdout } = await execAsync('netstat -ln | grep :25565');
                if (stdout.includes('25565')) {
                    status.minecraft.running = true;
                    console.log('DEBUG: Minecraft detected via port');
                }
            } catch (error) {
                // ポート確認失敗は無視
            }

            console.log('DEBUG: Basic checks complete, minecraft.running:', status.minecraft.running);

            // MinecraftServerManagerが利用可能な場合は詳細情報を取得
            if (this.minecraftManager) {
                try {
                    const mcStatus = await this.minecraftManager.getStatus();
                    status.minecraft = { ...status.minecraft, ...mcStatus };
                } catch (error) {
                    // MinecraftManager エラーは無視
                }
            }

            // OwnServer状態確認
            if (this.ownserverManager) {
                try {
                    const ownStatus = await this.ownserverManager.getStatus();
                    // プロセス検出結果を保持し、Manager情報で拡張
                    const processRunning = status.ownserver.running;
                    const processEndpoint = status.ownserver.endpoint;
                    status.ownserver = { ...status.ownserver, ...ownStatus };
                    // プロセス検出で見つかった場合は、その結果を優先
                    if (processRunning) {
                        status.ownserver.running = true;
                        if (processEndpoint) {
                            status.ownserver.endpoint = processEndpoint;
                        }
                    }
                } catch (error) {
                    // OwnServerManager エラーは無視
                }
            }

            // CloudFlare状態確認
            if (this.cloudflareManager) {
                try {
                    const cfStatus = await this.cloudflareManager.getStatus();
                    status.cloudflare = { ...status.cloudflare, ...cfStatus };
                    status.dns = {
                        configured: cfStatus.configured || false,
                        domain: cfStatus.domain || null,
                        cname: cfStatus.cname || false,
                        srv: cfStatus.srv || false
                    };
                } catch (error) {
                    status.dns = {
                        configured: false,
                        domain: this.config?.cloudflare?.domain || 'Unknown',
                        cname: false,
                        srv: false
                    };
                }
            } else {
                status.dns = {
                    configured: false,
                    domain: this.config?.cloudflare?.domain || 'Unknown',
                    cname: false,
                    srv: false
                };
            }

            console.log('DEBUG: DNS setup complete, status.dns:', status.dns);

            // Overall health status
            const allServicesRunning = status.minecraft.running && status.ownserver.running;
            const dnsConfigured = status.dns && status.dns.configured;
            
            if (allServicesRunning && dnsConfigured) {
                status.health.status = 'healthy';
            } else if (allServicesRunning || dnsConfigured) {
                status.health.status = 'partial';
            } else {
                status.health.status = 'unhealthy';
            }
        } catch (error) {
            this.logger.error('Status check failed', { error: error.message });
        }

        return status;
    }

    /**
     * ヘルスチェック実行
     */
    async runHealthCheck() {
        try {
            const results = {};
            
            // Minecraft サーバーヘルスチェック
            if (this.minecraftManager) {
                const start = Date.now();
                try {
                    const mcStatus = await this.minecraftManager.getStatus();
                    results.minecraft = {
                        status: mcStatus.running ? 'healthy' : 'stopped',
                        responseTime: Date.now() - start,
                        details: `Port: ${mcStatus.port || 25565}, Players: ${mcStatus.onlinePlayers || 0}`
                    };
                } catch (error) {
                    results.minecraft = {
                        status: 'error',
                        responseTime: Date.now() - start,
                        errors: [error.message]
                    };
                }
            }
            
            // OwnServer ヘルスチェック
            if (this.ownserverManager) {
                const start = Date.now();
                try {
                    const ownStatus = await this.ownserverManager.getStatus();
                    results.ownserver = {
                        status: ownStatus.running ? 'healthy' : 'stopped',
                        responseTime: Date.now() - start,
                        details: ownStatus.endpoint ? `Endpoint: ${ownStatus.endpoint}` : 'No endpoint'
                    };
                } catch (error) {
                    results.ownserver = {
                        status: 'error',
                        responseTime: Date.now() - start,
                        errors: [error.message]
                    };
                }
            }
            
            // CloudFlare ヘルスチェック
            if (this.cloudflareManager) {
                const start = Date.now();
                try {
                    const cfStatus = await this.cloudflareManager.getStatus();
                    results.cloudflare = {
                        status: cfStatus.configured ? 'healthy' : 'not_configured',
                        responseTime: Date.now() - start,
                        details: cfStatus.domain ? `Domain: ${cfStatus.domain}` : 'No domain configured'
                    };
                } catch (error) {
                    results.cloudflare = {
                        status: 'error',
                        responseTime: Date.now() - start,
                        errors: [error.message]
                    };
                }
            }
            
            return results;
        } catch (error) {
            this.logger.error('Health check failed', { error: error.message });
            throw error;
        }
    }

    /**
     * サーバー再起動
     */
    async restart() {
        this.logger.info('Restarting all services...');
        await this.stop();
        await this.start();
        this.logger.info('All services restarted');
    }

    /**
     * サーバーを公開状態にする
     */
    async setPublic() {
        try {
            this.logger.info('Setting server to public...');
            console.log('DEBUG: Starting setPublic process...');
            
            // 現在のOwnServerエンドポイント情報を取得
            let endpoint = null;
            
            // まず、すでに動作中のOwnServerからエンドポイントを取得
            const status = await this.getStatus();
            if (status.ownserver && status.ownserver.running) {
                console.log('DEBUG: OwnServer already running, getting endpoint...');
                // OwnServerのログからエンドポイント情報を抽出
                try {
                    const { exec } = require('child_process');
                    const { promisify } = require('util');
                    const execAsync = promisify(exec);
                    
                    // OwnServerのログファイルまたはプロセス出力から実際のエンドポイントを取得
                    const { stdout } = await execAsync('cat /tmp/ownserver.log || echo ""');
                    // 正しいパターンで外部エンドポイントを抽出
                    const endpointMatch = stdout.match(/tcp:\/\/([^:]+):(\d+)\s*\|$/m);
                    if (endpointMatch) {
                        endpoint = `${endpointMatch[1]}:${endpointMatch[2]}`;
                        console.log('DEBUG: Found endpoint from log:', endpoint);
                    } else {
                        // フォールバック：別のパターンを試す
                        const altMatch = stdout.match(/shard-\d+\.ownserver\.kumassy\.com:\d+/);
                        if (altMatch) {
                            endpoint = altMatch[0];
                            console.log('DEBUG: Found endpoint via alt pattern:', endpoint);
                        }
                    }
                } catch (error) {
                    console.log('DEBUG: Could not extract endpoint from log:', error.message);
                }
            } else {
                console.log('DEBUG: OwnServer not running, starting...');
                // OwnServer起動
                if (this.ownserverManager) {
                    endpoint = await this.ownserverManager.start();
                    console.log('DEBUG: Started OwnServer, endpoint:', endpoint);
                } else {
                    console.log('DEBUG: OwnServerManager not available');
                }
            }
            
            console.log('DEBUG: Final endpoint for DNS:', endpoint);
            
            // DNS設定
            let dnsResult = { success: false };
            if (this.cloudflareManager && endpoint) {
                console.log('DEBUG: Setting up DNS records...');
                
                // エンドポイントからホスト名とポートを分離
                const [hostname, port] = endpoint.split(':');
                
                // CNAMEレコード設定（play.cspd.net -> ownserver hostname）
                console.log(`DEBUG: Setting CNAME: play.cspd.net -> ${hostname}`);
                const cnameResult = await this.cloudflareManager.updateDnsRecord(
                    '', // 空文字列で root domain（play.cspd.net）
                    hostname, 
                    'CNAME'
                );
                
                // SRVレコード設定（Minecraft用）
                console.log(`DEBUG: Setting SRV: _minecraft._tcp.play.cspd.net -> ${hostname}:${port}`);
                const srvResult = await this.cloudflareManager.updateSrvRecord(
                    '_minecraft._tcp',
                    '', // 空文字列でルートドメイン
                    hostname,
                    parseInt(port),
                    0, // priority
                    5  // weight
                );
                
                dnsResult = {
                    success: cnameResult.success && srvResult.success,
                    cname: cnameResult.success,
                    srv: srvResult.success,
                    domain: 'play.cspd.net'
                };
                
                console.log('DEBUG: DNS results:', dnsResult);
            } else {
                console.log('DEBUG: CloudFlare manager not available or no endpoint');
            }
            
            const result = {
                success: true,
                endpoint: endpoint,
                domain: 'play.cspd.net',
                ownserver: true,
                dns: dnsResult.success,
                details: {
                    cname: dnsResult.cname,
                    srv: dnsResult.srv
                }
            };
            
            console.log('DEBUG: setPublic final result:', result);
            return result;
        } catch (error) {
            console.log('DEBUG: setPublic error:', error.message);
            this.logger.error('Failed to set public', { error: error.message });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * サーバーを非公開状態にする
     */
    async setPrivate() {
        try {
            this.logger.info('Setting server to private...');
            
            // DNS削除
            let dnsResult = { success: false };
            if (this.cloudflareManager) {
                dnsResult = await this.cloudflareManager.removeDnsRecord('minecraft', 'CNAME');
            }
            
            // OwnServer停止
            await this.ownserverManager.stop();
            
            return {
                success: true,
                ownserver: true,
                dns: dnsResult.success
            };
        } catch (error) {
            this.logger.error('Failed to set private', { error: error.message });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * アプリケーション終了
     */
    async shutdown() {
        this.logger.info('Shutting down application...');
        await this.stop();
        this.logger.info('Application shutdown complete');
    }

    /**
     * イベントハンドラーの設定
     */
    setupEventHandlers() {
        // 各マネージャーからのイベント処理
    }
}

module.exports = OwnServerManagerApp;

// メイン実行部分
if (require.main === module) {
    const app = new OwnServerManagerApp();
    
    // シグナルハンドリング
    process.on('SIGTERM', async () => {
        await app.stop();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        await app.stop();
        process.exit(0);
    });

    // アプリケーション開始
    app.initialize()
        .then(() => app.start())
        .catch(console.error);
}
