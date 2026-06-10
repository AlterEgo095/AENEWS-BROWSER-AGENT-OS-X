"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConfig = void 0;
const config_1 = require("@nestjs/config");
exports.databaseConfig = (0, config_1.registerAs)('database', () => ({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'aenews',
    username: process.env.POSTGRES_USER || 'aenews',
    password: process.env.POSTGRES_PASSWORD || 'aenews_secret',
    synchronize: process.env.POSTGRES_SYNCHRONIZE === 'true',
    logging: process.env.POSTGRES_LOGGING === 'true',
    poolSize: parseInt(process.env.POSTGRES_POOL_SIZE || '20', 10),
}));
//# sourceMappingURL=database.config.js.map