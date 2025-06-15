/**
 * CloudFlare DNS Manager
 * CloudFlare DNS APIを使用したDNSレコード管理
 */

const EventEmitter = require('events');
const Logger = require('../utils/Logger');

// Node.js 18+ の fetch を使用
const fetch = globalThis.fetch;

class CloudFlareManager extends EventEmitter {
    constructor(apiToken, zoneId, config) {
        super();
        this.apiToken = apiToken;
        this.zoneId = zoneId;
        this.config = config;
        this.logger = new Logger('cloudflare');
        this.baseURL = 'https://api.cloudflare.com/client/v4';
    }

    /**
     * Minecraft用DNS設定の適用
     * @param {string} domain - カスタムドメイン (例: play.cspd.net)
     * @param {string} endpoint - ownserverエンドポイント (例: shard-2509.ownserver.kumassy.com:15440)
     * @param {Object} options - オプション設定
     * @returns {Promise<void>}
     */
    async setMinecraftDNS(domain, endpoint, options = {}) {
        try {
            const { host, port } = this.parseEndpoint(endpoint);
            
            this.logger.info(`Setting up DNS for ${domain} → ${host}:${port}`);
            
            // 1. CNAMEレコード作成/更新: domain → ownserverホスト
            await this.createOrUpdateCNAME(domain, host);
            
            // 2. SRVレコード作成/更新: _minecraft._tcp.domain → ownserverエンドポイント
            await this.createOrUpdateSRV('_minecraft._tcp', domain, host, port);
            
            this.logger.info(`DNS setup completed for ${domain}`);
            this.emit('dnsUpdated', { domain, endpoint, host, port });
            
        } catch (error) {
            this.logger.error(`Failed to set DNS for ${domain}:`, error);
            throw error;
        }
    }

    /**
     * Minecraft用DNS設定の削除
     * @param {string} domain - カスタムドメイン
     * @returns {Promise<void>}
     */
    async removeMinecraftDNS(domain) {
        // DNS削除処理
        // 1. SRVレコード削除
        // 2. CNAMEレコード削除
        // 3. エラー時のログ出力
    }

    /**
     * CNAMEレコードの作成/更新
     * @private
     * @param {string} name - レコード名
     * @param {string} content - レコード内容
     * @returns {Promise<Object>}
     */
    async createOrUpdateCNAME(name, content) {
        // CNAME レコード操作
        // - 既存レコード確認
        // - 新規作成 または 更新
        // - レスポンス処理
    }

    /**
     * SRVレコードの作成/更新
     * @private
     * @param {string} service - サービス名 (_minecraft._tcp)
     * @param {string} name - ドメイン名
     * @param {string} target - ターゲットホスト
     * @param {number} port - ポート番号
     * @returns {Promise<Object>}
     */
    async createOrUpdateSRV(service, name, target, port) {
        // SRV レコード操作
        // - priority: 0, weight: 0 で設定
        // - 既存レコード確認
        // - 新規作成 または 更新
    }

    /**
     * DNSレコードの削除
     * @private
     * @param {string} recordId - レコードID
     * @returns {Promise<void>}
     */
    async deleteRecord(recordId) {
        // レコード削除処理
        // - API呼び出し
        // - エラーハンドリング
    }

    /**
     * 既存レコードの検索
     * @private
     * @param {string} name - レコード名
     * @param {string} type - レコードタイプ (CNAME, SRV)
     * @returns {Promise<Object|null>}
     */
    async findExistingRecord(name, type) {
        // レコード検索処理
        // - ゾーン内レコード一覧取得
        // - 条件に一致するレコード検索
    }

    /**
     * エンドポイントからホストとポートを分離
     * @private
     * @param {string} endpoint - エンドポイント (host:port形式)
     * @returns {Object} {host, port}
     */
    parseEndpoint(endpoint) {
        try {
            // 例: "shard-2509.ownserver.kumassy.com:15440" → {host: "shard-2509.ownserver.kumassy.com", port: 15440}
            if (!endpoint || typeof endpoint !== 'string') {
                throw new Error('Invalid endpoint format');
            }
            
            const parts = endpoint.split(':');
            if (parts.length !== 2) {
                throw new Error('Endpoint must be in format "host:port"');
            }
            
            const host = parts[0].trim();
            const port = parseInt(parts[1].trim(), 10);
            
            if (!host || isNaN(port) || port <= 0 || port > 65535) {
                throw new Error('Invalid host or port in endpoint');
            }
            
            return { host, port };
            
        } catch (error) {
            this.logger.error(`Failed to parse endpoint "${endpoint}":`, error);
            throw error;
        }
    }

    /**
     * CloudFlare API リクエスト
     * @private
     * @param {string} method - HTTPメソッド
     * @param {string} path - APIパス
     * @param {Object} data - リクエストデータ
     * @returns {Promise<Object>}
     */
    async apiRequest(method, path, data = null) {
        const url = `${this.baseURL}${path}`;
        const options = {
            method: method.toUpperCase(),
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (data && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            const responseData = await response.json();
            
            if (!response.ok) {
                throw new Error(`CloudFlare API Error: ${response.status} ${response.statusText} - ${JSON.stringify(responseData)}`);
            }
            
            return responseData;
        } catch (error) {
            this.logger.error(`CloudFlare API request failed: ${method} ${path}`, { error: error.message });
            throw error;
        }
    }
    
    /**
     * List zones (for testing API connectivity)
     * @returns {Promise<Array>} List of zones
     */
    async listZones() {
        try {
            const response = await this.apiRequest('GET', '/zones');
            return response.result || [];
        } catch (error) {
            this.logger.error('Failed to list zones', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Test API connectivity
     * @returns {Promise<Object>} Test result
     */
    async testConnection() {
        try {
            const startTime = Date.now();
            const zones = await this.listZones();
            const responseTime = Date.now() - startTime;
            
            return {
                success: true,
                responseTime,
                zonesCount: zones.length,
                zones: zones.slice(0, 3).map(z => ({ id: z.id, name: z.name })) // 最初の3つのゾーンのみ表示
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                responseTime: 0
            };
        }
    }
    
    /**
     * Get current status of CloudFlare connection
     * @returns {Object} Status information
     */
    getStatus() {
        try {
            return {
                status: this.apiToken && this.zoneId ? 'configured' : 'not_configured',
                details: {
                    apiToken: this.apiToken ? 'set' : 'missing',
                    zoneId: this.zoneId ? 'set' : 'missing',
                    baseURL: this.baseURL,
                    domain: this.config?.domain || 'not_configured'
                },
                responseTime: 0
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                responseTime: 0
            };
        }
    }
}

module.exports = CloudFlareManager;
