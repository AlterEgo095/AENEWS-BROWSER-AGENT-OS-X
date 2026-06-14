# ─── Build Stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files first (for workspace deps if any)
COPY package*.json ./

# Copy backend package files and install deps
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

# Copy backend source
COPY backend ./backend

# Build the NestJS app
RUN cd backend && npm run build

# ─── Production Stage ────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S aenews && \
    adduser -S aenews -u 1001 -G aenews

# Copy backend package files and install production deps only
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/backend/dist ./dist

# Copy init-db.sql for reference (mounted by docker-compose)
COPY docker/init-db.sql /app/docker/init-db.sql

RUN chown -R aenews:aenews /app

USER aenews

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
