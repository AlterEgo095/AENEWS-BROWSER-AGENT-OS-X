import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const META_MEMORY_MANAGER_AGENT_CONFIG: AgentConfig;
export declare class MemoryManagerAgentService extends BaseAgentService {
    private memoryStore;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private consolidateMemory;
    private optimizeStorage;
    private archiveOldMemories;
    private retrieveContext;
    private pruneMemories;
    private migrateMemory;
    private seedMemoryStore;
}
