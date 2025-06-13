/**
 * Minecraft Server Manager
 * Minecraftサーバーの管理（起動・停止・コマンド送信・ログ監視）
 * 
 * Current Implementation: Phase 3
 * - Java自動ダウンロード・管理
 * - Minecraftサーバープロセス起動・停止
 * - 基本ログ統合（Logger連携）
 * - シンプルなエラーハンドリング
 * - プロセス状態監視
 * - リアルタイムログ解析・パース
 * - コンソールコマンド送信機能
 * - サーバー状態自動検出
 * - プレイヤー参加/離脱監視
 * - 自動再起動機能（設定可能）
 * - 詳細エラー分類・ログ
 * - OwnServer自動管理・制御
 * - CloudFlare DNS自動更新
 * - 外部アクセス管理・監視
 * - 統合ヘルスチェック・自動復旧
 * - 外部公開状態の一元管理
 * - セキュリティ・アクセス制御
 */

// Phase3の実装を使用
const MinecraftServerManager_Phase3 = require('../utils/development-phases/MinecraftServerManager_Phase3');

// Phase3をexport（将来的にPhase4に段階的にアップグレード）
class MinecraftServerManager extends MinecraftServerManager_Phase3 {
    constructor(serverDirectory, config) {
        super(serverDirectory, config);
        
        this.logger.info('MinecraftServerManager Phase3 ready', {
            phase: this.implementationPhase,
            features: this.features.length,
            newPhase3Features: [
                'OwnServer自動管理・制御',
                'CloudFlare DNS自動更新',
                '外部アクセス管理・監視',
                '統合ヘルスチェック・自動復旧',
                '外部公開状態の一元管理',
                'セキュリティ・アクセス制御'
            ]
        });
    }
}

module.exports = MinecraftServerManager;
