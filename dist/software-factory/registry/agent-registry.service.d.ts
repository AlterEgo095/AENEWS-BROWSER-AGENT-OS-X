import { AgentDefinition, AgentLevel, SpecializedAgentId, TeamComposition } from '../interfaces';
export declare class AgentRegistryService {
    private readonly logger;
    private readonly definitions;
    constructor();
    getDefinition(agentId: SpecializedAgentId): AgentDefinition | undefined;
    getAllDefinitions(): AgentDefinition[];
    getByLevel(level: AgentLevel): AgentDefinition[];
    getPermanentAgents(): AgentDefinition[];
    getOnDemandAgents(): AgentDefinition[];
    getTeamCompositions(): TeamComposition[];
    findBySkill(skill: string): AgentDefinition[];
    findAgentsForMission(missionDescription: string): AgentDefinition[];
    getTotalCount(): {
        permanent: number;
        onDemand: number;
        total: number;
    };
    private registerAllAgents;
    private register;
    private registerBrowserTeam;
    private registerDevTeam;
    private registerOfficeTeam;
    private registerBusinessTeam;
    private registerCertTeam;
    private registerDeliveryTeam;
}
