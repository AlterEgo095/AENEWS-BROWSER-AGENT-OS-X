# ─── Build Stage ──────────────────────────────────────────────────────
# Multi-stage build for AENEWS Agent OS X Backend
# Optimized for production: minimal image, non-root user, health checks
# ─────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for Docker layer caching
COPY backend/package*.json ./backend/

# Install ALL dependencies (including devDependencies for build)
RUN cd backend && npm ci

# Copy backend source code
COPY backend ./backend

# Build the NestJS application
RUN cd backend && npm run build

# Prune devDependencies after build
RUN cd backend && npm prune --production

# ─── Production Stage ────────────────────────────────────────────────
FROM node:20-alpine AS production

LABEL maintainer="AENEWS Agent OS X"
LABEL description="AENEWS Agent OS X - Multi-Agent Intelligence Platform"
LABEL version="1.0.0"

WORKDIR /app

# Install security updates and required system packages
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache \
    wget \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Install Playwright system dependencies for browser agent cluster
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    xvfb

# Set Playwright to use system Chromium
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Create non-root user with specific UID/GID
RUN addgroup -g 1001 -S aenews && \
    adduser -S aenews -u 1001 -G aenews -h /app

# Copy production dependencies from builder
COPY --from=builder /app/backend/node_modules ./node_modules

# Copy built application from builder
COPY --from=builder /app/backend/dist ./dist

# Copy package.json for version info
COPY --from=builder /app/backend/package.json ./package.json

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads && \
    chown -R aenews:aenews /app

# Switch to non-root user
USER aenews

# Expose application port
EXPOSE 3000

# Environment defaults
ENV NODE_ENV=production \
    APP_PORT=3000 \
    LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Use dumb-init as PID 1 for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "--max-old-space-size=768", "dist/main.js"]
