/**
 * ConfigManager_Phase1.js - Phase 1: Basic Structure and Configuration Loading
 * Features:
 * - Basic class constructor
 * - JSON file reading
 * - Environment variable integration
 * - Basic error handling
 * - Simple configuration access methods
 */

const fs = require('fs');
const path = require('path');

class ConfigManager {
    constructor(configPath, options = {}) {
        this.configPath = configPath || process.env.CONFIG_PATH || './config/config.json';
        this.options = {
            envPrefix: options.envPrefix || 'APP_',
            createIfMissing: options.createIfMissing !== false,
            ...options
        };
        
        this.config = {};
        this.loaded = false;
        
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
            this.loaded = true;
            console.log('✅ Configuration initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize configuration:', error.message);
            throw error;
        }
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
            envPrefix: this.options.envPrefix
        };
        
        return summary;
    }
}

module.exports = ConfigManager;
