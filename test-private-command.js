const { CloudFlareManager } = require('./src/utils/development-phases/CloudFlareManager.js');
const config = require('./config/config.json');

console.log('=== Private Command Test ===');

async function testPrivateCommand() {
    try {
        const manager = new CloudFlareManager(config.cloudflare);
        console.log('CloudFlareManager created');
        
        // Step 1: 現在のDNS状態を確認
        console.log('\n--- Step 1: Current DNS Status ---');
        const statusBefore = await manager.getStatus();
        console.log('Status before private:', JSON.stringify(statusBefore, null, 2));
        
        if (!statusBefore.cname && !statusBefore.srv) {
            console.log('⚠️  No CNAME or SRV records found. Cannot test private command.');
            return;
        }
        
        // Step 2: 現在の関連レコードを取得
        console.log('\n--- Step 2: Find Target Records ---');
        const recordsResponse = await manager.getRecords();
        const allRecords = recordsResponse.records;
        
        // TEST_SUBDOMAINのCNAMEレコードを検索
        const testDomain = process.env.CLOUDFLARE_TEST_DOMAIN || 'yourdomain.com';
        const testSubdomain = process.env.CLOUDFLARE_TEST_SUBDOMAIN || 'play';
        const fullDomain = `${testSubdomain}.${testDomain}`;
        
        const playRecord = allRecords.find(r => 
            r.name === fullDomain && r.type === 'CNAME'
        );
        
        // _minecraft._tcp.play.cspd.netのSRVレコードを検索
        const srvRecord = allRecords.find(r => 
            r.name === '_minecraft._tcp.play.cspd.net' && r.type === 'SRV'
        );
        
        console.log('Found records:');
        if (playRecord) {
            console.log(`  - CNAME: ${playRecord.name} → ${playRecord.content} (ID: ${playRecord.id})`);
        }
        if (srvRecord) {
            console.log(`  - SRV: ${srvRecord.name} → ${srvRecord.content} (ID: ${srvRecord.id})`);
        }
        
        // Step 3: CNAMEレコードを削除
        if (playRecord) {
            console.log('\n--- Step 3: Delete CNAME Record ---');
            const cnameDeleteResult = await manager.deleteRecord('play', 'CNAME');
            console.log('CNAME delete result:', JSON.stringify(cnameDeleteResult, null, 2));
        }
        
        // Step 4: SRVレコードを削除
        if (srvRecord) {
            console.log('\n--- Step 4: Delete SRV Record ---');
            // SRVレコードは_minecraft._tcp.playという形式で削除
            const srvDeleteResult = await manager.deleteRecord('_minecraft._tcp.play', 'SRV');
            console.log('SRV delete result:', JSON.stringify(srvDeleteResult, null, 2));
        }
        
        // Step 5: 削除後の状態を確認
        console.log('\n--- Step 5: Status After Private ---');
        const statusAfter = await manager.getStatus();
        console.log('Status after private:', JSON.stringify(statusAfter, null, 2));
        
        // Step 6: 結果の評価
        console.log('\n--- Step 6: Test Results ---');
        const success = statusAfter.cname === false && statusAfter.srv === false;
        console.log(`Private command test: ${success ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`  - CNAME removed: ${statusBefore.cname === true && statusAfter.cname === false ? '✅' : '❌'}`);
        console.log(`  - SRV removed: ${statusBefore.srv === true && statusAfter.srv === false ? '✅' : '❌'}`);
        
        return success;
        
    } catch (error) {
        console.error('Test error:', error);
        console.error('Error message:', error.message);
        return false;
    }
}

testPrivateCommand();
