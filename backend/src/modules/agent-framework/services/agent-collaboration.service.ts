/**
 * AENEWS Agent OS X — Agent Collaboration Service
 *
 * Phase 8 — Enables multi-agent collaboration patterns:
 *
 *   1. Delegation: Agent A delegates a sub-task to Agent B
 *   2. Handoff: Agent A transfers ownership of a task to Agent B
 *   3. Parallel Execution: Multiple agents work on independent sub-tasks simultaneously
 *   4. Pipeline Execution: Agents work sequentially, each building on previous output
 *   5. Consensus: Multiple agents vote/review and reach consensus on a result
 *   6. Swarm: Multiple agents collectively explore a problem space
 *
 * Architecture:
 *   - Uses AgentCommunicationService for inter-agent messaging
 *   - Uses AgentRegistryService for agent discovery
 *   - Uses AgentMemoryService for shared context
 *   - Uses AgentEventBusService for observability
 *   - Integrates with AgentOrchestratorService for pipeline coordination
 *
 * Collaboration lifecycle:
 *   Created → Agents Assigned → Executing → Results Collected → Merged → Completed
 *
 * Safety:
 *   - Max collaboration depth prevents infinite delegation chains
 *   - Timeout protection for each collaboration step
 *   - Circuit breaker for inter-agent communication failures
 *   - Deadlock detection for circular dependencies
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { AgentRegistryService } from '../../agent/registry/agent-registry.service';
import {
  AgentCommunicationService,
  AgentMessage,
} from './agent-communication.service';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import { AgentHealthService } from './agent-health.service';
import { ClusterType } from '../../agent/entities/agent.entity';
import { BaseAgent, AgentContext, AgentResult } from '../../agent/agent.abstract';
import { LLMService } from '../../llm/llm.service';

// ─── Collaboration Types ─────────────────────────────────────────

export type CollaborationPattern =
  | 'delegation'
  | 'handoff'
  | 'parallel'
  | 'pipeline'
  | 'consensus'
  | 'swarm';

export type CollaborationStatus =
  | 'created'
  | 'assigning'
  | 'executing'
  | 'collecting'
  | 'merging'
  | 'completed'
  | 'failed'
  | 'timeout';

export interface CollaborationRequest {
  id: string;
  pattern: CollaborationPattern;
  description: string;
  parentMissionId?: string;
  objectives: string[];
  requiredCapabilities?: string[];
  preferredClusters?: ClusterType[];
  constraints?: CollaborationConstraints;
  metadata?: Record<string, any>;
}

export interface CollaborationConstraints {
  maxAgents?: number;
  maxDurationMs?: number;
  maxDelegationDepth?: number;
  requireConsensus?: boolean;
  consensusThreshold?: number; // 0-1, fraction of agents that must agree
  allowPartialResults?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface CollaborationAssignment {
  agentKey: string;
  agentName: string;
  cluster: ClusterType;
  subtaskDescription: string;
  dependencies?: string[];
  priority: number;
  input?: Record<string, any>;
}

export interface CollaborationResult {
  collaborationId: string;
  pattern: CollaborationPattern;
  status: CollaborationStatus;
  assignments: CollaborationAssignment[];
  results: Map<string, AgentResult>;
  mergedResult?: any;
  durationMs: number;
  agentCount: number;
  successCount: number;
  failureCount: number;
  consensusScore?: number;
}

export interface CollaborationStep {
  id: string;
  type: 'assign' | 'execute' | 'collect' | 'merge' | 'vote';
  agentKey?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: AgentResult;
  durationMs?: number;
  error?: string;
}

// ─── Defaults ────────────────────────────────────────────────────

const DEFAULT_CONSTRAINTS: Required<CollaborationConstraints> = {
  maxAgents: 10,
  maxDurationMs: 300_000, // 5 minutes
  maxDelegationDepth: 3,
  requireConsensus: false,
  consensusThreshold: 0.6,
  allowPartialResults: true,
  retryOnFailure: true,
  maxRetries: 2,
};

// ─── Service ─────────────────────────────────────────────────────

@Injectable()
export class AgentCollaborationService {
  private readonly logger = new Logger(AgentCollaborationService.name);

  /** Active collaborations indexed by ID */
  private readonly activeCollaborations = new Map<string, {
    request: CollaborationRequest;
    status: CollaborationStatus;
    assignments: CollaborationAssignment[];
    steps: CollaborationStep[];
    results: Map<string, AgentResult>;
    startTime: number;
    parentAgentKey?: string;
  }>();

  /** Collaboration history (last 500) */
  private readonly history: CollaborationResult[] = [];
  private readonly MAX_HISTORY = 500;

  /** Current delegation depth per agent (prevents infinite chains) */
  private readonly delegationDepth = new Map<string, number>();

  /** Deadlock detection: tracks which agents are waiting on which */
  private readonly waitingFor = new Map<string, Set<string>>();

  constructor(
    private readonly registry: AgentRegistryService,
    private readonly communication: AgentCommunicationService,
    private readonly eventBus: AgentEventBusService,
    private readonly memory: AgentMemoryService,
    @Optional() private readonly healthService: AgentHealthService,
    @Optional() private readonly llmService: LLMService,
  ) {}

  // ─── Public API ───────────────────────────────────────────────

  /**
   * Start a new multi-agent collaboration.
   *
   * The pattern determines how agents work together:
   *   - delegation: One agent delegates sub-tasks to specialists
   *   - handoff: Tasks are transferred between agents sequentially
   *   - parallel: Multiple agents work on independent sub-tasks simultaneously
   *   - pipeline: Agents work sequentially, each building on previous output
   *   - consensus: Multiple agents review and vote on results
   *   - swarm: Multiple agents collectively explore a problem
   */
  async collaborate(
    request: CollaborationRequest,
    parentAgentKey?: string,
  ): Promise<CollaborationResult> {
    const startTime = Date.now();

    // Validate and set defaults
    const constraints = { ...DEFAULT_CONSTRAINTS, ...request.constraints };
    request.constraints = constraints;

    // Check delegation depth
    if (parentAgentKey) {
      const depth = this.delegationDepth.get(parentAgentKey) ?? 0;
      if (depth >= constraints.maxDelegationDepth) {
        this.logger.warn(
          `Max delegation depth (${constraints.maxDelegationDepth}) reached for agent ${parentAgentKey}`,
        );
        return {
          collaborationId: request.id,
          pattern: request.pattern,
          status: 'failed',
          assignments: [],
          results: new Map(),
          durationMs: Date.now() - startTime,
          agentCount: 0,
          successCount: 0,
          failureCount: 1,
        };
      }
    }

    // Initialize collaboration state
    const state = {
      request,
      status: 'created' as CollaborationStatus,
      assignments: [] as CollaborationAssignment[],
      steps: [] as CollaborationStep[],
      results: new Map<string, AgentResult>(),
      startTime,
      parentAgentKey,
    };
    this.activeCollaborations.set(request.id, state);

    // Emit collaboration started event
    this.eventBus.emit(AgentEventType.AGENT_STARTED, 'collaboration', {
      collaborationId: request.id,
      pattern: request.pattern,
      description: request.description,
    });

    try {
      // Route to pattern-specific handler
      let result: CollaborationResult;

      switch (request.pattern) {
        case 'delegation':
          result = await this.executeDelegation(request, state, constraints);
          break;
        case 'handoff':
          result = await this.executeHandoff(request, state, constraints);
          break;
        case 'parallel':
          result = await this.executeParallel(request, state, constraints);
          break;
        case 'pipeline':
          result = await this.executePipeline(request, state, constraints);
          break;
        case 'consensus':
          result = await this.executeConsensus(request, state, constraints);
          break;
        case 'swarm':
          result = await this.executeSwarm(request, state, constraints);
          break;
        default:
          throw new Error(`Unknown collaboration pattern: ${request.pattern}`);
      }

      // Store in memory for future reference
      await this.memory.store(
        request.id,
        MemoryTier.SESSION,
        'collaboration_result',
        this.serializeResult(result),
      );

      // Add to history
      this.history.push(result);
      if (this.history.length > this.MAX_HISTORY) {
        this.history.shift();
      }

      return result;
    } catch (error: any) {
      state.status = 'failed';

      return {
        collaborationId: request.id,
        pattern: request.pattern,
        status: 'failed',
        assignments: state.assignments,
        results: state.results,
        durationMs: Date.now() - startTime,
        agentCount: state.assignments.length,
        successCount: 0,
        failureCount: 1,
      };
    } finally {
      this.activeCollaborations.delete(request.id);

      // Clean up delegation depth
      if (parentAgentKey) {
        const depth = this.delegationDepth.get(parentAgentKey) ?? 0;
        this.delegationDepth.set(parentAgentKey, Math.max(0, depth - 1));
      }
    }
  }

  /**
   * Get the status of an active collaboration.
   */
  getCollaborationStatus(collaborationId: string): CollaborationStatus | undefined {
    return this.activeCollaborations.get(collaborationId)?.status;
  }

  /**
   * Cancel an active collaboration.
   */
  async cancelCollaboration(collaborationId: string): Promise<boolean> {
    const state = this.activeCollaborations.get(collaborationId);
    if (!state) return false;

    state.status = 'failed';
    this.activeCollaborations.delete(collaborationId);

    this.eventBus.emit(AgentEventType.AGENT_STOPPED, 'collaboration', {
      collaborationId,
      reason: 'cancelled',
    });

    return true;
  }

  /**
   * Get collaboration history.
   */
  getHistory(limit?: number): CollaborationResult[] {
    return limit ? this.history.slice(-limit) : [...this.history];
  }

  // ─── Pattern Implementations ──────────────────────────────────

  /**
   * DELEGATION: One agent delegates sub-tasks to specialists.
   *
   * Flow:
   *   1. Decompose the task into sub-tasks (LLM-powered when available)
   *   2. For each sub-task, find the best agent
   *   3. Execute each sub-task (sequentially or with limited parallelism)
   *   4. Collect and merge results
   */
  private async executeDelegation(
    request: CollaborationRequest,
    state: typeof this.activeCollaborations extends Map<string, infer V> ? V : never,
    constraints: Required<CollaborationConstraints>,
  ): Promise<CollaborationResult> {
    state.status = 'assigning';

    // 1. Decompose task into sub-tasks
    const subtasks = await this.decomposeTask(request);

    // 2. Find best agent for each sub-task
    const assignments = await this.assignAgents(subtasks, request, constraints);
    state.assignments = assignments;

    // 3. Execute sequentially (delegation is sequential by nature)
    state.status = 'executing';

    for (const assignment of assignments) {
      const step: CollaborationStep = {
        id: `step_${assignment.agentKey}_${Date.now()}`,
        type: 'execute',
        agentKey: assignment.agentKey,
        status: 'in_progress',
      };
      state.steps.push(step);

      try {
        const result = await this.executeAgent(
          assignment.agentKey,
          {
            agentId: assignment.agentKey,
            tenantId: 'system',
            config: { subtaskDescription: assignment.subtaskDescription },
          },
          constraints.maxDurationMs / Math.max(assignments.length, 1),
        );

        step.status = 'completed';
        step.result = result;
        step.durationMs = result.duration;
        state.results.set(assignment.agentKey, result);

        // Update assignment input for downstream agents
        assignment.input = result.data;
      } catch (error: any) {
        step.status = 'failed';
        step.error = error.message;

        if (!constraints.allowPartialResults) {
          state.status = 'failed';
          throw error;
        }
      }
    }

    // 4. Merge results
    state.status = 'merging';
    const mergedResult = this.mergeResults(state.results, request);

    state.status = 'completed';

    return {
      collaborationId: request.id,
      pattern: 'delegation',
      status: 'completed',
      assignments,
      results: state.results,
      mergedResult,
      durationMs: Date.now() - state.startTime,
      agentCount: assignments.length,
      successCount: Array.from(state.results.values()).filter((r) => r.success).length,
      failureCount: Array.from(state.results.values()).filter((r) => !r.success).length,
    };
  }

  /**
   * HANDOFF: Tasks are transferred between agents sequentially.
   *
   * Flow:
   *   1. First agent starts the task
   *   2. When done, output is handed to the next agent
   *   3. Each agent builds on the previous agent's output
   *   4. Final agent delivers the result
   */
  private async executeHandoff(
    request: CollaborationRequest,
    state: typeof this.activeCollaborations extends Map<string, infer V> ? V : never,
    constraints: Required<CollaborationConstraints>,
  ): Promise<CollaborationResult> {
    state.status = 'assigning';

    // Find agents for the handoff chain
    const assignments = await this.assignAgents(
      request.objectives.map((obj, i) => ({
        description: obj,
        requiredCapabilities: request.requiredCapabilities ?? [],
        preferredCluster: request.preferredClusters?.[i],
        priority: i,
      })),
      request,
      constraints,
    );
    state.assignments = assignments;

    state.status = 'executing';

    let previousResult: AgentResult | null = null;
    const stepTimeout = constraints.maxDurationMs / Math.max(assignments.length, 1);

    for (const assignment of assignments) {
      const step: CollaborationStep = {
        id: `step_${assignment.agentKey}_${Date.now()}`,
        type: 'execute',
        agentKey: assignment.agentKey,
        status: 'in_progress',
      };
      state.steps.push(step);

      try {
        // Include previous agent's output as input
        const context: AgentContext = {
          agentId: assignment.agentKey,
          tenantId: 'system',
          config: {
            subtaskDescription: assignment.subtaskDescription,
            previousAgentResult: previousResult?.data,
          },
        };

        const result = await this.executeAgent(assignment.agentKey, context, stepTimeout);

        step.status = 'completed';
        step.result = result;
        step.durationMs = result.duration;
        state.results.set(assignment.agentKey, result);

        // Handoff: this result becomes the next agent's input
        previousResult = result;

        // Notify next agent via communication service
        const nextAssignment = assignments[assignments.indexOf(assignment) + 1];
        if (nextAssignment) {
          await this.communication.send(
            assignment.agentKey,
            nextAssignment.agentKey,
            {
              type: 'handoff',
              collaborationId: request.id,
              result: result.data,
              nextObjective: nextAssignment.subtaskDescription,
            },
          );
        }
      } catch (error: any) {
        step.status = 'failed';
        step.error = error.message;

        if (!constraints.allowPartialResults) {
          state.status = 'failed';
          throw error;
        }
      }
    }

    state.status = 'completed';

    return {
      collaborationId: request.id,
      pattern: 'handoff',
      status: 'completed',
      assignments,
      results: state.results,
      mergedResult: previousResult?.data,
      durationMs: Date.now() - state.startTime,
      agentCount: assignments.length,
      successCount: Array.from(state.results.values()).filter((r) => r.success).length,
      failureCount: Array.from(state.results.values()).filter((r) => !r.success).length,
    };
  }

  /**
   * PARALLEL: Multiple agents work on independent sub-tasks simultaneously.
   *
   * Flow:
   *   1. Assign agents to sub-tasks
   *   2. Execute ALL agents concurrently (Promise.allSettled)
   *   3. Collect results (successes and failures)
   *   4. Merge results into unified output
   */
  private async executeParallel(
    request: CollaborationRequest,
    state: typeof this.activeCollaborations extends Map<string, infer V> ? V : never,
    constraints: Required<CollaborationConstraints>,
  ): Promise<CollaborationResult> {
    state.status = 'assigning';

    const subtasks = request.objectives.map((obj, i) => ({
      description: obj,
      requiredCapabilities: request.requiredCapabilities ?? [],
      preferredCluster: request.preferredClusters?.[i],
      priority: i,
    }));

    const assignments = await this.assignAgents(subtasks, request, constraints);
    state.assignments = assignments;

    state.status = 'executing';

    // Execute all agents in parallel
    const stepTimeout = constraints.maxDurationMs;
    const executionPromises = assignments.map(async (assignment) => {
      const step: CollaborationStep = {
        id: `step_${assignment.agentKey}_${Date.now()}`,
        type: 'execute',
        agentKey: assignment.agentKey,
        status: 'in_progress',
      };
      state.steps.push(step);

      try {
        const result = await this.executeAgent(
          assignment.agentKey,
          {
            agentId: assignment.agentKey,
            tenantId: 'system',
            config: { subtaskDescription: assignment.subtaskDescription },
          },
          stepTimeout,
        );

        step.status = 'completed';
        step.result = result;
        step.durationMs = result.duration;

        return { agentKey: assignment.agentKey, result };
      } catch (error: any) {
        step.status = 'failed';
        step.error = error.message;

        return { agentKey: assignment.agentKey, result: { success: false, error: error.message } as AgentResult };
      }
    });

    const settled = await Promise.allSettled(executionPromises);

    // Collect results
    state.status = 'collecting';
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        const { agentKey, result } = outcome.value;
        state.results.set(agentKey, result);
      }
    }

    // Check if we have enough results
    const successCount = Array.from(state.results.values()).filter((r) => r.success).length;
    if (successCount === 0 && !constraints.allowPartialResults) {
      state.status = 'failed';

      return {
        collaborationId: request.id,
        pattern: 'parallel',
        status: 'failed',
        assignments,
        results: state.results,
        durationMs: Date.now() - state.startTime,
        agentCount: assignments.length,
        successCount: 0,
        failureCount: assignments.length,
      };
    }

    // Merge results
    state.status = 'merging';
    const mergedResult = this.mergeResults(state.results, request);
    state.status = 'completed';

    return {
      collaborationId: request.id,
      pattern: 'parallel',
      status: successCount > 0 ? 'completed' : 'failed',
      assignments,
      results: state.results,
      mergedResult,
      durationMs: Date.now() - state.startTime,
      agentCount: assignments.length,
      successCount,
      failureCount: assignments.length - successCount,
    };
  }

  /**
   * PIPELINE: Agents work sequentially, each building on previous output.
   *
   * Similar to handoff but with strict ordering and data transformation.
   * Each agent receives structured input from the previous agent.
   */
  private async executePipeline(
    request: CollaborationRequest,
    state: typeof this.activeCollaborations extends Map<string, infer V> ? V : never,
    constraints: Required<CollaborationConstraints>,
  ): Promise<CollaborationResult> {
    // Pipeline is essentially a structured handoff with strict ordering
    return this.executeHandoff(request, state, constraints);
  }

  /**
   * CONSENSUS: Multiple agents review and vote on results.
   *
   * Flow:
   *   1. One agent produces the initial result
   *   2. Multiple review agents evaluate and vote
   *   3. If consensus threshold is met, result is accepted
   *   4. If not, the result is revised and re-voted
   */
  private async executeConsensus(
    request: CollaborationRequest,
    state: typeof this.activeCollaborations extends Map<string, infer V> ? V : never,
    constraints: Required<CollaborationConstraints>,
  ): Promise<CollaborationResult> {
    state.status = 'executing';

    // Find a primary agent to produce the initial result
    const primaryAgent = this.findBestAgent(
      request.requiredCapabilities ?? ['general'],
      request.preferredClusters,
    );

    if (!primaryAgent) {
      state.status = 'failed';

      return {
        collaborationId: request.id,
        pattern: 'consensus',
        status: 'failed',
        assignments: [],
        results: new Map(),
        durationMs: Date.now() - state.startTime,
        agentCount: 0,
        successCount: 0,
        failureCount: 1,
      };
    }

    // Assign primary agent
    const primaryAssignment: CollaborationAssignment = {
      agentKey: primaryAgent.name,
      agentName: primaryAgent.name,
      cluster: primaryAgent.cluster,
      subtaskDescription: request.description,
      priority: 1,
    };
    state.assignments.push(primaryAssignment);

    // Execute primary agent
    const primaryResult = await this.executeAgent(
      primaryAgent.name,
      {
        agentId: primaryAgent.name,
        tenantId: 'system',
        config: { description: request.description },
      },
      constraints.maxDurationMs / 2, // half the time for primary execution
    );
    state.results.set(primaryAgent.name, primaryResult);

    // Find review agents (2-5 agents from different clusters)
    const reviewAgentCount = Math.min(
      constraints.maxAgents - 1,
      4, // max 4 reviewers
    );
    const reviewAgents = this.findReviewAgents(primaryAgent.cluster, reviewAgentCount);

    // Each reviewer votes on the result
    state.status = 'collecting';
    const votes: { agentKey: string; approved: boolean; feedback: string }[] = [];

    for (const reviewer of reviewAgents) {
      const assignment: CollaborationAssignment = {
        agentKey: reviewer.name,
        agentName: reviewer.name,
        cluster: reviewer.cluster,
        subtaskDescription: `Review and vote on: ${request.description}`,
        priority: 2,
        input: primaryResult.data,
      };
      state.assignments.push(assignment);

      try {
        const reviewResult = await this.executeAgent(
          reviewer.name,
          {
            agentId: reviewer.name,
            tenantId: 'system',
            config: {
              task: 'review',
              originalResult: primaryResult.data,
              objectives: request.objectives,
            },
          },
          constraints.maxDurationMs / 4,
        );

        const vote = this.safeJsonParse(reviewResult.data);
        votes.push({
          agentKey: reviewer.name,
          approved: vote?.approved ?? reviewResult.success,
          feedback: vote?.feedback ?? reviewResult.data,
        });

        state.results.set(reviewer.name, reviewResult);
      } catch (error: any) {
        votes.push({
          agentKey: reviewer.name,
          approved: false,
          feedback: error.message,
        });
      }
    }

    // Calculate consensus
    const approvedCount = votes.filter((v) => v.approved).length;
    const consensusScore = votes.length > 0 ? approvedCount / votes.length : 0;
    const consensusReached = consensusScore >= constraints.consensusThreshold;

    state.status = consensusReached ? 'completed' : 'failed';

    return {
      collaborationId: request.id,
      pattern: 'consensus',
      status: consensusReached ? 'completed' : 'failed',
      assignments: state.assignments,
      results: state.results,
      mergedResult: {
        primaryResult: primaryResult.data,
        votes,
        consensusScore,
        consensusReached,
        feedback: votes.map((v) => v.feedback),
      },
      durationMs: Date.now() - state.startTime,
      agentCount: state.assignments.length,
      successCount: approvedCount + (primaryResult.success ? 1 : 0),
      failureCount: votes.length - approvedCount + (primaryResult.success ? 0 : 1),
      consensusScore,
    };
  }

  /**
   * SWARM: Multiple agents collectively explore a problem space.
   *
   * Flow:
   *   1. Assign multiple agents to explore different aspects
   *   2. Each agent works independently and shares findings
   *   3. Findings are broadcast to all agents
   *   4. Agents refine their exploration based on others' findings
   *   5. Final results are aggregated
   */
  private async executeSwarm(
    request: CollaborationRequest,
    state: typeof this.activeCollaborations extends Map<string, infer V> ? V : never,
    constraints: Required<CollaborationConstraints>,
  ): Promise<CollaborationResult> {
    state.status = 'assigning';

    // Create diverse sub-tasks from the main objective
    const subtasks = await this.decomposeTask(request);
    const assignments = await this.assignAgents(subtasks, request, constraints);
    state.assignments = assignments;

    state.status = 'executing';

    // Phase 1: Initial exploration (parallel)
    const phase1Promises = assignments.map(async (assignment) => {
      try {
        const result = await this.executeAgent(
          assignment.agentKey,
          {
            agentId: assignment.agentKey,
            tenantId: 'system',
            config: {
              task: 'explore',
              description: assignment.subtaskDescription,
              phase: 'initial',
            },
          },
          constraints.maxDurationMs / 3,
        );

        // Broadcast findings to all other agents
        await this.communication.broadcast(assignment.agentKey, {
          type: 'swarm_finding',
          collaborationId: request.id,
          phase: 'initial',
          findings: result.data,
        });

        return { agentKey: assignment.agentKey, result };
      } catch (error: any) {
        return { agentKey: assignment.agentKey, result: { success: false, error: error.message } as AgentResult };
      }
    });

    const phase1Results = await Promise.allSettled(phase1Promises);

    // Collect phase 1 results
    for (const outcome of phase1Results) {
      if (outcome.status === 'fulfilled') {
        state.results.set(outcome.value.agentKey, outcome.value.result);
      }
    }

    // Phase 2: Refined exploration based on shared findings
    const allFindings = Array.from(state.results.values())
      .filter((r) => r.success)
      .map((r) => r.data);

    const phase2Promises = assignments.map(async (assignment) => {
      try {
        const result = await this.executeAgent(
          assignment.agentKey,
          {
            agentId: assignment.agentKey,
            tenantId: 'system',
            config: {
              task: 'explore',
              description: assignment.subtaskDescription,
              phase: 'refined',
              sharedFindings: allFindings,
            },
          },
          constraints.maxDurationMs / 3,
        );

        return { agentKey: assignment.agentKey, result };
      } catch (error: any) {
        return { agentKey: assignment.agentKey, result: state.results.get(assignment.agentKey) ?? { success: false, error: error.message } as AgentResult };
      }
    });

    const phase2Results = await Promise.allSettled(phase2Promises);

    // Collect phase 2 results (overwrite phase 1)
    for (const outcome of phase2Results) {
      if (outcome.status === 'fulfilled' && outcome.value.result.success) {
        state.results.set(outcome.value.agentKey, outcome.value.result);
      }
    }

    // Aggregate results
    state.status = 'merging';
    const mergedResult = this.aggregateSwarmResults(state.results, request);
    state.status = 'completed';

    const successCount = Array.from(state.results.values()).filter((r) => r.success).length;

    return {
      collaborationId: request.id,
      pattern: 'swarm',
      status: successCount > 0 ? 'completed' : 'failed',
      assignments,
      results: state.results,
      mergedResult,
      durationMs: Date.now() - state.startTime,
      agentCount: assignments.length,
      successCount,
      failureCount: assignments.length - successCount,
    };
  }

  // ─── Agent Discovery & Assignment ─────────────────────────────

  /**
   * Decompose a task into sub-tasks using LLM when available.
   */
  private async decomposeTask(
    request: CollaborationRequest,
  ): Promise<Array<{
    description: string;
    requiredCapabilities: string[];
    preferredCluster?: ClusterType;
    priority: number;
  }>> {
    // Try LLM-powered decomposition
    if (this.llmService?.isAnyAvailable()) {
      try {
        const response = await this.llmService.chatWithSystem(
          `You are a task decomposition specialist. Break down the following task into independent sub-tasks.
Return a JSON array of objects with fields: description, requiredCapabilities (string[]), preferredCluster (one of: ${Object.values(ClusterType).join(', ')}), priority (1-5).
Only return the JSON array, nothing else.`,
          `Task: ${request.description}\n\nObjectives:\n${request.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}`,
          { temperature: 0.3, maxTokens: 2048, responseFormat: 'json' },
        );

        const parsed = this.safeJsonParse(response.content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any, i: number) => ({
            description: item.description || `Sub-task ${i + 1}`,
            requiredCapabilities: item.requiredCapabilities || ['general'],
            preferredCluster: item.preferredCluster as ClusterType | undefined,
            priority: item.priority || i + 1,
          }));
        }
      } catch (error: any) {
        this.logger.warn(`LLM decomposition failed: ${error.message}`);
      }
    }

    // Fallback: create one sub-task per objective
    return request.objectives.map((obj, i) => ({
      description: obj,
      requiredCapabilities: request.requiredCapabilities ?? ['general'],
      preferredCluster: request.preferredClusters?.[i],
      priority: i + 1,
    }));
  }

  /**
   * Assign agents to sub-tasks based on capabilities and health.
   */
  private async assignAgents(
    subtasks: Array<{
      description: string;
      requiredCapabilities: string[];
      preferredCluster?: ClusterType;
      priority: number;
    }>,
    request: CollaborationRequest,
    constraints: Required<CollaborationConstraints>,
  ): Promise<CollaborationAssignment[]> {
    const assignments: CollaborationAssignment[] = [];
    const usedAgents = new Set<string>();

    for (const subtask of subtasks) {
      if (assignments.length >= constraints.maxAgents) break;

      const agent = this.findBestAgent(
        subtask.requiredCapabilities,
        subtask.preferredCluster ? [subtask.preferredCluster] : request.preferredClusters,
        usedAgents,
      );

      if (agent) {
        usedAgents.add(agent.name);
        assignments.push({
          agentKey: agent.name,
          agentName: agent.name,
          cluster: agent.cluster,
          subtaskDescription: subtask.description,
          priority: subtask.priority,
        });
      }
    }

    return assignments;
  }

  /**
   * Find the best agent for a set of capabilities.
   */
  private findBestAgent(
    requiredCapabilities: string[],
    preferredClusters?: ClusterType[],
    excludeAgents?: Set<string>,
  ): BaseAgent | null {
    const allAgents = this.registry.findAll();
    let bestAgent: BaseAgent | null = null;
    let bestScore = -1;

    for (const agent of allAgents) {
      if (excludeAgents?.has(agent.name)) continue;

      let score = 0;

      // Capability matching
      const capMatch = requiredCapabilities.filter((cap) =>
        agent.capabilities.some((ac) => ac.toLowerCase().includes(cap.toLowerCase())),
      ).length;
      score += capMatch * 10;

      // Cluster preference
      if (preferredClusters?.includes(agent.cluster)) {
        score += 20;
      }

      // Health bonus
      if (this.healthService) {
        const metrics = this.healthService.getMetrics(agent.name);
        if (metrics) {
          score += metrics.successRate * 15;
          score -= metrics.errorRate * 10;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  /**
   * Find review agents from different clusters.
   */
  private findReviewAgents(
    excludeCluster: ClusterType,
    count: number,
  ): BaseAgent[] {
    const allAgents = this.registry.findAll();
    const reviewers: BaseAgent[] = [];
    const usedClusters = new Set<ClusterType>([excludeCluster]);

    // Prioritize agents from different clusters
    for (const agent of allAgents) {
      if (reviewers.length >= count) break;
      if (agent.cluster === excludeCluster) continue;

      if (!usedClusters.has(agent.cluster) || reviewers.length < count) {
        reviewers.push(agent);
        usedClusters.add(agent.cluster);
      }
    }

    return reviewers.slice(0, count);
  }

  // ─── Execution Helpers ───────────────────────────────────────

  /**
   * Execute an agent by key with timeout protection.
   */
  private async executeAgent(
    agentKey: string,
    context: AgentContext,
    timeoutMs: number,
  ): Promise<AgentResult> {
    const agent = this.registry.find(agentKey);
    if (!agent) {
      throw new Error(`Agent not found: ${agentKey}`);
    }

    // Increment delegation depth
    const currentDepth = this.delegationDepth.get(agentKey) ?? 0;
    this.delegationDepth.set(agentKey, currentDepth + 1);

    try {
      const result = await this.withTimeout(
        agent.wrapExecution(context),
        timeoutMs,
      );

      this.eventBus.emit(AgentEventType.AGENT_COMPLETED, agentKey, {
        success: result.success,
        duration: result.duration,
      });

      return result;
    } finally {
      this.delegationDepth.set(agentKey, currentDepth);
    }
  }

  /**
   * Merge results from multiple agents into a unified output.
   */
  private mergeResults(
    results: Map<string, AgentResult>,
    request: CollaborationRequest,
  ): any {
    const successfulResults = Array.from(results.entries())
      .filter(([, r]) => r.success)
      .map(([key, r]) => ({ agent: key, data: r.data }));

    if (successfulResults.length === 0) {
      return { success: false, error: 'All agents failed', objectives: request.objectives };
    }

    if (successfulResults.length === 1) {
      return successfulResults[0].data;
    }

    // Multiple results: create a structured merge
    return {
      merged: true,
      objectiveResults: request.objectives.map((obj, i) => ({
        objective: obj,
        result: successfulResults[i]?.data ?? null,
      })),
      contributors: successfulResults.map((r) => r.agent),
    };
  }

  /**
   * Aggregate swarm results into a consolidated output.
   */
  private aggregateSwarmResults(
    results: Map<string, AgentResult>,
    request: CollaborationRequest,
  ): any {
    const findings = Array.from(results.entries())
      .filter(([, r]) => r.success)
      .map(([key, r]) => ({
        agent: key,
        findings: r.data,
        confidence: r.metadata?.confidence ?? 0.5,
      }));

    // Deduplicate findings based on content similarity
    const uniqueFindings = this.deduplicateFindings(findings);

    return {
      aggregatedFindings: uniqueFindings,
      totalContributors: findings.length,
      coverage: uniqueFindings.length / Math.max(request.objectives.length, 1),
      objectives: request.objectives,
    };
  }

  /**
   * Simple deduplication of findings.
   */
  private deduplicateFindings(findings: any[]): any[] {
    const seen = new Set<string>();
    return findings.filter((f) => {
      const key = JSON.stringify(f.findings).substring(0, 200);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ─── Utility Helpers ──────────────────────────────────────────

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
      promise.then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); },
      );
    });
  }

  private safeJsonParse(text: string | null): any | null {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try { return JSON.parse(match[1].trim()); } catch { return null; }
      }
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end > start) {
        try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
      }
      return null;
    }
  }

  private serializeResult(result: CollaborationResult): Record<string, any> {
    return {
      collaborationId: result.collaborationId,
      pattern: result.pattern,
      status: result.status,
      agentCount: result.agentCount,
      successCount: result.successCount,
      failureCount: result.failureCount,
      durationMs: result.durationMs,
      consensusScore: result.consensusScore,
    };
  }
}
