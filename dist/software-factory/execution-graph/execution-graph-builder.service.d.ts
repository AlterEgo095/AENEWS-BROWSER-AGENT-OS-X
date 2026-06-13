import { ExecutionGraph, ExecutionPlan, GraphNode, GraphNodeStatus, GraphBuildOptions, CapabilityId, CapabilityPack } from '../interfaces';
import { CapabilityRegistryService } from '../capability-registry/capability-registry.service';
export interface MissionPlanInput {
    missionId: string;
    instruction: string;
    requiredCapabilities: CapabilityId[];
    requiredPacks: CapabilityPack[];
    estimatedComplexity: 'low' | 'medium' | 'high';
}
export declare class ExecutionGraphBuilderService {
    private readonly capabilityRegistry;
    private readonly logger;
    private readonly graphs;
    constructor(capabilityRegistry: CapabilityRegistryService);
    buildGraph(plan: MissionPlanInput, options?: Partial<GraphBuildOptions>): ExecutionPlan;
    getGraph(missionId: string): ExecutionGraph | undefined;
    updateNodeStatus(missionId: string, nodeId: string, status: GraphNodeStatus, result?: any): boolean;
    getReadyNodes(missionId: string): GraphNode[];
    private createNodes;
    private createNode;
    private createEdges;
    private generatePhases;
    private isResearchCap;
    private isBuildCap;
    private isTestCap;
    private isCertCap;
    private isDeliverCap;
    private groupBuildCapabilities;
    private findEntryNodes;
    private findExitNodes;
    private estimateTotalCost;
    private estimateTotalDuration;
    private estimatePhaseDuration;
    private estimateNodeDuration;
    private estimatePhaseCost;
    private countWorkersNeeded;
    private maxParallelismInPhases;
    private getPhaseName;
}
