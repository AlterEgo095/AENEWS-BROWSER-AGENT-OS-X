"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AppService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let AppService = AppService_1 = class AppService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(AppService_1.name);
        this.startTime = Date.now();
    }
    getInfo() {
        return {
            name: this.configService.get('app.name', 'AENEWS-Agent-OS-X'),
            version: this.configService.get('app.version', '0.0.1'),
            description: this.configService.get('app.description', 'AENEWS Agent OS X - Enterprise Autonomous Browser Platform'),
            environment: this.configService.get('app.env', 'development'),
            uptime: Date.now() - this.startTime,
            timestamp: new Date().toISOString(),
        };
    }
    getHealthStatus() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
        };
    }
};
exports.AppService = AppService;
exports.AppService = AppService = AppService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AppService);
//# sourceMappingURL=app.service.js.map