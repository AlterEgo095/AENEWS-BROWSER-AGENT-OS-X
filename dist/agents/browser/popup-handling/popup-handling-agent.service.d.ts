import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const POPUP_HANDLING_AGENT_CONFIG: AgentConfig;
export declare class PopupHandlingAgentService extends BaseAgentService {
    private readonly bridge?;
    private dialogHistory;
    private pendingDialog;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private handleAlert;
    private handleConfirm;
    private handlePrompt;
    private detectPopup;
    private closePopup;
}
