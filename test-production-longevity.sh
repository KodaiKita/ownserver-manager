#!/bin/bash

# Production Environment Long-term Operation Test
# Alpha 1.0.0 本番環境長時間運用テスト

echo "=== OwnServer Manager Alpha 1.0.0 Production Test ==="
echo "開始時刻: $(date)"
echo ""

# テスト設定
TEST_DURATION=${1:-3600}  # デフォルト1時間（秒）
CHECK_INTERVAL=60         # 1分間隔でチェック
LOG_FILE="production-test-$(date +%Y%m%d-%H%M%S).log"

echo "テスト期間: ${TEST_DURATION}秒 ($(($TEST_DURATION / 60))分)"
echo "チェック間隔: ${CHECK_INTERVAL}秒"
echo "ログファイル: $LOG_FILE"
echo ""

# 初期メモリ使用量記録
echo "=== 初期状態 ===" | tee -a "$LOG_FILE"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# テスト開始
START_TIME=$(date +%s)
END_TIME=$((START_TIME + TEST_DURATION))
CHECK_COUNT=0
ERROR_COUNT=0

echo "=== 長時間運用テスト開始 ===" | tee -a "$LOG_FILE"

while [[ $(date +%s) -lt $END_TIME ]]; do
    CURRENT_TIME=$(date)
    CHECK_COUNT=$((CHECK_COUNT + 1))
    
    echo "[$(date +%H:%M:%S)] チェック #$CHECK_COUNT" | tee -a "$LOG_FILE"
    
    # 1. ヘルスチェック
    if timeout 30 docker exec ownserver-manager-prod node src/commands/cli.js health > /dev/null 2>&1; then
        echo "  ✅ ヘルスチェック: OK" | tee -a "$LOG_FILE"
    else
        echo "  ❌ ヘルスチェック: FAIL" | tee -a "$LOG_FILE"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
    
    # 2. メモリ使用量チェック
    MEM_USAGE=$(docker stats --no-stream --format "{{.MemPerc}}" ownserver-manager-prod | sed 's/%//')
    echo "  📊 メモリ使用率: ${MEM_USAGE}%" | tee -a "$LOG_FILE"
    
    # メモリ使用量が90%を超えた場合警告
    if (( $(echo "$MEM_USAGE > 90" | bc -l) )); then
        echo "  ⚠️  メモリ使用量警告: ${MEM_USAGE}%" | tee -a "$LOG_FILE"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
    
    # 3. CPU使用量チェック
    CPU_USAGE=$(docker stats --no-stream --format "{{.CPUPerc}}" ownserver-manager-prod | sed 's/%//')
    echo "  💻 CPU使用率: ${CPU_USAGE}%" | tee -a "$LOG_FILE"
    
    # 4. コンテナ状態チェック
    CONTAINER_STATUS=$(docker inspect ownserver-manager-prod --format='{{.State.Status}}')
    echo "  🐳 コンテナ状態: $CONTAINER_STATUS" | tee -a "$LOG_FILE"
    
    if [[ "$CONTAINER_STATUS" != "running" ]]; then
        echo "  ❌ コンテナが停止しています" | tee -a "$LOG_FILE"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
    
    # 5. ログエラーチェック（直近1分）
    ERROR_LOGS=$(docker logs ownserver-manager-prod --since=1m 2>&1 | grep -i "error\|exception\|failed" | wc -l)
    if [[ $ERROR_LOGS -gt 0 ]]; then
        echo "  ⚠️  直近1分でエラーログ: ${ERROR_LOGS}件" | tee -a "$LOG_FILE"
    else
        echo "  ✅ エラーログ: なし" | tee -a "$LOG_FILE"
    fi
    
    echo "" | tee -a "$LOG_FILE"
    
    # 10回に1回詳細統計を記録
    if [[ $((CHECK_COUNT % 10)) -eq 0 ]]; then
        echo "--- 詳細統計 (チェック #$CHECK_COUNT) ---" | tee -a "$LOG_FILE"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" | tee -a "$LOG_FILE"
        echo "" | tee -a "$LOG_FILE"
    fi
    
    sleep $CHECK_INTERVAL
done

# テスト結果サマリ
echo "=== テスト完了 ===" | tee -a "$LOG_FILE"
echo "終了時刻: $(date)" | tee -a "$LOG_FILE"
echo "総チェック回数: $CHECK_COUNT" | tee -a "$LOG_FILE"
echo "エラー/警告回数: $ERROR_COUNT" | tee -a "$LOG_FILE"

if [[ $ERROR_COUNT -eq 0 ]]; then
    echo "🎉 長時間運用テスト成功！エラーなし" | tee -a "$LOG_FILE"
    exit 0
else
    echo "⚠️  長時間運用テストで${ERROR_COUNT}件の問題を検出" | tee -a "$LOG_FILE"
    exit 1
fi
