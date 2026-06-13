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
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiration: process.env.JWT_EXPIRATION || '24h',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'default-encryption-key-32c',
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
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
  },
});
