/**
 * LogParser - Minecraft Server Log Analysis Utility
 * Minecraftサーバーログの解析・パース機能
 * 
 * Phase2機能:
 * - リアルタイムログ解析
 * - サーバー状態検出
 * - プレイヤー監視
 * - エラー分類
 */

const EventEmitter = require('events');

class LogParser extends EventEmitter {
    constructor(logger) {
        super();
        this.logger = logger;
        
        // ログパターン定義
        this.patterns = {
            // サーバー状態
            serverReady: /\[.*\]: Done \((.*)\)! For help, type "help".*$/,
            serverStarting: /\[.*\]: Starting minecraft server version (.*)/,
            serverStopping: /\[.*\]: Stopping server/,
            serverShutdown: /\[.*\]: Stopping the server/,
            
            // プレイヤー関連
            playerJoin: /\[.*\]: (.*) joined the game/,
            playerLeave: /\[.*\]: (.*) left the game/,
            playerMessage: /\[.*\]: <(.*)> (.*)/,
            playerCommand: /\[.*\]: (.*) issued server command: (.*)/,
            
            // パフォーマンス・警告
            tickWarning: /\[.*WARN.*\]: Can't keep up! Is the server overloaded\? Running (\d+)ms or (\d+) ticks behind/,
            memoryWarning: /\[.*WARN.*\]: Memory usage:/,
            connectionLost: /\[.*\]: (.*) lost connection: (.*)/,
            
            // エラー・例外
            error: /\[.*ERROR.*\]: (.*)/,
            exception: /\[.*\]: (.*(Exception|Error).*)/,
            stackTrace: /\s+at .*/,
            
            // コマンド実行結果
            commandResult: /\[.*\]: \[(.*): (.*)\]/,
            
            // ワールド保存
            worldSave: /\[.*\]: Saved the game/,
            worldSaving: /\[.*\]: Saving the game/,
            
            // リソースパック・データパック
            resourcePack: /\[.*\]: (.*) (accepted|declined) server resource pack/,
            datapackLoaded: /\[.*\]: Loaded (\d+) recipes/,
            
            // Paper/Spigot特有ログ
            paperInfo: /\[.*\]: This server is running Paper version/,
            pluginEnabled: /\[.*\]: Enabled (.*) v(.*)/,
            pluginDisabled: /\[.*\]: Disabled (.*)/
        };
        
        // サーバー状態管理
        this.serverState = {
            status: 'unknown', // unknown, starting, ready, stopping, stopped
            startTime: null,
            readyTime: null,
            version: null,
            onlinePlayers: new Set(),
            playerCount: 0,
            lastSeen: new Date()
        };
        
        // 統計情報
        this.stats = {
            totalMessages: 0,
            errorCount: 0,
            warningCount: 0,
            playerJoins: 0,
            playerLeaves: 0,
            commandCount: 0
        };
        
        this.logger.info('LogParser initialized', {
            patterns: Object.keys(this.patterns).length,
            state: this.serverState.status
        });
    }
    
    /**
     * ログ行を解析
     * @param {string} logLine - 解析するログ行
     * @returns {object} - 解析結果
     */
    parseLogLine(logLine) {
        if (!logLine || typeof logLine !== 'string') {
            return null;
        }
        
        const line = logLine.trim();
        if (!line) return null;
        
        this.stats.totalMessages++;
        this.serverState.lastSeen = new Date();
        
        // 各パターンでマッチング
        const result = {
            raw: line,
            timestamp: this._extractTimestamp(line),
            type: 'unknown',
            data: {},
            parsed: false
        };
        
        // サーバー状態検出
        if (this._checkServerReady(line, result)) return result;
        if (this._checkServerStarting(line, result)) return result;
        if (this._checkServerStopping(line, result)) return result;
        
        // プレイヤー監視
        if (this._checkPlayerJoin(line, result)) return result;
        if (this._checkPlayerLeave(line, result)) return result;
        if (this._checkPlayerMessage(line, result)) return result;
        if (this._checkPlayerCommand(line, result)) return result;
        
        // パフォーマンス・警告
        if (this._checkTickWarning(line, result)) return result;
        if (this._checkConnectionLost(line, result)) return result;
        
        // エラー・例外
        if (this._checkError(line, result)) return result;
        if (this._checkException(line, result)) return result;
        
        // その他の重要なイベント
        if (this._checkWorldSave(line, result)) return result;
        if (this._checkPaperInfo(line, result)) return result;
        
        // パターンマッチしなかった場合
        result.type = 'info';
        return result;
    }
    
    /**
     * サーバー状態取得
     */
    getServerState() {
        return {
            ...this.serverState,
            onlinePlayers: Array.from(this.serverState.onlinePlayers),
            uptime: this.serverState.readyTime ? 
                Date.now() - this.serverState.readyTime.getTime() : null
        };
    }
    
    /**
     * 統計情報取得
     */
    getStats() {
        return { ...this.stats };
    }
    
    /**
     * プレイヤー数取得
     */
    getPlayerCount() {
        return this.serverState.playerCount;
    }
    
    /**
     * オンラインプレイヤーリスト取得
     */
    getPlayerList() {
        return Array.from(this.serverState.onlinePlayers);
    }
    
    /**
     * サーバー準備完了状態確認
     */
    isServerReady() {
        return this.serverState.status === 'ready';
    }
    
    // 内部解析メソッド
    
    _extractTimestamp(line) {
        const timestampMatch = line.match(/^\[(\d{2}:\d{2}:\d{2})\]/);
        if (timestampMatch) {
            const timeStr = timestampMatch[1];
            const today = new Date();
            const [hours, minutes, seconds] = timeStr.split(':').map(Number);
            
            const timestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                hours, minutes, seconds);
            return timestamp;
        }
        return new Date();
    }
    
    _checkServerReady(line, result) {
        const match = line.match(this.patterns.serverReady);
        if (match) {
            const startupTime = match[1];
            
            this.serverState.status = 'ready';
            this.serverState.readyTime = new Date();
            
            result.type = 'server-ready';
            result.data = { startupTime };
            result.parsed = true;
            
            this.logger.info('Server ready detected', { startupTime });
            this.emit('server-ready', { startupTime, timestamp: result.timestamp });
            
            return true;
        }
        return false;
    }
    
    _checkServerStarting(line, result) {
        const match = line.match(this.patterns.serverStarting);
        if (match) {
            const version = match[1];
            
            this.serverState.status = 'starting';
            this.serverState.startTime = new Date();
            this.serverState.version = version;
            
            result.type = 'server-starting';
            result.data = { version };
            result.parsed = true;
            
            this.logger.info('Server starting detected', { version });
            this.emit('server-starting', { version, timestamp: result.timestamp });
            
            return true;
        }
        return false;
    }
    
    _checkServerStopping(line, result) {
        if (this.patterns.serverStopping.test(line) || 
            this.patterns.serverShutdown.test(line)) {
            
            this.serverState.status = 'stopping';
            
            result.type = 'server-stopping';
            result.data = {};
            result.parsed = true;
            
            this.logger.info('Server stopping detected');
            this.emit('server-stopping', { timestamp: result.timestamp });
            
            return true;
        }
        return false;
    }
    
    _checkPlayerJoin(line, result) {
        const match = line.match(this.patterns.playerJoin);
        if (match) {
            const playerName = match[1];
            
            this.serverState.onlinePlayers.add(playerName);
            this.serverState.playerCount = this.serverState.onlinePlayers.size;
            this.stats.playerJoins++;
            
            result.type = 'player-join';
            result.data = { 
                player: playerName, 
                count: this.serverState.playerCount 
            };
            result.parsed = true;
            
            this.logger.info('Player joined', { 
                player: playerName, 
                count: this.serverState.playerCount 
            });
            this.emit('player-join', {
                player: playerName,
                count: this.serverState.playerCount,
                timestamp: result.timestamp
            });
            
            return true;
        }
        return false;
    }
    
    _checkPlayerLeave(line, result) {
        const match = line.match(this.patterns.playerLeave);
        if (match) {
            const playerName = match[1];
            
            this.serverState.onlinePlayers.delete(playerName);
            this.serverState.playerCount = this.serverState.onlinePlayers.size;
            this.stats.playerLeaves++;
            
            result.type = 'player-leave';
            result.data = { 
                player: playerName, 
                count: this.serverState.playerCount 
            };
            result.parsed = true;
            
            this.logger.info('Player left', { 
                player: playerName, 
                count: this.serverState.playerCount 
            });
            this.emit('player-leave', {
                player: playerName,
                count: this.serverState.playerCount,
                timestamp: result.timestamp
            });
            
            return true;
        }
        return false;
    }
    
    _checkPlayerMessage(line, result) {
        const match = line.match(this.patterns.playerMessage);
        if (match) {
            const playerName = match[1];
            const message = match[2];
            
            result.type = 'player-message';
            result.data = { player: playerName, message };
            result.parsed = true;
            
            this.emit('player-message', {
                player: playerName,
                message,
                timestamp: result.timestamp
            });
            
            return true;
        }
        return false;
    }
    
    _checkPlayerCommand(line, result) {
        const match = line.match(this.patterns.playerCommand);
        if (match) {
            const playerName = match[1];
            const command = match[2];
            
            this.stats.commandCount++;
            
            result.type = 'player-command';
            result.data = { player: playerName, command };
            result.parsed = true;
            
            this.emit('player-command', {
                player: playerName,
                command,
                timestamp: result.timestamp
            });
            
            return true;
        }
        return false;
    }
    
    _checkTickWarning(line, result) {
        const match = line.match(this.patterns.tickWarning);
        if (match) {
            const delay = parseInt(match[1]);
            const ticks = parseInt(match[2]);
            
            this.stats.warningCount++;
            
            result.type = 'performance-warning';
            result.data = { delay, ticks, issue: 'tick-lag' };
            result.parsed = true;
            
            this.logger.warn('Performance warning detected', { delay, ticks });
            this.emit('performance-warning', {
                issue: 'tick-lag',
                delay,
                ticks,
                timestamp: result.timestamp
            });
            
            return true;
        }
        return false;
    }
    
    _checkConnectionLost(line, result) {
        const match = line.match(this.patterns.connectionLost);
        if (match) {
            const playerName = match[1];
            const reason = match[2];
            
            // プレイヤーリストから削除（接続切断）
            this.serverState.onlinePlayers.delete(playerName);
            this.serverState.playerCount = this.serverState.onlinePlayers.size;
            
            result.type = 'connection-lost';
            result.data = { player: playerName, reason };
            result.parsed = true;
            
            this.emit('connection-lost', {
                player: playerName,
                reason,
                count: this.serverState.playerCount,
                timestamp: result.timestamp
            });
            
            return true;
        }
        return false;
    }
    
    _checkError(line, result) {
        const match = line.match(this.patterns.error);
        if (match) {
            const errorMessage = match[1];
            
            this.stats.errorCount++;
            
            result.type = 'error';
            result.data = { message: errorMessage };
            result.parsed = true;
            
            this.logger.error('Server error detected', { message: errorMessage });
            this.emit('server-error', {
                message: errorMessage,
                timestamp: result.timestamp
            });
            
            return true;
        }
        return false;
    }
    
    _checkException(line, result) {
        const match = line.match(this.patterns.exception);
        if (match) {
            const exceptionText = match[1];
            
            this.stats.errorCount++;
            
            result.type = 'exception';
            result.data = { exception: exceptionText };
            result.parsed = true;
            
            this.logger.error('Server exception detected', { exception: exceptionText });
            this.emit('server-exception', {
                exception: exceptionText,
                timestamp: result.timestamp
            });
            
            return true;
        }
        return false;
    }
    
    _checkWorldSave(line, result) {
        if (this.patterns.worldSave.test(line)) {
            result.type = 'world-save';
            result.data = {};
            result.parsed = true;
            
            this.emit('world-save', { timestamp: result.timestamp });
            return true;
        }
        
        if (this.patterns.worldSaving.test(line)) {
            result.type = 'world-saving';
            result.data = {};
            result.parsed = true;
            
            this.emit('world-saving', { timestamp: result.timestamp });
            return true;
        }
        
        return false;
    }
    
    _checkPaperInfo(line, result) {
        if (this.patterns.paperInfo.test(line)) {
            result.type = 'server-info';
            result.data = { serverType: 'Paper' };
            result.parsed = true;
            
            this.emit('server-info', { 
                serverType: 'Paper', 
                timestamp: result.timestamp 
            });
            return true;
        }
        return false;
    }
    
    /**
     * 状態リセット（サーバー再起動時など）
     */
    resetState() {
        this.serverState = {
            status: 'unknown',
            startTime: null,
            readyTime: null,
            version: null,
            onlinePlayers: new Set(),
            playerCount: 0,
            lastSeen: new Date()
        };
        
        this.logger.info('LogParser state reset');
        this.emit('state-reset');
    }
}

module.exports = LogParser;
