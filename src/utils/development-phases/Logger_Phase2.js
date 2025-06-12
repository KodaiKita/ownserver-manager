/**
 * Logger - Phase 2: Basic Logging
 * 基本的なログ出力機能
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor(category) {
        this.category = category;
        this.logDir = process.env.LOG_DIR || './logs';
        
        console.log(`Logger instance created for category: ${this.category}`);
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
                console.log(`Log directory created: ${this.logDir}`);
            }
        } catch (error) {
            console.error(`Failed to create log directory: ${error.message}`);
        }
    }

    // Phase 2: 基本的なログエントリ作成
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

        return entry;
    }

    // Phase 2: ファイル書き込み（同期版）
    writeLogEntry(entry) {
        const filePath = this.getLogFilePath();
        const logLine = JSON.stringify(entry) + '\n';
        
        try {
            fs.appendFileSync(filePath, logLine, 'utf8');
            console.log(`Log written to: ${filePath}`);
            return true;
        } catch (error) {
            console.error(`Failed to write log: ${error.message}`);
            return false;
        }
    }

    // Phase 2: 基本的なinfo()メソッド
    info(message, data = null) {
        console.log(`[INFO] [${this.category}] ${message}`);
        
        const entry = this.createLogEntry('info', message, data);
        return this.writeLogEntry(entry);
    }

    getLogFilePath() {
        return path.join(this.logDir, `${this.category}.log`);
    }

    getInfo() {
        return {
            category: this.category,
            logDir: this.logDir,
            logPath: this.getLogFilePath()
        };
    }
}

module.exports = Logger;
