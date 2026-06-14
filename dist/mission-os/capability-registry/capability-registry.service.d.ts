import { OnModuleInit } from '@nestjs/common';
export interface CapabilityDescriptor {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
    outputSchema: Record<string, any>;
    version: string;
    deprecated: boolean;
    costEstimate: number;
    latencyEstimate: number;
    tags?: string[];
    category?: string;
    semanticVersion?: string;
    dependencies?: string[];
    skillLevel?: number;
    successRate?: number;
    currentLoad?: number;
}
export interface CapabilityRegistration {
    agentId: string;
    agentName?: string;
    capabilities: CapabilityDescriptor[];
}
export interface CapabilitySearchResult {
    capability: CapabilityDescriptor;
    agentId: string;
    agentName: string;
    score: number;
}
export interface AgentSelectionCriteria {
    maxCost?: number;
    maxLatency?: number;
    minSuccessRate?: number;
    preferAgentId?: string;
    minSkillLevel?: number;
    excludeAgents?: string[];
}
export interface CapabilityGraphNode {
    capabilityName: string;
    category?: string;
    description: string;
    providers: string[];
}
export interface CapabilityGraphEdge {
    from: string;
    to: string;
    type: 'dependency' | 'complementary' | 'alternative';
}
export interface CapabilityGraph {
    nodes: CapabilityGraphNode[];
    edges: CapabilityGraphEdge[];
}
export interface RegistryStats {
    totalCapabilities: number;
    totalAgents: number;
    capabilitiesByCategory: Record<string, number>;
    deprecatedCount: number;
    agentCoverage: Record<string, number>;
    averageSkillLevel: number;
    averageSuccessRate: number;
}
export interface CapabilityDetail {
    capabilityName: string;
    description: string;
    category?: string;
    providers: Array<{
        agentId: string;
        agentName: string;
        descriptor: CapabilityDescriptor;
    }>;
    totalProviders: number;
    averageCost: number;
    averageLatency: number;
    averageSuccessRate: number;
}
export declare const CAPABILITY_PUBLISHED = "capability.published";
export declare const CAPABILITY_UNPUBLISHED = "capability.unpublished";
export declare const CAPABILITY_UPDATED = "capability.updated";
export declare const CAPABILITY_DEPRECATED = "capability.deprecated";
export interface CapabilityEventPayload {
    agentId: string;
    agentName?: string;
    capabilityName?: string;
    timestamp: number;
}
export declare class CapabilityRegistryService implements OnModuleInit {
    private readonly logger;
    private capabilityIndex;
    private agentCapabilities;
    private capabilityCategories;
    private agentNames;
    private eventListeners;
    onModuleInit(): void;
    on(event: string, listener: (payload: CapabilityEventPayload) => void): () => void;
    private emitEvent;
    publishCapabilities(agentId: string, registration: CapabilityRegistration): void;
    unpublishCapabilities(agentId: string): void;
    updateCapability(agentId: string, capabilityName: string, descriptor: Partial<CapabilityDescriptor>): void;
    deprecateCapability(agentId: string, capabilityName: string): void;
    searchCapabilities(query: {
        name?: string;
        description?: string;
        tags?: string[];
        category?: string;
        includeDeprecated?: boolean;
    }): CapabilitySearchResult[];
    getAgentsWithCapability(capabilityName: string): Array<{
        agentId: string;
        agentName: string;
        descriptor: CapabilityDescriptor;
    }>;
    getCapabilityDetails(capabilityName: string): CapabilityDetail | null;
    findBestAgentForCapability(capabilityName: string, criteria?: AgentSelectionCriteria): {
        agentId: string;
        agentName: string;
        descriptor: CapabilityDescriptor;
        score: number;
    } | null;
    getCapabilityGraph(): CapabilityGraph;
    getRegistryStats(): RegistryStats;
    private addToCategoryIndex;
    private removeFromCategoryIndex;
    private computeSearchScore;
    private fuzzyMatch;
    hasCapability(agentId: string, capabilityName: string): boolean;
    getCapability(agentId: string, capabilityName: string): CapabilityDescriptor | undefined;
    getAllCapabilityNames(): string[];
    getAllAgentIds(): string[];
    clear(): void;
}
