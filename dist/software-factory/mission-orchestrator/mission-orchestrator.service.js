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
var MissionOrchestratorPipeline_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionOrchestratorPipeline = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const kernel_services_1 = require("../kernel/kernel-services");
const mission_contract_service_1 = require("../mission-contract/mission-contract.service");
const mission_state_machine_service_1 = require("../mission-state-machine/mission-state-machine.service");
const mission_memory_service_1 = require("../memory/mission-memory.service");
const mission_archive_service_1 = require("../archive/mission-archive.service");
const capability_registry_service_1 = require("../capability-registry/capability-registry.service");
const execution_graph_builder_service_1 = require("../execution-graph/execution-graph-builder.service");
const capability_resolver_service_1 = require("../capability-resolver/capability-resolver.service");
const worker_factory_service_1 = require("../worker-factory/worker-factory.service");
const interfaces_1 = require("../interfaces");
let MissionOrchestratorPipeline = MissionOrchestratorPipeline_1 = class MissionOrchestratorPipeline {
    constructor(orchestrator, planner, scheduler, resourceManager, securityManager, certManager, deliveryManager, monitoring, recovery, contractService, stateMachine, memoryService, archiveService, capabilityRegistry, graphBuilder, capabilityResolver, workerFactory) {
        this.orchestrator = orchestrator;
        this.planner = planner;
        this.scheduler = scheduler;
        this.resourceManager = resourceManager;
        this.securityManager = securityManager;
        this.certManager = certManager;
        this.deliveryManager = deliveryManager;
        this.monitoring = monitoring;
        this.recovery = recovery;
        this.contractService = contractService;
        this.stateMachine = stateMachine;
        this.memoryService = memoryService;
        this.archiveService = archiveService;
        this.capabilityRegistry = capabilityRegistry;
        this.graphBuilder = graphBuilder;
        this.capabilityResolver = capabilityResolver;
        this.workerFactory = workerFactory;
        this.logger = new common_1.Logger(MissionOrchestratorPipeline_1.name);
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
            this.logger.error(`Mission ${missionId} rejected: feasibility ${negotiation.feasibilityScore}`);
            const execState = this.orchestrator.registerMission(missionId, contract.id);
            return {
                missionId,
                contractId: contract.id,
                status: interfaces_1.MissionState.DRAFT,
                progress: 0,
                currentPhase: 'Rejected',
                activeWorkers: 0,
                totalCost: 0,
                startedAt: new Date(),
                errors: negotiation.warnings,
                warnings: negotiation.warnings,
            };
        }
        if (negotiation.modifiedContract) {
            this.contractService.updateContract(contract.id, negotiation.modifiedContract);
        }
        this.orchestrator.registerMission(missionId, contract.id);
        this.stateMachine.initializeMission(missionId);
        this.memoryService.storeContext(missionId, {
            instruction: request.instruction,
            contractId: contract.id,
            quality: contract.quality,
            budget: contract.budget.maxApiCostUsd,
            deadline: contract.deadline.deadline,
        });
        this.executePipeline(missionId).catch(err => {
            this.logger.error(`Pipeline failed for ${missionId}: ${err.message}`);
        });
        return {
            missionId,
            contractId: contract.id,
            status: interfaces_1.MissionState.DRAFT,
            progress: 0,
            currentPhase: 'Initializing',
            activeWorkers: 0,
            totalCost: 0,
            startedAt: new Date(),
            errors: [],
            warnings: negotiation.warnings,
        };
    }
    async executePipeline(missionId) {
        const execution = this.orchestrator.getMission(missionId);
        if (!execution)
            return;
        try {
            await this.transitionTo(missionId, interfaces_1.TransitionTrigger.SUBMIT, interfaces_1.MissionState.PLANNED);
            this.orchestrator.updateMission(missionId, { currentPhase: 'Planning', progress: 5 });
            const context = this.memoryService.getContext(missionId);
            const contract = this.getContractForMission(missionId);
            const plan = this.planner.createPlan(context?.instruction || '', context);
            this.memoryService.storePlan(missionId, plan);
            await this.transitionTo(missionId, interfaces_1.TransitionTrigger.START_RESEARCH, interfaces_1.MissionState.RESEARCH);
            this.orchestrator.updateMission(missionId, { currentPhase: 'Capability Resolution', progress: 15 });
            const resolution = this.capabilityResolver.resolve({
                missionId,
                instruction: context?.instruction || '',
                explicitCapabilities: plan.requiredCapabilities.length > 0 ? plan.requiredCapabilities : undefined,
                inferredPacks: plan.requiredPacks,
            });
            this.memoryService.storeResearch(missionId, {
                plan,
                resolution,
                requiredCapabilities: resolution.requiredCapabilities.map(c => c.capabilityId),
                packsNeeded: resolution.packsNeeded,
                confidence: resolution.confidence,
            });
            await this.transitionTo(missionId, interfaces_1.TransitionTrigger.START_BUILD, interfaces_1.MissionState.BUILDING);
            this.orchestrator.updateMission(missionId, { currentPhase: 'Building Execution Graph', progress: 25 });
            const graphPlan = this.graphBuilder.buildGraph({
                missionId,
                instruction: context?.instruction || '',
                requiredCapabilities: resolution.requiredCapabilities.map(c => c.capabilityId),
                requiredPacks: resolution.packsNeeded,
                estimatedComplexity: plan.complexity,
            });
            this.memoryService.storeBuildResults(missionId, {
                executionPlan: graphPlan,
                phases: graphPlan.phases,
                totalNodes: graphPlan.graph.nodes.length,
                totalEdges: graphPlan.graph.edges.length,
            });
            this.orchestrator.updateMission(missionId, { currentPhase: 'Spawning Workers', progress: 35 });
            for (const phase of graphPlan.phases) {
                for (const nodeId of phase.nodeIds) {
                    const node = graphPlan.graph.nodes.find(n => n.id === nodeId);
                    if (!node || node.status === interfaces_1.GraphNodeStatus.COMPLETED)
                        continue;
                    const budgetCheck = this.resourceManager.checkBudget(execution.totalCost, contract?.budget.maxApiCostUsd || 100, this.estimateNodeCost(node.capabilities));
                    if (!budgetCheck.allowed) {
                        this.graphBuilder.updateNodeStatus(missionId, nodeId, interfaces_1.GraphNodeStatus.SKIPPED);
                        continue;
                    }
                    const securityCheck = this.securityManager.validatePermissions(node.capabilities, []);
                    if (!securityCheck.allowed) {
                        this.graphBuilder.updateNodeStatus(missionId, nodeId, interfaces_1.GraphNodeStatus.FAILED);
                        continue;
                    }
                    const spawnResult = await this.workerFactory.spawn({
                        missionId,
                        capabilities: node.capabilities,
                        assignedNodeIds: [nodeId],
                    });
                    if (!spawnResult.ready) {
                        this.graphBuilder.updateNodeStatus(missionId, nodeId, interfaces_1.GraphNodeStatus.FAILED);
                        continue;
                    }
                    node.assignedWorkerId = spawnResult.workerId;
                    this.graphBuilder.updateNodeStatus(missionId, nodeId, interfaces_1.GraphNodeStatus.RUNNING);
                    const execResult = await this.workerFactory.execute({
                        workerId: spawnResult.workerId,
                        nodeId,
                        input: { missionId, instruction: context?.instruction, plan, resolution },
                    });
                    if (execResult.success) {
                        this.graphBuilder.updateNodeStatus(missionId, nodeId, interfaces_1.GraphNodeStatus.COMPLETED, {
                            success: true,
                            output: execResult.output,
                            artifacts: execResult.artifacts,
                            durationMs: execResult.durationMs,
                            costUsd: execResult.costUsd,
                        });
                        this.orchestrator.updateMission(missionId, {
                            totalCost: execution.totalCost + execResult.costUsd,
                        });
                    }
                    else {
                        const retryCount = node.retryCount || 0;
                        const maxRetries = node.maxRetries || 2;
                        const recoveryDecision = this.recovery.handleNodeFailure(missionId, nodeId, execResult.error || 'Unknown', retryCount, maxRetries);
                        if (recoveryDecision.action === 'retry') {
                            this.graphBuilder.updateNodeStatus(missionId, nodeId, interfaces_1.GraphNodeStatus.PENDING);
                            node.retryCount = retryCount + 1;
                        }
                        else {
                            this.graphBuilder.updateNodeStatus(missionId, nodeId, interfaces_1.GraphNodeStatus.FAILED, {
                                success: false,
                                output: null,
                                artifacts: [],
                                durationMs: execResult.durationMs,
                                costUsd: 0,
                                error: execResult.error,
                            });
                        }
                    }
                }
            }
            await this.transitionTo(missionId, interfaces_1.TransitionTrigger.START_TESTING, interfaces_1.MissionState.TESTING);
            this.orchestrator.updateMission(missionId, { currentPhase: 'Testing', progress: 60 });
            await this.transitionTo(missionId, interfaces_1.TransitionTrigger.START_AUDIT, interfaces_1.MissionState.AUDITING);
            this.orchestrator.updateMission(missionId, { currentPhase: 'Auditing', progress: 70 });
            const auditResults = this.certManager.certify(missionId, this.memoryService.getAllResults(missionId));
            this.memoryService.storeAuditResults(missionId, auditResults);
            await this.transitionTo(missionId, interfaces_1.TransitionTrigger.START_CERTIFICATION, interfaces_1.MissionState.CERTIFYING);
            this.orchestrator.updateMission(missionId, { currentPhase: 'Certifying', progress: 80 });
            const certResult = this.certManager.certify(missionId, this.memoryService.getAllResults(missionId));
            this.memoryService.storeCertification(missionId, certResult);
            if (!certResult.certified) {
                throw new Error(`Certification failed: ${certResult.reasons.join(', ')}`);
            }
            await this.transitionTo(missionId, interfaces_1.TransitionTrigger.START_DELIVERY, interfaces_1.MissionState.DELIVERING);
            this.orchestrator.updateMission(missionId, { currentPhase: 'Delivering', progress: 90 });
            const allResults = this.memoryService.getAllResults(missionId);
            const artifacts = this.collectArtifacts(allResults);
            this.deliveryManager.deliver(missionId, artifacts, contract);
            await this.transitionTo(missionId, interfaces_1.TransitionTrigger.MARK_COMPLETE, interfaces_1.MissionState.COMPLETED);
            this.orchestrator.updateMission(missionId, { currentPhase: 'Completed', progress: 100 });
            await this.cleanupMission(missionId);
            this.logger.log(`Mission ${missionId} completed successfully!`);
        }
        catch (error) {
            this.logger.error(`Pipeline error for ${missionId}: ${error.message}`);
            execution.errors.push(error.message);
            await this.handlePipelineError(missionId, error);
        }
    }
    getExecution(missionId) {
        const execState = this.orchestrator.getMission(missionId);
        if (!execState)
            return undefined;
        const state = this.stateMachine.getCurrentState(missionId);
        const progress = this.stateMachine.getProgress(missionId);
        const workers = this.workerFactory.getWorkersByMission(missionId);
        const contract = this.contractService.getContract(execState.contractId);
        return {
            missionId: execState.missionId,
            contractId: execState.contractId,
            status: state || execState.status,
            progress,
            currentPhase: execState.currentPhase,
            activeWorkers: workers.length,
            totalCost: contract?.budget.currentSpendUsd || execState.totalCost,
            startedAt: execState.startedAt,
            estimatedCompletion: execState.estimatedCompletion,
            errors: execState.errors,
            warnings: execState.warnings,
        };
    }
    getActiveMissions() {
        return this.orchestrator.getActiveMissions()
            .map(m => this.getExecution(m.missionId))
            .filter(Boolean);
    }
    async cancelMission(missionId) {
        const execution = this.orchestrator.getMission(missionId);
        if (!execution)
            return false;
        await this.workerFactory.terminateMissionWorkers(missionId, 'manual');
        this.stateMachine.archiveMission(missionId);
        this.orchestrator.updateMission(missionId, {
            status: interfaces_1.MissionState.ARCHIVED,
            errors: [...execution.errors, 'Mission cancelled by user'],
        });
        return true;
    }
    async transitionTo(missionId, trigger, _expectedState) {
        const execution = this.orchestrator.getMission(missionId);
        const currentState = this.stateMachine.getCurrentState(missionId) || interfaces_1.MissionState.DRAFT;
        const ctx = {
            missionId,
            contractId: execution?.contractId || '',
            currentState,
            trigger,
        };
        return this.stateMachine.transition(ctx);
    }
    getContractForMission(missionId) {
        const execution = this.orchestrator.getMission(missionId);
        if (!execution)
            return undefined;
        return this.contractService.getContract(execution.contractId);
    }
    async handlePipelineError(missionId, error) {
        const currentState = this.stateMachine.getCurrentState(missionId);
        if (!currentState)
            return;
        const strategy = this.recovery.getRollbackStrategy(currentState);
        const execution = this.orchestrator.getMission(missionId);
        if (!execution)
            return;
        execution.errors.push(error.message);
        const ctx = {
            missionId,
            contractId: execution.contractId,
            currentState,
            trigger: strategy.trigger,
            payload: { error: error.message },
        };
        await this.stateMachine.transition(ctx);
    }
    async cleanupMission(missionId) {
        await this.workerFactory.terminateMissionWorkers(missionId, 'mission_complete');
        const timeline = this.stateMachine.archiveMission(missionId);
        const execution = this.orchestrator.getMission(missionId);
        await this.archiveService.archive(missionId, {
            execution,
            timeline,
            contract: this.getContractForMission(missionId),
            memory: this.memoryService.exportMission(missionId),
            agentStats: this.workerFactory.getStatistics(),
        });
        await this.transitionTo(missionId, interfaces_1.TransitionTrigger.ARCHIVE, interfaces_1.MissionState.ARCHIVED);
        this.orchestrator.removeMission(missionId);
    }
    collectArtifacts(results) {
        const artifacts = [];
        for (const [, data] of Object.entries(results)) {
            if (data?.executionPlan) {
                artifacts.push({ name: 'execution-plan.json', type: 'plan', path: '/artifacts/execution-plan.json', size: 2000 });
            }
            if (data?.artifacts) {
                artifacts.push(...data.artifacts);
            }
        }
        artifacts.push({ name: 'README.md', type: 'readme', path: '/artifacts/README.md', size: 3000 }, { name: 'documentation', type: 'documentation', path: '/artifacts/docs/', size: 15000 });
        return artifacts;
    }
    estimateNodeCost(capabilities) {
        let total = 0;
        for (const capId of capabilities) {
            const cap = this.capabilityRegistry.getCapability(capId);
            if (cap)
                total += cap.cost.estimatedUsdPerExecution;
        }
        return total;
    }
};
exports.MissionOrchestratorPipeline = MissionOrchestratorPipeline;
exports.MissionOrchestratorPipeline = MissionOrchestratorPipeline = MissionOrchestratorPipeline_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [kernel_services_1.MissionOrchestratorService,
        kernel_services_1.MissionPlannerService,
        kernel_services_1.TaskSchedulerService,
        kernel_services_1.ResourceManagerService,
        kernel_services_1.SecurityManagerService,
        kernel_services_1.CertificationManagerService,
        kernel_services_1.DeliveryManagerService,
        kernel_services_1.MonitoringManagerService,
        kernel_services_1.RecoveryManagerService,
        mission_contract_service_1.MissionContractService,
        mission_state_machine_service_1.MissionStateMachineService,
        mission_memory_service_1.MissionMemoryService,
        mission_archive_service_1.MissionArchiveService,
        capability_registry_service_1.CapabilityRegistryService,
        execution_graph_builder_service_1.ExecutionGraphBuilderService,
        capability_resolver_service_1.CapabilityResolverService,
        worker_factory_service_1.WorkerFactoryService])
], MissionOrchestratorPipeline);
//# sourceMappingURL=mission-orchestrator.service.js.map