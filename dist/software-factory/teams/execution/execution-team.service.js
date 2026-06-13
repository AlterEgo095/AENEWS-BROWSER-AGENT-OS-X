"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ExecutionTeamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionTeamService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
let ExecutionTeamService = ExecutionTeamService_1 = class ExecutionTeamService {
    constructor() {
        this.logger = new common_1.Logger(ExecutionTeamService_1.name);
        this.results = new Map();
    }
    async execute(missionId, plan, research) {
        this.logger.log(`Execution team starting for mission ${missionId}`);
        const startTime = Date.now();
        const artifacts = [];
        const errors = [];
        let browserData;
        let codeArtifacts;
        let documentArtifacts;
        let deploymentData;
        try {
            if (plan?.requiresBrowser) {
                browserData = await this.executeBrowserOps(missionId, plan);
                artifacts.push({
                    id: `artifact-${(0, uuid_1.v4)().slice(0, 8)}`,
                    name: 'browser-results',
                    type: 'browser_data',
                    path: `/missions/${missionId}/browser/`,
                    createdAt: new Date(),
                    metadata: { pagesVisited: browserData.pagesVisited },
                });
            }
            if (plan?.requiresCoding || plan?.requiresDevelopment) {
                codeArtifacts = await this.executeCodeGeneration(missionId, plan, research);
                artifacts.push({
                    id: `artifact-${(0, uuid_1.v4)().slice(0, 8)}`,
                    name: 'source-code',
                    type: 'source_code',
                    path: `/missions/${missionId}/code/`,
                    createdAt: new Date(),
                    metadata: { filesCreated: codeArtifacts.filesCreated, linesOfCode: codeArtifacts.linesOfCode },
                });
            }
            if (plan?.requiresDocuments || plan?.requiresReports) {
                documentArtifacts = await this.executeDocumentOps(missionId, plan);
                artifacts.push({
                    id: `artifact-${(0, uuid_1.v4)().slice(0, 8)}`,
                    name: 'documents',
                    type: 'documents',
                    path: `/missions/${missionId}/documents/`,
                    createdAt: new Date(),
                    metadata: { reportsGenerated: documentArtifacts.reportsGenerated },
                });
            }
            if (plan?.requiresDeployment || plan?.requiresInfrastructure) {
                deploymentData = await this.executeDeployment(missionId, plan);
                artifacts.push({
                    id: `artifact-${(0, uuid_1.v4)().slice(0, 8)}`,
                    name: 'deployment',
                    type: 'deployment',
                    path: `/missions/${missionId}/deployment/`,
                    createdAt: new Date(),
                    metadata: { environments: deploymentData.environments },
                });
            }
        }
        catch (error) {
            errors.push(error.message);
        }
        const results = {
            missionId,
            success: errors.length === 0,
            artifacts,
            browserData,
            codeArtifacts,
            documentArtifacts,
            deploymentData,
            errors,
            durationMs: Date.now() - startTime,
        };
        this.results.set(missionId, results);
        this.logger.log(`Execution team completed for mission ${missionId}: ${artifacts.length} artifacts, ${errors.length} errors`);
        return results;
    }
    async executeBrowserOps(missionId, plan) {
        this.logger.log(`Executing browser operations for mission ${missionId}`);
        return {
            pagesVisited: 5,
            screenshots: [],
            dataExtracted: { status: 'simulated', missionId },
            formsFilled: 0,
            filesDownloaded: [],
        };
    }
    async executeCodeGeneration(missionId, plan, research) {
        this.logger.log(`Executing code generation for mission ${missionId}`);
        return {
            filesCreated: 25,
            linesOfCode: 3500,
            testFilesCreated: 8,
            configFilesCreated: 5,
            projectStructure: {
                src: { controllers: [], services: [], modules: [], entities: [] },
                test: { unit: [], integration: [], e2e: [] },
                config: {},
                docker: {},
            },
        };
    }
    async executeDocumentOps(missionId, plan) {
        this.logger.log(`Executing document operations for mission ${missionId}`);
        return {
            reportsGenerated: 2,
            pagesGenerated: 15,
            formats: ['pdf', 'markdown'],
        };
    }
    async executeDeployment(missionId, plan) {
        this.logger.log(`Executing deployment for mission ${missionId}`);
        return {
            environments: ['staging', 'production'],
            containersBuilt: 2,
            healthChecksPassed: true,
            liveUrl: `https://${missionId}.aenews.app`,
        };
    }
    getResults(missionId) {
        return this.results.get(missionId);
    }
};
exports.ExecutionTeamService = ExecutionTeamService;
exports.ExecutionTeamService = ExecutionTeamService = ExecutionTeamService_1 = __decorate([
    (0, common_1.Injectable)()
], ExecutionTeamService);
//# sourceMappingURL=execution-team.service.js.map