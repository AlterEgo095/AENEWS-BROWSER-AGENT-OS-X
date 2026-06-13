export interface MissionContext {
    instruction: string;
    contractId: string;
    quality: string;
    budget: number;
    deadline: Date;
    [key: string]: any;
}
export interface MemoryEntry {
    id: string;
    missionId: string;
    category: 'context' | 'plan' | 'research' | 'build' | 'test' | 'audit' | 'certification' | 'delivery';
    key: string;
    data: any;
    createdAt: Date;
    updatedAt: Date;
}
export declare class MissionMemoryService {
    private readonly logger;
    private readonly contexts;
    private readonly entries;
    storeContext(missionId: string, context: MissionContext): void;
    getContext(missionId: string): MissionContext | undefined;
    storePlan(missionId: string, plan: any): void;
    getPlan(missionId: string): any;
    storeResearch(missionId: string, research: any): void;
    getResearch(missionId: string): any;
    storeBuildResults(missionId: string, results: any): void;
    getBuildResults(missionId: string): any;
    storeTestResults(missionId: string, results: any): void;
    getTestResults(missionId: string): any;
    storeAuditResults(missionId: string, results: any): void;
    getAuditResults(missionId: string): any;
    storeCertification(missionId: string, results: any): void;
    getCertification(missionId: string): any;
    getAllResults(missionId: string): Record<string, any>;
    exportMission(missionId: string): {
        context: MissionContext | undefined;
        entries: MemoryEntry[];
    };
    clearMission(missionId: string): void;
    private addEntry;
    private getLatestEntry;
}
