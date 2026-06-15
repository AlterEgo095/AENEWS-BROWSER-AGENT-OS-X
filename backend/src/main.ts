// ─── OpenTelemetry MUST be initialized BEFORE NestJS bootstrap ───
import './modules/observability/tracing';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { CorsSecurityMiddleware } from './modules/security/middleware/cors-security.middleware';
import { CorrelationIdMiddleware } from './modules/security/middleware/correlation-id.middleware';
import { IpAccessControlMiddleware } from './modules/security/middleware/ip-access-control.middleware';
import { SentryIntegrationService } from './modules/security-monitoring/services/sentry-integration.service';
import { CompressionInterceptor } from './modules/performance/interceptors/compression.interceptor';
import { ResponseCacheInterceptor } from './modules/performance/interceptors/response-cache.interceptor';
import { PerformanceProfilingService } from './modules/performance/services/performance-profiling.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // ─── Trust Proxy (for proper IP forwarding behind nginx) ───
  (app as any).enableTrustProxy();

  // ─── Security Headers (helmet) ───
  app.use(helmet.default({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
        scriptSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'https:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for Swagger UI
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
    hsts: {
      maxAge: 63072000,       // 2 years
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
    ieNoOpen: true,
  }));

  // ─── CORS (explicit origin validation) ───
  const corsMiddleware = app.get(CorsSecurityMiddleware);
  app.enableCors(corsMiddleware.getCorsOptions());

  // ─── Cookie Parser (required for httpOnly refresh token cookies) ───
  app.use(cookieParser());

  // ─── Request Body Size Limit ───
  const expressApp = app.getHttpAdapter().getInstance();
  // Override express.json to limit body size to 10MB
  expressApp.use(require('express').json({ limit: '10mb' }));
  expressApp.use(require('express').urlencoded({ limit: '10mb', extended: true }));

  // ─── Global Middleware ───
  app.use(CorrelationIdMiddleware);
  app.use(IpAccessControlMiddleware);

  // Global prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors (order matters: outermost first)
  app.useGlobalInterceptors(
    new CompressionInterceptor(app.get(ConfigService) as ConfigService),
    new LoggingInterceptor(),
    new ResponseCacheInterceptor(app.get(ConfigService) as ConfigService),
    new TimeoutInterceptor(),
    new TransformInterceptor(),
  );

  // ─── Sentry Request Handler ───
  const sentryService = app.get(SentryIntegrationService);
  if (sentryService.isEnabled()) {
    try {
      const Sentry = await import('@sentry/node');
      app.use((Sentry as any).Handlers.requestHandler());
      app.use((Sentry as any).Handlers.tracingHandler());
    } catch {
      // Sentry not available, continue without it
    }
  }

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('AENEWS Agent OS X')
    .setDescription('Enterprise Autonomous Browser Agent Platform API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', name: 'X-Tenant-ID', in: 'header' },
      'tenant-id',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Graceful shutdown hooks
  app.enableShutdownHooks();

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);

  console.log(`🚀 AENEWS Agent OS X running on port ${port}`);
  console.log(`📖 API Docs: http://localhost:${port}/docs`);
  console.log(`🔑 API Prefix: /${apiPrefix}`);
  console.log(`🛡️  Security: helmet + explicit CORS + IP access control + correlation IDs`);
  console.log(`⚡ Performance: compression + response cache + pool monitoring + profiling`);
}

bootstrap();
