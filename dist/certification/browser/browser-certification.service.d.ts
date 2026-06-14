import { DomainResult, TestResult } from '../types';
interface AgentAnalysis {
    filePath: string;
    fileName: string;
    dirName: string;
    content: string;
    className: string;
    tools: string[];
    capabilities: string[];
    methods: string[];
    hasInputValidation: boolean;
    hasErrorHandling: boolean;
    hasOutputStructure: boolean;
    hasOnDestroy: boolean;
    hasCleanup: boolean;
    extendsBaseAgent: boolean;
    hasInjectable: boolean;
    hasLogger: boolean;
}
export declare class BrowserCertificationService {
    private readonly logger;
    private agentAnalyses;
    runAll(): Promise<DomainResult>;
    testNavigation(agents: Map<string, AgentAnalysis>): Promise<TestResult>;
    testAuthentication(agents: Map<string, AgentAnalysis>): Promise<TestResult>;
    testFormHandling(agents: Map<string, AgentAnalysis>): Promise<TestResult>;
    testDownloads(agents: Map<string, AgentAnalysis>): Promise<TestResult>;
    testUploads(agents: Map<string, AgentAnalysis>): Promise<TestResult>;
    testPopupHandling(agents: Map<string, AgentAnalysis>): Promise<TestResult>;
    testScreenshots(agents: Map<string, AgentAnalysis>): Promise<TestResult>;
    testSessionPersistence(agents: Map<string, AgentAnalysis>): Promise<TestResult>;
    testWaitStrategies(agents: Map<string, AgentAnalysis>): Promise<TestResult>;
    testJavaScriptExecution(agents: Map<string, AgentAnalysis>): Promise<TestResult>;
    private simulateSessionPersistence;
    private analyzeBrowserAgents;
}
export {};
