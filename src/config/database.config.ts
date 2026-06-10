import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  type: 'postgres' as const,
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'aenews',
  username: process.env.POSTGRES_USER || 'aenews',
  password: process.env.POSTGRES_PASSWORD || 'aenews_secret',
  synchronize: process.env.POSTGRES_SYNCHRONIZE === 'true',
  logging: process.env.POSTGRES_LOGGING === 'true',
  poolSize: parseInt(process.env.POSTGRES_POOL_SIZE || '20', 10),
}));
