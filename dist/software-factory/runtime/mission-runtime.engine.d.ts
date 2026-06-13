import { MissionState, MissionQuality } from '../interfaces';
import { MissionContractService } from '../mission-contract/mission-contract.service';
import { MissionStateMachineService } from '../mission-state-machine/mission-state-machine.service';
import { MissionMemoryService } from '../memory/mission-memory.service';
import { MissionArchiveService } from '../archive/mission-archive.service';
import { CapabilityRegistryService } from '../capability-registry/capability-registry.service';
import { CapabilityResolverService } from '../capability-resolver/capability-resolver.service';
import { MissionMetricsService } from './mission-metrics.service';
import { ConnectorRegistry } from '../connectors/connector-registry';
export interface RuntimeMission {
    id: string;
    instruction: string;
    contractId: string;
    workspaceDir: string;
    status: MissionState;
    artifacts: RuntimeArtifact[];
    errors: string[];
    startedAt: Date;
    completedAt?: Date;
}
export interface RuntimeArtifact {
    name: string;
    type: 'source' | 'test' | 'document' | 'config' | 'archive' | 'report';
    path: string;
    size: number;
    content?: string;
}
export interface RuntimeResult {
    missionId: string;
    success: boolean;
    artifacts: RuntimeArtifact[];
    workspaceDir: string;
    qualityScore: number;
    certified: boolean;
    totalDurationMs: number;
    totalCostUsd: number;
    errors: string[];
}
export declare class MissionRuntimeEngine {
    private readonly contractService;
    private readonly stateMachine;
    private readonly memoryService;
    private readonly archiveService;
    private readonly capabilityRegistry;
    private readonly capabilityResolver;
    private readonly metricsService;
    private readonly connectorRegistry;
    private readonly logger;
    private readonly missions;
    private readonly baseWorkspace;
    private readonly MAX_REPAIR_ATTEMPTS;
    private readonly QUALITY_GATE_THRESHOLD;
    constructor(contractService: MissionContractService, stateMachine: MissionStateMachineService, memoryService: MissionMemoryService, archiveService: MissionArchiveService, capabilityRegistry: CapabilityRegistryService, capabilityResolver: CapabilityResolverService, metricsService: MissionMetricsService, connectorRegistry: ConnectorRegistry);
    executeMission(request: {
        instruction: string;
        description?: string;
        quality?: MissionQuality;
        budgetMaxUsd?: number;
        deadline?: Date;
    }): Promise<RuntimeResult>;
    private executeConnector;
    private tryFallback;
    private executeBuild;
    private resolveBuildCapabilities;
    private executeTesting;
    private executeAudit;
    private computeCertification;
    private applyQualityGate;
    private extractPlan;
    private heuristicPlan;
    private mergeArtifacts;
    private generateReport;
    private updateState;
    private buildResult;
    getMission(missionId: string): RuntimeMission | undefined;
    getActiveMissions(): RuntimeMission[];
    getCompletedMissions(): RuntimeMission[];
    getWorkspaceDir(missionId: string): string | undefined;
}
