/**
 * Minecraft Server Manager - Phase 3
 * OwnServer連携による外部公開統合管理システム
 * 
 * Phase3の新機能:
 * - OwnServer自動管理・制御
 * - CloudFlare DNS自動更新
 * - 外部アクセス管理・監視
 * - 統合ヘルスチェック・自動復旧
 * - 外部公開状態の一元管理
 * - セキュリティ・アクセス制御
 * 
 * 継承機能 (Phase1 + Phase2):
 * - Java自動ダウンロード・管理
 * - Minecraftサーバープロセス起動・停止
 * - 基本ログ統合（Logger連携）
 * - リアルタイムログ解析・パース
 * - コンソールコマンド送信機能
 * - サーバー状態自動検出
 * - プレイヤー参加/離脱監視
 * - 自動再起動機能
 */

const MinecraftServerManager_Phase2 = require('./MinecraftServerManager_Phase2');
const OwnServerManager = require('./OwnServerManager');
const CloudFlareManager = require('./CloudFlareManager');
const PublicAccessManager = require('./PublicAccessManager');
const IntegratedHealthCheck = require('./IntegratedHealthCheck');
const EventEmitter = require('events');

class MinecraftServerManager_Phase3 extends MinecraftServerManager_Phase2 {
    constructor(serverDirectory, config) {
        super(serverDirectory, config);
        
        // Phase3アップグレード
        this.implementationPhase = 'Phase3';
        
        // 全フェーズの機能リスト（Phase1, Phase2, Phase3）
        this.features = [
            // Phase1の機能
            'Java自動ダウンロード・インストール',
            'Minecraftサーバープロセス起動・停止', 
            '基本ログ統合（Logger連携）',
            'シンプルなエラーハンドリング',
            'プロセス状態監視',
            // Phase2の機能
            'リアルタイムログ解析・パース',
            'コンソールコマンド送信機能',
            'サーバー状態自動検出',
            'プレイヤー参加/離脱監視',
            '自動再起動機能（設定可能）',
            '詳細エラー分類・ログ',
            // Phase3の新機能
            'OwnServer自動管理・制御',
            'CloudFlare DNS自動更新',
            '外部アクセス管理・監視',
            '統合ヘルスチェック・自動復旧',
            '外部公開状態の一元管理',
            'セキュリティ・アクセス制御'
        ];
        
        // Phase3コンポーネント初期化
        this._initializePhase3Components();
        
        // 統合イベント設定
        this._setupIntegratedEvents();
        
        this.logger.info('MinecraftServerManager Phase3 initialized', {
            phase: this.implementationPhase,
            newFeatures: this.features.slice(-6), // Phase3の新機能のみ
            totalFeatures: this.features.length
        });
    }
    
    /**
     * Phase3コンポーネント初期化
     * @private
     */
    _initializePhase3Components() {
        try {
            // OwnServerManager
            this.ownServerManager = new OwnServerManager(this.config, this.logger);
            
            // CloudFlareManager
            this.cloudFlareManager = new CloudFlareManager(this.config, this.logger);
            
            // PublicAccessManager
            this.publicAccessManager = new PublicAccessManager(
                this.ownServerManager,
                this.cloudFlareManager,
                this.config,
                this.logger
            );
            
            // IntegratedHealthCheck
            this.integratedHealthCheck = new IntegratedHealthCheck(
                this, // MinecraftServerManager (this)
                this.ownServerManager,
                this.cloudFlareManager,
                this.publicAccessManager,
                this.config,
                this.logger
            );
            
            this.logger.info('Phase3 components initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize Phase3 components', { error: error.message });
            throw error;
        }
    }
    
    /**
     * 統合イベント設定
     * @private
     */
    _setupIntegratedEvents() {
        // OwnServerイベント
        this.ownServerManager.on('ownserver-started', (data) => {
            this.emit('ownserver-started', data);
        });
        
        this.ownServerManager.on('ownserver-stopped', (data) => {
            this.emit('ownserver-stopped', data);
        });
        
        this.ownServerManager.on('ownserver-error', (error) => {
            this.emit('ownserver-error', error);
        });
        
        // 外部公開イベント
        this.publicAccessManager.on('public-access-enabled', (data) => {
            this.emit('public-access-enabled', data);
        });
        
        this.publicAccessManager.on('public-access-disabled', (data) => {
            this.emit('public-access-disabled', data);
        });
        
        this.publicAccessManager.on('public-access-error', (error) => {
            this.emit('public-access-error', error);
        });
        
        this.publicAccessManager.on('connectivity-check-failed', (result) => {
            this.emit('connectivity-check-failed', result);
        });
        
        // 統合ヘルスチェックイベント
        this.integratedHealthCheck.on('health-check-completed', (report) => {
            this.emit('integrated-health-check', report);
        });
        
        this.integratedHealthCheck.on('auto-recovery-triggered', (data) => {
            this.emit('auto-recovery-triggered', data);
        });
        
        // DNS イベント
        this.cloudFlareManager.on('dns-record-updated', (data) => {
            this.emit('dns-record-updated', data);
        });
        
        this.cloudFlareManager.on('dns-record-deleted', (data) => {
            this.emit('dns-record-deleted', data);
        });
    }
    
    // ===== OwnServer制御メソッド =====
    
    /**
     * OwnServerを起動
     */
    async startOwnServer() {
        this.logger.info('Starting OwnServer...');
        const result = await this.ownServerManager.start();
        
        if (result.success) {
            this.emit('ownserver-start-requested', result);
        }
        
        return result;
    }
    
    /**
     * OwnServerを停止
     */
    async stopOwnServer() {
        this.logger.info('Stopping OwnServer...');
        const result = await this.ownServerManager.stop();
        
        if (result.success) {
            this.emit('ownserver-stop-requested', result);
        }
        
        return result;
    }
    
    /**
     * OwnServerを再起動
     */
    async restartOwnServer() {
        this.logger.info('Restarting OwnServer...');
        return await this.ownServerManager.restart();
    }
    
    /**
     * OwnServerの状態を取得
     */
    getOwnServerStatus() {
        return this.ownServerManager.getStatus();
    }
    
    // ===== 外部公開管理メソッド =====
    
    /**
     * 外部公開を有効化
     */
    async enablePublicAccess(subdomain = null) {
        this.logger.info('Enabling public access...', { subdomain });
        
        // 統合チェック開始（まだ開始していない場合）
        if (!this.integratedHealthCheck.isMonitoring) {
            this.integratedHealthCheck.startMonitoring();
        }
        
        const result = await this.publicAccessManager.enablePublicAccess(subdomain);
        
        if (result.success) {
            this.emit('public-access-enable-requested', result);
        }
        
        return result;
    }
    
    /**
     * 外部公開を無効化
     */
    async disablePublicAccess() {
        this.logger.info('Disabling public access...');
        const result = await this.publicAccessManager.disablePublicAccess();
        
        if (result.success) {
            this.emit('public-access-disable-requested', result);
        }
        
        return result;
    }
    
    /**
     * 外部公開状態を取得
     */
    getPublicAccessStatus() {
        return this.publicAccessManager.getPublicAccessStatus();
    }
    
    /**
     * 公開エンドポイントを取得
     */
    getPublicEndpoint() {
        return this.publicAccessManager.getPublicEndpoint();
    }
    
    // ===== CloudFlare管理メソッド =====
    
    /**
     * DNSレコードを更新
     */
    async updateDNSRecord(subdomain, target = null, type = 'A') {
        this.logger.info('Updating DNS record...', { subdomain, target, type });
        
        // targetが指定されていない場合、OwnServerのエンドポイントを使用
        if (!target) {
            const ownServerStatus = this.getOwnServerStatus();
            if (!ownServerStatus.endpoint) {
                return {
                    success: false,
                    error: 'No target specified and OwnServer endpoint not available'
                };
            }
            
            try {
                const url = new URL(ownServerStatus.endpoint);
                target = url.hostname;
            } catch (error) {
                return {
                    success: false,
                    error: `Invalid OwnServer endpoint: ${error.message}`
                };
            }
        }
        
        return await this.cloudFlareManager.updateRecord(subdomain, target, type);
    }
    
    /**
     * DNSレコードを削除
     */
    async removeDNSRecord(subdomain, type = 'A') {
        this.logger.info('Removing DNS record...', { subdomain, type });
        return await this.cloudFlareManager.deleteRecord(subdomain, type);
    }
    
    /**
     * DNS状態を取得
     */
    async getDNSStatus() {
        const records = await this.cloudFlareManager.getRecords();
        const managedRecords = this.cloudFlareManager.getManagedRecords();
        
        return {
            ...records,
            managedRecords
        };
    }
    
    // ===== 継承・互換性メソッド =====
    
    /**
     * サーバー状態取得（Phase2互換）
     * getIntegratedStatus()で参照されるため必要
     */
    getStatus() {
        const serverState = this.getServerState();
        
        return {
            status: serverState.status,
            uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
            playerCount: serverState.playerCount || 0,
            processId: this.process?.pid,
            memoryUsage: null, // 実装時に追加
            version: null, // 実装時に追加
            ...serverState
        };
    }
    
    // ===== 統合管理メソッド =====
    
    /**
     * 統合状態を取得
     */
    getIntegratedStatus() {
        const minecraftStatus = this.getStatus();
        const ownServerStatus = this.getOwnServerStatus();
        const publicAccessStatus = this.getPublicAccessStatus();
        const healthStatus = this.integratedHealthCheck.getHealthStatus();
        
        return {
            phase: this.implementationPhase,
            timestamp: new Date(),
            minecraft: {
                status: minecraftStatus.status,
                uptime: minecraftStatus.uptime,
                playerCount: minecraftStatus.playerCount || 0,
                isHealthy: minecraftStatus.status === 'running'
            },
            ownserver: {
                status: ownServerStatus.status,
                endpoint: ownServerStatus.endpoint,
                uptime: ownServerStatus.uptime,
                isHealthy: ownServerStatus.isHealthy
            },
            publicAccess: {
                status: publicAccessStatus.status,
                publicUrl: publicAccessStatus.publicUrl,
                subdomain: publicAccessStatus.subdomain,
                uptime: publicAccessStatus.uptime,
                isHealthy: publicAccessStatus.isHealthy
            },
            health: {
                isMonitoring: healthStatus.isMonitoring,
                consecutiveFailures: healthStatus.consecutiveFailures,
                lastCheck: healthStatus.lastCheck?.timestamp,
                uptime: healthStatus.uptime
            },
            overall: this._calculateOverallStatus(minecraftStatus, ownServerStatus, publicAccessStatus)
        };
    }
    
    /**
     * 全システム起動
     */
    async startFullStack(subdomain = null) {
        this.logger.info('Starting full stack...', { subdomain });
        
        const results = {
            minecraft: null,
            ownserver: null,
            publicAccess: null,
            monitoring: null
        };
        
        try {
            // 1. Minecraftサーバー起動
            this.logger.info('Step 1: Starting Minecraft server...');
            try {
                await this.start();
                results.minecraft = { success: true, message: 'Minecraft server started' };
            } catch (error) {
                results.minecraft = { success: false, error: error.message };
                throw new Error(`Minecraft server start failed: ${error.message}`);
            }
            
            if (!results.minecraft.success) {
                throw new Error(`Minecraft server start failed: ${results.minecraft.error}`);
            }
            
            // 起動完了待機（短時間待ってから状態確認）
            try {
                // テスト環境では、プロセスが起動していて"Done"メッセージが出力されれば成功とみなす
                await this._waitForServerReady(5000);
            } catch (error) {
                // 起動に失敗した場合
                results.minecraft = { success: false, error: error.message };
                throw new Error(`Minecraft server start failed: ${error.message}`);
            }
            
            // 2. OwnServer起動
            this.logger.info('Step 2: Starting OwnServer...');
            results.ownserver = await this.startOwnServer();
            
            if (!results.ownserver.success) {
                throw new Error(`OwnServer start failed: ${results.ownserver.error}`);
            }
            
            // 3. 外部公開有効化
            if (subdomain !== false) { // falseが明示的に指定された場合以外は有効化
                this.logger.info('Step 3: Enabling public access...');
                results.publicAccess = await this.enablePublicAccess(subdomain);
                
                if (!results.publicAccess.success) {
                    this.logger.warn('Public access enable failed, continuing...', {
                        error: results.publicAccess.error
                    });
                }
            }
            
            // 4. 統合監視開始
            this.logger.info('Step 4: Starting integrated monitoring...');
            this.integratedHealthCheck.startMonitoring();
            results.monitoring = { success: true, message: 'Monitoring started' };
            
            this.logger.info('Full stack started successfully');
            
            this.emit('full-stack-started', {
                timestamp: new Date(),
                results,
                status: this.getIntegratedStatus()
            });
            
            return {
                success: true,
                results,
                status: this.getIntegratedStatus()
            };
            
        } catch (error) {
            this.logger.error('Full stack start failed', { error: error.message, results });
            
            // 部分的なクリーンアップ
            await this._cleanupPartialStart(results);
            
            return {
                success: false,
                error: error.message,
                results
            };
        }
    }
    
    /**
     * 全システム停止
     */
    async stopFullStack() {
        this.logger.info('Stopping full stack...');
        
        const results = {
            monitoring: null,
            publicAccess: null,
            ownserver: null,
            minecraft: null
        };
        
        try {
            // 1. 統合監視停止
            this.logger.info('Step 1: Stopping integrated monitoring...');
            this.integratedHealthCheck.stopMonitoring();
            results.monitoring = { success: true, message: 'Monitoring stopped' };
            
            // 2. 外部公開無効化
            const publicStatus = this.getPublicAccessStatus();
            if (publicStatus.status === 'enabled') {
                this.logger.info('Step 2: Disabling public access...');
                results.publicAccess = await this.disablePublicAccess();
            } else {
                results.publicAccess = { success: true, message: 'Not enabled' };
            }
            
            // 3. OwnServer停止
            const ownServerStatus = this.getOwnServerStatus();
            if (ownServerStatus.status === 'running') {
                this.logger.info('Step 3: Stopping OwnServer...');
                results.ownserver = await this.stopOwnServer();
            } else {
                results.ownserver = { success: true, message: 'Not running' };
            }
            
            // 4. Minecraftサーバー停止
            if (this.isServerRunning && this.isServerRunning()) {
                this.logger.info('Step 4: Stopping Minecraft server...');
                try {
                    await this.stop();
                    results.minecraft = { success: true, message: 'Minecraft server stopped' };
                } catch (error) {
                    results.minecraft = { success: false, error: error.message };
                }
            } else {
                results.minecraft = { success: true, message: 'Not running' };
            }
            
            this.logger.info('Full stack stopped successfully');
            
            this.emit('full-stack-stopped', {
                timestamp: new Date(),
                results
            });
            
            return {
                success: true,
                results
            };
            
        } catch (error) {
            this.logger.error('Full stack stop failed', { error: error.message, results });
            
            return {
                success: false,
                error: error.message,
                results
            };
        }
    }
    
    /**
     * システム準備状態確認
     */
    async isFullStackReady() {
        const status = this.getIntegratedStatus();
        
        return {
            ready: status.overall === 'running',
            components: {
                minecraft: status.minecraft.isHealthy,
                ownserver: status.ownserver.isHealthy,
                publicAccess: status.publicAccess.isHealthy
            },
            status
        };
    }
    
    // ===== ヘルスチェック・監視メソッド =====
    
    /**
     * 統合ヘルスチェック実行
     */
    async performIntegratedHealthCheck() {
        return await this.integratedHealthCheck.performHealthCheck();
    }
    
    /**
     * ヘルスチェック監視開始
     */
    startIntegratedMonitoring() {
        this.integratedHealthCheck.startMonitoring();
        return { success: true, message: 'Integrated monitoring started' };
    }
    
    /**
     * ヘルスチェック監視停止
     */
    stopIntegratedMonitoring() {
        this.integratedHealthCheck.stopMonitoring();
        return { success: true, message: 'Integrated monitoring stopped' };
    }
    
    /**
     * ヘルスメトリクス取得
     */
    getHealthMetrics() {
        return this.integratedHealthCheck.getMetrics();
    }
    
    /**
     * ヘルス履歴取得
     */
    getHealthHistory(limit = 100) {
        return this.integratedHealthCheck.getHealthHistory(limit);
    }
    
    // ===== プライベートヘルパーメソッド =====
    
    /**
     * Minecraftサーバーの準備完了を待つ（プロセス状態とログ出力の両方をチェック）
     * @private
     */
    async _waitForServerReady(timeout = 10000) {
        return new Promise((resolve, reject) => {
            let doneMessageSeen = false;
            
            // サーバーログから"Done"メッセージを検出するリスナー
            const logHandler = (data) => {
                const logLine = data.toString();
                if (logLine.includes('Done (') && logLine.includes('! For help, type "help"')) {
                    doneMessageSeen = true;
                    
                    // LogParserに "Done" メッセージを手動で送信して状態を更新
                    if (this.logParser) {
                        // 生のログ行からDoneメッセージを抽出
                        const lines = logLine.split('\n');
                        for (const line of lines) {
                            if (line.includes('Done (') && line.includes('! For help, type "help"')) {
                                this.logParser.parseLogLine(line.trim());
                                break;
                            }
                        }
                    }
                }
            };
            
            // stdout監視開始
            if (this.process && this.process.stdout) {
                this.process.stdout.on('data', logHandler);
            }
            
            const timer = setTimeout(() => {
                if (this.process && this.process.stdout) {
                    this.process.stdout.off('data', logHandler);
                }
                const isRunning = this.isServerRunning();
                reject(new Error(`Timeout waiting for Minecraft server to be ready (running: ${isRunning}, done message: ${doneMessageSeen})`));
            }, timeout);
            
            const checkReady = () => {
                const isRunning = this.isServerRunning();
                
                if (isRunning && doneMessageSeen) {
                    clearTimeout(timer);
                    if (this.process && this.process.stdout) {
                        this.process.stdout.off('data', logHandler);
                    }
                    resolve();
                } else if (!isRunning) {
                    clearTimeout(timer);
                    if (this.process && this.process.stdout) {
                        this.process.stdout.off('data', logHandler);
                    }
                    reject(new Error('Minecraft server process stopped unexpectedly'));
                } else {
                    setTimeout(checkReady, 200);
                }
            };
            
            // 最初の少し待機してからチェック開始
            setTimeout(checkReady, 1000);
        });
    }
    
    /**
     * Minecraftサーバーの状態変化を待つ
     * @private
     */
    async _waitForStatus(targetStatus, timeout = 10000) {
        return new Promise((resolve, reject) => {
            // 少し待機してから最初のチェックを行う（プロセス終了の検出に時間がかかるため）
            setTimeout(() => {
                const currentStatus = this.getStatus().status;
                if (currentStatus === targetStatus) {
                    resolve();
                    return;
                }
                
                // すでに停止している場合は即座に失敗
                if ((targetStatus === 'running' || targetStatus === 'ready') && currentStatus === 'stopped') {
                    reject(new Error(`Minecraft server failed to start (current status: ${currentStatus})`));
                    return;
                }
                
                const timer = setTimeout(() => {
                    const finalStatus = this.getStatus().status;
                    reject(new Error(`Timeout waiting for Minecraft server status: ${targetStatus} (current status: ${finalStatus})`));
                }, timeout);
                
                const checkStatus = () => {
                    const status = this.getStatus().status;
                    if (status === targetStatus) {
                        clearTimeout(timer);
                        resolve();
                    } else if ((targetStatus === 'running' || targetStatus === 'ready') && status === 'stopped') {
                        // 実行待ちで停止状態になった場合は失敗
                        clearTimeout(timer);
                        reject(new Error(`Minecraft server failed to start (status: ${status})`));
                    } else {
                        setTimeout(checkStatus, 200); // Check every 200ms for faster detection
                    }
                };
                
                checkStatus();
            }, 1000); // 1秒待機してからチェック開始
        });
    }
    
    /**
     * 全体的なステータス計算
     * @private
     */
    _calculateOverallStatus(minecraftStatus, ownServerStatus, publicAccessStatus) {
        const components = [
            minecraftStatus.status === 'running',
            ownServerStatus.status === 'running',
            publicAccessStatus.status === 'enabled' || publicAccessStatus.status === 'disabled' // エラーでなければOK
        ];
        
        const runningComponents = components.filter(Boolean).length;
        
        if (runningComponents === components.length) {
            return 'running';
        } else if (runningComponents > 0) {
            return 'partial';
        } else {
            return 'stopped';
        }
    }
    
    /**
     * 部分的な起動のクリーンアップ
     * @private
     */
    async _cleanupPartialStart(results) {
        this.logger.info('Cleaning up partial start...');
        
        try {
            // 逆順でクリーンアップ
            if (results.monitoring?.success) {
                this.integratedHealthCheck.stopMonitoring();
            }
            
            if (results.publicAccess?.success) {
                await this.disablePublicAccess();
            }
            
            if (results.ownserver?.success) {
                await this.stopOwnServer();
            }
            
            if (results.minecraft?.success) {
                await this.stop();
            }
            
        } catch (error) {
            this.logger.error('Cleanup failed', { error: error.message });
        }
    }
    
    /**
     * クリーンアップ（Phase3）
     */
    async cleanup() {
        this.logger.info('MinecraftServerManager Phase3 cleanup');
        
        // 統合システム停止
        await this.stopFullStack();
        
        // Phase3コンポーネントクリーンアップ
        if (this.integratedHealthCheck) {
            await this.integratedHealthCheck.cleanup();
        }
        
        if (this.publicAccessManager) {
            await this.publicAccessManager.cleanup();
        }
        
        if (this.cloudFlareManager) {
            await this.cloudFlareManager.cleanup();
        }
        
        if (this.ownServerManager) {
            await this.ownServerManager.cleanup();
        }
        
        // Phase1の_cleanupメソッドを呼び出し（Phase2には専用cleanupがない）
        if (this._cleanup && typeof this._cleanup === 'function') {
            this._cleanup();
        }
    }
}

module.exports = MinecraftServerManager_Phase3;
