export declare enum RiskLevel {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export interface SimulationInput {
    missionId: string;
    taskGraph: SimulationTaskGraph;
    resourceConstraints?: ResourceConstraints;
    historicalData?: HistoricalData;
    iterations?: number;
}
export interface SimulationTaskGraph {
    nodes: SimulationTaskNode[];
    edges: SimulationTaskEdge[];
}
export interface SimulationTaskNode {
    id: string;
    agentId: string | null;
    capability: string;
    estimatedDurationMs: number;
    estimatedCost: number;
    estimatedSuccessRate: number;
    dependencies: string[];
    resourceRequirements: Record<string, number>;
}
export interface SimulationTaskEdge {
    fromId: string;
    toId: string;
    type: 'hard' | 'soft' | 'resource';
}
export interface ResourceConstraints {
    maxCost: number;
    maxDurationMs: number;
    maxParallelAgents: number;
    availableResources: Record<string, number>;
}
export interface HistoricalData {
    agentSuccessRates: Map<string, number>;
    agentAvgLatencies: Map<string, number>;
    capabilitySuccessRates: Map<string, number>;
    typicalBottlenecks: string[];
}
export interface SimulationResult {
    missionId: string;
    overallSuccessProbability: number;
    estimatedCost: CostEstimate;
    estimatedDuration: DurationEstimate;
    riskLevel: RiskLevel;
    riskFactors: RiskFactor[];
    bottlenecks: Bottleneck[];
    resourceConflicts: ResourceConflict[];
    recommendations: string[];
    criticalPathAnalysis: CriticalPathAnalysis;
    scenarioBreakdown: ScenarioBreakdown;
    simulatedAt: Date;
}
export interface CostEstimate {
    minimum: number;
    expected: number;
    maximum: number;
    p50: number;
    p90: number;
    confidence: number;
}
export interface DurationEstimate {
    minimumMs: number;
    expectedMs: number;
    maximumMs: number;
    p50Ms: number;
    p90Ms: number;
    confidence: number;
}
export interface RiskFactor {
    name: string;
    description: string;
    probability: number;
    impact: number;
    riskScore: number;
    mitigation: string;
}
export interface Bottleneck {
    nodeId: string;
    reason: string;
    impactMs: number;
    suggestion: string;
}
export interface ResourceConflict {
    resource: string;
    conflictingNodes: string[];
    timeWindow: {
        startMs: number;
        endMs: number;
    };
    suggestedResolution: string;
}
export interface CriticalPathAnalysis {
    path: string[];
    totalDurationMs: number;
    slackTimeMs: number;
    criticalNodes: string[];
}
export interface ScenarioBreakdown {
    optimistic: {
        probability: number;
        cost: number;
        durationMs: number;
    };
    expected: {
        probability: number;
        cost: number;
        durationMs: number;
    };
    pessimistic: {
        probability: number;
        cost: number;
        durationMs: number;
    };
    failure: {
        probability: number;
        reason: string;
    };
}
interface ScenarioVariation {
    name: string;
    resourceConstraints?: Partial<ResourceConstraints>;
    successRateOverride?: number;
    priorityNodes?: string[];
}
interface ScenarioComparison {
    variations: {
        name: string;
        result: SimulationResult;
    }[];
    recommendation: string;
}
export declare class SimulationEngineService {
    private readonly logger;
    private readonly history;
    simulate(input: SimulationInput): SimulationResult;
    quickEstimate(input: SimulationInput): SimulationResult;
    analyzeCriticalPath(taskGraph: SimulationTaskGraph): CriticalPathAnalysis;
    identifyBottlenecks(taskGraph: SimulationTaskGraph, historicalData?: HistoricalData): Bottleneck[];
    checkResourceConflicts(taskGraph: SimulationTaskGraph, constraints: ResourceConstraints): ResourceConflict[];
    generateRecommendations(result: SimulationResult): string[];
    compareScenarios(input: SimulationInput, variations: ScenarioVariation[]): ScenarioComparison;
    getSimulationHistory(missionId?: string): SimulationResult[];
    private runSingleIteration;
    private computeCostEstimate;
    private computeDurationEstimate;
    private computeRiskFactors;
    private computeRiskFactorsFromRates;
    private computeScenarioBreakdown;
    private determineRiskLevel;
    private buildNodeMap;
    private buildEdgeMap;
    private computeTopologicalLevels;
    private haveHardDepsFailed;
    private haveSoftDepsFailed;
    private getAdjustedSuccessRate;
    private getAdjustedLatency;
    private getMostLikelyFailureReason;
    private buildCriticalPathOrder;
    private percentile;
    private suggestResourceResolution;
    private generateScenarioRecommendation;
    private addToHistory;
}
export {};
