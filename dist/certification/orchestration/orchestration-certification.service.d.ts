import { DomainResult, TestResult } from '../types';
interface ServiceAnalysis {
    filePath: string;
    fileName: string;
    content: string;
    className: string;
    methods: string[];
    hasInjectable: boolean;
    hasLogger: boolean;
    implementsAsync: boolean;
}
export declare class OrchestrationCertificationService {
    private readonly logger;
    private serviceAnalyses;
    runAll(): Promise<DomainResult>;
    testDecomposition(services: ServiceAnalysis[]): Promise<TestResult>;
    testPlanGeneration(services: ServiceAnalysis[]): Promise<TestResult>;
    testParallelExecution(services: ServiceAnalysis[]): Promise<TestResult>;
    testCritiqueEvaluation(services: ServiceAnalysis[]): Promise<TestResult>;
    testRepairMechanism(services: ServiceAnalysis[]): Promise<TestResult>;
    testValidation(services: ServiceAnalysis[]): Promise<TestResult>;
    testDelivery(services: ServiceAnalysis[]): Promise<TestResult>;
    testEndToEndPipeline(services: ServiceAnalysis[]): Promise<TestResult>;
    testErrorRecovery(services: ServiceAnalysis[]): Promise<TestResult>;
    testCancellation(services: ServiceAnalysis[]): Promise<TestResult>;
    private analyzeOrchestratorServices;
    private simulateDecomposition;
    private simulatePlanGeneration;
    private simulateCritique;
    private simulateRepair;
    private simulateValidation;
    private simulateDelivery;
    private simulateEndToEndPipeline;
}
export {};
