/**
 * JavaVersionManager テスト
 * Java バージョン管理とダウンロード機能のテスト
 */

const assert = require('assert');
const JavaVersionManager = require('../../src/utils/JavaVersionManager');

describe('JavaVersionManager', function() {
    
    describe('getJavaRequirements', function() {
        it('should return correct requirements for legacy versions', function() {
            const req1_8 = JavaVersionManager.getJavaRequirements('1.8.9', 'vanilla');
            assert.strictEqual(req1_8.java, '8');
            assert.strictEqual(req1_8.min, 8);
            assert.strictEqual(req1_8.max, 21);
            
            const req1_12 = JavaVersionManager.getJavaRequirements('1.12.2', 'vanilla');
            assert.strictEqual(req1_12.java, '8');
            assert.strictEqual(req1_12.recommended, '8');
        });
        
        it('should return correct requirements for modern versions', function() {
            const req1_17 = JavaVersionManager.getJavaRequirements('1.17.1', 'vanilla');
            assert.strictEqual(req1_17.java, '16');
            assert.strictEqual(req1_17.min, 16);
            assert.strictEqual(req1_17.recommended, '17');
            
            const req1_18 = JavaVersionManager.getJavaRequirements('1.18.2', 'vanilla');
            assert.strictEqual(req1_18.java, '17');
            assert.strictEqual(req1_18.min, 17);
            assert.strictEqual(req1_18.max, 21);
        });
        
        it('should return correct requirements for latest versions', function() {
            const req1_20_5 = JavaVersionManager.getJavaRequirements('1.20.5', 'vanilla');
            assert.strictEqual(req1_20_5.java, '21');
            assert.strictEqual(req1_20_5.min, 21);
            assert.strictEqual(req1_20_5.max, 21);
            
            const req1_21 = JavaVersionManager.getJavaRequirements('1.21.0', 'vanilla');
            assert.strictEqual(req1_21.java, '21');
        });
        
        it('should handle edge cases', function() {
            // 存在しないバージョン（非常に古い）
            const reqOld = JavaVersionManager.getJavaRequirements('0.1.0', 'vanilla');
            assert.strictEqual(reqOld.java, '8');
            
            // 存在しないバージョン（非常に新しい）
            const reqNew = JavaVersionManager.getJavaRequirements('2.0.0', 'vanilla');
            assert.strictEqual(reqNew.java, '21');
        });
        
        it('should handle different server types', function() {
            const vanillaReq = JavaVersionManager.getJavaRequirements('1.18.2', 'vanilla');
            const spigotReq = JavaVersionManager.getJavaRequirements('1.18.2', 'spigot');
            const paperReq = JavaVersionManager.getJavaRequirements('1.18.2', 'paper');
            const forgeReq = JavaVersionManager.getJavaRequirements('1.18.2', 'forge');
            
            // すべて有効な要件オブジェクトを返すことを確認
            [vanillaReq, spigotReq, paperReq, forgeReq].forEach(req => {
                assert(typeof req === 'object');
                assert(typeof req.java === 'string');
                assert(typeof req.min === 'number');
                assert(typeof req.max === 'number');
            });
        });
    });
    
    describe('getJavaDownloadInfo', function() {
        it('should return download info for supported versions', function() {
            const java8Info = JavaVersionManager.getJavaDownloadInfo('8');
            assert(java8Info);
            assert(typeof java8Info.linux_x64 === 'string');
            assert(java8Info.linux_x64.includes('https://'));
            assert(typeof java8Info.checksum === 'string');
            
            const java17Info = JavaVersionManager.getJavaDownloadInfo('17');
            assert(java17Info);
            assert(typeof java17Info.linux_x64 === 'string');
            
            const java21Info = JavaVersionManager.getJavaDownloadInfo('21');
            assert(java21Info);
            assert(typeof java21Info.linux_x64 === 'string');
        });
        
        it('should return null for unsupported versions', function() {
            const unsupportedInfo = JavaVersionManager.getJavaDownloadInfo('99');
            assert.strictEqual(unsupportedInfo, null);
            
            const invalidInfo = JavaVersionManager.getJavaDownloadInfo('invalid');
            assert.strictEqual(invalidInfo, null);
        });
        
        it('should handle different platforms', function() {
            const java17Info = JavaVersionManager.getJavaDownloadInfo('17', 'linux_x64');
            assert(java17Info);
            
            // 未サポートプラットフォーム
            const unsupportedPlatform = JavaVersionManager.getJavaDownloadInfo('17', 'windows');
            assert.strictEqual(unsupportedPlatform, null);
        });
    });
    
    describe('JAVA_VERSION_MAP', function() {
        it('should have required structure', function() {
            const map = JavaVersionManager.JAVA_VERSION_MAP;
            
            assert(typeof map === 'object');
            assert(typeof map.minecraft === 'object');
            assert(typeof map.server_software === 'object');
            assert(typeof map.download_urls === 'object');
        });
        
        it('should have valid minecraft version mappings', function() {
            const minecraft = JavaVersionManager.JAVA_VERSION_MAP.minecraft;
            
            Object.values(minecraft).forEach(requirement => {
                assert(typeof requirement.java === 'string');
                assert(typeof requirement.min === 'number');
                assert(typeof requirement.max === 'number');
                assert(requirement.min <= requirement.max);
                
                if (requirement.recommended) {
                    assert(typeof requirement.recommended === 'string');
                }
            });
        });
        
        it('should have valid server software mappings', function() {
            const serverSoftware = JavaVersionManager.JAVA_VERSION_MAP.server_software;
            
            // 必須のサーバータイプが存在することを確認
            const requiredTypes = ['vanilla', 'spigot', 'paper', 'forge'];
            requiredTypes.forEach(type => {
                assert(serverSoftware[type]);
            });
            
            // vanilla は minecraft を継承
            assert.strictEqual(serverSoftware.vanilla.inherits, 'minecraft');
        });
        
        it('should have valid download URLs', function() {
            const downloads = JavaVersionManager.JAVA_VERSION_MAP.download_urls;
            
            // 必須のJavaバージョンが存在することを確認
            const requiredVersions = ['8', '11', '17', '21'];
            requiredVersions.forEach(version => {
                assert(downloads[version]);
                assert(downloads[version].linux_x64);
                assert(downloads[version].linux_x64.startsWith('https://'));
                assert(downloads[version].checksum);
                assert(downloads[version].checksum.startsWith('sha256:'));
            });
        });
    });
    
    describe('Version parsing and comparison', function() {
        it('should correctly parse Minecraft versions', function() {
            // このテストは内部実装詳細なので、
            // パブリックAPIの動作を通じて間接的にテスト
            
            const tests = [
                ['1.8.9', '1.12.2'], // 1.8.9 < 1.12.2
                ['1.16.5', '1.17.0'], // 1.16.5 < 1.17.0
                ['1.17.1', '1.18.0'], // 1.17.1 < 1.18.0
                ['1.20.4', '1.20.5'] // 1.20.4 < 1.20.5
            ];
            
            tests.forEach(([lower, higher]) => {
                const lowerReq = JavaVersionManager.getJavaRequirements(lower);
                const higherReq = JavaVersionManager.getJavaRequirements(higher);
                
                // より新しいバージョンは同じかより新しいJavaを要求するはず
                const lowerJava = parseInt(lowerReq.java);
                const higherJava = parseInt(higherReq.java);
                assert(lowerJava <= higherJava, 
                    `${lower} (Java ${lowerJava}) should require same or older Java than ${higher} (Java ${higherJava})`);
            });
        });
        
        it('should handle version ranges correctly', function() {
            // 同じ範囲内のバージョンは同じ要件を返すべき
            const v1_18_0 = JavaVersionManager.getJavaRequirements('1.18.0');
            const v1_18_2 = JavaVersionManager.getJavaRequirements('1.18.2');
            const v1_20_4 = JavaVersionManager.getJavaRequirements('1.20.4');
            
            assert.deepStrictEqual(v1_18_0, v1_18_2);
            assert.deepStrictEqual(v1_18_2, v1_20_4);
        });
    });
    
    describe('Integration scenarios', function() {
        it('should provide consistent data for common use cases', function() {
            // よくある使用パターンのテスト
            const commonVersions = [
                '1.12.2', // 人気のModded版
                '1.16.5', // 安定版
                '1.18.2', // 新機能版
                '1.20.1', // 最新安定版
                '1.21.0'  // 最新版
            ];
            
            commonVersions.forEach(version => {
                const req = JavaVersionManager.getJavaRequirements(version);
                const downloadInfo = JavaVersionManager.getJavaDownloadInfo(req.java);
                
                assert(req, `Requirements should exist for ${version}`);
                assert(downloadInfo, `Download info should exist for Java ${req.java}`);
                
                // 必要な範囲チェック
                const javaVersion = parseInt(req.java);
                assert(javaVersion >= req.min && javaVersion <= req.max,
                    `Java ${req.java} should be within range ${req.min}-${req.max} for ${version}`);
            });
        });
    });
});
