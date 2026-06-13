export interface MemoryTask {
    id: string;
    capability: 'rag_query' | 'store' | 'retrieve' | 'context' | 'project' | 'preferences' | 'summarize';
    params: Record<string, any>;
    missionId: string;
}
export interface MemoryResult {
    taskId: string;
    success: boolean;
    data?: any;
    context?: Record<string, any>;
    error?: string;
    durationMs: number;
}
interface ProjectState {
    projectId: string;
    name: string;
    status: 'planning' | 'in_progress' | 'review' | 'delivered';
    progress: number;
    milestones: Array<{
        name: string;
        completed: boolean;
        dueDate?: Date;
    }>;
    metadata: Record<string, any>;
    updatedAt: Date;
}
interface UserPreferences {
    userId: string;
    settings: Record<string, any>;
    notificationPreferences: Record<string, boolean>;
    uiPreferences: Record<string, any>;
    updatedAt: Date;
}
export declare class MemoryTeamService {
    private readonly logger;
    private readonly missions;
    private readonly projects;
    private readonly userPreferences;
    private readonly taskLog;
    private metrics;
    execute(task: MemoryTask): Promise<MemoryResult>;
    store(missionId: string, key: string, value: any, options?: {
        namespace?: string;
        tags?: string[];
        ttlMs?: number;
    }): Promise<MemoryResult>;
    retrieve(missionId: string, key: string): Promise<MemoryResult>;
    query(missionId: string, query: string): Promise<MemoryResult>;
    getContext(missionId: string): Promise<MemoryResult>;
    getProject(projectId: string): Promise<ProjectState | null>;
    getPreferences(userId: string): Promise<UserPreferences | null>;
    summarize(missionId: string): Promise<MemoryResult>;
    getStatus(): {
        team: string;
        activeMissions: number;
        activeProjects: number;
        registeredUsers: number;
        tasksCompleted: number;
        tasksFailed: number;
        totalEntriesStored: number;
        totalQueries: number;
        avgDurationMs: number;
        missions: Array<{
            missionId: string;
            status: string;
            entryCount: number;
            timelineEventCount: number;
            lastActivity: Date;
        }>;
    };
    private ensureMission;
    private ensureProject;
    private ensureUserPreferences;
    private generateEmbedding;
    private cosineSimilarity;
    private sleep;
}
export {};
