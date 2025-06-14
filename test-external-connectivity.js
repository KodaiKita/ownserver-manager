#!/usr/bin/env node

/**
 * 外部接続テスト - mcsrvstat.us APIを使用
 */

const https = require('https');
const dns = require('dns').promises;

class ExternalConnectivityTester {
    constructor(domain = process.env.CLOUDFLARE_TEST_DOMAIN || 'yourdomain.com') {
        this.domain = domain;
        this.minecraftPort = process.env.TARGET_PORT || 25565;
    }

    /**
     * DNS解決テスト
     */
    async testDnsResolution() {
        console.log('\n=== DNS Resolution Test ===');
        try {
            // CNAMEレコード確認
            console.log(`Testing CNAME resolution for ${this.domain}...`);
            const cnameRecords = await dns.resolveCname(this.domain).catch(() => null);
            if (cnameRecords) {
                console.log(`✓ CNAME: ${this.domain} -> ${cnameRecords[0]}`);
            } else {
                console.log(`✗ No CNAME record found for ${this.domain}`);
            }

            // Aレコード確認
            console.log(`Testing A record resolution for ${this.domain}...`);
            const aRecords = await dns.resolve4(this.domain).catch(() => null);
            if (aRecords && aRecords.length > 0) {
                console.log(`✓ A Record: ${this.domain} -> ${aRecords.join(', ')}`);
            } else {
                console.log(`✗ No A record found for ${this.domain}`);
            }

            // SRVレコード確認
            console.log(`Testing SRV record for _minecraft._tcp.${this.domain}...`);
            const srvRecords = await dns.resolveSrv(`_minecraft._tcp.${this.domain}`).catch(() => null);
            if (srvRecords && srvRecords.length > 0) {
                console.log(`✓ SRV Record found:`);
                srvRecords.forEach(srv => {
                    console.log(`  - Priority: ${srv.priority}, Weight: ${srv.weight}, Port: ${srv.port}, Target: ${srv.name}`);
                });
            } else {
                console.log(`✗ No SRV record found for _minecraft._tcp.${this.domain}`);
            }

            return {
                cname: !!cnameRecords,
                aRecord: !!(aRecords && aRecords.length > 0),
                srv: !!(srvRecords && srvRecords.length > 0),
                cnameTarget: cnameRecords ? cnameRecords[0] : null,
                aRecords: aRecords || [],
                srvRecords: srvRecords || []
            };

        } catch (error) {
            console.error('DNS resolution test failed:', error.message);
            return {
                cname: false,
                aRecord: false,
                srv: false,
                error: error.message
            };
        }
    }

    /**
     * mcsrvstat.us APIを使ってMinecraftサーバーの状態確認
     */
    async testMinecraftConnectivity() {
        console.log('\n=== Minecraft Connectivity Test (mcsrvstat.us) ===');
        
        return new Promise((resolve) => {
            const apiUrl = `api.mcsrvstat.us`;
            const path = `/3/${this.domain}`;
            
            console.log(`Testing Minecraft server connectivity via: https://${apiUrl}${path}`);

            const options = {
                hostname: apiUrl,
                port: 443,
                path: path,
                method: 'GET',
                timeout: 10000,
                headers: {
                    'User-Agent': 'OwnServer-Manager/1.0'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        console.log(`Status Code: ${res.statusCode}`);
                        
                        if (res.statusCode === 200) {
                            console.log('mcsrvstat.us API Response:');
                            console.log(`  - Online: ${response.online}`);
                            console.log(`  - Host: ${response.hostname || 'N/A'}`);
                            console.log(`  - Port: ${response.port || 'N/A'}`);
                            console.log(`  - IP: ${response.ip || 'N/A'}`);
                            
                            if (response.online) {
                                console.log(`  - Version: ${response.version || 'N/A'}`);
                                console.log(`  - Players: ${response.players?.online || 0}/${response.players?.max || 0}`);
                                console.log(`  - MOTD: ${response.motd?.clean || 'N/A'}`);
                            }

                            resolve({
                                success: true,
                                online: response.online,
                                hostname: response.hostname,
                                port: response.port,
                                ip: response.ip,
                                version: response.version,
                                players: response.players,
                                motd: response.motd,
                                debug: response.debug
                            });
                        } else {
                            console.log(`✗ API request failed with status ${res.statusCode}`);
                            resolve({
                                success: false,
                                error: `HTTP ${res.statusCode}`,
                                response: response
                            });
                        }
                    } catch (parseError) {
                        console.error('✗ Failed to parse API response:', parseError.message);
                        console.log('Raw response:', data);
                        resolve({
                            success: false,
                            error: `Parse error: ${parseError.message}`,
                            rawResponse: data
                        });
                    }
                });
            });

            req.on('error', (error) => {
                console.error('✗ API request failed:', error.message);
                resolve({
                    success: false,
                    error: error.message
                });
            });

            req.on('timeout', () => {
                console.error('✗ API request timed out');
                req.destroy();
                resolve({
                    success: false,
                    error: 'Request timeout'
                });
            });

            req.end();
        });
    }

    /**
     * 完全な外部接続テストを実行
     */
    async runCompleteTest() {
        console.log(`\n🔍 External Connectivity Test for ${this.domain}`);
        console.log('=' .repeat(50));

        const results = {
            timestamp: new Date().toISOString(),
            domain: this.domain,
            dns: await this.testDnsResolution(),
            minecraft: await this.testMinecraftConnectivity()
        };

        console.log('\n=== Test Summary ===');
        console.log(`DNS CNAME: ${results.dns.cname ? '✓' : '✗'}`);
        console.log(`DNS A Record: ${results.dns.aRecord ? '✓' : '✗'}`);
        console.log(`DNS SRV Record: ${results.dns.srv ? '✓' : '✗'}`);
        console.log(`Minecraft Online: ${results.minecraft.online ? '✓' : '✗'}`);
        
        if (results.dns.cname && results.dns.srv && results.minecraft.online) {
            console.log('\n🎉 All tests passed! External connectivity is working.');
        } else if (results.dns.cname || results.dns.aRecord) {
            console.log('\n⚠️  DNS is configured but Minecraft server may not be accessible.');
        } else {
            console.log('\n❌ DNS is not properly configured or server is not accessible.');
        }

        return results;
    }
}

// メイン実行
if (require.main === module) {
    const domain = process.argv[2] || 'play.cspd.net';
    const tester = new ExternalConnectivityTester(domain);
    
    tester.runCompleteTest()
        .then(results => {
            console.log('\n📊 Full test results:');
            console.log(JSON.stringify(results, null, 2));
            
            // 終了コード設定
            const success = results.dns.cname && results.minecraft.success;
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = ExternalConnectivityTester;
