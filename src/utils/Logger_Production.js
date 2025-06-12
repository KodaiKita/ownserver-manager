/**
 * Logger.js - Production Logger (Based on Phase 4 Implementation)
 * Features:
 * - Structured JSON logging
 * - Multiple log levels with filtering
 * - Colored console output
 * - Automatic log rotation by file size
 * - Async file operations
 * - Performance monitoring
 * - Concurrent logging support
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class Logger {
    constructor(category, options = {}) {
        this.category = category;
        this.logDir = options.logDir || process.env.LOG_DIR || './logs';
        this.logLevel = options.logLevel || process.env.LOG_LEVEL || 'info';
        this.maxFileSize = options.maxFileSize || 5 * 1024 * 1024; // 5MB default
        this.maxFiles = options.maxFiles || 5; // Keep 5 old files
        this.enableConsole = options.enableConsole !== false;
        
        // Log levels with priorities
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        
        // Console colors
        this.colors = {
            debug: '\x1b[36m', // Cyan
            info: '\x1b[32m',  // Green
            warn: '\x1b[33m',  // Yellow
            error: '\x1b[31m', // Red
            reset: '\x1b[0m'
        };
        
        this.currentLevel = this.levels[this.logLevel] || 1;
        this.logFile = path.join(this.logDir, `${this.category}.log`);
        
        // Performance tracking
        this.stats = {
            totalLogs: 0,
            totalSize: 0,
            rotations: 0,
            asyncOperations: 0
        };
        
        this.ensureLogDirectory();
        console.log(`Logger created: ${this.category} (level: ${this.logLevel}, async: enabled, rotation: ${this.formatSize(this.maxFileSize)})`);
    }
    
    ensureLogDirectory() {
        try {
            if (!fsSync.existsSync(this.logDir)) {
                fsSync.mkdirSync(this.logDir, { recursive: true });
            }
        } catch (error) {
            console.error('Failed to create log directory:', error.message);
        }
    }
    
    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${Math.round(size * 100) / 100}${units[unitIndex]}`;
    }
    
    shouldLog(level) {
        return this.levels[level] >= this.currentLevel;
    }
    
    formatTimestamp() {
        return new Date().toISOString().replace('T', ' ').substring(0, 19);
    }
    
    createLogEntry(level, message, data = null) {
        return {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            category: this.category,
            message: message,
            pid: process.pid,
            ...(data && { data })
        };
    }
    
    logToConsole(level, message, data) {
        if (!this.enableConsole) return;
        
        const color = this.colors[level] || '';
        const reset = this.colors.reset;
        const timestamp = this.formatTimestamp();
        const levelStr = level.toUpperCase().padEnd(5);
        
        let output = `${color}[${timestamp}] ${levelStr} [${this.category}] ${message}${reset}`;
        
        if (data) {
            output += ` ${JSON.stringify(data)}`;
        }
        
        console.log(output);
    }
    
    async checkFileSize() {
        try {
            const stats = await fs.stat(this.logFile);
            return stats.size;
        } catch (error) {
            return 0; // File doesn't exist
        }
    }
    
    async rotateLog() {
        try {
            const fileSize = await this.checkFileSize();
            
            if (fileSize >= this.maxFileSize) {
                // Rotate existing files
                for (let i = this.maxFiles - 1; i >= 1; i--) {
                    const oldFile = `${this.logFile}.${i}`;
                    const newFile = `${this.logFile}.${i + 1}`;
                    
                    try {
                        await fs.access(oldFile);
                        if (i === this.maxFiles - 1) {
                            // Delete the oldest file
                            await fs.unlink(oldFile);
                        } else {
                            await fs.rename(oldFile, newFile);
                        }
                    } catch (error) {
                        // File doesn't exist, skip
                    }
                }
                
                // Move current log to .1
                try {
                    await fs.rename(this.logFile, `${this.logFile}.1`);
                    this.stats.rotations++;
                    console.log(`📁 Log rotated: ${this.category} (${this.formatSize(fileSize)})`);
                } catch (error) {
                    console.error('Failed to rotate log:', error.message);
                }
            }
        } catch (error) {
            console.error('Error during log rotation:', error.message);
        }
    }
    
    async writeLogEntry(entry) {
        try {
            this.stats.asyncOperations++;
            
            // Check if rotation is needed
            await this.rotateLog();
            
            const logLine = JSON.stringify(entry) + '\n';
            await fs.appendFile(this.logFile, logLine, 'utf8');
            
            this.stats.totalLogs++;
            this.stats.totalSize += logLine.length;
            
            return { success: true, size: logLine.length };
        } catch (error) {
            console.error('Failed to write log:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    async log(level, message, data = null) {
        if (!this.shouldLog(level)) {
            return { skipped: true, reason: 'log level filtered' };
        }
        
        const entry = this.createLogEntry(level, message, data);
        
        // Console output (synchronous)
        this.logToConsole(level, message, data);
        
        // File output (asynchronous)
        const writeResult = await this.writeLogEntry(entry);
        
        return {
            success: writeResult.success,
            level,
            message,
            timestamp: entry.timestamp,
            fileSize: writeResult.size,
            ...(writeResult.error && { error: writeResult.error })
        };
    }
    
    // Public logging methods - all async
    async debug(message, data = null) {
        return await this.log('debug', message, data);
    }
    
    async info(message, data = null) {
        return await this.log('info', message, data);
    }
    
    async warn(message, data = null) {
        return await this.log('warn', message, data);
    }
    
    async error(message, data = null) {
        return await this.log('error', message, data);
    }
    
    // Utility methods
    async getStats() {
        const fileSize = await this.checkFileSize();
        return {
            ...this.stats,
            currentFileSize: fileSize,
            currentFileSizeFormatted: this.formatSize(fileSize),
            totalSizeFormatted: this.formatSize(this.stats.totalSize),
            category: this.category,
            logLevel: this.logLevel
        };
    }
    
    async cleanup() {
        // Force rotation if needed and cleanup old files
        await this.rotateLog();
        console.log(`🧹 Logger cleanup completed for ${this.category}`);
    }
}

module.exports = Logger;
