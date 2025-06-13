# MinecraftServerManager Implementation Guide

## Overview

The MinecraftServerManager component provides comprehensive Minecraft server management capabilities within the ownserver-manager project. This implementation follows a phase-based development approach, ensuring reliable and maintainable code through incremental feature development.

## Current Status: Phase 1 Complete ✅

### Phase 1: Basic Process Management
**Status**: ✅ **Complete and Production Ready**

#### Features Implemented
- ✅ **Java Auto-Download & Management**: Automatic detection and installation of required Java versions
- ✅ **Minecraft Server Process Control**: Start/stop functionality with proper process management
- ✅ **Basic Logging Integration**: Full integration with existing Logger system
- ✅ **Simple Error Handling**: Robust error handling and recovery mechanisms
- ✅ **Process State Monitoring**: Real-time server status tracking

#### Core Methods Available
```javascript
// Constructor
new MinecraftServerManager(serverDirectory, config)

// Process Management
await manager.start()                    // Start Minecraft server
await manager.stop(force)               // Stop server (graceful or forced)
manager.isServerRunning()               // Check server status

// Java Management
await manager.downloadJava(version)     // Download specific Java version
await manager.validateJavaInstallation(javaPath) // Validate Java installation
```

#### Configuration Options
```javascript
{
    javaVersion: 'auto',        // 'auto', '8', '11', '17', '21'
    javaArgs: ['-Xmx2G', '-Xms1G'],  // JVM arguments
    serverJar: 'server.jar',    // Server JAR filename
    autoDownloadJava: true,     // Enable auto Java download
    retryAttempts: 3,           // Error retry count
    retryDelay: 5000           // Retry delay in milliseconds
}
```

#### Events Emitted
- `started` - Server successfully started
- `stopped` - Server stopped
- `error` - Error occurred
- `exit` - Process exited
- `log` - Log data received

## Java Version Management

### Automatic Java Detection
The system automatically determines the required Java version based on:
- Minecraft version detection (future enhancement)
- Server type (Vanilla, Spigot, Paper, Forge)
- Explicit configuration

### Supported Java Versions
- **Java 8**: Legacy Minecraft versions (1.0-1.16)
- **Java 11**: Intermediate versions with enhanced performance
- **Java 17**: Modern Minecraft versions (1.17-1.20.4)
- **Java 21**: Latest Minecraft versions (1.20.5+)

### Download Sources
Java installations are downloaded from Eclipse Temurin (AdoptOpenJDK) for reliability and security.

## Usage Examples

### Basic Server Management
```javascript
const MinecraftServerManager = require('./src/managers/MinecraftServerManager');

// Initialize manager
const manager = new MinecraftServerManager('/path/to/minecraft/server', {
    javaVersion: '17',
    javaArgs: ['-Xmx4G', '-Xms2G']
});

// Event handlers
manager.on('started', (data) => {
    console.log(`Server started with PID: ${data.pid}`);
});

manager.on('log', (data) => {
    console.log(`[${data.type}] ${data.data}`);
});

manager.on('error', (error) => {
    console.error('Server error:', error.message);
});

// Start server
try {
    await manager.start();
    console.log('Server is running!');
} catch (error) {
    console.error('Failed to start server:', error.message);
}

// Stop server
await manager.stop(); // Graceful stop
// await manager.stop(true); // Force stop
```

### Advanced Configuration
```javascript
const manager = new MinecraftServerManager('/minecraft-servers/survival', {
    javaVersion: 'auto',              // Auto-detect based on server
    javaArgs: [
        '-Xmx8G',                     // Maximum heap size
        '-Xms4G',                     // Initial heap size
        '-XX:+UseG1GC',               // Use G1 garbage collector
        '-XX:+UnlockExperimentalVMOptions',
        '-XX:MaxGCPauseMillis=200',   // GC optimization
        '-XX:+DisableExplicitGC'      // Disable explicit GC calls
    ],
    serverJar: 'paper-1.20.1.jar',   // Paper server
    autoDownloadJava: true,           // Enable auto-download
    retryAttempts: 5,                 // Increased retry count
    retryDelay: 10000                 // 10 second retry delay
});
```

## Architecture

### Component Structure
```
MinecraftServerManager (Phase 1)
├── Java Version Management
│   ├── Version Detection
│   ├── Auto-Download
│   └── Installation Validation
├── Process Management
│   ├── Server Start/Stop
│   ├── Process Monitoring
│   └── State Tracking
├── Logging Integration
│   ├── stdout/stderr Capture
│   ├── Logger Integration
│   └── Event Emission
└── Error Handling
    ├── Retry Logic
    ├── Cleanup Procedures
    └── Error Reporting
```

### Dependencies
- **Internal**: Logger, ConfigManager, JavaVersionManager
- **External**: Node.js built-ins (child_process, fs, events), tar package

## Testing

### Test Coverage
- ✅ Constructor and configuration validation
- ✅ Environment validation (directory, JAR file existence)
- ✅ Java management (discovery, download, validation)
- ✅ Server state management
- ✅ Event emission and handling
- ✅ Utility functions and error handling

### Running Tests
```bash
# All Minecraft tests
npm run test:minecraft

# Phase 1 specific tests
npm run test:phase1

# Java version manager tests
npm run test:java
```

## Installation Requirements

### System Requirements
- Node.js 18+
- Linux x64 environment (for Java auto-download)
- Sufficient disk space for Java runtimes and Minecraft servers

### Dependencies Installation
```bash
npm install commander tar mocha
```

## File Structure
```
src/
├── managers/
│   └── MinecraftServerManager.js          # Main manager (Phase 1)
├── utils/
│   ├── JavaVersionManager.js              # Java version management
│   └── development-phases/
│       ├── MinecraftServerManager_Phase1.js   # Phase 1 implementation
│       └── MinecraftServerManager_Phases.js   # Phase definitions
tests/
└── minecraft/
    ├── MinecraftServerManager_Phase1.test.js  # Phase 1 tests
    └── JavaVersionManager.test.js             # Java manager tests
```

## Future Development Roadmap

### Phase 2: Server Monitoring & Control (Planned)
- Log parsing and analysis
- Console command sending
- Player join/leave detection
- Auto-restart functionality

### Phase 3: ownserver Integration (Planned)
- Startup sequence coordination
- Endpoint extraction and management
- server.properties auto-updates
- Network state monitoring

### Phase 4: Advanced Features (Planned)
- Advanced configuration management
- Performance monitoring
- Backup/restore capabilities
- Security features

## Troubleshooting

### Common Issues

#### Java Download Failures
```bash
# Check internet connectivity
curl -I https://github.com/adoptium/

# Verify download directory permissions
ls -la java-runtimes/
```

#### Server Start Failures
```bash
# Verify server.jar exists and is valid
file minecraft-servers/survival/server.jar

# Check Java installation
/path/to/java/bin/java -version

# Review logs
tail -f logs/minecraft.log
```

#### Permission Issues
```bash
# Fix directory permissions
chmod -R 755 minecraft-servers/
chmod +x java-runtimes/*/bin/java
```

## Performance Considerations

### Memory Management
- Default JVM args are conservative (2GB max heap)
- Adjust `-Xmx` and `-Xms` based on server requirements
- Use G1GC for servers with >4GB RAM

### Process Monitoring
- Server state is tracked in real-time
- Process exit codes are captured and logged
- Automatic cleanup prevents resource leaks

## Security Notes

- Java downloads are from trusted Eclipse Temurin sources
- Checksum validation for downloaded files (planned enhancement)
- Process isolation through proper child_process management
- Log sanitization to prevent sensitive data exposure

## Contributing

When contributing to MinecraftServerManager:

1. Follow the phase-based development approach
2. Maintain backward compatibility with Phase 1 API
3. Add comprehensive tests for new features
4. Update documentation for API changes
5. Follow existing code style and patterns

## API Reference

### Constructor
```javascript
new MinecraftServerManager(serverDirectory, config)
```
- `serverDirectory`: Absolute path to Minecraft server directory
- `config`: Configuration object (optional)

### Methods
- `start()`: Start the Minecraft server
- `stop(force)`: Stop the server (graceful or forced)
- `isServerRunning()`: Check if server is running
- `downloadJava(version)`: Download specific Java version
- `validateJavaInstallation(javaPath)`: Validate Java installation

### Events
- `started`: Server started successfully
- `stopped`: Server stopped
- `error`: Error occurred
- `exit`: Process exited
- `log`: Log data received

---

**Implementation Status**: Phase 1 Complete ✅  
**Next Phase**: Phase 2 Development  
**Maintained by**: ownserver-manager development team
