/**
 * Event Definitions
 * アプリケーション全体で使用するイベントの定義
 */

const EVENTS = {
    // Minecraft Server Events
    MINECRAFT: {
        STARTED: 'minecraft:started',
        STOPPED: 'minecraft:stopped',
        ERROR: 'minecraft:error',
        LOG: 'minecraft:log',
        COMMAND_SENT: 'minecraft:command_sent',
        RESTART_REQUIRED: 'minecraft:restart_required',
        PLAYER_JOINED: 'minecraft:player_joined',
        PLAYER_LEFT: 'minecraft:player_left'
    },

    // OwnServer Events
    OWNSERVER: {
        STARTED: 'ownserver:started',
        STOPPED: 'ownserver:stopped',
        ERROR: 'ownserver:error',
        ENDPOINT_READY: 'ownserver:endpoint_ready',
        CONNECTION_LOST: 'ownserver:connection_lost',
        RESTART_REQUIRED: 'ownserver:restart_required'
    },

    // CloudFlare DNS Events
    DNS: {
        RECORDS_SET: 'dns:records_set',
        RECORDS_REMOVED: 'dns:records_removed',
        API_ERROR: 'dns:api_error',
        RATE_LIMITED: 'dns:rate_limited',
        UPDATE_REQUIRED: 'dns:update_required'
    },

    // Health Check Events
    HEALTH: {
        CHECK_PASSED: 'health:check_passed',
        CHECK_FAILED: 'health:check_failed',
        RECOVERY_STARTED: 'health:recovery_started',
        RECOVERY_COMPLETED: 'health:recovery_completed',
        RECOVERY_FAILED: 'health:recovery_failed',
        THRESHOLD_EXCEEDED: 'health:threshold_exceeded'
    },

    // Application Events
    APP: {
        INITIALIZED: 'app:initialized',
        STARTED: 'app:started',
        STOPPED: 'app:stopped',
        ERROR: 'app:error',
        CONFIG_LOADED: 'app:config_loaded',
        CONFIG_UPDATED: 'app:config_updated'
    },

    // CLI Events
    CLI: {
        COMMAND_RECEIVED: 'cli:command_received',
        COMMAND_EXECUTED: 'cli:command_executed',
        COMMAND_FAILED: 'cli:command_failed'
    }
};

const EVENT_PRIORITIES = {
    CRITICAL: 0,    // システム停止に関わる重要なイベント
    HIGH: 1,        // 即座に対応が必要なイベント
    NORMAL: 2,      // 通常の処理イベント
    LOW: 3          // 統計・ログ用のイベント
};

module.exports = {
    EVENTS,
    EVENT_PRIORITIES
};
