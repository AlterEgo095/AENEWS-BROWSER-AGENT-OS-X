"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const nest_winston_1 = require("nest-winston");
const winston = __importStar(require("winston"));
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
    });
    const logLevel = process.env.LOG_LEVEL || 'info';
    const logFormat = process.env.LOG_FORMAT || 'json';
    const logDir = process.env.LOG_DIR || 'logs';
    const winstonFormat = logFormat === 'json'
        ? winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json())
        : winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.colorize(), winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            const ctx = context || 'Application';
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} [${level}] [${ctx}] ${message} ${metaStr}`;
        }));
    app.useLogger(nest_winston_1.WinstonModule.createLogger({
        level: logLevel,
        format: winstonFormat,
        transports: [
            new winston.transports.Console(),
            new winston.transports.File({
                filename: `${logDir}/error.log`,
                level: 'error',
                maxsize: 10 * 1024 * 1024,
                maxFiles: 5,
            }),
            new winston.transports.File({
                filename: `${logDir}/combined.log`,
                maxsize: 10 * 1024 * 1024,
                maxFiles: 10,
            }),
        ],
        exceptionHandlers: [new winston.transports.File({ filename: `${logDir}/exceptions.log` })],
        rejectionHandlers: [new winston.transports.File({ filename: `${logDir}/rejections.log` })],
    }));
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
    const helmet = await Promise.resolve().then(() => __importStar(require('helmet')));
    app.use(helmet.default());
    const compression = await Promise.resolve().then(() => __importStar(require('compression')));
    app.use(compression.default());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
        disableErrorMessages: process.env.NODE_ENV === 'production',
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new transform_interceptor_1.TransformInterceptor(), new logging_interceptor_1.LoggingInterceptor());
    app.enableVersioning({
        type: common_1.VersioningType.URI,
        defaultVersion: '1',
    });
    app.setGlobalPrefix('api', {
        exclude: ['health', 'health/live', 'health/ready'],
    });
    const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
    if (swaggerEnabled) {
        const config = new swagger_1.DocumentBuilder()
            .setTitle(process.env.SWAGGER_TITLE || 'AENEWS Agent OS X API')
            .setDescription(process.env.SWAGGER_DESCRIPTION || 'Enterprise Autonomous Browser Platform API')
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
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        const swaggerPath = process.env.SWAGGER_PATH || 'api/docs';
        swagger_1.SwaggerModule.setup(swaggerPath, app, document, {
            customSiteTitle: 'AENEWS Agent OS X - API Documentation',
            swaggerOptions: {
                persistAuthorization: true,
                displayRequestDuration: true,
                tryItOutEnabled: true,
            },
        });
    }
    app.enableShutdownHooks();
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
    console.error('❌ Fatal error during bootstrap:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map