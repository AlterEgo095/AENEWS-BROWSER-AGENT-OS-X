import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const SCREENSHOT_AGENT_CONFIG: AgentConfig;
export declare class ScreenshotAgentService extends BaseAgentService {
    private screenshotHistory;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private takeScreenshot;
    private screenshotElement;
    private screenshotFullPage;
    private compareScreenshots;
}
