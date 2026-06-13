import { PooledAgent, SpawnRequest, SpawnResult, TerminateRequest, TerminateResult, PoolStatistics, PoolConstraints } from '../interfaces';
export declare class AgentPoolService {
    private readonly logger;
    private readonly agents;
    private readonly archive;
    private constraints;
    spawn(request: SpawnRequest): Promise<SpawnResult>;
    terminate(request: TerminateRequest): Promise<TerminateResult>;
    terminateMissionAgents(missionId: string, reason: TerminateRequest['reason']): Promise<TerminateResult[]>;
    startTask(agentId: string): boolean;
    completeTask(agentId: string, costUsd?: number, success?: boolean): boolean;
    getAgent(agentId: string): PooledAgent | undefined;
    getAgentsByMission(missionId: string): PooledAgent[];
    getStatistics(): PoolStatistics;
    getConstraints(): PoolConstraints;
    updateConstraints(constraints: Partial<PoolConstraints>): void;
    private initializeAgent;
    private getActiveCount;
    private getActiveCountByRole;
    private getActiveAgents;
}
