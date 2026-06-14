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
export declare class SecurityCertificationService {
    private readonly logger;
    private serviceAnalyses;
    runAll(): Promise<DomainResult>;
    testNoExposedSecrets(): Promise<TestResult>;
    testNoInjectionVulnerabilities(): Promise<TestResult>;
    testDependencyVulnerabilities(): Promise<TestResult>;
    testPermissionModel(services: ServiceAnalysis[]): Promise<TestResult>;
    testPluginIsolation(): Promise<TestResult>;
    testRBACEnforcement(services: ServiceAnalysis[]): Promise<TestResult>;
    testAuditLogging(services: ServiceAnalysis[]): Promise<TestResult>;
    testEncryption(services: ServiceAnalysis[]): Promise<TestResult>;
    testTokenManagement(services: ServiceAnalysis[]): Promise<TestResult>;
    testZeroTrustCompliance(services: ServiceAnalysis[]): Promise<TestResult>;
    private getAllTsFiles;
    private getAllFilesRecursive;
    private analyzeServices;
}
export {};
