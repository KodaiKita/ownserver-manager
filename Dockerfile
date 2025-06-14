# Multi-stage build for ownserver-manager
FROM node:18-alpine AS dependencies

# Install dependencies only
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Final stage
FROM node:18-alpine AS runtime

# Install necessary packages including multiple Java versions
RUN apk add --no-cache \
    openjdk8-jre \
    openjdk11-jre \
    openjdk17-jre \
    openjdk21-jre \
    bash \
    curl \
    wget \
    dumb-init \
    su-exec

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source
COPY package*.json ./
COPY src/ ./src/
COPY bin/ ./bin/
COPY config/ ./config/
COPY docker-entrypoint.sh /usr/local/bin/

# Create necessary directories and set permissions
RUN mkdir -p /app/logs /app/minecraft-servers /app/backups /app/java-runtimes && \
    chown -R nodejs:nodejs /app && \
    chmod +x /app/bin/* && \
    chmod +x /app/src/commands/cli.js && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Switch to non-root user for health check only
# Note: Entrypoint will handle user switching after permission setup

# Health check using the CLI (API修正版対応)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD su-exec nodejs node bin/ownserver-manager health || su-exec nodejs node bin/ownserver-manager status || exit 1

# Expose Minecraft port and potential OwnServer ports
EXPOSE 25565 19132

# Use custom entrypoint for proper permission handling
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "bin/ownserver-manager", "interactive"]