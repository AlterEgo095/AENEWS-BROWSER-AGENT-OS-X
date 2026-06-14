import { CapabilityId, CapabilityPack } from '../interfaces';
import { ICapabilityConnector, ConnectorInput, ConnectorOutput } from './connector.interface';
export declare class CertificationConnector implements ICapabilityConnector {
    readonly supportedPack = CapabilityPack.CERTIFICATION;
    private readonly logger;
    private readonly llm;
    private static readonly CERT_CAPABILITIES;
    supports(capabilityId: CapabilityId): boolean;
    execute(capabilityId: CapabilityId, input: ConnectorInput): Promise<ConnectorOutput>;
    private executeArchitectureReview;
    private executeSecurityAudit;
    private executeTestCoverage;
    private executeRegression;
    private executePerformance;
    private executeDocReview;
    private executeIntegration;
    private executeCompliance;
    private executeAccessibility;
    private executeDataPrivacy;
    private executeGenericCert;
    private writeCertReport;
    private makeArtifact;
    private collectSourceFiles;
    private collectFilesByExtension;
}
