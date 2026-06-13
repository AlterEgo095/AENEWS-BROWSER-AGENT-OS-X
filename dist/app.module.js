"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("@nestjs/typeorm");
const bull_1 = require("@nestjs/bull");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const health_module_1 = require("./health/health.module");
const agents_module_1 = require("./agents/agents.module");
const software_factory_module_1 = require("./software-factory/software-factory.module");
const software_factory_controller_1 = require("./software-factory/software-factory.controller");
const config_2 = require("./config");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [config_2.appConfig, config_2.databaseConfig, config_2.redisConfig, config_2.jwtConfig],
                envFilePath: ['.env.local', '.env'],
                cache: true,
                expandVariables: true,
            }),
            event_emitter_1.EventEmitterModule.forRoot({
                wildcard: true,
                delimiter: '.',
                newListener: false,
                removeListener: false,
                maxListeners: 20,
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'postgres',
                    host: configService.get('database.host', 'localhost'),
                    port: configService.get('database.port', 5432),
                    database: configService.get('database.database', 'aenews'),
                    username: configService.get('database.username', 'aenews'),
                    password: configService.get('database.password', 'aenews_secret'),
                    synchronize: configService.get('database.synchronize', false),
                    logging: configService.get('database.logging', false),
                    poolSize: configService.get('database.poolSize', 20),
                    autoLoadEntities: true,
                    keepConnectionAlive: true,
                    retryAttempts: 10,
                    retryDelay: 3000,
                    extra: {
                        max: configService.get('database.poolSize', 20),
                        idleTimeoutMillis: 30000,
                        connectionTimeoutMillis: 5000,
                    },
                }),
            }),
            bull_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    redis: {
                        host: configService.get('redis.host', 'localhost'),
                        port: configService.get('redis.port', 6379),
                        password: configService.get('redis.password', 'aenews_redis_secret'),
                        db: configService.get('redis.db', 1),
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
            health_module_1.HealthModule,
            agents_module_1.AgentsModule,
            software_factory_module_1.SoftwareFactoryModule,
        ],
        controllers: [app_controller_1.AppController, software_factory_controller_1.SoftwareFactoryController],
        providers: [app_service_1.AppService],
        exports: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map