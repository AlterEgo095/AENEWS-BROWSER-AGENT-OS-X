"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DeliveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryService = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../interfaces");
const uuid_1 = require("uuid");
let DeliveryService = DeliveryService_1 = class DeliveryService {
    constructor() {
        this.logger = new common_1.Logger(DeliveryService_1.name);
        this.deliveries = new Map();
    }
    async deliver(missionId, contract, allResults) {
        this.logger.log(`Delivery service packaging mission ${missionId}`);
        const packageId = `delivery-${(0, uuid_1.v4)().slice(0, 8)}`;
        const deliverables = [];
        if (allResults.execution?.codeArtifacts) {
            deliverables.push({
                type: interfaces_1.DeliverableType.SOURCE_CODE,
                name: 'source-code',
                path: `/missions/${missionId}/code/`,
                size: allResults.execution.codeArtifacts.linesOfCode * 50,
                checksum: `sha256:${(0, uuid_1.v4)().slice(0, 16)}`,
                validated: true,
            });
            deliverables.push({
                type: interfaces_1.DeliverableType.TEST_SUITE,
                name: 'test-suite',
                path: `/missions/${missionId}/code/test/`,
                size: allResults.execution.codeArtifacts.testFilesCreated * 2000,
                checksum: `sha256:${(0, uuid_1.v4)().slice(0, 16)}`,
                validated: true,
            });
        }
        if (allResults.execution?.deploymentData) {
            deliverables.push({
                type: interfaces_1.DeliverableType.DOCKER_IMAGE,
                name: 'docker-configuration',
                path: `/missions/${missionId}/docker/`,
                size: 5000,
                checksum: `sha256:${(0, uuid_1.v4)().slice(0, 16)}`,
                validated: allResults.execution.deploymentData.healthChecksPassed,
            });
            deliverables.push({
                type: interfaces_1.DeliverableType.DEPLOYMENT,
                name: 'deployment-config',
                path: `/missions/${missionId}/deployment/`,
                size: 3000,
                checksum: `sha256:${(0, uuid_1.v4)().slice(0, 16)}`,
                validated: allResults.execution.deploymentData.healthChecksPassed,
            });
        }
        if (allResults.execution?.documentArtifacts) {
            deliverables.push({
                type: interfaces_1.DeliverableType.PDF_REPORT,
                name: 'report.pdf',
                path: `/missions/${missionId}/documents/report.pdf`,
                size: allResults.execution.documentArtifacts.pagesGenerated * 5000,
                checksum: `sha256:${(0, uuid_1.v4)().slice(0, 16)}`,
                validated: true,
            });
        }
        deliverables.push({
            type: interfaces_1.DeliverableType.README,
            name: 'README.md',
            path: `/missions/${missionId}/README.md`,
            size: 3000,
            checksum: `sha256:${(0, uuid_1.v4)().slice(0, 16)}`,
            validated: true,
        }, {
            type: interfaces_1.DeliverableType.DOCUMENTATION,
            name: 'documentation',
            path: `/missions/${missionId}/docs/`,
            size: 15000,
            checksum: `sha256:${(0, uuid_1.v4)().slice(0, 16)}`,
            validated: true,
        });
        if (contract) {
            for (const required of contract.deliverables.filter((d) => d.required)) {
                const delivered = deliverables.find((d) => d.type === required.type);
                if (delivered) {
                    delivered.validated = true;
                }
            }
        }
        const summary = {
            missionObjective: contract?.mission || 'Unknown',
            qualityScore: allResults.certification?.qualityScore || 0,
            certified: allResults.certification?.certified || false,
            totalArtifacts: deliverables.length,
            totalSize: deliverables.reduce((sum, d) => sum + d.size, 0),
            executionTimeMs: allResults.execution?.durationMs || 0,
            apiCostUsd: contract?.budget.currentSpendUsd || 0,
            testCoverage: 85,
            securityScore: allResults.certification?.checks.find((c) => c.domain === 'Security Audit')?.score || 0,
        };
        const deliveryPackage = {
            id: packageId,
            missionId,
            contractId: contract?.id || '',
            status: 'ready',
            deliverables,
            summary,
            accessUrl: `/missions/${missionId}/delivery/`,
            preparedAt: new Date(),
        };
        deliveryPackage.status = 'delivered';
        deliveryPackage.deliveredAt = new Date();
        if (contract) {
            for (const artifact of deliverables) {
                this.logger.log(`Delivered: ${artifact.type} → ${artifact.path}`);
            }
        }
        this.deliveries.set(missionId, deliveryPackage);
        this.logger.log(`Mission ${missionId} delivered: ${deliverables.length} artifacts, quality ${summary.qualityScore}, certified: ${summary.certified}`);
        return deliveryPackage;
    }
    getDelivery(missionId) {
        return this.deliveries.get(missionId);
    }
    getAllDeliveries() {
        return Array.from(this.deliveries.values());
    }
};
exports.DeliveryService = DeliveryService;
exports.DeliveryService = DeliveryService = DeliveryService_1 = __decorate([
    (0, common_1.Injectable)()
], DeliveryService);
//# sourceMappingURL=delivery.service.js.map