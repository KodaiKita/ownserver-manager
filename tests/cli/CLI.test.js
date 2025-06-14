/**
 * CLI Integration Tests
 * CLI機能の統合テスト
 */

const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

describe('CLI Integration Tests', function() {
    this.timeout(30000);

    const CLI_PATH = path.join(__dirname, '../../bin/ownserver-manager');
    const TEST_BACKUP_DIR = path.join(__dirname, '../../backups');

    before(async function() {
        // テスト用バックアップディレクトリ作成
        try {
            await fs.mkdir(TEST_BACKUP_DIR, { recursive: true });
        } catch (error) {
            // ディレクトリが既に存在する場合は無視
        }
    });

    after(async function() {
        // テスト後のクリーンアップ
        try {
            const files = await fs.readdir(TEST_BACKUP_DIR);
            for (const file of files) {
                if (file.startsWith('test_')) {
                    await fs.unlink(path.join(TEST_BACKUP_DIR, file));
                }
            }
        } catch (error) {
            // エラーは無視
        }
    });

    /**
     * コマンド実行ヘルパー
     */
    function runCLI(args, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const child = spawn('node', [CLI_PATH, ...args], {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: timeout
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                resolve({
                    code,
                    stdout,
                    stderr
                });
            });

            child.on('error', (error) => {
                reject(error);
            });

            // タイムアウト処理
            setTimeout(() => {
                child.kill('SIGKILL');
                reject(new Error(`Command timeout after ${timeout}ms`));
            }, timeout);
        });
    }

    describe('基本コマンドテスト', function() {
        
        it('should show help', async function() {
            const result = await runCLI(['--help']);
            
            assert.strictEqual(result.code, 0, 'Help command should exit with code 0');
            assert(result.stdout.includes('Minecraft Server with OwnServer'), 'Help should contain description');
            assert(result.stdout.includes('Commands:'), 'Help should list commands');
        });

        it('should show version', async function() {
            const result = await runCLI(['--version']);
            
            assert.strictEqual(result.code, 0, 'Version command should exit with code 0');
            assert(result.stdout.includes('1.0.0'), 'Should show version number');
        });

        it('should show command-specific help', async function() {
            const result = await runCLI(['players', '--help']);
            
            assert.strictEqual(result.code, 0, 'Command help should exit with code 0');
            assert(result.stdout.includes('Player management'), 'Should show command description');
            assert(result.stdout.includes('--list'), 'Should show command options');
        });

    });

    describe('プレイヤー管理コマンドテスト', function() {
        
        it('should handle players list when server not running', async function() {
            const result = await runCLI(['players', '--list']);
            
            // サーバーが停止中でもエラーハンドリングされるべき
            assert(result.code === 0 || result.code === 1, 'Should handle server not running gracefully');
            if (result.code === 1) {
                assert(result.stderr.includes('Error') || result.stdout.includes('failed'), 'Should show appropriate error message');
            }
        });

        it('should validate player commands', async function() {
            const result = await runCLI(['players', '--invalidoption']);
            
            assert.strictEqual(result.code, 1, 'Invalid option should exit with error code');
        });

    });

    describe('バックアップ管理コマンドテスト', function() {
        
        it('should show empty backup list initially', async function() {
            const result = await runCLI(['backup', '--list']);
            
            assert.strictEqual(result.code, 0, 'Backup list should succeed');
            assert(result.stdout.includes('backups') || result.stdout.includes('No backups'), 'Should show backup status');
        });

        it('should handle backup creation gracefully', async function() {
            const result = await runCLI(['backup', '--create', 'test_backup']);
            
            // バックアップ作成は Minecraft サーバーが必要なのでエラーになる可能性がある
            // エラーハンドリングが適切であることを確認
            if (result.code !== 0) {
                assert(result.stderr.includes('Error') || result.stdout.includes('failed'), 'Should show appropriate error message');
            }
        });

        it('should validate backup commands', async function() {
            const result = await runCLI(['backup', '--invalidoption']);
            
            assert.strictEqual(result.code, 1, 'Invalid option should exit with error code');
        });

    });

    describe('監視コマンドテスト', function() {
        
        it('should show system stats', async function() {
            const result = await runCLI(['monitor', '--stats']);
            
            assert.strictEqual(result.code, 0, 'Monitor stats should succeed');
            assert(result.stdout.includes('Performance') || result.stdout.includes('CPU'), 'Should show performance data');
        });

        it('should show alerts', async function() {
            const result = await runCLI(['monitor', '--alerts']);
            
            assert.strictEqual(result.code, 0, 'Monitor alerts should succeed');
            assert(result.stdout.includes('alerts') || result.stdout.includes('Performance'), 'Should show alert information');
        });

        it('should export stats', async function() {
            const result = await runCLI(['monitor', '--export', 'json']);
            
            assert.strictEqual(result.code, 0, 'Monitor export should succeed');
            assert(result.stdout.includes('exported') || result.stdout.includes('Stats'), 'Should confirm export');
        });

    });

    describe('メンテナンスコマンドテスト', function() {
        
        it('should run cleanup', async function() {
            const result = await runCLI(['maintenance', '--cleanup']);
            
            assert.strictEqual(result.code, 0, 'Maintenance cleanup should succeed');
            assert(result.stdout.includes('cleanup') || result.stdout.includes('Cleanup'), 'Should show cleanup results');
        });

        it('should run optimization', async function() {
            const result = await runCLI(['maintenance', '--optimize']);
            
            assert.strictEqual(result.code, 0, 'Maintenance optimize should succeed');
            assert(result.stdout.includes('optimi') || result.stdout.includes('Optimi'), 'Should show optimization results');
        });

        it('should generate report', async function() {
            const result = await runCLI(['maintenance', '--report']);
            
            assert.strictEqual(result.code, 0, 'Maintenance report should succeed');
            assert(result.stdout.includes('report') || result.stdout.includes('Report'), 'Should confirm report generation');
        });

    });

    describe('設定管理コマンドテスト', function() {
        
        it('should show configuration', async function() {
            const result = await runCLI(['config', '--show']);
            
            // 設定ファイルが存在しない場合もエラーハンドリングされるべき
            if (result.code === 0) {
                assert(result.stdout.includes('Configuration') || result.stdout.includes('{'), 'Should show configuration');
            } else {
                assert(result.stderr.includes('Error') || result.stdout.includes('failed'), 'Should handle missing config gracefully');
            }
        });

    });

    describe('ヘルスチェックコマンドテスト', function() {
        
        it('should run health check', async function() {
            const result = await runCLI(['health']);
            
            // ヘルスチェックは失敗する可能性があるが、適切なエラーハンドリングを確認
            if (result.code === 0) {
                assert(result.stdout.includes('Health') || result.stdout.includes('health'), 'Should show health results');
            } else {
                assert(result.stderr.includes('Error') || result.stdout.includes('failed'), 'Should handle health check errors gracefully');
            }
        });

    });

    describe('ログコマンドテスト', function() {
        
        it('should handle log display', async function() {
            const result = await runCLI(['logs'], 5000); // 短いタイムアウト
            
            // ログファイルが存在しない場合もエラーハンドリングされるべき
            assert(result.code === 0 || result.code === 1, 'Should handle log display');
            if (result.code === 1) {
                assert(result.stderr.includes('Error') || result.stdout.includes('not found'), 'Should show appropriate error message');
            }
        });

    });

    describe('エラーハンドリングテスト', function() {
        
        it('should handle invalid commands', async function() {
            const result = await runCLI(['invalidcommand']);
            
            assert.strictEqual(result.code, 1, 'Invalid command should exit with error code');
            assert(result.stderr.includes('unknown command') || result.stdout.includes('help'), 'Should show error or help');
        });

        it('should handle missing required arguments', async function() {
            const result = await runCLI(['mc']);
            
            assert.strictEqual(result.code, 1, 'Missing required argument should exit with error code');
        });

    });

});
