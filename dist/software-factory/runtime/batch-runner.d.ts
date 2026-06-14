import { AggregateMetrics } from './mission-metrics.service';
interface RuntimeArtifact {
    name: string;
    type: 'source' | 'test' | 'document' | 'config' | 'archive' | 'report';
    path: string;
    size: number;
    content?: string;
}
interface RuntimeResult {
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
declare class BatchRunner {
    private readonly baseWorkspace;
    private connectorCallCount;
    private metrics;
    private readonly connectors;
    constructor();
    private registerConnector;
    private getCapabilityIdsForPack;
    private delay;
    private rateLimitDelay;
    private executeViaConnector;
    private buildConnectorInput;
    private convertArtifacts;
    runBatch(options: {
        count?: number;
        missionIds?: number[];
        difficulty?: 'easy' | 'medium' | 'hard';
        pack?: string;
        delayMs?: number;
    }): Promise<AggregateMetrics>;
    executeMission(instruction: string): Promise<RuntimeResult>;
    private certify;
    private fallbackPlan;
    private printReport;
    private saveMetrics;
    private computeAggregate;
}
export { BatchRunner };
