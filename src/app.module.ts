/**
 * AENEWS Agent OS X - Root AppModule
 *
 * Phase 3: Full Integration — all modules wired together
 *
 * Architecture:
 *   IntegrationModule (cross-module bridge)
 *     ├── SoftwareFactoryModule (mission execution engine)
 *     ├── AgentsModule (80+ agents in 14 clusters)
 *     ├── MissionOsModule (7 OS services: constitutional, human approval, etc.)
 *     ├── GatewayModule (security, memory, documentation gateways)
 *     ├── RealtimeModule (WebSocket gateway for live updates)
 *     └── QueuesModule (Bull/Redis processors for missions, tasks, events)
 *
 * Plus: TypeORM (PostgreSQL), Bull (Redis), EventEmitter2, ConfigModule
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { AgentsModule } from './agents/agents.module';
import { SoftwareFactoryModule } from './software-factory/software-factory.module';
import { MissionOsModule } from './mission-os/mission-os.module';
import { GatewayModule } from './gateway/gateway.module';
import { RealtimeModule } from './realtime/realtime.module';
import { QueuesModule } from './queues/queues.module';
import { IntegrationModule } from './integration/integration.module';

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
        retryAttempts: 2,
        retryDelay: 1000,
        extra: {
          max: configService.get<number>('database.poolSize', 20),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 3000,
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
          password: configService.get<string>('redis.password', ''),
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

    // ─── Core Modules ────────────────────────────────────────
    AgentsModule,
    SoftwareFactoryModule,
    MissionOsModule,
    GatewayModule,

    // ─── Phase 3: Real-Time & Queues ─────────────────────────
    RealtimeModule,
    QueuesModule,

    // ─── Phase 3: Cross-Module Integration ───────────────────
    IntegrationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule {}
