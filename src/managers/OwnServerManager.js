/**
 * OwnServer Manager
 * ownserverプロセスの管理とエンドポイント情報の抽出
 */

const EventEmitter = require('events');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const Logger = require('../utils/Logger');

class OwnServerManager extends EventEmitter {
    constructor(config, logger = null) {
        super();
        this.config = config;
        this.process = null;
        this.isRunning = false;
        this.endpoint = null;
        this.logger = logger || new Logger('ownserver');
        this.ownserverPath = path.resolve('./bin/ownserver');
        this.autoRestart = config?.ownserver?.autoRestart || false;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * ownserver起動
     * @param {number} port - 転送対象のポート番号
     * @returns {Promise<string>} エンドポイント情報
     */
    async start(port = 25565) {
        try {
            // 既に実行中の場合はスキップ
            if (this.isRunning) {
                this.logger.warn('OwnServer is already running');
                return this.endpoint;
            }

            // バイナリの存在確認
            try {
                await fs.access(this.ownserverPath);
            } catch (error) {
                throw new Error(`OwnServer binary not found at ${this.ownserverPath}`);
            }

            this.logger.info(`Starting OwnServer for port ${port}`);

            // ownserverプロセス起動（正しいコマンドライン引数）
            this.process = spawn(this.ownserverPath, ['--endpoint', `${port}/tcp`], {
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false
            });

            this.isRunning = true;
            this.setupProcessMonitoring();

            // エンドポイント情報の取得を待機
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout waiting for OwnServer endpoint'));
                }, 30000); // 30秒でタイムアウト

                const onEndpoint = (endpoint) => {
                    clearTimeout(timeout);
                    this.removeListener('error', onError);
                    resolve(endpoint);
                };

                const onError = (error) => {
                    clearTimeout(timeout);
                    this.removeListener('endpoint', onEndpoint);
                    reject(error);
                };

                this.once('endpoint', onEndpoint);
                this.once('error', onError);
            });

        } catch (error) {
            this.logger.error('Failed to start OwnServer', { error: error.message });
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * ownserver停止
     * @returns {Promise<void>}
     */
    async stop() {
        try {
            if (!this.isRunning || !this.process) {
                this.logger.warn('OwnServer is not running');
                return;
            }

            this.logger.info('Stopping OwnServer');

            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    // 強制終了
                    if (this.process && !this.process.killed) {
                        this.process.kill('SIGKILL');
                    }
                    this.cleanup();
                    resolve();
                }, 5000); // 5秒でタイムアウト

                this.process.once('exit', () => {
                    clearTimeout(timeout);
                    this.cleanup();
                    resolve();
                });

                // グレースフル停止を試行
                this.process.kill('SIGTERM');
            });

        } catch (error) {
            this.logger.error('Failed to stop OwnServer', { error: error.message });
            this.cleanup();
        }
    }

    /**
     * リソースクリーンアップ
     * @private
     */
    cleanup() {
        this.isRunning = false;
        this.process = null;
        this.endpoint = null;
        this.retryCount = 0;
    }

    /**
     * エンドポイント情報の取得
     * @returns {string|null} 現在のエンドポイント
     */
    getEndpoint() {
        return this.endpoint;
    }

    /**
     * ownserver状態確認
     * @returns {boolean}
     */
    isServerRunning() {
        return this.isRunning && this.process && !this.process.killed;
    }

    /**
     * OwnServerステータス取得
     * @returns {Promise<Object>} 現在のOwnServerステータス
     */
    async getStatus() {
        return {
            running: this.isServerRunning(),
            process: {
                pid: this.process ? this.process.pid : null,
                running: this.isRunning
            },
            endpoint: this.endpoint,
            port: this.config?.ownserver?.defaultPort || null
        };
    }

    /**
     * ログからエンドポイント情報を抽出
     * @private
     * @param {string} data - ownserverの出力データ
     */
    extractEndpointFromLog(data) {
        const lines = data.toString().split('\n');
        
        for (const line of lines) {
            // パターン1: tcp://localhost:25565 <--> tcp://shard-XXXX.ownserver.kumassy.com:XXXXX
            const match1 = line.match(/tcp:\/\/localhost:\d+ <--> (tcp:\/\/[^\\s]+)/);
            if (match1) {
                this.endpoint = match1[1];
                this.logger.info(`OwnServer endpoint extracted: ${this.endpoint}`);
                this.emit('endpoint', this.endpoint);
                return;
            }

            // パターン2: shard-XXXX.ownserver.kumassy.com:XXXXX
            const match2 = line.match(/(shard-\\d+\\.ownserver\\.kumassy\\.com:\\d+)/);
            if (match2) {
                this.endpoint = `tcp://${match2[1]}`;
                this.logger.info(`OwnServer endpoint extracted: ${this.endpoint}`);
                this.emit('endpoint', this.endpoint);
                return;
            }
        }
    }

    /**
     * 自動再起動処理
     * @private
     */
    async handleAutoRestart() {
        if (!this.autoRestart || this.retryCount >= this.maxRetries) {
            this.logger.error(`OwnServer failed after ${this.retryCount} retries`);
            this.emit('failed');
            return;
        }

        this.retryCount++;
        this.logger.warn(`OwnServer restart attempt ${this.retryCount}/${this.maxRetries}`);
        
        // 2秒待機後に再起動
        setTimeout(async () => {
            try {
                const lastPort = this.config?.minecraft?.serverPort || 25565;
                await this.start(lastPort);
            } catch (error) {
                this.logger.error('Auto restart failed', { error: error.message });
                await this.handleAutoRestart();
            }
        }, 2000);
    }

    /**
     * プロセス監視
     * @private
     */
    setupProcessMonitoring() {
        if (!this.process) return;

        // stdout処理
        this.process.stdout.on('data', (data) => {
            const output = data.toString();
            this.logger.debug(`OwnServer stdout: ${output.trim()}`);
            this.extractEndpointFromLog(output);
        });

        // stderr処理
        this.process.stderr.on('data', (data) => {
            const output = data.toString();
            this.logger.debug(`OwnServer stderr: ${output.trim()}`);
            this.extractEndpointFromLog(output);
        });

        // プロセス終了処理
        this.process.on('exit', (code, signal) => {
            this.logger.info(`OwnServer process exited`, { code, signal });
            this.emit('exit', { code, signal });
            
            if (code !== 0 && this.autoRestart) {
                this.handleAutoRestart();
            } else {
                this.cleanup();
            }
        });

        // エラー処理
        this.process.on('error', (error) => {
            this.logger.error('OwnServer process error', { error: error.message });
            this.emit('error', error);
            this.cleanup();
        });
    }
}

module.exports = OwnServerManager;
