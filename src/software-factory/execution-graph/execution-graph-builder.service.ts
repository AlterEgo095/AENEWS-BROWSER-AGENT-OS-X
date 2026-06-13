/**
 * AENEWS Software Factory — Execution Graph Builder
 * 
 * Takes a mission plan and builds a DAG of tasks.
 * Each node in the graph requires specific capabilities.
 * The graph determines execution order and parallelism.
 * 
 * Mission → Planner → Execution Graph → Capability Resolver → Worker Factory
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ExecutionGraph,
  ExecutionPlan,
  ExecutionPhase,
  GraphNode,
  GraphEdge,
  GraphNodeStatus,
  GraphNodeType,
  GraphStatus,
  EdgeType,
  GraphBuildOptions,
  DEFAULT_GRAPH_OPTIONS,
  CapabilityId,
  CapabilityPack,
} from '../interfaces';
import { CapabilityRegistryService } from '../capability-registry/capability-registry.service';
import { v4 as uuidv4 } from 'uuid';

export interface MissionPlanInput {
  missionId: string;
  instruction: string;
  requiredCapabilities: CapabilityId[];
  requiredPacks: CapabilityPack[];
  estimatedComplexity: 'low' | 'medium' | 'high';
}

@Injectable()
export class ExecutionGraphBuilderService {
  private readonly logger = new Logger(ExecutionGraphBuilderService.name);
  private readonly graphs = new Map<string, ExecutionGraph>();

  constructor(private readonly capabilityRegistry: CapabilityRegistryService) {}

  /**
   * Build an execution graph from a mission plan
   */
  buildGraph(plan: MissionPlanInput, options?: Partial<GraphBuildOptions>): ExecutionPlan {
    const opts = { ...DEFAULT_GRAPH_OPTIONS, ...options };
    this.logger.log(`Building execution graph for mission ${plan.missionId} — ${plan.requiredCapabilities.length} capabilities`);

    // Step 1: Create graph nodes grouped by type
    const nodes = this.createNodes(plan, opts);

    // Step 2: Create edges (dependencies between nodes)
    const edges = this.createEdges(nodes);

    // Step 3: Identify entry and exit nodes
    const entryNodes = this.findEntryNodes(nodes, edges);
    const exitNodes = this.findExitNodes(nodes, edges);

    // Step 4: Build the graph
    const graph: ExecutionGraph = {
      id: `graph-${uuidv4().slice(0, 8)}`,
      missionId: plan.missionId,
      nodes,
      edges,
      createdAt: new Date(),
      status: GraphStatus.READY,
      entryNodes,
      exitNodes,
    };

    // Step 5: Generate execution phases
    const phases = this.generatePhases(graph, opts);

    // Step 6: Calculate estimates
    const totalEstimatedCost = this.estimateTotalCost(nodes);
    const totalEstimatedDuration = this.estimateTotalDuration(phases);
    const workersNeeded = this.countWorkersNeeded(phases);
    const maxParallel = Math.min(opts.maxParallelism, this.maxParallelismInPhases(phases));

    const executionPlan: ExecutionPlan = {
      graph,
      phases,
      totalEstimatedCostUsd: totalEstimatedCost,
      totalEstimatedDurationMs: totalEstimatedDuration,
      workersNeeded,
      maxParallelWorkers: maxParallel,
      packsRequired: plan.requiredPacks,
    };

    this.graphs.set(plan.missionId, graph);
    this.logger.log(
      `Graph built: ${nodes.length} nodes, ${edges.length} edges, ${phases.length} phases, ${workersNeeded} workers`,
    );

    return executionPlan;
  }

  /**
   * Get graph for a mission
   */
  getGraph(missionId: string): ExecutionGraph | undefined {
    return this.graphs.get(missionId);
  }

  /**
   * Update a node's status
   */
  updateNodeStatus(missionId: string, nodeId: string, status: GraphNodeStatus, result?: any): boolean {
    const graph = this.graphs.get(missionId);
    if (!graph) return false;

    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return false;

    node.status = status;
    if (result) {
      node.result = result;
    }

    // Update graph status
    if (graph.nodes.every(n => n.status === GraphNodeStatus.COMPLETED)) {
      graph.status = GraphStatus.COMPLETED;
    } else if (graph.nodes.some(n => n.status === GraphNodeStatus.FAILED) &&
               graph.nodes.filter(n => n.status === GraphNodeStatus.COMPLETED).length <
               graph.nodes.length * 0.5) {
      graph.status = GraphStatus.FAILED;
    } else if (graph.nodes.some(n => n.status === GraphNodeStatus.RUNNING)) {
      graph.status = GraphStatus.RUNNING;
    }

    return true;
  }

  /**
   * Get nodes that are ready to execute (all dependencies satisfied)
   */
  getReadyNodes(missionId: string): GraphNode[] {
    const graph = this.graphs.get(missionId);
    if (!graph) return [];

    return graph.nodes.filter(node => {
      if (node.status !== GraphNodeStatus.PENDING) return false;

      // Check all hard dependencies are completed
      const dependencies = graph.edges
        .filter(e => e.to === node.id && e.type === EdgeType.DEPENDS_ON)
        .map(e => e.from);

      return dependencies.every(depId => {
        const depNode = graph.nodes.find(n => n.id === depId);
        return depNode?.status === GraphNodeStatus.COMPLETED;
      });
    });
  }

  // ─── Node Creation ──────────────────────────────────────────

  private createNodes(plan: MissionPlanInput, opts: GraphBuildOptions): GraphNode[] {
    const nodes: GraphNode[] = [];

    // Group capabilities by type to create logical nodes
    const researchCaps = plan.requiredCapabilities.filter(c => this.isResearchCap(c));
    const buildCaps = plan.requiredCapabilities.filter(c => this.isBuildCap(c));
    const testCaps = plan.requiredCapabilities.filter(c => this.isTestCap(c));
    const certCaps = plan.requiredCapabilities.filter(c => this.isCertCap(c));
    const deliverCaps = plan.requiredCapabilities.filter(c => this.isDeliverCap(c));

    if (researchCaps.length > 0) {
      nodes.push(this.createNode('research', 'Research & Analysis', GraphNodeType.RESEARCH, researchCaps, plan.requiredPacks, opts));
    }

    // Split build capabilities into logical worker groups
    const buildGroups = this.groupBuildCapabilities(buildCaps, opts.maxParallelism);
    for (let i = 0; i < buildGroups.length; i++) {
      const group = buildGroups[i];
      const label = buildGroups.length > 1 ? `Build #${i + 1}` : 'Build';
      nodes.push(this.createNode(`build-${i + 1}`, label, GraphNodeType.BUILD, group, plan.requiredPacks, opts));
    }

    if (testCaps.length > 0) {
      nodes.push(this.createNode('test', 'Testing', GraphNodeType.TEST, testCaps, plan.requiredPacks, opts));
    }

    if (certCaps.length > 0) {
      nodes.push(this.createNode('certify', 'Certification', GraphNodeType.CERTIFY, certCaps, plan.requiredPacks, opts));
    }

    if (deliverCaps.length > 0) {
      nodes.push(this.createNode('deliver', 'Delivery', GraphNodeType.DELIVER, deliverCaps, plan.requiredPacks, opts));
    }

    // Minimum viable graph: at least one build node
    if (nodes.length === 0) {
      nodes.push(this.createNode('build-1', 'Build', GraphNodeType.BUILD, plan.requiredCapabilities, plan.requiredPacks, opts));
    }

    return nodes;
  }

  private createNode(
    id: string,
    label: string,
    type: GraphNodeType,
    capabilities: CapabilityId[],
    packs: CapabilityPack[],
    opts: GraphBuildOptions,
  ): GraphNode {
    return {
      id,
      label,
      type,
      capabilities,
      packs,
      status: GraphNodeStatus.PENDING,
      retryCount: 0,
      maxRetries: opts.maxRetriesPerNode,
    };
  }

  // ─── Edge Creation ──────────────────────────────────────────

  private createEdges(nodes: GraphNode[]): GraphEdge[] {
    const edges: GraphEdge[] = [];
    const typeOrder = [GraphNodeType.RESEARCH, GraphNodeType.BUILD, GraphNodeType.TEST, GraphNodeType.CERTIFY, GraphNodeType.DELIVER];

    for (let i = 1; i < typeOrder.length; i++) {
      const currentTypeNodes = nodes.filter(n => n.type === typeOrder[i]);
      const prevTypeNodes = nodes.filter(n => n.type === typeOrder[i - 1]);

      for (const current of currentTypeNodes) {
        for (const prev of prevTypeNodes) {
          edges.push({
            from: prev.id,
            to: current.id,
            type: EdgeType.DEPENDS_ON,
          });
        }
      }
    }

    // Parallel build nodes: mark as PARALLEL (no dependency between them)
    const buildNodes = nodes.filter(n => n.type === GraphNodeType.BUILD);
    for (let i = 1; i < buildNodes.length; i++) {
      // Build nodes within the same type are parallel, but they all depend on research
      // Already handled above — they share the same dependency on research
    }

    return edges;
  }

  // ─── Phase Generation ───────────────────────────────────────

  private generatePhases(graph: ExecutionGraph, opts: GraphBuildOptions): ExecutionPhase[] {
    const phases: ExecutionPhase[] = [];
    const typeOrder = [GraphNodeType.RESEARCH, GraphNodeType.BUILD, GraphNodeType.TEST, GraphNodeType.CERTIFY, GraphNodeType.DELIVER];

    for (const type of typeOrder) {
      const nodesOfType = graph.nodes.filter(n => n.type === type);
      if (nodesOfType.length === 0) continue;

      const isParallel = type === GraphNodeType.BUILD && nodesOfType.length > 1;
      const estimatedDuration = this.estimatePhaseDuration(nodesOfType, isParallel);
      const estimatedCost = this.estimatePhaseCost(nodesOfType);

      phases.push({
        id: `phase-${type.toLowerCase()}`,
        name: this.getPhaseName(type),
        nodeIds: nodesOfType.map(n => n.id),
        parallel: isParallel,
        estimatedDurationMs: estimatedDuration,
        estimatedCostUsd: estimatedCost,
      });
    }

    return phases;
  }

  // ─── Capability Classification ──────────────────────────────

  private isResearchCap(cap: CapabilityId): boolean {
    return cap.startsWith('browser.') || cap.startsWith('business.analytics') || cap.startsWith('business.seo');
  }

  private isBuildCap(cap: CapabilityId): boolean {
    return cap.startsWith('dev.') || cap.startsWith('office.') || cap.startsWith('business.');
  }

  private isTestCap(cap: CapabilityId): boolean {
    return cap.startsWith('cert.test') || cap.startsWith('cert.regression') || cap.startsWith('cert.performance') || cap.startsWith('cert.integration');
  }

  private isCertCap(cap: CapabilityId): boolean {
    return cap.startsWith('cert.') && !this.isTestCap(cap);
  }

  private isDeliverCap(cap: CapabilityId): boolean {
    return cap.startsWith('delivery.');
  }

  // ─── Build Grouping ─────────────────────────────────────────

  private groupBuildCapabilities(caps: CapabilityId[], maxParallelism: number): CapabilityId[][] {
    if (caps.length === 0) return [[]]; // empty group if no caps

    // Group by sub-domain for parallel execution
    const devCaps = caps.filter(c => c.startsWith('dev.'));
    const officeCaps = caps.filter(c => c.startsWith('office.'));
    const businessCaps = caps.filter(c => c.startsWith('business.'));

    const groups: CapabilityId[][] = [];

    // Split dev caps into frontend/backend groups
    if (devCaps.length > 0) {
      const frontendCaps = devCaps.filter(c =>
        c === 'dev.frontend' || c === 'dev.architecture' || c === 'dev.docker' || c === 'dev.documentation',
      );
      const backendCaps = devCaps.filter(c =>
        c === 'dev.backend' || c === 'dev.database' || c === 'dev.api' || c === 'dev.kubernetes' || c === 'dev.devops',
      );
      const qaCaps = devCaps.filter(c =>
        c === 'dev.qa' || c === 'dev.test' || c === 'dev.debug',
      );

      if (frontendCaps.length > 0) groups.push(frontendCaps);
      if (backendCaps.length > 0) groups.push(backendCaps);
      if (qaCaps.length > 0) groups.push(qaCaps);

      // If no clear split, put all dev caps in one group
      if (groups.length === 0) groups.push(devCaps);
    }

    if (officeCaps.length > 0) groups.push(officeCaps);
    if (businessCaps.length > 0) groups.push(businessCaps);

    // Ensure no group exceeds max parallelism
    if (groups.length > maxParallelism) {
      // Merge smallest groups
      while (groups.length > maxParallelism) {
        const smallest = groups.pop()!;
        groups[groups.length - 1] = [...groups[groups.length - 1], ...smallest];
      }
    }

    return groups.length > 0 ? groups : [caps];
  }

  // ─── Helpers ────────────────────────────────────────────────

  private findEntryNodes(nodes: GraphNode[], edges: GraphEdge[]): string[] {
    const targetIds = new Set(edges.map(e => e.to));
    return nodes.filter(n => !targetIds.has(n.id)).map(n => n.id);
  }

  private findExitNodes(nodes: GraphNode[], edges: GraphEdge[]): string[] {
    const sourceIds = new Set(edges.map(e => e.from));
    return nodes.filter(n => !sourceIds.has(n.id)).map(n => n.id);
  }

  private estimateTotalCost(nodes: GraphNode[]): number {
    let total = 0;
    for (const node of nodes) {
      for (const capId of node.capabilities) {
        const cap = this.capabilityRegistry.getCapability(capId);
        if (cap) total += cap.cost.estimatedUsdPerExecution;
      }
    }
    return total;
  }

  private estimateTotalDuration(phases: ExecutionPhase[]): number {
    return phases.reduce((sum, p) => sum + p.estimatedDurationMs, 0);
  }

  private estimatePhaseDuration(nodes: GraphNode[], parallel: boolean): number {
    if (parallel) {
      // Take the max duration among parallel nodes
      return Math.max(...nodes.map(n => this.estimateNodeDuration(n)));
    }
    return nodes.reduce((sum, n) => sum + this.estimateNodeDuration(n), 0);
  }

  private estimateNodeDuration(node: GraphNode): number {
    let maxMs = 0;
    for (const capId of node.capabilities) {
      const cap = this.capabilityRegistry.getCapability(capId);
      if (cap) maxMs = Math.max(maxMs, cap.latency.estimatedMs);
    }
    return maxMs || 10000; // default 10s
  }

  private estimatePhaseCost(nodes: GraphNode[]): number {
    let total = 0;
    for (const node of nodes) {
      for (const capId of node.capabilities) {
        const cap = this.capabilityRegistry.getCapability(capId);
        if (cap) total += cap.cost.estimatedUsdPerExecution;
      }
    }
    return total;
  }

  private countWorkersNeeded(phases: ExecutionPhase[]): number {
    return Math.max(...phases.map(p => p.parallel ? p.nodeIds.length : 1));
  }

  private maxParallelismInPhases(phases: ExecutionPhase[]): number {
    return Math.max(...phases.map(p => p.parallel ? p.nodeIds.length : 1));
  }

  private getPhaseName(type: GraphNodeType): string {
    const names: Record<GraphNodeType, string> = {
      [GraphNodeType.RESEARCH]: 'Research & Analysis',
      [GraphNodeType.BUILD]: 'Build & Development',
      [GraphNodeType.TEST]: 'Testing & Validation',
      [GraphNodeType.CERTIFY]: 'Certification & Audit',
      [GraphNodeType.DELIVER]: 'Delivery & Packaging',
    };
    return names[type];
  }
}
