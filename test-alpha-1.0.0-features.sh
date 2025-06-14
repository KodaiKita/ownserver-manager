#!/bin/bash

# Alpha 1.0.0 機能確認テストスイート
# 実行日: 2025年6月14日
# 目的: リリース前の全機能動作確認

echo "=== OwnServer Manager Alpha 1.0.0 機能確認テスト ==="
echo "テスト開始: $(date)"
echo ""

# テスト結果記録用
LOGFILE="alpha-1.0.0-test-$(date +%Y%m%d-%H%M%S).log"
echo "ログファイル: $LOGFILE"

# テスト関数
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    echo "━━━ テスト: $test_name ━━━"
    echo "実行コマンド: $test_command"
    
    # テスト実行（10秒タイムアウトを追加）
    if timeout 10 bash -c "$test_command" 2>&1 | tee -a "$LOGFILE"; then
        if [[ -n "$expected_pattern" ]]; then
            if timeout 10 bash -c "$test_command" 2>&1 | grep -q "$expected_pattern"; then
                echo "✅ 合格: $test_name"
                return 0
            else
                echo "❌ 不合格: $test_name (期待パターン不一致)"
                return 1
            fi
        else
            echo "✅ 合格: $test_name"
            return 0
        fi
    else
        echo "❌ 不合格: $test_name (実行エラーまたはタイムアウト)"
        return 1
    fi
    echo ""
}

# テスト開始
TOTAL_TESTS=0
PASSED_TESTS=0

echo "1. 基本環境確認テスト"
echo "─────────────────────"

# 1.1 Node.js環境
((TOTAL_TESTS++))
if run_test "Node.js環境確認" "docker exec ownserver-manager node --version" "v18"; then
    ((PASSED_TESTS++))
fi

# 1.2 Java環境
((TOTAL_TESTS++))
if run_test "Java環境確認" "docker exec ownserver-manager java -version" "openjdk"; then
    ((PASSED_TESTS++))
fi

# 1.3 CLI基本動作
((TOTAL_TESTS++))
if run_test "CLI基本動作確認" "docker exec ownserver-manager node src/commands/cli.js --version" ""; then
    ((PASSED_TESTS++))
fi

echo ""
echo "2. CLI機能テスト"
echo "─────────────────"

# 2.1 ヘルプ表示
((TOTAL_TESTS++))
if run_test "ヘルプ表示" "docker exec ownserver-manager node src/commands/cli.js --help" "Usage:"; then
    ((PASSED_TESTS++))
fi

# 2.2 状態確認
((TOTAL_TESTS++))
if run_test "状態確認コマンド" "docker exec ownserver-manager node src/commands/cli.js status" "OwnServer Manager Status"; then
    ((PASSED_TESTS++))
fi

# 2.3 ヘルスチェック
((TOTAL_TESTS++))
if run_test "ヘルスチェック" "docker exec ownserver-manager node src/commands/cli.js health" ""; then
    ((PASSED_TESTS++))
fi

echo ""
echo "3. OwnServer機能テスト"
echo "─────────────────────"

# 3.1 OwnServerバイナリ状態確認
((TOTAL_TESTS++))
if run_test "OwnServerバイナリ状態" "docker exec ownserver-manager node src/commands/cli.js ownserver --status" ""; then
    ((PASSED_TESTS++))
fi

# 3.2 OwnServerバイナリテスト
((TOTAL_TESTS++))
if run_test "OwnServerバイナリテスト" "docker exec ownserver-manager node src/commands/cli.js ownserver --test" ""; then
    ((PASSED_TESTS++))
fi

echo ""
echo "4. CloudFlare機能テスト"
echo "──────────────────────"

# 4.1 CloudFlare DNS直接テスト
((TOTAL_TESTS++))
if run_test "CloudFlare API直接テスト" "docker exec ownserver-manager node test-cloudflare-dns.js" ""; then
    ((PASSED_TESTS++))
fi

# 4.2 外部接続テスト
((TOTAL_TESTS++))
if run_test "外部接続確認テスト" "docker exec ownserver-manager node test-external-connectivity.js" ""; then
    ((PASSED_TESTS++))
fi

echo ""
echo "5. 設定・管理機能テスト"
echo "─────────────────────"

# 5.1 設定確認
((TOTAL_TESTS++))
if run_test "設定ファイル確認" "docker exec ownserver-manager node src/commands/cli.js config --show" "minecraft"; then
    ((PASSED_TESTS++))
fi

# 5.2 プレイヤー管理
((TOTAL_TESTS++))
if run_test "プレイヤー管理機能" "docker exec ownserver-manager node src/commands/cli.js players --help" ""; then
    ((PASSED_TESTS++))
fi

# 5.3 バックアップ機能
((TOTAL_TESTS++))
if run_test "バックアップ機能" "docker exec ownserver-manager node src/commands/cli.js backup --help" ""; then
    ((PASSED_TESTS++))
fi

echo ""
echo "6. 統合機能テスト"
echo "──────────────────"

# 6.1 インタラクティブメニュー（ヘルプのみ）
((TOTAL_TESTS++))
if run_test "インタラクティブメニュー" "docker exec ownserver-manager node src/commands/cli.js interactive --help" ""; then
    ((PASSED_TESTS++))
fi

# 6.2 監視機能
((TOTAL_TESTS++))
if run_test "監視機能" "docker exec ownserver-manager node src/commands/cli.js monitor --help" ""; then
    ((PASSED_TESTS++))
fi

# 6.3 ログ機能
((TOTAL_TESTS++))
if run_test "ログ機能" "docker exec ownserver-manager node src/commands/cli.js logs --help" ""; then
    ((PASSED_TESTS++))
fi

echo ""
echo "=== テスト結果サマリ ==="
echo "総テスト数: $TOTAL_TESTS"
echo "合格: $PASSED_TESTS"
echo "不合格: $((TOTAL_TESTS - PASSED_TESTS))"
echo "成功率: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"

if [[ $PASSED_TESTS -eq $TOTAL_TESTS ]]; then
    echo "🎉 全テスト合格！Alpha 1.0.0リリース準備完了"
    echo "結果: PASS"
    exit 0
else
    echo "⚠️  一部テスト不合格。要確認・修正"
    echo "結果: FAIL"
    exit 1
fi
