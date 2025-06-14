/**
 * Enhanced Process Detection for MinecraftServerManager
 * Minecraftプロセスの強化検出機能
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const execAsync = promisify(exec);

class ProcessDetector {
    constructor(logger) {
        this.logger = logger;
    }

    /**
     * PIDによる実際のプロセス存在確認
     */
    async isProcessRunning(pid) {
        if (!pid) {
            return false;
        }

        try {
            // BusyBox ps に対応したプロセス確認
            const { stdout } = await execAsync(`ps | grep "^[ ]*${pid} " || echo ""`);
            const lines = stdout.trim().split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length > 0 && parseInt(parts[0]) === pid) {
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Javaプロセスの検索（Minecraftサーバー）
     */
    async findMinecraftJavaProcesses() {
        try {
            // Javaプロセスの中でMinecraftサーバーらしきものを検索
            const { stdout } = await execAsync(`ps aux | grep java | grep -v grep || echo ""`);
            
            if (!stdout.trim()) {
                return [];
            }

            const processes = [];
            const lines = stdout.trim().split('\n');
            
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 11) {
                    const pid = parseInt(parts[1]);
                    const command = parts.slice(10).join(' ');
                    
                    if (!isNaN(pid) && command.includes('java')) {
                        processes.push({
                            pid,
                            command,
                            user: parts[0],
                            cpu: parts[2],
                            memory: parts[3]
                        });
                    }
                }
            }
            
            return processes;
        } catch (error) {
            this.logger.debug('Java プロセス検索エラー:', error.message);
            return [];
        }
    }

    /**
     * 特定ディレクトリからのJavaプロセス検索
     */
    async findJavaProcessByDirectory(serverDirectory) {
        try {
            // ディレクトリパスでのマッチング（より緩い条件）
            const { stdout } = await execAsync(`ps aux | grep java | grep "${path.basename(serverDirectory)}" | grep -v grep || echo ""`);
            
            if (!stdout.trim()) {
                return null;
            }

            const line = stdout.trim().split('\n')[0];
            const parts = line.trim().split(/\s+/);
            
            if (parts.length >= 11) {
                const pid = parseInt(parts[1]);
                if (!isNaN(pid)) {
                    return {
                        pid,
                        command: parts.slice(10).join(' '),
                        user: parts[0],
                        cpu: parts[2],
                        memory: parts[3]
                    };
                }
            }
        } catch (error) {
            this.logger.debug('ディレクトリベースJavaプロセス検索エラー:', error.message);
        }
        
        return null;
    }

    /**
     * ポートベースのプロセス検索
     */
    async findProcessByPort(port) {
        try {
            // netstatまたはssでポートを使用しているプロセスを検索
            let stdout;
            try {
                const result = await execAsync(`netstat -tlnp 2>/dev/null | grep ":${port}" || echo ""`);
                stdout = result.stdout;
            } catch {
                // netstatが失敗した場合はssを試行
                try {
                    const result = await execAsync(`ss -tlnp 2>/dev/null | grep ":${port}" || echo ""`);
                    stdout = result.stdout;
                } catch {
                    return null;
                }
            }
            
            if (!stdout.trim()) {
                return null;
            }

            const lines = stdout.trim().split('\n');
            for (const line of lines) {
                // PID/プロセス名を抽出（数字/プロセス名の形式）
                const pidMatch = line.match(/(\d+)\/\w*/);
                if (pidMatch) {
                    const pid = parseInt(pidMatch[1]);
                    if (!isNaN(pid) && pid > 0) {
                        return { pid, port, line };
                    }
                }
            }
        } catch (error) {
            this.logger.debug('ポートベースプロセス検索エラー:', error.message);
        }
        
        return null;
    }

    /**
     * 強化されたMinecraftプロセス検出
     */
    async detectMinecraftProcess(serverDirectory, port = 25565) {
        const results = {
            running: false,
            pid: null,
            detectionMethod: null,
            processes: [],
            details: null
        };

        try {
            // 方法1: ディレクトリベース検索
            const dirProcess = await this.findJavaProcessByDirectory(serverDirectory);
            if (dirProcess) {
                const isRunning = await this.isProcessRunning(dirProcess.pid);
                if (isRunning) {
                    results.running = true;
                    results.pid = dirProcess.pid;
                    results.detectionMethod = 'directory';
                    results.details = dirProcess;
                    return results;
                }
            }

            // 方法2: ポートベース検索
            const portProcess = await this.findProcessByPort(port);
            if (portProcess) {
                const isRunning = await this.isProcessRunning(portProcess.pid);
                if (isRunning) {
                    results.running = true;
                    results.pid = portProcess.pid;
                    results.detectionMethod = 'port';
                    results.details = portProcess;
                    return results;
                }
            }

            // 方法3: 全Javaプロセス検索
            const javaProcesses = await this.findMinecraftJavaProcesses();
            results.processes = javaProcesses;
            
            for (const process of javaProcesses) {
                const isRunning = await this.isProcessRunning(process.pid);
                if (isRunning && (
                    process.command.includes('server.jar') ||
                    process.command.includes(serverDirectory) ||
                    process.command.includes(`-p ${port}`) ||
                    process.command.includes(`:${port}`)
                )) {
                    results.running = true;
                    results.pid = process.pid;
                    results.detectionMethod = 'command_search';
                    results.details = process;
                    return results;
                }
            }

        } catch (error) {
            this.logger.error('Minecraftプロセス検出エラー:', error);
            results.error = error.message;
        }

        return results;
    }

    /**
     * プロセス情報の詳細取得
     */
    async getProcessDetails(pid) {
        try {
            const { stdout } = await execAsync(`ps -p ${pid} -o pid,ppid,user,cpu,pmem,etime,command --no-headers 2>/dev/null || echo ""`);
            
            if (!stdout.trim()) {
                return null;
            }

            const parts = stdout.trim().split(/\s+/);
            if (parts.length >= 7) {
                return {
                    pid: parseInt(parts[0]),
                    ppid: parseInt(parts[1]),
                    user: parts[2],
                    cpu: parts[3],
                    memory: parts[4],
                    runtime: parts[5],
                    command: stdout.substring(stdout.indexOf(parts[6]))
                };
            }
        } catch (error) {
            this.logger.debug('プロセス詳細取得エラー:', error.message);
        }
        
        return null;
    }

    /**
     * OwnServerプロセスの検索
     */
    async findOwnServerProcesses() {
        try {
            // OwnServerプロセスを検索
            const { stdout } = await execAsync(`ps aux | grep ownserver | grep -v grep || echo ""`);
            
            if (!stdout.trim()) {
                return [];
            }

            const processes = [];
            const lines = stdout.trim().split('\n');
            
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 8) {
                    const pid = parseInt(parts[1]);
                    const command = parts.slice(10).join(' ');
                    
                    // OwnServerバイナリかどうかを判定
                    if (command.includes('/app/bin/ownserver') || command.includes('ownserver --endpoint')) {
                        processes.push({
                            pid: pid,
                            command: command,
                            user: parts[0],
                            cpu: parts[2],
                            mem: parts[3],
                            vsz: parts[4],
                            rss: parts[5],
                            tty: parts[6],
                            stat: parts[7],
                            start: parts[8],
                            time: parts[9]
                        });
                    }
                }
            }

            return processes;
        } catch (error) {
            this.logger?.error('OwnServerプロセス検索エラー:', error.message);
            return [];
        }
    }

    /**
     * OwnServerプロセスが動作中かどうかを確認
     */
    async isOwnServerRunning() {
        try {
            const processes = await this.findOwnServerProcesses();
            return processes.length > 0;
        } catch (error) {
            this.logger?.error('OwnServerプロセス状態確認エラー:', error.message);
            return false;
        }
    }

    /**
     * アクティブなOwnServerプロセス情報を取得
     */
    async getOwnServerProcessInfo() {
        try {
            const processes = await this.findOwnServerProcesses();
            
            if (processes.length === 0) {
                return null;
            }

            // 最初に見つかったプロセスを返す（通常は1つのはず）
            const process = processes[0];
            
            // エンドポイント情報を抽出
            let endpoint = null;
            const endpointMatch = process.command.match(/--endpoint\s+([^\s]+)/);
            if (endpointMatch) {
                endpoint = endpointMatch[1];
            }

            return {
                pid: process.pid,
                endpoint: endpoint,
                command: process.command,
                status: 'running',
                cpu: process.cpu,
                memory: process.mem,
                uptime: process.time
            };
        } catch (error) {
            this.logger?.error('OwnServerプロセス情報取得エラー:', error.message);
            return null;
        }
    }
}

module.exports = ProcessDetector;
