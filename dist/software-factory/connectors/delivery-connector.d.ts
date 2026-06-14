import { CapabilityId, CapabilityPack } from '../interfaces';
import { ICapabilityConnector, ConnectorInput, ConnectorOutput } from './connector.interface';
export declare class DeliveryConnector implements ICapabilityConnector {
    readonly supportedPack = CapabilityPack.DELIVERY;
    private readonly logger;
    private static readonly DELIVERY_CAPABILITIES;
    supports(capabilityId: CapabilityId): boolean;
    execute(capabilityId: CapabilityId, input: ConnectorInput): Promise<ConnectorOutput>;
    private executeZip;
    private executeGithub;
    private executeDockerRegistry;
    private executeVps;
    private executePdfReport;
    private executeNotification;
    private executeDeployment;
    private executeCloud;
    private executeCdn;
    private executeBackup;
    private executeMonitoringSetup;
    private executeLoadBalancer;
    private executeGenericDelivery;
    private notImplemented;
    private makeArtifact;
    private generateDeliveryReport;
    private countFiles;
    private calculateTotalSize;
    private listFiles;
}
