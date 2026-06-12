import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { AgentsModule } from './agents/agents.module';
import { CertificationModule } from './certification/certification.module';

import { appConfig, databaseConfig, redisConfig, jwtConfig } from './config';

@Module({
  imports: [
    // ─── Configuration ────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
      envFilePath: ['.env.local', '.env'],
      cache: true,
      expandVariables: true,
    }),

    // ─── Event Emitter ───────────────────────────────────────
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
    }),

    // ─── TypeORM (PostgreSQL) ─────────────────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('database.host', 'localhost'),
        port: configService.get<number>('database.port', 5432),
        database: configService.get<string>('database.database', 'aenews'),
        username: configService.get<string>('database.username', 'aenews'),
        password: configService.get<string>('database.password', 'aenews_secret'),
        synchronize: configService.get<boolean>('database.synchronize', false),
        logging: configService.get<boolean>('database.logging', false),
        poolSize: configService.get<number>('database.poolSize', 20),
        autoLoadEntities: true,
        keepConnectionAlive: true,
        retryAttempts: 10,
        retryDelay: 3000,
        extra: {
          max: configService.get<number>('database.poolSize', 20),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
      }),
    }),

    // ─── Bull (Redis Queue) ──────────────────────────────────
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password', 'aenews_redis_secret'),
          db: configService.get<number>('redis.db', 1),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
        settings: {
          maxStalledCount: 3,
          stalledInterval: 30000,
        },
      }),
    }),

    // ─── Health Module ───────────────────────────────────────
    HealthModule,

    // ─── Agents Framework ────────────────────────────────────
    AgentsModule,

    // ─── Certification Framework ─────────────────────────────
    CertificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule {}
