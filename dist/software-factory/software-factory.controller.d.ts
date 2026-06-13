import { MissionOrchestratorPipeline } from './mission-orchestrator/mission-orchestrator.service';
import { MissionContractService } from './mission-contract/mission-contract.service';
import { MissionStateMachineService } from './mission-state-machine/mission-state-machine.service';
import { CapabilityRegistryService } from './capability-registry/capability-registry.service';
import { CapabilityResolverService } from './capability-resolver/capability-resolver.service';
import { WorkerFactoryService } from './worker-factory/worker-factory.service';
import { DeliveryManagerService } from './kernel/kernel-services';
import { MissionArchiveService } from './archive/mission-archive.service';
import { MonitoringManagerService } from './kernel/kernel-services';
import { CapabilityPack } from './interfaces';
export declare class SoftwareFactoryController {
    private readonly pipeline;
    private readonly contractService;
    private readonly stateMachine;
    private readonly capabilityRegistry;
    private readonly capabilityResolver;
    private readonly workerFactory;
    private readonly deliveryManager;
    private readonly archiveService;
    private readonly monitoring;
    constructor(pipeline: MissionOrchestratorPipeline, contractService: MissionContractService, stateMachine: MissionStateMachineService, capabilityRegistry: CapabilityRegistryService, capabilityResolver: CapabilityResolverService, workerFactory: WorkerFactoryService, deliveryManager: DeliveryManagerService, archiveService: MissionArchiveService, monitoring: MonitoringManagerService);
    submitMission(body: {
        instruction: string;
        description?: string;
        quality?: string;
        deadline?: string;
        budgetMaxUsd?: number;
        deliverables?: string[];
        tags?: string[];
    }): Promise<{
        success: boolean;
        data: import("./mission-orchestrator/mission-orchestrator.service").MissionExecution;
    }>;
    getActiveMissions(): {
        success: boolean;
        data: import("./mission-orchestrator/mission-orchestrator.service").MissionExecution[];
    };
    getMissionStatus(id: string): {
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: import("./mission-orchestrator/mission-orchestrator.service").MissionExecution;
        error?: undefined;
    };
    cancelMission(id: string): Promise<{
        success: boolean;
    }>;
    getContract(id: string): {
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: import("./interfaces").MissionContract;
        error?: undefined;
    };
    getTimeline(id: string): {
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: import("./interfaces").MissionTimeline;
        error?: undefined;
    };
    getAvailableTransitions(id: string): {
        success: boolean;
        data: import("./interfaces").StateTransition[];
    };
    getDelivery(id: string): {
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: import("./kernel/kernel-services").DeliveryPackage;
        error?: undefined;
    };
    getArchive(id: string): {
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: import("./archive/mission-archive.service").ArchivedMission;
        error?: undefined;
    };
    searchArchives(result?: 'success' | 'partial' | 'failed', minQuality?: number, maxCost?: number): {
        success: boolean;
        data: import("./archive/mission-archive.service").ArchivedMission[];
    };
    getAllCapabilities(): {
        success: boolean;
        data: {
            total: number;
            overview: Record<CapabilityPack, {
                name: string;
                count: number;
                capabilities: string[];
            }>;
            capabilities: import("./interfaces").CapabilityDefinition[];
        };
    };
    getCapabilitiesByPack(pack: string): {
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: import("./interfaces").CapabilityDefinition[];
        error?: undefined;
    };
    searchCapabilities(query: string): {
        success: boolean;
        data: import("./interfaces").CapabilityDefinition[];
    };
    resolveCapabilities(body: {
        mission: string;
    }): {
        success: boolean;
        data: import("./interfaces").CapabilityResolution;
    };
    getWorkerStats(): {
        success: boolean;
        data: import("./interfaces").WorkerPoolStatistics;
    };
    getFactoryStats(): {
        success: boolean;
        data: {
            architecture: {
                concepts: number;
                concepts_list: string[];
                kernel_services: number;
                capability_packs: number;
                total_capabilities: number;
            };
            activeMissions: number;
            workerPool: import("./interfaces").WorkerPoolStatistics;
            archiveStats: {
                totalMissions: number;
                successRate: number;
                averageQualityScore: number;
                averageCost: number;
                averageDurationMs: number;
            };
            systemHealth: import("./kernel/kernel-services").SystemHealth;
            missionsByState: Record<string, number>;
        };
    };
}
