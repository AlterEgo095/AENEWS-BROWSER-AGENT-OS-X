import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD } from '@nestjs/core';
import * as redisStore from 'cache-manager-redis-store';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { RedisModule } from './modules/redis/redis.module';
import { Neo4jModule } from './modules/neo4j/neo4j.module';
import { QdrantModule } from './modules/qdrant/qdrant.module';
import { MinioModule } from './modules/minio/minio.module';
import { RabbitMQModule } from './modules/rabbitmq/rabbitmq.module';
import { AgentModule } from './modules/agent/agent.module';
import { TaskModule } from './modules/task/task.module';
import { EventModule } from './modules/event/event.module';
import { PluginModule } from './modules/plugin/plugin.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ComputerClusterModule } from './clusters/computer/computer-cluster.module';
import { BrowserClusterModule } from './clusters/browser/browser-cluster.module';
import { CodingClusterModule } from './clusters/coding/coding-cluster.module';
import { OfficeClusterModule } from './clusters/office/office-cluster.module';
import { MarketingClusterModule } from './clusters/marketing/marketing-cluster.module';
import { BusinessClusterModule } from './clusters/business/business-cluster.module';
import { InfrastructureClusterModule } from './clusters/infrastructure/infrastructure-cluster.module';
import { SecurityClusterModule } from './clusters/security/security-cluster.module';
import { MetaIntelligenceClusterModule } from './clusters/meta-intelligence/meta-intelligence-cluster.module';
import { LLMIntelligenceClusterModule } from './clusters/llm-intelligence/llm-intelligence-cluster.module';
import { IntelligentOrchestrationClusterModule } from './clusters/intelligent-orchestration/intelligent-orchestration-cluster.module';
import { WatchdogClusterModule } from './clusters/watchdog/watchdog.module';
import { SelfEvolutionClusterModule } from './clusters/self-evolution/self-evolution-cluster.module';
import { CertificationClusterModule } from './clusters/certification/certification-cluster.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: true },
    }),

    // Database - PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        database: configService.get<string>('database.name'),
        username: configService.get<string>('database.user'),
        password: configService.get<string>('database.password'),
        synchronize: configService.get<boolean>('database.synchronize'),
        logging: configService.get<boolean>('database.logging'),
        autoLoadEntities: true,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        subscribers: [__dirname + '/**/*.subscriber{.ts,.js}'],
      }),
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('throttle.ttl') ?? 60000,
            limit: configService.get<number>('throttle.limit') ?? 100,
          },
        ],
      }),
    }),

    // Event Emitter
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),

    // Schedule
    ScheduleModule.forRoot(),

    // Cache (Redis)
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        store: redisStore as any,
        host: configService.get<string>('redis.host'),
        port: configService.get<number>('redis.port'),
        password: configService.get<string>('redis.password'),
        db: configService.get<number>('redis.db'),
        ttl: 300,
      }),
    }),

    // Bull Queue (Redis)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          db: configService.get<number>('redis.db'),
        },
      }),
    }),

    // Feature Modules
    HealthModule,
    RedisModule,
    Neo4jModule,
    QdrantModule,
    MinioModule,
    RabbitMQModule,
    AgentModule,
    TaskModule,
    EventModule,
    PluginModule,
    TenantModule,
    AuthModule,
    UserModule,

    // ─── Agent Clusters (9 original + 5 Phase 2 Intelligence) ───
    ComputerClusterModule,
    BrowserClusterModule,
    CodingClusterModule,
    OfficeClusterModule,
    MarketingClusterModule,
    BusinessClusterModule,
    InfrastructureClusterModule,
    SecurityClusterModule,
    MetaIntelligenceClusterModule,

    // Phase 2 — Intelligence Clusters
    LLMIntelligenceClusterModule,
    IntelligentOrchestrationClusterModule,
    WatchdogClusterModule,
    SelfEvolutionClusterModule,
    CertificationClusterModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
