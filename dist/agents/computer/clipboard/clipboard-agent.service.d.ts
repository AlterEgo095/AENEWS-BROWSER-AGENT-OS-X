import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const CLIPBOARD_AGENT_CONFIG: AgentConfig;
export declare class ClipboardAgentService extends BaseAgentService {
    private readonly bridge?;
    private clipboardContent;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    private changeHistory;
    private isWatching;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private readClipboard;
    private writeClipboard;
    private clearClipboard;
    private watchClipboard;
}
