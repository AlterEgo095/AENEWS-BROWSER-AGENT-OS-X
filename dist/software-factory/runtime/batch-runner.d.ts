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
    private zaiInstance;
    private readonly baseWorkspace;
    private llmCallCount;
    private metrics;
    constructor();
    private delay;
    private rateLimitDelay;
    runBatch(options: {
        count?: number;
        missionIds?: number[];
        difficulty?: 'easy' | 'medium' | 'hard';
        pack?: string;
        delayMs?: number;
    }): Promise<AggregateMetrics>;
    executeMission(instruction: string): Promise<RuntimeResult>;
    private printReport;
    private saveMetrics;
    private computeAggregate;
    private analyzeMission;
    private executeBuild;
    private executeTests;
    private executeAuditQuick;
    private certify;
    private callLLM;
    private writeFile;
    private parseGeneratedFiles;
    private extractCodeBlocks;
    private fallbackPlan;
    private generateTemplateCode;
    private generateDockerfile;
    private generateFallbackTests;
}
export { BatchRunner };
