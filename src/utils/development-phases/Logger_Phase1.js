/**
 * Logger - Phase 1: Basic Class Structure
 * 最小限の動作確認
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
            } else {
                console.log(`Log directory exists: ${this.logDir}`);
            }
        } catch (error) {
            console.error(`Failed to create log directory: ${error.message}`);
        }
    }

    // Phase 1: 基本的な情報表示
    getInfo() {
        return {
            category: this.category,
            logDir: this.logDir,
            logPath: path.join(this.logDir, `${this.category}.log`)
        };
    }
}

module.exports = Logger;
