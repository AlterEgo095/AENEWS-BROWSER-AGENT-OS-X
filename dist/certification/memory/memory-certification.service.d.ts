import { DomainResult, TestResult } from '../types';
interface ServiceAnalysis {
    filePath: string;
    fileName: string;
    content: string;
    className: string;
    methods: string[];
    hasInjectable: boolean;
    hasLogger: boolean;
}
export declare class MemoryCertificationService {
    private readonly logger;
    private serviceAnalyses;
    runAll(): Promise<DomainResult>;
    testWorkingMemory(services: ServiceAnalysis[]): Promise<TestResult>;
    testSessionMemory(services: ServiceAnalysis[]): Promise<TestResult>;
    testLongTermMemory(services: ServiceAnalysis[]): Promise<TestResult>;
    testKnowledgeGraph(services: ServiceAnalysis[]): Promise<TestResult>;
    testVectorSearch(services: ServiceAnalysis[]): Promise<TestResult>;
    testRAGPipeline(services: ServiceAnalysis[]): Promise<TestResult>;
    testUnifiedMemory(services: ServiceAnalysis[]): Promise<TestResult>;
    testCrossTierRetrieval(services: ServiceAnalysis[]): Promise<TestResult>;
    testPersistence(services: ServiceAnalysis[]): Promise<TestResult>;
    testMemoryCleanup(services: ServiceAnalysis[]): Promise<TestResult>;
    private simulateWorkingMemory;
    private simulateSessionMemory;
    private simulateKnowledgeGraph;
    private simulateRAGPipeline;
    private simulateCrossTier;
    private simulatePersistence;
    private analyzeServices;
}
export {};
