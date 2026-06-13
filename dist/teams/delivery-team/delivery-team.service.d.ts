export interface DeliveryTask {
    id: string;
    capability: 'pdf' | 'zip' | 'github' | 'docker' | 'deploy' | 'notify' | 'package_all';
    params: Record<string, any>;
    missionId: string;
}
export interface DeliveryResult {
    taskId: string;
    success: boolean;
    deliverableType: string;
    location: string;
    url?: string;
    size?: number;
    error?: string;
    durationMs: number;
}
export declare class DeliveryTeamService {
    private readonly logger;
    private readonly contexts;
    private readonly taskLog;
    private metrics;
    execute(task: DeliveryTask): Promise<DeliveryResult>;
    generatePDF(content: any, options?: {
        title?: string;
        format?: string;
        orientation?: string;
        template?: string;
        includeTableOfContents?: boolean;
    }, missionId?: string): Promise<DeliveryResult>;
    createZip(files: string[], options?: {
        name?: string;
        compressionLevel?: number;
        includeReadme?: boolean;
        excludePatterns?: string[];
    }, missionId?: string): Promise<DeliveryResult>;
    pushToGitHub(repo: string, files: string[], missionId?: string): Promise<DeliveryResult>;
    buildDocker(dockerfile: string, tag?: string, missionId?: string): Promise<DeliveryResult>;
    deploy(config: {
        environment?: string;
        provider?: string;
        region?: string;
        strategy?: string;
    }, target: string, missionId?: string): Promise<DeliveryResult>;
    sendNotification(recipients: string | string[], message: string, missionId?: string): Promise<DeliveryResult>;
    packageAll(missionId: string): Promise<DeliveryResult>;
    getStatus(): {
        team: string;
        activeContexts: number;
        tasksCompleted: number;
        tasksFailed: number;
        totalDeliverables: number;
        totalBytesDelivered: number;
        avgDurationMs: number;
        contexts: Array<{
            missionId: string;
            deliverableCount: number;
            deploymentCount: number;
            notificationCount: number;
            lastActivity: Date;
        }>;
    };
    private ensureContext;
    private generateId;
    private generateCommitSha;
    private sleep;
}
