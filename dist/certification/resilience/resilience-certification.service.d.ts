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
export declare class ResilienceCertificationService {
    private readonly logger;
    private serviceAnalyses;
    runAll(): Promise<DomainResult>;
    testWorkerCrashRecovery(services: ServiceAnalysis[]): Promise<TestResult>;
    testRedisLossHandling(services: ServiceAnalysis[]): Promise<TestResult>;
    testRabbitMQLossHandling(services: ServiceAnalysis[]): Promise<TestResult>;
    testPostgreSQLLossHandling(services: ServiceAnalysis[]): Promise<TestResult>;
    testAutomaticRestart(services: ServiceAnalysis[]): Promise<TestResult>;
    testTaskResumption(services: ServiceAnalysis[]): Promise<TestResult>;
    testMemoryConsistency(services: ServiceAnalysis[]): Promise<TestResult>;
    testGracefulShutdown(services: ServiceAnalysis[]): Promise<TestResult>;
    testHealthMonitoring(services: ServiceAnalysis[]): Promise<TestResult>;
    testCircuitBreaker(services: ServiceAnalysis[]): Promise<TestResult>;
    private simulateCrashRecovery;
    private simulateRedisLoss;
    private simulateRabbitMQLoss;
    private simulatePostgreSQLLoss;
    private simulateCircuitBreaker;
    private analyzeServices;
}
export {};
