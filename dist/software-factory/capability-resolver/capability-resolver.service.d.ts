import { CapabilityId, CapabilityPack, CapabilityResolution } from '../interfaces';
import { CapabilityRegistryService } from '../capability-registry/capability-registry.service';
export interface MissionRequirements {
    missionId: string;
    instruction: string;
    explicitCapabilities?: CapabilityId[];
    inferredPacks?: CapabilityPack[];
}
export declare class CapabilityResolverService {
    private readonly registry;
    private readonly logger;
    constructor(registry: CapabilityRegistryService);
    resolve(requirements: MissionRequirements): CapabilityResolution;
    resolveIds(requirements: MissionRequirements): CapabilityId[];
    private inferFromMissionText;
    private getMatchingKeyword;
    private resolveDependencies;
    private resolveImpliedCapabilities;
    private addDefaultCertificationCapabilities;
    private addDefaultDeliveryCapabilities;
    private calculatePriority;
    private calculateConfidence;
}
