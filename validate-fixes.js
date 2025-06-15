#!/usr/bin/env node

/**
 * 修正検証スクリプト
 * API修正とPhase2実装の確認
 */

console.log('🔧 OwnServer Manager - 修正検証スクリプト');
console.log('='.repeat(50));

// 1. CloudFlare API メソッド確認
console.log('\n1. CloudFlare API メソッド確認');
try {
    const CloudFlareManager = require('./src/managers/CloudFlareManager');
    const manager = new CloudFlareManager({
        domain: 'test.com',
        zoneId: 'test-zone',
        apiToken: 'test-token'
    });
    
    console.log('✅ CloudFlareManager インスタンス作成成功');
    console.log('✅ updateDnsRecord メソッド:', typeof manager.updateDnsRecord);
    console.log('✅ removeDnsRecord メソッド:', typeof manager.removeDnsRecord);
    console.log('✅ updateRecord メソッド:', typeof manager.updateRecord);
    console.log('✅ deleteRecord メソッド:', typeof manager.deleteRecord);
    
} catch (error) {
    console.error('❌ CloudFlareManager エラー:', error.message);
}

// 2. Phase2 機能確認
console.log('\n2. Phase2 機能確認');
try {
    const MinecraftServerManager_Phase2 = require('./src/utils/development-phases/MinecraftServerManager_Phase2');
    
    // ダミーのテストディレクトリを作成
    const testDir = './temp-test-server';
    const fs = require('fs');
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }
    
    const manager = new MinecraftServerManager_Phase2(testDir, {
        logAnalysis: { enabled: true },
        autoRestart: { enabled: false }
    });
    
    console.log('✅ Phase2Manager インスタンス作成成功');
    console.log('✅ implementationPhase:', manager.implementationPhase);
    console.log('✅ phase.name:', manager.phase?.name);
    console.log('✅ LogParser 初期化:', !!manager.logParser);
    console.log('✅ loadServerProperties メソッド:', typeof manager.loadServerProperties);
    console.log('✅ saveServerProperties メソッド:', typeof manager.saveServerProperties);
    console.log('✅ enableAutoRestart メソッド:', typeof manager.enableAutoRestart);
    console.log('✅ disableAutoRestart メソッド:', typeof manager.disableAutoRestart);
    console.log('✅ autoRestartEnabled:', manager.config.autoRestart.enabled);
    
    // クリーンアップ
    try {
        fs.rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
        // 無視
    }
    
} catch (error) {
    console.error('❌ Phase2Manager エラー:', error.message);
}

// 3. LogParser 確認
console.log('\n3. LogParser 確認');
try {
    const LogParser = require('./src/utils/LogParser');
    
    // Logger なしでテスト
    const parser1 = new LogParser();
    console.log('✅ LogParser (logger未指定) 作成成功');
    
    // カスタムLoggerでテスト
    const mockLogger = { info: () => {}, debug: () => {}, warn: () => {}, error: () => {} };
    const parser2 = new LogParser(mockLogger);
    console.log('✅ LogParser (mockLogger) 作成成功');
    
} catch (error) {
    console.error('❌ LogParser エラー:', error.message);
}

console.log('\n' + '='.repeat(50));
console.log('🎯 修正検証完了');
console.log('');
console.log('主な修正項目:');
console.log('- CloudFlare API メソッド名互換性');
console.log('- Phase2 プロパティ管理機能実装');
console.log('- LogParser 初期化・フォールバック改善');
console.log('- Phase識別子・マーカー追加');
