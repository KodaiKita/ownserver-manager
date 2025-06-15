#!/usr/bin/env node

/**
 * CloudFlare API テストスクリプト
 * 実際のAPIトークンでCloudFlareとの接続をテスト
 */

const CloudFlareManager = require('../src/managers/CloudFlareManager');
const config = require('../config/config.json');

async function testCloudFlareAPI() {
    console.log('🌩️  CloudFlare API テスト開始...');
    console.log('==========================================');
    
    // 設定確認
    console.log('📋 設定確認:');
    console.log(`   Domain: ${config.cloudflare.domain}`);
    console.log(`   Zone ID: ${config.cloudflare.zoneId}`);
    console.log(`   API Token: ${config.cloudflare.apiToken ? '設定済み' : '未設定'}`);
    console.log(`   Email: ${config.cloudflare.email}`);
    console.log('');
    
    // CloudFlareManager初期化
    const cloudflareManager = new CloudFlareManager(
        config.cloudflare.apiToken,
        config.cloudflare.zoneId,
        config.cloudflare
    );
    
    // ステータス確認
    console.log('🔍 ステータス確認:');
    const status = cloudflareManager.getStatus();
    console.log(`   Status: ${status.status}`);
    console.log(`   Details:`, status.details);
    console.log('');
    
    // API接続テスト
    try {
        console.log('⚡ API接続テスト:');
        const testResult = await cloudflareManager.testConnection();
        
        if (testResult.success) {
            console.log(`   ✅ 接続成功 (${testResult.responseTime}ms)`);
            console.log(`   📊 ゾーン数: ${testResult.zonesCount}`);
            console.log(`   📋 ゾーン例:`, testResult.zones);
        } else {
            console.log(`   ❌ 接続失敗: ${testResult.error}`);
        }
        console.log('');
        
    } catch (error) {
        console.log(`   ❌ エラー: ${error.message}`);
    }
    
    console.log('✅ CloudFlare API テスト完了');
}

// メイン実行
testCloudFlareAPI().catch(error => {
    console.error('❌ テスト実行エラー:', error);
    process.exit(1);
});
