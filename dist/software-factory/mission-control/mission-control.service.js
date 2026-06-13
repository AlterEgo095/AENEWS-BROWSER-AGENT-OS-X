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
var MissionControlService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionControlService = void 0;
const common_1 = require("@nestjs/common");
const mission_contract_service_1 = require("../mission-contract/mission-contract.service");
const mission_state_machine_service_1 = require("../mission-state-machine/mission-state-machine.service");
const interfaces_1 = require("../interfaces");
const agent_pool_service_1 = require("../agent-pool/agent-pool.service");
const planning_team_service_1 = require("../teams/planning/planning-team.service");
const execution_team_service_1 = require("../teams/execution/execution-team.service");
const certification_team_service_1 = require("../teams/certification/certification-team.service");
const delivery_service_1 = require("../delivery/delivery.service");
const mission_memory_service_1 = require("../memory/mission-memory.service");
const mission_archive_service_1 = require("../archive/mission-archive.service");
const interfaces_2 = require("../interfaces");
const uuid_1 = require("uuid");
let MissionControlService = MissionControlService_1 = class MissionControlService {
    constructor(contractService, stateMachine, agentPool, planningTeam, executionTeam, certificationTeam, deliveryService, memoryService, archiveService) {
        this.contractService = contractService;
        this.stateMachine = stateMachine;
        this.agentPool = agentPool;
        this.planningTeam = planningTeam;
        this.executionTeam = executionTeam;
        this.certificationTeam = certificationTeam;
        this.deliveryService = deliveryService;
        this.memoryService = memoryService;
        this.archiveService = archiveService;
        this.logger = new common_1.Logger(MissionControlService_1.name);
        this.executions = new Map();
    }
    async submitMission(request) {
        const missionId = `mission-${(0, uuid_1.v4)().slice(0, 8)}`;
        this.logger.log(`New mission submitted: ${missionId} — "${request.instruction}"`);
        const contract = this.contractService.createContract({
            mission: request.instruction,
            description: request.description,
            quality: request.quality,
            deadline: request.deadline,
            budgetMaxUsd: request.budgetMaxUsd,
            deliverables: request.deliverables,
            tags: request.tags,
            createdBy: request.createdBy,
        });
        const negotiation = this.contractService.negotiate(contract);
        if (!negotiation.accepted) {
            this.logger.error(`Mission ${missionId} rejected: feasibility score ${negotiation.feasibilityScore}`);
            return this.createExecution(missionId, contract.id, interfaces_1.MissionState.DRAFT, negotiation.warnings);
        }
        if (negotiation.modifiedContract) {
            this.contractService.updateContract(contract.id, negotiation.modifiedContract);
        }
        this.stateMachine.initializeMission(missionId);
        this.memoryService.storeContext(missionId, {
            instruction: request.instruction,
            contractId: contract.id,
            quality: contract.quality,
            budget: contract.budget.maxApiCostUsd,
            deadline: contract.deadline.deadline,
        });
        const execution = this.createExecution(missionId, contract.id, interfaces_1.MissionState.DRAFT, negotiation.warnings);
        this.executePipeline(missionId).catch(err => {
            this.logger.error(`Pipeline failed for mission ${missionId}: ${err.message}`);
            execution.errors.push(err.message);
        });
        return execution;
    }
    async executePipeline(missionId) {
        const execution = this.executions.get(missionId);
        if (!execution)
            return;
        try {
            await this.transitionTo(missionId, interfaces_1.TransitionTrigger.SUBMIT, interfaces_1.MissionState.PLANNED);
            execution.currentPhase = 'Planning';
            await this.runPlanningPhase(missionId);
            await this.transitionTo(missionId, interfaces_1.TransitionTrigger.START_RESEARCH, interfaces_1.MissionState.RESEARCH);
            execution.currentPhase = 'Research';
            await this.runResearchPhase(missionId);
            await this.transitionTo(missionId, interfaces_1.TransitionTrigger.START_BUILD, interfaces_1.MissionState.BUILDING);
            execution.currentPhase = 'Building';
            await this.runBuildingPhase(missionId);
            await this.transitionTo(missionId, interfaces_1.TransitionTrigger.START_TESTING, interfaces_1.MissionState.TESTING);
            execution.currentPhase = 'Testing';
            await this.runTestingPhase(missionId);
            await this.transitionTo(missionId, interfaces_1.TransitionTrigger.START_AUDIT, interfaces_1.MissionState.AUDITING);
            execution.currentPhase = 'Auditing';
            await this.runAuditingPhase(missionId);
            await this.transitionTo(missionId, interfaces_1.TransitionTrigger.START_CERTIFICATION, interfaces_1.MissionState.CERTIFYING);
            execution.currentPhase = 'Certifying';
            await this.runCertificationPhase(missionId);
            await this.transitionTo(missionId, interfaces_1.TransitionTrigger.START_DELIVERY, interfaces_1.MissionState.DELIVERING);
            execution.currentPhase = 'Delivering';
            await this.runDeliveryPhase(missionId);
            await this.transitionTo(missionId, interfaces_1.TransitionTrigger.MARK_COMPLETE, interfaces_1.MissionState.COMPLETED);
            execution.currentPhase = 'Completed';
            await this.cleanupMission(missionId);
            this.logger.log(`Mission ${missionId} completed successfully!`);
        }
        catch (error) {
            this.logger.error(`Pipeline error for mission ${missionId}: ${error.message}`);
            execution.errors.push(error.message);
            await this.handlePipelineError(missionId, error);
        }
    }
    async runPlanningPhase(missionId) {
        const context = this.memoryService.getContext(missionId);
        const contract = this.getContractForMission(missionId);
        const researcher = await this.agentPool.spawn({
            missionId,
            role: interfaces_2.AgentRole.RESEARCHER,
            skills: ['web_search', 'data_analysis', 'market_research'],
        });
        const architect = await this.agentPool.spawn({
            missionId,
            role: interfaces_2.AgentRole.ARCHITECT,
            skills: ['system_design', 'technology_selection', 'architecture_patterns'],
        });
        const businessAnalyst = await this.agentPool.spawn({
            missionId,
            role: interfaces_2.AgentRole.BUSINESS_ANALYST,
            skills: ['requirements_analysis', 'feasibility_assessment', 'cost_estimation'],
        });
        const plan = await this.planningTeam.createPlan(missionId, context || {}, contract);
        this.memoryService.storePlan(missionId, plan);
        for (const agent of this.agentPool.getAgentsByMission(missionId)) {
            this.agentPool.completeTask(agent.id, 0.5, true);
        }
    }
    async runResearchPhase(missionId) {
        const plan = this.memoryService.getPlan(missionId);
        const researchResults = await this.planningTeam.executeResearch(missionId, plan);
        this.memoryService.storeResearch(missionId, researchResults);
        for (const agent of this.agentPool.getAgentsByMission(missionId)) {
            if (agent.role === interfaces_2.AgentRole.RESEARCHER || agent.role === interfaces_2.AgentRole.BUSINESS_ANALYST) {
                await this.agentPool.terminate({
                    agentId: agent.id,
                    reason: 'mission_complete',
                    archiveResults: true,
                });
            }
        }
    }
    async runBuildingPhase(missionId) {
        const plan = this.memoryService.getPlan(missionId);
        const research = this.memoryService.getResearch(missionId);
        const neededRoles = this.inferRequiredRoles(plan);
        for (const role of neededRoles) {
            await this.agentPool.spawn({
                missionId,
                role,
                skills: this.getSkillsForRole(role),
            });
        }
        const buildResults = await this.executionTeam.execute(missionId, plan, research);
        this.memoryService.storeBuildResults(missionId, buildResults);
    }
    async runTestingPhase(missionId) {
        const buildResults = this.memoryService.getBuildResults(missionId);
        await this.agentPool.spawn({
            missionId,
            role: interfaces_2.AgentRole.QA_TESTER,
            skills: ['unit_testing', 'integration_testing', 'e2e_testing'],
        });
        await this.agentPool.spawn({
            missionId,
            role: interfaces_2.AgentRole.PERFORMANCE_TESTER,
            skills: ['load_testing', 'stress_testing', 'benchmarking'],
        });
        const testResults = await this.certificationTeam.runTests(missionId, buildResults);
        this.memoryService.storeTestResults(missionId, testResults);
        if (!testResults.success) {
            throw new Error(`Tests failed: ${testResults.errors.join(', ')}`);
        }
    }
    async runAuditingPhase(missionId) {
        await this.agentPool.spawn({
            missionId,
            role: interfaces_2.AgentRole.SECURITY_AUDITOR,
            skills: ['vulnerability_scan', 'code_audit', 'compliance_check'],
        });
        const auditResults = await this.certificationTeam.runAudit(missionId);
        this.memoryService.storeAuditResults(missionId, auditResults);
        if (!auditResults.passed) {
            throw new Error(`Audit failed: ${auditResults.findings.join(', ')}`);
        }
    }
    async runCertificationPhase(missionId) {
        await this.agentPool.spawn({
            missionId,
            role: interfaces_2.AgentRole.DOCUMENTATION_WRITER,
            skills: ['technical_writing', 'api_documentation', 'readme_generation'],
        });
        const certResult = await this.certificationTeam.certify(missionId);
        this.memoryService.storeCertification(missionId, certResult);
        if (!certResult.certified) {
            throw new Error(`Certification failed: ${certResult.reasons.join(', ')}`);
        }
    }
    async runDeliveryPhase(missionId) {
        const contract = this.getContractForMission(missionId);
        const allResults = this.memoryService.getAllResults(missionId);
        await this.deliveryService.deliver(missionId, contract, allResults);
    }
    async cleanupMission(missionId) {
        await this.agentPool.terminateMissionAgents(missionId, 'mission_complete');
        const timeline = this.stateMachine.archiveMission(missionId);
        const execution = this.executions.get(missionId);
        await this.archiveService.archive(missionId, {
            execution,
            timeline,
            contract: this.getContractForMission(missionId),
            memory: this.memoryService.exportMission(missionId),
            agentStats: this.agentPool.getStatistics(),
        });
        await this.transitionTo(missionId, interfaces_1.TransitionTrigger.ARCHIVE, interfaces_1.MissionState.ARCHIVED);
    }
    async handlePipelineError(missionId, error) {
        const currentState = this.stateMachine.getCurrentState(missionId);
        const execution = this.executions.get(missionId);
        if (!execution)
            return;
        execution.errors.push(error.message);
        const rollbackMap = {
            [interfaces_1.MissionState.RESEARCH]: interfaces_1.TransitionTrigger.ROLLBACK,
            [interfaces_1.MissionState.BUILDING]: interfaces_1.TransitionTrigger.ROLLBACK,
            [interfaces_1.MissionState.TESTING]: interfaces_1.TransitionTrigger.ROLLBACK,
            [interfaces_1.MissionState.AUDITING]: interfaces_1.TransitionTrigger.ROLLBACK,
            [interfaces_1.MissionState.CERTIFYING]: interfaces_1.TransitionTrigger.ROLLBACK,
            [interfaces_1.MissionState.DELIVERING]: interfaces_1.TransitionTrigger.ROLLBACK,
        };
        const rollbackTrigger = rollbackMap[currentState || interfaces_1.MissionState.DRAFT];
        if (rollbackTrigger) {
            const context = {
                missionId,
                contractId: execution.contractId,
                currentState: currentState || interfaces_1.MissionState.DRAFT,
                trigger: rollbackTrigger,
                payload: { error: error.message },
            };
            await this.stateMachine.transition(context);
        }
    }
    getExecution(missionId) {
        const execution = this.executions.get(missionId);
        if (!execution)
            return undefined;
        const state = this.stateMachine.getCurrentState(missionId);
        if (state) {
            execution.status = state;
            execution.progress = this.stateMachine.getProgress(missionId);
        }
        const agents = this.agentPool.getAgentsByMission(missionId);
        execution.activeAgents = agents.length;
        const contract = this.contractService.getContract(execution.contractId);
        if (contract) {
            execution.totalCost = contract.budget.currentSpendUsd;
        }
        return execution;
    }
    getActiveMissions() {
        return Array.from(this.executions.values()).filter(e => e.status !== interfaces_1.MissionState.ARCHIVED && e.status !== interfaces_1.MissionState.COMPLETED);
    }
    async cancelMission(missionId) {
        const execution = this.executions.get(missionId);
        if (!execution)
            return false;
        await this.agentPool.terminateMissionAgents(missionId, 'manual');
        this.stateMachine.archiveMission(missionId);
        execution.status = interfaces_1.MissionState.ARCHIVED;
        execution.errors.push('Mission cancelled by user');
        this.logger.log(`Mission ${missionId} cancelled`);
        return true;
    }
    createExecution(missionId, contractId, status, warnings) {
        const execution = {
            missionId,
            contractId,
            status,
            progress: 0,
            currentPhase: 'Draft',
            activeAgents: 0,
            totalCost: 0,
            startedAt: new Date(),
            errors: [],
            warnings,
        };
        this.executions.set(missionId, execution);
        return execution;
    }
    async transitionTo(missionId, trigger, expectedState) {
        const execution = this.executions.get(missionId);
        const currentState = this.stateMachine.getCurrentState(missionId) || interfaces_1.MissionState.DRAFT;
        const context = {
            missionId,
            contractId: execution?.contractId || '',
            currentState,
            trigger,
        };
        const result = await this.stateMachine.transition(context);
        if (!result.success) {
            this.logger.warn(`Transition failed: ${currentState} + ${trigger} → ${result.error}`);
        }
        return result;
    }
    getContractForMission(missionId) {
        const execution = this.executions.get(missionId);
        if (!execution)
            return undefined;
        return this.contractService.getContract(execution.contractId);
    }
    inferRequiredRoles(plan) {
        const roles = [];
        if (plan?.requiresBrowser || plan?.requiresWebScraping) {
            roles.push(interfaces_2.AgentRole.BROWSER_OPERATOR);
        }
        if (plan?.requiresCoding || plan?.requiresDevelopment) {
            roles.push(interfaces_2.AgentRole.CODER);
        }
        if (plan?.requiresDocuments || plan?.requiresReports) {
            roles.push(interfaces_2.AgentRole.OFFICE_OPERATOR);
        }
        if (plan?.requiresDeployment || plan?.requiresInfrastructure) {
            roles.push(interfaces_2.AgentRole.DEPLOYER);
        }
        if (roles.length === 0) {
            roles.push(interfaces_2.AgentRole.CODER);
        }
        return roles;
    }
    getSkillsForRole(role) {
        const skillMap = {
            [interfaces_2.AgentRole.RESEARCHER]: ['web_search', 'data_analysis', 'market_research'],
            [interfaces_2.AgentRole.ARCHITECT]: ['system_design', 'technology_selection'],
            [interfaces_2.AgentRole.BUSINESS_ANALYST]: ['requirements_analysis', 'cost_estimation'],
            [interfaces_2.AgentRole.MARKETING_STRATEGIST]: ['seo', 'content_strategy', 'campaign_planning'],
            [interfaces_2.AgentRole.BROWSER_OPERATOR]: ['navigation', 'form_filling', 'data_extraction', 'screenshots'],
            [interfaces_2.AgentRole.CODER]: ['code_generation', 'debugging', 'testing', 'refactoring'],
            [interfaces_2.AgentRole.OFFICE_OPERATOR]: ['document_generation', 'pdf_creation', 'spreadsheet'],
            [interfaces_2.AgentRole.DEPLOYER]: ['docker', 'cicd', 'cloud_deployment', 'monitoring'],
            [interfaces_2.AgentRole.QA_TESTER]: ['unit_testing', 'integration_testing', 'e2e_testing'],
            [interfaces_2.AgentRole.SECURITY_AUDITOR]: ['vulnerability_scan', 'code_audit', 'compliance'],
            [interfaces_2.AgentRole.PERFORMANCE_TESTER]: ['load_testing', 'stress_testing', 'benchmarking'],
            [interfaces_2.AgentRole.DOCUMENTATION_WRITER]: ['technical_writing', 'api_docs', 'readme'],
        };
        return skillMap[role] || [];
    }
};
exports.MissionControlService = MissionControlService;
exports.MissionControlService = MissionControlService = MissionControlService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mission_contract_service_1.MissionContractService,
        mission_state_machine_service_1.MissionStateMachineService,
        agent_pool_service_1.AgentPoolService,
        planning_team_service_1.PlanningTeamService,
        execution_team_service_1.ExecutionTeamService,
        certification_team_service_1.CertificationTeamService,
        delivery_service_1.DeliveryService,
        mission_memory_service_1.MissionMemoryService,
        mission_archive_service_1.MissionArchiveService])
], MissionControlService);
//# sourceMappingURL=mission-control.service.js.map