export interface BusinessTask {
    id: string;
    capability: 'marketing' | 'seo' | 'crm' | 'reporting' | 'analysis' | 'audit' | 'strategy';
    params: Record<string, any>;
    missionId: string;
}
export interface BusinessResult {
    taskId: string;
    success: boolean;
    report?: any;
    recommendations?: string[];
    metrics?: Record<string, number>;
    error?: string;
    durationMs: number;
}
export declare class BusinessTeamService {
    private readonly logger;
    private readonly contexts;
    private readonly taskLog;
    private metrics;
    execute(task: BusinessTask): Promise<BusinessResult>;
    analyzeMarket(data: {
        industry?: string;
        competitors?: string[];
        region?: string;
    }, missionId?: string): Promise<BusinessResult>;
    generateSEOReport(url: string, missionId?: string): Promise<BusinessResult>;
    createCampaign(spec: {
        name?: string;
        type?: string;
        channels?: string[];
        budget?: number;
        targetAudience?: string;
        duration?: string;
    }, missionId?: string): Promise<BusinessResult>;
    generateReport(data: any, format?: 'pdf' | 'html' | 'json' | 'csv', missionId?: string): Promise<BusinessResult>;
    auditWebsite(url: string, missionId?: string): Promise<BusinessResult>;
    analyzeData(dataset: any, missionId?: string): Promise<BusinessResult>;
    private developStrategy;
    private manageCRM;
    getStatus(): {
        team: string;
        activeContexts: number;
        tasksCompleted: number;
        tasksFailed: number;
        avgDurationMs: number;
        contexts: Array<{
            missionId: string;
            campaignCount: number;
            seoReportCount: number;
            crmContacts: number;
            reportCount: number;
            auditCount: number;
            lastActivity: Date;
        }>;
    };
    private ensureContext;
    private generateId;
    private sleep;
}
