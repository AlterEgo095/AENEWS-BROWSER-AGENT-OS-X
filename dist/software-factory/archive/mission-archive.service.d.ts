export interface ArchivedMission {
    id: string;
    missionId: string;
    archivedAt: Date;
    execution: any;
    timeline: any;
    contract: any;
    memory: any;
    agentStats: any;
    summary: ArchiveSummary;
}
export interface ArchiveSummary {
    objective: string;
    result: 'success' | 'partial' | 'failed';
    qualityScore: number;
    totalDurationMs: number;
    totalCostUsd: number;
    artifactsDelivered: number;
    certificationPassed: boolean;
    lessonsLearned: string[];
}
export declare class MissionArchiveService {
    private readonly logger;
    private readonly archives;
    archive(missionId: string, data: {
        execution: any;
        timeline: any;
        contract: any;
        memory: any;
        agentStats: any;
    }): Promise<ArchivedMission>;
    getArchive(missionId: string): ArchivedMission | undefined;
    listArchives(): ArchivedMission[];
    searchArchives(criteria: {
        result?: 'success' | 'partial' | 'failed';
        minQuality?: number;
        maxCost?: number;
        since?: Date;
    }): ArchivedMission[];
    getStatistics(): {
        totalMissions: number;
        successRate: number;
        averageQualityScore: number;
        averageCost: number;
        averageDurationMs: number;
    };
}
