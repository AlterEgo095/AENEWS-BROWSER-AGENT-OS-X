import { AgentRole, TeamType } from '../../interfaces';
export interface MissionPlan {
    missionId: string;
    objective: string;
    phases: PlanPhase[];
    requiredCapabilities: string[];
    estimatedDuration: string;
    estimatedCost: number;
    risks: RiskAssessment[];
    dependencies: string[];
    requiresBrowser: boolean;
    requiresCoding: boolean;
    requiresDocuments: boolean;
    requiresDeployment: boolean;
    requiresWebScraping: boolean;
    requiresDevelopment: boolean;
    requiresReports: boolean;
    requiresInfrastructure: boolean;
}
export interface PlanPhase {
    id: string;
    name: string;
    description: string;
    teamType: TeamType;
    assignedRoles: AgentRole[];
    tasks: PlanTask[];
    estimatedDurationMs: number;
    dependsOn: string[];
}
export interface PlanTask {
    id: string;
    description: string;
    role: AgentRole;
    priority: 'low' | 'medium' | 'high' | 'critical';
    inputSpec: Record<string, any>;
    expectedOutput: string[];
}
export interface RiskAssessment {
    id: string;
    description: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
}
export interface ResearchResults {
    missionId: string;
    findings: ResearchFinding[];
    sources: string[];
    recommendations: string[];
    constraints: string[];
}
export interface ResearchFinding {
    topic: string;
    summary: string;
    details: string;
    confidence: number;
    source: string;
}
export declare class PlanningTeamService {
    private readonly logger;
    private readonly plans;
    private readonly researchResults;
    createPlan(missionId: string, context: Record<string, any>, contract: any): Promise<MissionPlan>;
    executeResearch(missionId: string, plan: MissionPlan | undefined): Promise<ResearchResults>;
    getPlan(missionId: string): MissionPlan | undefined;
    getResearchResults(missionId: string): ResearchResults | undefined;
}
