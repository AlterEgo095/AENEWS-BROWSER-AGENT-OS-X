import { AgentInput, AgentCluster, TaskPriority, TaskDefinition } from '../interfaces/agent.interface';
import { MemoryService } from '../memory/memory.service';
export declare enum DecompositionStrategy {
    SEQUENTIAL = "sequential",
    PARALLEL = "parallel",
    HYBRID = "hybrid",
    CONDITIONAL = "conditional"
}
export interface SubtaskTemplate {
    id: string;
    description: string;
    cluster?: AgentCluster;
    capability?: string;
    priority: TaskPriority;
    payload: any;
    dependencies?: string[];
    estimatedDurationMs?: number;
}
export interface DecompositionResult {
    taskId: string;
    subtasks: TaskDefinition[];
    strategy: DecompositionStrategy;
    estimatedDurationMs: number;
    complexity: TaskComplexity;
}
export declare enum TaskComplexity {
    TRIVIAL = "trivial",
    SIMPLE = "simple",
    MODERATE = "moderate",
    COMPLEX = "complex",
    HIGHLY_COMPLEX = "highly_complex"
}
export interface DecompositionConfig {
    maxRecursionDepth: number;
    maxSubtasksPerLevel: number;
    minSubtaskComplexity: TaskComplexity;
    enableRecursiveDecomposition: boolean;
    enableHistoricalLookup: boolean;
}
export declare class TaskDecomposerService {
    private readonly memoryService;
    private readonly logger;
    private readonly config;
    constructor(memoryService: MemoryService);
    decompose(input: AgentInput): Promise<TaskDefinition[]>;
    decomposeSubtask(subtask: TaskDefinition, depth?: number): Promise<TaskDefinition[]>;
    assessComplexity(input: AgentInput): TaskComplexity;
    selectStrategy(complexity: TaskComplexity, input: AgentInput): DecompositionStrategy;
    identifyDependencies(subtasks: TaskDefinition[]): Map<string, string[]>;
    determineExecutionOrder(subtasks: TaskDefinition[], dependencies: Map<string, string[]>): string[][];
    private recursiveDecompose;
    private getComplexityScore;
    private performDecomposition;
    private createSubtaskFromStep;
    private createSubtaskFromOperation;
    private createSingleSubtask;
    private analyzeAndDecompose;
    private identifyComponents;
    private groupRelatedKeys;
    private inferCluster;
    private hasDataDependency;
    private findHistoricalDecomposition;
    private adaptHistoricalDecomposition;
    private storeDecomposition;
    private hashPayload;
}
