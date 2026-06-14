import { CapabilityId, CapabilityPack } from '../interfaces';
import { ICapabilityConnector, ConnectorInput, ConnectorOutput } from './connector.interface';
export declare class OfficeConnector implements ICapabilityConnector {
    readonly supportedPack = CapabilityPack.OFFICE;
    private readonly logger;
    private readonly llm;
    private static readonly OFFICE_CAPABILITIES;
    supports(capabilityId: CapabilityId): boolean;
    execute(capabilityId: CapabilityId, input: ConnectorInput): Promise<ConnectorOutput>;
    private executePdf;
    private executeDocx;
    private executeExcel;
    private executePowerpoint;
    private executeOcr;
    private executeSignature;
    private executeEmail;
    private executeCalendar;
    private executeGenericOffice;
    private makeArtifact;
    private generateICS;
}
