import { CapabilityId, CapabilityPack } from '../interfaces';
export interface ConnectorInput {
    missionId: string;
    instruction: string;
    workspaceDir: string;
    parameters: Record<string, any>;
    previousResults: Map<CapabilityId, ConnectorOutput>;
    tools: string[];
}
export interface ConnectorOutput {
    success: boolean;
    artifacts: GeneratedArtifact[];
    output: any;
    costUsd: number;
    durationMs: number;
    error?: string;
}
export interface GeneratedArtifact {
    name: string;
    type: 'source' | 'test' | 'document' | 'config' | 'archive' | 'report' | 'screenshot' | 'log';
    path: string;
    size: number;
    content?: string;
}
export interface ICapabilityConnector {
    readonly supportedPack: CapabilityPack;
    execute(capabilityId: CapabilityId, input: ConnectorInput): Promise<ConnectorOutput>;
    supports(capabilityId: CapabilityId): boolean;
}
export interface LLMCallOptions {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
    retries?: number;
}
export interface LLMCallResult {
    content: string;
    costUsd: number;
    tokenCount?: number;
    retries: number;
}
