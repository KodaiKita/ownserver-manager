/**
 * Validator Utility
 * 設定値やパラメータのバリデーション
 */

const fs = require('fs');
const path = require('path');

class Validator {
    /**
     * 設定オブジェクト全体のバリデーション
     */
    static validateConfig(config) {
        const errors = [];

        // Minecraft設定のバリデーション
        const minecraftErrors = this.validateMinecraftConfig(config.minecraft);
        errors.push(...minecraftErrors);

        // OwnServer設定のバリデーション
        const ownserverErrors = this.validateOwnServerConfig(config.ownserver);
        errors.push(...ownserverErrors);

        // CloudFlare設定のバリデーション
        const cloudflareErrors = this.validateCloudFlareConfig(config.cloudflare);
        errors.push(...cloudflareErrors);

        // ヘルスチェック設定のバリデーション
        const healthErrors = this.validateHealthCheckConfig(config.healthcheck);
        errors.push(...healthErrors);

        return errors;
    }

    /**
     * Minecraft設定のバリデーション
     */
    static validateMinecraftConfig(config) {
        const errors = [];

        // serverDirectory: 必須、存在確認
        if (!config.serverDirectory) {
            errors.push('minecraft.serverDirectory is required');
        } else if (!fs.existsSync(config.serverDirectory)) {
            errors.push(`minecraft.serverDirectory does not exist: ${config.serverDirectory}`);
        }

        // port: 必須、範囲チェック
        if (!config.port) {
            errors.push('minecraft.port is required');
        } else if (!this.isValidPort(config.port)) {
            errors.push('minecraft.port must be between 1 and 65535');
        }

        // javaArgs: 配列チェック
        if (config.javaArgs && !Array.isArray(config.javaArgs)) {
            errors.push('minecraft.javaArgs must be an array');
        }

        // autoRestart: ブール値チェック
        if (config.autoRestart !== undefined && typeof config.autoRestart !== 'boolean') {
            errors.push('minecraft.autoRestart must be a boolean');
        }

        return errors;
    }

    /**
     * OwnServer設定のバリデーション
     */
    static validateOwnServerConfig(config) {
        const errors = [];

        // binaryPath: 必須、実行可能ファイル確認
        if (!config.binaryPath) {
            errors.push('ownserver.binaryPath is required');
        } else if (!fs.existsSync(config.binaryPath)) {
            errors.push(`ownserver.binaryPath does not exist: ${config.binaryPath}`);
        }

        return errors;
    }

    /**
     * CloudFlare設定のバリデーション
     */
    static validateCloudFlareConfig(config) {
        const errors = [];

        // domain: 必須、ドメイン形式チェック
        if (!config.domain) {
            errors.push('cloudflare.domain is required');
        } else if (!this.isValidDomain(config.domain)) {
            errors.push('cloudflare.domain is not a valid domain format');
        }

        // ttl: 範囲チェック
        if (config.ttl !== undefined && (config.ttl < 1 || config.ttl > 86400)) {
            errors.push('cloudflare.ttl must be between 1 and 86400 seconds');
        }

        return errors;
    }

    /**
     * ヘルスチェック設定のバリデーション
     */
    static validateHealthCheckConfig(config) {
        const errors = [];

        // interval: 正の数値チェック
        if (config.interval !== undefined && (typeof config.interval !== 'number' || config.interval <= 0)) {
            errors.push('healthcheck.interval must be a positive number');
        }

        // timeout: 正の数値チェック
        if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
            errors.push('healthcheck.timeout must be a positive number');
        }

        // retries: 正の整数チェック
        if (config.retries !== undefined && (!Number.isInteger(config.retries) || config.retries < 0)) {
            errors.push('healthcheck.retries must be a non-negative integer');
        }

        return errors;
    }

    /**
     * ポート番号の妥当性チェック
     */
    static isValidPort(port) {
        return Number.isInteger(port) && port >= 1 && port <= 65535;
    }

    /**
     * ドメイン名の妥当性チェック
     */
    static isValidDomain(domain) {
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return domainRegex.test(domain);
    }

    /**
     * CloudFlare APIトークンの形式チェック
     */
    static isValidCloudFlareToken(token) {
        // CloudFlare APIトークンは40文字の英数字
        const tokenRegex = /^[a-zA-Z0-9_-]{40}$/;
        return tokenRegex.test(token);
    }

    /**
     * Zone IDの形式チェック
     */
    static isValidZoneId(zoneId) {
        // Zone IDは32文字の英数字
        const zoneIdRegex = /^[a-f0-9]{32}$/;
        return zoneIdRegex.test(zoneId);
    }

    /**
     * エンドポイントの形式チェック
     */
    static isValidEndpoint(endpoint) {
        // host:port 形式
        const endpointRegex = /^[a-zA-Z0-9.-]+:\d+$/;
        return endpointRegex.test(endpoint);
    }

    /**
     * 環境変数の必須チェック
     */
    static validateEnvironment() {
        const errors = [];
        const required = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ZONE_ID'];

        for (const env of required) {
            if (!process.env[env]) {
                errors.push(`Environment variable ${env} is required`);
            }
        }

        // APIトークンの形式チェック
        if (process.env.CLOUDFLARE_API_TOKEN && !this.isValidCloudFlareToken(process.env.CLOUDFLARE_API_TOKEN)) {
            errors.push('CLOUDFLARE_API_TOKEN format is invalid');
        }

        // Zone IDの形式チェック
        if (process.env.CLOUDFLARE_ZONE_ID && !this.isValidZoneId(process.env.CLOUDFLARE_ZONE_ID)) {
            errors.push('CLOUDFLARE_ZONE_ID format is invalid');
        }

        return errors;
    }
}

module.exports = Validator;
