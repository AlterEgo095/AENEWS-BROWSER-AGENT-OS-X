import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Application
  APP_NAME: Joi.string().default('AENEWS-Agent-OS-X'),
  APP_PORT: Joi.number().default(3000),
  APP_ENV: Joi.string().valid('development', 'staging', 'production').default('development'),
  APP_VERSION: Joi.string().default('0.1.0'),
  API_PREFIX: Joi.string().default('api/v1'),

  // PostgreSQL
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().default('aenews_osx'),
  DB_USER: Joi.string().default('aenews'),
  DB_PASSWORD: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().default(0),

  // Neo4j
  NEO4J_URI: Joi.string().default('bolt://localhost:7687'),
  NEO4J_USER: Joi.string().default('neo4j'),
  NEO4J_PASSWORD: Joi.string().required(),

  // Qdrant
  QDRANT_HOST: Joi.string().default('localhost'),
  QDRANT_PORT: Joi.number().default(6333),
  QDRANT_API_KEY: Joi.string().allow('').default(''),

  // RabbitMQ
  RABBITMQ_HOST: Joi.string().default('localhost'),
  RABBITMQ_PORT: Joi.number().default(5672),
  RABBITMQ_USER: Joi.string().default('aenews'),
  RABBITMQ_PASSWORD: Joi.string().required(),
  RABBITMQ_VHOST: Joi.string().default('aenews'),

  // MinIO
  MINIO_ENDPOINT: Joi.string().default('localhost'),
  MINIO_PORT: Joi.number().default(9000),
  MINIO_ACCESS_KEY: Joi.string().required(),
  MINIO_SECRET_KEY: Joi.string().required(),
  MINIO_BUCKET: Joi.string().default('aenews-storage'),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION: Joi.string().default('24h'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),

  // Encryption
  ENCRYPTION_KEY: Joi.string().length(32).required(),

  // Logging
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'text').default('json'),

  // Throttler
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),

  // Agent
  AGENT_MAX_CONCURRENT: Joi.number().default(50),
  AGENT_TIMEOUT: Joi.number().default(300000),
  AGENT_RETRY_MAX: Joi.number().default(3),
  AGENT_RETRY_DELAY: Joi.number().default(5000),

  // Plugin
  PLUGIN_DIR: Joi.string().default('./plugins'),
  PLUGIN_AUTOLOAD: Joi.boolean().default(true),

  // Multi-Tenancy
  TENANT_ISOLATION: Joi.string().valid('strict', 'relaxed').default('strict'),
  TENANT_DEFAULT_QUOTA_AGENTS: Joi.number().default(100),
  TENANT_DEFAULT_QUOTA_TASKS: Joi.number().default(10000),

  // Monitoring
  SENTRY_DSN: Joi.string().allow('').default(''),
  PROMETHEUS_PORT: Joi.number().default(9090),

  // LLM Provider
  LLM_DEFAULT_PROVIDER: Joi.string().valid('openai', 'anthropic').default('openai'),
  OPENAI_API_KEY: Joi.string().allow('').default(''),
  OPENAI_MODEL: Joi.string().default('gpt-4o'),
  OPENAI_MAX_TOKENS: Joi.number().default(4096),
  ANTHROPIC_API_KEY: Joi.string().allow('').default(''),
  ANTHROPIC_MODEL: Joi.string().default('claude-sonnet-4-20250514'),
  ANTHROPIC_MAX_TOKENS: Joi.number().default(4096),
  LLM_FALLBACK_ENABLED: Joi.boolean().default(false),
  LLM_SECONDARY_PROVIDER: Joi.string().valid('openai', 'anthropic').default('anthropic'),
});
