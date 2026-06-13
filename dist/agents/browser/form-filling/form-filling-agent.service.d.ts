import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const FORM_FILLING_AGENT_CONFIG: AgentConfig;
export declare class FormFillingAgentService extends BaseAgentService {
    private readonly bridge?;
    private formState;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
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
