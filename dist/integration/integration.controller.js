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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const integration_service_1 = require("./integration.service");
let IntegrationController = class IntegrationController {
    constructor(integration) {
        this.integration = integration;
    }
    async executeIntegratedMission(body) {
        const context = await this.integration.executeIntegratedMission(body);
        return {
            success: context.status !== 'failed',
            data: context,
        };
    }
    getMissionContext(id) {
        const context = this.integration.getMissionContext(id);
        if (!context)
            return { success: false, error: 'Mission context not found' };
        return { success: true, data: context };
    }
    getActiveMissions() {
        return {
            success: true,
            data: this.integration.getAllActiveContexts(),
        };
    }
    async getUnifiedSnapshot() {
        const snapshot = await this.integration.getUnifiedSnapshot();
        return { success: true, data: snapshot };
    }
    getIntegrationStats() {
        return {
            success: true,
            data: this.integration.getIntegrationStats(),
        };
    }
    async checkConstitutionalCompliance(body) {
        const result = await this.integration.checkConstitutionalCompliance(body.prompt);
        return { success: true, data: result };
    }
    async validateAction(body) {
        const result = await this.integration.validateAction(body.agentId, body.action, body.resource, body.input);
        return { success: result.allowed, data: result };
    }
};
exports.IntegrationController = IntegrationController;
__decorate([
    (0, common_1.Post)('missions/execute'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    openapi.ApiResponse({ status: common_1.HttpStatus.ACCEPTED }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IntegrationController.prototype, "executeIntegratedMission", null);
__decorate([
    openapi.ApiOperation({ description: "Get context for an integrated mission\nGET /api/integration/missions/:id" }),
    (0, common_1.Get)('missions/:id'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Body)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], IntegrationController.prototype, "getMissionContext", null);
__decorate([
    openapi.ApiOperation({ description: "Get all active integrated mission contexts\nGET /api/integration/missions/active" }),
    (0, common_1.Get)('missions/active'),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IntegrationController.prototype, "getActiveMissions", null);
__decorate([
    (0, common_1.Get)('observability'),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IntegrationController.prototype, "getUnifiedSnapshot", null);
__decorate([
    (0, common_1.Get)('stats'),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IntegrationController.prototype, "getIntegrationStats", null);
__decorate([
    (0, common_1.Post)('constitutional/check'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IntegrationController.prototype, "checkConstitutionalCompliance", null);
__decorate([
    (0, common_1.Post)('validate'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IntegrationController.prototype, "validateAction", null);
exports.IntegrationController = IntegrationController = __decorate([
    (0, common_1.Controller)('api/integration'),
    __metadata("design:paramtypes", [integration_service_1.IntegrationService])
], IntegrationController);
//# sourceMappingURL=integration.controller.js.map