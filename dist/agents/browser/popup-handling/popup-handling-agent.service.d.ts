import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const POPUP_HANDLING_AGENT_CONFIG: AgentConfig;
export declare class PopupHandlingAgentService extends BaseAgentService {
    private dialogHistory;
    private pendingDialog;
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
