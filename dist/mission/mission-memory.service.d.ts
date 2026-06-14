export interface MissionContext {
    missionId: string;
    instruction: string;
    userId: string;
    projectId: string | null;
    startTime: Date;
    currentPhase: string | null;
    phaseResults: Record<string, PhaseResult[]>;
    metadata: Record<string, unknown>;
}
export interface PhaseResult {
    phaseType: string;
    result: unknown;
    timestamp: Date;
    durationMs: number;
    success: boolean;
    metadata: Record<string, unknown>;
}
export interface MissionHistoryItem {
    id: string;
    missionId: string;
    timestamp: Date;
    type: 'PHASE_START' | 'PHASE_COMPLETE' | 'PHASE_FAIL' | 'DATA_STORE' | 'DATA_RETRIEVE' | 'ALERT' | 'NOTE';
    description: string;
    data: unknown;
}
export interface ProjectData {
    projectId: string;
    name: string;
    description: string;
    techStack: string[];
    repositoryUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, unknown>;
}
export interface UserPreferences {
    userId: string;
    language: string;
    notificationLevel: 'ALL' | 'IMPORTANT' | 'MINIMAL' | 'NONE';
    defaultPriority: string;
    preferredTeams: string[];
    customSettings: Record<string, unknown>;
    updatedAt: Date;
}
export declare class MissionMemoryService {
    private readonly logger;
    private readonly missionStores;
    private readonly projects;
    private readonly userPreferences;
    private historyIdCounter;
    store(missionId: string, key: string, value: unknown): void;
    retrieve(missionId: string, key: string): unknown;
    getMissionContext(missionId: string): MissionContext | null;
    initializeMissionContext(missionId: string, instruction: string, userId: string, projectId: string | null, metadata?: Record<string, unknown>): MissionContext;
    addPhaseResult(missionId: string, phaseType: string, result: unknown): void;
    getPhaseResults(missionId: string, phaseType?: string): PhaseResult[];
    search(missionId: string, query: string): unknown[];
    getHistory(missionId: string): MissionHistoryItem[];
    setProject(projectId: string, data: Partial<ProjectData> & {
        name: string;
    }): ProjectData;
    getProject(projectId: string): ProjectData | null;
    setUserPreferences(userId: string, prefs: Partial<UserPreferences>): UserPreferences;
    getUserPreferences(userId: string): UserPreferences | null;
    summarize(missionId: string): string;
    cleanup(missionId: string): void;
    private getOrCreateStore;
    private addHistoryItem;
}
