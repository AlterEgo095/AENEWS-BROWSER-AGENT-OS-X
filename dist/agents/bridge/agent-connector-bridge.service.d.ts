import { ConnectorRegistry } from '../../software-factory/connectors/connector-registry';
import { ConnectorOutput, LLMCallOptions, LLMCallResult } from '../../software-factory/connectors/connector.interface';
import { CapabilityId } from '../../software-factory/interfaces';
export declare class AgentConnectorBridge {
    private readonly connectorRegistry;
    private readonly logger;
    private readonly llm;
    constructor(connectorRegistry: ConnectorRegistry);
    executeCapability(capabilityId: CapabilityId, input: {
        missionId: string;
        instruction: string;
        workspaceDir: string;
        parameters: Record<string, any>;
        previousResults?: Map<CapabilityId, ConnectorOutput>;
    }): Promise<ConnectorOutput>;
    callLLM(options: LLMCallOptions): Promise<LLMCallResult>;
    hasConnector(capabilityId: CapabilityId): boolean;
    getRegisteredConnectors(): import("../../software-factory/connectors/connector.interface").ICapabilityConnector[];
    getRegistryStatistics(): {
        totalConnectors: number;
        packs: string[];
        capabilitiesCovered: number;
    };
    getLLMCacheStats(): {
        size: number;
        hitRate: number;
        savingsUsd: number;
    };
    getLLMMetrics(): import("../../software-factory/connectors/llm-helper").LLMMetrics;
}
