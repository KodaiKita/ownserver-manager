#!/usr/bin/env node

/**
 * 統合設定生成スクリプト
 * マスター設定から全ての設定ファイルを自動生成
 */

const path = require('path');
const fs = require('fs');
const UnifiedConfigManager = require('../src/utils/UnifiedConfigManager');

async function main() {
    console.log('🔧 OwnServer Manager - 統合設定生成ツール');
    console.log('================================================');

    try {
        // config ディレクトリが存在しない場合は作成
        const configDir = path.join(__dirname, '..', 'config');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
            console.log(`📁 Created config directory: ${configDir}`);
        }

        const masterConfigPath = path.join(configDir, 'master.json');
        const configManager = new UnifiedConfigManager(masterConfigPath);

        // master.json が存在しない場合はテンプレートを生成
        if (!fs.existsSync(masterConfigPath)) {
            console.log('❌ master.json not found. Generating template...');
            await configManager.generateMasterTemplate();
            console.log('');
            console.log('📝 Please edit config/master.json with your actual values:');
            console.log('   - cloudflare.domain');
            console.log('   - cloudflare.apiToken'); 
            console.log('   - cloudflare.zoneId');
            console.log('   - cloudflare.email');
            console.log('');
            console.log('Then run this script again to generate all config files.');
            return;
        }

        // マスター設定を読み込み
        await configManager.loadMasterConfig();
        
        // 設定を検証
        configManager.validateMasterConfig();
        
        // 全ての設定ファイルを生成
        await configManager.generateAllConfigs();
        
        console.log('');
        console.log('🎉 Configuration generation completed!');
        console.log('');
        console.log('Generated files:');
        console.log('  ✅ config/config.json');
        console.log('  ✅ config/.env');
        console.log('  ✅ config/docker.env');
        console.log('  ✅ config/production.env');
        console.log('');
        console.log('You can now run:');
        console.log('  docker compose up -d');
        console.log('  OR');
        console.log('  npm start');

    } catch (error) {
        console.error('❌ Error generating configuration:', error.message);
        process.exit(1);
    }
}

// コマンドライン引数の処理
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log('OwnServer Manager - 統合設定生成ツール');
    console.log('');
    console.log('使用方法:');
    console.log('  node scripts/config-generator.js');
    console.log('');
    console.log('オプション:');
    console.log('  --help, -h     このヘルプを表示');
    console.log('  --template     master.json.example のみ生成');
    console.log('');
    console.log('手順:');
    console.log('  1. config/master.json を編集');
    console.log('  2. このスクリプトを実行');
    console.log('  3. 全ての設定ファイルが自動生成されます');
    process.exit(0);
}

if (args.includes('--template')) {
    console.log('📝 Generating master.json template only...');
    const configDir = path.join(__dirname, '..', 'config');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    const configManager = new UnifiedConfigManager(path.join(configDir, 'master.json'));
    configManager.generateMasterTemplate().then(() => {
        console.log('✅ Template generated: config/master.json.example');
        console.log('Copy it to config/master.json and edit with your values.');
    }).catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
} else {
    main();
}
