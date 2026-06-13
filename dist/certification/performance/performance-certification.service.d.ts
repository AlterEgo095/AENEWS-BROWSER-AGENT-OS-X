import { DomainResult, TestResult } from '../types';
interface AgentAnalysis {
    filePath: string;
    relativePath: string;
    content: string;
    className: string;
    timeout: number | null;
    maxConcurrentTasks: number | null;
    hasOnDestroy: boolean;
    hasCleanupInOnDestroy: boolean;
    hasMapWithSizeLimit: boolean;
    hasArrayWithSizeLimit: boolean;
    hasUnboundedPush: boolean;
    hasBusyWait: boolean;
    usesAsyncPatterns: boolean;
    mapCount: number;
    arrayCount: number;
}
interface ServiceAnalysis {
    filePath: string;
    fileName: string;
    content: string;
    className: string;
    methods: string[];
    hasInjectable: boolean;
    hasLogger: boolean;
}
export declare class PerformanceCertificationService {
    private readonly logger;
    private agentAnalyses;
    private serviceAnalyses;
    runAll(): Promise<DomainResult>;
    testInitializationLatency(agents: AgentAnalysis[]): Promise<TestResult>;
    testMemoryFootprint(agents: AgentAnalysis[]): Promise<TestResult>;
    testCpuEfficiency(agents: AgentAnalysis[]): Promise<TestResult>;
    testEventBusThroughput(services: ServiceAnalysis[]): Promise<TestResult>;
    testConcurrentCapacity(agents: AgentAnalysis[]): Promise<TestResult>;
    testDatabaseOptimization(services: ServiceAnalysis[]): Promise<TestResult>;
    testRedisEfficiency(services: ServiceAnalysis[]): Promise<TestResult>;
    testQueueProcessingThroughput(services: ServiceAnalysis[]): Promise<TestResult>;
    testMemoryLeakPrevention(agents: AgentAnalysis[]): Promise<TestResult>;
    testStartupTime(services: ServiceAnalysis[]): Promise<TestResult>;
    private simulateInitializationLatency;
    private simulateMemoryFootprint;
    private simulateCpuEfficiency;
    private simulateEventBusThroughput;
    private simulateQueueThroughput;
    private simulateStartupTime;
    private analyzeAgents;
    private analyzeServices;
    private getAgentFiles;
}
export {};
