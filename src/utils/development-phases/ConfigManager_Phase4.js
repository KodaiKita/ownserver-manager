/**
 * ConfigManager_Phase4.js - Phase 4: Advanced Features and Performance
 * Features:
 * - All Phase 1, 2 & 3 features
 * - Configuration caching and performance optimization
 * - Configuration export in multiple formats
 * - Configuration templates and inheritance
 * - Advanced logging and metrics
 * - Memory usage optimization
 * - Configuration middleware support
 * - Configuration presets and profiles
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class ConfigManager extends EventEmitter {
    constructor(configPath, options = {}) {
        super();
        
        this.configPath = configPath || process.env.CONFIG_PATH || './config/config.json';
        this.options = {
            envPrefix: options.envPrefix || 'APP_',
            createIfMissing: options.createIfMissing !== false,
            validateConfig: options.validateConfig !== false,
            schema: options.schema || null,
            watchFile: options.watchFile !== false,
            hotReload: options.hotReload !== false,
            backupConfig: options.backupConfig !== false,
            maxBackups: options.maxBackups || 5,
            enableCaching: options.enableCaching !== false,
            cacheMaxAge: options.cacheMaxAge || 60000, // 1 minute
            enableMetrics: options.enableMetrics !== false,
            middleware: options.middleware || [],
            presets: options.presets || {},
            ...options
        };
        
        this.config = {};
        this.loaded = false;
        this.validationErrors = [];
        this.watcher = null;
        this.lastModified = null;
        this.configBackups = [];
        this.updateLock = false;
        
        // Performance and caching
        this.cache = new Map();
        this.cacheStats = { hits: 0, misses: 0 };
        this.metrics = {
            loadTime: 0,
            validationTime: 0,
            updateCount: 0,
            errorCount: 0,
            memoryUsage: 0
        };
        
        // Define default schema
        this.defaultSchema = this.getDefaultSchema();
        this.schema = this.options.schema || this.defaultSchema;
        
        console.log(`ConfigManager created: ${this.configPath} (envPrefix: ${this.options.envPrefix})`);
        
        // Initialize configuration
        this.initialize();
    }
    
    /**
     * Initialize configuration loading
     */
    async initialize() {
        const startTime = Date.now();
        
        try {
            this.ensureConfigDirectory();
            await this.loadConfiguration();
            
            // Validate configuration if enabled
            if (this.options.validateConfig) {
                await this.validateConfiguration();
            }
            
            // Apply middleware
            await this.applyMiddleware('initialize');
            
            // Start file watching if enabled
            if (this.options.watchFile) {
                this.startFileWatching();
            }
            
            this.loaded = true;
            this.metrics.loadTime = Date.now() - startTime;
            this.updateMemoryUsage();
            
            console.log(`✅ Configuration initialized successfully (${this.metrics.loadTime}ms)`);
            this.emit('initialized', this.config);
        } catch (error) {
            this.metrics.errorCount++;
            console.error('❌ Failed to initialize configuration:', error.message);
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * Update memory usage metrics
     */
    updateMemoryUsage() {
        if (this.options.enableMetrics) {
            const used = process.memoryUsage();
            this.metrics.memoryUsage = used.heapUsed;
        }
    }
    
    /**
     * Apply middleware functions
     */
    async applyMiddleware(phase, data = null) {
        for (const middleware of this.options.middleware) {
            if (typeof middleware === 'function') {
                try {
                    await middleware(phase, data, this);
                } catch (error) {
                    console.warn(`⚠️  Middleware error in ${phase}:`, error.message);
                }
            }
        }
    }
    
    /**
     * Get configuration value with caching
     */
    get(keyPath, defaultValue = undefined) {
        if (!this.loaded) {
            throw new Error('Configuration not loaded');
        }
        
        // Check cache first
        if (this.options.enableCaching) {
            const cacheKey = `get:${keyPath}`;
            const cached = this.cache.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < this.options.cacheMaxAge) {
                this.cacheStats.hits++;
                return cached.value;
            }
        }
        
        this.cacheStats.misses++;
        
        const keys = keyPath.split('.');
        let current = this.config;
        
        for (const key of keys) {
            if (current === null || current === undefined || !current.hasOwnProperty(key)) {
                const result = defaultValue;
                this.setCacheValue(`get:${keyPath}`, result);
                return result;
            }
            current = current[key];
        }
        
        this.setCacheValue(`get:${keyPath}`, current);
        return current;
    }
    
    /**
     * Set cache value
     */
    setCacheValue(key, value) {
        if (this.options.enableCaching) {
            this.cache.set(key, {
                value,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.cacheStats = { hits: 0, misses: 0 };
        console.log('🗑️  Configuration cache cleared');
    }
    
    /**
     * Get cache statistics
     */
    getCacheStats() {
        const total = this.cacheStats.hits + this.cacheStats.misses;
        const hitRate = total > 0 ? (this.cacheStats.hits / total * 100).toFixed(2) : 0;
        
        return {
            ...this.cacheStats,
            total,
            hitRate: `${hitRate}%`,
            cacheSize: this.cache.size
        };
    }
    
    /**
     * Apply configuration preset
     */
    applyPreset(presetName) {
        const preset = this.options.presets[presetName];
        if (!preset) {
            throw new Error(`Preset '${presetName}' not found`);
        }
        
        console.log(`🎛️  Applying preset: ${presetName}`);
        
        // Backup current configuration
        if (this.options.backupConfig) {
            this.backupConfiguration();
        }
        
        // Merge preset with current configuration
        this.config = this.deepMerge(this.config, preset);
        
        // Validate if enabled
        if (this.options.validateConfig) {
            this.validateConfiguration();
        }
        
        this.clearCache();
        this.emit('preset-applied', { presetName, config: this.config });
        
        console.log(`✅ Preset '${presetName}' applied successfully`);
    }
    
    /**
     * Get performance metrics
     */
    getMetrics() {
        this.updateMemoryUsage();
        
        return {
            ...this.metrics,
            cacheStats: this.getCacheStats(),
            configSize: JSON.stringify(this.config).length,
            backupCount: this.configBackups.length,
            watchingFile: !!this.watcher
        };
    }
    
    /**
     * Optimize configuration for performance
     */
    optimize() {
        console.log('⚡ Optimizing configuration...');
        
        // Clear old cache entries
        this.clearCache();
        
        // Optimize JSON structure (remove undefined values)
        this.config = this.cleanObject(this.config);
        
        // Update metrics
        this.updateMemoryUsage();
        
        console.log('✅ Configuration optimized');
        this.emit('optimized', this.config);
    }
    
    /**
     * Clean object by removing undefined values
     */
    cleanObject(obj) {
        if (Array.isArray(obj)) {
            return obj.filter(item => item !== undefined).map(item => 
                this.isObject(item) ? this.cleanObject(item) : item
            );
        }
        
        if (this.isObject(obj)) {
            const cleaned = {};
            for (const [key, value] of Object.entries(obj)) {
                if (value !== undefined) {
                    cleaned[key] = this.isObject(value) ? this.cleanObject(value) : value;
                }
            }
            return cleaned;
        }
        
        return obj;
    }
    
    /**
     * Export configuration in different formats
     */
    exportConfig(format = 'json') {
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(this.config, null, 2);
            case 'yaml':
                return this.toYAML(this.config);
            case 'env':
                return this.toEnvFormat(this.config);
            case 'summary':
                return this.getConfigSummary();
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }
    
    /**
     * Convert object to YAML format (simplified)
     */
    toYAML(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        let yaml = '';
        
        for (const [key, value] of Object.entries(obj)) {
            if (this.isObject(value)) {
                yaml += `${spaces}${key}:\n${this.toYAML(value, indent + 1)}`;
            } else if (Array.isArray(value)) {
                yaml += `${spaces}${key}:\n`;
                value.forEach(item => {
                    yaml += `${spaces}  - ${JSON.stringify(item)}\n`;
                });
            } else {
                yaml += `${spaces}${key}: ${JSON.stringify(value)}\n`;
            }
        }
        
        return yaml;
    }
    
    /**
     * Convert to environment variables format
     */
    toEnvFormat(obj, prefix = this.options.envPrefix) {
        let env = '';
        
        const flatten = (obj, currentPrefix = '') => {
            for (const [key, value] of Object.entries(obj)) {
                const envKey = `${prefix}${currentPrefix}${key}`.toUpperCase();
                
                if (this.isObject(value)) {
                    flatten(value, `${currentPrefix}${key}_`);
                } else {
                    env += `${envKey}=${JSON.stringify(value)}\n`;
                }
            }
        };
        
        flatten(obj);
        return env;
    }
    
    /**
     * Get configuration summary
     */
    getConfigSummary() {
        const summary = {
            path: this.configPath,
            loaded: this.loaded,
            valid: this.isValid(),
            sections: Object.keys(this.config),
            metrics: this.getMetrics(),
            features: {
                caching: this.options.enableCaching,
                watching: this.options.watchFile,
                validation: this.options.validateConfig
            }
        };
        
        return JSON.stringify(summary, null, 2);
    }
    
    // ===== Enhanced Phase 3 Methods =====
    
    /**
     * Enhanced update with performance tracking
     */
    async updateConfig(keyPath, value, options = {}) {
        const startTime = Date.now();
        
        if (this.updateLock && !options.force) {
            throw new Error('Configuration update already in progress');
        }
        
        this.updateLock = true;
        
        try {
            const oldValue = this.get(keyPath);
            
            // Apply middleware
            await this.applyMiddleware('before-update', { keyPath, value, oldValue });
            
            // Backup current configuration
            if (this.options.backupConfig) {
                this.backupConfiguration();
            }
            
            // Update the value
            this.setNestedValue(this.config, keyPath.replace(/\./g, '_'), value);
            
            // Clear cache for this key
            this.cache.delete(`get:${keyPath}`);
            
            // Validate if enabled
            if (this.options.validateConfig) {
                await this.validateConfiguration();
                
                if (!this.isValid() && (this.options.strictValidation || options.validateStrict)) {
                    // Revert the change
                    this.setNestedValue(this.config, keyPath.replace(/\./g, '_'), oldValue);
                    await this.validateConfiguration(); // Re-validate to clear errors
                    throw new Error(`Configuration update failed validation: ${this.validationErrors.join(', ')}`);
                }
            }
            
            // Write to file if requested
            if (options.persistToFile !== false) {
                await this.saveConfigurationToFile();
            }
            
            // Apply middleware
            await this.applyMiddleware('after-update', { keyPath, value, oldValue });
            
            // Update metrics
            this.metrics.updateCount++;
            const updateTime = Date.now() - startTime;
            
            // Emit update event
            this.emit('updated', {
                keyPath,
                oldValue,
                newValue: value,
                config: this.config,
                duration: updateTime
            });
            
            console.log(`✅ Configuration updated: ${keyPath} = ${JSON.stringify(value)} (${updateTime}ms)`);
            
        } catch (error) {
            this.metrics.errorCount++;
            console.error('❌ Failed to update configuration:', error.message);
            this.emit('update-error', error);
            throw error;
        } finally {
            this.updateLock = false;
        }
    }
    
    /**
     * Async validation with performance tracking
     */
    async validateConfiguration() {
        const startTime = Date.now();
        console.log('🔍 Validating configuration...');
        this.validationErrors = [];
        
        await this.validateObject(this.config, this.schema, '');
        
        this.metrics.validationTime = Date.now() - startTime;
        
        if (this.validationErrors.length > 0) {
            console.warn(`⚠️  Found ${this.validationErrors.length} validation issues:`);
            this.validationErrors.forEach(error => {
                console.warn(`   - ${error}`);
            });
            
            if (this.options.strictValidation) {
                throw new Error(`Configuration validation failed: ${this.validationErrors.join(', ')}`);
            }
        } else {
            console.log(`✅ Configuration validation passed (${this.metrics.validationTime}ms)`);
        }
        
        this.emit('validation-complete', {
            valid: this.isValid(),
            errors: this.validationErrors,
            duration: this.metrics.validationTime
        });
    }
    
    // ===== Phase 1, 2, 3 Core Methods =====
    
    /**
     * Get default validation schema
     */
    getDefaultSchema() {
        return {
            minecraft: {
                type: 'object',
                required: true,
                properties: {
                    serverDirectory: {
                        type: 'string',
                        required: true,
                        validate: (value) => fs.existsSync(path.dirname(value)) || 'Directory must be accessible'
                    },
                    port: {
                        type: 'number',
                        required: true,
                        min: 1024,
                        max: 65535
                    },
                    javaArgs: {
                        type: 'array',
                        required: false,
                        items: { type: 'string' }
                    },
                    autoRestart: {
                        type: 'boolean',
                        required: false,
                        default: true
                    },
                    restartDelay: {
                        type: 'number',
                        required: false,
                        min: 1000,
                        max: 60000,
                        default: 5000
                    }
                }
            },
            ownserver: {
                type: 'object',
                required: true,
                properties: {
                    binaryPath: {
                        type: 'string',
                        required: true,
                        validate: (value) => {
                            if (!path.isAbsolute(value)) return 'Must be absolute path';
                            return true;
                        }
                    },
                    autoRestart: {
                        type: 'boolean',
                        required: false,
                        default: true
                    },
                    restartDelay: {
                        type: 'number',
                        required: false,
                        min: 1000,
                        max: 30000,
                        default: 3000
                    }
                }
            },
            cloudflare: {
                type: 'object',
                required: true,
                properties: {
                    domain: {
                        type: 'string',
                        required: true,
                        validate: (value) => {
                            const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
                            return domainRegex.test(value) || 'Invalid domain format';
                        }
                    },
                    ttl: {
                        type: 'number',
                        required: false,
                        min: 60,
                        max: 86400,
                        default: 60
                    }
                }
            },
            healthcheck: {
                type: 'object',
                required: false,
                properties: {
                    enabled: {
                        type: 'boolean',
                        required: false,
                        default: true
                    },
                    interval: {
                        type: 'number',
                        required: false,
                        min: 5000,
                        max: 300000,
                        default: 30000
                    },
                    timeout: {
                        type: 'number',
                        required: false,
                        min: 1000,
                        max: 30000,
                        default: 5000
                    },
                    retries: {
                        type: 'number',
                        required: false,
                        min: 1,
                        max: 10,
                        default: 3
                    }
                }
            },
            logging: {
                type: 'object',
                required: false,
                properties: {
                    level: {
                        type: 'string',
                        required: false,
                        enum: ['error', 'warn', 'info', 'debug'],
                        default: 'info'
                    },
                    directory: {
                        type: 'string',
                        required: false,
                        default: './logs'
                    },
                    maxFileSize: {
                        type: 'string',
                        required: false,
                        validate: (value) => {
                            const sizeRegex = /^\d+(\.\d+)?(KB|MB|GB)$/i;
                            return sizeRegex.test(value) || 'Invalid file size format (e.g., 10MB)';
                        },
                        default: '10MB'
                    },
                    maxFiles: {
                        type: 'number',
                        required: false,
                        min: 1,
                        max: 100,
                        default: 5
                    }
                }
            }
        };
    }
    
    /**
     * Validate object against schema definition
     */
    async validateObject(obj, schema, path) {
        for (const [key, definition] of Object.entries(schema)) {
            const currentPath = path ? `${path}.${key}` : key;
            const value = obj[key];
            
            if (definition.required && (value === undefined || value === null)) {
                this.validationErrors.push(`Required field missing: ${currentPath}`);
                continue;
            }
            
            if (value !== undefined && value !== null) {
                await this.validateValue(value, definition, currentPath);
            }
        }
    }
    
    /**
     * Validate single value against definition
     */
    async validateValue(value, definition, path) {
        // Type validation
        if (definition.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            
            if (actualType !== definition.type) {
                this.validationErrors.push(`Type mismatch at ${path}: expected ${definition.type}, got ${actualType}`);
                return;
            }
        }
        
        // Enum validation
        if (definition.enum && !definition.enum.includes(value)) {
            this.validationErrors.push(`Invalid value at ${path}: must be one of [${definition.enum.join(', ')}]`);
        }
        
        // Range validation for numbers
        if (definition.type === 'number') {
            if (definition.min !== undefined && value < definition.min) {
                this.validationErrors.push(`Value at ${path} (${value}) is below minimum (${definition.min})`);
            }
            if (definition.max !== undefined && value > definition.max) {
                this.validationErrors.push(`Value at ${path} (${value}) is above maximum (${definition.max})`);
            }
        }
        
        // Array validation
        if (definition.type === 'array') {
            if (definition.items) {
                for (let i = 0; i < value.length; i++) {
                    await this.validateValue(value[i], definition.items, `${path}[${i}]`);
                }
            }
        }
        
        // Object validation
        if (definition.type === 'object' && definition.properties) {
            await this.validateObject(value, definition.properties, path);
        }
        
        // Custom validation function
        if (definition.validate && typeof definition.validate === 'function') {
            try {
                const result = await definition.validate(value);
                if (result !== true) {
                    this.validationErrors.push(`Custom validation failed at ${path}: ${result}`);
                }
            } catch (error) {
                this.validationErrors.push(`Custom validation error at ${path}: ${error.message}`);
            }
        }
    }
    
    startFileWatching() {
        if (this.watcher) {
            this.stopFileWatching();
        }
        
        try {
            this.watcher = fs.watchFile(this.configPath, { interval: 1000 }, (curr, prev) => {
                if (curr.mtime !== prev.mtime) {
                    console.log('📁 Configuration file changed, reloading...');
                    this.handleFileChange();
                }
            });
            
            console.log('👁️  Started watching configuration file');
        } catch (error) {
            console.warn('⚠️  Failed to start file watching:', error.message);
        }
    }
    
    stopFileWatching() {
        if (this.watcher) {
            fs.unwatchFile(this.configPath);
            this.watcher = null;
            console.log('👁️  Stopped watching configuration file');
        }
    }
    
    async handleFileChange() {
        if (this.updateLock) {
            console.log('🔒 Update already in progress, skipping file change');
            return;
        }
        
        this.updateLock = true;
        
        try {
            const oldConfig = { ...this.config };
            
            if (this.options.backupConfig) {
                this.backupConfiguration();
            }
            
            await this.loadConfiguration();
            
            if (this.options.validateConfig) {
                await this.validateConfiguration();
                
                if (!this.isValid() && this.options.strictValidation) {
                    console.error('❌ File change resulted in invalid configuration, reverting...');
                    this.restoreFromBackup();
                    this.emit('validation-failed', this.validationErrors);
                    return;
                }
            }
            
            this.clearCache();
            
            const changes = this.detectChanges(oldConfig, this.config);
            this.emit('changed', {
                oldConfig,
                newConfig: this.config,
                changes
            });
            
            console.log('✅ Configuration reloaded successfully');
            
            if (this.options.hotReload) {
                this.emit('hot-reload', this.config);
            }
            
        } catch (error) {
            this.metrics.errorCount++;
            console.error('❌ Failed to reload configuration:', error.message);
            this.emit('reload-error', error);
        } finally {
            this.updateLock = false;
        }
    }
    
    backupConfiguration() {
        const backup = {
            timestamp: new Date().toISOString(),
            config: { ...this.config },
            filePath: this.configPath
        };
        
        this.configBackups.unshift(backup);
        
        if (this.configBackups.length > this.options.maxBackups) {
            this.configBackups = this.configBackups.slice(0, this.options.maxBackups);
        }
        
        console.log(`💾 Configuration backed up (${this.configBackups.length}/${this.options.maxBackups})`);
    }
    
    restoreFromBackup() {
        if (this.configBackups.length === 0) {
            throw new Error('No configuration backups available');
        }
        
        const backup = this.configBackups[0];
        this.config = { ...backup.config };
        this.clearCache();
        console.log(`🔄 Configuration restored from backup: ${backup.timestamp}`);
        this.emit('restored', backup);
    }
    
    getBackups() {
        return this.configBackups.map(backup => ({
            timestamp: backup.timestamp,
            filePath: backup.filePath
        }));
    }
    
    async updateMultiple(updates, options = {}) {
        if (this.updateLock && !options.force) {
            throw new Error('Configuration update already in progress');
        }
        
        this.updateLock = true;
        
        try {
            const oldValues = {};
            
            if (this.options.backupConfig) {
                this.backupConfiguration();
            }
            
            for (const [keyPath, value] of Object.entries(updates)) {
                oldValues[keyPath] = this.get(keyPath);
                this.setNestedValue(this.config, keyPath.replace(/\./g, '_'), value);
                this.cache.delete(`get:${keyPath}`);
            }
            
            if (this.options.validateConfig) {
                await this.validateConfiguration();
                
                if (!this.isValid() && (this.options.strictValidation || options.validateStrict)) {
                    for (const [keyPath, oldValue] of Object.entries(oldValues)) {
                        this.setNestedValue(this.config, keyPath.replace(/\./g, '_'), oldValue);
                    }
                    await this.validateConfiguration();
                    throw new Error(`Configuration batch update failed validation: ${this.validationErrors.join(', ')}`);
                }
            }
            
            if (options.persistToFile !== false) {
                await this.saveConfigurationToFile();
            }
            
            this.metrics.updateCount += Object.keys(updates).length;
            
            this.emit('batch-updated', {
                updates,
                oldValues,
                config: this.config
            });
            
            console.log(`✅ Configuration batch updated: ${Object.keys(updates).length} values`);
            
        } catch (error) {
            this.metrics.errorCount++;
            console.error('❌ Failed to batch update configuration:', error.message);
            this.emit('batch-update-error', error);
            throw error;
        } finally {
            this.updateLock = false;
        }
    }
    
    async saveConfigurationToFile() {
        try {
            const configJson = JSON.stringify(this.config, null, 2);
            fs.writeFileSync(this.configPath, configJson, 'utf8');
            console.log('💾 Configuration saved to file');
        } catch (error) {
            throw new Error(`Failed to save configuration: ${error.message}`);
        }
    }
    
    detectChanges(oldConfig, newConfig, path = '') {
        const changes = [];
        
        const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]);
        
        for (const key of allKeys) {
            const currentPath = path ? `${path}.${key}` : key;
            const oldValue = oldConfig[key];
            const newValue = newConfig[key];
            
            if (oldValue === undefined && newValue !== undefined) {
                changes.push({
                    type: 'added',
                    path: currentPath,
                    newValue
                });
            } else if (oldValue !== undefined && newValue === undefined) {
                changes.push({
                    type: 'removed',
                    path: currentPath,
                    oldValue
                });
            } else if (this.isObject(oldValue) && this.isObject(newValue)) {
                changes.push(...this.detectChanges(oldValue, newValue, currentPath));
            } else if (oldValue !== newValue) {
                changes.push({
                    type: 'modified',
                    path: currentPath,
                    oldValue,
                    newValue
                });
            }
        }
        
        return changes;
    }
    
    async reloadConfiguration() {
        console.log('🔄 Manually reloading configuration...');
        await this.handleFileChange();
    }
    
    getChangeHistory() {
        return this.configBackups.map((backup, index) => ({
            index,
            timestamp: backup.timestamp,
            isActive: index === 0
        }));
    }
    
    destroy() {
        this.stopFileWatching();
        this.clearCache();
        this.removeAllListeners();
        this.configBackups = [];
        console.log('🧹 ConfigManager destroyed');
    }
    
    applyDefaultsToObject(obj, schema) {
        const result = { ...obj };
        
        for (const [key, definition] of Object.entries(schema)) {
            if (definition.default !== undefined && (result[key] === undefined || result[key] === null)) {
                result[key] = definition.default;
            }
            
            if (definition.type === 'object' && definition.properties) {
                if (!result[key]) {
                    result[key] = {};
                }
                result[key] = this.applyDefaultsToObject(result[key], definition.properties);
            }
        }
        
        return result;
    }
    
    getValidationErrors() {
        return [...this.validationErrors];
    }
    
    isValid() {
        return this.validationErrors.length === 0;
    }
    
    ensureConfigDirectory() {
        const configDir = path.dirname(this.configPath);
        try {
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
                console.log(`📁 Created config directory: ${configDir}`);
            }
        } catch (error) {
            throw new Error(`Failed to create config directory: ${error.message}`);
        }
    }
    
    async loadConfiguration() {
        let fileConfig = {};
        
        if (fs.existsSync(this.configPath)) {
            fileConfig = this.loadFromFile();
            console.log(`📄 Loaded config from file: ${this.configPath}`);
        } else if (this.options.createIfMissing) {
            this.createDefaultConfig();
            fileConfig = this.loadFromFile();
            console.log(`📄 Created and loaded default config: ${this.configPath}`);
        } else {
            throw new Error(`Configuration file not found: ${this.configPath}`);
        }
        
        const envConfig = this.loadFromEnvironment();
        
        this.config = this.mergeConfigurations(fileConfig, envConfig);
        this.config = this.applyDefaultsToObject(this.config, this.schema);
        
        console.log(`⚙️  Configuration loaded with ${Object.keys(this.config).length} top-level keys`);
    }
    
    loadFromFile() {
        try {
            const content = fs.readFileSync(this.configPath, 'utf8');
            const config = JSON.parse(content);
            return config;
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`Invalid JSON in config file: ${error.message}`);
            }
            throw new Error(`Failed to read config file: ${error.message}`);
        }
    }
    
    loadFromEnvironment() {
        const envConfig = {};
        const prefix = this.options.envPrefix;
        
        Object.keys(process.env).forEach(key => {
            if (key.startsWith(prefix)) {
                const configKey = key.substring(prefix.length).toLowerCase();
                let value = process.env[key];
                
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    // Keep as string if not valid JSON
                }
                
                this.setNestedValue(envConfig, configKey, value);
            }
        });
        
        const envKeys = Object.keys(envConfig).length;
        if (envKeys > 0) {
            console.log(`🌍 Loaded ${envKeys} environment variables with prefix ${prefix}`);
        }
        
        return envConfig;
    }
    
    createDefaultConfig() {
        const defaultConfig = {
            minecraft: {
                serverDirectory: "/app/minecraft-servers/survival",
                port: 25565,
                javaArgs: ["-Xmx2G", "-Xms1G"],
                autoRestart: true,
                restartDelay: 5000
            },
            ownserver: {
                binaryPath: "/app/bin/ownserver",
                autoRestart: true,
                restartDelay: 3000
            },
            cloudflare: {
                domain: "play.cspd.net",
                ttl: 60
            },
            healthcheck: {
                enabled: true,
                interval: 30000,
                timeout: 5000,
                retries: 3
            },
            logging: {
                level: "info",
                directory: "./logs",
                maxFileSize: "10MB",
                maxFiles: 5
            }
        };
        
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
            console.log(`📝 Created default config file: ${this.configPath}`);
        } catch (error) {
            throw new Error(`Failed to create default config: ${error.message}`);
        }
    }
    
    mergeConfigurations(...configs) {
        return configs.reduce((merged, config) => {
            return this.deepMerge(merged, config);
        }, {});
    }
    
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (this.isObject(source[key]) && this.isObject(result[key])) {
                    result[key] = this.deepMerge(result[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }
    
    setNestedValue(obj, path, value) {
        const keys = path.split('_');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || !this.isObject(current[key])) {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }
    
    isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    
    has(keyPath) {
        return this.get(keyPath, Symbol('not-found')) !== Symbol('not-found');
    }
    
    getAll() {
        if (!this.loaded) {
            throw new Error('Configuration not loaded');
        }
        
        return { ...this.config };
    }
    
    getSummary() {
        const summary = {
            configPath: this.configPath,
            loaded: this.loaded,
            keys: Object.keys(this.config),
            envPrefix: this.options.envPrefix,
            valid: this.isValid(),
            validationErrors: this.validationErrors.length,
            watching: !!this.watcher,
            backupsCount: this.configBackups.length,
            caching: this.options.enableCaching,
            metrics: this.options.enableMetrics
        };
        
        return summary;
    }
}

module.exports = ConfigManager;
