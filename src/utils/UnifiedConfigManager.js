/**
 * 統合設定管理システム
 * 一つのマスター設定から他の全ての設定ファイルを自動生成
 */

const fs = require('fs');
const path = require('path');

class UnifiedConfigManager {
    constructor(masterConfigPath = './config/master.json') {
        this.masterConfigPath = masterConfigPath;
        this.masterConfig = null;
        this.templateDirectory = path.join(path.dirname(masterConfigPath), 'templates');
        this.outputDirectory = path.dirname(masterConfigPath);
    }

    /**
     * マスター設定ファイルを読み込み
     */
    async loadMasterConfig() {
        try {
            if (!fs.existsSync(this.masterConfigPath)) {
                throw new Error(`Master config file not found: ${this.masterConfigPath}`);
            }

            const configContent = fs.readFileSync(this.masterConfigPath, 'utf8');
            this.masterConfig = JSON.parse(configContent);
            
            console.log(`✅ Master config loaded from: ${this.masterConfigPath}`);
            return this.masterConfig;
        } catch (error) {
            console.error(`❌ Failed to load master config:`, error.message);
            throw error;
        }
    }

    /**
     * 全ての設定ファイルを生成
     */
    async generateAllConfigs() {
        if (!this.masterConfig) {
            await this.loadMasterConfig();
        }

        console.log('🔄 Generating all configuration files...');

        // 1. config.json 生成
        await this.generateConfigJson();
        
        // 2. .env 生成
        await this.generateDotEnv();
        
        // 3. docker.env 生成
        await this.generateDockerEnv();
        
        // 4. production.env 生成
        await this.generateProductionEnv();
        
        // 5. docker-compose.yml 環境変数セクション更新
        await this.updateDockerComposeEnv();

        console.log('✅ All configuration files generated successfully!');
    }

    /**
     * config.json を生成
     */
    async generateConfigJson() {
        const config = {
            minecraft: {
                serverDirectory: this.masterConfig.minecraft.serverDirectory || "/app/minecraft-servers/server",
                port: this.masterConfig.minecraft.port || 25565,
                javaArgs: this.masterConfig.minecraft.javaArgs || [
                    "-Xmx2G", "-Xms1G", "-XX:+UseG1GC"
                ],
                autoRestart: this.masterConfig.minecraft.autoRestart || true,
                restartDelay: this.masterConfig.minecraft.restartDelay || 5000,
                startupTimeout: this.masterConfig.minecraft.startupTimeout || 120000,
                shutdownTimeout: this.masterConfig.minecraft.shutdownTimeout || 30000,
                memoryMin: this.masterConfig.minecraft.memoryMin || "1G",
                memoryMax: this.masterConfig.minecraft.memoryMax || "2G",
                jarFile: this.masterConfig.minecraft.jarFile || "server.jar",
                eulaAgreed: this.masterConfig.minecraft.eulaAgreed || true
            },
            
            ownserver: {
                binaryPath: this.masterConfig.ownserver.binaryPath || "/app/bin/ownserver",
                autoRestart: this.masterConfig.ownserver.autoRestart || true,
                restartDelay: this.masterConfig.ownserver.restartDelay || 3000,
                autoStart: this.masterConfig.ownserver.autoStart || true,
                restartOnFailure: this.masterConfig.ownserver.restartOnFailure || true,
                healthCheckInterval: this.masterConfig.ownserver.healthCheckInterval || 30000,
                startupTimeout: this.masterConfig.ownserver.startupTimeout || 60000,
                endpointTimeout: this.masterConfig.ownserver.endpointTimeout || 60000,
                args: this.masterConfig.ownserver.args || [],
                enabled: this.masterConfig.ownserver.enabled || true
            },
            
            cloudflare: {
                domain: this.masterConfig.cloudflare.domain,
                subdomain: this.masterConfig.cloudflare.subdomain || "play",
                ttl: this.masterConfig.cloudflare.ttl || 60,
                apiToken: this.masterConfig.cloudflare.apiToken,
                zoneId: this.masterConfig.cloudflare.zoneId,
                email: this.masterConfig.cloudflare.email,
                "_endpoint_note": "ownserverエンドポイントは動的に取得されます（kumassyアドレスは毎回変更されるため）",
                "_endpoint_format": "例: shard-2509.ownserver.kumassy.com:15440",
                defaultPort: this.masterConfig.cloudflare.defaultPort || 25565,
                enableAutoUpdate: this.masterConfig.cloudflare.enableAutoUpdate || true,
                healthCheckEnabled: this.masterConfig.cloudflare.healthCheckEnabled || true
            },
            
            logging: this.masterConfig.logging || {
                level: "info",
                maxFiles: 3,
                maxSize: "5m",
                compress: true,
                directory: "/app/logs",
                format: "json",
                enableConsole: true,
                enableFile: true
            },
            
            monitoring: this.masterConfig.monitoring || {
                enabled: true,
                healthCheckInterval: 60000,
                statsRetentionDays: 7,
                alerting: {
                    enabled: false,
                    webhookUrl: "YOUR_WEBHOOK_URL",
                    alertThresholds: {
                        memoryUsage: 80,
                        cpuUsage: 80,
                        diskUsage: 90
                    }
                }
            },
            
            backup: this.masterConfig.backup || {
                enabled: true,
                interval: "daily",
                retention: 7,
                compression: true,
                directory: "/app/backups",
                autoCleanup: true,
                maxBackups: 10
            },
            
            security: this.masterConfig.security || {
                filePermissions: "644",
                directoryPermissions: "755",
                enableRateLimit: true,
                maxConcurrentConnections: 100,
                sessionTimeout: 3600000,
                enableSSL: false,
                forceHTTPS: false
            },
            
            performance: this.masterConfig.performance || {
                memoryLimit: 2048,
                cpuLimit: 2,
                gcInterval: 300000,
                cacheSize: 128,
                connectionPoolSize: 10,
                requestTimeout: 30000
            },
            
            features: this.masterConfig.features || {
                webUI: {
                    enabled: false,
                    port: 3000,
                    host: "0.0.0.0"
                },
                api: {
                    enabled: true,
                    port: 8080,
                    cors: true,
                    rateLimit: true
                },
                automation: {
                    autoServerStart: true,
                    autoServerStop: false,
                    scheduledBackups: true,
                    autoUpdateDNS: true
                }
            }
        };

        const outputPath = path.join(this.outputDirectory, 'config.json');
        fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
        console.log(`✅ Generated: ${outputPath}`);
    }

    /**
     * .env ファイルを生成
     */
    async generateDotEnv() {
        const envContent = `# Generated from master.json - DO NOT EDIT MANUALLY
# Run 'node scripts/config-generator.js' to regenerate

# CloudFlare API認証情報
CLOUDFLARE_API_TOKEN=${this.masterConfig.cloudflare.apiToken}
CLOUDFLARE_ZONE_ID=${this.masterConfig.cloudflare.zoneId}
CLOUDFLARE_EMAIL=${this.masterConfig.cloudflare.email}

# ドメイン設定
CLOUDFLARE_DOMAIN=${this.masterConfig.cloudflare.domain}
CLOUDFLARE_SUBDOMAIN=${this.masterConfig.cloudflare.subdomain || 'play'}

# アプリケーション設定
NODE_ENV=${this.masterConfig.environment || 'development'}
LOG_LEVEL=${this.masterConfig.logging?.level || 'info'}

# Minecraft設定
MINECRAFT_PORT=${this.masterConfig.minecraft.port || 25565}
MINECRAFT_MEMORY_MIN=${this.masterConfig.minecraft.memoryMin || '1G'}
MINECRAFT_MEMORY_MAX=${this.masterConfig.minecraft.memoryMax || '2G'}

# OwnServer設定
OWNSERVER_ENABLED=${this.masterConfig.ownserver.enabled || true}
OWNSERVER_AUTO_START=${this.masterConfig.ownserver.autoStart || true}

# パス設定
CONFIG_PATH=${this.masterConfig.configPath || '/app/config/config.json'}
LOG_DIR=${this.masterConfig.logging?.directory || '/app/logs'}
BACKUP_DIR=${this.masterConfig.backup?.directory || '/app/backups'}
`;

        const outputPath = path.join(this.outputDirectory, '.env');
        fs.writeFileSync(outputPath, envContent);
        console.log(`✅ Generated: ${outputPath}`);
    }

    /**
     * docker.env ファイルを生成
     */
    async generateDockerEnv() {
        const envContent = `# Generated from master.json - DO NOT EDIT MANUALLY
# Run 'node scripts/config-generator.js' to regenerate

# CloudFlare API認証情報
CLOUDFLARE_API_TOKEN=${this.masterConfig.cloudflare.apiToken}
CLOUDFLARE_ZONE_ID=${this.masterConfig.cloudflare.zoneId}
CLOUDFLARE_EMAIL=${this.masterConfig.cloudflare.email}

# ドメイン設定
CLOUDFLARE_DOMAIN=${this.masterConfig.cloudflare.domain}
CLOUDFLARE_SUBDOMAIN=${this.masterConfig.cloudflare.subdomain || 'play'}

# Docker環境設定
NODE_ENV=${this.masterConfig.environment || 'production'}
DOCKER_ENV=true

# アプリケーション設定
MINECRAFT_SERVER_DIR=/app/minecraft-servers/server
CONFIG_PATH=/app/config/config.json
LOG_LEVEL=${this.masterConfig.logging?.level || 'info'}
LOG_DIR=/app/logs

# Java環境設定
JAVA_RUNTIME_DIR=/app/java-runtimes
JAVA_HOME=/usr/lib/jvm/java-17-openjdk

# ネットワーク設定
MINECRAFT_PORT=${this.masterConfig.minecraft.port || 25565}
OWNSERVER_ENABLED=${this.masterConfig.ownserver.enabled || true}

# パフォーマンス設定
MEMORY_LIMIT=${this.masterConfig.performance?.memoryLimit || 2048}
CPU_LIMIT=${this.masterConfig.performance?.cpuLimit || 2}

# セキュリティ設定
FILE_PERMISSIONS=${this.masterConfig.security?.filePermissions || '644'}
LOG_PERMISSIONS=${this.masterConfig.security?.filePermissions || '644'}
DEBUG=false

# 本番運用設定
MONITORING_ENABLED=${this.masterConfig.monitoring?.enabled || true}
BACKUP_ENABLED=${this.masterConfig.backup?.enabled || true}
DNS_AUTO_CONFIG=${this.masterConfig.cloudflare?.enableAutoUpdate || true}
AUTO_RESTART=${this.masterConfig.minecraft?.autoRestart || true}

# EULA設定
MINECRAFT_EULA_AGREED=${this.masterConfig.minecraft?.eulaAgreed || true}
MINECRAFT_EULA_USER_CONSENT=true
`;

        const outputPath = path.join(this.outputDirectory, 'docker.env');
        fs.writeFileSync(outputPath, envContent);
        console.log(`✅ Generated: ${outputPath}`);
    }

    /**
     * production.env ファイルを生成
     */
    async generateProductionEnv() {
        const envContent = `# Generated from master.json - DO NOT EDIT MANUALLY
# Run 'node scripts/config-generator.js' to regenerate

# Node.js Environment
NODE_ENV=production
DOCKER_ENV=true

# CloudFlare API認証情報（本番環境用）
CLOUDFLARE_API_TOKEN=${this.masterConfig.cloudflare.apiToken}
CLOUDFLARE_ZONE_ID=${this.masterConfig.cloudflare.zoneId}
CLOUDFLARE_EMAIL=${this.masterConfig.cloudflare.email}
CLOUDFLARE_DOMAIN=${this.masterConfig.cloudflare.domain}

# Logging Configuration
APP_LOG_LEVEL=${this.masterConfig.logging?.level || 'info'}
APP_LOG_MAX_FILES=${this.masterConfig.logging?.maxFiles || 3}
APP_LOG_MAX_SIZE=${this.masterConfig.logging?.maxSize || '5MB'}
APP_LOG_COMPRESS=${this.masterConfig.logging?.compress || true}

# Performance Settings
APP_MEMORY_LIMIT=${this.masterConfig.performance?.memoryLimit || 2048}
APP_GC_INTERVAL=${this.masterConfig.performance?.gcInterval || 300000}

# Health Check Settings
APP_HEALTH_CHECK_INTERVAL=${this.masterConfig.monitoring?.healthCheckInterval || 60000}
APP_HEALTH_CHECK_TIMEOUT=15000

# Security Settings
APP_SECURITY_MODE=production

# Minecraft Settings
MINECRAFT_MEMORY_MIN=${this.masterConfig.minecraft?.memoryMin || '1G'}
MINECRAFT_MEMORY_MAX=${this.masterConfig.minecraft?.memoryMax || '2G'}
MINECRAFT_AUTO_RESTART=${this.masterConfig.minecraft?.autoRestart || true}

# OwnServer Settings
OWNSERVER_AUTO_START=${this.masterConfig.ownserver?.autoStart || true}
OWNSERVER_RESTART_ON_FAILURE=${this.masterConfig.ownserver?.restartOnFailure || true}

# エンドポイント自動取得設定
DEFAULT_PORT=${this.masterConfig.cloudflare?.defaultPort || 25565}

# Monitoring Settings
MONITORING_ENABLED=${this.masterConfig.monitoring?.enabled || true}
STATS_RETENTION_DAYS=${this.masterConfig.monitoring?.statsRetentionDays || 7}

# Backup Settings
BACKUP_AUTO_CLEANUP=${this.masterConfig.backup?.autoCleanup || true}
BACKUP_MAX_COUNT=${this.masterConfig.backup?.maxBackups || 10}
BACKUP_COMPRESSION=${this.masterConfig.backup?.compression || true}

# Production Security Settings
ENABLE_SSL=${this.masterConfig.security?.enableSSL || true}
FORCE_HTTPS=${this.masterConfig.security?.forceHTTPS || true}
SESSION_SECRET=${this.masterConfig.security?.sessionSecret || 'CHANGE_THIS_IN_PRODUCTION'}

# Rate Limiting
RATE_LIMIT_ENABLED=${this.masterConfig.security?.enableRateLimit || true}
RATE_LIMIT_MAX_REQUESTS=${this.masterConfig.security?.maxConcurrentConnections || 100}
RATE_LIMIT_WINDOW_MS=900000
`;

        const outputPath = path.join(this.outputDirectory, 'production.env');
        fs.writeFileSync(outputPath, envContent);
        console.log(`✅ Generated: ${outputPath}`);
    }

    /**
     * Docker Compose環境変数を更新
     */
    async updateDockerComposeEnv() {
        // 環境変数ファイルの参照を確認するのみ
        // docker-compose.ymlファイル自体は変更しない
        console.log(`✅ Docker Compose will use: docker.env`);
    }

    /**
     * マスター設定テンプレートを生成
     */
    async generateMasterTemplate() {
        const template = {
            "_comment": "============================================================================",
            "_notice": "🔧 統合設定管理 - マスター設定ファイル",
            "_instructions": [
                "1. このファイルの必須項目を設定してください",
                "2. 設定後、'node scripts/config-generator.js' を実行",
                "3. 全ての設定ファイルが自動生成されます",
                "4. 生成されたファイルは直接編集せず、このファイルを編集してください"
            ],
            "_version": "1.0.0",
            "_last_updated": new Date().toISOString().split('T')[0],
            "============================================================================": "",

            "environment": "production",
            "configPath": "/app/config/config.json",

            "cloudflare": {
                "domain": "YOUR_DOMAIN.com",
                "subdomain": "play",
                "ttl": 60,
                "apiToken": "YOUR_CLOUDFLARE_API_TOKEN",
                "zoneId": "YOUR_CLOUDFLARE_ZONE_ID",
                "email": "your-email@example.com",
                "defaultPort": 25565,
                "enableAutoUpdate": true,
                "healthCheckEnabled": true
            },

            "minecraft": {
                "serverDirectory": "/app/minecraft-servers/server",
                "port": 25565,
                "javaArgs": [
                    "-Xmx2G", "-Xms1G", "-XX:+UseG1GC",
                    "-XX:+ParallelRefProcEnabled", "-XX:MaxGCPauseMillis=200",
                    "-XX:+UnlockExperimentalVMOptions", "-XX:+DisableExplicitGC"
                ],
                "autoRestart": true,
                "restartDelay": 5000,
                "startupTimeout": 120000,
                "shutdownTimeout": 30000,
                "memoryMin": "1G",
                "memoryMax": "2G",
                "jarFile": "server.jar",
                "eulaAgreed": true
            },

            "ownserver": {
                "binaryPath": "/app/bin/ownserver",
                "autoRestart": true,
                "restartDelay": 3000,
                "autoStart": true,
                "restartOnFailure": true,
                "healthCheckInterval": 30000,
                "startupTimeout": 60000,
                "endpointTimeout": 60000,
                "args": [],
                "enabled": true
            },

            "logging": {
                "level": "info",
                "maxFiles": 3,
                "maxSize": "5m",
                "compress": true,
                "directory": "/app/logs",
                "format": "json",
                "enableConsole": true,
                "enableFile": true
            },

            "monitoring": {
                "enabled": true,
                "healthCheckInterval": 60000,
                "statsRetentionDays": 7,
                "alerting": {
                    "enabled": false,
                    "webhookUrl": "YOUR_WEBHOOK_URL",
                    "alertThresholds": {
                        "memoryUsage": 80,
                        "cpuUsage": 80,
                        "diskUsage": 90
                    }
                }
            },

            "backup": {
                "enabled": true,
                "interval": "daily",
                "retention": 7,
                "compression": true,
                "directory": "/app/backups",
                "autoCleanup": true,
                "maxBackups": 10
            },

            "security": {
                "filePermissions": "644",
                "directoryPermissions": "755",
                "enableRateLimit": true,
                "maxConcurrentConnections": 100,
                "sessionTimeout": 3600000,
                "enableSSL": false,
                "forceHTTPS": false,
                "sessionSecret": "CHANGE_THIS_IN_PRODUCTION"
            },

            "performance": {
                "memoryLimit": 2048,
                "cpuLimit": 2,
                "gcInterval": 300000,
                "cacheSize": 128,
                "connectionPoolSize": 10,
                "requestTimeout": 30000
            },

            "features": {
                "webUI": {
                    "enabled": false,
                    "port": 3000,
                    "host": "0.0.0.0"
                },
                "api": {
                    "enabled": true,
                    "port": 8080,
                    "cors": true,
                    "rateLimit": true
                },
                "automation": {
                    "autoServerStart": true,
                    "autoServerStop": false,
                    "scheduledBackups": true,
                    "autoUpdateDNS": true
                }
            }
        };

        const templatePath = path.join(this.outputDirectory, 'master.json.example');
        fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
        console.log(`✅ Generated master template: ${templatePath}`);
        
        return template;
    }

    /**
     * 設定ファイルの検証
     */
    validateMasterConfig() {
        if (!this.masterConfig) {
            throw new Error('Master config not loaded');
        }

        const requiredFields = [
            'cloudflare.domain',
            'cloudflare.apiToken',
            'cloudflare.zoneId',
            'cloudflare.email'
        ];

        const missing = [];
        
        for (const field of requiredFields) {
            const value = this.getNestedValue(this.masterConfig, field);
            if (!value || value.startsWith('YOUR_')) {
                missing.push(field);
            }
        }

        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }

        console.log('✅ Master config validation passed');
    }

    /**
     * ネストしたオブジェクトから値を取得
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }
}

module.exports = UnifiedConfigManager;
