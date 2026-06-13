import { DomainResult, TestResult } from '../types';
interface AgentScanResult {
    filePath: string;
    relativePath: string;
    content: string;
    className: string;
    cluster: string;
    configName: string;
}
export declare class AgentIntegrityCertificationService {
    private readonly logger;
    runAll(): Promise<DomainResult>;
    testInitialization(agents: AgentScanResult[]): Promise<TestResult>;
    testShutdown(agents: AgentScanResult[]): Promise<TestResult>;
    testTimeoutHandling(agents: AgentScanResult[]): Promise<TestResult>;
    testRetryLogic(agents: AgentScanResult[]): Promise<TestResult>;
    testLogging(agents: AgentScanResult[]): Promise<TestResult>;
    testPermissions(agents: AgentScanResult[]): Promise<TestResult>;
    testMemoryIntegration(agents: AgentScanResult[]): Promise<TestResult>;
    testToolsRegistered(agents: AgentScanResult[]): Promise<TestResult>;
    testExceptionHandling(agents: AgentScanResult[]): Promise<TestResult>;
    testConcurrentExecution(agents: AgentScanResult[]): Promise<TestResult>;
    calculateHealthScore(results: TestResult[]): number;
    private discoverAgentFiles;
    private determineCluster;
    private extractAgentId;
    private getAllFilesRecursive;
}
export {};
