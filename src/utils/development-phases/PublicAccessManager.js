/**
 * Public Access Manager
 * MinecraftサーバーとOwnServerの外部公開統合管理
 * 
 * 機能:
 * - OwnServerとCloudFlareの統合制御
 * - 外部公開の有効化・無効化
 * - エンドポイント管理・監視
 * - 接続性テスト・ヘルスチェック
 * - 自動復旧・障害処理
 * - セキュリティ・アクセス制御
 */

const EventEmitter = require('events');
const https = require('https');
const http = require('http');

class PublicAccessManager extends EventEmitter {
    constructor(ownServerManager, cloudFlareManager, config, logger) {
        super();
        
        this.ownServerManager = ownServerManager;
        this.cloudFlareManager = cloudFlareManager;
        this.config = config.publicAccess || {};
        this.logger = logger;
        
        // 状態管理
        this.publicStatus = 'disabled';
        this.currentSubdomain = null;
        this.currentEndpoint = null;
        this.publicUrl = null;
        this.enabledAt = null;
        
        // 設定
        this.autoEnable = this.config.autoEnable || false;
        this.healthCheckEnabled = this.config.healthCheckEnabled || true;
        this.connectivityTestInterval = this.config.connectivityTestInterval || 60000;
        this.autoRecovery = this.config.autoRecovery || true;
        this.defaultSubdomain = this.config.defaultSubdomain || 'minecraft';
        
        // 監視タイマー
        this.connectivityTimer = null;
        this.healthCheckTimer = null;
        
        // イベントリスナー設定
        this._setupEventListeners();
        
        this.logger.info('PublicAccessManager initialized', {
            autoEnable: this.autoEnable,
            healthCheckEnabled: this.healthCheckEnabled,
            defaultSubdomain: this.defaultSubdomain
        });
    }
    
    /**
     * 外部公開を有効化
     */
    async enablePublicAccess(subdomain = null) {
        if (this.publicStatus === 'enabled') {
            this.logger.warn('Public access is already enabled');
            return { success: true, message: 'Already enabled' };
        }
        
        if (this.publicStatus === 'enabling') {
            this.logger.warn('Public access is already being enabled');
            return { success: false, message: 'Already enabling' };
        }
        
        try {
            this.logger.info('Enabling public access...', { subdomain });
            this.publicStatus = 'enabling';
            this.currentSubdomain = subdomain || this.defaultSubdomain;
            
            // 1. OwnServer起動確認
            await this._ensureOwnServerRunning();
            
            // 2. エンドポイント取得
            const endpoint = await this._getOwnServerEndpoint();
            if (!endpoint) {
                throw new Error('OwnServer endpoint not available');
            }
            
            // 3. CloudFlare DNS更新
            const dnsResult = await this._updateDnsRecord(endpoint);
            if (!dnsResult.success) {
                throw new Error(`DNS update failed: ${dnsResult.error}`);
            }
            
            // 4. 接続性確認
            const connectivityCheck = await this._testPublicConnectivity();
            if (!connectivityCheck.success) {
                this.logger.warn('Initial connectivity test failed, but proceeding...', connectivityCheck);
            }
            
            // 5. 状態更新
            this.publicStatus = 'enabled';
            this.currentEndpoint = endpoint;
            this.publicUrl = `https://${this.currentSubdomain}.${this.cloudFlareManager.domain}`;
            this.enabledAt = new Date();
            
            // 6. 監視開始
            this._startMonitoring();
            
            this.logger.info('Public access enabled successfully', {
                subdomain: this.currentSubdomain,
                endpoint: this.currentEndpoint,
                publicUrl: this.publicUrl
            });
            
            this.emit('public-access-enabled', {
                subdomain: this.currentSubdomain,
                endpoint: this.currentEndpoint,
                publicUrl: this.publicUrl,
                enabledAt: this.enabledAt
            });
            
            return {
                success: true,
                subdomain: this.currentSubdomain,
                endpoint: this.currentEndpoint,
                publicUrl: this.publicUrl
            };
            
        } catch (error) {
            this.logger.error('Failed to enable public access', { error: error.message });
            this.publicStatus = 'error';
            
            // クリーンアップ試行
            await this._cleanupFailedEnable();
            
            this.emit('public-access-error', {
                operation: 'enable',
                error: error.message
            });
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 外部公開を無効化
     */
    async disablePublicAccess() {
        if (this.publicStatus === 'disabled') {
            this.logger.warn('Public access is already disabled');
            return { success: true, message: 'Already disabled' };
        }
        
        try {
            this.logger.info('Disabling public access...', {
                subdomain: this.currentSubdomain
            });
            
            this.publicStatus = 'disabling';
            
            // 1. 監視停止
            this._stopMonitoring();
            
            // 2. DNS削除
            if (this.currentSubdomain) {
                const dnsResult = await this.cloudFlareManager.deleteRecord(this.currentSubdomain);
                if (!dnsResult.success) {
                    this.logger.warn('DNS deletion failed', { error: dnsResult.error });
                }
            }
            
            // 3. 状態クリア
            const previousState = {
                subdomain: this.currentSubdomain,
                endpoint: this.currentEndpoint,
                publicUrl: this.publicUrl,
                enabledAt: this.enabledAt
            };
            
            this.publicStatus = 'disabled';
            this.currentSubdomain = null;
            this.currentEndpoint = null;
            this.publicUrl = null;
            this.enabledAt = null;
            
            this.logger.info('Public access disabled successfully');
            
            this.emit('public-access-disabled', previousState);
            
            return {
                success: true,
                previousState
            };
            
        } catch (error) {
            this.logger.error('Failed to disable public access', { error: error.message });
            
            this.emit('public-access-error', {
                operation: 'disable',
                error: error.message
            });
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 外部公開状態を取得
     */
    getPublicAccessStatus() {
        return {
            status: this.publicStatus,
            subdomain: this.currentSubdomain,
            endpoint: this.currentEndpoint,
            publicUrl: this.publicUrl,
            enabledAt: this.enabledAt,
            uptime: this.enabledAt ? Date.now() - this.enabledAt.getTime() : 0,
            isHealthy: this.publicStatus === 'enabled' && this.currentEndpoint !== null
        };
    }
    
    /**
     * 公開エンドポイントを取得
     */
    getPublicEndpoint() {
        return {
            publicUrl: this.publicUrl,
            subdomain: this.currentSubdomain,
            endpoint: this.currentEndpoint,
            domain: this.cloudFlareManager.domain
        };
    }
    
    /**
     * 接続性テストを実行
     */
    async testConnectivity() {
        if (this.publicStatus !== 'enabled') {
            return { success: false, reason: 'Public access not enabled' };
        }
        
        return await this._testPublicConnectivity();
    }
    
    /**
     * OwnServer起動確認
     * @private
     */
    async _ensureOwnServerRunning() {
        const status = this.ownServerManager.getStatus();
        
        if (status.status === 'running') {
            this.logger.debug('OwnServer is already running');
            return;
        }
        
        if (status.status === 'starting') {
            this.logger.info('Waiting for OwnServer to start...');
            await this._waitForOwnServerStatus('running', 60000);
            return;
        }
        
        // OwnServer起動
        this.logger.info('Starting OwnServer for public access...');
        const startResult = await this.ownServerManager.start();
        
        if (!startResult.success) {
            throw new Error(`Failed to start OwnServer: ${startResult.error}`);
        }
        
        // 起動完了待機
        await this._waitForOwnServerStatus('running', 60000);
    }
    
    /**
     * OwnServerエンドポイント取得
     * @private
     */
    async _getOwnServerEndpoint() {
        const status = this.ownServerManager.getStatus();
        
        if (status.endpoint) {
            return status.endpoint;
        }
        
        // エンドポイント検出待機
        this.logger.info('Waiting for OwnServer endpoint...');
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('OwnServer endpoint detection timeout'));
            }, 30000);
            
            const checkEndpoint = () => {
                const currentStatus = this.ownServerManager.getStatus();
                if (currentStatus.endpoint) {
                    clearTimeout(timeout);
                    resolve(currentStatus.endpoint);
                } else {
                    setTimeout(checkEndpoint, 1000);
                }
            };
            
            checkEndpoint();
        });
    }
    
    /**
     * DNS レコード更新
     * @private
     */
    async _updateDnsRecord(endpoint) {
        try {
            // エンドポイントからホストとポートを抽出
            const url = new URL(endpoint);
            const target = url.hostname;
            
            this.logger.info('Updating DNS record for public access', {
                subdomain: this.currentSubdomain,
                target,
                endpoint
            });
            
            return await this.cloudFlareManager.updateRecord(
                this.currentSubdomain,
                target,
                'A'
            );
            
        } catch (error) {
            this.logger.error('Failed to parse endpoint for DNS update', {
                endpoint,
                error: error.message
            });
            
            return {
                success: false,
                error: `Invalid endpoint format: ${error.message}`
            };
        }
    }
    
    /**
     * 公開接続性テスト
     * @private
     */
    async _testPublicConnectivity() {
        if (!this.publicUrl) {
            return { success: false, reason: 'No public URL available' };
        }
        
        try {
            this.logger.debug('Testing public connectivity', { url: this.publicUrl });
            
            const testResult = await this._httpRequest(this.publicUrl, 'GET', 5000);
            
            return {
                success: true,
                statusCode: testResult.statusCode,
                responseTime: testResult.responseTime,
                url: this.publicUrl
            };
            
        } catch (error) {
            this.logger.warn('Public connectivity test failed', {
                url: this.publicUrl,
                error: error.message
            });
            
            return {
                success: false,
                reason: error.message,
                url: this.publicUrl
            };
        }
    }
    
    /**
     * HTTP リクエスト実行
     * @private
     */
    async _httpRequest(url, method = 'GET', timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const parsedUrl = new URL(url);
            const isHttps = parsedUrl.protocol === 'https:';
            const client = isHttps ? https : http;
            
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: method,
                timeout: timeout,
                headers: {
                    'User-Agent': 'ownserver-manager/1.0'
                }
            };
            
            const req = client.request(options, (res) => {
                const responseTime = Date.now() - startTime;
                
                // レスポンスデータを消費（メモリリーク防止）
                res.on('data', () => {});
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        responseTime,
                        headers: res.headers
                    });
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            req.end();
        });
    }
    
    /**
     * OwnServer状態変化を待つ
     * @private
     */
    async _waitForOwnServerStatus(targetStatus, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkStatus = () => {
                const status = this.ownServerManager.getStatus();
                
                if (status.status === targetStatus) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout waiting for OwnServer status: ${targetStatus}`));
                } else {
                    setTimeout(checkStatus, 1000);
                }
            };
            
            checkStatus();
        });
    }
    
    /**
     * 失敗時のクリーンアップ
     * @private
     */
    async _cleanupFailedEnable() {
        try {
            // DNS削除
            if (this.currentSubdomain) {
                await this.cloudFlareManager.deleteRecord(this.currentSubdomain);
            }
            
            // 状態リセット
            this.publicStatus = 'disabled';
            this.currentSubdomain = null;
            this.currentEndpoint = null;
            this.publicUrl = null;
            
        } catch (error) {
            this.logger.error('Cleanup after failed enable failed', { error: error.message });
        }
    }
    
    /**
     * 監視開始
     * @private
     */
    _startMonitoring() {
        if (this.healthCheckEnabled && this.connectivityTestInterval > 0) {
            this.connectivityTimer = setInterval(async () => {
                const result = await this.testConnectivity();
                
                if (!result.success) {
                    this.logger.warn('Public connectivity check failed', result);
                    
                    this.emit('connectivity-check-failed', result);
                    
                    // 自動復旧試行
                    if (this.autoRecovery) {
                        await this._attemptAutoRecovery();
                    }
                } else {
                    this.logger.debug('Public connectivity check passed', result);
                }
            }, this.connectivityTestInterval);
        }
    }
    
    /**
     * 監視停止
     * @private
     */
    _stopMonitoring() {
        if (this.connectivityTimer) {
            clearInterval(this.connectivityTimer);
            this.connectivityTimer = null;
        }
    }
    
    /**
     * 自動復旧試行
     * @private
     */
    async _attemptAutoRecovery() {
        this.logger.info('Attempting auto-recovery for public access...');
        
        try {
            // OwnServer状態確認
            const ownServerStatus = this.ownServerManager.getStatus();
            if (ownServerStatus.status !== 'running') {
                this.logger.info('Restarting OwnServer for recovery...');
                await this.ownServerManager.restart();
            }
            
            // DNS確認・更新
            if (this.currentEndpoint) {
                const dnsResult = await this._updateDnsRecord(this.currentEndpoint);
                if (!dnsResult.success) {
                    throw new Error(`DNS update failed: ${dnsResult.error}`);
                }
            }
            
            this.logger.info('Auto-recovery completed successfully');
            
            this.emit('auto-recovery-success', {
                timestamp: new Date(),
                actions: ['ownserver-check', 'dns-update']
            });
            
        } catch (error) {
            this.logger.error('Auto-recovery failed', { error: error.message });
            
            this.emit('auto-recovery-failed', {
                timestamp: new Date(),
                error: error.message
            });
        }
    }
    
    /**
     * イベントリスナー設定
     * @private
     */
    _setupEventListeners() {
        // OwnServerイベント
        this.ownServerManager.on('ownserver-stopped', () => {
            if (this.publicStatus === 'enabled') {
                this.logger.warn('OwnServer stopped while public access enabled');
                this.emit('public-access-disrupted', { reason: 'ownserver-stopped' });
            }
        });
        
        this.ownServerManager.on('ownserver-error', (error) => {
            if (this.publicStatus === 'enabled') {
                this.logger.error('OwnServer error while public access enabled', { error });
                this.emit('public-access-disrupted', { reason: 'ownserver-error', error });
            }
        });
        
        // CloudFlareイベント
        this.cloudFlareManager.on('dns-error', (error) => {
            if (this.publicStatus === 'enabled') {
                this.logger.error('DNS error while public access enabled', { error });
                this.emit('public-access-disrupted', { reason: 'dns-error', error });
            }
        });
    }
    
    /**
     * クリーンアップ
     */
    async cleanup() {
        this.logger.info('PublicAccessManager cleanup');
        
        if (this.publicStatus === 'enabled') {
            await this.disablePublicAccess();
        }
        
        this._stopMonitoring();
        this.removeAllListeners();
    }
}

module.exports = PublicAccessManager;
