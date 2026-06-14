import { CapabilityId, CapabilityPack } from '../interfaces';
import { ICapabilityConnector } from './connector.interface';
import { DevelopmentConnector } from './development-connector';
import { BrowserConnector } from './browser-connector';
import { CertificationConnector } from './certification-connector';
import { DeliveryConnector } from './delivery-connector';
import { OfficeConnector } from './office-connector';
import { BusinessConnector } from './business-connector';
export declare class ConnectorRegistry {
    private readonly devConnector;
    private readonly browserConnector;
    private readonly certConnector;
    private readonly deliveryConnector;
    private readonly officeConnector;
    private readonly businessConnector;
    private readonly logger;
    private readonly packConnectors;
    private readonly idConnectors;
    constructor(devConnector: DevelopmentConnector, browserConnector: BrowserConnector, certConnector: CertificationConnector, deliveryConnector: DeliveryConnector, officeConnector: OfficeConnector, businessConnector: BusinessConnector);
    getConnector(capabilityId: CapabilityId): ICapabilityConnector | undefined;
    getConnectorByPack(pack: CapabilityPack): ICapabilityConnector | undefined;
    hasConnector(capabilityId: CapabilityId): boolean;
    getAllConnectors(): ICapabilityConnector[];
    getStatistics(): {
        totalConnectors: number;
        packs: string[];
        capabilitiesCovered: number;
    };
    private registerConnector;
    private getCapabilityIdsForPack;
}
