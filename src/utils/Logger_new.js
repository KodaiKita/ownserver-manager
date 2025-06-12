/**
 * Logger Utility - Working Version
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

    ensureLogDirectory() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true, mode: 0o755 });
            }
        } catch (error) {
            console.error(`Failed to create log directory ${this.logDir}:`, error);
        }
    }

    async log(level, message, data = null) {
        if (this.levels[level] < this.levels[this.logLevel]) {
            return;
        }

        const logEntry = this.formatLog(level, message, data);
        
        if (this.logLevel === 'debug' || process.env.NODE_ENV !== 'production') {
            this.outputToConsole(level, logEntry);
        }

        try {
            this.writeToFileSync(logEntry);
        } catch (error) {
            console.error('Failed to write log:', error);
        }
    }

    async debug(message, data = null) {
        await this.log('debug', message, data);
    }

    async info(message, data = null) {
        await this.log('info', message, data);
    }

    async warn(message, data = null) {
        await this.log('warn', message, data);
    }

    async error(message, data = null) {
        await this.log('error', message, data);
    }

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

    outputToConsole(level, logEntry) {
        const colorMap = {
            debug: '\x1b[36m',
            info: '\x1b[32m',
            warn: '\x1b[33m',
            error: '\x1b[31m'
        };
        
        const resetColor = '\x1b[0m';
        const color = colorMap[level] || '';
        
        const timestamp = logEntry.timestamp.substring(11, 23);
        const prefix = `${color}[${timestamp}] ${logEntry.level.padEnd(5)} [${logEntry.category}]${resetColor}`;
        
        if (logEntry.data) {
            console.log(`${prefix} ${logEntry.message}`, logEntry.data);
        } else {
            console.log(`${prefix} ${logEntry.message}`);
        }
    }

    writeToFileSync(logEntry) {
        const filePath = this.getLogFilePath();
        
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

    rotateLogSync(filePath) {
        try {
            for (let i = this.maxFiles - 1; i > 0; i--) {
                const oldFile = `${filePath}.${i}`;
                const newFile = `${filePath}.${i + 1}`;
                
                if (fs.existsSync(oldFile)) {
                    if (i === this.maxFiles - 1) {
                        fs.unlinkSync(oldFile);
                    } else {
                        fs.renameSync(oldFile, newFile);
                    }
                }
            }

            fs.renameSync(filePath, `${filePath}.1`);
            
        } catch (error) {
            console.error(`Log rotation failed for ${filePath}:`, error);
        }
    }

    getLogFilePath() {
        return path.join(this.logDir, `${this.category}.log`);
    }

    setLogLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.logLevel = level;
        } else {
            throw new Error(`Invalid log level: ${level}. Valid levels: ${Object.keys(this.levels).join(', ')}`);
        }
    }

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
