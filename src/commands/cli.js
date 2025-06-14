#!/usr/bin/env node
/**
 * CLI Interface
 * コマンドライン操作インターフェース
 */

const { Command } = require('commander');
const OwnServerManagerApp = require('../index');
const Logger = require('../utils/Logger');
const os = require('os');
const fs = require('fs');
const path = require('path');

class CLIInterface {
    constructor() {
        this.program = new Command();
        this.app = null;
        // Docker環境ではファイルログを無効化
        const isDocker = process.env.DOCKER_ENV || process.env.USER === 'nodejs';
        this.logger = new Logger('cli', { 
            enableFileLogging: !isDocker 
        });
        this.setupCommands();
    }

    /**
     * コマンド定義の設定
     */
    setupCommands() {
        this.program
            .name('ownserver-manager')
            .description('Minecraft Server with OwnServer and CloudFlare DNS management')
            .version('1.0.0')
            .addHelpText('after', `
Examples:
  $ ownserver-manager status                    Show server status
  $ ownserver-manager interactive               Launch interactive menu
  $ ownserver-manager mc "say Hello World"     Send command to Minecraft
  $ ownserver-manager public                    Make server publicly accessible
  $ ownserver-manager players --list            List online players
  $ ownserver-manager backup --create           Create world backup
  $ ownserver-manager monitor --stats           Show performance stats
  $ ownserver-manager logs --follow             Follow real-time logs

For interactive mode with menu navigation:
  $ ownserver-manager menu
            `);

        // mc <command> - Minecraftサーバーコンソールにコマンド送信
        this.program
            .command('mc <command>')
            .description('Send command to Minecraft server console')
            .action(this.handleMinecraftCommand.bind(this));

        // restart [service] - サービス再起動
        this.program
            .command('restart [service]')
            .description('Restart services (all, mc, own)')
            .action(this.handleRestart.bind(this));

        // private - サーバー非公開
        this.program
            .command('private')
            .description('Make server private (stop ownserver + remove DNS)')
            .action(this.handlePrivate.bind(this));

        // public - サーバー公開
        this.program
            .command('public')
            .description('Make server public (start ownserver + set DNS)')
            .action(this.handlePublic.bind(this));

        // stop - 全停止
        this.program
            .command('stop')
            .description('Stop all services and exit')
            .action(this.handleStop.bind(this));

        // status - 状態表示
        this.program
            .command('status')
            .description('Show status of all services')
            .action(this.handleStatus.bind(this));

        // logs - ログ表示
        this.program
            .command('logs')
            .description('Show logs')
            .option('-f, --follow', 'Follow log output')
            .option('--service <service>', 'Filter by service (minecraft, ownserver, manager)')
            .action(this.handleLogs.bind(this));

        // interactive - インタラクティブメニュー
        this.program
            .command('interactive')
            .alias('menu')
            .description('Launch interactive menu')
            .action(this.handleInteractive.bind(this));

        // config - 設定管理
        this.program
            .command('config')
            .description('Configuration management')
            .option('--show', 'Show current configuration')
            .option('--check', 'Check configuration validity')
            .option('--set <key=value>', 'Set configuration value')
            .option('--get <key>', 'Get configuration value')
            .action(this.handleConfig.bind(this));

        // health - ヘルスチェック
        this.program
            .command('health')
            .description('Run health check on all services')
            .action(this.handleHealth.bind(this));

        // players - プレイヤー管理
        this.program
            .command('players')
            .description('Player management')
            .option('--list', 'List online players')
            .option('--kick <player>', 'Kick a player')
            .option('--ban <player>', 'Ban a player')
            .option('--unban <player>', 'Unban a player')
            .option('--op <player>', 'Give operator privileges')
            .option('--deop <player>', 'Remove operator privileges')
            .action(this.handlePlayers.bind(this));

        // backup - バックアップ管理
        this.program
            .command('backup')
            .description('Backup management')
            .option('--create [name]', 'Create backup with optional name')
            .option('--list', 'List available backups')
            .option('--restore <backup>', 'Restore from backup')
            .option('--delete <backup>', 'Delete backup')
            .action(this.handleBackup.bind(this));

        // monitor - パフォーマンス監視
        this.program
            .command('monitor')
            .description('Performance monitoring')
            .option('--stats', 'Show current performance stats')
            .option('--history [hours]', 'Show performance history (default: 24 hours)')
            .option('--alerts', 'Show performance alerts')
            .option('--export [format]', 'Export stats (json, csv)')
            .action(this.handleMonitor.bind(this));

        // maintenance - メンテナンス機能
        this.program
            .command('maintenance')
            .description('Maintenance operations')
            .option('--cleanup', 'Clean up old logs and temporary files')
            .option('--optimize', 'Optimize server performance')
            .option('--report', 'Generate system report')
            .option('--schedule <time>', 'Schedule maintenance at specific time')
            .action(this.handleMaintenance.bind(this));

        // ownserver - OwnServerバイナリ管理
        this.program
            .command('ownserver')
            .description('OwnServer binary management')
            .option('--install', 'Download and install the latest OwnServer binary')
            .option('--update', 'Force update to the latest version')
            .option('--status', 'Show current binary status and version')
            .option('--test', 'Test binary functionality')
            .option('--integrate <path>', 'Integrate existing binary from specified path')
            .action(this.handleOwnServerBinary.bind(this));
    }

    /**
     * アプリケーションインスタンス取得
     */
    async getAppInstance() {
        if (!this.app) {
            try {
                console.log('Creating new app instance...');
                this.app = new OwnServerManagerApp();
                console.log('App created, starting initialization...');
                await this.app.initialize();
                console.log('App initialized successfully');
                this.logger.info('Application instance initialized');
            } catch (error) {
                console.log('Failed to initialize app:', error.message);
                console.log('Error stack:', error.stack);
                this.logger.error('Failed to initialize application', { error: error.message });
                throw error;
            }
        }
        return this.app;
    }

    /**
     * Minecraftコマンド実行
     */
    async handleMinecraftCommand(command) {
        try {
            console.log(`📤 Sending command to Minecraft server: ${command}`);
            
            const app = await this.getAppInstance();
            const result = await app.minecraftManager.sendCommand(command);
            
            if (result.success) {
                console.log(`✅ Command sent successfully`);
                if (result.response) {
                    console.log(`📥 Response: ${result.response}`);
                }
            } else {
                console.log(`❌ Failed to send command: ${result.error}`);
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * サービス再起動処理
     */
    async handleRestart(service = 'all') {
        try {
            console.log(`🔄 Restarting service: ${service}`);
            
            const app = await this.getAppInstance();
            
            switch (service.toLowerCase()) {
                case 'all':
                    console.log('🔄 Restarting all services...');
                    await app.restart();
                    console.log('✅ All services restarted successfully');
                    break;
                    
                case 'mc':
                case 'minecraft':
                    console.log('🔄 Restarting Minecraft server...');
                    await app.minecraftManager.restart();
                    console.log('✅ Minecraft server restarted successfully');
                    break;
                    
                case 'own':
                case 'ownserver':
                    console.log('🔄 Restarting OwnServer...');
                    await app.ownServerManager.restart();
                    console.log('✅ OwnServer restarted successfully');
                    break;
                    
                default:
                    console.log(`❌ Unknown service: ${service}`);
                    console.log('Available services: all, mc, own');
                    return;
            }
            
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * サーバー非公開処理
     */
    async handlePrivate() {
        try {
            console.log('🔒 Making server private...');
            
            const app = await this.getAppInstance();
            const result = await app.setPrivate();
            
            if (result.success) {
                console.log('✅ Server is now private');
                console.log('📋 Status:');
                console.log(`   • OwnServer: ${result.ownserver ? 'Stopped' : 'Already stopped'}`);
                console.log(`   • DNS: ${result.dns ? 'Removed' : 'Already removed'}`);
                console.log(`   • Minecraft: Running locally on port 25565`);
            } else {
                console.log(`❌ Failed to make server private: ${result.error}`);
            }
            
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * サーバー公開処理
     */
    async handlePublic() {
        try {
            console.log('🌐 Making server public...');
            
            const app = await this.getAppInstance();
            const result = await app.setPublic();
            
            if (result.success) {
                console.log('✅ Server is now public');
                console.log('📋 Access Information:');
                console.log(`   • Custom Domain: ${result.domain}`);
                console.log(`   • OwnServer Endpoint: ${result.endpoint}`);
                console.log(`   • Status: Ready for connections`);
            } else {
                console.log(`❌ Failed to make server public: ${result.error}`);
            }
            
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * 全停止処理
     */
    async handleStop() {
        try {
            console.log('🛑 Stopping all services...');
            
            const app = await this.getAppInstance();
            await app.shutdown();
            
            console.log('✅ All services stopped successfully');
            console.log('👋 Goodbye!');
            
            process.exit(0);
            
        } catch (error) {
            this.handleError(error);
            process.exit(1);
        }
    }

    /**
     * 状態表示処理
     */
    async handleStatus() {
        try {
            console.log('📊 Checking service status...');
            
            const app = await this.getAppInstance();
            const status = await app.getStatus();
            
            console.log('\n🎮 === OwnServer Manager Status ===');
            
            // Minecraft Server Status
            console.log('\n🟦 Minecraft Server:');
            const mcStatus = status.minecraft;
            console.log(`   Status: ${this.getStatusIcon(mcStatus.running)} ${mcStatus.running ? 'Running' : 'Stopped'}`);
            if (mcStatus.running) {
                console.log(`   Port: ${mcStatus.port || 25565}`);
                console.log(`   Players: ${mcStatus.onlinePlayers || 0}/${mcStatus.maxPlayers || 20}`);
                console.log(`   Version: ${mcStatus.version || 'Unknown'}`);
            }
            
            // OwnServer Status
            console.log('\n🟨 OwnServer:');
            const ownStatus = status.ownserver;
            console.log(`   Status: ${this.getStatusIcon(ownStatus.running)} ${ownStatus.running ? 'Running' : 'Stopped'}`);
            if (ownStatus.running) {
                console.log(`   Endpoint: ${ownStatus.endpoint || 'Getting...'}`);
                console.log(`   Public Access: ${ownStatus.publicAccess ? 'Enabled' : 'Disabled'}`);
            }
            
            // DNS Status
            console.log('\n🟩 DNS Configuration:');
            const dnsStatus = status.dns || { configured: false, domain: 'Unknown', cname: false, srv: false };
            console.log(`   Status: ${this.getStatusIcon(dnsStatus.configured)} ${dnsStatus.configured ? 'Configured' : 'Not Configured'}`);
            if (dnsStatus.configured) {
                console.log(`   Domain: ${dnsStatus.domain || 'Unknown'}`);
                console.log(`   CNAME: ${dnsStatus.cname ? 'Set' : 'Not Set'}`);
                console.log(`   SRV: ${dnsStatus.srv ? 'Set' : 'Not Set'}`);
            }
            
            // Overall Health
            console.log('\n🩺 Overall Health:');
            const health = status.health || { status: 'unknown', uptime: 'Unknown' };
            console.log(`   Status: ${this.getHealthIcon(health.status)} ${health.status}`);
            console.log(`   Uptime: ${health.uptime || 'Unknown'}`);
            
            console.log('\n================================\n');
            
            // アプリケーションのクリーンアップ
            if (this.app && this.app.cleanup) {
                await this.app.cleanup();
            }
            
            // プロセス終了
            setTimeout(() => process.exit(0), 100);
            
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * ログ表示処理
     */
    async handleLogs(options) {
        try {
            console.log('📋 Displaying logs...');
            
            const app = await this.getAppInstance();
            const fs = require('fs');
            const path = require('path');
            
            const logDir = path.join(process.cwd(), 'logs');
            const services = options.service ? [options.service] : ['minecraft', 'ownserver', 'manager'];
            
            if (options.follow) {
                console.log('👁️ Following logs in real-time (Press Ctrl+C to exit)...\n');
                
                // リアルタイムログ表示
                for (const service of services) {
                    const logFile = path.join(logDir, `${service}.log`);
                    if (fs.existsSync(logFile)) {
                        console.log(`📁 === ${service.toUpperCase()} LOGS ===`);
                        
                        // Tail機能の実装
                        const { spawn } = require('child_process');
                        const tail = spawn('tail', ['-f', logFile]);
                        
                        tail.stdout.on('data', (data) => {
                            process.stdout.write(`[${service}] ${data}`);
                        });
                        
                        tail.stderr.on('data', (data) => {
                            console.error(`Error reading ${service} logs: ${data}`);
                        });
                    }
                }
                
                // Ctrl+C handling
                process.on('SIGINT', () => {
                    console.log('\n👋 Stopping log display...');
                    process.exit(0);
                });
                
            } else {
                // 静的ログ表示
                for (const service of services) {
                    const logFile = path.join(logDir, `${service}.log`);
                    
                    if (fs.existsSync(logFile)) {
                        console.log(`\n📁 === ${service.toUpperCase()} LOGS (Last 50 lines) ===`);
                        
                        const content = fs.readFileSync(logFile, 'utf8');
                        const lines = content.split('\n').slice(-50);
                        
                        lines.forEach(line => {
                            if (line.trim()) {
                                console.log(line);
                            }
                        });
                        
                        console.log(`=== END ${service.toUpperCase()} LOGS ===\n`);
                    } else {
                        console.log(`⚠️ Log file not found for ${service}: ${logFile}`);
                    }
                }
            }
            
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * インタラクティブメニュー
     */
    async handleInteractive() {
        const inquirer = require('inquirer');
        
        console.log('🎮 Welcome to OwnServer Manager Interactive Menu');
        
        try {
            const app = await this.getAppInstance();
            
            while (true) {
                const status = await app.getStatus();
                
                console.log('\n📊 Current Status:');
                console.log(`   Minecraft: ${this.getStatusIcon(status.minecraft.running)} ${status.minecraft.running ? 'Running' : 'Stopped'}`);
                console.log(`   OwnServer: ${this.getStatusIcon(status.ownserver.running)} ${status.ownserver.running ? 'Running' : 'Stopped'}`);
                
                // DNS状態の安全な確認
                const dnsConfigured = status.dns ? status.dns.configured : false;
                console.log(`   DNS: ${this.getStatusIcon(dnsConfigured)} ${dnsConfigured ? 'Configured' : 'Not Configured'}`);
                
                const choices = [
                    { name: '📊 Show detailed status', value: 'status' },
                    { name: '🟢 Start/Restart Minecraft server', value: 'start-mc' },
                    { name: '🛑 Stop Minecraft server', value: 'stop-mc' },
                    { name: '🌐 Make server public', value: 'public' },
                    { name: '🔒 Make server private', value: 'private' },
                    { name: '💬 Send Minecraft command', value: 'mc-command' },
                    { name: '� Player management', value: 'players' },
                    { name: '💾 Backup management', value: 'backup' },
                    { name: '📈 Performance monitor', value: 'monitor' },
                    { name: '🛠️ Maintenance tools', value: 'maintenance' },
                    { name: '�📋 View logs', value: 'logs' },
                    { name: '🔧 Configuration', value: 'config' },
                    { name: '🩺 Health check', value: 'health' },
                    { name: '❌ Exit', value: 'exit' }
                ];
                
                const answer = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'action',
                        message: 'What would you like to do?',
                        choices: choices
                    }
                ]);
                
                switch (answer.action) {
                    case 'status':
                        await this.handleStatus();
                        break;
                        
                    case 'start-mc':
                        await this.handleRestart('minecraft');
                        break;
                        
                    case 'stop-mc':
                        console.log('🛑 Stopping Minecraft server...');
                        await app.minecraftManager.stop();
                        console.log('✅ Minecraft server stopped');
                        break;
                        
                    case 'public':
                        await this.handlePublic();
                        break;
                        
                    case 'private':
                        await this.handlePrivate();
                        break;
                        
                    case 'mc-command':
                        const cmdAnswer = await inquirer.prompt([
                            {
                                type: 'input',
                                name: 'command',
                                message: 'Enter Minecraft command (without /):'
                            }
                        ]);
                        await this.handleMinecraftCommand(cmdAnswer.command);
                        break;
                        
                    case 'players':
                        const playerAnswer = await inquirer.prompt([
                            {
                                type: 'list',
                                name: 'action',
                                message: 'Player management:',
                                choices: [
                                    { name: 'List online players', value: 'list' },
                                    { name: 'Kick a player', value: 'kick' },
                                    { name: 'Ban a player', value: 'ban' },
                                    { name: 'Unban a player', value: 'unban' },
                                    { name: 'Give OP privileges', value: 'op' },
                                    { name: 'Remove OP privileges', value: 'deop' }
                                ]
                            }
                        ]);
                        
                        if (playerAnswer.action === 'list') {
                            await this.handlePlayers({ list: true });
                        } else {
                            const nameAnswer = await inquirer.prompt([
                                {
                                    type: 'input',
                                    name: 'player',
                                    message: 'Enter player name:'
                                }
                            ]);
                            const options = {};
                            options[playerAnswer.action] = nameAnswer.player;
                            await this.handlePlayers(options);
                        }
                        break;
                        
                    case 'backup':
                        const backupAnswer = await inquirer.prompt([
                            {
                                type: 'list',
                                name: 'action',
                                message: 'Backup management:',
                                choices: [
                                    { name: 'Create new backup', value: 'create' },
                                    { name: 'List backups', value: 'list' },
                                    { name: 'Restore from backup', value: 'restore' },
                                    { name: 'Delete backup', value: 'delete' }
                                ]
                            }
                        ]);
                        
                        if (backupAnswer.action === 'create') {
                            const nameAnswer = await inquirer.prompt([
                                {
                                    type: 'input',
                                    name: 'name',
                                    message: 'Backup name (optional):',
                                    default: ''
                                }
                            ]);
                            await this.handleBackup({ create: nameAnswer.name || true });
                        } else if (backupAnswer.action === 'list') {
                            await this.handleBackup({ list: true });
                        } else {
                            const nameAnswer = await inquirer.prompt([
                                {
                                    type: 'input',
                                    name: 'name',
                                    message: 'Backup name:'
                                }
                            ]);
                            const options = {};
                            options[backupAnswer.action] = nameAnswer.name;
                            await this.handleBackup(options);
                        }
                        break;
                        
                    case 'monitor':
                        const monitorAnswer = await inquirer.prompt([
                            {
                                type: 'list',
                                name: 'action',
                                message: 'Performance monitoring:',
                                choices: [
                                    { name: 'Show current stats', value: 'stats' },
                                    { name: 'Show performance alerts', value: 'alerts' },
                                    { name: 'Export stats to file', value: 'export' }
                                ]
                            }
                        ]);
                        
                        if (monitorAnswer.action === 'export') {
                            const formatAnswer = await inquirer.prompt([
                                {
                                    type: 'list',
                                    name: 'format',
                                    message: 'Export format:',
                                    choices: ['json', 'csv']
                                }
                            ]);
                            await this.handleMonitor({ export: formatAnswer.format });
                        } else {
                            const options = {};
                            options[monitorAnswer.action] = true;
                            await this.handleMonitor(options);
                        }
                        break;
                        
                    case 'maintenance':
                        const maintenanceAnswer = await inquirer.prompt([
                            {
                                type: 'list',
                                name: 'action',
                                message: 'Maintenance tools:',
                                choices: [
                                    { name: 'Clean up old files', value: 'cleanup' },
                                    { name: 'Optimize performance', value: 'optimize' },
                                    { name: 'Generate system report', value: 'report' }
                                ]
                            }
                        ]);
                        
                        const options = {};
                        options[maintenanceAnswer.action] = true;
                        await this.handleMaintenance(options);
                        break;
                        
                    case 'logs':
                        const logAnswer = await inquirer.prompt([
                            {
                                type: 'list',
                                name: 'service',
                                message: 'Which logs would you like to view?',
                                choices: [
                                    { name: 'All services', value: null },
                                    { name: 'Minecraft only', value: 'minecraft' },
                                    { name: 'OwnServer only', value: 'ownserver' },
                                    { name: 'Manager only', value: 'manager' }
                                ]
                            },
                            {
                                type: 'confirm',
                                name: 'follow',
                                message: 'Follow logs in real-time?',
                                default: false
                            }
                        ]);
                        await this.handleLogs({ service: logAnswer.service, follow: logAnswer.follow });
                        break;
                        
                    case 'config':
                        await this.handleConfig({ show: true });
                        break;
                        
                    case 'health':
                        await this.handleHealth();
                        break;
                        
                    case 'exit':
                        console.log('👋 Goodbye!');
                        return;
                }
                
                if (answer.action !== 'logs' || !logAnswer?.follow) {
                    await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'continue',
                            message: 'Press Enter to continue...'
                        }
                    ]);
                }
            }
            
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * 設定管理
     */
    async handleConfig(options) {
        try {
            console.log('Getting app instance...');
            const app = await this.getAppInstance();
            console.log('App instance obtained');
            console.log('ConfigManager exists:', !!app.configManager);
            const configManager = app.configManager;
            
            if (!configManager) {
                throw new Error('ConfigManager not initialized in app instance');
            }
            
            if (options.show) {
                console.log('🔧 Current Configuration:');
                const config = configManager.getAll();
                console.log(JSON.stringify(config, null, 2));
                
            } else if (options.check) {
                console.log('🔧 Checking configuration validity...');
                const config = configManager.getAll();
                
                // 基本的な設定項目の存在確認
                const requiredFields = ['minecraft', 'ownserver', 'cloudflare'];
                let isValid = true;
                
                for (const field of requiredFields) {
                    if (!config[field]) {
                        console.log(`❌ Missing required field: ${field}`);
                        isValid = false;
                    } else {
                        console.log(`✅ ${field}: OK`);
                    }
                }
                
                if (isValid) {
                    console.log('✅ Configuration is valid');
                } else {
                    console.log('❌ Configuration has errors');
                }
                
            } else if (options.set) {
                const [key, value] = options.set.split('=');
                if (!key || value === undefined) {
                    console.log('❌ Invalid format. Use: --set key=value');
                    return;
                }
                
                console.log(`🔧 Setting ${key} = ${value}`);
                configManager.set(key, value);
                await configManager.save();
                console.log('✅ Configuration saved');
                
            } else if (options.get) {
                const value = configManager.get(options.get);
                console.log(`🔧 ${options.get} = ${JSON.stringify(value, null, 2)}`);
                
            } else {
                console.log('❌ Please specify an option: --show, --set, or --get');
                console.log('Examples:');
                console.log('  config --show');
                console.log('  config --get minecraft.port');
                console.log('  config --set minecraft.port=25566');
            }
            
            // アプリケーションのクリーンアップ
            if (this.app && this.app.cleanup) {
                await this.app.cleanup();
            }
            
            // プロセス終了
            setTimeout(() => process.exit(0), 100);
            
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * ヘルスチェック
     */
    async handleHealth() {
        try {
            console.log('🩺 Running health check...');
            
            const app = await this.getAppInstance();
            const health = await app.runHealthCheck();
            
            console.log('\n🩺 === Health Check Results ===');
            
            for (const [service, result] of Object.entries(health)) {
                console.log(`\n${this.getHealthIcon(result.status)} ${service.toUpperCase()}:`);
                console.log(`   Status: ${result.status}`);
                console.log(`   Response Time: ${result.responseTime}ms`);
                
                if (result.details) {
                    console.log(`   Details: ${result.details}`);
                }
                
                if (result.errors && result.errors.length > 0) {
                    console.log(`   Errors:`);
                    result.errors.forEach(error => {
                        console.log(`     • ${error}`);
                    });
                }
            }
            
            console.log('\n================================\n');
            
            // プロセス終了
            process.exit(0);
            
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * プレイヤー管理
     */
    async handlePlayers(options) {
        try {
            const app = await this.getAppInstance();
            
            if (options.list) {
                console.log('👥 Fetching online players...');
                const players = await app.minecraftManager.getPlayerList();
                
                if (players.length === 0) {
                    console.log('📭 No players currently online');
                } else {
                    console.log(`👥 Online Players (${players.length}):`);
                    players.forEach((player, index) => {
                        console.log(`   ${index + 1}. ${player.name} (${player.playtime || 'Unknown playtime'})`);
                    });
                }
                
            } else if (options.kick) {
                console.log(`👢 Kicking player: ${options.kick}`);
                const result = await app.minecraftManager.sendCommand(`kick ${options.kick}`);
                console.log(result.success ? '✅ Player kicked' : `❌ Failed: ${result.error}`);
                
            } else if (options.ban) {
                console.log(`🚫 Banning player: ${options.ban}`);
                const result = await app.minecraftManager.sendCommand(`ban ${options.ban}`);
                console.log(result.success ? '✅ Player banned' : `❌ Failed: ${result.error}`);
                
            } else if (options.unban) {
                console.log(`✅ Unbanning player: ${options.unban}`);
                const result = await app.minecraftManager.sendCommand(`pardon ${options.unban}`);
                console.log(result.success ? '✅ Player unbanned' : `❌ Failed: ${result.error}`);
                
            } else if (options.op) {
                console.log(`👑 Giving OP to player: ${options.op}`);
                const result = await app.minecraftManager.sendCommand(`op ${options.op}`);
                console.log(result.success ? '✅ OP granted' : `❌ Failed: ${result.error}`);
                
            } else if (options.deop) {
                console.log(`👤 Removing OP from player: ${options.deop}`);
                const result = await app.minecraftManager.sendCommand(`deop ${options.deop}`);
                console.log(result.success ? '✅ OP removed' : `❌ Failed: ${result.error}`);
                
            } else {
                console.log('❌ Please specify an option:');
                console.log('  --list          List online players');
                console.log('  --kick <player> Kick a player');
                console.log('  --ban <player>  Ban a player');
                console.log('  --unban <player> Unban a player');
                console.log('  --op <player>   Give operator privileges');
                console.log('  --deop <player> Remove operator privileges');
            }
            
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * バックアップ管理
     */
    async handleBackup(options) {
        try {
            const app = await this.getAppInstance();
            const fs = require('fs').promises;
            const path = require('path');
            
            if (options.create !== undefined) {
                const backupName = options.create || `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
                console.log(`💾 Creating backup: ${backupName}`);
                
                // バックアップディレクトリの確保
                const backupDir = path.join(process.cwd(), 'backups');
                await fs.mkdir(backupDir, { recursive: true });
                
                // Minecraftサーバーのデータを保存
                console.log('🔄 Saving world data...');
                await app.minecraftManager.sendCommand('save-all');
                await app.minecraftManager.sendCommand('save-off');
                
                // 世界データのコピー
                const worldPath = path.join(process.cwd(), 'minecraft-servers', app.configManager.get('minecraft.serverName', 'default'), 'world');
                const backupPath = path.join(backupDir, `${backupName}.tar.gz`);
                
                const { spawn } = require('child_process');
                const tar = spawn('tar', ['-czf', backupPath, '-C', path.dirname(worldPath), 'world']);
                
                tar.on('close', async (code) => {
                    if (code === 0) {
                        console.log(`✅ Backup created: ${backupPath}`);
                        
                        // 保存を再開
                        await app.minecraftManager.sendCommand('save-on');
                    } else {
                        console.log(`❌ Backup failed with code: ${code}`);
                    }
                });
                
            } else if (options.list) {
                console.log('📋 Available backups:');
                const backupDir = path.join(process.cwd(), 'backups');
                
                try {
                    const files = await fs.readdir(backupDir);
                    const backups = files.filter(file => file.endsWith('.tar.gz'));
                    
                    if (backups.length === 0) {
                        console.log('📭 No backups found');
                    } else {
                        for (const backup of backups) {
                            const stats = await fs.stat(path.join(backupDir, backup));
                            const size = (stats.size / 1024 / 1024).toFixed(2);
                            console.log(`   📦 ${backup} (${size} MB, ${stats.mtime.toLocaleString()})`);
                        }
                    }
                } catch (error) {
                    console.log('📭 No backups directory found');
                }
                
            } else if (options.restore) {
                console.log(`📥 Restoring from backup: ${options.restore}`);
                
                // サーバー停止
                console.log('🛑 Stopping Minecraft server for restore...');
                await app.minecraftManager.stop();
                
                // バックアップからの復元
                const backupDir = path.join(process.cwd(), 'backups');
                const backupPath = path.join(backupDir, options.restore.endsWith('.tar.gz') ? options.restore : `${options.restore}.tar.gz`);
                const worldPath = path.join(process.cwd(), 'minecraft-servers', app.configManager.get('minecraft.serverName', 'default'));
                
                const { spawn } = require('child_process');
                const tar = spawn('tar', ['-xzf', backupPath, '-C', worldPath]);
                
                tar.on('close', async (code) => {
                    if (code === 0) {
                        console.log('✅ Backup restored successfully');
                        console.log('🟢 Starting Minecraft server...');
                        await app.minecraftManager.start();
                    } else {
                        console.log(`❌ Restore failed with code: ${code}`);
                    }
                });
                
            } else if (options.delete) {
                console.log(`🗑️ Deleting backup: ${options.delete}`);
                const backupDir = path.join(process.cwd(), 'backups');
                const backupPath = path.join(backupDir, options.delete.endsWith('.tar.gz') ? options.delete : `${options.delete}.tar.gz`);
                
                try {
                    await fs.unlink(backupPath);
                    console.log('✅ Backup deleted successfully');
                } catch (error) {
                    console.log(`❌ Failed to delete backup: ${error.message}`);
                }
                
            } else {
                console.log('❌ Please specify an option:');
                console.log('  --create [name]    Create backup with optional name');
                console.log('  --list             List available backups');
                console.log('  --restore <backup> Restore from backup');
                console.log('  --delete <backup>  Delete backup');
            }
            
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * パフォーマンス監視
     */
    async handleMonitor(options) {
        try {
            const app = await this.getAppInstance();
            
            if (options.stats) {
                console.log('📊 Current Performance Stats:');
                
                // システムリソース使用量
                const memUsage = process.memoryUsage();
                const cpuUsage = os.loadavg();
                
                console.log('\n🖥️ System Resources:');
                console.log(`   CPU Load: ${cpuUsage[0].toFixed(2)} (1min), ${cpuUsage[1].toFixed(2)} (5min), ${cpuUsage[2].toFixed(2)} (15min)`);
                console.log(`   Memory: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB RSS, ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB Heap`);
                console.log(`   Free Memory: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB / ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
                
                // Minecraftサーバー統計
                const status = await app.getStatus();
                if (status.minecraft.running) {
                    console.log('\n🎮 Minecraft Server:');
                    console.log(`   Players: ${status.minecraft.onlinePlayers || 0}/${status.minecraft.maxPlayers || 20}`);
                    console.log(`   Uptime: ${status.health.uptime || 'Unknown'}`);
                    
                    // TPS情報（可能であれば）
                    try {
                        const tpsResult = await app.minecraftManager.sendCommandWithResponse('tps', 2000);
                        if (tpsResult.success && tpsResult.response) {
                            console.log(`   TPS: ${tpsResult.response}`);
                        }
                    } catch (error) {
                        console.log('   TPS: Unable to retrieve');
                    }
                }
                
            } else if (options.history !== undefined) {
                const hours = parseInt(options.history) || 24;
                console.log(`📈 Performance History (${hours} hours):`);
                
                // 簡単な履歴表示（実際のデータ収集システムが必要）
                console.log('💡 Performance history tracking will be implemented in future versions');
                console.log('   For now, check system logs for historical data');
                
            } else if (options.alerts) {
                console.log('🚨 Performance Alerts:');
                
                // 基本的なアラートチェック
                const memUsage = process.memoryUsage();
                const freeMemPercent = (os.freemem() / os.totalmem()) * 100;
                const cpuLoad = os.loadavg()[0];
                
                const alerts = [];
                
                if (freeMemPercent < 10) {
                    alerts.push('🔴 Critical: Low system memory (<10%)');
                } else if (freeMemPercent < 20) {
                    alerts.push('🟡 Warning: Low system memory (<20%)');
                }
                
                if (cpuLoad > 80) {
                    alerts.push('🔴 Critical: High CPU load (>80%)');
                } else if (cpuLoad > 60) {
                    alerts.push('🟡 Warning: High CPU load (>60%)');
                }
                
                if (memUsage.heapUsed / memUsage.heapTotal > 0.9) {
                    alerts.push('🟡 Warning: High heap usage (>90%)');
                }
                
                if (alerts.length === 0) {
                    console.log('🟢 All systems operating normally');
                } else {
                    alerts.forEach(alert => console.log(`   ${alert}`));
                }
                
            } else if (options.export) {
                const format = options.export || 'json';
                console.log(`📤 Exporting stats in ${format} format...`);
                
                const stats = {
                    timestamp: new Date().toISOString(),
                    system: {
                        cpu: os.loadavg(),
                        memory: {
                            free: os.freemem(),
                            total: os.totalmem(),
                            usage: process.memoryUsage()
                        },
                        uptime: os.uptime()
                    },
                    minecraft: await app.getStatus()
                };
                
                const filename = `stats_${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;
                const fs = require('fs').promises;
                
                if (format === 'json') {
                    await fs.writeFile(filename, JSON.stringify(stats, null, 2));
                } else if (format === 'csv') {
                    const csv = this.statsToCSV(stats);
                    await fs.writeFile(filename, csv);
                }
                
                console.log(`✅ Stats exported to: ${filename}`);
                
            } else {
                console.log('❌ Please specify an option:');
                console.log('  --stats           Show current performance stats');
                console.log('  --history [hours] Show performance history');
                console.log('  --alerts          Show performance alerts');
                console.log('  --export [format] Export stats (json, csv)');
            }
            
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * メンテナンス機能
     */
    async handleMaintenance(options) {
        try {
            const app = await this.getAppInstance();
            
            if (options.cleanup) {
                console.log('🧹 Performing cleanup...');
                
                const fs = require('fs').promises;
                const path = require('path');
                
                // 古いログファイルの削除（7日以上前）
                const logDir = path.join(process.cwd(), 'logs');
                const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                
                try {
                    const files = await fs.readdir(logDir);
                    let deletedCount = 0;
                    
                    for (const file of files) {
                        const filePath = path.join(logDir, file);
                        const stats = await fs.stat(filePath);
                        
                        if (stats.mtime.getTime() < weekAgo && file.endsWith('.log')) {
                            await fs.unlink(filePath);
                            deletedCount++;
                        }
                    }
                    
                    console.log(`🗑️ Deleted ${deletedCount} old log files`);
                } catch (error) {
                    console.log('⚠️ No log directory found or cleanup failed');
                }
                
                // 一時ファイルの削除
                const tempDir = path.join(process.cwd(), 'temp-files');
                try {
                    const files = await fs.readdir(tempDir);
                    for (const file of files) {
                        await fs.unlink(path.join(tempDir, file));
                    }
                    console.log(`🗑️ Cleaned ${files.length} temporary files`);
                } catch (error) {
                    console.log('💡 No temporary files to clean');
                }
                
                console.log('✅ Cleanup completed');
                
            } else if (options.optimize) {
                console.log('⚡ Optimizing server performance...');
                
                // ガベージコレクション実行
                if (global.gc) {
                    global.gc();
                    console.log('🔄 Garbage collection executed');
                } else {
                    console.log('💡 Run with --expose-gc for manual garbage collection');
                }
                
                // Minecraftサーバーの最適化コマンド
                try {
                    await app.minecraftManager.sendCommand('save-all');
                    console.log('💾 World data saved and optimized');
                } catch (error) {
                    console.log('⚠️ Could not optimize Minecraft server');
                }
                
                console.log('✅ Optimization completed');
                
            } else if (options.report) {
                console.log('📊 Generating system report...');
                
                const fsPromises = require('fs').promises;
                
                const report = {
                    generated: new Date().toISOString(),
                    system: {
                        platform: os.platform(),
                        architecture: os.arch(),
                        hostname: os.hostname(),
                        uptime: os.uptime(),
                        loadAverage: os.loadavg(),
                        memory: {
                            total: os.totalmem(),
                            free: os.freemem(),
                            used: os.totalmem() - os.freemem()
                        },
                        cpus: os.cpus().length
                    },
                    application: {
                        version: '1.0.0',
                        nodeVersion: process.version,
                        pid: process.pid,
                        memory: process.memoryUsage(),
                        uptime: process.uptime()
                    },
                    services: await app.getStatus(),
                    health: await app.runHealthCheck()
                };
                
                const reportFile = `system_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
                await fsPromises.writeFile(reportFile, JSON.stringify(report, null, 2));
                
                console.log(`✅ System report generated: ${reportFile}`);
                
            } else if (options.schedule) {
                console.log(`⏰ Scheduling maintenance at: ${options.schedule}`);
                console.log('💡 Scheduled maintenance will be implemented in future versions');
                console.log('   For now, use cron jobs for scheduled tasks');
                
            } else {
                console.log('❌ Please specify an option:');
                console.log('  --cleanup          Clean up old logs and temporary files');
                console.log('  --optimize         Optimize server performance');
                console.log('  --report           Generate system report');
                console.log('  --schedule <time>  Schedule maintenance (future feature)');
            }
            
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * 統計データをCSV形式に変換
     */
    statsToCSV(stats) {
        const lines = [
            'timestamp,cpu_1min,cpu_5min,cpu_15min,memory_free,memory_total,memory_used_percent,minecraft_running,players_online'
        ];
        
        const memUsedPercent = ((stats.system.memory.total - stats.system.memory.free) / stats.system.memory.total * 100).toFixed(2);
        const line = [
            stats.timestamp,
            stats.system.cpu[0].toFixed(2),
            stats.system.cpu[1].toFixed(2),
            stats.system.cpu[2].toFixed(2),
            stats.system.memory.free,
            stats.system.memory.total,
            memUsedPercent,
            stats.minecraft.minecraft.running ? 1 : 0,
            stats.minecraft.minecraft.onlinePlayers || 0
        ].join(',');
        
        lines.push(line);
        return lines.join('\n');
    }

    /**
     * ステータスアイコン取得
     */
    getStatusIcon(isActive) {
        return isActive ? '🟢' : '🔴';
    }

    /**
     * ヘルスアイコン取得
     */
    getHealthIcon(status) {
        switch (status.toLowerCase()) {
            case 'healthy': return '🟢';
            case 'warning': return '🟡';
            case 'error': 
            case 'critical': return '🔴';
            default: return '⚪';
        }
    }

    /**
     * OwnServerバイナリ管理コマンドハンドラー
     */
    async handleOwnServerBinary(options) {
        try {
            const OwnServerBinaryManager = require('../utils/OwnServerBinaryManager');
            
            // アプリケーションインスタンスからconfigを取得
            let config = {};
            try {
                const app = await this.getAppInstance();
                config = app.config?.getAll ? app.config.getAll() : app.config || {};
            } catch (error) {
                this.logger.warn('アプリケーション設定の取得に失敗、デフォルト設定を使用:', error.message);
                // デフォルト設定を使用
                config = {
                    ownserver: {
                        binaryPath: '/app/bin/ownserver'
                    }
                };
            }
            
            const binaryManager = new OwnServerBinaryManager(config);

            if (options.status) {
                console.log('🔧 OwnServerバイナリステータス:');
                
                const exists = await binaryManager.isBinaryExists();
                const version = exists ? await binaryManager.getBinaryVersion() : 'インストールされていません';
                const path = binaryManager.binaryPath;
                
                console.log(`   パス: ${path}`);
                console.log(`   状態: ${exists ? '✅ インストール済み' : '❌ 未インストール'}`);
                console.log(`   バージョン: ${version}`);
                
                if (exists) {
                    const testResult = await binaryManager.testBinary();
                    console.log(`   動作テスト: ${testResult.success ? '✅ 正常' : '❌ エラー'}`);
                    if (!testResult.success) {
                        console.log(`   エラー詳細: ${testResult.error}`);
                    }
                }
                setTimeout(() => process.exit(0), 100);
                return;
            }

            if (options.test) {
                console.log('🧪 OwnServerバイナリのテスト実行中...');
                const testResult = await binaryManager.testBinary();
                
                if (testResult.success) {
                    console.log('✅ バイナリテスト成功');
                    console.log(`   バージョン: ${testResult.version}`);
                    console.log('   出力:');
                    console.log(testResult.output.split('\n').map(line => `     ${line}`).join('\n'));
                } else {
                    console.log('❌ バイナリテスト失敗');
                    console.log(`   エラー: ${testResult.error}`);
                }
                setTimeout(() => process.exit(0), 100);
                return;
            }

            if (options.integrate) {
                console.log(`🔄 既存バイナリを統合中: ${options.integrate}`);
                const result = await binaryManager.integrateBinary(options.integrate);
                
                if (result.success) {
                    console.log('✅ バイナリ統合成功');
                    console.log(`   パス: ${result.path}`);
                    console.log(`   バージョン: ${result.version}`);
                } else {
                    console.log('❌ バイナリ統合失敗');
                    console.log(`   エラー: ${result.error}`);
                }
                setTimeout(() => process.exit(0), 100);
                return;
            }

            if (options.install || options.update) {
                const action = options.update ? 'アップデート' : 'インストール';
                console.log(`📥 OwnServerバイナリの${action}を開始...`);
                
                const result = await binaryManager.installOrUpdateBinary(options.update);
                
                if (result.success) {
                    console.log(`✅ ${action}成功`);
                    console.log(`   アクション: ${result.action}`);
                    console.log(`   パス: ${result.path}`);
                    console.log(`   バージョン: ${result.version}`);
                    
                    if (result.releaseInfo) {
                        console.log(`   リリース: ${result.releaseInfo.version}`);
                        console.log(`   ファイル: ${result.releaseInfo.filename}`);
                    }
                } else {
                    console.log(`❌ ${action}失敗`);
                    console.log(`   エラー: ${result.error}`);
                }
                setTimeout(() => process.exit(0), 100);
                return;
            }

            // オプションが指定されていない場合のデフォルト動作
            console.log('🔧 OwnServerバイナリ管理');
            console.log('使用可能なオプション:');
            console.log('  --status     現在のバイナリ状況を表示');
            console.log('  --install    最新バイナリをダウンロード・インストール');
            console.log('  --update     強制的に最新バージョンに更新');
            console.log('  --test       バイナリの動作テスト');
            console.log('  --integrate <path>  既存バイナリを統合');
            
            setTimeout(() => process.exit(0), 100);

        } catch (error) {
            this.logger.error('OwnServerバイナリ管理エラー:', error);
            console.error('❌ OwnServerバイナリ管理でエラーが発生しました');
            console.error(`   ${error.message}`);
            process.exit(1);
        }
    }

    /**
     * エラーハンドリング
     */
    handleError(error) {
        this.logger.error('CLI command failed', { 
            error: error.message,
            stack: error.stack 
        });
        
        console.error('❌ Error occurred:');
        console.error(`   ${error.message}`);
        
        if (process.env.NODE_ENV === 'development') {
            console.error('\n🔍 Stack trace:');
            console.error(error.stack);
        }
        
        console.error('\n💡 Try running with --help for usage information');
        process.exit(1);
    }

    /**
     * CLI実行
     */
    run(argv) {
        try {
            this.program.parse(argv);
            // Commander.js内部で処理が完了した場合に明示的にプロセスを終了
            // （非同期コマンドが実行される場合はここで終了しない）
            if (!this.program.args || this.program.args.length === 0) {
                process.exit(0);
            }
        } catch (error) {
            this.handleError(error);
        }
    }
}

// メイン実行部分
if (require.main === module) {
    const cli = new CLIInterface();
    cli.run(process.argv);
}

module.exports = CLIInterface;
