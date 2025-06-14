// CloudFlare API 実環境テスト
// 注意: 実際のCloudFlare APIを使用するテストです
// CLOUDFLARE_LIVE_TESTING=true の場合のみ実行されます

require('dotenv').config();
const assert = require('assert');
const CloudFlareManager = require('../../src/utils/development-phases/CloudFlareManager');

// Load environment variables for tests
require('dotenv').config();

describe('CloudFlareManager - Live API Tests', function() {
    let manager;
    const testRecordName = `test-${Date.now()}`;
    const testTarget = '192.168.1.100';
    
    // 実際のAPIテストかどうかのチェック
    const isLiveTesting = process.env.CLOUDFLARE_LIVE_TESTING === 'true';
    const requiredEnvVars = [
        'CLOUDFLARE_API_TOKEN',
        'CLOUDFLARE_ZONE_ID', 
        'CLOUDFLARE_TEST_DOMAIN'
    ];
    
    before(function() {
        if (!isLiveTesting) {
            this.skip();
            return;
        }
        
        // 必要な環境変数のチェック
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            console.log(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
            console.log('Please set these in your .env file to run live API tests');
            this.skip();
            return;
        }
        
        console.log('🔴 WARNING: Running LIVE CloudFlare API tests');
        console.log(`📧 Domain: ${process.env.CLOUDFLARE_TEST_DOMAIN}`);
        console.log(`🔧 Test Record: ${testRecordName}.${process.env.CLOUDFLARE_TEST_DOMAIN}`);
        
        manager = new CloudFlareManager({
            apiToken: process.env.CLOUDFLARE_API_TOKEN,
            email: process.env.CLOUDFLARE_EMAIL,
            globalApiKey: process.env.CLOUDFLARE_GLOBAL_API_KEY,
            zoneId: process.env.CLOUDFLARE_ZONE_ID,
            domain: process.env.CLOUDFLARE_TEST_DOMAIN,
            defaultTtl: 60,
            defaultProxied: false
        });
    });
    
    after(async function() {
        if (!isLiveTesting || !manager) return;
        
        // テスト後のクリーンアップ - テストレコードを削除
        try {
            console.log(`🧹 Cleaning up test record: ${testRecordName}`);
            await manager.removeDnsRecord(testRecordName, 'A');
            console.log('✅ Cleanup completed');
        } catch (error) {
            console.log(`⚠️ Cleanup warning: ${error.message}`);
        }
    });
    
    it('API認証とゾーン情報の取得', async function() {
        if (!isLiveTesting) this.skip();
        
        this.timeout(10000);
        
        // ゾーン情報の取得テスト
        const zoneInfo = await manager._getZoneInfo();
        
        assert(zoneInfo, 'Zone information should be retrieved');
        assert.strictEqual(zoneInfo.id, process.env.CLOUDFLARE_ZONE_ID);
        assert.strictEqual(zoneInfo.name, process.env.CLOUDFLARE_TEST_DOMAIN);
        
        console.log(`✅ Zone: ${zoneInfo.name} (${zoneInfo.id})`);
        console.log(`📊 Status: ${zoneInfo.status}`);
    });
    
    it('DNSレコードの作成・確認・削除', async function() {
        if (!isLiveTesting) this.skip();
        
        this.timeout(15000);
        
        // 1. レコード作成
        console.log(`📝 Creating DNS record: ${testRecordName}.${process.env.CLOUDFLARE_TEST_DOMAIN} -> ${testTarget}`);
        const createResult = await manager.updateDnsRecord(testRecordName, testTarget, 'A');
        
        assert(createResult, 'DNS record creation should succeed');
        assert(createResult.id, 'Created record should have an ID');
        console.log(`✅ Record created with ID: ${createResult.id}`);
        
        // 2. レコード存在確認
        const records = await manager._listDnsRecords();
        const createdRecord = records.find(r => 
            r.name === `${testRecordName}.${process.env.CLOUDFLARE_TEST_DOMAIN}` && 
            r.type === 'A'
        );
        
        assert(createdRecord, 'Created record should be found in DNS records list');
        assert.strictEqual(createdRecord.content, testTarget);
        console.log(`✅ Record verified: ${createdRecord.name} -> ${createdRecord.content}`);
        
        // 3. レコード更新
        const newTarget = '192.168.1.101';
        console.log(`🔄 Updating DNS record to: ${newTarget}`);
        const updateResult = await manager.updateDnsRecord(testRecordName, newTarget, 'A');
        
        assert(updateResult, 'DNS record update should succeed');
        console.log(`✅ Record updated`);
        
        // 4. 更新確認
        const updatedRecords = await manager._listDnsRecords();
        const updatedRecord = updatedRecords.find(r => 
            r.name === `${testRecordName}.${process.env.CLOUDFLARE_TEST_DOMAIN}` && 
            r.type === 'A'
        );
        
        assert(updatedRecord, 'Updated record should be found');
        assert.strictEqual(updatedRecord.content, newTarget);
        console.log(`✅ Update verified: ${updatedRecord.content}`);
        
        // 5. レコード削除
        console.log(`🗑️ Deleting DNS record`);
        const deleteResult = await manager.removeDnsRecord(testRecordName, 'A');
        
        assert(deleteResult, 'DNS record deletion should succeed');
        console.log(`✅ Record deleted`);
        
        // 6. 削除確認
        const finalRecords = await manager._listDnsRecords();
        const deletedRecord = finalRecords.find(r => 
            r.name === `${testRecordName}.${process.env.CLOUDFLARE_TEST_DOMAIN}` && 
            r.type === 'A'
        );
        
        assert(!deletedRecord, 'Deleted record should not be found');
        console.log(`✅ Deletion verified`);
    });
    
    it('CNAMEレコードの操作', async function() {
        if (!isLiveTesting) this.skip();
        
        this.timeout(15000);
        
        const cnameTarget = 'target.example.com';
        const cnameTestName = `cname-${testRecordName}`;
        
        try {
            // CNAME作成
            console.log(`📝 Creating CNAME record: ${cnameTestName}.${process.env.CLOUDFLARE_TEST_DOMAIN} -> ${cnameTarget}`);
            const createResult = await manager.updateDnsRecord(cnameTestName, cnameTarget, 'CNAME');
            
            assert(createResult, 'CNAME record creation should succeed');
            console.log(`✅ CNAME record created`);
            
            // CNAME削除
            console.log(`🗑️ Deleting CNAME record`);
            const deleteResult = await manager.removeDnsRecord(cnameTestName, 'CNAME');
            
            assert(deleteResult, 'CNAME record deletion should succeed');
            console.log(`✅ CNAME record deleted`);
            
        } catch (error) {
            // クリーンアップを試みる
            try {
                await manager.removeDnsRecord(cnameTestName, 'CNAME');
            } catch (cleanupError) {
                // クリーンアップエラーは無視
            }
            throw error;
        }
    });
    
    it('エラーハンドリング - 不正なレコード削除', async function() {
        if (!isLiveTesting) this.skip();
        
        this.timeout(5000);
        
        const nonExistentRecord = `non-existent-${Date.now()}`;
        
        // 存在しないレコードの削除を試行
        try {
            const result = await manager.removeDnsRecord(nonExistentRecord, 'A');
            console.log(`ℹ️ Non-existent record deletion result: ${result}`);
            // 存在しないレコードの削除は成功扱いになる場合もある
        } catch (error) {
            console.log(`ℹ️ Expected error for non-existent record: ${error.message}`);
        }
    });
    
    it('レート制限の確認', async function() {
        if (!isLiveTesting) this.skip();
        
        this.timeout(20000);
        
        console.log(`⏱️ Testing rate limits with multiple API calls`);
        
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(manager._listDnsRecords());
        }
        
        const startTime = Date.now();
        const results = await Promise.all(promises);
        const endTime = Date.now();
        
        console.log(`✅ Completed ${results.length} API calls in ${endTime - startTime}ms`);
        
        results.forEach((result, index) => {
            assert(Array.isArray(result), `API call ${index + 1} should return an array`);
        });
    });
    
    it('Minecraft DNS自動設定テスト', async function() {
        if (!isLiveTesting) this.skip();
        
        this.timeout(25000);
        
        const minecraftTestDomain = `mc-${Date.now()}`;
        const testOwnServerEndpoint = 'shard-test.ownserver.kumassy.com:25565';
        
        try {
            console.log(`🎮 Testing Minecraft DNS setup for: ${minecraftTestDomain}.${process.env.CLOUDFLARE_TEST_DOMAIN}`);
            
            const result = await manager.setMinecraftDns(minecraftTestDomain, testOwnServerEndpoint);
            
            console.log(`✅ Minecraft DNS setup result:`, result);
            
            assert.strictEqual(result.success, true, 'Minecraft DNS setup should succeed');
            assert(result.cname, 'CNAME result should be present');
            assert(result.srv, 'SRV result should be present');
            assert.strictEqual(result.cname.success, true, 'CNAME creation should succeed');
            assert.strictEqual(result.srv.success, true, 'SRV creation should succeed');
            
            // レコードが存在することを確認
            const cnameRecord = await manager._listDnsRecords('CNAME', `${minecraftTestDomain}.${process.env.CLOUDFLARE_TEST_DOMAIN}`);
            const srvRecord = await manager._listDnsRecords('SRV', `_minecraft._tcp.${minecraftTestDomain}.${process.env.CLOUDFLARE_TEST_DOMAIN}`);
            
            assert(cnameRecord.length > 0, 'CNAME record should exist');
            assert(srvRecord.length > 0, 'SRV record should exist');
            
            console.log(`📊 CNAME record:`, cnameRecord[0]);
            console.log(`📊 SRV record:`, srvRecord[0]);
            
            // クリーンアップ
            try {
                await manager._deleteDnsRecord(cnameRecord[0].id);
                await manager._deleteDnsRecord(srvRecord[0].id);
                console.log('🧹 Cleaned up test records');
            } catch (cleanupError) {
                console.log(`⚠️ Cleanup warning: ${cleanupError.message}`);
            }
            
        } catch (error) {
            console.error('❌ Minecraft DNS test failed:', error.message);
            throw error;
        }
    });
    
    it('エンドポイント解析テスト', function() {
        if (!isLiveTesting) this.skip();
        
        const testCases = [
            {
                input: 'example.com:25565',
                expected: { hostname: 'example.com', port: 25565 }
            },
            {
                input: 'test.server.net:19132',
                expected: { hostname: 'test.server.net', port: 19132 }
            },
            {
                input: 'http://example.com:8080',
                expected: { hostname: 'example.com', port: 8080 }
            },
            {
                input: 'https://secure.example.com:443',
                expected: { hostname: 'secure.example.com', port: 443 }
            }
        ];
        
        testCases.forEach(({ input, expected }) => {
            const result = manager.parseEndpoint(input);
            assert.strictEqual(result.hostname, expected.hostname, `Hostname should match for ${input}`);
            assert.strictEqual(result.port, expected.port, `Port should match for ${input}`);
        });
        
        console.log('✅ All endpoint parsing tests passed');
    });

    // 必要な環境変数が設定されていない場合のスキップメッセージ
    if (!isLiveTesting) {
        it('Live API tests are disabled', function() {
            console.log('ℹ️ To enable live API tests:');
            console.log('  1. Copy .env.example to .env');
            console.log('  2. Set your CloudFlare API credentials');
            console.log('  3. Set CLOUDFLARE_LIVE_TESTING=true');
            console.log('  4. Run: npm test -- --grep "Live API"');
        });
    }
});

// CloudFlareManagerに必要なヘルパーメソッドを追加
function addHelperMethods() {
    const CloudFlareManager = require('../../src/utils/development-phases/CloudFlareManager');
    
    // _getZoneInfo メソッドの追加
    if (!CloudFlareManager.prototype._getZoneInfo) {
        CloudFlareManager.prototype._getZoneInfo = async function() {
            const url = `https://api.cloudflare.com/client/v4/zones/${this.zoneId}`;
            const headers = this._getHeaders();
            
            const response = await fetch(url, { headers });
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(`CloudFlare API error: ${data.errors[0]?.message || 'Unknown error'}`);
            }
            
            return data.result;
        };
    }
    
    // _listDnsRecords メソッドの追加
    if (!CloudFlareManager.prototype._listDnsRecords) {
        CloudFlareManager.prototype._listDnsRecords = async function() {
            const url = `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/dns_records`;
            const headers = this._getHeaders();
            
            const response = await fetch(url, { headers });
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(`CloudFlare API error: ${data.errors[0]?.message || 'Unknown error'}`);
            }
            
            return data.result;
        };
    }
    
    // _getHeaders メソッドの確認・追加
    if (!CloudFlareManager.prototype._getHeaders) {
        CloudFlareManager.prototype._getHeaders = function() {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (this.apiToken) {
                headers['Authorization'] = `Bearer ${this.apiToken}`;
            } else if (this.globalApiKey && this.email) {
                headers['X-Auth-Email'] = this.email;
                headers['X-Auth-Key'] = this.globalApiKey;
            } else {
                throw new Error('CloudFlare API credentials not configured');
            }
            
            return headers;
        };
    }
}

// ヘルパーメソッドを追加
addHelperMethods();
