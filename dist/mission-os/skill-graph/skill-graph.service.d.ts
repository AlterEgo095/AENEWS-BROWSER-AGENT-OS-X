export declare enum SkillLevel {
    NOVICE = "novice",
    COMPETENT = "competent",
    PROFICIENT = "proficient",
    EXPERT = "expert",
    MASTER = "master"
}
export interface SkillHistoryEntry {
    timestamp: Date;
    success: boolean;
    latencyMs: number;
    cost: number;
}
export interface SkillEntry {
    name: string;
    level: SkillLevel;
    costPerExecution: number;
    avgLatencyMs: number;
    successRate: number;
    executionCount: number;
    lastExecutedAt: Date | null;
    improvementTrend: number;
    history: SkillHistoryEntry[];
}
export interface SkillProfile {
    agentId: string;
    skills: Map<string, SkillEntry>;
    overallScore: number;
    lastUpdated: Date;
}
export interface AgentSelectionCriteria {
    requiredSkill: string;
    minLevel?: SkillLevel;
    maxCost?: number;
    maxLatencyMs?: number;
    minSuccessRate?: number;
    preferAgentId?: string;
    excludeAgentIds?: string[];
}
interface ExecutionResult {
    success: boolean;
    latencyMs: number;
    cost: number;
}
interface AgentScore {
    agentId: string;
    skill: SkillEntry;
    totalScore: number;
    breakdown: {
        skillLevelScore: number;
        successRateScore: number;
        costEfficiencyScore: number;
        latencyEfficiencyScore: number;
        improvementTrendScore: number;
    };
}
interface PredictionResult {
    estimatedLatencyMs: number;
    estimatedCost: number;
    successProbability: number;
    confidence: number;
}
interface SkillRecommendation {
    skillName: string;
    currentLevel: SkillLevel;
    currentSuccessRate: number;
    reason: string;
    priority: 'high' | 'medium' | 'low';
}
interface SkillGraphNode {
    agentId: string;
    overallScore: number;
    skills: Record<string, {
        level: SkillLevel;
        successRate: number;
        executionCount: number;
        avgLatencyMs: number;
        costPerExecution: number;
        improvementTrend: number;
    }>;
}
export declare class SkillGraphService {
    private readonly logger;
    private readonly profiles;
    private readonly maxHistoryPerSkill;
    private readonly smoothingFactor;
    registerSkillProfile(agentId: string): SkillProfile;
    updateSkill(agentId: string, skillName: string, executionResult: ExecutionResult): SkillEntry;
    getSkillProfile(agentId: string): SkillProfile | null;
    getSkill(agentId: string, skillName: string): SkillEntry | null;
    getBestAgent(criteria: AgentSelectionCriteria): AgentScore[];
    compareAgents(agentIds: string[], skillName: string): Record<string, SkillEntry | null>;
    getSkillGraph(): SkillGraphNode[];
    predictExecution(agentId: string, skillName: string): PredictionResult | null;
    getSkillRecommendations(agentId: string): SkillRecommendation[];
    decayInactiveSkills(decayThresholdMs: number): Array<{
        agentId: string;
        skillName: string;
        previousLevel: SkillLevel;
        newLevel: SkillLevel;
    }>;
    private calculateImprovementTrend;
    private evaluateSkillLevel;
    private calculateOverallScore;
}
export {};
