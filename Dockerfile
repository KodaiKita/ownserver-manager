# Multi-stage build for ownserver-manager
FROM node:18-alpine AS base

# Install necessary packages
RUN apk add --no-cache \
    openjdk11-jre \
    openjdk17-jre \
    openjdk21-jre \
    bash \
    curl \
    wget

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application source
COPY src/ ./src/
COPY bin/ ./bin/
COPY config/ ./config/

# Create necessary directories
RUN mkdir -p /app/logs /app/minecraft-servers /app/backups

# Set permissions
RUN chown -R nodejs:nodejs /app && \
    chmod +x /app/bin/* && \
    chmod +x /app/src/commands/cli.js

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node src/commands/cli.js status || exit 1

# Expose Minecraft port
EXPOSE 25565

# Set default command
CMD ["node", "src/index.js"]