#!/bin/bash
set -e

# ボリュームマウント後の権限設定
if [ -d "/app/logs" ]; then
    mkdir -p /app/logs
    chown nodejs:nodejs /app/logs
    chmod 755 /app/logs
fi

if [ -d "/app/minecraft-servers" ]; then
    mkdir -p /app/minecraft-servers
    chown nodejs:nodejs /app/minecraft-servers
    chmod 755 /app/minecraft-servers
fi

if [ -d "/app/backups" ]; then
    mkdir -p /app/backups
    chown nodejs:nodejs /app/backups
    chmod 755 /app/backups
fi

# 既存のCLIログファイルがある場合の権限修正
if [ -f "/app/logs/cli.log" ]; then
    chown nodejs:nodejs /app/logs/cli.log
    chmod 644 /app/logs/cli.log
fi

if [ -f "/app/logs/minecraft-server.log" ]; then
    chown nodejs:nodejs /app/logs/minecraft-server.log
    chmod 644 /app/logs/minecraft-server.log
fi

# nodejsユーザーとして実行
exec su-exec nodejs "$@"
