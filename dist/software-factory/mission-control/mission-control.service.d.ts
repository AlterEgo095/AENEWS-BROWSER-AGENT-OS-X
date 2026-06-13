import { MissionContractService } from '../mission-contract/mission-contract.service';
import { MissionStateMachineService } from '../mission-state-machine/mission-state-machine.service';
import { MissionState } from '../interfaces';
import { AgentPoolService } from '../agent-pool/agent-pool.service';
import { PlanningTeamService } from '../teams/planning/planning-team.service';
import { ExecutionTeamService } from '../teams/execution/execution-team.service';
import { CertificationTeamService } from '../teams/certification/certification-team.service';
import { DeliveryService } from '../delivery/delivery.service';
import { MissionMemoryService } from '../memory/mission-memory.service';
import { MissionArchiveService } from '../archive/mission-archive.service';
import { MissionQuality } from '../interfaces';
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
    activeAgents: number;
    totalCost: number;
    startedAt: Date;
    estimatedCompletion?: Date;
    errors: string[];
    warnings: string[];
}
export declare class MissionControlService {
    private readonly contractService;
    private readonly stateMachine;
    private readonly agentPool;
    private readonly planningTeam;
    private readonly executionTeam;
    private readonly certificationTeam;
    private readonly deliveryService;
    private readonly memoryService;
    private readonly archiveService;
    private readonly logger;
    private readonly executions;
    constructor(contractService: MissionContractService, stateMachine: MissionStateMachineService, agentPool: AgentPoolService, planningTeam: PlanningTeamService, executionTeam: ExecutionTeamService, certificationTeam: CertificationTeamService, deliveryService: DeliveryService, memoryService: MissionMemoryService, archiveService: MissionArchiveService);
    submitMission(request: MissionRequest): Promise<MissionExecution>;
    private executePipeline;
    private runPlanningPhase;
    private runResearchPhase;
    private runBuildingPhase;
    private runTestingPhase;
    private runAuditingPhase;
    private runCertificationPhase;
    private runDeliveryPhase;
    private cleanupMission;
    private handlePipelineError;
    getExecution(missionId: string): MissionExecution | undefined;
    getActiveMissions(): MissionExecution[];
    cancelMission(missionId: string): Promise<boolean>;
    private createExecution;
    private transitionTo;
    private getContractForMission;
    private inferRequiredRoles;
    private getSkillsForRole;
}
