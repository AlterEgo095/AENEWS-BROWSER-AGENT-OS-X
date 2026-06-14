import { OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../agents/events/event-bus.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { MissionRuntimeEngine } from '../software-factory/runtime/mission-runtime.engine';
import { MissionMetricsService } from '../software-factory/runtime/mission-metrics.service';
import { ConnectorRegistry } from '../software-factory/connectors/connector-registry';
import { AgentRegistryService } from '../agents/registry/agent-registry.service';
import { ObservabilityCenterService } from '../mission-os/observability/observability-center.service';
import { AutoRecoveryService } from '../mission-os/auto-recovery/auto-recovery.service';
import { ConstitutionalAiService } from '../mission-os/constitutional/constitutional-ai.service';
import { HumanApprovalService } from '../mission-os/human-approval/human-approval.service';
import { MissionGraphService } from '../mission-os/mission-graph/mission-graph.service';
import { ResourceOptimizerService } from '../mission-os/resource-optimizer/resource-optimizer.service';
import { SecurityGatewayService } from '../gateway/security/security-gateway.service';
import { TemporalMemoryService } from '../mission-os/temporal-memory/temporal-memory.service';
export interface MissionIntegrationContext {
    missionId: string;
    instruction: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    startTime?: Date;
    endTime?: Date;
    qualityScore?: number;
    certified?: boolean;
    totalCostUsd?: number;
    artifacts?: any[];
    errors?: string[];
    constitutionalCheck?: any;
    humanApprovalRequired?: boolean;
    recoveryAttempts?: number;
}
export declare class IntegrationService implements OnModuleInit {
    private readonly runtimeEngine;
    private readonly metricsService;
    private readonly connectorRegistry;
    private readonly agentRegistry;
    private readonly eventBus;
    private readonly observabilityCenter;
    private readonly autoRecovery;
    private readonly constitutionalAi;
    private readonly humanApproval;
    private readonly missionGraph;
    private readonly resourceOptimizer;
    private readonly temporalMemory;
    private readonly securityGateway;
    private readonly realtimeGateway;
    private readonly logger;
    private readonly missionContexts;
    private totalMissionsIntegrated;
    private totalAgentFailuresHandled;
    private totalConstitutionalChecks;
    private totalHumanApprovals;
    private totalRecoveryActions;
    constructor(runtimeEngine: MissionRuntimeEngine, metricsService: MissionMetricsService, connectorRegistry: ConnectorRegistry, agentRegistry: AgentRegistryService, eventBus: EventBusService, observabilityCenter: ObservabilityCenterService, autoRecovery: AutoRecoveryService, constitutionalAi: ConstitutionalAiService, humanApproval: HumanApprovalService, missionGraph: MissionGraphService, resourceOptimizer: ResourceOptimizerService, temporalMemory: TemporalMemoryService, securityGateway: SecurityGatewayService, realtimeGateway: RealtimeGateway);
    onModuleInit(): Promise<void>;
    executeIntegratedMission(request: {
        instruction: string;
        description?: string;
        quality?: string;
        budgetMaxUsd?: number;
        submittedBy?: string;
        tenantId?: string;
    }): Promise<MissionIntegrationContext>;
    private handleAgentEvent;
    private handleAgentFailure;
    checkConstitutionalCompliance(prompt: string): Promise<{
        allowed: boolean;
        reason?: string;
        modified?: string;
    }>;
    validateAction(agentId: string, action: string, resource: string, input: any): Promise<{
        allowed: boolean;
        reason?: string;
    }>;
    private triggerAutoRecovery;
    getUnifiedSnapshot(): Promise<any>;
    getMissionContext(missionId: string): MissionIntegrationContext | undefined;
    getAllActiveContexts(): MissionIntegrationContext[];
    getIntegrationStats(): {
        totalMissionsIntegrated: number;
        totalAgentFailuresHandled: number;
        totalConstitutionalChecks: number;
        totalHumanApprovals: number;
        totalRecoveryActions: number;
        activeMissions: number;
    };
    private requiresHumanApproval;
    private categorizeMission;
}
