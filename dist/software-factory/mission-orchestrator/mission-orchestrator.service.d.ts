import { MissionOrchestratorService, MissionPlannerService, TaskSchedulerService, ResourceManagerService, SecurityManagerService, CertificationManagerService, DeliveryManagerService, MonitoringManagerService, RecoveryManagerService } from '../kernel/kernel-services';
import { MissionContractService } from '../mission-contract/mission-contract.service';
import { MissionStateMachineService } from '../mission-state-machine/mission-state-machine.service';
import { MissionMemoryService } from '../memory/mission-memory.service';
import { MissionArchiveService } from '../archive/mission-archive.service';
import { CapabilityRegistryService } from '../capability-registry/capability-registry.service';
import { ExecutionGraphBuilderService } from '../execution-graph/execution-graph-builder.service';
import { CapabilityResolverService } from '../capability-resolver/capability-resolver.service';
import { WorkerFactoryService } from '../worker-factory/worker-factory.service';
import { MissionState, MissionQuality, ExecutionPlan } from '../interfaces';
export interface MissionRequest {
    instruction: string;
    description?: string;
    quality?: MissionQuality;
    deadline?: Date;
    budgetMaxUsd?: number;
    deliverables?: string[];
    tags?: string[];
    createdBy?: string;
}
export interface MissionExecution {
    missionId: string;
    contractId: string;
    status: MissionState;
    progress: number;
    currentPhase: string;
    activeWorkers: number;
    totalCost: number;
    startedAt: Date;
    estimatedCompletion?: Date;
    errors: string[];
    warnings: string[];
    executionPlan?: ExecutionPlan;
    resolvedCapabilities?: number;
}
export declare class MissionOrchestratorPipeline {
    private readonly orchestrator;
    private readonly planner;
    private readonly scheduler;
    private readonly resourceManager;
    private readonly securityManager;
    private readonly certManager;
    private readonly deliveryManager;
    private readonly monitoring;
    private readonly recovery;
    private readonly contractService;
    private readonly stateMachine;
    private readonly memoryService;
    private readonly archiveService;
    private readonly capabilityRegistry;
    private readonly graphBuilder;
    private readonly capabilityResolver;
    private readonly workerFactory;
    private readonly logger;
    constructor(orchestrator: MissionOrchestratorService, planner: MissionPlannerService, scheduler: TaskSchedulerService, resourceManager: ResourceManagerService, securityManager: SecurityManagerService, certManager: CertificationManagerService, deliveryManager: DeliveryManagerService, monitoring: MonitoringManagerService, recovery: RecoveryManagerService, contractService: MissionContractService, stateMachine: MissionStateMachineService, memoryService: MissionMemoryService, archiveService: MissionArchiveService, capabilityRegistry: CapabilityRegistryService, graphBuilder: ExecutionGraphBuilderService, capabilityResolver: CapabilityResolverService, workerFactory: WorkerFactoryService);
    submitMission(request: MissionRequest): Promise<MissionExecution>;
    private executePipeline;
    getExecution(missionId: string): MissionExecution | undefined;
    getActiveMissions(): MissionExecution[];
    cancelMission(missionId: string): Promise<boolean>;
    private transitionTo;
    private getContractForMission;
    private handlePipelineError;
    private cleanupMission;
    private collectArtifacts;
    private estimateNodeCost;
}
