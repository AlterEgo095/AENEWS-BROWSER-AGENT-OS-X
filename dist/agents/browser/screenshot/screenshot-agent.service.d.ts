import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const SCREENSHOT_AGENT_CONFIG: AgentConfig;
export declare class ScreenshotAgentService extends BaseAgentService {
    private readonly bridge?;
    private screenshotHistory;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private takeScreenshot;
    private screenshotElement;
    private screenshotFullPage;
    private compareScreenshots;
}
