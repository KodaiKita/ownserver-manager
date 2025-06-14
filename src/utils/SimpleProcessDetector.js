/**
 * Simple Process Detector for Minecraft Server
 * 既存のMinecraftサーバープロセスを検出する簡単な実装
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SimpleProcessDetector {
    constructor() {
        this.logger = console;
    }

    /**
     * Minecraftサーバープロセスを検出
     * @returns {Promise<Array>} プロセス情報の配列
     */
    async findMinecraftProcesses() {
        try {
            const { stdout } = await execAsync('ps aux | grep "java.*server.jar" | grep -v grep');
            
            if (!stdout.trim()) {
                return [];
            }

            const lines = stdout.trim().split('\n');
            const processes = [];

            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 11) {
                    const pid = parseInt(parts[1]);
                    const cmdline = parts.slice(10).join(' ');
                    
                    // server.jarを含むJavaプロセスかチェック
                    if (cmdline.includes('server.jar')) {
                        processes.push({
                            pid: pid,
                            user: parts[0],
                            cpu: parts[2],
                            mem: parts[3],
                            command: cmdline,
                            isMinecraft: true
                        });
                    }
                }
            }

            return processes;
        } catch (error) {
            this.logger.debug('Process detection failed:', error.message);
            return [];
        }
    }

    /**
     * 指定ポートでリスニングしているプロセスを検出
     * @param {number} port - チェックするポート番号
     * @returns {Promise<boolean>} ポートが使用中かどうか
     */
    async isPortInUse(port) {
        try {
            const { stdout } = await execAsync(`netstat -ln | grep :${port}`);
            return stdout.includes(`${port}`);
        } catch (error) {
            return false;
        }
    }

    /**
     * プロセスが実行中かチェック
     * @param {number} pid - プロセスID
     * @returns {Promise<boolean>} プロセスが実行中かどうか
     */
    async isProcessRunning(pid) {
        try {
            const { stdout } = await execAsync(`ps -p ${pid} -o pid=`);
            return stdout.trim() === pid.toString();
        } catch (error) {
            return false;
        }
    }
}

module.exports = SimpleProcessDetector;
