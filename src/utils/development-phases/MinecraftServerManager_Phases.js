/**
 * MinecraftServerManager Development Phases
 * 段階的開発アプローチ（フェーズ1-4）
 * 
 * 実装順序:
 * Phase1 -> Phase2 -> Phase3 -> Phase4 (Production)
 * 
 * 各フェーズは前のフェーズの機能を含み、新機能を追加
 */

module.exports = {
    /**
     * フェーズ1: 基本プロセス管理
     * - Java自動ダウンロード・管理
     * - Minecraftサーバー起動・停止
     * - 基本ログ統合
     * - シンプルなエラーハンドリング
     */
    PHASE1: {
        description: "基本プロセス管理 - Java管理、サーバー起動・停止",
        features: [
            "Java自動ダウンロード・インストール",
            "Minecraftサーバープロセス起動・停止", 
            "基本ログ統合（Logger連携）",
            "シンプルなエラーハンドリング",
            "プロセス状態監視"
        ],
        methods: [
            "constructor()",
            "start()",
            "stop()",
            "isServerRunning()",
            "downloadJava()",
            "validateJavaInstallation()",
            "_setupLogging()",
            "_handleProcessExit()"
        ],
        complexity: "低",
        estimatedTime: "2-3時間"
    },

    /**
     * フェーズ2: サーバー監視・制御
     * - ログ解析・パースing
     * - コンソールコマンド送信
     * - サーバー状態検出（起動完了、プレイヤー参加/離脱）
     * - 自動再起動機能
     */
    PHASE2: {
        description: "サーバー監視・制御 - ログ解析、コマンド送信、自動再起動",
        features: [
            "リアルタイムログ解析・パース",
            "コンソールコマンド送信機能",
            "サーバー状態自動検出",
            "プレイヤー参加/離脱監視",
            "自動再起動機能（設定可能）",
            "詳細エラー分類・ログ"
        ],
        methods: [
            "sendCommand()",
            "parseLogData()",
            "detectServerState()",
            "handleAutoRestart()",
            "getPlayerCount()",
            "getServerProperties()",
            "_parsePlayerJoin()",
            "_parsePlayerLeave()",
            "_detectServerReady()"
        ],
        complexity: "中",
        estimatedTime: "3-4時間"
    },

    /**
     * フェーズ3: ownserver連携
     * - ownserver起動順序制御
     * - エンドポイント自動取得・解析
     * - server.properties自動更新（ポート変更）
     * - 外部サービス連携イベント
     */
    PHASE3: {
        description: "ownserver連携 - 起動順序制御、エンドポイント取得、設定自動更新",
        features: [
            "ownserver起動順序制御",
            "エンドポイント自動取得・正規表現解析", 
            "server.properties自動更新",
            "外部サービス連携イベント発火",
            "ネットワーク状態監視",
            "ポート設定自動同期"
        ],
        methods: [
            "waitForOwnserver()",
            "extractEndpoint()",
            "updateServerProperties()", 
            "syncPortSettings()",
            "validateNetworkConnection()",
            "_parseOwnserverEndpoint()",
            "_backupServerProperties()",
            "_validatePortChange()"
        ],
        complexity: "中-高",
        estimatedTime: "4-5時間"
    },

    /**
     * フェーズ4: 高度機能（本番）
     * - 詳細設定管理・バリデーション
     * - 高度エラーハンドリング・リトライ機能
     * - パフォーマンス監視・最適化
     * - バックアップ・復元機能
     * - セキュリティ機能
     */
    PHASE4: {
        description: "高度機能 - 詳細設定管理、高度エラーハンドリング、本番機能",
        features: [
            "詳細設定管理・バリデーション",
            "高度エラーハンドリング・リトライ機能",
            "パフォーマンス監視・メトリクス", 
            "自動バックアップ・復元機能",
            "セキュリティ機能（ログサニタイズ）",
            "CLIモード・設定ファイル対応",
            "プラグイン/Mod自動検出・管理"
        ],
        methods: [
            "validateConfiguration()",
            "handleAdvancedErrors()",
            "monitorPerformance()",
            "createBackup()",
            "restoreBackup()", 
            "sanitizeLogs()",
            "detectInstalledMods()",
            "optimizeJavaArgs()",
            "_validateSecuritySettings()",
            "_generatePerformanceReport()"
        ],
        complexity: "高",
        estimatedTime: "5-6時間"
    },

    /**
     * 開発マイルストーン
     */
    MILESTONES: {
        "Phase1完了": "基本的なMinecraftサーバー管理が可能",
        "Phase2完了": "完全なサーバー監視・制御が可能", 
        "Phase3完了": "ownserver連携で外部公開が可能",
        "Phase4完了": "本番環境での安定運用が可能"
    },

    /**
     * 依存関係
     */
    DEPENDENCIES: {
        internal: [
            "Logger (必須 - 全フェーズ)",
            "ConfigManager (必須 - 全フェーズ)",
            "JavaVersionManager (必須 - Phase1+)"
        ],
        external: [
            "Node.js child_process",
            "Node.js fs/promises",
            "Node.js path",
            "Node.js events"
        ]
    },

    /**
     * テスト戦略
     */
    TESTING_STRATEGY: {
        unit: "各フェーズごとに単体テスト作成",
        integration: "Phase2以降で統合テスト",
        e2e: "Phase3以降でE2Eテスト（実際のMinecraftサーバー）",
        performance: "Phase4で性能テスト"
    }
};
