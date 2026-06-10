import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // ─── Global Logger (Winston) ──────────────────────────────
  const logLevel = process.env.LOG_LEVEL || 'info';
  const logFormat = process.env.LOG_FORMAT || 'json';
  const logDir = process.env.LOG_DIR || 'logs';

  const winstonFormat =
    logFormat === 'json'
      ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        )
      : winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            const ctx = context || 'Application';
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} [${level}] [${ctx}] ${message} ${metaStr}`;
          }),
        );

  app.useLogger(
    WinstonModule.createLogger({
      level: logLevel,
      format: winstonFormat,
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: `${logDir}/error.log`,
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: `${logDir}/combined.log`,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 10,
        }),
      ],
      exceptionHandlers: [
        new winston.transports.File({ filename: `${logDir}/exceptions.log` }),
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: `${logDir}/rejections.log` }),
      ],
    }),
  );

  // ─── CORS ─────────────────────────────────────────────────
  const corsEnabled = process.env.CORS_ENABLED !== 'false';
  if (corsEnabled) {
    const corsOrigins = process.env.CORS_ORIGINS || '*';
    const corsMethods = process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS';
    app.enableCors({
      origin: corsOrigins === '*' ? true : corsOrigins.split(','),
      methods: corsMethods.split(','),
      credentials: true,
      allowedHeaders: 'Content-Type, Authorization, X-Request-Id, X-Correlation-Id',
    });
  }

  // ─── Security (Helmet) ────────────────────────────────────
  const helmet = await import('helmet');
  app.use(helmet.default());

  // ─── Compression ─────────────────────────────────────────
  const compression = await import('compression');
  app.use(compression.default());

  // ─── Global Pipes ────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  // ─── Global Filters ──────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ─── Global Interceptors ─────────────────────────────────
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new LoggingInterceptor(),
  );

  // ─── API Versioning ──────────────────────────────────────
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ─── API Prefix ──────────────────────────────────────────
  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/live', 'health/ready'],
  });

  // ─── Swagger / OpenAPI ───────────────────────────────────
  const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle(process.env.SWAGGER_TITLE || 'AENEWS Agent OS X API')
      .setDescription(
        process.env.SWAGGER_DESCRIPTION ||
          'Enterprise Autonomous Browser Platform API',
      )
      .setVersion(process.env.SWAGGER_VERSION || '0.0.1')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
      .addTag('health', 'Health check endpoints')
      .addTag('agents', 'Agent management and control')
      .addTag('browsers', 'Browser instance management')
      .addTag('tasks', 'Task orchestration and execution')
      .addTag('clusters', 'Cluster node management')
      .addTag('sessions', 'Session management')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    const swaggerPath = process.env.SWAGGER_PATH || 'api/docs';
    SwaggerModule.setup(swaggerPath, app, document, {
      customSiteTitle: 'AENEWS Agent OS X - API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        tryItOutEnabled: true,
      },
    });
  }

  // ─── Graceful Shutdown ───────────────────────────────────
  app.enableShutdownHooks();

  // ─── Start Server ────────────────────────────────────────
  const port = process.env.APP_PORT || 3000;
  await app.listen(port);

  const logger = app.get('NestWinston');
  logger.log?.({
    level: 'info',
    message: `🚀 AENEWS Agent OS X running on http://localhost:${port}`,
    context: 'Bootstrap',
  });
  logger.log?.({
    level: 'info',
    message: `📚 Swagger docs available at http://localhost:${port}/${process.env.SWAGGER_PATH || 'api/docs'}`,
    context: 'Bootstrap',
  });
  logger.log?.({
    level: 'info',
    message: `🌍 Environment: ${process.env.NODE_ENV || 'development'}`,
    context: 'Bootstrap',
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('❌ Fatal error during bootstrap:', error);
  process.exit(1);
});
