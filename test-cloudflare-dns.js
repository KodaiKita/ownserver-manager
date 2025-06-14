#!/usr/bin/env node

// CloudFlare API テストスクリプト
const https = require('https');

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || 'YOUR_CLOUDFLARE_API_TOKEN';
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || 'YOUR_CLOUDFLARE_ZONE_ID';
const DOMAIN = process.env.CLOUDFLARE_TEST_DOMAIN || 'yourdomain.com';
const TARGET_HOST = process.env.TARGET_HOST || 'your-server.example.com';
const TARGET_PORT = process.env.TARGET_PORT || 25565;

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.cloudflare.com',
            port: 443,
            path: `/client/v4/zones/${ZONE_ID}${path}`,
            method: method,
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
        }

        console.log(`Making ${method} request to ${options.path}`);

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(responseData);
                    console.log(`Response status: ${res.statusCode}`);
                    console.log(`Response success: ${response.success}`);
                    if (!response.success) {
                        console.log('Errors:', response.errors);
                    }
                    resolve(response);
                } catch (error) {
                    console.error('JSON parse error:', error.message);
                    console.log('Raw response:', responseData.substring(0, 500));
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Request error:', error.message);
            reject(error);
        });

        req.setTimeout(30000, () => {
            console.log('Request timeout (30s)');
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testCloudFlareOperations() {
    try {
        console.log('=== CloudFlare DNS Test Script ===');
        console.log(`Domain: ${DOMAIN}`);
        console.log(`Target: ${TARGET_HOST}:${TARGET_PORT}`);
        console.log('');

        // 1. List existing DNS records
        console.log('1. Listing existing DNS records...');
        const listResponse = await makeRequest('GET', '/dns_records');
        
        if (listResponse.success) {
            console.log(`Found ${listResponse.result.length} existing records`);
            listResponse.result.slice(0, 5).forEach(record => {
                console.log(`  - ${record.name} (${record.type}): ${record.content}`);
            });
        }

        // 2. Create/Update CNAME record
        console.log('\\n2. Creating/Updating CNAME record...');
        const cnameData = {
            type: 'CNAME',
            name: DOMAIN,
            content: TARGET_HOST,
            ttl: 60
        };

        // Check if CNAME already exists
        const existingCname = listResponse.result.find(record => 
            record.name === DOMAIN && record.type === 'CNAME'
        );

        let cnameResponse;
        if (existingCname) {
            console.log(`Updating existing CNAME record (ID: ${existingCname.id})`);
            cnameResponse = await makeRequest('PUT', `/dns_records/${existingCname.id}`, cnameData);
        } else {
            console.log('Creating new CNAME record');
            cnameResponse = await makeRequest('POST', '/dns_records', cnameData);
        }

        console.log(`CNAME operation: ${cnameResponse.success ? 'SUCCESS' : 'FAILED'}`);

        // 3. Create/Update SRV record
        console.log('\\n3. Creating/Updating SRV record...');
        const srvName = `_minecraft._tcp.${DOMAIN}`;
        const srvData = {
            type: 'SRV',
            name: srvName,
            data: {
                service: '_minecraft',
                proto: '_tcp',
                name: DOMAIN,
                priority: 0,
                weight: 5,
                port: TARGET_PORT,
                target: TARGET_HOST
            },
            ttl: 60
        };

        // Check if SRV already exists
        const existingSrv = listResponse.result.find(record => 
            record.name === srvName && record.type === 'SRV'
        );

        let srvResponse;
        if (existingSrv) {
            console.log(`Updating existing SRV record (ID: ${existingSrv.id})`);
            srvResponse = await makeRequest('PUT', `/dns_records/${existingSrv.id}`, srvData);
        } else {
            console.log('Creating new SRV record');
            srvResponse = await makeRequest('POST', '/dns_records', srvData);
        }

        console.log(`SRV operation: ${srvResponse.success ? 'SUCCESS' : 'FAILED'}`);

        // 4. Final verification
        console.log('\\n4. Final verification...');
        const finalListResponse = await makeRequest('GET', '/dns_records');
        const cnameRecord = finalListResponse.result.find(record => 
            record.name === DOMAIN && record.type === 'CNAME'
        );
        const srvRecord = finalListResponse.result.find(record => 
            record.name === srvName && record.type === 'SRV'
        );

        console.log(`CNAME record: ${cnameRecord ? '✅ EXISTS' : '❌ MISSING'}`);
        if (cnameRecord) {
            console.log(`  ${cnameRecord.name} -> ${cnameRecord.content}`);
        }

        console.log(`SRV record: ${srvRecord ? '✅ EXISTS' : '❌ MISSING'}`);
        if (srvRecord) {
            console.log(`  ${srvRecord.name} -> ${srvRecord.content || JSON.stringify(srvRecord.data)}`);
        }

        console.log('\\n=== DNS Test Complete ===');
        console.log(`play.cspd.net should now point to ${TARGET_HOST}:${TARGET_PORT}`);

    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}

testCloudFlareOperations();
