#!/usr/bin/env node

/**
 * Minecraft機能テストスクリプト
 * Java環境とMinecraftサーバー管理機能をテスト
 */

const MinecraftServerManager = require('../src/managers/MinecraftServerManager');
const config = require('../config/config.json');
const fs = require('fs');
const path = require('path');

async function testMinecraftFunctionality() {
    console.log('🎮 Minecraft機能テスト開始...');
    console.log('==========================================');
    
    // 設定確認
    console.log('📋 設定確認:');
    console.log(`   Server Directory: ${config.minecraft.serverDirectory}`);
    console.log(`   Memory: ${config.minecraft.memoryMin} - ${config.minecraft.memoryMax}`);
    console.log(`   Java Args: ${config.minecraft.javaArgs.join(' ')}`);
    console.log(`   Port: ${config.minecraft.port}`);
    console.log('');
    
    // サーバーディレクトリの確認・作成
    console.log('📁 サーバーディレクトリの確認:');
    try {
        // テスト用ディレクトリ作成
        const testServerDir = path.join(process.cwd(), 'test-minecraft-server');
        if (!fs.existsSync(testServerDir)) {
            fs.mkdirSync(testServerDir, { recursive: true });
            console.log(`   ✅ テスト用ディレクトリ作成: ${testServerDir}`);
        } else {
            console.log(`   ✅ テスト用ディレクトリ確認: ${testServerDir}`);
        }
        
        // MinecraftServerManager初期化
        console.log('');
        console.log('🚀 MinecraftServerManager初期化:');
        const minecraftManager = new MinecraftServerManager(testServerDir, config.minecraft);
        console.log('   ✅ 初期化完了');
        
        // ステータス確認
        console.log('');
        console.log('🔍 ステータス確認:');
        const status = minecraftManager.getStatus();
        console.log(`   Status: ${status.status}`);
        console.log(`   Details:`, status.details);
        
        // Java環境チェック
        console.log('');
        console.log('☕ Java環境チェック:');
        try {
            // Java バージョン確認（コマンド実行）
            const { execSync } = require('child_process');
            const javaVersion = execSync('java -version 2>&1', { encoding: 'utf8' });
            console.log('   ✅ Java確認済み:');
            console.log('   ', javaVersion.split('\n')[0]);
        } catch (error) {
            console.log('   ⚠️  Java未インストールまたはPATH未設定');
            console.log('   ', error.message);
        }
        
        console.log('');
        console.log('✅ Minecraft機能テスト完了');
        
    } catch (error) {
        console.error('❌ テスト実行エラー:', error.message);
    }
}

// メイン実行
testMinecraftFunctionality().catch(error => {
    console.error('❌ テスト実行エラー:', error);
    process.exit(1);
});
