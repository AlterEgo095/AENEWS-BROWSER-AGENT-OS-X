/**
 * AENEWS Software Factory — Team & Agent Role Interfaces
 *
 * Teams: Planning, Execution, Certification
 * Each team has specialized agents that are instantiated on-demand.
 */

export enum TeamType {
  PLANNING = 'PLANNING',
  EXECUTION = 'EXECUTION',
  CERTIFICATION = 'CERTIFICATION',
}

export enum AgentRole {
  // Planning Team
  RESEARCHER = 'RESEARCHER',
  ARCHITECT = 'ARCHITECT',
  BUSINESS_ANALYST = 'BUSINESS_ANALYST',
  MARKETING_STRATEGIST = 'MARKETING_STRATEGIST',

  // Execution Team
  BROWSER_OPERATOR = 'BROWSER_OPERATOR',
  CODER = 'CODER',
  OFFICE_OPERATOR = 'OFFICE_OPERATOR',
  DEPLOYER = 'DEPLOYER',

  // Certification Team
  QA_TESTER = 'QA_TESTER',
  SECURITY_AUDITOR = 'SECURITY_AUDITOR',
  PERFORMANCE_TESTER = 'PERFORMANCE_TESTER',
  DOCUMENTATION_WRITER = 'DOCUMENTATION_WRITER',
}

export const TEAM_ROLES: Record<TeamType, AgentRole[]> = {
  [TeamType.PLANNING]: [
    AgentRole.RESEARCHER,
    AgentRole.ARCHITECT,
    AgentRole.BUSINESS_ANALYST,
    AgentRole.MARKETING_STRATEGIST,
  ],
  [TeamType.EXECUTION]: [
    AgentRole.BROWSER_OPERATOR,
    AgentRole.CODER,
    AgentRole.OFFICE_OPERATOR,
    AgentRole.DEPLOYER,
  ],
  [TeamType.CERTIFICATION]: [
    AgentRole.QA_TESTER,
    AgentRole.SECURITY_AUDITOR,
    AgentRole.PERFORMANCE_TESTER,
    AgentRole.DOCUMENTATION_WRITER,
  ],
};

export const ROLE_TEAM: Record<AgentRole, TeamType> = {
  [AgentRole.RESEARCHER]: TeamType.PLANNING,
  [AgentRole.ARCHITECT]: TeamType.PLANNING,
  [AgentRole.BUSINESS_ANALYST]: TeamType.PLANNING,
  [AgentRole.MARKETING_STRATEGIST]: TeamType.PLANNING,
  [AgentRole.BROWSER_OPERATOR]: TeamType.EXECUTION,
  [AgentRole.CODER]: TeamType.EXECUTION,
  [AgentRole.OFFICE_OPERATOR]: TeamType.EXECUTION,
  [AgentRole.DEPLOYER]: TeamType.EXECUTION,
  [AgentRole.QA_TESTER]: TeamType.CERTIFICATION,
  [AgentRole.SECURITY_AUDITOR]: TeamType.CERTIFICATION,
  [AgentRole.PERFORMANCE_TESTER]: TeamType.CERTIFICATION,
  [AgentRole.DOCUMENTATION_WRITER]: TeamType.CERTIFICATION,
};

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
