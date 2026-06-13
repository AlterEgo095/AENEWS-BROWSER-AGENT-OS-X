import { AgentCluster, AgentCapability, AgentConfig, AgentRetryPolicy } from '../interfaces/agent.interface';
export declare const AGENT_METADATA_KEY = "agent:metadata";
export interface AgentMetadata {
    id: string;
    name: string;
    cluster: AgentCluster;
    version: string;
    description: string;
    capabilities: AgentCapability[];
    permissions: string[];
    maxConcurrentTasks: number;
    timeout: number;
    retryPolicy: AgentRetryPolicy;
}
export interface AgentDecoratorOptions {
    id: string;
    name: string;
    cluster: AgentCluster;
    version?: string;
    description?: string;
    capabilities?: AgentCapability[];
    permissions?: string[];
    maxConcurrentTasks?: number;
    timeout?: number;
    retryPolicy?: Partial<AgentRetryPolicy>;
}
export declare function Agent(options: AgentDecoratorOptions): ClassDecorator;
export declare function Agent(config: AgentConfig): ClassDecorator;
export declare function getAgentMetadata(target: Function): AgentMetadata | undefined;
export declare function isAgentClass(target: Function): boolean;
