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
var IntegrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationService = void 0;
const common_1 = require("@nestjs/common");
const event_bus_service_1 = require("../agents/events/event-bus.service");
const agent_event_interface_1 = require("../agents/interfaces/agent-event.interface");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
const mission_runtime_engine_1 = require("../software-factory/runtime/mission-runtime.engine");
const mission_metrics_service_1 = require("../software-factory/runtime/mission-metrics.service");
const connector_registry_1 = require("../software-factory/connectors/connector-registry");
const agent_registry_service_1 = require("../agents/registry/agent-registry.service");
const observability_center_service_1 = require("../mission-os/observability/observability-center.service");
const auto_recovery_service_1 = require("../mission-os/auto-recovery/auto-recovery.service");
const constitutional_ai_service_1 = require("../mission-os/constitutional/constitutional-ai.service");
const human_approval_service_1 = require("../mission-os/human-approval/human-approval.service");
const mission_graph_service_1 = require("../mission-os/mission-graph/mission-graph.service");
const resource_optimizer_service_1 = require("../mission-os/resource-optimizer/resource-optimizer.service");
const security_gateway_service_1 = require("../gateway/security/security-gateway.service");
const temporal_memory_service_1 = require("../mission-os/temporal-memory/temporal-memory.service");
let IntegrationService = IntegrationService_1 = class IntegrationService {
    constructor(runtimeEngine, metricsService, connectorRegistry, agentRegistry, eventBus, observabilityCenter, autoRecovery, constitutionalAi, humanApproval, missionGraph, resourceOptimizer, temporalMemory, securityGateway, realtimeGateway) {
        this.runtimeEngine = runtimeEngine;
        this.metricsService = metricsService;
        this.connectorRegistry = connectorRegistry;
        this.agentRegistry = agentRegistry;
        this.eventBus = eventBus;
        this.observabilityCenter = observabilityCenter;
        this.autoRecovery = autoRecovery;
        this.constitutionalAi = constitutionalAi;
        this.humanApproval = humanApproval;
        this.missionGraph = missionGraph;
        this.resourceOptimizer = resourceOptimizer;
        this.temporalMemory = temporalMemory;
        this.securityGateway = securityGateway;
        this.realtimeGateway = realtimeGateway;
        this.logger = new common_1.Logger(IntegrationService_1.name);
        this.missionContexts = new Map();
        this.totalMissionsIntegrated = 0;
        this.totalAgentFailuresHandled = 0;
        this.totalConstitutionalChecks = 0;
        this.totalHumanApprovals = 0;
        this.totalRecoveryActions = 0;
    }
    async onModuleInit() {
        this.logger.log('Integration Service initializing — wiring cross-module bridges');
        this.eventBus.subscribeTo('*', async (event) => {
            await this.handleAgentEvent(event);
        });
        this.logger.log('Cross-module bridge ACTIVE: SoftwareFactory ↔ Agents ↔ MissionOS ↔ Gateway ↔ Realtime');
    }
    async executeIntegratedMission(request) {
        const missionId = `mission-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const startTime = new Date();
        const context = {
            missionId,
            instruction: request.instruction,
            status: 'pending',
            startTime,
        };
        this.missionContexts.set(missionId, context);
        this.totalMissionsIntegrated++;
        try {
            const securityCheck = await this.securityGateway.process('integration-service', 'execute_mission', 'mission_runtime', request.instruction, { permissions: ['mission:execute'], metadata: { submittedBy: request.submittedBy } });
            if (!securityCheck.allowed) {
                context.status = 'failed';
                context.errors = [
                    `Security gateway blocked: risk=${securityCheck.riskScore}, threats=${securityCheck.threats.length}`,
                ];
                return context;
            }
            const actionContext = {
                agentId: 'integration-service',
                action: 'execute_mission',
                actionType: 'execution',
                resource: 'mission_runtime',
                payload: request.instruction,
            };
            const constitutionalResult = this.constitutionalAi.evaluate(actionContext);
            this.totalConstitutionalChecks++;
            context.constitutionalCheck = constitutionalResult;
            if (!constitutionalResult.allowed) {
                context.status = 'failed';
                context.errors = [
                    `Constitutional AI violation: ${constitutionalResult.violations.map((v) => v.ruleName).join(', ')}`,
                ];
                this.realtimeGateway.pushMissionEvent(missionId, realtime_gateway_1.RealtimeEventType.SYSTEM_ALERT, {
                    type: 'constitutional_violation',
                    violations: constitutionalResult.violations.length,
                });
                return context;
            }
            if (this.requiresHumanApproval(request)) {
                context.humanApprovalRequired = true;
                this.totalHumanApprovals++;
                const riskAssessment = {
                    riskLevel: 'medium',
                    factors: ['high_budget', 'destructive_action'],
                    impactDescription: `Mission: "${request.instruction.substring(0, 100)}"`,
                    reversibility: 'partially_reversible',
                };
                const approvalRequest = this.humanApproval.requestApproval('integration-service', 'execute_mission', human_approval_service_1.ApprovalActionType.DEPLOY_PRODUCTION, { instruction: request.instruction, budgetMaxUsd: request.budgetMaxUsd }, `Mission requires human approval: "${request.instruction.substring(0, 100)}"`);
                if (approvalRequest.status === 'pending') {
                    this.realtimeGateway.pushMissionEvent(missionId, realtime_gateway_1.RealtimeEventType.SYSTEM_ALERT, {
                        type: 'human_approval_required',
                        requestId: approvalRequest.id,
                    });
                }
            }
            try {
                this.missionGraph.createMission(request.instruction.substring(0, 80), request.description || request.instruction, request.submittedBy || 'integration-service', 1);
            }
            catch (error) {
                this.logger.warn(`Mission Graph registration failed: ${error.message}`);
            }
            const allocation = this.resourceOptimizer.allocate(missionId, 'integration-service', resource_optimizer_service_1.ResourceType.LLM, { prioritize: 'balanced' });
            context.status = 'running';
            this.realtimeGateway.pushMissionEvent(missionId, realtime_gateway_1.RealtimeEventType.MISSION_RUNNING, {
                phase: 'executing',
                instruction: request.instruction.substring(0, 100),
                constitutionalCheck: 'passed',
                resourceAllocated: allocation !== null,
            });
            const result = await this.runtimeEngine.executeMission({
                instruction: request.instruction,
                description: request.description,
                quality: request.quality || 'standard',
                budgetMaxUsd: request.budgetMaxUsd,
            });
            context.status = result.success ? 'completed' : 'failed';
            context.endTime = new Date();
            context.qualityScore = result.qualityScore;
            context.certified = result.certified;
            context.totalCostUsd = result.totalCostUsd;
            context.artifacts = result.artifacts;
            context.errors = result.errors;
            this.metricsService.record({
                missionId,
                category: this.categorizeMission(request.instruction),
                instruction: request.instruction,
                success: result.success,
                certified: result.certified,
                qualityScore: result.qualityScore,
                durationMs: result.totalDurationMs,
                costUsd: result.totalCostUsd || 0,
                artifactCount: result.artifacts.length,
                totalSizeBytes: 0,
                retries: 0,
                errors: result.errors || [],
                phases: [],
            });
            try {
                this.temporalMemory.store({
                    agentId: 'integration-service',
                    content: {
                        instruction: request.instruction.substring(0, 200),
                        success: result.success,
                        qualityScore: result.qualityScore,
                        certified: result.certified,
                        duration: result.totalDurationMs,
                        cost: result.totalCostUsd,
                    },
                    summary: `Mission ${missionId}: ${result.success ? 'SUCCESS' : 'FAILED'}, score=${result.qualityScore}`,
                    timestamp: new Date(),
                    timeGranularity: temporal_memory_service_1.TimeGranularity.DAY,
                    project: null,
                    tags: ['mission', result.success ? 'success' : 'failure'],
                    importance: result.success ? 0.5 : 0.8,
                    expiresAt: null,
                    relatedEntries: [],
                });
            }
            catch (error) {
                this.logger.warn(`Temporal memory store failed: ${error.message}`);
            }
            const eventType = result.success
                ? realtime_gateway_1.RealtimeEventType.MISSION_COMPLETED
                : realtime_gateway_1.RealtimeEventType.MISSION_FAILED;
            this.realtimeGateway.pushMissionEvent(missionId, eventType, {
                qualityScore: result.qualityScore,
                certified: result.certified,
                totalDurationMs: result.totalDurationMs,
                totalCostUsd: result.totalCostUsd,
                artifactCount: result.artifacts.length,
            });
            if (allocation) {
                this.resourceOptimizer.release(allocation.id);
            }
            this.logger.log(`Integrated mission ${missionId} ${context.status}: ` +
                `score=${result.qualityScore}, certified=${result.certified}, ` +
                `duration=${result.totalDurationMs}ms, cost=$${result.totalCostUsd?.toFixed(4)}`);
            return context;
        }
        catch (error) {
            context.status = 'failed';
            context.endTime = new Date();
            context.errors = [error.message];
            await this.triggerAutoRecovery(missionId, error);
            this.realtimeGateway.pushMissionEvent(missionId, realtime_gateway_1.RealtimeEventType.MISSION_FAILED, {
                error: error.message,
                phase: 'integration',
            });
            return context;
        }
    }
    async handleAgentEvent(event) {
        try {
            switch (event.type) {
                case agent_event_interface_1.AgentEventType.AGENT_ERROR:
                case agent_event_interface_1.AgentEventType.TASK_FAILED:
                    await this.handleAgentFailure(event);
                    break;
                default:
                    break;
            }
        }
        catch (error) {
            this.logger.error(`Error handling agent event ${event.type}: ${error.message}`);
        }
    }
    async handleAgentFailure(event) {
        const agentId = event.sourceAgentId;
        const error = event.payload?.error || 'Unknown error';
        this.totalAgentFailuresHandled++;
        this.logger.warn(`Agent failure detected: ${agentId} — ${error}`);
        try {
            this.autoRecovery.detectFailure(agentId, auto_recovery_service_1.FailureType.UNHANDLED_EXCEPTION, {
                errorMessage: error,
                stackTrace: event.payload?.stack,
            });
        }
        catch (recoveryError) {
            this.logger.error(`Auto-recovery failed for agent ${agentId}: ${recoveryError.message}`);
        }
        this.realtimeGateway.pushSystemEvent(realtime_gateway_1.RealtimeEventType.SYSTEM_ALERT, {
            type: 'agent_failure',
            agentId,
            error,
            timestamp: new Date(),
        });
    }
    async checkConstitutionalCompliance(prompt) {
        this.totalConstitutionalChecks++;
        try {
            const actionContext = {
                agentId: 'integration-service',
                action: 'llm_prompt',
                actionType: 'generation',
                payload: prompt,
            };
            const result = this.constitutionalAi.evaluate(actionContext);
            return {
                allowed: result.allowed,
                reason: result.violations.length > 0 ? result.violations[0].reason : undefined,
            };
        }
        catch (error) {
            this.logger.warn(`Constitutional check failed: ${error.message}`);
            return { allowed: true };
        }
    }
    async validateAction(agentId, action, resource, input) {
        const securityResult = await this.securityGateway.process(agentId, action, resource, input);
        if (!securityResult.allowed) {
            return { allowed: false, reason: `Security: risk=${securityResult.riskScore}` };
        }
        if (action.includes('llm') || action.includes('prompt') || action.includes('generate')) {
            const constitutionalResult = await this.checkConstitutionalCompliance(typeof input === 'string' ? input : JSON.stringify(input));
            if (!constitutionalResult.allowed) {
                return { allowed: false, reason: `Constitutional: ${constitutionalResult.reason}` };
            }
        }
        return { allowed: true };
    }
    async triggerAutoRecovery(missionId, error) {
        this.totalRecoveryActions++;
        try {
            this.autoRecovery.detectFailure(`mission:${missionId}`, auto_recovery_service_1.FailureType.UNHANDLED_EXCEPTION, {
                errorMessage: error.message,
                stackTrace: error.stack,
            });
        }
        catch (recoveryError) {
            this.logger.error(`Auto-recovery trigger failed for mission ${missionId}: ${recoveryError.message}`);
        }
    }
    async getUnifiedSnapshot() {
        try {
            const factoryStats = {
                activeMissions: this.runtimeEngine.getActiveMissions().length,
                completedMissions: this.runtimeEngine.getCompletedMissions().length,
                connectorStats: this.connectorRegistry.getStatistics(),
                metrics: this.metricsService.getAggregate(),
            };
            const agentStats = {
                totalAgents: this.agentRegistry.getStats().total,
                eventBusStats: this.eventBus.getStats(),
            };
            let observabilitySnapshot = null;
            try {
                observabilitySnapshot = this.observabilityCenter.getSnapshot();
            }
            catch {
            }
            return {
                timestamp: new Date(),
                factory: factoryStats,
                agents: agentStats,
                observability: observabilitySnapshot,
                integration: this.getIntegrationStats(),
            };
        }
        catch (error) {
            return { error: error.message, timestamp: new Date() };
        }
    }
    getMissionContext(missionId) {
        return this.missionContexts.get(missionId);
    }
    getAllActiveContexts() {
        return Array.from(this.missionContexts.values()).filter((c) => c.status === 'running');
    }
    getIntegrationStats() {
        return {
            totalMissionsIntegrated: this.totalMissionsIntegrated,
            totalAgentFailuresHandled: this.totalAgentFailuresHandled,
            totalConstitutionalChecks: this.totalConstitutionalChecks,
            totalHumanApprovals: this.totalHumanApprovals,
            totalRecoveryActions: this.totalRecoveryActions,
            activeMissions: this.missionContexts.size,
        };
    }
    requiresHumanApproval(request) {
        const lower = request.instruction.toLowerCase();
        return ((request.budgetMaxUsd !== undefined && request.budgetMaxUsd > 5) ||
            lower.includes('deploy') ||
            lower.includes('delete') ||
            lower.includes('remove') ||
            lower.includes('drop') ||
            lower.includes('format'));
    }
    categorizeMission(instruction) {
        const lower = instruction.toLowerCase();
        if (lower.includes('website') || lower.includes('web app') || lower.includes('frontend'))
            return mission_metrics_service_1.MissionCategory.WEB_APP;
        if (lower.includes('scrape') || lower.includes('browse') || lower.includes('screenshot'))
            return mission_metrics_service_1.MissionCategory.AUTOMATION;
        if (lower.includes('report') || lower.includes('document') || lower.includes('pdf'))
            return mission_metrics_service_1.MissionCategory.DOCUMENT;
        if (lower.includes('market') || lower.includes('seo') || lower.includes('brand'))
            return mission_metrics_service_1.MissionCategory.SAAS;
        if (lower.includes('deploy') || lower.includes('docker') || lower.includes('ci'))
            return mission_metrics_service_1.MissionCategory.DEPLOYMENT;
        return mission_metrics_service_1.MissionCategory.WEB_APP;
    }
};
exports.IntegrationService = IntegrationService;
exports.IntegrationService = IntegrationService = IntegrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mission_runtime_engine_1.MissionRuntimeEngine,
        mission_metrics_service_1.MissionMetricsService,
        connector_registry_1.ConnectorRegistry,
        agent_registry_service_1.AgentRegistryService,
        event_bus_service_1.EventBusService,
        observability_center_service_1.ObservabilityCenterService,
        auto_recovery_service_1.AutoRecoveryService,
        constitutional_ai_service_1.ConstitutionalAiService,
        human_approval_service_1.HumanApprovalService,
        mission_graph_service_1.MissionGraphService,
        resource_optimizer_service_1.ResourceOptimizerService,
        temporal_memory_service_1.TemporalMemoryService,
        security_gateway_service_1.SecurityGatewayService,
        realtime_gateway_1.RealtimeGateway])
], IntegrationService);
//# sourceMappingURL=integration.service.js.map