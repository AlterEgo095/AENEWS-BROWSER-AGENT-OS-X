import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const PRESENTATION_AGENT_CONFIG: AgentConfig;
export declare class PresentationAgentService extends BaseAgentService {
    private readonly bridge?;
    private presentations;
    private themes;
    private presentationCounter;
    private slideCounter;
    private contentCounter;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private createPresentation;
    private addSlide;
    private addContent;
    private applyTheme;
    private exportPresentation;
    private addTransition;
    private seedThemes;
    private generatePresentationId;
    private createSlideObject;
    private processContentData;
}
