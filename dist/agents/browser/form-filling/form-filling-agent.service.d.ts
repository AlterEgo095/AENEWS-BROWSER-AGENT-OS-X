import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const FORM_FILLING_AGENT_CONFIG: AgentConfig;
export declare class FormFillingAgentService extends BaseAgentService {
    private formState;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private fillField;
    private selectDropdown;
    private checkCheckbox;
    private selectRadio;
    private uploadFile;
    private clearField;
    private getOrCreateFieldState;
}
