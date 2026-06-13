import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const IFRAME_HANDLING_AGENT_CONFIG: AgentConfig;
export declare class IframeHandlingAgentService extends BaseAgentService {
    private iframes;
    private currentFrameId;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private switchToIframe;
    private switchToMainFrame;
    private getIframeList;
    private executeInFrame;
    private initializeSimulatedIframes;
    private executeActionInContext;
}
