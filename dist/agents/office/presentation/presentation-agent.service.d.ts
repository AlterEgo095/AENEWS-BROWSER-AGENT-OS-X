import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const PRESENTATION_AGENT_CONFIG: AgentConfig;
export declare class PresentationAgentService extends BaseAgentService {
    private presentations;
    private themes;
    private presentationCounter;
    private slideCounter;
    private contentCounter;
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
