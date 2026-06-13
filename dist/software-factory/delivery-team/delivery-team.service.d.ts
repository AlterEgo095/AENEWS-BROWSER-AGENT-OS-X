import { AgentLevel, SpecializedAgentId, AgentExecutionResult } from '../interfaces';
import { AgentRegistryService } from '../registry/agent-registry.service';
export declare class DeliveryTeamService {
    private readonly registry;
    private readonly logger;
    constructor(registry: AgentRegistryService);
    getTeamAgents(): import("../interfaces").AgentDefinition[];
    selectAgents(taskDescription: string): SpecializedAgentId[];
    executeTask(missionId: string, task: string, input: Record<string, any>): Promise<AgentExecutionResult>;
    getStats(): {
        level: AgentLevel;
        totalAgents: number;
        availableAgents: {
            id: SpecializedAgentId;
            name: string;
            skills: string[];
            costPerTask: number;
        }[];
    };
}
