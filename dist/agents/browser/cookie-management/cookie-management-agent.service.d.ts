import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const COOKIE_MANAGEMENT_AGENT_CONFIG: AgentConfig;
export declare class CookieManagementAgentService extends BaseAgentService {
    private cookieStore;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private getCookies;
    private setCookie;
    private deleteCookie;
    private clearCookies;
    private handleCookieBanner;
}
