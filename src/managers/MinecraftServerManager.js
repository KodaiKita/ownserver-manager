/**
 * Minecraft Server Manager
 * Minecraftサーバーの管理（起動・停止・コマンド送信・ログ監視）
 * 
 * Current Implementation: Phase 1
 * - Java自動ダウンロード・管理
 * - Minecraftサーバープロセス起動・停止
 * - 基本ログ統合（Logger連携）
 * - シンプルなエラーハンドリング
 * - プロセス状態監視
 */

// Phase1の実装を使用
const MinecraftServerManager_Phase1 = require('../utils/development-phases/MinecraftServerManager_Phase1');

// Phase1をexport（将来的にPhase2, 3, 4に段階的にアップグレード）
class MinecraftServerManager extends MinecraftServerManager_Phase1 {
    constructor(serverDirectory, config) {
        super(serverDirectory, config);
        
        // Phase1完了マーカー
        this.implementationPhase = 'Phase1';
        this.features = [
            'Java自動ダウンロード・インストール',
            'Minecraftサーバープロセス起動・停止', 
            '基本ログ統合（Logger連携）',
            'シンプルなエラーハンドリング',
            'プロセス状態監視'
        ];
        
        this.logger.info('MinecraftServerManager Phase1 ready', {
            phase: this.implementationPhase,
            features: this.features
        });
    }
}

module.exports = MinecraftServerManager;
