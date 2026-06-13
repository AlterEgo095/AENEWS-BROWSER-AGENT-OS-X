import { Response } from 'express';
import { MissionOrchestratorPipeline } from './mission-orchestrator/mission-orchestrator.service';
import { MissionContractService } from './mission-contract/mission-contract.service';
import { MissionStateMachineService } from './mission-state-machine/mission-state-machine.service';
import { CapabilityRegistryService } from './capability-registry/capability-registry.service';
import { CapabilityResolverService } from './capability-resolver/capability-resolver.service';
import { WorkerFactoryService } from './worker-factory/worker-factory.service';
import { DeliveryManagerService } from './kernel/kernel-services';
import { MonitoringManagerService } from './kernel/kernel-services';
import { MissionArchiveService } from './archive/mission-archive.service';
import { MissionRuntimeEngine } from './runtime/mission-runtime.engine';
import { MissionMetricsService } from './runtime/mission-metrics.service';
import { CapabilityPack } from './interfaces';
export declare class SoftwareFactoryController {
    private readonly runtime;
    private readonly metrics;
    private readonly pipeline;
    private readonly contractService;
    private readonly stateMachine;
    private readonly capabilityRegistry;
    private readonly capabilityResolver;
    private readonly workerFactory;
    private readonly deliveryManager;
    private readonly archiveService;
    private readonly monitoring;
    constructor(runtime: MissionRuntimeEngine, metrics: MissionMetricsService, pipeline: MissionOrchestratorPipeline, contractService: MissionContractService, stateMachine: MissionStateMachineService, capabilityRegistry: CapabilityRegistryService, capabilityResolver: CapabilityResolverService, workerFactory: WorkerFactoryService, deliveryManager: DeliveryManagerService, archiveService: MissionArchiveService, monitoring: MonitoringManagerService);
    runMission(body: {
        instruction: string;
        description?: string;
        quality?: string;
        budgetMaxUsd?: number;
        deadline?: string;
    }): Promise<{
        success: boolean;
        data: {
            missionId: string;
            certified: boolean;
            qualityScore: number;
            totalDurationMs: number;
            totalCostUsd: number;
            artifacts: {
                name: string;
                type: "document" | "config" | "test" | "archive" | "report" | "source";
                size: number;
                path: string;
            }[];
            workspaceDir: string;
            errors: string[];
        };
    }>;
    getRuntimeMission(id: string): {
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: import("./runtime/mission-runtime.engine").RuntimeMission;
        error?: undefined;
    };
    downloadArtifact(id: string, filename: string, res: Response): void;
    downloadZip(id: string, res: Response): void;
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
        data: {
            runtime: import("./runtime/mission-runtime.engine").RuntimeMission[];
            pipeline: import("./mission-orchestrator/mission-orchestrator.service").MissionExecution[];
        };
    };
    getMissionStatus(id: string): {
        success: boolean;
        data: {
            runtime: import("./runtime/mission-runtime.engine").RuntimeMission | undefined;
            pipeline: import("./mission-orchestrator/mission-orchestrator.service").MissionExecution | undefined;
        };
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
    getFactoryStats(): {
        success: boolean;
        data: {
            architecture: {
                concepts: number;
                concepts_list: string[];
                kernel_services: number;
                capability_packs: number;
                total_capabilities: number;
                runtime_engine: string;
            };
            activeMissions: number;
            completedMissions: number;
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
    getMSR(): {
        success: boolean;
        data: {
            msr: number;
            msrPercent: string;
            totalMissions: number;
            successes: number;
            certified: number;
            certificationRate: number;
            currentTarget: import("./runtime/mission-metrics.service").MsrTarget;
            msrTargets: import("./runtime/mission-metrics.service").MsrTarget[];
            msrGap: number;
            trend: import("./runtime/mission-metrics.service").TrendMetrics;
        };
    };
    getMetrics(category?: string): {
        success: boolean;
        data: {
            category: string;
            missions: import("./runtime/mission-metrics.service").MissionMetric[];
        };
    } | {
        success: boolean;
        data: import("./runtime/mission-metrics.service").AggregateMetrics;
    };
    getRecentMetrics(count?: string): {
        success: boolean;
        data: import("./runtime/mission-metrics.service").MissionMetric[];
    };
    getFailures(): {
        success: boolean;
        data: import("./runtime/mission-metrics.service").MissionMetric[];
    };
    getSlowest(count?: string): {
        success: boolean;
        data: import("./runtime/mission-metrics.service").MissionMetric[];
    };
    getLowestQuality(count?: string): {
        success: boolean;
        data: import("./runtime/mission-metrics.service").MissionMetric[];
    };
    getReferenceMissions(pack?: string, difficulty?: string, category?: string): {
        success: boolean;
        data: {
            total: number;
            stats: {
                total: number;
                byPack: Record<string, number>;
                byDifficulty: Record<string, number>;
                byCategory: Record<string, number>;
            };
            missions: import("./runtime/reference-missions").ReferenceMission[];
        };
    };
    getReferenceMissionStats(): {
        success: boolean;
        data: {
            total: number;
            byPack: Record<string, number>;
            byDifficulty: Record<string, number>;
            byCategory: Record<string, number>;
        };
    };
}
