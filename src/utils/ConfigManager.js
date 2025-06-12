/**
 * ConfigManager - Production Version
 * Advanced configuration management with full Phase 1-4 features
 * - Configuration loading with environment variable support
 * - Schema validation and type checking
 * - Dynamic updates with file watching
 * - Performance optimization with caching
 * - Multiple export formats and presets
 * - Comprehensive event system and metrics
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class ConfigManager extends EventEmitter {
    constructor(configPath, options = {}) {
        super();
        
        this.configPath = configPath || process.env.CONFIG_PATH || '/app/config/config.json';
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
        
        // Define schema
        this.schema = this.options.schema || this.getDefaultSchema();
        
        console.log(`ConfigManager created: ${this.configPath} (envPrefix: ${this.options.envPrefix})`);
    }
    
    /**
     * Initialize configuration (async version for production)
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
            
            return this;
        } catch (error) {
            this.metrics.errorCount++;
            console.error('❌ Failed to initialize configuration:', error.message);
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * Create static factory method for easy async initialization
     */
    static async create(configPath, options = {}) {
        const manager = new ConfigManager(configPath, options);
        return await manager.initialize();
    }
    
    /**
     * Load configuration synchronously (for backward compatibility)
     */
    load() {
        try {
            this.ensureConfigDirectory();
            this.loadConfigurationSync();
            
            if (this.options.validateConfig) {
                this.validateConfigurationSync();
            }
            
            if (this.options.watchFile) {
                this.startFileWatching();
            }
            
            this.loaded = true;
            console.log('✅ Configuration loaded successfully (sync)');
            this.emit('loaded', this.config);
            
        } catch (error) {
            this.metrics.errorCount++;
            console.error('❌ Failed to load configuration:', error.message);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Configuration loading (async)
     */
    async loadConfiguration() {
        const configDir = path.dirname(this.configPath);
        
        // Check if config file exists
        if (!fs.existsSync(this.configPath)) {
            if (this.options.createIfMissing) {
                console.log(`📝 Creating default configuration: ${this.configPath}`);
                await this.createDefaultConfig();
            } else {
                throw new Error(`Configuration file not found: ${this.configPath}`);
            }
        }
        
        // Read configuration file
        const fileContent = fs.readFileSync(this.configPath, 'utf8');
        const fileConfig = JSON.parse(fileContent);
        
        // Start with default configuration
        this.config = this.deepMerge({}, this.getDefaultConfig());
        
        // Merge with file configuration
        this.config = this.deepMerge(this.config, fileConfig);
        
        // Apply environment variable overrides
        this.applyEnvironmentOverrides();
        
        // Update last modified timestamp
        const stats = fs.statSync(this.configPath);
        this.lastModified = stats.mtime;
        
        console.log('📖 Configuration loaded from file');
        this.emit('config-loaded', this.config);
    }
    
    /**
     * Configuration loading (sync)
     */
    loadConfigurationSync() {
        if (!fs.existsSync(this.configPath)) {
            if (this.options.createIfMissing) {
                console.log(`📝 Creating default configuration: ${this.configPath}`);
                this.createDefaultConfigSync();
            } else {
                throw new Error(`Configuration file not found: ${this.configPath}`);
            }
        }
        
        const fileContent = fs.readFileSync(this.configPath, 'utf8');
        const fileConfig = JSON.parse(fileContent);
        
        this.config = this.deepMerge({}, this.getDefaultConfig());
        this.config = this.deepMerge(this.config, fileConfig);
        this.applyEnvironmentOverrides();
        
        const stats = fs.statSync(this.configPath);
        this.lastModified = stats.mtime;
        
        console.log('📖 Configuration loaded from file (sync)');
        this.emit('config-loaded', this.config);
    }

    /**
     * Get configuration value with caching
     */
    get(keyPath, defaultValue = undefined) {
        if (!this.loaded) {
            console.warn('⚠️  Configuration not loaded, returning default value');
            return defaultValue;
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
     * Set configuration value
     */
    set(keyPath, value) {
        if (!this.loaded) {
            throw new Error('Configuration not loaded');
        }
        
        const keys = keyPath.split('.');
        let current = this.config;
        
        // Navigate to parent object
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        // Set the value
        const finalKey = keys[keys.length - 1];
        const oldValue = current[finalKey];
        current[finalKey] = value;
        
        // Clear cache for this key
        this.clearCacheForKey(keyPath);
        
        // Emit change event
        this.emit('config-changed', {
            key: keyPath,
            oldValue,
            newValue: value,
            config: this.config
        });
        
        console.log(`🔧 Configuration updated: ${keyPath} = ${JSON.stringify(value)}`);
    }

    /**
     * Check if configuration value exists
     */
    has(keyPath) {
        if (!this.loaded) {
            return false;
        }
        
        const keys = keyPath.split('.');
        let current = this.config;
        
        for (const key of keys) {
            if (current === null || current === undefined || !current.hasOwnProperty(key)) {
                return false;
            }
            current = current[key];
        }
        
        return true;
    }

    /**
     * Get all configuration
     */
    getAll() {
        if (!this.loaded) {
            throw new Error('Configuration not loaded');
        }
        return { ...this.config };
    }

    /**
     * Save configuration to file
     */
    async save() {
        if (this.options.backupConfig) {
            await this.backupConfiguration();
        }
        
        const configJson = JSON.stringify(this.config, null, 2);
        fs.writeFileSync(this.configPath, configJson, 'utf8');
        
        console.log(`💾 Configuration saved to: ${this.configPath}`);
        this.emit('config-saved', this.config);
    }

    /**
     * Default configuration definition
     */
    getDefaultConfig() {
        return {
            minecraft: {
                serverDirectory: '/app/minecraft-servers/survival',
                port: 25565,
                javaArgs: ['-Xmx2G', '-Xms1G'],
                autoRestart: true,
                restartDelay: 5000
            },
            ownserver: {
                binaryPath: '/app/bin/ownserver',
                autoRestart: true,
                restartDelay: 3000
            },
            cloudflare: {
                domain: 'play.cspd.net',
                ttl: 60
            },
            healthcheck: {
                enabled: true,
                interval: 30000,
                timeout: 5000,
                retries: 3,
                actions: ['restart_ownserver', 'restart_minecraft']
            },
            logging: {
                level: 'info',
                maxFileSize: '10MB',
                maxFiles: 5,
                compress: true
            }
        };
    }

    /**
     * Get default validation schema
     */
    getDefaultSchema() {
        return {
            type: 'object',
            properties: {
                minecraft: {
                    type: 'object',
                    properties: {
                        serverDirectory: { type: 'string', minLength: 1 },
                        port: { type: 'number', minimum: 1, maximum: 65535 },
                        javaArgs: { type: 'array', items: { type: 'string' } },
                        autoRestart: { type: 'boolean' },
                        restartDelay: { type: 'number', minimum: 0 }
                    },
                    required: ['serverDirectory', 'port']
                },
                ownserver: {
                    type: 'object',
                    properties: {
                        binaryPath: { type: 'string', minLength: 1 },
                        autoRestart: { type: 'boolean' },
                        restartDelay: { type: 'number', minimum: 0 }
                    },
                    required: ['binaryPath']
                },
                cloudflare: {
                    type: 'object',
                    properties: {
                        domain: { type: 'string', minLength: 1 },
                        ttl: { type: 'number', minimum: 1 }
                    },
                    required: ['domain']
                },
                logging: {
                    type: 'object',
                    properties: {
                        level: { 
                            type: 'string', 
                            enum: ['error', 'warn', 'info', 'verbose', 'debug', 'silly']
                        }
                    }
                }
            }
        };
    }

    /**
     * Configuration validation (async)
     */
    async validateConfiguration() {
        const startTime = Date.now();
        this.validationErrors = [];
        
        try {
            this.validateAgainstSchema(this.config, this.schema);
            
            if (this.validationErrors.length > 0) {
                const errorMessage = `Configuration validation failed:\n${this.validationErrors.join('\n')}`;
                throw new Error(errorMessage);
            }
            
            this.metrics.validationTime = Date.now() - startTime;
            console.log(`✅ Configuration validation passed (${this.metrics.validationTime}ms)`);
            this.emit('validation-passed', this.config);
            
        } catch (error) {
            this.metrics.errorCount++;
            this.emit('validation-failed', { errors: this.validationErrors, error });
            throw error;
        }
    }

    /**
     * Configuration validation (sync)
     */
    validateConfigurationSync() {
        const startTime = Date.now();
        this.validationErrors = [];
        
        this.validateAgainstSchema(this.config, this.schema);
        
        if (this.validationErrors.length > 0) {
            const errorMessage = `Configuration validation failed:\n${this.validationErrors.join('\n')}`;
            throw new Error(errorMessage);
        }
        
        this.metrics.validationTime = Date.now() - startTime;
        console.log(`✅ Configuration validation passed (${this.metrics.validationTime}ms)`);
        this.emit('validation-passed', this.config);
    }

    /**
     * Validate object against schema
     */
    validateAgainstSchema(obj, schema, path = '') {
        if (schema.type === 'object' && schema.properties) {
            if (typeof obj !== 'object' || obj === null) {
                this.validationErrors.push(`${path}: Expected object, got ${typeof obj}`);
                return;
            }
            
            // Check required properties
            if (schema.required) {
                for (const requiredProp of schema.required) {
                    if (!obj.hasOwnProperty(requiredProp)) {
                        this.validationErrors.push(`${path}: Missing required property '${requiredProp}'`);
                    }
                }
            }
            
            // Validate properties
            for (const [propName, propSchema] of Object.entries(schema.properties)) {
                if (obj.hasOwnProperty(propName)) {
                    const propPath = path ? `${path}.${propName}` : propName;
                    this.validateAgainstSchema(obj[propName], propSchema, propPath);
                }
            }
        } else {
            // Validate primitive types
            this.validatePrimitive(obj, schema, path);
        }
    }

    /**
     * Validate primitive values
     */
    validatePrimitive(value, schema, path) {
        // Type validation
        if (schema.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== schema.type) {
                this.validationErrors.push(`${path}: Expected ${schema.type}, got ${actualType}`);
                return;
            }
        }
        
        // String validations
        if (schema.type === 'string') {
            if (schema.minLength && value.length < schema.minLength) {
                this.validationErrors.push(`${path}: String too short (min: ${schema.minLength})`);
            }
            if (schema.maxLength && value.length > schema.maxLength) {
                this.validationErrors.push(`${path}: String too long (max: ${schema.maxLength})`);
            }
            if (schema.enum && !schema.enum.includes(value)) {
                this.validationErrors.push(`${path}: Value '${value}' not in allowed values: ${schema.enum.join(', ')}`);
            }
        }
        
        // Number validations
        if (schema.type === 'number') {
            if (schema.minimum !== undefined && value < schema.minimum) {
                this.validationErrors.push(`${path}: Value ${value} below minimum ${schema.minimum}`);
            }
            if (schema.maximum !== undefined && value > schema.maximum) {
                this.validationErrors.push(`${path}: Value ${value} above maximum ${schema.maximum}`);
            }
        }
        
        // Array validations
        if (schema.type === 'array' && schema.items) {
            for (let i = 0; i < value.length; i++) {
                this.validateAgainstSchema(value[i], schema.items, `${path}[${i}]`);
            }
        }
    }

    /**
     * Apply environment variable overrides
     */
    applyEnvironmentOverrides() {
        const prefix = this.options.envPrefix;
        const overrides = {};
        
        for (const [key, value] of Object.entries(process.env)) {
            if (key.startsWith(prefix)) {
                const configKey = key.slice(prefix.length).toLowerCase().replace(/_/g, '.');
                this.setNestedProperty(overrides, configKey, this.parseEnvValue(value));
            }
        }
        
        if (Object.keys(overrides).length > 0) {
            console.log(`🌍 Applying environment variable overrides (${Object.keys(overrides).length} variables)`);
            this.config = this.deepMerge(this.config, overrides);
            this.emit('env-overrides-applied', overrides);
        }
    }

    /**
     * Parse environment variable value
     */
    parseEnvValue(value) {
        // Try to parse as JSON first
        try {
            return JSON.parse(value);
        } catch {
            // Return as string if not valid JSON
            return value;
        }
    }

    /**
     * Ensure configuration directory exists
     */
    ensureConfigDirectory() {
        const configDir = path.dirname(this.configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
            console.log(`📁 Created configuration directory: ${configDir}`);
        }
    }

    /**
     * Create default configuration file (async)
     */
    async createDefaultConfig() {
        const defaultConfig = this.getDefaultConfig();
        const configJson = JSON.stringify(defaultConfig, null, 2);
        
        fs.writeFileSync(this.configPath, configJson, 'utf8');
        console.log(`📝 Default configuration created: ${this.configPath}`);
        this.emit('default-config-created', defaultConfig);
    }

    /**
     * Create default configuration file (sync)
     */
    createDefaultConfigSync() {
        const defaultConfig = this.getDefaultConfig();
        const configJson = JSON.stringify(defaultConfig, null, 2);
        
        fs.writeFileSync(this.configPath, configJson, 'utf8');
        console.log(`📝 Default configuration created: ${this.configPath}`);
        this.emit('default-config-created', defaultConfig);
    }

    /**
     * Deep merge objects
     */
    deepMerge(target, source) {
        if (!this.isObject(target) || !this.isObject(source)) {
            return source;
        }
        
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (this.isObject(source[key]) && this.isObject(target[key])) {
                    result[key] = this.deepMerge(target[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }

    /**
     * Check if value is object
     */
    isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    /**
     * Get nested property using dot notation
     */
    getNestedProperty(obj, keyPath) {
        const keys = keyPath.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current === null || current === undefined || !current.hasOwnProperty(key)) {
                return undefined;
            }
            current = current[key];
        }
        
        return current;
    }

    /**
     * Set nested property using dot notation
     */
    setNestedProperty(obj, keyPath, value) {
        const keys = keyPath.split('.');
        let current = obj;
        
        // Navigate to parent object
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        // Set the value
        const finalKey = keys[keys.length - 1];
        current[finalKey] = value;
    }

    /**
     * Start file watching for hot reload
     */
    startFileWatching() {
        if (this.watcher) {
            this.stopFileWatching();
        }
        
        this.watcher = fs.watchFile(this.configPath, { interval: 1000 }, (curr, prev) => {
            if (curr.mtime > prev.mtime) {
                console.log('📝 Configuration file changed, reloading...');
                this.handleFileChange();
            }
        });
        
        console.log(`👁️  Watching configuration file: ${this.configPath}`);
        this.emit('watching-started', this.configPath);
    }

    /**
     * Stop file watching
     */
    stopFileWatching() {
        if (this.watcher) {
            fs.unwatchFile(this.configPath);
            this.watcher = null;
            console.log('👁️  Stopped watching configuration file');
            this.emit('watching-stopped');
        }
    }

    /**
     * Handle configuration file changes
     */
    async handleFileChange() {
        if (this.updateLock) {
            console.log('⏳ Configuration update already in progress, skipping...');
            return;
        }
        
        this.updateLock = true;
        
        try {
            // Backup current configuration
            if (this.options.backupConfig) {
                this.backupConfiguration();
            }
            
            const oldConfig = { ...this.config };
            
            // Reload configuration
            await this.loadConfiguration();
            
            // Validate if enabled
            if (this.options.validateConfig) {
                await this.validateConfiguration();
            }
            
            // Clear cache
            this.clearCache();
            
            // Apply middleware
            await this.applyMiddleware('reload');
            
            this.metrics.updateCount++;
            console.log('✅ Configuration hot-reloaded successfully');
            
            this.emit('config-reloaded', {
                oldConfig,
                newConfig: this.config,
                timestamp: new Date()
            });
            
        } catch (error) {
            this.metrics.errorCount++;
            console.error('❌ Failed to reload configuration:', error.message);
            this.emit('reload-error', error);
        } finally {
            this.updateLock = false;
        }
    }

    /**
     * Backup current configuration
     */
    backupConfiguration() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backup = {
            timestamp,
            config: { ...this.config },
            configPath: this.configPath
        };
        
        this.configBackups.unshift(backup);
        
        // Limit backup count
        if (this.configBackups.length > this.options.maxBackups) {
            this.configBackups = this.configBackups.slice(0, this.options.maxBackups);
        }
        
        console.log(`📦 Configuration backed up (${this.configBackups.length}/${this.options.maxBackups})`);
        this.emit('config-backed-up', backup);
    }

    /**
     * Restore configuration from backup
     */
    restoreFromBackup(index = 0) {
        if (index >= this.configBackups.length) {
            throw new Error(`Backup index ${index} not found`);
        }
        
        const backup = this.configBackups[index];
        this.config = { ...backup.config };
        
        // Clear cache
        this.clearCache();
        
        console.log(`🔄 Configuration restored from backup: ${backup.timestamp}`);
        this.emit('config-restored', backup);
        
        return backup;
    }

    /**
     * Get available backups
     */
    getBackups() {
        return this.configBackups.map(backup => ({
            timestamp: backup.timestamp,
            configPath: backup.configPath
        }));
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
     * Clear cache for specific key
     */
    clearCacheForKey(keyPath) {
        if (this.options.enableCaching) {
            const cacheKey = `get:${keyPath}`;
            this.cache.delete(cacheKey);
        }
    }

    /**
     * Clear all cache
     */
    clearCache() {
        this.cache.clear();
        this.cacheStats = { hits: 0, misses: 0 };
        console.log('🗑️  Configuration cache cleared');
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
     * Get performance metrics
     */
    getMetrics() {
        this.updateMemoryUsage();
        
        return {
            ...this.metrics,
            cacheStats: this.getCacheStats(),
            configSize: JSON.stringify(this.config).length,
            backupCount: this.configBackups.length,
            watchingFile: !!this.watcher,
            loaded: this.loaded
        };
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
                return this.toSummaryFormat();
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Convert to YAML format
     */
    toYAML(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        let yaml = '';
        
        for (const [key, value] of Object.entries(obj)) {
            if (this.isObject(value)) {
                yaml += `${spaces}${key}:\n${this.toYAML(value, indent + 1)}`;
            } else if (Array.isArray(value)) {
                yaml += `${spaces}${key}:\n`;
                for (const item of value) {
                    yaml += `${spaces}  - ${item}\n`;
                }
            } else {
                yaml += `${spaces}${key}: ${value}\n`;
            }
        }
        
        return yaml;
    }

    /**
     * Convert to environment variable format
     */
    toEnvFormat(obj, prefix = this.options.envPrefix) {
        let envVars = '';
        
        const flatten = (obj, currentPrefix = '') => {
            for (const [key, value] of Object.entries(obj)) {
                const envKey = currentPrefix ? `${currentPrefix}_${key.toUpperCase()}` : `${prefix}${key.toUpperCase()}`;
                
                if (this.isObject(value)) {
                    flatten(value, envKey);
                } else {
                    const envValue = typeof value === 'string' ? value : JSON.stringify(value);
                    envVars += `${envKey}=${envValue}\n`;
                }
            }
        };
        
        flatten(obj);
        return envVars;
    }

    /**
     * Convert to summary format
     */
    toSummaryFormat() {
        const metrics = this.getMetrics();
        
        return `Configuration Summary
========================
Path: ${this.configPath}
Loaded: ${this.loaded}
Last Modified: ${this.lastModified || 'N/A'}
Load Time: ${metrics.loadTime}ms
Validation Time: ${metrics.validationTime}ms
Update Count: ${metrics.updateCount}
Error Count: ${metrics.errorCount}
Cache Hit Rate: ${metrics.cacheStats.hitRate}
Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB
Backup Count: ${metrics.backupCount}
File Watching: ${metrics.watchingFile}

Configuration Structure:
${Object.keys(this.config).map(key => `- ${key}`).join('\n')}
`;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopFileWatching();
        this.clearCache();
        this.removeAllListeners();
        this.config = {};
        this.loaded = false;
        
        console.log('🧹 ConfigManager destroyed');
    }
}

module.exports = ConfigManager;
