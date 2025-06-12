/**
 * Minimal Logger for Testing
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class MinimalLogger {
    constructor(category) {
        this.category = category;
        this.logDir = process.env.LOG_DIR || './logs';
        
        // Sync directory creation for simplicity
        if (!fsSync.existsSync(this.logDir)) {
            fsSync.mkdirSync(this.logDir, { recursive: true });
        }
    }

    async info(message, data = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            category: this.category,
            message: message
        };

        if (data) {
            logEntry.data = data;
        }

        // Console output
        console.log(`[${logEntry.timestamp}] INFO [${logEntry.category}] ${logEntry.message}`);

        // File output
        const filePath = path.join(this.logDir, `${this.category}.log`);
        const logLine = JSON.stringify(logEntry) + '\n';
        
        await fs.appendFile(filePath, logLine, 'utf8');
    }
}

module.exports = MinimalLogger;
