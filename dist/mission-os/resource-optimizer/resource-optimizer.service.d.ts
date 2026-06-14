import { OnModuleInit } from '@nestjs/common';
export declare enum ResourceType {
    LLM = "llm",
    BROWSER = "browser",
    GPU = "gpu",
    WORKER = "worker",
    DATABASE = "database",
    CACHE = "cache",
    QUEUE = "queue",
    STORAGE = "storage"
}
export interface ResourceCandidate {
    id: string;
    resourceType: ResourceType;
    provider: string;
    config: Record<string, any>;
    costPerUnit: number;
    latencyMs: number;
    availability: number;
    quality: number;
    maxConcurrency: number;
    currentLoad: number;
    region: string;
    capabilities: string[];
    metadata: Record<string, any>;
}
export interface ResourceAllocation {
    id: string;
    taskId: string;
    agentId: string;
    resourceType: ResourceType;
    provider: string;
    resourceId: string;
    config: Record<string, any>;
    costEstimate: number;
    allocatedAt: Date;
    releasedAt: Date | null;
    status: 'allocated' | 'released' | 'failed';
}
export interface OptimizationCriteria {
    prioritize: 'cost' | 'latency' | 'quality' | 'balanced';
    maxCost?: number;
    maxLatencyMs?: number;
    minQuality?: number;
    minAvailability?: number;
    preferredProvider?: string;
    preferredRegion?: string;
    requiredCapabilities?: string[];
    excludeResources?: string[];
}
export interface OptimizationResult {
    selected: ResourceCandidate;
    score: number;
    alternatives: Array<{
        candidate: ResourceCandidate;
        score: number;
        reason: string;
    }>;
    estimatedCost: number;
    estimatedLatencyMs: number;
    reasoning: string;
}
export interface ResourcePool {
    resourceType: ResourceType;
    candidates: ResourceCandidate[];
    totalCapacity: number;
    currentUtilization: number;
}
interface CostReportEntry {
    allocationId: string;
    taskId: string;
    agentId: string;
    resourceType: ResourceType;
    provider: string;
    resourceId: string;
    costEstimate: number;
    allocatedAt: Date;
    releasedAt: Date | null;
    status: ResourceAllocation['status'];
}
interface CostReport {
    totalCost: number;
    entries: CostReportEntry[];
    costByResourceType: Record<string, number>;
    costByProvider: Record<string, number>;
}
interface ResourceStats {
    totalPools: number;
    totalCandidates: number;
    totalAllocations: number;
    activeAllocations: number;
    totalCapacity: number;
    overallUtilization: number;
    poolsByType: Record<string, {
        candidates: number;
        utilization: number;
        capacity: number;
    }>;
    allocationsByType: Record<string, number>;
}
interface ScalingSuggestion {
    resourceType: ResourceType;
    currentUtilization: number;
    targetUtilization: number;
    action: 'add' | 'redistribute' | 'scale_down';
    estimatedResourcesNeeded: number;
    reason: string;
}
interface DemandForecast {
    resourceType: ResourceType;
    currentUtilization: number;
    predictedPeakUtilization: number;
    predictedAvgUtilization: number;
    confidence: number;
    demandByHour: Array<{
        hour: number;
        predictedUtilization: number;
    }>;
}
export declare class ResourceOptimizerService implements OnModuleInit {
    private readonly logger;
    private readonly pools;
    private readonly allocations;
    private readonly resourceIndex;
    private allocationCounter;
    onModuleInit(): void;
    registerResource(candidate: ResourceCandidate): void;
    unregisterResource(resourceId: string): boolean;
    updateResourceMetrics(resourceId: string, metrics: Partial<Pick<ResourceCandidate, 'availability' | 'currentLoad' | 'latencyMs' | 'quality' | 'costPerUnit' | 'maxConcurrency'>>): boolean;
    optimize(resourceType: ResourceType, criteria?: OptimizationCriteria): OptimizationResult | null;
    allocate(taskId: string, agentId: string, resourceType: ResourceType, criteria?: OptimizationCriteria): ResourceAllocation | null;
    release(allocationId: string): boolean;
    getResourcePool(resourceType: ResourceType): ResourcePool | null;
    getResourceUtilization(resourceType?: ResourceType): {
        utilization: number;
        activeAllocations: number;
        totalCapacity: number;
        candidates: number;
    };
    forecastDemand(resourceType: ResourceType, upcomingTasks: Array<{
        taskId: string;
        estimatedCost?: number;
        estimatedLatencyMs?: number;
        estimatedDurationHours?: number;
        scheduledAt?: Date;
    }>): DemandForecast;
    scaleIfNeeded(resourceType: ResourceType, targetUtilization?: number): ScalingSuggestion;
    getCostReport(from?: Date, to?: Date): CostReport;
    getResourceStats(): ResourceStats;
    private recalculatePoolMetrics;
    private nextAllocationId;
    private buildReasoning;
    private buildAlternativeReason;
}
export {};
