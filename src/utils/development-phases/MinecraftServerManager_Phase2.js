/**
 * MinecraftServerManager - Phase 2
 * サーバー監視・制御 - ログ解析、コマンド送信、自動再起動
 * 
 * Phase2 Features:
 * - リアルタイムログ解析・パース
 * - コンソールコマンド送信機能
 * - サーバー状態自動検出
 * - プレイヤー参加/離脱監視
 * - 自動再起動機能（設定可能）
 * - 詳細エラー分類・ログ
 */

const MinecraftServerManager_Phase1 = require('./MinecraftServerManager_Phase1');
const LogParser = require('../LogParser');
const { promises: fs } = require('fs');
const path = require('path');

class MinecraftServerManager_Phase2 extends MinecraftServerManager_Phase1 {
    constructor(serverDirectory, config = {}) {
        super(serverDirectory, config);
        
        // Phase2設定拡張
        this.config = {
            ...this.config,
            // コマンド送信設定
            commandTimeout: config.commandTimeout || 5000,
            commandEncoding: config.commandEncoding || 'utf8',
            
            // 自動再起動設定
            autoRestart: {
                enabled: config.autoRestart?.enabled || false,
                conditions: {
                    onCrash: config.autoRestart?.conditions?.onCrash !== false,
                    onPlayerEmpty: config.autoRestart?.conditions?.onPlayerEmpty || false,
                    maxUptime: config.autoRestart?.conditions?.maxUptime || null, // ミリ秒
                    memoryThreshold: config.autoRestart?.conditions?.memoryThreshold || null
                },
                gracePeriod: config.autoRestart?.gracePeriod || 30000, // 30秒
                maxRetries: config.autoRestart?.maxRetries || 3,
                retryDelay: config.autoRestart?.retryDelay || 60000 // 1分
            },
            
            // ログ解析設定
            logAnalysis: {
                enabled: config.logAnalysis?.enabled !== false,
                bufferSize: config.logAnalysis?.bufferSize || 1000,
                parseInterval: config.logAnalysis?.parseInterval || 100
            },
            
            ...config
        };
        
        // Phase2状態管理
        this.logParser = null;
        this.commandQueue = [];
        this.isCommandProcessing = false;
        this.autoRestartAttempts = 0;
        this.lastHealthCheck = null;
        this.healthCheckInterval = null;
        
        // サーバープロパティキャッシュ
        this.serverProperties = null;
        this.propertiesLastModified = null;
        
        this.logger.info('MinecraftServerManager Phase2 initialized', {
            autoRestart: this.config.autoRestart.enabled,
            logAnalysis: this.config.logAnalysis.enabled,
            commandTimeout: this.config.commandTimeout
        });
    }
    
    /**
     * サーバー起動（Phase2拡張）
     */
    async start() {
        // Phase1の起動処理実行
        await super.start();
        
        // Phase2機能の初期化
        await this._initializePhase2Features();
    }
    
    /**
     * サーバー停止（Phase2拡張）
     */
    async stop(force = false) {
        // Phase2機能のクリーンアップ
        await this._cleanupPhase2Features();
        
        // Phase1の停止処理実行
        await super.stop(force);
    }
    
    /**
     * コンソールコマンド送信
     * @param {string} command - 送信するコマンド
     * @returns {Promise<boolean>} - 送信成功/失敗
     */
    async sendCommand(command) {
        if (!this.isServerRunning()) {
            throw new Error('Server is not running');
        }
        
        if (!command || typeof command !== 'string') {
            throw new Error('Invalid command');
        }
        
        try {
            const commandStr = command.trim();
            
            // stdinにコマンド送信
            this.process.stdin.write(commandStr + '\n');
            
            this.logger.info('Command sent to server', { 
                command: commandStr,
                timestamp: new Date()
            });
            
            this.emit('command-sent', { 
                command: commandStr, 
                timestamp: new Date() 
            });
            
            return true;
            
        } catch (error) {
            this.logger.error('Failed to send command', { 
                command, 
                error: error.message 
            });
            
            this.emit('command-error', { 
                command, 
                error: error.message, 
                timestamp: new Date() 
            });
            
            throw error;
        }
    }
    
    /**
     * 応答付きコマンド送信
     * @param {string} command - 送信するコマンド
     * @param {number} timeout - タイムアウト時間（ミリ秒）
     * @returns {Promise<object>} - コマンド結果
     */
    async sendCommandWithResponse(command, timeout = null) {
        const commandTimeout = timeout || this.config.commandTimeout;
        
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let responseReceived = false;
            
            // タイムアウト設定
            const timeoutId = setTimeout(() => {
                if (!responseReceived) {
                    responseReceived = true;
                    reject(new Error(`Command timeout after ${commandTimeout}ms`));
                }
            }, commandTimeout);
            
            // 応答監視
            const responseHandler = (data) => {
                if (!responseReceived && data.type === 'command-result') {
                    responseReceived = true;
                    clearTimeout(timeoutId);
                    
                    resolve({
                        command,
                        response: data.data,
                        duration: Date.now() - startTime,
                        timestamp: new Date()
                    });
                }
            };
            
            // 一時的なイベントリスナー設定
            this.logParser?.once('command-result', responseHandler);
            
            // コマンド送信
            this.sendCommand(command).catch((error) => {
                if (!responseReceived) {
                    responseReceived = true;
                    clearTimeout(timeoutId);
                    reject(error);
                }
            });
        });
    }
    
    /**
     * サーバー状態取得
     */
    getServerState() {
        if (!this.logParser) {
            return {
                status: this.isServerRunning() ? 'running' : 'stopped',
                phase1Status: super.isServerRunning(),
                logParserAvailable: false
            };
        }
        
        const parserState = this.logParser.getServerState();
        
        return {
            ...parserState,
            phase1Status: super.isServerRunning(),
            logParserAvailable: true,
            autoRestartEnabled: this.config.autoRestart.enabled,
            autoRestartAttempts: this.autoRestartAttempts,
            lastHealthCheck: this.lastHealthCheck
        };
    }
    
    /**
     * プレイヤー数取得
     */
    getPlayerCount() {
        return this.logParser ? this.logParser.getPlayerCount() : 0;
    }
    
    /**
     * オンラインプレイヤーリスト取得
     */
    getPlayerList() {
        return this.logParser ? this.logParser.getPlayerList() : [];
    }
    
    /**
     * サーバー準備完了状態確認
     */
    isServerReady() {
        return this.logParser ? this.logParser.isServerReady() : false;
    }
    
    /**
     * サーバープロパティ取得
     */
    async getServerProperties() {
        const propertiesPath = path.join(this.serverDirectory, 'server.properties');
        
        try {
            const stats = await fs.stat(propertiesPath);
            
            // キャッシュチェック
            if (this.serverProperties && 
                this.propertiesLastModified && 
                stats.mtime.getTime() === this.propertiesLastModified.getTime()) {
                return this.serverProperties;
            }
            
            // ファイル読み込み
            const content = await fs.readFile(propertiesPath, 'utf8');
            const properties = this._parseProperties(content);
            
            // キャッシュ更新
            this.serverProperties = properties;
            this.propertiesLastModified = stats.mtime;
            
            return properties;
            
        } catch (error) {
            this.logger.warn('Failed to read server.properties', { 
                error: error.message 
            });
            return {};
        }
    }
    
    /**
     * サーバープロパティ更新
     * @param {string} key - プロパティキー
     * @param {string} value - プロパティ値
     */
    async updateServerProperty(key, value) {
        const propertiesPath = path.join(this.serverDirectory, 'server.properties');
        
        try {
            const properties = await this.getServerProperties();
            properties[key] = value;
            
            const content = this._stringifyProperties(properties);
            await fs.writeFile(propertiesPath, content, 'utf8');
            
            // キャッシュクリア
            this.serverProperties = null;
            this.propertiesLastModified = null;
            
            this.logger.info('Server property updated', { key, value });
            this.emit('property-updated', { key, value, timestamp: new Date() });
            
            return true;
            
        } catch (error) {
            this.logger.error('Failed to update server property', { 
                key, 
                value, 
                error: error.message 
            });
            throw error;
        }
    }
    
    /**
     * 自動再起動有効化
     * @param {object} config - 自動再起動設定
     */
    enableAutoRestart(config = {}) {
        this.config.autoRestart = {
            ...this.config.autoRestart,
            ...config,
            enabled: true
        };
        
        this.autoRestartAttempts = 0;
        this._startHealthChecks();
        
        this.logger.info('Auto-restart enabled', { config: this.config.autoRestart });
        this.emit('auto-restart-enabled', { 
            config: this.config.autoRestart, 
            timestamp: new Date() 
        });
    }
    
    /**
     * 自動再起動無効化
     */
    disableAutoRestart() {
        this.config.autoRestart.enabled = false;
        this._stopHealthChecks();
        
        this.logger.info('Auto-restart disabled');
        this.emit('auto-restart-disabled', { timestamp: new Date() });
    }
    
    /**
     * ログ解析統計取得
     */
    getLogStats() {
        return this.logParser ? this.logParser.getStats() : {};
    }
    
    // Phase2内部メソッド
    
    /**
     * Phase2機能初期化
     * @private
     */
    async _initializePhase2Features() {
        try {
            // ログパーサー初期化
            if (this.config.logAnalysis.enabled) {
                this._initializeLogParser();
            }
            
            // 自動再起動設定
            if (this.config.autoRestart.enabled) {
                this._startHealthChecks();
            }
            
            this.logger.info('Phase2 features initialized');
            
        } catch (error) {
            this.logger.error('Failed to initialize Phase2 features', { 
                error: error.message 
            });
            throw error;
        }
    }
    
    /**
     * Phase2機能クリーンアップ
     * @private
     */
    async _cleanupPhase2Features() {
        try {
            // ヘルスチェック停止
            this._stopHealthChecks();
            
            // ログパーサークリーンアップ
            if (this.logParser) {
                this.logParser.removeAllListeners();
                this.logParser = null;
            }
            
            // コマンドキュークリア
            this.commandQueue = [];
            this.isCommandProcessing = false;
            
            this.logger.info('Phase2 features cleaned up');
            
        } catch (error) {
            this.logger.error('Failed to cleanup Phase2 features', { 
                error: error.message 
            });
        }
    }
    
    /**
     * ログパーサー初期化
     * @private
     */
    _initializeLogParser() {
        this.logParser = new LogParser(this.logger);
        
        // ログパーサーイベントの中継
        this.logParser.on('server-ready', (data) => {
            this.emit('server-ready', data);
        });
        
        this.logParser.on('server-starting', (data) => {
            this.emit('server-starting', data);
        });
        
        this.logParser.on('server-stopping', (data) => {
            this.emit('server-stopping', data);
        });
        
        this.logParser.on('player-join', (data) => {
            this.emit('player-join', data);
            this.emit('player-count-changed', { 
                count: data.count, 
                timestamp: data.timestamp 
            });
        });
        
        this.logParser.on('player-leave', (data) => {
            this.emit('player-leave', data);
            this.emit('player-count-changed', { 
                count: data.count, 
                timestamp: data.timestamp 
            });
            
            // 自動再起動チェック（プレイヤー空の場合）
            if (this.config.autoRestart.enabled && 
                this.config.autoRestart.conditions.onPlayerEmpty && 
                data.count === 0) {
                this._triggerAutoRestart('player-empty');
            }
        });
        
        this.logParser.on('performance-warning', (data) => {
            this.emit('performance-warning', data);
        });
        
        this.logParser.on('server-error', (data) => {
            this.emit('server-error', data);
        });
        
        this.logParser.on('server-exception', (data) => {
            this.emit('server-exception', data);
        });
        
        this.logger.info('LogParser initialized and events connected');
    }
    
    /**
     * ログ設定拡張（Phase1からオーバーライド）
     * @private
     */
    _setupLogging() {
        // Phase1のログ設定実行
        super._setupLogging();
        
        // Phase2のログ解析追加
        if (this.logParser) {
            this.process.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        this.logParser.parseLogLine(line.trim());
                    }
                });
            });
            
            this.process.stderr.on('data', (data) => {
                const lines = data.toString().split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        this.logParser.parseLogLine(line.trim());
                    }
                });
            });
        }
    }
    
    /**
     * ヘルスチェック開始
     * @private
     */
    _startHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        // 1分間隔でヘルスチェック
        this.healthCheckInterval = setInterval(() => {
            this._performHealthCheck();
        }, 60000);
        
        this.logger.info('Health checks started');
    }
    
    /**
     * ヘルスチェック停止
     * @private
     */
    _stopHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        
        this.logger.info('Health checks stopped');
    }
    
    /**
     * ヘルスチェック実行
     * @private
     */
    _performHealthCheck() {
        try {
            this.lastHealthCheck = new Date();
            
            // 基本動作確認
            if (!this.isServerRunning()) {
                if (this.config.autoRestart.conditions.onCrash) {
                    this._triggerAutoRestart('crash-detected');
                }
                return;
            }
            
            // 稼働時間チェック
            if (this.config.autoRestart.conditions.maxUptime && 
                this.startTime) {
                const uptime = Date.now() - this.startTime.getTime();
                if (uptime > this.config.autoRestart.conditions.maxUptime) {
                    this._triggerAutoRestart('max-uptime-reached');
                    return;
                }
            }
            
            this.emit('health-check-completed', { 
                timestamp: this.lastHealthCheck,
                status: 'healthy'
            });
            
        } catch (error) {
            this.logger.error('Health check failed', { error: error.message });
            this.emit('health-check-failed', { 
                error: error.message, 
                timestamp: new Date() 
            });
        }
    }
    
    /**
     * 自動再起動トリガー
     * @private
     */
    async _triggerAutoRestart(reason) {
        if (this.autoRestartAttempts >= this.config.autoRestart.maxRetries) {
            this.logger.error('Auto-restart max retries exceeded', { 
                attempts: this.autoRestartAttempts,
                reason
            });
            
            this.emit('auto-restart-failed', { 
                reason, 
                attempts: this.autoRestartAttempts,
                timestamp: new Date() 
            });
            return;
        }
        
        this.autoRestartAttempts++;
        
        this.logger.info('Auto-restart triggered', { 
            reason, 
            attempt: this.autoRestartAttempts 
        });
        
        this.emit('auto-restart-triggered', { 
            reason, 
            attempt: this.autoRestartAttempts,
            timestamp: new Date() 
        });
        
        try {
            // グレースフル停止
            await this.stop(false);
            
            // 待機時間
            await new Promise(resolve => 
                setTimeout(resolve, this.config.autoRestart.gracePeriod)
            );
            
            // 再起動
            await this.start();
            
            this.logger.info('Auto-restart completed', { 
                reason, 
                attempt: this.autoRestartAttempts 
            });
            
            this.emit('auto-restart-completed', { 
                reason, 
                attempt: this.autoRestartAttempts,
                timestamp: new Date() 
            });
            
        } catch (error) {
            this.logger.error('Auto-restart failed', { 
                reason, 
                attempt: this.autoRestartAttempts,
                error: error.message 
            });
            
            this.emit('auto-restart-error', { 
                reason, 
                attempt: this.autoRestartAttempts,
                error: error.message,
                timestamp: new Date() 
            });
            
            // リトライ待機
            setTimeout(() => {
                this._triggerAutoRestart(reason);
            }, this.config.autoRestart.retryDelay);
        }
    }
    
    /**
     * プロパティファイル解析
     * @private
     */
    _parseProperties(content) {
        const properties = {};
        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // コメント行・空行をスキップ
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }
            
            const equalIndex = trimmed.indexOf('=');
            if (equalIndex > 0) {
                const key = trimmed.substring(0, equalIndex).trim();
                const value = trimmed.substring(equalIndex + 1).trim();
                properties[key] = value;
            }
        }
        
        return properties;
    }
    
    /**
     * プロパティファイル文字列化
     * @private
     */
    _stringifyProperties(properties) {
        const lines = [
            '#Minecraft server properties',
            `#Generated by ownserver-manager on ${new Date().toISOString()}`,
            ''
        ];
        
        for (const [key, value] of Object.entries(properties)) {
            lines.push(`${key}=${value}`);
        }
        
        return lines.join('\n');
    }
}

module.exports = MinecraftServerManager_Phase2;
