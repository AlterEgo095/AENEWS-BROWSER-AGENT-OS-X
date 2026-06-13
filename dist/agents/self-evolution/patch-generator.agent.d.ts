import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../interfaces/agent.interface';
export declare const SELF_EVOLUTION_PATCH_GENERATOR_CONFIG: AgentConfig;
export declare class PatchGeneratorAgent extends BaseAgentService {
    private patches;
    private branches;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private generatePatch;
    private createBranch;
    private validateSyntax;
    private resolveComponentFiles;
    private generateDiff;
    private generateCommitHash;
}
