import { OnModuleInit } from '@nestjs/common';
export interface MarketplacePlugin {
    id: string;
    name: string;
    version: string;
    description: string;
    cluster: string;
    author: string;
    homepage: string;
    repository: string;
    capabilities: PluginCapability[];
    dependencies: PluginDependency[];
    installed: boolean;
    installedAt: Date | null;
    enabled: boolean;
    config: Record<string, any>;
    rating: number;
    downloads: number;
    size: string;
    license: string;
    tags: string[];
    compatibility: {
        minVersion: string;
        maxVersion: string;
    };
    lastUpdated: Date;
}
export interface PluginCapability {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
    outputSchema: Record<string, any>;
    agentCount: number;
}
export interface PluginDependency {
    pluginId: string;
    versionRange: string;
    required: boolean;
}
export interface PluginManifest {
    manifestVersion: string;
    plugin: Omit<MarketplacePlugin, 'installed' | 'installedAt' | 'enabled' | 'rating' | 'downloads'>;
    entryPoint: string;
    permissions: string[];
    checksum: string;
}
export interface PluginInstallResult {
    success: boolean;
    pluginId: string;
    message: string;
    errors: string[];
    warnings: string[];
}
export interface PluginRegistry {
    plugins: Map<string, MarketplacePlugin>;
    categories: Map<string, string[]>;
    tags: Map<string, string[]>;
}
export interface PluginSearchFilters {
    installed?: boolean;
    category?: string;
    tags?: string[];
    minRating?: number;
}
export interface PluginStats {
    totalPlugins: number;
    installedPlugins: number;
    enabledPlugins: number;
    byCategory: Record<string, number>;
    averageRating: number;
    totalDownloads: number;
}
export interface DependencyCheckResult {
    pluginId: string;
    satisfied: boolean;
    missing: Array<{
        pluginId: string;
        versionRange: string;
        required: boolean;
    }>;
    installed: Array<{
        pluginId: string;
        version: string;
    }>;
}
export declare class MarketplaceService implements OnModuleInit {
    private readonly logger;
    private readonly registry;
    private readonly activeCapabilities;
    private readonly eventListeners;
    onModuleInit(): void;
    on(event: string, listener: (payload: any) => void): () => void;
    private emitEvent;
    initialize(): void;
    registerPlugin(manifest: PluginManifest): MarketplacePlugin;
    unregisterPlugin(pluginId: string): void;
    installPlugin(pluginId: string, config?: Record<string, any>): PluginInstallResult;
    uninstallPlugin(pluginId: string): PluginInstallResult;
    enablePlugin(pluginId: string): void;
    disablePlugin(pluginId: string): void;
    configurePlugin(pluginId: string, config: Record<string, any>): Record<string, any>;
    searchPlugins(query: string, filters?: PluginSearchFilters): Array<{
        plugin: MarketplacePlugin;
        score: number;
    }>;
    getPlugin(pluginId: string): MarketplacePlugin | null;
    getInstalledPlugins(): MarketplacePlugin[];
    getEnabledPlugins(): MarketplacePlugin[];
    getPluginsByCategory(category: string): MarketplacePlugin[];
    checkDependencies(pluginId: string): DependencyCheckResult;
    getPluginStats(): PluginStats;
    updatePlugin(pluginId: string): PluginInstallResult;
    getCategories(): string[];
    getTags(): string[];
    getActiveCapabilities(pluginId: string): string[];
    getAllActiveCapabilities(): Map<string, string[]>;
    clear(): void;
    private validateManifest;
    private addToIndex;
    private removeFromIndex;
    private isVersionCompatible;
    private isVersionInRange;
    private stripRangePrefix;
    private compareSemver;
    private parseSemver;
    private bumpPatchVersion;
    private fuzzyMatch;
    private deepMerge;
}
