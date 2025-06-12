/**
 * MinecraftServerManager - Phase 1
 * 基本プロセス管理 - Java管理、サーバー起動・停止
 * 
 * Phase1 Features:
 * - Java自動ダウンロード・インストール
 * - Minecraftサーバープロセス起動・停止
 * - 基本ログ統合（Logger連携）
 * - シンプルなエラーハンドリング
 * - プロセス状態監視
 */

const EventEmitter = require('events');
const { spawn } = require('child_process');
const { promises: fs } = require('fs');
const fsSync = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const zlib = require('zlib');
const tar = require('tar');

const Logger = require('../Logger');
const ConfigManager = require('../ConfigManager');
const JavaVersionManager = require('../JavaVersionManager');
const EULAManager = require('../EULAManager');

class MinecraftServerManager_Phase1 extends EventEmitter {
    constructor(serverDirectory, config = {}) {
        super();
        
        // 基本設定
        this.serverDirectory = path.resolve(serverDirectory);
        this.config = {
            javaVersion: 'auto', // 'auto', '8', '11', '17', '21'
            javaArgs: ['-Xmx2G', '-Xms1G'],
            serverJar: 'server.jar',
            autoDownloadJava: true,
            retryAttempts: 3,
            retryDelay: 5000,
            ...config
        };
        
        // 状態管理
        this.process = null;
        this.isRunning = false;
        this.isStarting = false;
        this.isStopping = false;
        this.startTime = null;
        this.retryCount = 0;
        
        // パス設定
        this.javaDirectory = path.join(process.cwd(), 'java-runtimes');
        this.serverJarPath = path.join(this.serverDirectory, this.config.serverJar);
        this.logFile = path.join(this.serverDirectory, 'server.log');
        
        // Logger設定
        this.logger = new Logger('minecraft-server', {
            category: 'minecraft',
            enableConsole: true,
            enableFile: true
        });
        
        // EULA Manager設定
        this.eulaManager = new EULAManager(this.logger);
        
        this.logger.info('MinecraftServerManager Phase1 initialized', {
            serverDirectory: this.serverDirectory,
            javaVersion: this.config.javaVersion,
            javaArgs: this.config.javaArgs
        });
    }
    
    /**
     * Minecraftサーバー起動
     * @returns {Promise<void>}
     */
    async start() {
        if (this.isRunning || this.isStarting) {
            throw new Error('Server is already running or starting');
        }
        
        this.isStarting = true;
        this.retryCount = 0;
        
        try {
            this.logger.info('Starting Minecraft server...', {
                serverDirectory: this.serverDirectory,
                javaVersion: this.config.javaVersion
            });
            
            // 前提条件チェック
            await this._validateEnvironment();
            
            // EULA確認・自動同意
            await this._handleEULA();
            
            // Java環境準備
            const javaPath = await this._ensureJavaInstallation();
            
            // Minecraft サーバー起動
            await this._startMinecraftProcess(javaPath);
            
            this.isStarting = false;
            this.isRunning = true;
            this.startTime = new Date();
            
            this.logger.info('Minecraft server started successfully', {
                pid: this.process.pid,
                javaPath,
                startTime: this.startTime
            });
            
            this.emit('started', {
                pid: this.process.pid,
                startTime: this.startTime
            });
            
        } catch (error) {
            this.isStarting = false;
            this.logger.error('Failed to start Minecraft server', { error: error.message });
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * Minecraftサーバー停止
     * @param {boolean} force - 強制停止フラグ
     * @returns {Promise<void>}
     */
    async stop(force = false) {
        if (!this.isRunning || this.isStopping) {
            this.logger.warn('Server is not running or already stopping');
            return;
        }
        
        this.isStopping = true;
        
        try {
            this.logger.info('Stopping Minecraft server...', { force });
            
            if (force) {
                // 強制停止
                this.process.kill('SIGKILL');
                this.logger.warn('Minecraft server force stopped');
            } else {
                // グレースフル停止
                this.process.kill('SIGTERM');
                
                // 停止を待機（最大30秒）
                await this._waitForProcessExit(30000);
            }
            
            this._cleanup();
            
            this.logger.info('Minecraft server stopped successfully');
            this.emit('stopped');
            
        } catch (error) {
            this.logger.error('Error stopping Minecraft server', { error: error.message });
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * サーバー状態確認
     * @returns {boolean}
     */
    isServerRunning() {
        return this.isRunning && this.process && !this.process.killed;
    }
    
    /**
     * Java自動ダウンロード
     * @param {string} version - Javaバージョン
     * @returns {Promise<string>} - Javaバイナリパス
     */
    async downloadJava(version) {
        if (!this.config.autoDownloadJava) {
            throw new Error('Java auto-download is disabled');
        }
        
        const downloadInfo = JavaVersionManager.getJavaDownloadInfo(version);
        if (!downloadInfo) {
            throw new Error(`No download information available for Java ${version}`);
        }
        
        const javaInstallPath = path.join(this.javaDirectory, `java-${version}`);
        const javaBinaryPath = path.join(javaInstallPath, 'bin', 'java');
        
        // 既にインストール済みかチェック
        if (await this._fileExists(javaBinaryPath)) {
            this.logger.info('Java already installed', { version, path: javaBinaryPath });
            return javaBinaryPath;
        }
        
        this.logger.info('Downloading Java...', { version, url: downloadInfo.linux_x64 });
        
        try {
            // ダウンロードディレクトリ作成
            await fs.mkdir(this.javaDirectory, { recursive: true });
            
            // Javaダウンロード・展開
            await this._downloadAndExtractJava(downloadInfo.linux_x64, javaInstallPath);
            
            // インストール検証
            await this.validateJavaInstallation(javaBinaryPath);
            
            this.logger.info('Java downloaded and installed successfully', { 
                version, 
                path: javaBinaryPath 
            });
            
            return javaBinaryPath;
            
        } catch (error) {
            this.logger.error('Failed to download Java', { 
                version, 
                error: error.message 
            });
            throw error;
        }
    }
    
    /**
     * Javaインストール検証
     * @param {string} javaPath - Javaバイナリパス
     * @returns {Promise<void>}
     */
    async validateJavaInstallation(javaPath) {
        try {
            const { spawn } = require('child_process');
            
            const result = await new Promise((resolve, reject) => {
                const java = spawn(javaPath, ['-version']);
                let output = '';
                
                java.stderr.on('data', (data) => {
                    output += data.toString();
                });
                
                java.on('close', (code) => {
                    if (code === 0) {
                        resolve(output);
                    } else {
                        reject(new Error(`Java validation failed with code ${code}`));
                    }
                });
                
                java.on('error', reject);
                
                // タイムアウト設定
                setTimeout(() => {
                    java.kill('SIGKILL');
                    reject(new Error('Java validation timeout'));
                }, 10000);
            });
            
            this.logger.debug('Java validation successful', { 
                javaPath, 
                output: result.trim() 
            });
            
        } catch (error) {
            throw new Error(`Java validation failed: ${error.message}`);
        }
    }
    
    // Private methods
    
    /**
     * 環境検証
     * @private
     */
    async _validateEnvironment() {
        // サーバーディレクトリ存在確認
        if (!await this._fileExists(this.serverDirectory)) {
            throw new Error(`Server directory does not exist: ${this.serverDirectory}`);
        }
        
        // server.jar存在確認
        if (!await this._fileExists(this.serverJarPath)) {
            throw new Error(`Server jar not found: ${this.serverJarPath}`);
        }
        
        this.logger.debug('Environment validation passed');
    }
    
    /**
     * Java環境確保
     * @private
     * @returns {Promise<string>} - Javaバイナリパス
     */
    async _ensureJavaInstallation() {
        // Javaバージョン決定
        let javaVersion = this.config.javaVersion;
        
        if (javaVersion === 'auto') {
            // server.jarから自動検出
            javaVersion = await this._detectRequiredJavaVersion();
            this.logger.info('Auto-detected Java version', { 
                javaVersion,
                serverJar: this.config.serverJar 
            });
        }
        
        // システムJava確認
        try {
            const systemJava = await this._findSystemJava(javaVersion);
            if (systemJava) {
                this.logger.info('Using system Java', { javaPath: systemJava });
                return systemJava;
            }
        } catch (error) {
            this.logger.debug('System Java not suitable', { error: error.message });
        }
        
        // Java自動ダウンロード
        if (this.config.autoDownloadJava) {
            return await this.downloadJava(javaVersion);
        } else {
            throw new Error(`Java ${javaVersion} not found and auto-download is disabled`);
        }
    }
    
    /**
     * 必要なJavaバージョンを自動検出
     * @private
     * @returns {Promise<string>} - 必要なJavaバージョン
     */
    async _detectRequiredJavaVersion() {
        try {
            // server.jarからMinecraftバージョンを検出
            const minecraftVersion = JavaVersionManager.detectMinecraftVersionFromJar(this.config.serverJar);
            const serverType = JavaVersionManager.detectServerTypeFromJar(this.config.serverJar);
            
            if (minecraftVersion) {
                const recommendation = JavaVersionManager.getRecommendedJavaVersion(minecraftVersion, serverType);
                
                this.logger.info('Detected Minecraft version and server type', {
                    minecraftVersion,
                    serverType,
                    recommendedJava: recommendation.version,
                    serverJar: this.config.serverJar
                });
                
                return recommendation.version;
            }
        } catch (error) {
            this.logger.warn('Failed to auto-detect Java version', { 
                error: error.message,
                serverJar: this.config.serverJar 
            });
        }
        
        // フォールバック: Java 17をデフォルトとして使用
        this.logger.info('Using fallback Java version', { javaVersion: '17' });
        return '17';
    }
    
    /**
     * EULA処理
     * @private
     * @returns {Promise<void>}
     */
    async _handleEULA() {
        try {
            await this.eulaManager.ensureEULACompliance(this.serverDirectory, this.config);
            
            this.logger.info('EULA compliance verified', {
                serverDirectory: this.serverDirectory
            });
        } catch (error) {
            this.logger.error('EULA compliance failed', { 
                error: error.message,
                serverDirectory: this.serverDirectory 
            });
            throw error;
        }
    }
    
    /**
     * システムJava検索
     * @private
     * @param {string} requiredVersion
     * @returns {Promise<string|null>}
     */
    async _findSystemJava(requiredVersion) {
        const javaCommands = ['java', 'java17', 'java11', 'java8'];
        
        for (const javaCmd of javaCommands) {
            try {
                const { spawn } = require('child_process');
                
                const version = await new Promise((resolve, reject) => {
                    const java = spawn(javaCmd, ['-version']);
                    let output = '';
                    
                    java.stderr.on('data', (data) => {
                        output += data.toString();
                    });
                    
                    java.on('close', (code) => {
                        if (code === 0) {
                            resolve(output);
                        } else {
                            reject(new Error(`Exit code ${code}`));
                        }
                    });
                    
                    java.on('error', reject);
                });
                
                // バージョン番号抽出（簡易）
                const versionMatch = version.match(/version "(\d+)/);
                if (versionMatch && versionMatch[1] === requiredVersion) {
                    return javaCmd;
                }
                
            } catch (error) {
                continue;
            }
        }
        
        return null;
    }
    
    /**
     * Minecraftプロセス起動
     * @private
     * @param {string} javaPath
     */
    async _startMinecraftProcess(javaPath) {
        const args = [
            ...this.config.javaArgs,
            '-jar', this.config.serverJar,
            'nogui'
        ];
        
        this.logger.debug('Starting Minecraft process', { 
            javaPath, 
            args, 
            cwd: this.serverDirectory 
        });
        
        this.process = spawn(javaPath, args, {
            cwd: this.serverDirectory,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // ログ設定
        this._setupLogging();
        
        // プロセス終了監視
        this.process.on('exit', this._handleProcessExit.bind(this));
        this.process.on('error', this._handleProcessError.bind(this));
    }
    
    /**
     * ログ設定
     * @private
     */
    _setupLogging() {
        this.process.stdout.on('data', (data) => {
            const logData = data.toString().trim();
            if (logData) {
                this.logger.info('[MC-STDOUT]', { data: logData });
                this.emit('log', { type: 'stdout', data: logData });
            }
        });
        
        this.process.stderr.on('data', (data) => {
            const logData = data.toString().trim();
            if (logData) {
                this.logger.warn('[MC-STDERR]', { data: logData });
                this.emit('log', { type: 'stderr', data: logData });
            }
        });
    }
    
    /**
     * プロセス終了処理
     * @private
     */
    _handleProcessExit(code, signal) {
        this.logger.info('Minecraft process exited', { code, signal });
        
        this._cleanup();
        
        this.emit('exit', { code, signal });
        
        // 異常終了の場合、エラーイベント発火（uncaught error対策）
        if (code !== 0 && code !== null && this.listenerCount('error') > 0) {
            this.emit('error', new Error(`Minecraft server exited with code ${code}`));
        }
    }
    
    /**
     * プロセスエラー処理
     * @private
     */
    _handleProcessError(error) {
        this.logger.error('Minecraft process error', { error: error.message });
        this._cleanup();
        this.emit('error', error);
    }
    
    /**
     * クリーンアップ
     * @private
     */
    _cleanup() {
        this.isRunning = false;
        this.isStarting = false;
        this.isStopping = false;
        this.process = null;
        this.startTime = null;
    }
    
    /**
     * プロセス終了待機
     * @private
     * @param {number} timeout - タイムアウト（ミリ秒）
     */
    async _waitForProcessExit(timeout = 30000) {
        if (!this.process) return;
        
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                if (this.process && !this.process.killed) {
                    this.process.kill('SIGKILL');
                    this.logger.warn('Process force killed due to timeout');
                }
                resolve();
            }, timeout);
            
            this.process.on('exit', () => {
                clearTimeout(timer);
                resolve();
            });
        });
    }
    
    /**
     * Java ダウンロード・展開
     * @private
     */
    async _downloadAndExtractJava(url, installPath) {
        const response = await this._httpsGet(url);
        const tarPath = path.join(this.javaDirectory, 'java.tar.gz');
        
        // ダウンロード
        await pipeline(response, fsSync.createWriteStream(tarPath));
        
        // 展開
        await fs.mkdir(installPath, { recursive: true });
        await tar.extract({
            file: tarPath,
            cwd: installPath,
            strip: 1 // 最上位ディレクトリをストリップ
        });
        
        // 一時ファイル削除
        await fs.unlink(tarPath);
    }
    
    /**
     * HTTPS GET
     * @private
     */
    _httpsGet(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // リダイレクト処理
                    return this._httpsGet(response.headers.location).then(resolve, reject);
                }
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}`));
                    return;
                }
                resolve(response);
            }).on('error', reject);
        });
    }
    
    /**
     * ファイル存在確認
     * @private
     */
    async _fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = MinecraftServerManager_Phase1;
