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
export declare class CommunicationCertificationService {
    private readonly logger;
    private serviceAnalyses;
    runAll(): Promise<DomainResult>;
    testEventPubSub(services: ServiceAnalysis[]): Promise<TestResult>;
    testDeadLetterQueue(services: ServiceAnalysis[]): Promise<TestResult>;
    testEventPersistence(services: ServiceAnalysis[]): Promise<TestResult>;
    testEventReplay(services: ServiceAnalysis[]): Promise<TestResult>;
    testInterAgentMessaging(services: ServiceAnalysis[]): Promise<TestResult>;
    testCorrelationIdTracking(services: ServiceAnalysis[]): Promise<TestResult>;
    testMessageBroker(services: ServiceAnalysis[]): Promise<TestResult>;
    testNoEventLoss(services: ServiceAnalysis[]): Promise<TestResult>;
    testEventOrdering(services: ServiceAnalysis[]): Promise<TestResult>;
    testSubscriptionManagement(services: ServiceAnalysis[]): Promise<TestResult>;
    private simulatePubSub;
    private simulateDeadLetterQueue;
    private simulateInterAgentMessaging;
    private analyzeServices;
}
export {};
