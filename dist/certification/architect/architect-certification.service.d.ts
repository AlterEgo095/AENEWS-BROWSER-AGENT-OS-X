import { DomainResult, TestResult } from '../types';
export declare class ArchitectCertificationService {
    private readonly logger;
    runAll(): Promise<DomainResult>;
    testNoCircularDependencies(): Promise<TestResult>;
    testCleanArchitecture(): Promise<TestResult>;
    testNamingConventions(): Promise<TestResult>;
    testNoInterClusterCoupling(): Promise<TestResult>;
    testInterfaceCompliance(): Promise<TestResult>;
    testModuleStructure(): Promise<TestResult>;
    testAgentConfigValidity(): Promise<TestResult>;
    private getAllFilesRecursive;
    private scanSourceFiles;
    private parseImports;
    private parseExports;
    private parseClasses;
    private parseInterfaces;
    private buildDependencyGraph;
    private detectCycles;
    private inferCluster;
    private getFileCluster;
    private getImportCluster;
}
