export default () => ({
  app: {
    name: process.env.APP_NAME || 'AENEWS-Agent-OS-X',
    port: parseInt(process.env.APP_PORT || '3000', 10),
    env: process.env.APP_ENV || 'development',
    version: process.env.APP_VERSION || '0.1.0',
    apiPrefix: process.env.API_PREFIX || 'api/v1',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'aenews_osx',
    user: process.env.DB_USER || 'aenews',
    password: process.env.DB_PASSWORD || '',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
  },
  qdrant: {
    host: process.env.QDRANT_HOST || 'localhost',
    port: parseInt(process.env.QDRANT_PORT || '6333', 10),
    apiKey: process.env.QDRANT_API_KEY || undefined,
  },
  rabbitmq: {
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: parseInt(process.env.RABBITMQ_PORT || '5672', 10),
    user: process.env.RABBITMQ_USER || 'aenews',
    password: process.env.RABBITMQ_PASSWORD || '',
    vhost: process.env.RABBITMQ_VHOST || 'aenews',
    get url(): string {
      return `amqp://${this.user}:${this.password}@${this.host}:${this.port}/${this.vhost}`;
    },
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: process.env.MINIO_ACCESS_KEY || '',
    secretKey: process.env.MINIO_SECRET_KEY || '',
    bucket: process.env.MINIO_BUCKET || 'aenews-storage',
  },
  jwt: {
    // FAIL-FAST: No default secrets. Must be set in production.
    // In development, a warning is logged but the app still starts.
    secret: process.env.JWT_SECRET || (process.env.APP_ENV === 'production' ? undefined : 'dev-only-secret-change-me'),
    expiration: process.env.JWT_EXPIRATION || '24h',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  encryption: {
    // FAIL-FAST: No default encryption key. Must be set in production.
    key: process.env.ENCRYPTION_KEY || (process.env.APP_ENV === 'production' ? undefined : 'dev-only-key-32chars-change!'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
  agent: {
    maxConcurrent: parseInt(process.env.AGENT_MAX_CONCURRENT || '50', 10),
    timeout: parseInt(process.env.AGENT_TIMEOUT || '300000', 10),
    retryMax: parseInt(process.env.AGENT_RETRY_MAX || '3', 10),
    retryDelay: parseInt(process.env.AGENT_RETRY_DELAY || '5000', 10),
  },
  plugin: {
    dir: process.env.PLUGIN_DIR || './plugins',
    autoload: process.env.PLUGIN_AUTOLOAD === 'true',
  },
  tenant: {
    isolation: process.env.TENANT_ISOLATION || 'strict',
    defaultQuotaAgents: parseInt(process.env.TENANT_DEFAULT_QUOTA_AGENTS || '100', 10),
    defaultQuotaTasks: parseInt(process.env.TENANT_DEFAULT_QUOTA_TASKS || '10000', 10),
  },
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN || undefined,
    sentryTracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    sentryProfilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
  },
  llm: {
    defaultProvider: process.env.LLM_DEFAULT_PROVIDER || 'openai',
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10),
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096', 10),
    },
    fallback: {
      enabled: process.env.LLM_FALLBACK_ENABLED === 'true',
      secondaryProvider: process.env.LLM_SECONDARY_PROVIDER || 'anthropic',
    },
  },
  // ─── Phase 12: Security Configuration ───
  security: {
    cors: {
      origins: process.env.SECURITY_CORS_ORIGINS || '',
    },
    lockout: {
      maxAttempts: parseInt(process.env.SECURITY_LOCKOUT_MAX_ATTEMPTS || '5', 10),
      baseDurationMin: parseInt(process.env.SECURITY_LOCKOUT_BASE_DURATION_MIN || '15', 10),
      maxDurationMin: parseInt(process.env.SECURITY_LOCKOUT_MAX_DURATION_MIN || '1440', 10),
      multiplier: parseInt(process.env.SECURITY_LOCKOUT_MULTIPLIER || '2', 10),
      resetAfterMin: parseInt(process.env.SECURITY_LOCKOUT_RESET_AFTER_MIN || '30', 10),
      progressiveDelay: process.env.SECURITY_LOCKOUT_PROGRESSIVE_DELAY !== 'false',
    },
    refreshToken: {
      maxFamilies: parseInt(process.env.SECURITY_REFRESH_TOKEN_MAX_FAMILIES || '5', 10),
      reuseWindowMin: parseInt(process.env.SECURITY_REFRESH_TOKEN_REUSE_WINDOW_MIN || '5', 10),
    },
    ip: {
      adminWhitelist: process.env.SECURITY_IP_ADMIN_WHITELIST || '',
      metricsWhitelist: process.env.SECURITY_IP_METRICS_WHITELIST || '',
      internalWhitelist: process.env.SECURITY_IP_INTERNAL_WHITELIST || '',
      privateBypass: process.env.SECURITY_IP_PRIVATE_BYPASS !== 'false',
    },
    audit: {
      batchSize: parseInt(process.env.SECURITY_AUDIT_BATCH_SIZE || '50', 10),
      flushIntervalSec: parseInt(process.env.SECURITY_AUDIT_FLUSH_INTERVAL_SEC || '10', 10),
      retentionDays: parseInt(process.env.SECURITY_AUDIT_RETENTION_DAYS || '90', 10),
    },
    threat: {
      autoBlockScore: parseInt(process.env.SECURITY_THREAT_AUTO_BLOCK_SCORE || '80', 10),
      bruteForceThreshold: parseInt(process.env.SECURITY_THREAT_BRUTE_FORCE_THRESHOLD || '10', 10),
      scanningThreshold: parseInt(process.env.SECURITY_THREAT_SCANNING_THRESHOLD || '20', 10),
      rateAbuseThreshold: parseInt(process.env.SECURITY_THREAT_RATE_ABUSE_THRESHOLD || '5', 10),
      trackingWindowMin: parseInt(process.env.SECURITY_THREAT_TRACKING_WINDOW_MIN || '15', 10),
    },
    ws: {
      maxConnectionsPerIp: parseInt(process.env.SECURITY_WS_MAX_CONNECTIONS_PER_IP || '5', 10),
      rateLimitPerMin: parseInt(process.env.SECURITY_WS_RATE_LIMIT_PER_MIN || '60', 10),
      sanitizeEvents: process.env.SECURITY_WS_SANITIZE_EVENTS !== 'false',
    },
  },
});
