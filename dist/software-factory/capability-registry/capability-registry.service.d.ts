import { CapabilityPack, CapabilityDefinition, CapabilityId } from '../interfaces';
export declare class CapabilityRegistryService {
    private readonly logger;
    private readonly capabilities;
    private readonly packIndex;
    constructor();
    getCapability(id: CapabilityId): CapabilityDefinition | undefined;
    getPack(pack: CapabilityPack): CapabilityDefinition[];
    getAllCapabilities(): CapabilityDefinition[];
    getPackOverview(): Record<CapabilityPack, {
        name: string;
        count: number;
        capabilities: string[];
    }>;
    searchByKeyword(keyword: string): CapabilityDefinition[];
    findCapabilitiesForMission(missionText: string): CapabilityDefinition[];
    getTotalCount(): number;
    private getPackName;
    private register;
    private initializeBrowserPack;
    private initializeDevelopmentPack;
    private initializeOfficePack;
    private initializeBusinessPack;
    private initializeCertificationPack;
    private initializeDeliveryPack;
}
