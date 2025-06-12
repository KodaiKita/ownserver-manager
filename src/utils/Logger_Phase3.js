/**
 * Logger - Phase 3: Multiple Log Levels + Console Output
 * 複数のログレベルとコンソール出力
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor(category, logLevel = null) {
        this.category = category;
        this.logLevel = logLevel || process.env.LOG_LEVEL || 'info';
        this.logDir = process.env.LOG_DIR || './logs';
        
        // ログレベル定義
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        
        console.log(`Logger created: ${this.category} (level: ${this.logLevel})`);
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        } catch (error) {
            console.error(`Failed to create log directory: ${error.message}`);
        }
    }

    // Phase 3: ログレベルチェック
    shouldLog(level) {
        return this.levels[level] >= this.levels[this.logLevel];
    }

    // Phase 3: コンソール出力（カラー付き）
    outputToConsole(level, entry) {
        const colorMap = {
            debug: '\x1b[36m',  // Cyan
            info: '\x1b[32m',   // Green
            warn: '\x1b[33m',   // Yellow
            error: '\x1b[31m'   // Red
        };
        
        const resetColor = '\x1b[0m';
        const color = colorMap[level] || '';
        
        const timestamp = entry.timestamp.substring(11, 19); // HH:mm:ss
        const prefix = `${color}[${timestamp}] ${entry.level.padEnd(5)} [${entry.category}]${resetColor}`;
        
        if (entry.data) {
            console.log(`${prefix} ${entry.message}`, entry.data);
        } else {
            console.log(`${prefix} ${entry.message}`);
        }
    }

    createLogEntry(level, message, data = null) {
        const entry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            category: this.category,
            message: message,
            pid: process.pid
        };

        if (data !== null) {
            entry.data = data;
        }

        // エラーオブジェクトの特別処理
        if (level === 'error' && data instanceof Error) {
            entry.stack = data.stack;
            entry.data = {
                name: data.name,
                message: data.message
            };
        }

        return entry;
    }

    writeLogEntry(entry) {
        const filePath = this.getLogFilePath();
        const logLine = JSON.stringify(entry) + '\n';
        
        try {
            fs.appendFileSync(filePath, logLine, 'utf8');
            return true;
        } catch (error) {
            console.error(`Failed to write log: ${error.message}`);
            return false;
        }
    }

    // Phase 3: 汎用ログメソッド
    log(level, message, data = null) {
        if (!this.shouldLog(level)) {
            return false;
        }

        const entry = this.createLogEntry(level, message, data);
        
        // コンソール出力（開発時またはdebugレベル時）
        if (this.logLevel === 'debug' || process.env.NODE_ENV !== 'production') {
            this.outputToConsole(level, entry);
        }

        return this.writeLogEntry(entry);
    }

    // Phase 3: 各ログレベルのメソッド
    debug(message, data = null) {
        return this.log('debug', message, data);
    }

    info(message, data = null) {
        return this.log('info', message, data);
    }

    warn(message, data = null) {
        return this.log('warn', message, data);
    }

    error(message, data = null) {
        return this.log('error', message, data);
    }

    // Phase 3: ログレベル変更
    setLogLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.logLevel = level;
            this.info(`Log level changed to: ${level}`);
        } else {
            this.error(`Invalid log level: ${level}`);
        }
    }

    getLogFilePath() {
        return path.join(this.logDir, `${this.category}.log`);
    }

    getInfo() {
        return {
            category: this.category,
            logLevel: this.logLevel,
            logDir: this.logDir,
            logPath: this.getLogFilePath()
        };
    }
}

module.exports = Logger;
