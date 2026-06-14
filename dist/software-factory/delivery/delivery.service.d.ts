import { MissionContract, DeliverableType } from '../interfaces';
interface ExecutionResults {
    durationMs?: number;
    codeArtifacts?: {
        linesOfCode: number;
        testFilesCreated: number;
    };
    deploymentData?: {
        healthChecksPassed: boolean;
    };
    documentArtifacts?: {
        pagesGenerated: number;
    };
}
interface CertificationCheck {
    domain: string;
    score: number;
}
interface CertificationResult {
    qualityScore: number;
    certified: boolean;
    checks: CertificationCheck[];
}
export interface DeliveryPackage {
    id: string;
    missionId: string;
    contractId: string;
    status: 'preparing' | 'ready' | 'delivered' | 'failed';
    deliverables: DeliveredArtifact[];
    summary: DeliverySummary;
    accessUrl?: string;
    preparedAt: Date;
    deliveredAt?: Date;
}
export interface DeliveredArtifact {
    type: DeliverableType;
    name: string;
    path: string;
    size: number;
    checksum: string;
    validated: boolean;
}
export interface DeliverySummary {
    missionObjective: string;
    qualityScore: number;
    certified: boolean;
    totalArtifacts: number;
    totalSize: number;
    executionTimeMs: number;
    apiCostUsd: number;
    testCoverage: number;
    securityScore: number;
}
export interface DeliveryOptions {
    format: 'zip' | 'github' | 'docker' | 'all';
    includeSource: boolean;
    includeDocumentation: boolean;
    includeTests: boolean;
    includeDocker: boolean;
    includeDeployment: boolean;
    notificationEmail?: string;
    notificationWebhook?: string;
}
export declare class DeliveryService {
    private readonly logger;
    private readonly deliveries;
    deliver(missionId: string, contract: MissionContract | undefined, allResults: {
        execution?: ExecutionResults;
        certification?: CertificationResult;
        tests?: any;
        audit?: any;
    }): Promise<DeliveryPackage>;
    getDelivery(missionId: string): DeliveryPackage | undefined;
    getAllDeliveries(): DeliveryPackage[];
}
export {};
