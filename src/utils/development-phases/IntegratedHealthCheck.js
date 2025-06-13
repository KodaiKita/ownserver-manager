/**
 * Integrated Health Check
 * システム全体の統合ヘルスチェック・監視・自動復旧
 * 
 * 機能:
 * - Minecraftサーバー状態監視
 * - OwnServer状態監視
 * - DNS解決確認
 * - 外部接続性確認
 * - 統合ヘルスレポート
 * - 自動復旧・障害対応
 * - パフォーマンス監視
 */

const EventEmitter = require('events');
const dns = require('dns').promises;
const https = require('https');
const http = require('http');

class IntegratedHealthCheck extends EventEmitter {
    constructor(minecraftManager, ownServerManager, cloudFlareManager, publicAccessManager, config, logger) {
        super();
        
        this.minecraftManager = minecraftManager;
        this.ownServerManager = ownServerManager;
        this.cloudFlareManager = cloudFlareManager;
        this.publicAccessManager = publicAccessManager;
        this.config = config.integration || {};
        this.logger = logger;
        
        // ヘルスチェック状態
        this.lastHealthCheck = null;
        this.healthHistory = [];
        this.consecutiveFailures = 0;
        this.isMonitoring = false;
        
        // 設定
        this.healthCheckInterval = this.config.healthCheckInterval || 30000;
        this.autoRecoveryEnabled = this.config.autoRecoveryEnabled || true;
        this.failureThreshold = this.config.failureThreshold || 3;
        this.historyRetention = this.config.historyRetention || 24 * 60 * 60 * 1000; // 24時間
        this.timeoutDuration = this.config.timeoutDuration || 10000;
        
        // 監視タイマー
        this.healthCheckTimer = null;
        
        // ヘルスチェック指標
        this.metrics = {
            totalChecks: 0,
            successfulChecks: 0,
            failedChecks: 0,
            averageResponseTime: 0,
            uptimePercentage: 0
        };
        
        this.logger.info('IntegratedHealthCheck initialized', {
            interval: this.healthCheckInterval,
            autoRecovery: this.autoRecoveryEnabled,
            failureThreshold: this.failureThreshold
        });
    }
    
    /**
     * 統合ヘルスチェックを開始
     */
    startMonitoring() {
        if (this.isMonitoring) {
            this.logger.warn('Health monitoring is already running');
            return;
        }
        
        this.logger.info('Starting integrated health monitoring');
        this.isMonitoring = true;
        
        // 初回チェック実行
        this.performHealthCheck();
        
        // 定期チェック開始
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.healthCheckInterval);
        
        this.emit('monitoring-started');
    }
    
    /**
     * 統合ヘルスチェックを停止
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            this.logger.warn('Health monitoring is not running');
            return;
        }
        
        this.logger.info('Stopping integrated health monitoring');
        this.isMonitoring = false;
        
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
        
        this.emit('monitoring-stopped');
    }
    
    /**
     * 統合ヘルスチェックを実行
     */
    async performHealthCheck() {
        const startTime = Date.now();
        
        try {
            this.logger.debug('Performing integrated health check...');
            
            // 各コンポーネントのヘルスチェック
            const [
                minecraftHealth,
                ownServerHealth, 
                dnsHealth,
                connectivityHealth
            ] = await Promise.allSettled([
                this.checkMinecraftServer(),
                this.checkOwnServer(),
                this.checkDNS(),
                this.checkPublicConnectivity()
            ]);
            
            // 結果集約
            const healthReport = {
                timestamp: new Date(),
                responseTime: Date.now() - startTime,
                minecraft: this._extractResult(minecraftHealth),
                ownserver: this._extractResult(ownServerHealth),
                dns: this._extractResult(dnsHealth),
                connectivity: this._extractResult(connectivityHealth),
                overall: 'healthy'
            };
            
            // 全体的な健全性判定
            const healthyComponents = [
                healthReport.minecraft.healthy,
                healthReport.ownserver.healthy,
                healthReport.dns.healthy,
                healthReport.connectivity.healthy
            ].filter(Boolean).length;
            
            const totalComponents = 4;
            const healthPercentage = (healthyComponents / totalComponents) * 100;
            
            if (healthPercentage === 100) {
                healthReport.overall = 'healthy';
                this.consecutiveFailures = 0;
            } else if (healthPercentage >= 75) {
                healthReport.overall = 'degraded';
            } else {
                healthReport.overall = 'unhealthy';
                this.consecutiveFailures++;
            }
            
            // 履歴とメトリクス更新
            this._updateHealthHistory(healthReport);
            this._updateMetrics(healthReport);
            
            this.lastHealthCheck = healthReport;
            
            this.logger.debug('Health check completed', {
                overall: healthReport.overall,
                responseTime: healthReport.responseTime,
                healthyComponents,
                totalComponents
            });
            
            this.emit('health-check-completed', healthReport);
            
            // 自動復旧判定
            if (this.autoRecoveryEnabled && healthReport.overall === 'unhealthy' && 
                this.consecutiveFailures >= this.failureThreshold) {
                
                await this._triggerAutoRecovery(healthReport);
            }
            
            return healthReport;
            
        } catch (error) {
            this.logger.error('Health check failed', { error: error.message });
            
            const errorReport = {
                timestamp: new Date(),
                responseTime: Date.now() - startTime,
                overall: 'error',
                error: error.message
            };
            
            this.emit('health-check-error', errorReport);
            return errorReport;
        }
    }
    
    /**
     * Minecraftサーバーのヘルスチェック
     */
    async checkMinecraftServer() {
        try {
            const status = this.minecraftManager.getStatus();
            
            return {
                healthy: status.status === 'running',
                status: status.status,
                uptime: status.uptime,
                playerCount: status.playerCount || 0,
                details: {
                    processId: status.processId,
                    memoryUsage: status.memoryUsage,
                    version: status.version
                }
            };
            
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
    
    /**
     * OwnServerのヘルスチェック
     */
    async checkOwnServer() {
        try {
            const status = this.ownServerManager.getStatus();
            const healthCheck = await this.ownServerManager.performHealthCheck();
            
            return {
                healthy: healthCheck.healthy,
                status: status.status,
                endpoint: status.endpoint,
                uptime: status.uptime,
                details: {
                    processId: status.processId,
                    isHealthy: status.isHealthy
                },
                healthCheck
            };
            
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
    
    /**
     * DNS解決のヘルスチェック
     */
    async checkDNS() {
        try {
            const publicAccessStatus = this.publicAccessManager.getPublicAccessStatus();
            
            if (publicAccessStatus.status !== 'enabled' || !publicAccessStatus.subdomain) {
                return {
                    healthy: true,
                    status: 'not-applicable',
                    reason: 'Public access not enabled'
                };
            }
            
            const domain = `${publicAccessStatus.subdomain}.${this.cloudFlareManager.domain}`;
            const startTime = Date.now();
            
            // DNS解決テスト
            const addresses = await Promise.race([
                dns.resolve4(domain),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('DNS resolution timeout')), this.timeoutDuration)
                )
            ]);
            
            const responseTime = Date.now() - startTime;
            
            return {
                healthy: addresses && addresses.length > 0,
                domain,
                addresses,
                responseTime,
                details: {
                    recordCount: addresses.length
                }
            };
            
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
    
    /**
     * 外部接続性のヘルスチェック
     */
    async checkPublicConnectivity() {
        try {
            const publicAccessStatus = this.publicAccessManager.getPublicAccessStatus();
            
            if (publicAccessStatus.status !== 'enabled' || !publicAccessStatus.publicUrl) {
                return {
                    healthy: true,
                    status: 'not-applicable',
                    reason: 'Public access not enabled'
                };
            }
            
            const connectivityTest = await this.publicAccessManager.testConnectivity();
            
            return {
                healthy: connectivityTest.success,
                url: publicAccessStatus.publicUrl,
                ...connectivityTest
            };
            
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
    
    /**
     * 現在のヘルスステータスを取得
     */
    getHealthStatus() {
        return {
            lastCheck: this.lastHealthCheck,
            isMonitoring: this.isMonitoring,
            consecutiveFailures: this.consecutiveFailures,
            metrics: this.metrics,
            uptime: this._calculateUptime()
        };
    }
    
    /**
     * ヘルス履歴を取得
     */
    getHealthHistory(limit = 100) {
        return this.healthHistory
            .slice(-limit)
            .map(entry => ({
                timestamp: entry.timestamp,
                overall: entry.overall,
                responseTime: entry.responseTime,
                components: {
                    minecraft: entry.minecraft.healthy,
                    ownserver: entry.ownserver.healthy,
                    dns: entry.dns.healthy,
                    connectivity: entry.connectivity.healthy
                }
            }));
    }
    
    /**
     * パフォーマンスメトリクスを取得
     */
    getMetrics() {
        return {
            ...this.metrics,
            uptime: this._calculateUptime(),
            healthHistory: this.getHealthHistory(24), // 過去24回
            lastCheck: this.lastHealthCheck?.timestamp
        };
    }
    
    /**
     * 結果抽出ヘルパー
     * @private
     */
    _extractResult(promiseResult) {
        if (promiseResult.status === 'fulfilled') {
            return promiseResult.value;
        } else {
            return {
                healthy: false,
                error: promiseResult.reason?.message || 'Unknown error'
            };
        }
    }
    
    /**
     * ヘルス履歴更新
     * @private
     */
    _updateHealthHistory(healthReport) {
        this.healthHistory.push(healthReport);
        
        // 履歴サイズ制限（古いエントリ削除）
        const cutoffTime = Date.now() - this.historyRetention;
        this.healthHistory = this.healthHistory.filter(
            entry => entry.timestamp.getTime() > cutoffTime
        );
    }
    
    /**
     * メトリクス更新
     * @private
     */
    _updateMetrics(healthReport) {
        this.metrics.totalChecks++;
        
        if (healthReport.overall === 'healthy') {
            this.metrics.successfulChecks++;
        } else {
            this.metrics.failedChecks++;
        }
        
        // 平均レスポンス時間更新
        this.metrics.averageResponseTime = (
            (this.metrics.averageResponseTime * (this.metrics.totalChecks - 1) + 
             healthReport.responseTime) / this.metrics.totalChecks
        );
        
        // アップタイム割合計算
        this.metrics.uptimePercentage = (
            this.metrics.successfulChecks / this.metrics.totalChecks
        ) * 100;
    }
    
    /**
     * アップタイム計算
     * @private
     */
    _calculateUptime() {
        if (this.healthHistory.length === 0) {
            return { percentage: 100, duration: 0 };
        }
        
        const recentHistory = this.healthHistory.slice(-100); // 最近100回
        const healthyCount = recentHistory.filter(entry => entry.overall === 'healthy').length;
        const percentage = (healthyCount / recentHistory.length) * 100;
        
        const oldestEntry = this.healthHistory[0];
        const duration = Date.now() - oldestEntry.timestamp.getTime();
        
        return { percentage, duration };
    }
    
    /**
     * 自動復旧トリガー
     * @private
     */
    async _triggerAutoRecovery(healthReport) {
        this.logger.warn('Triggering auto-recovery due to consecutive failures', {
            consecutiveFailures: this.consecutiveFailures,
            threshold: this.failureThreshold
        });
        
        const recoveryActions = [];
        
        try {
            // Minecraftサーバー復旧
            if (!healthReport.minecraft.healthy) {
                this.logger.info('Attempting Minecraft server recovery...');
                const result = await this.minecraftManager.restart();
                recoveryActions.push({
                    component: 'minecraft',
                    action: 'restart',
                    success: result.success,
                    error: result.error
                });
            }
            
            // OwnServer復旧
            if (!healthReport.ownserver.healthy) {
                this.logger.info('Attempting OwnServer recovery...');
                const result = await this.ownServerManager.restart();
                recoveryActions.push({
                    component: 'ownserver',
                    action: 'restart',
                    success: result.success,
                    error: result.error
                });
            }
            
            // DNS/接続性復旧
            if (!healthReport.dns.healthy || !healthReport.connectivity.healthy) {
                const publicStatus = this.publicAccessManager.getPublicAccessStatus();
                if (publicStatus.status === 'enabled') {
                    this.logger.info('Attempting public access recovery...');
                    
                    // 一度無効化してから再有効化
                    await this.publicAccessManager.disablePublicAccess();
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    const result = await this.publicAccessManager.enablePublicAccess(publicStatus.subdomain);
                    
                    recoveryActions.push({
                        component: 'public-access',
                        action: 'restart',
                        success: result.success,
                        error: result.error
                    });
                }
            }
            
            this.logger.info('Auto-recovery completed', { 
                actions: recoveryActions.length,
                successful: recoveryActions.filter(a => a.success).length
            });
            
            this.emit('auto-recovery-triggered', {
                timestamp: new Date(),
                reason: 'consecutive-failures',
                actions: recoveryActions,
                healthReport
            });
            
            // 失敗カウンターリセット
            this.consecutiveFailures = 0;
            
        } catch (error) {
            this.logger.error('Auto-recovery failed', { error: error.message });
            
            this.emit('auto-recovery-failed', {
                timestamp: new Date(),
                error: error.message,
                actions: recoveryActions
            });
        }
    }
    
    /**
     * クリーンアップ
     */
    async cleanup() {
        this.logger.info('IntegratedHealthCheck cleanup');
        
        this.stopMonitoring();
        this.removeAllListeners();
        
        // 履歴クリア
        this.healthHistory = [];
        this.lastHealthCheck = null;
    }
}

module.exports = IntegratedHealthCheck;
