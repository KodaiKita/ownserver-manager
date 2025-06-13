/**
 * OwnServer Manager
 * ownserverプロセスの管理（起動・停止・監視・制御）
 * 
 * 機能:
 * - ownserverバイナリの実行・制御
 * - プロセス監視・状態管理
 * - エンドポイント自動検出
 * - ログ解析・エラーハンドリング
 * - ヘルスチェック・自動復旧
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');

class OwnServerManager extends EventEmitter {
    constructor(config, logger) {
        super();
        
        this.config = config.ownserver || {};
        this.logger = logger;
        
        // プロセス管理
        this.process = null;
        this.status = 'stopped';
        this.startTime = null;
        this.endpoint = null;
        this.processId = null;
        
        // 設定
        this.binaryPath = this.config.binaryPath || '/app/bin/ownserver';
        this.autoStart = this.config.autoStart !== undefined ? this.config.autoStart : false;
        this.restartOnFailure = this.config.restartOnFailure !== undefined ? this.config.restartOnFailure : true;
        this.healthCheckInterval = this.config.healthCheckInterval || 30000;
        this.startupTimeout = this.config.startupTimeout || 60000;
        
        // 監視タイマー
        this.healthCheckTimer = null;
        this.startupTimer = null;
        
        this.logger.info('OwnServerManager initialized', {
            binaryPath: this.binaryPath,
            autoStart: this.autoStart,
            restartOnFailure: this.restartOnFailure
        });
    }
    
    /**
     * OwnServerを起動
     */
    async start() {
        if (this.status === 'running') {
            this.logger.warn('OwnServer is already running');
            return { success: true, message: 'Already running' };
        }
        
        if (this.status === 'starting') {
            this.logger.warn('OwnServer is already starting');
            return { success: false, message: 'Already starting' };
        }
        
        try {
            this.logger.info('Starting OwnServer...');
            this.status = 'starting';
            this.startTime = Date.now();
            
            // バイナリの存在確認
            await this._checkBinaryExists();
            
            // プロセス起動
            await this._spawnProcess();
            
            // 起動タイムアウト設定
            this._setupStartupTimeout();
            
            return { success: true, message: 'OwnServer starting' };
            
        } catch (error) {
            this.logger.error('Failed to start OwnServer', { error: error.message });
            this.status = 'error';
            this.emit('ownserver-error', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * OwnServerを停止
     */
    async stop() {
        if (this.status === 'stopped') {
            this.logger.warn('OwnServer is already stopped');
            return { success: true, message: 'Already stopped' };
        }
        
        try {
            this.logger.info('Stopping OwnServer...');
            this.status = 'stopping';
            
            // タイマーをクリア
            this._clearTimers();
            
            // プロセス終了
            if (this.process) {
                this.process.kill('SIGTERM');
                
                // 強制終了のタイムアウト
                setTimeout(() => {
                    if (this.process && !this.process.killed) {
                        this.logger.warn('Force killing OwnServer process');
                        this.process.kill('SIGKILL');
                    }
                }, 5000);
            }
            
            return { success: true, message: 'OwnServer stopping' };
            
        } catch (error) {
            this.logger.error('Failed to stop OwnServer', { error: error.message });
            return { success: false, error: error.message };
        }
    }
    
    /**
     * OwnServerを再起動
     */
    async restart() {
        this.logger.info('Restarting OwnServer...');
        
        const stopResult = await this.stop();
        if (!stopResult.success) {
            return stopResult;
        }
        
        // 停止完了を待つ
        await this._waitForStatus('stopped', 10000);
        
        return await this.start();
    }
    
    /**
     * OwnServerの状態を取得
     */
    getStatus() {
        return {
            status: this.status,
            endpoint: this.endpoint,
            uptime: this.startTime ? Date.now() - this.startTime : 0,
            processId: this.processId,
            startTime: this.startTime,
            isHealthy: this.status === 'running' && this.endpoint !== null
        };
    }
    
    /**
     * ヘルスチェックを実行
     */
    async performHealthCheck() {
        if (this.status !== 'running') {
            return { healthy: false, reason: 'Not running' };
        }
        
        try {
            // プロセス生存確認
            if (!this.process || this.process.killed) {
                return { healthy: false, reason: 'Process not found' };
            }
            
            // エンドポイント確認
            if (!this.endpoint) {
                return { healthy: false, reason: 'No endpoint detected' };
            }
            
            // TODO: エンドポイントへの接続テスト
            // const response = await this._testEndpoint();
            
            return { 
                healthy: true, 
                endpoint: this.endpoint,
                uptime: this.getStatus().uptime
            };
            
        } catch (error) {
            this.logger.error('Health check failed', { error: error.message });
            return { healthy: false, reason: error.message };
        }
    }
    
    /**
     * バイナリの存在確認
     * @private
     */
    async _checkBinaryExists() {
        try {
            await fs.access(this.binaryPath);
            this.logger.debug('OwnServer binary found', { path: this.binaryPath });
        } catch (error) {
            throw new Error(`OwnServer binary not found: ${this.binaryPath}`);
        }
    }
    
    /**
     * プロセス起動
     * @private
     */
    async _spawnProcess() {
        const args = this.config.args || [];
        const options = {
            cwd: path.dirname(this.binaryPath),
            stdio: ['pipe', 'pipe', 'pipe']
        };
        
        this.logger.debug('Spawning OwnServer process', {
            command: this.binaryPath,
            args: args,
            cwd: options.cwd
        });
        
        this.process = spawn(this.binaryPath, args, options);
        this.processId = this.process.pid;
        
        // プロセスイベント設定
        this._setupProcessEvents();
        
        this.logger.info('OwnServer process spawned', { pid: this.processId });
    }
    
    /**
     * プロセスイベント設定
     * @private
     */
    _setupProcessEvents() {
        // 標準出力処理
        this.process.stdout.on('data', (data) => {
            const output = data.toString().trim();
            this._parseOutput(output);
        });
        
        // 標準エラー処理
        this.process.stderr.on('data', (data) => {
            const error = data.toString().trim();
            this.logger.warn('OwnServer stderr', { error });
        });
        
        // プロセス終了処理
        this.process.on('exit', (code, signal) => {
            this.logger.info('OwnServer process exited', { code, signal });
            this._handleProcessExit(code, signal);
        });
        
        // プロセスエラー処理
        this.process.on('error', (error) => {
            this.logger.error('OwnServer process error', { error: error.message });
            this._handleProcessError(error);
        });
    }
    
    /**
     * 出力解析
     * @private
     */
    _parseOutput(output) {
        this.logger.debug('OwnServer output', { output });
        
        // エンドポイント検出
        const endpointMatch = output.match(/Serving on (https?:\/\/[^\s]+)/);
        if (endpointMatch) {
            this.endpoint = endpointMatch[1];
            this.logger.info('OwnServer endpoint detected', { endpoint: this.endpoint });
            
            if (this.status === 'starting') {
                this._handleStartupSuccess();
            }
        }
        
        // 起動完了メッセージ検出
        if (output.includes('Server started') || output.includes('Ready')) {
            if (this.status === 'starting') {
                this._handleStartupSuccess();
            }
        }
        
        // エラーメッセージ検出
        if (output.includes('ERROR') || output.includes('FATAL')) {
            this.logger.error('OwnServer error in output', { output });
            this.emit('ownserver-error', new Error(output));
        }
    }
    
    /**
     * 起動成功処理
     * @private
     */
    _handleStartupSuccess() {
        this.status = 'running';
        this._clearStartupTimeout();
        this._startHealthChecking();
        
        this.logger.info('OwnServer started successfully', {
            pid: this.processId,
            endpoint: this.endpoint,
            startupTime: Date.now() - this.startTime
        });
        
        this.emit('ownserver-started', {
            pid: this.processId,
            endpoint: this.endpoint,
            status: this.getStatus()
        });
    }
    
    /**
     * プロセス終了処理
     * @private
     */
    _handleProcessExit(code, signal) {
        const wasRunning = this.status === 'running';
        
        this.status = 'stopped';
        this.process = null;
        this.processId = null;
        this.endpoint = null;
        this._clearTimers();
        
        this.emit('ownserver-stopped', {
            code,
            signal,
            wasRunning
        });
        
        // 自動再起動
        if (wasRunning && this.restartOnFailure && code !== 0) {
            this.logger.warn('OwnServer crashed, attempting restart...', { code, signal });
            setTimeout(() => {
                this.start().catch(error => {
                    this.logger.error('Auto-restart failed', { error: error.message });
                });
            }, 5000);
        }
    }
    
    /**
     * プロセスエラー処理
     * @private
     */
    _handleProcessError(error) {
        this.status = 'error';
        this.process = null;
        this.processId = null;
        this.endpoint = null;
        this._clearTimers();
        
        this.emit('ownserver-error', error);
    }
    
    /**
     * 起動タイムアウト設定
     * @private
     */
    _setupStartupTimeout() {
        this.startupTimer = setTimeout(() => {
            if (this.status === 'starting') {
                this.logger.error('OwnServer startup timeout');
                this.stop();
                this.emit('ownserver-error', new Error('Startup timeout'));
            }
        }, this.startupTimeout);
    }
    
    /**
     * 起動タイムアウトクリア
     * @private
     */
    _clearStartupTimeout() {
        if (this.startupTimer) {
            clearTimeout(this.startupTimer);
            this.startupTimer = null;
        }
    }
    
    /**
     * ヘルスチェック開始
     * @private
     */
    _startHealthChecking() {
        if (this.healthCheckInterval > 0) {
            this.healthCheckTimer = setInterval(async () => {
                const health = await this.performHealthCheck();
                if (!health.healthy) {
                    this.logger.warn('OwnServer health check failed', health);
                    this.emit('ownserver-unhealthy', health);
                }
            }, this.healthCheckInterval);
        }
    }
    
    /**
     * タイマークリア
     * @private
     */
    _clearTimers() {
        this._clearStartupTimeout();
        
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }
    
    /**
     * 状態変化を待つ
     * @private
     */
    async _waitForStatus(targetStatus, timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (this.status === targetStatus) {
                resolve();
                return;
            }
            
            const timer = setTimeout(() => {
                reject(new Error(`Timeout waiting for status: ${targetStatus}`));
            }, timeout);
            
            const checkStatus = () => {
                if (this.status === targetStatus) {
                    clearTimeout(timer);
                    resolve();
                } else {
                    setTimeout(checkStatus, 100);
                }
            };
            
            checkStatus();
        });
    }
    
    /**
     * クリーンアップ
     */
    async cleanup() {
        this.logger.info('OwnServerManager cleanup');
        
        if (this.status === 'running') {
            await this.stop();
        }
        
        this._clearTimers();
        this.removeAllListeners();
    }
}

module.exports = OwnServerManager;
