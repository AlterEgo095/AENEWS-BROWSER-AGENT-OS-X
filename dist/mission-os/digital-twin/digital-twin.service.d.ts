export interface TwinVPS {
    id: string;
    host: string;
    ip: string;
    status: 'running' | 'stopped' | 'error';
    cpu: {
        cores: number;
        usagePercent: number;
    };
    memory: {
        totalGb: number;
        usedGb: number;
        usagePercent: number;
    };
    disk: {
        totalGb: number;
        usedGb: number;
        usagePercent: number;
    };
    os: string;
    services: TwinVPSService[];
    lastSyncAt: Date;
}
export interface TwinVPSService {
    name: string;
    port: number;
    status: 'running' | 'stopped';
    protocol: string;
}
export interface TwinContainer {
    id: string;
    name: string;
    image: string;
    status: 'running' | 'stopped' | 'paused' | 'restarting' | 'dead';
    ports: Array<{
        internal: number;
        external: number;
        protocol: string;
    }>;
    resources: {
        cpuPercent: number;
        memoryMb: number;
        memoryLimitMb: number;
    };
    health: 'healthy' | 'unhealthy' | 'starting' | 'unknown';
    createdAt: Date;
    lastSyncAt: Date;
}
export interface TwinDatabase {
    id: string;
    type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'neo4j' | 'qdrant';
    host: string;
    port: number;
    status: 'connected' | 'disconnected' | 'error';
    size: {
        totalMb: number;
        usedMb: number;
    };
    connections: {
        active: number;
        max: number;
    };
    replication: {
        enabled: boolean;
        role: 'primary' | 'replica';
        lagMs: number;
    };
    lastSyncAt: Date;
}
export interface TwinAPI {
    id: string;
    name: string;
    endpoint: string;
    method: string;
    status: 'operational' | 'degraded' | 'down';
    avgLatencyMs: number;
    rateLimit: {
        remaining: number;
        limit: number;
        resetAt: Date;
    };
    lastSyncAt: Date;
}
export interface TwinGitRepo {
    id: string;
    name: string;
    url: string;
    branch: string;
    lastCommit: {
        hash: string;
        message: string;
        author: string;
        date: Date;
    };
    status: 'clean' | 'dirty' | 'ahead' | 'behind';
    aheadBy: number;
    behindBy: number;
    lastSyncAt: Date;
}
export interface TwinCloudService {
    id: string;
    provider: 'aws' | 'gcp' | 'azure' | 'digitalocean' | 'other';
    service: string;
    region: string;
    status: 'operational' | 'degraded' | 'down' | 'maintenance';
    cost: {
        daily: number;
        monthly: number;
    };
    lastSyncAt: Date;
}
export interface TwinBrowser {
    id: string;
    type: 'chromium' | 'firefox' | 'webkit';
    version: string;
    sessions: {
        active: number;
        max: number;
    };
    status: 'operational' | 'degraded' | 'down';
    lastSyncAt: Date;
}
export interface DigitalTwinState {
    id: string;
    lastSyncAt: Date;
    vps: TwinVPS[];
    containers: TwinContainer[];
    databases: TwinDatabase[];
    apis: TwinAPI[];
    gitRepos: TwinGitRepo[];
    cloudServices: TwinCloudService[];
    browsers: TwinBrowser[];
    syncIntervalMs: number;
}
export type ComponentType = 'vps' | 'containers' | 'databases' | 'apis' | 'gitRepos' | 'cloudServices' | 'browsers';
export interface ComponentChange {
    componentType: ComponentType;
    componentId: string;
    changeType: 'added' | 'removed' | 'updated';
    field?: string;
    previousValue?: any;
    newValue?: any;
    timestamp: Date;
}
export interface SyncResult {
    syncId: string;
    startedAt: Date;
    completedAt: Date;
    changes: ComponentChange[];
    componentsSynced: number;
    driftDetected: boolean;
}
export interface DriftEntry {
    componentType: ComponentType;
    componentId: string;
    field: string;
    expectedValue: any;
    actualValue: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
}
export interface HealthSummary {
    overallScore: number;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
    componentCounts: {
        total: number;
        healthy: number;
        degraded: number;
        unhealthy: number;
        unknown: number;
    };
    breakdown: Record<ComponentType, {
        score: number;
        count: number;
        healthy: number;
        degraded: number;
        unhealthy: number;
    }>;
    alerts: Array<{
        componentType: ComponentType;
        componentId: string;
        message: string;
    }>;
}
export interface CostSummary {
    dailyTotal: number;
    monthlyTotal: number;
    monthlyProjected: number;
    byProvider: Record<string, {
        daily: number;
        monthly: number;
    }>;
    byService: Record<string, {
        daily: number;
        monthly: number;
    }>;
}
export declare class DigitalTwinService {
    private readonly logger;
    private state;
    private readonly changeHistory;
    private readonly expectedBaselines;
    constructor();
    initialize(state?: Partial<DigitalTwinState>): void;
    syncAll(): SyncResult;
    syncVPS(vpsId?: string): ComponentChange[];
    syncContainers(): ComponentChange[];
    syncDatabases(): ComponentChange[];
    syncAPIs(): ComponentChange[];
    syncGitRepos(): ComponentChange[];
    syncCloudServices(): ComponentChange[];
    syncBrowsers(): ComponentChange[];
    getState(): DigitalTwinState;
    getComponent(componentType: ComponentType, id: string): any | null;
    findComponentByProperty(componentType: ComponentType, property: string, value: any): any[];
    detectDrift(): DriftEntry[];
    getHealthSummary(): HealthSummary;
    getCostSummary(): CostSummary;
    registerComponent(componentType: ComponentType, component: any): void;
    updateComponent(componentType: ComponentType, id: string, updates: Record<string, any>): void;
    removeComponent(componentType: ComponentType, id: string): void;
    setExpectedBaseline(componentType: ComponentType, componentId: string, baseline: Record<string, any>): void;
    getChangeHistory(componentType?: ComponentType): ComponentChange[];
    countAllComponents(): number;
    private createDefaultState;
    private getCollection;
    private createChange;
    private simulateMetric;
    private randomHash;
    private getNestedProperty;
    private classifyDriftSeverity;
    private computeComponentHealth;
    private deepClone;
}
