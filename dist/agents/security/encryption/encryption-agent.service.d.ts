import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const ENCRYPTION_AGENT_CONFIG: AgentConfig;
export declare class EncryptionAgentService extends BaseAgentService {
    private readonly bridge?;
    private keys;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    private certificates;
    private encryptedDataStore;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private encryptData;
    private decryptData;
    private generateKey;
    private manageCertificate;
    private rotateKeys;
    private verifySignature;
}
