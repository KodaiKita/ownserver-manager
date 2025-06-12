/**
 * Logger Utility
 * ログ管理・出力機能
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor(category, logLevel = null) {
        this.category = category;
        this.logLevel = logLevel || process.env.LOG_LEVEL || 'info';
        this.logDir = process.env.LOG_DIR || '/app/logs';
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.maxFiles = 5;
        
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        
        this.ensureLogDirectory();
    }

    /**
     * ログディレクトリの作成
     */
    ensureLogDirectory() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true, mode: 0o755 });
            }
        } catch (error) {
            console.error(`Failed to create log directory ${this.logDir}:`, error);
        }
    }

    /**
     * ログ出力（汎用）
     */
    async log(level, message, data = null) {
        // レベル確認
        if (this.levels[level] < this.levels[this.logLevel]) {
            return;
        }

        const logEntry = this.formatLog(level, message, data);
        
        // コンソール出力（開発時またはdebugレベル時）
        if (this.logLevel === 'debug' || process.env.NODE_ENV !== 'production') {
            this.outputToConsole(level, logEntry);
        }

        // ファイル出力
        try {
            this.writeToFileSync(logEntry);
        } catch (error) {
            console.error('Failed to write log:', error);
        }
    }

    /**
     * DEBUGレベルログ
     */
    async debug(message, data = null) {
        await this.log('debug', message, data);
    }

    /**
     * INFOレベルログ
     */
    async info(message, data = null) {
        await this.log('info', message, data);
    }

    /**
     * WARNレベルログ
     */
    async warn(message, data = null) {
        await this.log('warn', message, data);
    }

    /**
     * ERRORレベルログ
     */
    async error(message, data = null) {
        await this.log('error', message, data);
    }

    /**
     * ログフォーマット作成
     */
    formatLog(level, message, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            category: this.category,
            message: message,
            pid: process.pid
        };

        if (data !== null) {
            logEntry.data = data;
        }

        if (level === 'error' && data instanceof Error) {
            logEntry.stack = data.stack;
            logEntry.data = {
                name: data.name,
                message: data.message
            };
        }

        return logEntry;
    }

    /**
     * コンソール出力
     */
    outputToConsole(level, logEntry) {
        const colorMap = {
            debug: '\x1b[36m', // Cyan
            info: '\x1b[32m',  // Green
            warn: '\x1b[33m',  // Yellow
            error: '\x1b[31m'  // Red
        };
        
        const resetColor = '\x1b[0m';
        const color = colorMap[level] || '';
        
        const timestamp = logEntry.timestamp.substring(11, 23); // HH:mm:ss.sss
        const prefix = `${color}[${timestamp}] ${logEntry.level.padEnd(5)} [${logEntry.category}]${resetColor}`;
        
        if (logEntry.data) {
            console.log(`${prefix} ${logEntry.message}`, logEntry.data);
        } else {
            console.log(`${prefix} ${logEntry.message}`);
        }
    }

    /**
     * ファイル書き込み（同期版）
     */
    writeToFileSync(logEntry) {
        const filePath = this.getLogFilePath();
        
        // ローテーション確認
        try {
            const stats = fs.statSync(filePath);
            if (stats.size >= this.maxFileSize) {
                this.rotateLogSync(filePath);
            }
        } catch (error) {
            // ファイルが存在しない場合は無視
        }

        const logLine = JSON.stringify(logEntry) + '\n';
        fs.appendFileSync(filePath, logLine, 'utf8');
    }

    /**
     * ログローテーション（同期版）
     */
    rotateLogSync(filePath) {
        try {
            // 既存のバックアップファイルをシフト
            for (let i = this.maxFiles - 1; i > 0; i--) {
                const oldFile = `${filePath}.${i}`;
                const newFile = `${filePath}.${i + 1}`;
                
                if (fs.existsSync(oldFile)) {
                    if (i === this.maxFiles - 1) {
                        fs.unlinkSync(oldFile); // 最古ファイル削除
                    } else {
                        fs.renameSync(oldFile, newFile);
                    }
                }
            }

            // 現在のファイルを .1 にリネーム
            fs.renameSync(filePath, `${filePath}.1`);
            
        } catch (error) {
            console.error(`Log rotation failed for ${filePath}:`, error);
        }
    }

    /**
     * ファイルパス生成
     */
    getLogFilePath() {
        return path.join(this.logDir, `${this.category}.log`);
    }

    /**
     * ログレベル変更
     */
    setLogLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.logLevel = level;
        } else {
            throw new Error(`Invalid log level: ${level}. Valid levels: ${Object.keys(this.levels).join(', ')}`);
        }
    }

    /**
     * ログファイル読み込み（最新N行）
     */
    readRecentLogs(lines = 100) {
        const filePath = this.getLogFilePath();
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const logLines = content.trim().split('\n').slice(-lines);
            
            return logLines.map(line => {
                try {
                    return JSON.parse(line);
                } catch (error) {
                    return { message: line, timestamp: new Date().toISOString() };
                }
            });
        } catch (error) {
            return [];
        }
    }
}

module.exports = Logger;
