import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * TypeORM DataSource configuration for CLI-based migrations.
 *
 * This file is used by the TypeORM CLI commands:
 *   npx typeorm migration:run -d src/data-source.ts
 *   npx typeorm migration:revert -d src/data-source.ts
 *
 * It is NOT used by the NestJS application at runtime — the app
 * configures TypeORM through TypeOrmModule.forRootAsync() in AppModule.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'aenews_osx',
  username: process.env.DB_USER || 'aenews',
  password: process.env.DB_PASSWORD || '',
  entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  // Do NOT use synchronize in production — rely on migrations.
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});
