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
var CertificationController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificationController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const certification_runner_service_1 = require("./certification-runner.service");
const types_1 = require("./types");
let CertificationController = CertificationController_1 = class CertificationController {
    constructor(certificationRunner) {
        this.certificationRunner = certificationRunner;
        this.logger = new common_1.Logger(CertificationController_1.name);
    }
    async runFullCertification() {
        this.logger.log('Received request to run full certification');
        try {
            const report = await this.certificationRunner.runFullCertification();
            return report;
        }
        catch (error) {
            const message = error.message;
            if (message.includes('already in progress')) {
                throw new common_1.HttpException({
                    statusCode: common_1.HttpStatus.CONFLICT,
                    message: 'A certification run is already in progress. Please wait for it to complete.',
                    error: 'Conflict',
                }, common_1.HttpStatus.CONFLICT);
            }
            this.logger.error(`Certification run failed: ${message}`);
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: `Certification run failed: ${message}`,
                error: 'Internal Server Error',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getStatus() {
        const status = this.certificationRunner.getStatus();
        return {
            ...status,
            level: status.level,
        };
    }
    async getReport() {
        const report = this.certificationRunner.getLastReport();
        if (!report) {
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.NOT_FOUND,
                message: 'No certification report available. Run a certification first using GET /certification/run',
                error: 'Not Found',
            }, common_1.HttpStatus.NOT_FOUND);
        }
        return report;
    }
    async runDomainCertification(domain) {
        this.logger.log(`Received request to run domain certification: ${domain}`);
        const validDomains = Object.values(types_1.CertificationDomain);
        if (!validDomains.includes(domain)) {
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.BAD_REQUEST,
                message: `Invalid domain: '${domain}'. Valid domains: ${validDomains.join(', ')}`,
                error: 'Bad Request',
            }, common_1.HttpStatus.BAD_REQUEST);
        }
        try {
            const result = await this.certificationRunner.runDomainCertification(domain);
            return result;
        }
        catch (error) {
            const message = error.message;
            this.logger.error(`Domain certification failed: ${message}`);
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: `Domain certification failed: ${message}`,
                error: 'Internal Server Error',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.CertificationController = CertificationController;
__decorate([
    (0, common_1.Get)('run'),
    (0, swagger_1.ApiOperation)({
        summary: 'Run full certification suite',
        description: 'Executes all certification domain tests, calculates EQI, ' +
            'and returns a comprehensive certification report.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Certification report generated successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'A certification run is already in progress',
    }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CertificationController.prototype, "runFullCertification", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get last certification status',
        description: 'Returns the lightweight status of the last certification run, ' +
            'including EQI score, certification level, and approval status.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Certification status retrieved',
    }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CertificationController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('report'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get last certification report',
        description: 'Returns the full certification report from the last run, ' +
            'including all domain results, test details, recommendations, ' +
            'and critical issues.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Certification report retrieved',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'No certification report available',
    }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CertificationController.prototype, "getReport", null);
__decorate([
    (0, common_1.Post)('domain/:domain'),
    (0, swagger_1.ApiOperation)({
        summary: 'Run specific domain certification',
        description: 'Runs the certification test suite for a specific domain only. ' +
            'Available domains: architecture, tests, orchestration, agents, ' +
            'browser, memory, security, performance, documentation.',
    }),
    (0, swagger_1.ApiParam)({
        name: 'domain',
        description: 'The certification domain to run',
        enum: types_1.CertificationDomain,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Domain certification result',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid domain specified',
    }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('domain')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CertificationController.prototype, "runDomainCertification", null);
exports.CertificationController = CertificationController = CertificationController_1 = __decorate([
    (0, swagger_1.ApiTags)('certification'),
    (0, common_1.Controller)('certification'),
    __metadata("design:paramtypes", [certification_runner_service_1.CertificationRunnerService])
], CertificationController);
//# sourceMappingURL=certification.controller.js.map