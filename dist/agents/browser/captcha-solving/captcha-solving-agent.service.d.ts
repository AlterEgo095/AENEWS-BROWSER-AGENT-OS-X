import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const CAPTCHA_SOLVING_AGENT_CONFIG: AgentConfig;
export declare class CaptchaSolvingAgentService extends BaseAgentService {
    private readonly bridge?;
    private captchaHistory;
    private solveStats;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private detectCaptcha;
    private solveRecaptcha;
    private solveHcaptcha;
    private solveSimpleCaptcha;
    private reportCaptchaResult;
    private updateStats;
}
