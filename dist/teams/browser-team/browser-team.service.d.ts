export interface BrowserTask {
    id: string;
    capability: 'navigate' | 'connect' | 'download' | 'upload' | 'search' | 'screenshot' | 'fill_form' | 'extract_data';
    params: Record<string, any>;
    missionId: string;
}
export interface BrowserResult {
    taskId: string;
    success: boolean;
    data: any;
    screenshots?: string[];
    extractedData?: any[];
    error?: string;
    durationMs: number;
}
interface NavigationEntry {
    url: string;
    timestamp: Date;
    statusCode: number;
    loadTimeMs: number;
}
export declare class BrowserTeamService {
    private readonly logger;
    private readonly sessions;
    private readonly taskLog;
    private metrics;
    execute(task: BrowserTask): Promise<BrowserResult>;
    navigate(url: string, options?: {
        waitUntil?: string;
        timeout?: number;
        connectOnly?: boolean;
    }, missionId?: string): Promise<BrowserResult>;
    search(query: string, engine?: 'google' | 'bing' | 'duckduckgo', missionId?: string): Promise<BrowserResult>;
    download(url: string, targetPath: string, missionId?: string): Promise<BrowserResult>;
    upload(url: string, filePath: string, missionId?: string): Promise<BrowserResult>;
    extractData(url: string, selectors: string[], missionId?: string): Promise<BrowserResult>;
    fillForm(url: string, fields: Record<string, string>, missionId?: string): Promise<BrowserResult>;
    screenshot(url: string, missionId?: string): Promise<BrowserResult>;
    getStatus(): {
        team: string;
        activeSessions: number;
        tasksCompleted: number;
        tasksFailed: number;
        totalDurationMs: number;
        avgDurationMs: number;
        sessions: Array<{
            missionId: string;
            historyLength: number;
            lastActivity: Date;
        }>;
    };
    private ensureSession;
    clearSession(missionId: string): boolean;
    getSessionHistory(missionId: string): NavigationEntry[];
    private simulateLatency;
    private simulateStatusCode;
    private simulateTitle;
    private estimateFileSize;
    private guessMimeType;
    private simulateChecksum;
    private generateId;
    private sleep;
}
export {};
