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
        
        this.config = config.cloudflare || {};
        this.logger = logger;
        
        // API設定
        this.apiToken = this.config.apiToken;
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
        
        if (!this.apiToken || !this.zoneId || !this.domain) {
            throw new Error('CloudFlare configuration incomplete: apiToken, zoneId, and domain are required');
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
            
            // 既存レコード検索
            const existingRecord = await this._findRecord(recordName, type);
            
            const recordData = {
                type: type,
                name: recordName,
                content: target,
                ttl: options.ttl || this.defaultTtl,
                proxied: options.proxied !== undefined ? options.proxied : this.defaultProxied
            };
            
            let result;
            if (existingRecord) {
                // 既存レコード更新
                result = await this._updateExistingRecord(existingRecord.id, recordData);
                this.logger.info('DNS record updated', { 
                    id: existingRecord.id, 
                    name: recordName,
                    target 
                });
            } else {
                // 新規レコード作成
                result = await this._createNewRecord(recordData);
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
            
            // DNS伝播を待つ
            await this._waitForDnsPropagation(recordName, target);
            
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
            
            // レコード検索
            const record = await this._findRecord(recordName, type);
            if (!record) {
                this.logger.warn('DNS record not found for deletion', { name: recordName });
                return { success: true, message: 'Record not found' };
            }
            
            // レコード削除
            await this._deleteRecord(record.id);
            
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
            let url = `/zones/${this.zoneId}/dns_records`;
            if (type) {
                url += `?type=${type}`;
            }
            
            const response = await this._apiRequest('GET', url);
            
            this.logger.debug('Retrieved DNS records', { 
                count: response.result.length,
                type 
            });
            
            return {
                success: true,
                records: response.result
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
            const url = new URL(path, this.baseUrl);
            
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
     * クリーンアップ
     */
    async cleanup() {
        this.logger.info('CloudFlareManager cleanup');
        this.removeAllListeners();
    }
}

module.exports = CloudFlareManager;
