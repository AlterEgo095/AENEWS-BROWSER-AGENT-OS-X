import { MissionControlService } from './mission-control/mission-control.service';
import { MissionContractService } from './mission-contract/mission-contract.service';
import { MissionStateMachineService } from './mission-state-machine/mission-state-machine.service';
import { AgentPoolService } from './agent-pool/agent-pool.service';
import { DeliveryService } from './delivery/delivery.service';
import { MissionArchiveService } from './archive/mission-archive.service';
export declare class SoftwareFactoryController {
    private readonly missionControl;
    private readonly contractService;
    private readonly stateMachine;
    private readonly agentPool;
    private readonly deliveryService;
    private readonly archiveService;
    constructor(missionControl: MissionControlService, contractService: MissionContractService, stateMachine: MissionStateMachineService, agentPool: AgentPoolService, deliveryService: DeliveryService, archiveService: MissionArchiveService);
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
        data: import("./mission-control/mission-control.service").MissionExecution;
    }>;
    getActiveMissions(): {
        success: boolean;
        data: import("./mission-control/mission-control.service").MissionExecution[];
    };
    getMissionStatus(id: string): {
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: import("./mission-control/mission-control.service").MissionExecution;
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
    getAgentStats(): {
        success: boolean;
        data: import("./interfaces").PoolStatistics;
    };
    getDelivery(id: string): {
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: import("./delivery/delivery.service").DeliveryPackage;
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
    getFactoryStats(): {
        success: boolean;
        data: {
            activeMissions: number;
            agentPool: import("./interfaces").PoolStatistics;
            archiveStats: {
                totalMissions: number;
                successRate: number;
                averageQualityScore: number;
                averageCost: number;
                averageDurationMs: number;
            };
            missionsByState: Record<string, number>;
        };
    };
}
