/**
 * ConfigManager_Phase3.js - Phase 3: Dynamic Configuration Updates
 * Features:
 * - All Phase 1 & 2 features
 * - Configuration file watching
 * - Hot reload capabilities
 * - Configuration update methods
 * - Change event notifications
 * - Partial configuration updates
 * - Configuration backup and restore
 * - Thread-safe updates
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
            ...options
        };
        
        this.config = {};
        this.loaded = false;
        this.validationErrors = [];
        this.watcher = null;
        this.lastModified = null;
        this.configBackups = [];
        this.updateLock = false;
        
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
    initialize() {
        try {
            this.ensureConfigDirectory();
            this.loadConfiguration();
            
            // Validate configuration if enabled
            if (this.options.validateConfig) {
                this.validateConfiguration();
            }
            
            // Start file watching if enabled
            if (this.options.watchFile) {
                this.startFileWatching();
            }
            
            this.loaded = true;
            console.log('✅ Configuration initialized successfully');
            this.emit('initialized', this.config);
        } catch (error) {
            console.error('❌ Failed to initialize configuration:', error.message);
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * Start watching configuration file for changes
     */
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
    
    /**
     * Stop watching configuration file
     */
    stopFileWatching() {
        if (this.watcher) {
            fs.unwatchFile(this.configPath);
            this.watcher = null;
            console.log('👁️  Stopped watching configuration file');
        }
    }
    
    /**
     * Handle configuration file changes
     */
    async handleFileChange() {
        if (this.updateLock) {
            console.log('🔒 Update already in progress, skipping file change');
            return;
        }
        
        this.updateLock = true;
        
        try {
            const oldConfig = { ...this.config };
            
            // Backup current configuration
            if (this.options.backupConfig) {
                this.backupConfiguration();
            }
            
            // Reload configuration
            this.loadConfiguration();
            
            // Validate if enabled
            if (this.options.validateConfig) {
                this.validateConfiguration();
                
                if (!this.isValid() && this.options.strictValidation) {
                    console.error('❌ File change resulted in invalid configuration, reverting...');
                    this.restoreFromBackup();
                    this.emit('validation-failed', this.validationErrors);
                    return;
                }
            }
            
            // Emit change event
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
        const backup = {
            timestamp: new Date().toISOString(),
            config: { ...this.config },
            filePath: this.configPath
        };
        
        this.configBackups.unshift(backup);
        
        // Limit number of backups
        if (this.configBackups.length > this.options.maxBackups) {
            this.configBackups = this.configBackups.slice(0, this.options.maxBackups);
        }
        
        console.log(`💾 Configuration backed up (${this.configBackups.length}/${this.options.maxBackups})`);
    }
    
    /**
     * Restore configuration from most recent backup
     */
    restoreFromBackup() {
        if (this.configBackups.length === 0) {
            throw new Error('No configuration backups available');
        }
        
        const backup = this.configBackups[0];
        this.config = { ...backup.config };
        console.log(`🔄 Configuration restored from backup: ${backup.timestamp}`);
        this.emit('restored', backup);
    }
    
    /**
     * Get list of available backups
     */
    getBackups() {
        return this.configBackups.map(backup => ({
            timestamp: backup.timestamp,
            filePath: backup.filePath
        }));
    }
    
    /**
     * Update configuration dynamically
     */
    async updateConfig(keyPath, value, options = {}) {
        if (this.updateLock && !options.force) {
            throw new Error('Configuration update already in progress');
        }
        
        this.updateLock = true;
        
        try {
            const oldValue = this.get(keyPath);
            
            // Backup current configuration
            if (this.options.backupConfig) {
                this.backupConfiguration();
            }
            
            // Update the value
            this.setNestedValue(this.config, keyPath.replace(/\./g, '_'), value);
            
            // Validate if enabled
            if (this.options.validateConfig) {
                this.validateConfiguration();
                
                if (!this.isValid() && (this.options.strictValidation || options.validateStrict)) {
                    // Revert the change
                    this.setNestedValue(this.config, keyPath.replace(/\./g, '_'), oldValue);
                    this.validateConfiguration(); // Re-validate to clear errors
                    throw new Error(`Configuration update failed validation: ${this.validationErrors.join(', ')}`);
                }
            }
            
            // Write to file if requested
            if (options.persistToFile !== false) {
                await this.saveConfigurationToFile();
            }
            
            // Emit update event
            this.emit('updated', {
                keyPath,
                oldValue,
                newValue: value,
                config: this.config
            });
            
            console.log(`✅ Configuration updated: ${keyPath} = ${JSON.stringify(value)}`);
            
        } catch (error) {
            console.error('❌ Failed to update configuration:', error.message);
            this.emit('update-error', error);
            throw error;
        } finally {
            this.updateLock = false;
        }
    }
    
    /**
     * Update multiple configuration values
     */
    async updateMultiple(updates, options = {}) {
        if (this.updateLock && !options.force) {
            throw new Error('Configuration update already in progress');
        }
        
        this.updateLock = true;
        
        try {
            const oldValues = {};
            
            // Backup current configuration
            if (this.options.backupConfig) {
                this.backupConfiguration();
            }
            
            // Apply all updates
            for (const [keyPath, value] of Object.entries(updates)) {
                oldValues[keyPath] = this.get(keyPath);
                this.setNestedValue(this.config, keyPath.replace(/\./g, '_'), value);
            }
            
            // Validate if enabled
            if (this.options.validateConfig) {
                this.validateConfiguration();
                
                if (!this.isValid() && (this.options.strictValidation || options.validateStrict)) {
                    // Revert all changes
                    for (const [keyPath, oldValue] of Object.entries(oldValues)) {
                        this.setNestedValue(this.config, keyPath.replace(/\./g, '_'), oldValue);
                    }
                    this.validateConfiguration(); // Re-validate to clear errors
                    throw new Error(`Configuration batch update failed validation: ${this.validationErrors.join(', ')}`);
                }
            }
            
            // Write to file if requested
            if (options.persistToFile !== false) {
                await this.saveConfigurationToFile();
            }
            
            // Emit batch update event
            this.emit('batch-updated', {
                updates,
                oldValues,
                config: this.config
            });
            
            console.log(`✅ Configuration batch updated: ${Object.keys(updates).length} values`);
            
        } catch (error) {
            console.error('❌ Failed to batch update configuration:', error.message);
            this.emit('batch-update-error', error);
            throw error;
        } finally {
            this.updateLock = false;
        }
    }
    
    /**
     * Save current configuration to file
     */
    async saveConfigurationToFile() {
        try {
            const configJson = JSON.stringify(this.config, null, 2);
            fs.writeFileSync(this.configPath, configJson, 'utf8');
            console.log('💾 Configuration saved to file');
        } catch (error) {
            throw new Error(`Failed to save configuration: ${error.message}`);
        }
    }
    
    /**
     * Detect changes between two configuration objects
     */
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
    
    /**
     * Reload configuration from file
     */
    async reloadConfiguration() {
        console.log('🔄 Manually reloading configuration...');
        await this.handleFileChange();
    }
    
    /**
     * Get configuration change history
     */
    getChangeHistory() {
        return this.configBackups.map((backup, index) => ({
            index,
            timestamp: backup.timestamp,
            isActive: index === 0
        }));
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.stopFileWatching();
        this.removeAllListeners();
        this.configBackups = [];
        console.log('🧹 ConfigManager destroyed');
    }
    
    // ===== Phase 1 & 2 Methods (unchanged) =====
    
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
     * Validate configuration against schema
     */
    validateConfiguration() {
        console.log('🔍 Validating configuration...');
        this.validationErrors = [];
        
        this.validateObject(this.config, this.schema, '');
        
        if (this.validationErrors.length > 0) {
            console.warn(`⚠️  Found ${this.validationErrors.length} validation issues:`);
            this.validationErrors.forEach(error => {
                console.warn(`   - ${error}`);
            });
            
            if (this.options.strictValidation) {
                throw new Error(`Configuration validation failed: ${this.validationErrors.join(', ')}`);
            }
        } else {
            console.log('✅ Configuration validation passed');
        }
    }
    
    /**
     * Validate object against schema definition
     */
    validateObject(obj, schema, path) {
        // Check required properties
        for (const [key, definition] of Object.entries(schema)) {
            const currentPath = path ? `${path}.${key}` : key;
            const value = obj[key];
            
            if (definition.required && (value === undefined || value === null)) {
                this.validationErrors.push(`Required field missing: ${currentPath}`);
                continue;
            }
            
            if (value !== undefined && value !== null) {
                this.validateValue(value, definition, currentPath);
            }
        }
    }
    
    /**
     * Validate single value against definition
     */
    validateValue(value, definition, path) {
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
        
        // String length validation
        if (definition.type === 'string') {
            if (definition.minLength !== undefined && value.length < definition.minLength) {
                this.validationErrors.push(`String at ${path} is too short (min: ${definition.minLength})`);
            }
            if (definition.maxLength !== undefined && value.length > definition.maxLength) {
                this.validationErrors.push(`String at ${path} is too long (max: ${definition.maxLength})`);
            }
        }
        
        // Array validation
        if (definition.type === 'array') {
            if (definition.items) {
                value.forEach((item, index) => {
                    this.validateValue(item, definition.items, `${path}[${index}]`);
                });
            }
            if (definition.minItems !== undefined && value.length < definition.minItems) {
                this.validationErrors.push(`Array at ${path} has too few items (min: ${definition.minItems})`);
            }
            if (definition.maxItems !== undefined && value.length > definition.maxItems) {
                this.validationErrors.push(`Array at ${path} has too many items (max: ${definition.maxItems})`);
            }
        }
        
        // Object validation
        if (definition.type === 'object' && definition.properties) {
            this.validateObject(value, definition.properties, path);
        }
        
        // Custom validation function
        if (definition.validate && typeof definition.validate === 'function') {
            const result = definition.validate(value);
            if (result !== true) {
                this.validationErrors.push(`Custom validation failed at ${path}: ${result}`);
            }
        }
    }
    
    /**
     * Apply default values from schema
     */
    applyDefaults() {
        console.log('🔧 Applying default values...');
        this.config = this.applyDefaultsToObject(this.config, this.schema);
        console.log('✅ Default values applied');
    }
    
    /**
     * Apply defaults to object recursively
     */
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
    
    /**
     * Get validation errors
     */
    getValidationErrors() {
        return [...this.validationErrors];
    }
    
    /**
     * Check if configuration is valid
     */
    isValid() {
        return this.validationErrors.length === 0;
    }
    
    /**
     * Ensure configuration directory exists
     */
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
    
    /**
     * Load configuration from file and environment variables
     */
    loadConfiguration() {
        let fileConfig = {};
        
        // Load from file
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
        
        // Load environment variables
        const envConfig = this.loadFromEnvironment();
        
        // Merge configurations (environment overrides file)
        this.config = this.mergeConfigurations(fileConfig, envConfig);
        
        // Apply defaults
        this.config = this.applyDefaultsToObject(this.config, this.schema);
        
        console.log(`⚙️  Configuration loaded with ${Object.keys(this.config).length} top-level keys`);
    }
    
    /**
     * Load configuration from JSON file
     */
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
    
    /**
     * Load configuration from environment variables
     */
    loadFromEnvironment() {
        const envConfig = {};
        const prefix = this.options.envPrefix;
        
        Object.keys(process.env).forEach(key => {
            if (key.startsWith(prefix)) {
                const configKey = key.substring(prefix.length).toLowerCase();
                let value = process.env[key];
                
                // Try to parse as JSON, fallback to string
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
    
    /**
     * Create default configuration file
     */
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
    
    /**
     * Merge multiple configuration objects
     */
    mergeConfigurations(...configs) {
        return configs.reduce((merged, config) => {
            return this.deepMerge(merged, config);
        }, {});
    }
    
    /**
     * Deep merge two objects
     */
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
    
    /**
     * Set nested value using dot notation
     */
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
    
    /**
     * Check if value is object
     */
    isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    
    /**
     * Get configuration value by key path
     */
    get(keyPath, defaultValue = undefined) {
        if (!this.loaded) {
            throw new Error('Configuration not loaded');
        }
        
        const keys = keyPath.split('.');
        let current = this.config;
        
        for (const key of keys) {
            if (current === null || current === undefined || !current.hasOwnProperty(key)) {
                return defaultValue;
            }
            current = current[key];
        }
        
        return current;
    }
    
    /**
     * Check if configuration key exists
     */
    has(keyPath) {
        return this.get(keyPath, Symbol('not-found')) !== Symbol('not-found');
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
     * Get configuration summary
     */
    getSummary() {
        const summary = {
            configPath: this.configPath,
            loaded: this.loaded,
            keys: Object.keys(this.config),
            envPrefix: this.options.envPrefix,
            valid: this.isValid(),
            validationErrors: this.validationErrors.length,
            watching: !!this.watcher,
            backupsCount: this.configBackups.length
        };
        
        return summary;
    }
}

module.exports = ConfigManager;
