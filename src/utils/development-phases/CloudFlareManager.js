/**
 * CloudFlare Manager
 * CloudFlare APIを使用したDNSレコード管理
 * 
 * 機能:
 * - DNSレコードの作成・更新・削除
 * - ゾーン管理・検証
 * - TTL・プロキシ設定
 * - エラーハンドリング・リトライ
 * - DNS解決確認
 */

const https = require('https');
const { URL } = require('url');
const EventEmitter = require('events');

class CloudFlareManager extends EventEmitter {
    constructor(config, logger) {
        super();
        
        // 設定の処理を柔軟に
        this.config = config.cloudflare || config;
        this.logger = logger || console;
        
        // API設定
        this.apiToken = this.config.apiToken;
        this.email = this.config.email;
        this.globalApiKey = this.config.globalApiKey;
        this.zoneId = this.config.zoneId;
        this.domain = this.config.domain;
        this.baseUrl = 'https://api.cloudflare.com/client/v4';
        
        // デフォルト設定
        this.defaultTtl = this.config.ttl || 60;
        this.defaultProxied = this.config.proxied || false;
        this.retryAttempts = this.config.retryAttempts || 3;
        this.retryDelay = this.config.retryDelay || 1000;
        
        // 管理中のレコード
        this.managedRecords = new Map();
        
        if (!this.zoneId || !this.domain) {
            throw new Error('CloudFlare configuration incomplete: zoneId and domain are required');
        }
        
        if (!this.apiToken && !(this.globalApiKey && this.email)) {
            throw new Error('CloudFlare authentication incomplete: either apiToken or (globalApiKey + email) is required');
        }
        
        this.logger.info('CloudFlareManager initialized', {
            domain: this.domain,
            zoneId: this.zoneId,
            defaultTtl: this.defaultTtl,
            defaultProxied: this.defaultProxied
        });
    }
    
    /**
     * DNSレコードを更新（作成または既存を更新）
     */
    async updateRecord(subdomain, target, type = 'A', options = {}) {
        try {
            const recordName = `${subdomain}.${this.domain}`;
            this.logger.info('Updating DNS record', { 
                name: recordName, 
                target, 
                type 
            });
            
            // 既存レコード検索（実際のAPI使用）
            const existingRecords = await this._listDnsRecords(type, recordName);
            const existingRecord = existingRecords.find(record => 
                record.name === recordName && record.type === type
            );
            
            const recordData = {
                type: type,
                name: recordName,
                content: target,
                ttl: options.ttl || this.defaultTtl,
                proxied: options.proxied !== undefined ? options.proxied : this.defaultProxied
            };
            
            let result;
            if (existingRecord) {
                // 既存レコード更新（実際のAPI使用）
                result = await this._updateDnsRecord(existingRecord.id, recordData);
                this.logger.info('DNS record updated', { 
                    id: existingRecord.id, 
                    name: recordName,
                    target 
                });
            } else {
                // 新規レコード作成（実際のAPI使用）
                result = await this._createDnsRecord(recordData);
                this.logger.info('DNS record created', { 
                    id: result.id, 
                    name: recordName,
                    target 
                });
            }
            
            // 管理レコードに追加
            this.managedRecords.set(recordName, {
                id: result.id,
                type: type,
                content: target,
                ttl: recordData.ttl,
                proxied: recordData.proxied,
                createdAt: new Date()
            });
            
            this.emit('dns-record-updated', {
                name: recordName,
                target,
                type,
                id: result.id
            });
            
            // DNS伝播を待つ (オプション)
            if (options.waitForPropagation !== false) {
                await this._waitForDnsPropagation(recordName, target);
            }
            
            return {
                success: true,
                id: result.id,
                name: recordName,
                target,
                type
            };
            
        } catch (error) {
            this.logger.error('Failed to update DNS record', { 
                subdomain, 
                target, 
                error: error.message 
            });
            
            this.emit('dns-error', {
                operation: 'update',
                subdomain,
                target,
                error: error.message
            });
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * DNSレコードを削除
     */
    async deleteRecord(subdomain, type = 'A') {
        try {
            const recordName = `${subdomain}.${this.domain}`;
            this.logger.info('Deleting DNS record', { name: recordName, type });
            
            // レコード検索（実際のAPI使用）
            const records = await this._listDnsRecords(type, recordName);
            const record = records.find(r => r.name === recordName && r.type === type);
            
            if (!record) {
                this.logger.warn('DNS record not found for deletion', { name: recordName });
                return { success: true, message: 'Record not found' };
            }
            
            // レコード削除（実際のAPI使用）
            await this._deleteDnsRecord(record.id);
            
            // 管理レコードから削除
            this.managedRecords.delete(recordName);
            
            this.logger.info('DNS record deleted', { 
                id: record.id, 
                name: recordName 
            });
            
            this.emit('dns-record-deleted', {
                name: recordName,
                type,
                id: record.id
            });
            
            return {
                success: true,
                id: record.id,
                name: recordName,
                type
            };
            
        } catch (error) {
            this.logger.error('Failed to delete DNS record', { 
                subdomain, 
                error: error.message 
            });
            
            this.emit('dns-error', {
                operation: 'delete',
                subdomain,
                error: error.message
            });
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * ゾーンの全DNSレコードを取得
     */
    async getRecords(type = null) {
        try {
            // fetchベースの_makeApiCallを使用
            let endpoint = `/zones/${this.zoneId}/dns_records`;
            if (type) {
                endpoint += `?type=${type}`;
            }
            
            const records = await this._makeApiCall(endpoint);
            
            this.logger.debug('Retrieved DNS records', { 
                count: records.length,
                type 
            });
            
            return {
                success: true,
                records: records
            };
            
        } catch (error) {
            this.logger.error('Failed to get DNS records', { error: error.message });
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 管理中のレコード状態を取得
     */
    getManagedRecords() {
        return Array.from(this.managedRecords.entries()).map(([name, record]) => ({
            name,
            ...record
        }));
    }
    
    /**
     * DNS解決確認
     */
    async verifyRecord(subdomain, expectedTarget) {
        try {
            const recordName = `${subdomain}.${this.domain}`;
            
            // DNS解決を試行
            const dns = require('dns').promises;
            const addresses = await dns.resolve4(recordName);
            
            const resolved = addresses.includes(expectedTarget);
            
            this.logger.debug('DNS verification result', {
                name: recordName,
                expected: expectedTarget,
                resolved: addresses,
                success: resolved
            });
            
            return {
                success: resolved,
                name: recordName,
                expected: expectedTarget,
                resolved: addresses
            };
            
        } catch (error) {
            this.logger.warn('DNS verification failed', { 
                subdomain, 
                expectedTarget,
                error: error.message 
            });
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 既存レコード検索
     * @private
     */
    async _findRecord(name, type) {
        const response = await this._apiRequest('GET', 
            `/zones/${this.zoneId}/dns_records?name=${encodeURIComponent(name)}&type=${type}`
        );
        
        return response.result.length > 0 ? response.result[0] : null;
    }
    
    /**
     * 新規レコード作成
     * @private
     */
    async _createNewRecord(recordData) {
        const response = await this._apiRequest('POST', 
            `/zones/${this.zoneId}/dns_records`, 
            recordData
        );
        
        return response.result;
    }
    
    /**
     * 既存レコード更新
     * @private
     */
    async _updateExistingRecord(recordId, recordData) {
        const response = await this._apiRequest('PUT', 
            `/zones/${this.zoneId}/dns_records/${recordId}`, 
            recordData
        );
        
        return response.result;
    }
    
    /**
     * レコード削除
     * @private
     */
    async _deleteRecord(recordId) {
        const response = await this._apiRequest('DELETE', 
            `/zones/${this.zoneId}/dns_records/${recordId}`
        );
        
        return response.result;
    }
    
    /**
     * CloudFlare API リクエスト
     * @private
     */
    async _apiRequest(method, path, data = null, attempt = 1) {
        return new Promise((resolve, reject) => {
            // pathとbaseUrlを正しく結合
            const fullUrl = this.baseUrl + path;
            const url = new URL(fullUrl);
            
            // DEBUG: URL情報をloggerで出力
            this.logger.error('DEBUG _apiRequest:', {
                method,
                originalPath: path,
                baseUrl: this.baseUrl,
                fullUrl,
                finalHostname: url.hostname,
                finalPath: url.pathname + url.search
            });
            
            const options = {
                method: method,
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'ownserver-manager/1.0'
                }
            };
            
            const req = https.request(options, (res) => {
                let body = '';
                
                res.on('data', (chunk) => {
                    body += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(body);
                        
                        if (response.success) {
                            this.logger.debug('CloudFlare API success', {
                                method,
                                path,
                                status: res.statusCode
                            });
                            resolve(response);
                        } else {
                            const error = new Error(`CloudFlare API error: ${response.errors[0]?.message || 'Unknown error'}`);
                            error.errors = response.errors;
                            
                            // リトライ判定
                            if (attempt < this.retryAttempts && this._shouldRetry(res.statusCode)) {
                                this.logger.warn(`CloudFlare API error, retrying (${attempt}/${this.retryAttempts})`, {
                                    method,
                                    path,
                                    status: res.statusCode,
                                    errors: response.errors
                                });
                                
                                setTimeout(() => {
                                    this._apiRequest(method, path, data, attempt + 1)
                                        .then(resolve)
                                        .catch(reject);
                                }, this.retryDelay * attempt);
                            } else {
                                this.logger.error('CloudFlare API failed', {
                                    method,
                                    path,
                                    status: res.statusCode,
                                    errors: response.errors
                                });
                                reject(error);
                            }
                        }
                    } catch (parseError) {
                        reject(new Error(`Failed to parse CloudFlare API response: ${parseError.message}`));
                    }
                });
            });
            
            req.on('error', (error) => {
                if (attempt < this.retryAttempts) {
                    this.logger.warn(`CloudFlare API request error, retrying (${attempt}/${this.retryAttempts})`, {
                        method,
                        path,
                        error: error.message
                    });
                    
                    setTimeout(() => {
                        this._apiRequest(method, path, data, attempt + 1)
                            .then(resolve)
                            .catch(reject);
                    }, this.retryDelay * attempt);
                } else {
                    this.logger.error('CloudFlare API request failed', {
                        method,
                        path,
                        error: error.message
                    });
                    reject(error);
                }
            });
            
            // リクエストデータ送信
            if (data) {
                req.write(JSON.stringify(data));
            }
            
            req.end();
        });
    }
    
    /**
     * CloudFlare API認証ヘッダーを取得
     */
    _getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.apiToken) {
            headers['Authorization'] = `Bearer ${this.apiToken}`;
        } else if (this.globalApiKey && this.email) {
            headers['X-Auth-Email'] = this.email;
            headers['X-Auth-Key'] = this.globalApiKey;
        } else {
            throw new Error('CloudFlare API credentials not configured');
        }
        
        return headers;
    }
    
    /**
     * CloudFlare APIコール実行
     */
    async _makeApiCall(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = this._getHeaders();
        
        const options = {
            method,
            headers
        };
        
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }
        
        // DEBUG: URL情報を詳細出力
        console.log('DEBUG _makeApiCall:', {
            endpoint,
            baseUrl: this.baseUrl,
            fullUrl: url,
            method,
            headers: Object.keys(headers)
        });
        
        this.logger.debug('CloudFlare API call', { url, method, headers: Object.keys(headers) });
        
        try {
            const response = await fetch(url, options);
            const responseData = await response.json();
            
            console.log('DEBUG fetch response:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                url: response.url,
                success: responseData.success
            });
            
            if (!responseData.success) {
                const errorMessage = responseData.errors?.[0]?.message || 'Unknown CloudFlare API error';
                throw new Error(`CloudFlare API error: ${errorMessage}`);
            }
            
            return responseData.result;
            
        } catch (error) {
            this.logger.error('CloudFlare API call failed', { 
                url, 
                method, 
                error: error.message 
            });
            throw error;
        }
    }
    
    /**
     * ゾーン情報を取得
     */
    async _getZoneInfo() {
        return await this._makeApiCall(`/zones/${this.zoneId}`);
    }
    
    /**
     * DNSレコード一覧を取得
     */
    async _listDnsRecords(type = null, name = null) {
        let endpoint = `/zones/${this.zoneId}/dns_records`;
        const params = new URLSearchParams();
        
        if (type) params.append('type', type);
        if (name) params.append('name', name);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        
        return await this._makeApiCall(endpoint);
    }
    
    /**
     * DNSレコードを作成
     */
    async _createDnsRecord(recordData) {
        return await this._makeApiCall(`/zones/${this.zoneId}/dns_records`, 'POST', recordData);
    }
    
    /**
     * DNSレコードを更新
     */
    async _updateDnsRecord(recordId, recordData) {
        return await this._makeApiCall(`/zones/${this.zoneId}/dns_records/${recordId}`, 'PUT', recordData);
    }
    
    /**
     * DNSレコードを削除
     */
    async _deleteDnsRecord(recordId) {
        return await this._makeApiCall(`/zones/${this.zoneId}/dns_records/${recordId}`, 'DELETE');
    }

    /**
     * SRVレコードを作成・更新
     */
    async updateSrvRecord(service, subdomain, target, port, priority = 0, weight = 0, options = {}) {
        try {
            const serviceName = `${service}.${subdomain}.${this.domain}`;
            const srvContent = `${priority} ${weight} ${port} ${target}`;
            
            this.logger.info('Updating SRV record', { 
                name: serviceName, 
                target, 
                port,
                priority,
                weight
            });
            
            // 既存SRVレコード検索
            const existingRecords = await this._listDnsRecords('SRV', serviceName);
            const existingRecord = existingRecords.find(record => 
                record.name === serviceName && record.type === 'SRV'
            );
            
            const recordData = {
                type: 'SRV',
                name: serviceName,
                data: {
                    service: service.split('.')[0], // _minecraft
                    proto: service.split('.')[1], // _tcp
                    name: subdomain,
                    priority: priority,
                    weight: weight,
                    port: port,
                    target: target
                },
                ttl: options.ttl || this.defaultTtl,
                proxied: false // SRVレコードはプロキシ不可
            };
            
            let result;
            if (existingRecord) {
                // 既存レコード更新
                result = await this._updateDnsRecord(existingRecord.id, recordData);
                this.logger.info('SRV record updated', { 
                    id: existingRecord.id, 
                    name: serviceName,
                    data: recordData.data
                });
            } else {
                // 新規レコード作成
                result = await this._createDnsRecord(recordData);
                this.logger.info('SRV record created', { 
                    id: result.id, 
                    name: serviceName,
                    data: recordData.data
                });
            }
            
            // 管理レコードに追加
            this.managedRecords.set(serviceName, {
                id: result.id,
                type: 'SRV',
                data: recordData.data,
                ttl: recordData.ttl,
                priority,
                weight,
                port,
                target,
                createdAt: new Date()
            });
            
            this.emit('dns-srv-updated', {
                name: serviceName,
                target,
                port,
                priority,
                weight,
                id: result.id
            });
            
            return {
                success: true,
                id: result.id,
                name: serviceName,
                target,
                port,
                priority,
                weight
            };
            
        } catch (error) {
            this.logger.error('Failed to update SRV record', { 
                service,
                subdomain, 
                target,
                port,
                error: error.message 
            });
            
            this.emit('dns-error', {
                operation: 'srv-update',
                service,
                subdomain,
                target,
                port,
                error: error.message
            });
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Minecraft用DNS設定（CNAME + SRV自動設定）
     */
    async setMinecraftDns(subdomain, ownserverEndpoint) {
        try {
            // エンドポイント解析
            const { hostname, port } = this.parseEndpoint(ownserverEndpoint);
            
            this.logger.info('Setting Minecraft DNS', {
                subdomain,
                endpoint: ownserverEndpoint,
                hostname,
                port
            });
            
            const results = {};
            
            // 1. CNAMEレコード作成 (DNS検証スキップ)
            const cnameResult = await this.updateRecord(subdomain, hostname, 'CNAME', { waitForPropagation: false });
            results.cname = cnameResult;
            
            // 2. SRVレコード作成
            const srvResult = await this.updateSrvRecord('_minecraft._tcp', subdomain, hostname, port);
            results.srv = srvResult;
            
            this.emit('minecraft-dns-configured', {
                subdomain,
                hostname,
                port,
                results
            });
            
            return {
                success: cnameResult.success && srvResult.success,
                cname: cnameResult,
                srv: srvResult
            };
            
        } catch (error) {
            this.logger.error('Failed to set Minecraft DNS', {
                subdomain,
                endpoint: ownserverEndpoint,
                error: error.message
            });
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * エンドポイント解析ヘルパー
     */
    parseEndpoint(endpoint) {
        // URLまたはhost:port形式を解析
        if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
            const url = new URL(endpoint);
            return {
                hostname: url.hostname,
                port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80)
            };
        } else {
            const [hostname, port] = endpoint.split(':');
            return {
                hostname,
                port: parseInt(port) || 25565
            };
        }
    }

    /**
     * リトライ判定
     * @private
     */
    _shouldRetry(statusCode) {
        // サーバーエラーまたはレート制限でリトライ
        return statusCode >= 500 || statusCode === 429;
    }
    
    /**
     * DNS伝播待機
     * @private
     */
    async _waitForDnsPropagation(name, expectedTarget, timeout = 60000) {
        const startTime = Date.now();
        
        this.logger.debug('Waiting for DNS propagation', { name, expectedTarget });
        
        while (Date.now() - startTime < timeout) {
            const verification = await this.verifyRecord(name.replace(`.${this.domain}`, ''), expectedTarget);
            
            if (verification.success) {
                this.logger.info('DNS propagation confirmed', { 
                    name, 
                    target: expectedTarget,
                    duration: Date.now() - startTime 
                });
                return true;
            }
            
            // 5秒待機
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        this.logger.warn('DNS propagation timeout', { 
            name, 
            expectedTarget,
            timeout 
        });
        return false;
    }
    
    /**
     * 管理中のレコードをすべて削除
     */
    async cleanupManagedRecords() {
        this.logger.info('Cleaning up managed DNS records');
        
        const results = [];
        for (const [name, record] of this.managedRecords.entries()) {
            const subdomain = name.replace(`.${this.domain}`, '');
            const result = await this.deleteRecord(subdomain, record.type);
            results.push({ name, result });
        }
        
        return results;
    }
    
    /**
     * クリーンアップ処理
     */
    async cleanup() {
        this.logger.info('CloudFlareManager cleanup');
        this.removeAllListeners();
    }

    /**
     * DNS設定状況を取得
     */
    async getStatus() {
        try {
            const configured = !!(this.apiToken && this.zoneId && this.domain);
            const recordsResponse = await this.getRecords();
            const records = recordsResponse.success ? recordsResponse.records : [];
            
            // CNAMEとSRVレコードの存在確認
            const cnameExists = records.some(record => record.type === 'CNAME');
            const srvExists = records.some(record => record.type === 'SRV');
            
            return {
                configured: configured,
                domain: this.domain,
                cname: cnameExists,
                srv: srvExists,
                recordCount: records.length,
                lastChecked: new Date().toISOString()
            };
        } catch (error) {
            this.logger.warn('CloudFlare status check failed', { error: error.message });
            return {
                configured: false,
                domain: this.domain || 'Unknown',
                cname: false,
                srv: false,
                recordCount: 0,
                error: error.message,
                lastChecked: new Date().toISOString()
            };
        }
    }

    // === Method Aliases for Test Compatibility ===
    /**
     * Alias for updateRecord method (for test compatibility)
     */
    async updateDnsRecord(subdomain, target, type = 'A', options = {}) {
        return this.updateRecord(subdomain, target, type, options);
    }

    /**
     * Alias for deleteRecord method (for test compatibility)
     */
    async removeDnsRecord(subdomain, type = 'A') {
        return this.deleteRecord(subdomain, type);
    }
}

module.exports = CloudFlareManager;
