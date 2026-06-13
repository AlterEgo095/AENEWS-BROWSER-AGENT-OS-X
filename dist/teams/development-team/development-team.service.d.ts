export interface DevTask {
    id: string;
    capability: 'frontend' | 'backend' | 'database' | 'devops' | 'qa' | 'documentation' | 'code_review' | 'debug';
    params: Record<string, any>;
    missionId: string;
}
export interface DevResult {
    taskId: string;
    success: boolean;
    artifacts: string[];
    code?: string;
    testsPassed?: number;
    testsFailed?: number;
    error?: string;
    durationMs: number;
}
export declare class DevelopmentTeamService {
    private readonly logger;
    private readonly projects;
    private readonly taskLog;
    private metrics;
    execute(task: DevTask): Promise<DevResult>;
    generateFrontend(spec: {
        name?: string;
        components?: string[];
        framework?: string;
    }, missionId?: string): Promise<DevResult>;
    generateBackend(spec: {
        name?: string;
        endpoints?: string[];
        framework?: string;
    }, missionId?: string): Promise<DevResult>;
    setupDatabase(schema: {
        name?: string;
        tables?: Array<{
            name: string;
            columns: string[];
        }>;
        type?: string;
    }, missionId?: string): Promise<DevResult>;
    deploy(config: {
        environment?: string;
        provider?: string;
        region?: string;
        services?: string[];
    }, missionId?: string): Promise<DevResult>;
    runTests(paths: string[], missionId?: string): Promise<DevResult>;
    generateDocumentation(code: string, missionId?: string): Promise<DevResult>;
    reviewCode(code: string, missionId?: string): Promise<DevResult>;
    debug(issue: {
        description?: string;
        error?: string;
        stackTrace?: string;
    }, missionId?: string): Promise<DevResult>;
    getStatus(): {
        team: string;
        activeProjects: number;
        tasksCompleted: number;
        tasksFailed: number;
        totalTestsPassed: number;
        totalTestsFailed: number;
        avgDurationMs: number;
        projects: Array<{
            missionId: string;
            frontendFileCount: number;
            backendFileCount: number;
            dbMigrationCount: number;
            deploymentCount: number;
            testRunCount: number;
            lastActivity: Date;
        }>;
    };
    private ensureProject;
    private generateFrontendTemplate;
    private generateBackendTemplate;
    private toKebabCase;
    private toPascalCase;
    private generateVersion;
    private sleep;
}
