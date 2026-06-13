import { Artifact } from '../../interfaces';
import { MissionPlan } from '../../teams/planning/planning-team.service';
import { ResearchResults } from '../../teams/planning/planning-team.service';
export interface ExecutionResults {
    missionId: string;
    success: boolean;
    artifacts: Artifact[];
    browserData?: BrowserExecutionData;
    codeArtifacts?: CodeExecutionData;
    documentArtifacts?: DocumentExecutionData;
    deploymentData?: DeploymentExecutionData;
    errors: string[];
    durationMs: number;
}
export interface BrowserExecutionData {
    pagesVisited: number;
    screenshots: string[];
    dataExtracted: Record<string, any>;
    formsFilled: number;
    filesDownloaded: string[];
}
export interface CodeExecutionData {
    filesCreated: number;
    linesOfCode: number;
    testFilesCreated: number;
    configFilesCreated: number;
    projectStructure: Record<string, any>;
}
export interface DocumentExecutionData {
    reportsGenerated: number;
    pagesGenerated: number;
    formats: string[];
}
export interface DeploymentExecutionData {
    environments: string[];
    containersBuilt: number;
    healthChecksPassed: boolean;
    liveUrl?: string;
}
export declare class ExecutionTeamService {
    private readonly logger;
    private readonly results;
    execute(missionId: string, plan: MissionPlan | undefined, research: ResearchResults | undefined): Promise<ExecutionResults>;
    private executeBrowserOps;
    private executeCodeGeneration;
    private executeDocumentOps;
    private executeDeployment;
    getResults(missionId: string): ExecutionResults | undefined;
}
