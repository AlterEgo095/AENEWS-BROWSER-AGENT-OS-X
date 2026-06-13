import { CapabilityId, CapabilityPack } from '../interfaces';
import { ICapabilityConnector, ConnectorInput, ConnectorOutput } from './connector.interface';
export declare class BusinessConnector implements ICapabilityConnector {
    readonly supportedPack = CapabilityPack.BUSINESS;
    private readonly logger;
    private readonly llm;
    private static readonly BUSINESS_CAPABILITIES;
    private static readonly SYSTEM_PROMPTS;
    supports(capabilityId: CapabilityId): boolean;
    execute(capabilityId: CapabilityId, input: ConnectorInput): Promise<ConnectorOutput>;
    private makeArtifact;
}
