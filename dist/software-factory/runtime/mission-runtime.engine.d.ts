import { MissionState, MissionQuality } from '../interfaces';
import { MissionContractService } from '../mission-contract/mission-contract.service';
import { MissionStateMachineService } from '../mission-state-machine/mission-state-machine.service';
import { MissionMemoryService } from '../memory/mission-memory.service';
import { MissionArchiveService } from '../archive/mission-archive.service';
import { CapabilityRegistryService } from '../capability-registry/capability-registry.service';
import { CapabilityResolverService } from '../capability-resolver/capability-resolver.service';
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
    private readonly logger;
    private readonly missions;
    private zaiInstance;
    private readonly baseWorkspace;
    constructor(contractService: MissionContractService, stateMachine: MissionStateMachineService, memoryService: MissionMemoryService, archiveService: MissionArchiveService, capabilityRegistry: CapabilityRegistryService, capabilityResolver: CapabilityResolverService);
    executeMission(request: {
        instruction: string;
        description?: string;
        quality?: MissionQuality;
        budgetMaxUsd?: number;
        deadline?: Date;
    }): Promise<RuntimeResult>;
    private analyzeMission;
    private fallbackPlan;
    private executeBuild;
    private executeTests;
    private executeAudit;
    private certify;
    private generateReadme;
    private callLLM;
    private writeFile;
    private parseGeneratedFiles;
    private collectSourceFiles;
    private createZipArchive;
    private generateTemplateCode;
    private generateDockerfile;
    private generateReport;
    private updateState;
    private buildResult;
    getMission(missionId: string): RuntimeMission | undefined;
    getActiveMissions(): RuntimeMission[];
    getCompletedMissions(): RuntimeMission[];
    getWorkspaceDir(missionId: string): string | undefined;
}
