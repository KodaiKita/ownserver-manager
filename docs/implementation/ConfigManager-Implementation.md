# ConfigManager Implementation Guide

## Overview

The ConfigManager is a comprehensive configuration management system for the ownserver-manager application. It provides advanced features including configuration loading, validation, hot reloading, caching, and multiple export formats.

## Features

### Core Features (Phase 1)
- ✅ **Configuration Loading**: JSON file reading with automatic directory creation
- ✅ **Environment Variable Integration**: Automatic override with configurable prefix  
- ✅ **Default Configuration**: Automatic creation of default config files
- ✅ **Dot Notation Access**: Easy access to nested configuration values

### Validation Features (Phase 2)
- ✅ **Schema Validation**: JSON schema-based configuration validation
- ✅ **Type Checking**: Automatic type validation for all configuration values
- ✅ **Custom Validation**: Support for custom validation functions
- ✅ **Error Reporting**: Comprehensive validation error messages

### Dynamic Features (Phase 3)
- ✅ **File Watching**: Automatic file change detection
- ✅ **Hot Reload**: Live configuration updates without restart
- ✅ **Configuration Backup**: Automatic backup system with configurable retention
- ✅ **Event System**: EventEmitter-based notifications for all configuration changes

### Advanced Features (Phase 4)
- ✅ **Performance Caching**: Map-based caching with configurable TTL
- ✅ **Multiple Export Formats**: JSON, YAML, ENV, and Summary exports
- ✅ **Configuration Presets**: Predefined configuration templates
- ✅ **Performance Metrics**: Comprehensive performance and usage metrics
- ✅ **Middleware Support**: Configurable middleware pipeline
- ✅ **Memory Optimization**: Automatic memory usage tracking and optimization

## Quick Start

### Basic Usage (Synchronous)

```javascript
const ConfigManager = require('./src/utils/ConfigManager');

// Create and load configuration synchronously
const config = new ConfigManager('/app/config/config.json');
config.load();

// Access configuration values
const port = config.get('minecraft.port', 25565);
const domain = config.get('cloudflare.domain');

// Modify configuration
config.set('minecraft.port', 25566);
await config.save();
```

### Advanced Usage (Asynchronous)

```javascript
const ConfigManager = require('./src/utils/ConfigManager');

// Create with advanced options
const config = await ConfigManager.create('/app/config/config.json', {
    envPrefix: 'APP_',
    validateConfig: true,
    watchFile: true,
    enableCaching: true,
    enableMetrics: true,
    backupConfig: true,
    maxBackups: 10
});

// Listen for configuration changes
config.on('config-changed', (event) => {
    console.log(`Configuration changed: ${event.key} = ${event.newValue}`);
});

config.on('config-reloaded', (event) => {
    console.log('Configuration hot-reloaded:', event.timestamp);
});

// Access configuration with caching
const port = config.get('minecraft.port');
const hasCloudflare = config.has('cloudflare.domain');
const allConfig = config.getAll();
```

## Configuration Schema

The ConfigManager validates configuration against the following schema:

```json
{
    "minecraft": {
        "serverDirectory": "/app/minecraft-servers/survival",
        "port": 25565,
        "javaArgs": ["-Xmx2G", "-Xms1G"],
        "autoRestart": true,
        "restartDelay": 5000
    },
    "ownserver": {
        "binaryPath": "/app/bin/ownserver",
        "autoRestart": true,
        "restartDelay": 3000
    },
    "cloudflare": {
        "domain": "play.cspd.net",
        "ttl": 60
    },
    "healthcheck": {
        "enabled": true,
        "interval": 30000,
        "timeout": 5000,
        "retries": 3,
        "actions": ["restart_ownserver", "restart_minecraft"]
    },
    "logging": {
        "level": "info",
        "maxFileSize": "10MB",
        "maxFiles": 5,
        "compress": true
    }
}
```

## Environment Variable Support

The ConfigManager automatically applies environment variable overrides using a configurable prefix (default: `APP_`):

```bash
# Override minecraft port
APP_MINECRAFT_PORT=25566

# Override cloudflare domain  
APP_CLOUDFLARE_DOMAIN=play.example.com

# Override logging level
APP_LOGGING_LEVEL=debug

# Override nested values with dot notation converted to underscores
APP_HEALTHCHECK_ENABLED=false
```

## Configuration Options

```javascript
const options = {
    envPrefix: 'APP_',                // Environment variable prefix
    createIfMissing: true,            // Create default config if missing
    validateConfig: true,             // Enable schema validation
    schema: null,                     // Custom validation schema
    watchFile: true,                  // Enable file watching
    hotReload: true,                  // Enable hot reload
    backupConfig: true,               // Enable configuration backup
    maxBackups: 5,                    // Maximum backup count
    enableCaching: true,              // Enable performance caching
    cacheMaxAge: 60000,               // Cache TTL in milliseconds
    enableMetrics: true,              // Enable performance metrics
    middleware: [],                   // Middleware functions
    presets: {}                       // Configuration presets
};
```

## API Reference

### Core Methods

#### `ConfigManager.create(configPath, options)`
- **Type**: Static async method
- **Description**: Create and initialize ConfigManager asynchronously
- **Returns**: Promise<ConfigManager>

#### `constructor(configPath, options)`
- **Type**: Constructor
- **Description**: Create ConfigManager instance (requires manual initialization)

#### `initialize()`
- **Type**: Async method
- **Description**: Initialize configuration loading, validation, and file watching
- **Returns**: Promise<ConfigManager>

#### `load()`
- **Type**: Sync method
- **Description**: Load configuration synchronously (backward compatibility)

### Configuration Access

#### `get(keyPath, defaultValue)`
- **Type**: Method
- **Description**: Get configuration value using dot notation
- **Parameters**: 
  - `keyPath` (string): Dot notation path (e.g., 'minecraft.port')
  - `defaultValue` (any): Default value if key not found
- **Returns**: Configuration value or default

#### `set(keyPath, value)`
- **Type**: Method
- **Description**: Set configuration value using dot notation
- **Parameters**:
  - `keyPath` (string): Dot notation path
  - `value` (any): Value to set

#### `has(keyPath)`
- **Type**: Method
- **Description**: Check if configuration key exists
- **Parameters**: `keyPath` (string): Dot notation path
- **Returns**: boolean

#### `getAll()`
- **Type**: Method
- **Description**: Get complete configuration object
- **Returns**: Object (copy of configuration)

### Configuration Management

#### `save()`
- **Type**: Async method
- **Description**: Save configuration to file
- **Returns**: Promise<void>

#### `exportConfig(format)`
- **Type**: Method
- **Description**: Export configuration in specified format
- **Parameters**: `format` (string): 'json', 'yaml', 'env', or 'summary'
- **Returns**: string

#### `applyPreset(presetName)`
- **Type**: Method
- **Description**: Apply configuration preset
- **Parameters**: `presetName` (string): Name of preset to apply

### Backup and Restore

#### `backupConfiguration()`
- **Type**: Method
- **Description**: Create configuration backup
- **Returns**: void

#### `restoreFromBackup(index)`
- **Type**: Method
- **Description**: Restore configuration from backup
- **Parameters**: `index` (number): Backup index (0 = most recent)
- **Returns**: Object (backup information)

#### `getBackups()`
- **Type**: Method
- **Description**: Get list of available backups
- **Returns**: Array<Object>

### Performance and Metrics

#### `getMetrics()`
- **Type**: Method
- **Description**: Get performance metrics
- **Returns**: Object (metrics data)

#### `getCacheStats()`
- **Type**: Method
- **Description**: Get cache statistics
- **Returns**: Object (cache statistics)

#### `clearCache()`
- **Type**: Method
- **Description**: Clear performance cache
- **Returns**: void

### Lifecycle Management

#### `destroy()`
- **Type**: Method
- **Description**: Cleanup resources and stop file watching
- **Returns**: void

## Event System

The ConfigManager extends EventEmitter and emits the following events:

### Configuration Events
- **`initialized`**: Fired when configuration is successfully initialized
- **`loaded`**: Fired when configuration is loaded
- **`config-changed`**: Fired when configuration value changes
- **`config-reloaded`**: Fired when configuration is hot-reloaded
- **`config-saved`**: Fired when configuration is saved
- **`config-backed-up`**: Fired when configuration backup is created
- **`config-restored`**: Fired when configuration is restored from backup

### Validation Events
- **`validation-passed`**: Fired when configuration validation succeeds
- **`validation-failed`**: Fired when configuration validation fails

### System Events
- **`watching-started`**: Fired when file watching starts
- **`watching-stopped`**: Fired when file watching stops
- **`error`**: Fired when errors occur
- **`reload-error`**: Fired when hot reload fails

### Event Usage Example

```javascript
config.on('config-changed', (event) => {
    console.log(`Changed: ${event.key} from ${event.oldValue} to ${event.newValue}`);
});

config.on('validation-failed', (event) => {
    console.error('Validation errors:', event.errors);
});

config.on('config-reloaded', (event) => {
    console.log('Configuration reloaded at:', event.timestamp);
});
```

## Performance Features

### Caching System
- **Map-based caching**: High-performance key-value caching
- **Configurable TTL**: Automatic cache expiration
- **Cache statistics**: Hit rate and performance metrics
- **Automatic invalidation**: Cache cleared on configuration changes

### Memory Optimization
- **Memory usage tracking**: Real-time memory usage monitoring
- **Object cleanup**: Automatic removal of undefined values
- **Resource management**: Proper cleanup of watchers and listeners

### Metrics Tracking
- **Load time**: Configuration loading performance
- **Validation time**: Schema validation performance
- **Update count**: Number of configuration updates
- **Error count**: Number of errors encountered
- **Cache performance**: Hit rate and cache efficiency

## Validation System

### Schema-Based Validation
The ConfigManager uses a JSON Schema-like validation system:

```javascript
const schema = {
    type: 'object',
    properties: {
        minecraft: {
            type: 'object',
            properties: {
                port: { 
                    type: 'number', 
                    minimum: 1, 
                    maximum: 65535 
                },
                serverDirectory: { 
                    type: 'string', 
                    minLength: 1 
                }
            },
            required: ['port', 'serverDirectory']
        }
    }
};
```

### Custom Validation Functions
Add custom validation logic through middleware:

```javascript
const config = await ConfigManager.create(configPath, {
    middleware: [
        async (phase, data, configManager) => {
            if (phase === 'initialize') {
                // Custom validation logic
                const port = configManager.get('minecraft.port');
                if (port < 1024) {
                    throw new Error('Minecraft port must be above 1024');
                }
            }
        }
    ]
});
```

## File Watching and Hot Reload

### Automatic File Watching
- **File change detection**: Monitors configuration file for changes
- **Automatic reload**: Reloads configuration when file changes
- **Validation on reload**: Validates configuration after reload
- **Backup before reload**: Creates backup before applying changes
- **Error handling**: Graceful handling of reload errors

### Hot Reload Process
1. File change detected
2. Create configuration backup
3. Reload configuration from file
4. Apply environment variable overrides
5. Validate configuration
6. Clear cache
7. Apply middleware
8. Emit reload event

## Export Formats

### JSON Export
```javascript
const jsonConfig = config.exportConfig('json');
// Returns formatted JSON string
```

### YAML Export
```javascript
const yamlConfig = config.exportConfig('yaml');
// Returns YAML formatted string
```

### Environment Variables Export
```javascript
const envConfig = config.exportConfig('env');
// Returns environment variable format
// APP_MINECRAFT_PORT=25565
// APP_CLOUDFLARE_DOMAIN=play.cspd.net
```

### Summary Export
```javascript
const summary = config.exportConfig('summary');
// Returns configuration summary with metrics
```

## Integration Examples

### Express.js Integration
```javascript
const express = require('express');
const ConfigManager = require('./src/utils/ConfigManager');

const app = express();
let config;

async function startServer() {
    // Initialize configuration
    config = await ConfigManager.create('./config/config.json', {
        watchFile: true,
        enableMetrics: true
    });
    
    // Update server when config changes
    config.on('config-reloaded', () => {
        console.log('Configuration updated, applying changes...');
        // Apply configuration changes
    });
    
    const port = config.get('server.port', 3000);
    app.listen(port, () => {
        console.log(`Server started on port ${port}`);
    });
}

startServer().catch(console.error);
```

### Docker Integration
```dockerfile
# Environment variables for configuration override
ENV APP_MINECRAFT_PORT=25565
ENV APP_CLOUDFLARE_DOMAIN=play.example.com
ENV APP_LOGGING_LEVEL=info

# Mount configuration directory
VOLUME ["/app/config"]
```

## Troubleshooting

### Common Issues

#### Configuration Not Loading
```bash
# Check file permissions
ls -la /app/config/config.json

# Check directory permissions
ls -la /app/config/

# Verify JSON syntax
node -e "console.log(JSON.parse(require('fs').readFileSync('/app/config/config.json', 'utf8')))"
```

#### Validation Failures
```javascript
// Enable detailed validation logging
const config = await ConfigManager.create(configPath, {
    validateConfig: true
});

config.on('validation-failed', (event) => {
    console.error('Validation errors:', event.errors);
    console.error('Error details:', event.error.message);
});
```

#### Environment Variable Issues
```javascript
// Debug environment variable loading
console.log('Environment variables:', Object.keys(process.env).filter(key => key.startsWith('APP_')));

// Check parsed values
config.on('env-overrides-applied', (overrides) => {
    console.log('Applied overrides:', overrides);
});
```

### Performance Optimization

#### Enable Caching
```javascript
const config = await ConfigManager.create(configPath, {
    enableCaching: true,
    cacheMaxAge: 300000 // 5 minutes
});

// Monitor cache performance
setInterval(() => {
    const stats = config.getCacheStats();
    console.log('Cache hit rate:', stats.hitRate);
}, 60000);
```

#### Optimize File Watching
```javascript
const config = await ConfigManager.create(configPath, {
    watchFile: true,
    hotReload: true
});

// Disable file watching in production if not needed
if (process.env.NODE_ENV === 'production') {
    config.stopFileWatching();
}
```

## Testing

### Unit Testing Example
```javascript
const ConfigManager = require('./src/utils/ConfigManager');
const fs = require('fs');
const path = require('path');

describe('ConfigManager', () => {
    let config;
    const testConfigPath = './test/config.json';
    
    beforeEach(async () => {
        config = await ConfigManager.create(testConfigPath, {
            createIfMissing: true,
            validateConfig: true
        });
    });
    
    afterEach(() => {
        config.destroy();
        if (fs.existsSync(testConfigPath)) {
            fs.unlinkSync(testConfigPath);
        }
    });
    
    test('should load default configuration', () => {
        expect(config.get('minecraft.port')).toBe(25565);
        expect(config.has('cloudflare.domain')).toBe(true);
    });
    
    test('should set and get configuration values', () => {
        config.set('test.value', 'hello');
        expect(config.get('test.value')).toBe('hello');
    });
    
    test('should validate configuration', () => {
        expect(() => {
            config.set('minecraft.port', 'invalid');
        }).not.toThrow(); // Set doesn't validate, save does
    });
});
```

## Best Practices

### 1. Use Async Initialization in Production
```javascript
// Recommended
const config = await ConfigManager.create(configPath, options);

// Alternative for legacy code
const config = new ConfigManager(configPath, options);
config.load();
```

### 2. Enable Validation in Production
```javascript
const config = await ConfigManager.create(configPath, {
    validateConfig: true,
    schema: customSchema // Use custom schema if needed
});
```

### 3. Use Environment Variables for Secrets
```bash
# Don't store secrets in config files
export APP_CLOUDFLARE_API_TOKEN=your_secret_token
export APP_DATABASE_PASSWORD=your_db_password
```

### 4. Monitor Performance
```javascript
// Regular metrics monitoring
setInterval(() => {
    const metrics = config.getMetrics();
    console.log('Config metrics:', {
        loadTime: metrics.loadTime,
        cacheHitRate: metrics.cacheStats.hitRate,
        memoryUsage: `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB`
    });
}, 300000); // Every 5 minutes
```

### 5. Handle Configuration Errors Gracefully
```javascript
config.on('error', (error) => {
    console.error('Configuration error:', error.message);
    // Implement fallback logic
});

config.on('reload-error', (error) => {
    console.error('Configuration reload failed:', error.message);
    // Continue with current configuration
});
```

## Migration Guide

### From Legacy ConfigManager
The new ConfigManager is backward compatible, but for optimal performance:

```javascript
// Old way
const config = new ConfigManager();
config.load();

// New way (recommended)
const config = await ConfigManager.create(configPath, {
    validateConfig: true,
    enableCaching: true,
    watchFile: true
});
```

### Configuration Schema Updates
When updating configuration schema:

1. Update the schema definition
2. Test with existing configuration files
3. Provide migration middleware if needed
4. Update documentation

## Conclusion

The ConfigManager provides a robust, feature-rich configuration management solution with advanced capabilities for modern Node.js applications. It supports both synchronous and asynchronous operations, comprehensive validation, performance optimization, and real-time configuration updates.

For additional support or feature requests, please refer to the project documentation or create an issue in the project repository.
