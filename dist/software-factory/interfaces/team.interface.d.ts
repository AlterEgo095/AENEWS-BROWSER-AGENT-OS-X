export declare enum TeamType {
    PLANNING = "PLANNING",
    EXECUTION = "EXECUTION",
    CERTIFICATION = "CERTIFICATION"
}
export declare enum AgentRole {
    RESEARCHER = "RESEARCHER",
    ARCHITECT = "ARCHITECT",
    BUSINESS_ANALYST = "BUSINESS_ANALYST",
    MARKETING_STRATEGIST = "MARKETING_STRATEGIST",
    BROWSER_OPERATOR = "BROWSER_OPERATOR",
    CODER = "CODER",
    OFFICE_OPERATOR = "OFFICE_OPERATOR",
    DEPLOYER = "DEPLOYER",
    QA_TESTER = "QA_TESTER",
    SECURITY_AUDITOR = "SECURITY_AUDITOR",
    PERFORMANCE_TESTER = "PERFORMANCE_TESTER",
    DOCUMENTATION_WRITER = "DOCUMENTATION_WRITER"
}
export declare const TEAM_ROLES: Record<TeamType, AgentRole[]>;
export declare const ROLE_TEAM: Record<AgentRole, TeamType>;
export interface AgentCapability {
    role: AgentRole;
    skills: string[];
    maxConcurrentTasks: number;
    estimatedCostPerTask: number;
}
export interface TeamTask {
    id: string;
    missionId: string;
    teamType: TeamType;
    assignedRoles: AgentRole[];
    description: string;
    input: Record<string, any>;
    expectedOutput: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
    assignedAgentId?: string;
    result?: TaskResult;
    createdAt: Date;
    completedAt?: Date;
}
export interface TaskResult {
    success: boolean;
    artifacts: Artifact[];
    metrics: TaskMetrics;
    logs: string[];
    errors: string[];
}
export interface Artifact {
    id: string;
    name: string;
    type: string;
    path: string;
    size?: number;
    checksum?: string;
    createdAt: Date;
    metadata: Record<string, any>;
}
export interface TaskMetrics {
    executionTimeMs: number;
    apiCallsMade: number;
    tokensUsed: number;
    costUsd: number;
    retryCount: number;
}
export interface TeamReport {
    teamType: TeamType;
    missionId: string;
    tasksCompleted: number;
    tasksFailed: number;
    totalArtifacts: number;
    totalCostUsd: number;
    totalTimeMs: number;
    findings: string[];
    recommendations: string[];
}
