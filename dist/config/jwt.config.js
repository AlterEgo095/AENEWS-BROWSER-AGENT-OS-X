"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtConfig = void 0;
const config_1 = require("@nestjs/config");
exports.jwtConfig = (0, config_1.registerAs)('jwt', () => ({
    secret: process.env.JWT_SECRET || 'change-me-to-a-secure-random-string-in-production',
    expiration: process.env.JWT_EXPIRATION || '24h',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
//# sourceMappingURL=jwt.config.js.map