# ─── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --ignore-scripts

COPY . .

RUN npm run build

# ─── Stage 2: Production ────────────────────────────────────────
FROM node:20-alpine AS production

LABEL maintainer="AENEWS <dev@aenews.ai>"
LABEL description="AENEWS Agent OS X - Enterprise Autonomous Browser Platform"

# Install Playwright system dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dbus \
    xvfb

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Install Playwright browser
RUN npm init -y && \
    npm install playwright@^1.41.0 && \
    npx playwright install chromium

COPY package.json package-lock.json* ./

RUN npm ci --only=production --ignore-scripts

COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -S aenews && adduser -S aenews -G aenews
RUN chown -R aenews:aenews /app
USER aenews

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
