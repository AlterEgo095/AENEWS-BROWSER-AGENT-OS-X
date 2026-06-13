"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MissionContractService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionContractService = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../interfaces");
const uuid_1 = require("uuid");
let MissionContractService = MissionContractService_1 = class MissionContractService {
    constructor() {
        this.logger = new common_1.Logger(MissionContractService_1.name);
        this.contracts = new Map();
        this.violations = new Map();
    }
    createContract(params) {
        const id = `contract-${(0, uuid_1.v4)().slice(0, 8)}`;
        const now = new Date();
        const contract = {
            id,
            mission: params.mission,
            description: params.description || params.mission,
            quality: params.quality || interfaces_1.MissionQuality.STANDARD,
            deadline: {
                deadline: params.deadline || new Date(now.getTime() + 48 * 60 * 60 * 1000),
                estimatedDuration: '48h',
                milestones: this.generateDefaultMilestones(params.deadline || new Date(now.getTime() + 48 * 60 * 60 * 1000)),
            },
            budget: {
                maxApiCostUsd: params.budgetMaxUsd || 20,
                currentSpendUsd: 0,
                maxComputeHours: 24,
                currentComputeHours: 0,
                maxAgentInstances: 20,
                currentAgentInstances: 0,
            },
            deliverables: this.inferDeliverables(params.deliverables, params.mission),
            acceptanceCriteria: (params.acceptanceCriteria || this.generateDefaultCriteria(params.mission)).map((desc, idx) => ({
                id: `ac-${id}-${idx}`,
                description: typeof desc === 'string' ? desc : desc.description,
                category: 'functional',
                mandatory: true,
                verified: false,
            })),
            constraints: params.constraints || [],
            createdAt: now,
            updatedAt: now,
            createdBy: params.createdBy || 'system',
            tags: params.tags || [],
            metadata: {},
        };
        this.contracts.set(id, contract);
        this.violations.set(id, []);
        this.logger.log(`Contract created: ${id} — "${params.mission}" [${contract.quality}]`);
        return contract;
    }
    negotiate(contract) {
        const warnings = [];
        let feasibilityScore = 100;
        const qualityCostMap = {
            [interfaces_1.MissionQuality.DRAFT]: 2,
            [interfaces_1.MissionQuality.STANDARD]: 10,
            [interfaces_1.MissionQuality.PROFESSIONAL]: 25,
            [interfaces_1.MissionQuality.ENTERPRISE]: 50,
            [interfaces_1.MissionQuality.MISSION_CRITICAL]: 100,
        };
        const estimatedCost = qualityCostMap[contract.quality] || 10;
        if (estimatedCost > contract.budget.maxApiCostUsd) {
            warnings.push(`Budget $${contract.budget.maxApiCostUsd} may be insufficient for ${contract.quality} quality (est. $${estimatedCost})`);
            feasibilityScore -= 30;
        }
        const deadlineMs = contract.deadline.deadline.getTime() - Date.now();
        const deliverableCount = contract.deliverables.filter(d => d.required).length;
        const estimatedDurationMs = deliverableCount * 2 * 60 * 60 * 1000;
        if (deadlineMs < estimatedDurationMs) {
            warnings.push(`Deadline may be too tight for ${deliverableCount} deliverables (est. ${estimatedDurationMs / 3600000}h)`);
            feasibilityScore -= 25;
        }
        if (contract.acceptanceCriteria.length === 0) {
            warnings.push('No acceptance criteria defined — quality validation will be minimal');
            feasibilityScore -= 15;
        }
        const modifiedContract = {};
        if (feasibilityScore < 50) {
            modifiedContract.quality = interfaces_1.MissionQuality.STANDARD;
            warnings.push('Quality downgraded to STANDARD due to feasibility concerns');
        }
        return {
            accepted: feasibilityScore >= 30,
            modifiedContract: Object.keys(modifiedContract).length > 0 ? modifiedContract : undefined,
            warnings,
            estimatedCost,
            estimatedDuration: `${Math.ceil(estimatedDurationMs / 3600000)}h`,
            feasibilityScore: Math.max(0, feasibilityScore),
        };
    }
    getContract(contractId) {
        return this.contracts.get(contractId);
    }
    updateContract(contractId, updates) {
        const contract = this.contracts.get(contractId);
        if (!contract)
            return undefined;
        Object.assign(contract, updates, { updatedAt: new Date() });
        this.contracts.set(contractId, contract);
        return contract;
    }
    trackSpend(contractId, amountUsd, computeHours = 0) {
        const contract = this.contracts.get(contractId);
        if (!contract)
            return null;
        contract.budget.currentSpendUsd += amountUsd;
        contract.budget.currentComputeHours += computeHours;
        this.contracts.set(contractId, contract);
        if (contract.budget.currentSpendUsd > contract.budget.maxApiCostUsd) {
            const violation = {
                id: `violation-${(0, uuid_1.v4)().slice(0, 8)}`,
                contractId,
                type: 'budget_exceeded',
                description: `Budget exceeded: $${contract.budget.currentSpendUsd.toFixed(2)} / $${contract.budget.maxApiCostUsd}`,
                severity: 'critical',
                detectedAt: new Date(),
                resolved: false,
            };
            const violations = this.violations.get(contractId) || [];
            violations.push(violation);
            this.violations.set(contractId, violations);
            this.logger.warn(`Contract violation: ${violation.description}`);
            return violation;
        }
        return null;
    }
    validateDeliverable(contractId, deliverableType, path) {
        const contract = this.contracts.get(contractId);
        if (!contract)
            return false;
        const deliverable = contract.deliverables.find(d => d.type === deliverableType);
        if (deliverable) {
            deliverable.validated = true;
            deliverable.path = path;
            this.contracts.set(contractId, contract);
            this.logger.log(`Deliverable validated: ${deliverableType} for contract ${contractId}`);
            return true;
        }
        return false;
    }
    verifyAcceptanceCriterion(contractId, criterionId, verifiedBy, notes) {
        const contract = this.contracts.get(contractId);
        if (!contract)
            return false;
        const criterion = contract.acceptanceCriteria.find(c => c.id === criterionId);
        if (criterion) {
            criterion.verified = true;
            criterion.verifiedBy = verifiedBy;
            criterion.verifiedAt = new Date();
            criterion.notes = notes;
            this.contracts.set(contractId, contract);
            return true;
        }
        return false;
    }
    getViolations(contractId) {
        return this.violations.get(contractId) || [];
    }
    areDeliverablesComplete(contractId) {
        const contract = this.contracts.get(contractId);
        if (!contract)
            return false;
        return contract.deliverables
            .filter(d => d.required)
            .every(d => d.validated);
    }
    areCriteriaMet(contractId) {
        const contract = this.contracts.get(contractId);
        if (!contract)
            return false;
        return contract.acceptanceCriteria
            .filter(c => c.mandatory)
            .every(c => c.verified);
    }
    getCompletionPercentage(contractId) {
        const contract = this.contracts.get(contractId);
        if (!contract)
            return 0;
        const deliverableScore = contract.deliverables.filter(d => d.validated).length / Math.max(contract.deliverables.length, 1);
        const criteriaScore = contract.acceptanceCriteria.filter(c => c.verified).length / Math.max(contract.acceptanceCriteria.length, 1);
        const budgetScore = Math.min(1, contract.budget.currentSpendUsd / Math.max(contract.budget.maxApiCostUsd, 1));
        return Math.round((deliverableScore * 0.4 + criteriaScore * 0.4 + budgetScore * 0.2) * 100);
    }
    inferDeliverables(requested, mission) {
        if (requested && requested.length > 0) {
            return requested.map(type => ({
                type,
                description: `${type} for: ${mission}`,
                required: true,
                validated: false,
            }));
        }
        const missionLower = mission.toLowerCase();
        const deliverables = [];
        deliverables.push({ type: interfaces_1.DeliverableType.README, description: 'Project README', required: true, validated: false }, { type: interfaces_1.DeliverableType.DOCUMENTATION, description: 'Technical documentation', required: true, validated: false });
        if (missionLower.includes('saas') || missionLower.includes('application') || missionLower.includes('app') || missionLower.includes('développ') || missionLower.includes('créer') || missionLower.includes('create')) {
            deliverables.push({ type: interfaces_1.DeliverableType.SOURCE_CODE, description: 'Application source code', required: true, validated: false }, { type: interfaces_1.DeliverableType.TEST_SUITE, description: 'Automated test suite', required: true, validated: false }, { type: interfaces_1.DeliverableType.DOCKER_IMAGE, description: 'Docker configuration', required: true, validated: false }, { type: interfaces_1.DeliverableType.DEPLOYMENT, description: 'Deployment scripts and configuration', required: false, validated: false });
        }
        if (missionLower.includes('rapport') || missionLower.includes('report') || missionLower.includes('audit') || missionLower.includes('analyse') || missionLower.includes('analyze')) {
            deliverables.push({ type: interfaces_1.DeliverableType.PDF_REPORT, description: 'Analysis report (PDF)', required: true, validated: false });
        }
        if (missionLower.includes('api') || missionLower.includes('backend')) {
            deliverables.push({ type: interfaces_1.DeliverableType.API_SPEC, description: 'API specification', required: true, validated: false }, { type: interfaces_1.DeliverableType.DATABASE_SCRIPT, description: 'Database migration scripts', required: false, validated: false });
        }
        if (!deliverables.find(d => d.type === interfaces_1.DeliverableType.SOURCE_CODE)) {
            deliverables.push({ type: interfaces_1.DeliverableType.SOURCE_CODE, description: 'Generated source code', required: true, validated: false });
        }
        return deliverables;
    }
    generateDefaultMilestones(deadline) {
        const totalMs = deadline.getTime() - Date.now();
        const now = Date.now();
        const states = ['PLANNED', 'RESEARCH', 'BUILDING', 'TESTING', 'AUDITING', 'CERTIFYING', 'DELIVERING'];
        const weights = [0.05, 0.15, 0.35, 0.15, 0.1, 0.1, 0.1];
        return states.map((state, idx) => {
            const offsetMs = weights.slice(0, idx + 1).reduce((a, b) => a + b, 0) * totalMs;
            return {
                name: state,
                state,
                estimatedAt: new Date(now + offsetMs),
                status: 'pending',
            };
        });
    }
    generateDefaultCriteria(mission) {
        const criteria = [
            'All required deliverables are produced and accessible',
            'No critical errors or exceptions during execution',
            'Code passes lint and compilation checks',
        ];
        const missionLower = mission.toLowerCase();
        if (missionLower.includes('test') || missionLower.includes('qa')) {
            criteria.push('Test coverage meets minimum threshold (80%)');
            criteria.push('All test cases pass successfully');
        }
        if (missionLower.includes('sécur') || missionLower.includes('security') || missionLower.includes('audit')) {
            criteria.push('Security audit passes with no critical findings');
            criteria.push('No sensitive data exposed in deliverables');
        }
        if (missionLower.includes('déploy') || missionLower.includes('deploy')) {
            criteria.push('Deployment succeeds without manual intervention');
            criteria.push('Application is accessible and responsive after deployment');
        }
        return criteria;
    }
};
exports.MissionContractService = MissionContractService;
exports.MissionContractService = MissionContractService = MissionContractService_1 = __decorate([
    (0, common_1.Injectable)()
], MissionContractService);
//# sourceMappingURL=mission-contract.service.js.map