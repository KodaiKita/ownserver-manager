#!/usr/bin/env node

/**
 * CloudFlare API 接続テストスクリプト
 * 新しい認証情報での動作確認用
 */

require('dotenv').config();
const https = require('https');

const CONFIG = {
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    email: process.env.CLOUDFLARE_EMAIL,
    globalApiKey: process.env.CLOUDFLARE_GLOBAL_API_KEY,
    domain: process.env.CLOUDFLARE_TEST_DOMAIN || 'yourdomain.com'
};

console.log('🔐 CloudFlare API 接続テスト');
console.log('============================');
console.log(`🌐 対象ドメイン: ${CONFIG.domain}`);
console.log(`🔑 認証方式: ${CONFIG.apiToken !== 'YOUR_CLOUDFLARE_API_TOKEN' ? 'APIトークン' : 'Global API Key'}`);
console.log('');

function makeApiRequest(path, headers, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.cloudflare.com',
            port: 443,
            path: `/client/v4${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'OwnServer-Manager/1.0.0',
                ...headers
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve({ status: res.statusCode, data: response });
                } catch (error) {
                    reject(new Error(`JSON parse error: ${error.message}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function testApiToken() {
    console.log('🧪 APIトークンテスト...');
    
    if (CONFIG.apiToken === 'YOUR_CLOUDFLARE_API_TOKEN') {
        console.log('❌ APIトークンが設定されていません');
        return false;
    }

    try {
        const headers = { 'Authorization': `Bearer ${CONFIG.apiToken}` };
        
        // ゾーン一覧取得テスト
        const zonesResult = await makeApiRequest('/zones', headers);
        
        if (zonesResult.status === 200 && zonesResult.data.success) {
            console.log('✅ APIトークン認証成功');
            console.log(`📊 アクセス可能なゾーン数: ${zonesResult.data.result.length}`);
            
            // 指定Zone IDの確認
            if (CONFIG.zoneId !== 'YOUR_CLOUDFLARE_ZONE_ID') {
                const targetZone = zonesResult.data.result.find(zone => zone.id === CONFIG.zoneId);
                if (targetZone) {
                    console.log(`✅ 対象ゾーン確認: ${targetZone.name}`);
                    return true;
                } else {
                    console.log('⚠️  指定されたZone IDがアクセス可能なゾーンに含まれていません');
                    console.log('💡 利用可能なゾーン:');
                    zonesResult.data.result.forEach(zone => {
                        console.log(`   - ${zone.name} (ID: ${zone.id})`);
                    });
                    return false;
                }
            } else {
                console.log('⚠️  Zone IDが設定されていません');
                return false;
            }
        } else {
            console.log('❌ APIトークン認証失敗');
            console.log(`エラー: ${zonesResult.data.errors?.[0]?.message || 'Unknown error'}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ APIトークンテストエラー: ${error.message}`);
        return false;
    }
}

async function testGlobalApiKey() {
    console.log('🧪 Global API Keyテスト...');
    
    if (CONFIG.globalApiKey === 'YOUR_CLOUDFLARE_GLOBAL_API_KEY' || 
        CONFIG.email === 'your-email@example.com') {
        console.log('❌ Global API KeyまたはEmailが設定されていません');
        return false;
    }

    try {
        const headers = {
            'X-Auth-Email': CONFIG.email,
            'X-Auth-Key': CONFIG.globalApiKey
        };
        
        const zonesResult = await makeApiRequest('/zones', headers);
        
        if (zonesResult.status === 200 && zonesResult.data.success) {
            console.log('✅ Global API Key認証成功');
            console.log(`📊 アクセス可能なゾーン数: ${zonesResult.data.result.length}`);
            return true;
        } else {
            console.log('❌ Global API Key認証失敗');
            console.log(`エラー: ${zonesResult.data.errors?.[0]?.message || 'Unknown error'}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Global API Keyテストエラー: ${error.message}`);
        return false;
    }
}

async function testDnsOperations() {
    console.log('🧪 DNS操作権限テスト...');
    
    if (CONFIG.zoneId === 'YOUR_CLOUDFLARE_ZONE_ID') {
        console.log('❌ Zone IDが設定されていません');
        return false;
    }

    try {
        const headers = CONFIG.apiToken !== 'YOUR_CLOUDFLARE_API_TOKEN' 
            ? { 'Authorization': `Bearer ${CONFIG.apiToken}` }
            : { 'X-Auth-Email': CONFIG.email, 'X-Auth-Key': CONFIG.globalApiKey };
        
        // DNSレコード一覧取得テスト
        const dnsResult = await makeApiRequest(`/zones/${CONFIG.zoneId}/dns_records`, headers);
        
        if (dnsResult.status === 200 && dnsResult.data.success) {
            console.log('✅ DNS読み取り権限確認');
            console.log(`📊 既存DNSレコード数: ${dnsResult.data.result.length}`);
            return true;
        } else {
            console.log('❌ DNS操作権限なし');
            console.log(`エラー: ${dnsResult.data.errors?.[0]?.message || 'Unknown error'}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ DNS操作テストエラー: ${error.message}`);
        return false;
    }
}

async function main() {
    let success = false;
    
    // APIトークンテスト
    if (CONFIG.apiToken !== 'YOUR_CLOUDFLARE_API_TOKEN') {
        success = await testApiToken();
    }
    
    // Global API Keyテスト（APIトークンが失敗した場合、または設定されていない場合）
    if (!success && CONFIG.globalApiKey !== 'YOUR_CLOUDFLARE_GLOBAL_API_KEY') {
        success = await testGlobalApiKey();
    }
    
    if (success) {
        // DNS操作テスト
        await testDnsOperations();
        
        console.log('');
        console.log('🎉 CloudFlare API接続テスト完了！');
        console.log('✅ 新しい認証情報での接続が確認できました');
        console.log('');
        console.log('💡 推奨事項:');
        console.log('  - APIトークンベースの認証を使用（Global API Keyより安全）');
        console.log('  - IP制限の設定');
        console.log('  - 定期的なトークンローテーション');
    } else {
        console.log('');
        console.log('❌ CloudFlare API接続テスト失敗');
        console.log('');
        console.log('🔧 確認事項:');
        console.log('  1. .envファイルに正しい認証情報が設定されているか');
        console.log('  2. APIトークンのスコープが適切か（Zone読み取り + DNS編集権限）');
        console.log('  3. Zone IDが正しいか');
        console.log('  4. CloudFlareアカウントが有効か');
        
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testApiToken, testGlobalApiKey, testDnsOperations };
