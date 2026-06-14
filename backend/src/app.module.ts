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
import { AgentFrameworkModule } from './modules/agent-framework/agent-framework.module';
import { SoftwareFactoryModule } from './modules/software-factory/software-factory.module';
import { CodingConnectorModule } from './modules/connectors/coding/coding-connector.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { SecurityModule } from './modules/security/security.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { BrowserConnectorModule } from './modules/connectors/browser/browser-connector.module';
import { OfficeConnectorModule } from './modules/connectors/office/office-connector.module';
import { InfrastructureConnectorModule } from './modules/connectors/infrastructure/infrastructure-connector.module';
import { SecurityConnectorModule } from './modules/connectors/security/security-connector.module';
import { ConnectorHealthModule } from './modules/connectors/health/connector-health.module';
import { LLMModule } from './modules/llm/llm.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseCacheInterceptor } from './modules/performance/interceptors/response-cache.interceptor';
import { CompressionInterceptor } from './modules/performance/interceptors/compression.interceptor';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { TenantGuard } from './modules/tenant/guards/tenant.guard';

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
        // ─── Phase 13: Connection Pool Optimization ───
        poolSize: configService.get<number>('database.poolSize') ?? 20,
        extra: {
          // Connection pool settings
          max: configService.get<number>('database.poolMax') ?? 20,
          min: configService.get<number>('database.poolMin') ?? 5,
          idleTimeoutMillis: configService.get<number>('database.poolIdleTimeout') ?? 30000,
          connectionTimeoutMillis: configService.get<number>('database.poolConnectionTimeout') ?? 5000,
          // Statement timeout (prevent runaway queries)
          statement_timeout: configService.get<number>('database.statementTimeout') ?? 30000,
          // Query optimization
          application_name: 'aenews-agent-os-x',
        },
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

    // ─── LLM Provider Module (Global) ──────────────────────────
    // Provides: LLMService, OpenAIProvider, AnthropicProvider
    // Must be loaded before agent clusters so LLM is available to all
    LLMModule,

    // ─── Observability Module (Global) ──────────────────────────
    // Provides: MetricsService, Prometheus endpoints, @Trace/@Meter decorators
    ObservabilityModule,

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

    // ─── Extended Agent Framework + Software Factory (from src/) ───
    // Provides: memory, events, bridge, orchestrator, 80+ agents (BaseAgentService pattern),
    // Software Factory (mission runtime, connectors, metrics)
    AgentFrameworkModule,

    // ─── Software Factory Module ───
    // Provides: Mission orchestration, connectors, teams, runtime engine
    SoftwareFactoryModule,

    // ─── Real Browser Connector Module ───
    // Provides: Playwright-based browser automation with pool management
    // Must be loaded after AgentFrameworkModule so it can override the simulation browser connector
    BrowserConnectorModule,

    // ─── Coding Connector Module ───
    // Provides: GitHub API, Git Local, Filesystem connectors
    // Must be loaded after AgentFrameworkModule so it can override the simulation coding connector
    CodingConnectorModule,

    // ─── Office Connector Module ───
    // Provides: Document generation, email, calendar, spreadsheets, tasks
    // Must be loaded after AgentFrameworkModule so it can override the simulation office connector
    OfficeConnectorModule,

    // ─── Infrastructure Connector Module ───
    // Provides: Docker, processes, system monitoring, deployment
    // Registers new 'infrastructure' connector with AgentBridge
    InfrastructureConnectorModule,

    // ─── Security Connector Module ───
    // Provides: Authentication, encryption, vulnerability scanning, audit, threat detection
    // Registers new 'security' connector with AgentBridge
    SecurityConnectorModule,

    // ─── Connector Health Module ───
    // Provides: Periodic health checks for all connectors
    // Exposes: /api/v1/connectors/health, /api/v1/connectors/status
    ConnectorHealthModule,

    // ─── WebSocket Gateway Module ───
    // Provides: Real-time event broadcasting over Socket.IO
    GatewayModule,

    // ─── Security Module (Phase 12) ───
    // Provides: Account lockout, refresh tokens, CORS, IP access control,
    // security metrics, threat intelligence, Sentry integration
    SecurityModule,

    // ─── Performance Module (Phase 13) ───
    // Provides: Slow query logger, response caching, compression,
    // connection pool monitoring, performance profiling
    PerformanceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ─── Global Interceptors ────────────────────────────────────
    // ResponseCacheInterceptor: HTTP-level response caching (Redis + memory LRU)
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseCacheInterceptor,
    },
    // CompressionInterceptor: gzip/deflate compression for large responses
    {
      provide: APP_INTERCEPTOR,
      useClass: CompressionInterceptor,
    },
    // ─── Global Guards ──────────────────────────────────────────
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
  ],
})
export class AppModule {}
