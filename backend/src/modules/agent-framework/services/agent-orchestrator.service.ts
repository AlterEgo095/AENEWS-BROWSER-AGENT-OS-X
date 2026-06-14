import { Injectable, Logger } from '@nestjs/common';
import { AgentRegistryService } from '../../agent/registry/agent-registry.service';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import { ClusterType } from '../../agent/entities/agent.entity';

// ─── Pipeline Types ──────────────────────────────────────────

export interface Mission {
  id: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  constraints?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface Subtask {
  id: string;
  description: string;
  requiredCapabilities: string[];
  preferredCluster?: ClusterType;
  dependencies?: string[];
  priority?: number;
}

export interface ExecutionPlan {
  missionId: string;
  subtasks: Subtask[];
  executionOrder: string[][];
  estimatedDuration?: number;
}

export interface ExecutionResult {
  subtaskId: string;
  agentKey?: string;
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

export interface CritiqueResult {
  subtaskId: string;
  passed: boolean;
  issues: string[];
  suggestions: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface RepairResult {
  subtaskId: string;
  repaired: boolean;
  attempts: number;
  data?: any;
  remainingIssues: string[];
}

export interface ValidationResult {
  subtaskId: string;
  valid: boolean;
  score: number; // 0–1
  checks: Array<{ name: string; passed: boolean; detail?: string }>;
}

export interface DeliveryPackage {
  missionId: string;
  status: 'success' | 'partial' | 'failed';
  results: ExecutionResult[];
  critiques: CritiqueResult[];
  validations: ValidationResult[];
  totalDuration: number;
  summary: string;
}

export type PipelineState =
  | 'idle'
  | 'decomposing'
  | 'planning'
  | 'executing'
  | 'critiquing'
  | 'repairing'
  | 'validating'
  | 'delivering'
  | 'completed'
  | 'failed';

// ─── Service ─────────────────────────────────────────────────

/**
 * Agent Orchestrator — implements the full mission pipeline:
 *
 *   Decompose → Plan → Execute → Critique → Repair → Validate → Deliver
 *
 * Each step uses the AgentRegistryService to discover capable agents
 * and emits events via AgentEventBusService for observability.
 */
@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);
  private readonly pipelineStates = new Map<string, PipelineState>();

  constructor(
    private readonly registry: AgentRegistryService,
    private readonly eventBus: AgentEventBusService,
    private readonly memory: AgentMemoryService,
  ) {}

  // ─── Full Pipeline ──────────────────────────────────────────

  /**
   * Execute a complete mission through the full pipeline.
   */
  async executeMission(mission: Mission): Promise<DeliveryPackage> {
    const startTime = Date.now();
    this.logger.log(`Starting mission: ${mission.id} — ${mission.description}`);

    try {
      // 1. Decompose
      this.setState(mission.id, 'decomposing');
      this.eventBus.emit(AgentEventType.AGENT_STARTED, mission.id, {
        phase: 'decompose',
      });
      const subtasks = await this.decompose(mission);
      await this.memory.store(
        mission.id,
        MemoryTier.WORKING,
        'subtasks',
        subtasks,
      );

      // 2. Plan
      this.setState(mission.id, 'planning');
      const plan = await this.plan(subtasks);
      await this.memory.store(
        mission.id,
        MemoryTier.WORKING,
        'plan',
        plan,
      );

      // 3. Execute
      this.setState(mission.id, 'executing');
      const results = await this.execute(plan);
      await this.memory.store(
        mission.id,
        MemoryTier.WORKING,
        'results',
        results,
      );

      // 4. Critique
      this.setState(mission.id, 'critiquing');
      const critiques = await this.critique(results);
      await this.memory.store(
        mission.id,
        MemoryTier.WORKING,
        'critiques',
        critiques,
      );

      // 5. Repair (only for failed/critiqued subtasks)
      const needsRepair = critiques.filter((c) => !c.passed);
      let repairResults: RepairResult[] = [];
      if (needsRepair.length > 0) {
        this.setState(mission.id, 'repairing');
        repairResults = await this.repair({ critiques: needsRepair, results });
        await this.memory.store(
          mission.id,
          MemoryTier.WORKING,
          'repairs',
          repairResults,
        );
      }

      // 6. Validate
      this.setState(mission.id, 'validating');
      const validations = await this.validate(repairResults.length > 0 ? repairResults : results as any[]);
      await this.memory.store(
        mission.id,
        MemoryTier.WORKING,
        'validations',
        validations,
      );

      // 7. Deliver
      this.setState(mission.id, 'delivering');
      const delivery = this.deliver(validations);
      delivery.missionId = mission.id;
      delivery.results = results;
      delivery.critiques = critiques;
      delivery.validations = validations;
      delivery.totalDuration = Date.now() - startTime;

      this.setState(mission.id, 'completed');
      this.eventBus.emit(AgentEventType.AGENT_COMPLETED, mission.id, {
        status: delivery.status,
        duration: delivery.totalDuration,
      });

      // Persist to long-term memory
      await this.memory.store(
        mission.id,
        MemoryTier.LONG_TERM,
        'delivery',
        delivery,
      );

      this.logger.log(
        `Mission ${mission.id} completed with status: ${delivery.status}`,
      );
      return delivery;
    } catch (error: any) {
      this.setState(mission.id, 'failed');
      this.eventBus.emit(AgentEventType.AGENT_FAILED, mission.id, {
        error: error.message,
      });
      this.logger.error(
        `Mission ${mission.id} failed: ${error.message}`,
        error.stack,
      );
      return {
        missionId: mission.id,
        status: 'failed',
        results: [],
        critiques: [],
        validations: [],
        totalDuration: Date.now() - startTime,
        summary: `Mission failed: ${error.message}`,
      };
    }
  }

  // ─── Pipeline Steps ─────────────────────────────────────────

  /**
   * Step 1: Decompose a mission into subtasks.
   * For now this uses a simple heuristic — in production this would
   * be powered by an LLM.
   */
  async decompose(mission: Mission): Promise<Subtask[]> {
    this.logger.debug(`Decomposing mission: ${mission.id}`);

    // Simple decomposition: create one subtask per required capability
    // In a real system, this would use an LLM to break down the mission
    const subtasks: Subtask[] = [
      {
        id: `${mission.id}:sub-1`,
        description: mission.description,
        requiredCapabilities: mission.constraints?.capabilities || ['general'],
        preferredCluster: mission.constraints?.cluster,
        priority: 1,
      },
    ];

    return subtasks;
  }

  /**
   * Step 2: Create an execution plan from subtasks.
   * Orders subtasks respecting dependencies and groups parallelizable work.
   */
  async plan(subtasks: Subtask[]): Promise<ExecutionPlan> {
    this.logger.debug(`Planning execution for ${subtasks.length} subtasks`);

    // Simple topological ordering — for now, just execute in order
    // and group everything that has no dependencies into a single wave
    const executionOrder: string[][] = [];

    // Group: all subtasks without dependencies first, then dependency chains
    const noDeps = subtasks
      .filter((s) => !s.dependencies || s.dependencies.length === 0)
      .map((s) => s.id);
    const withDeps = subtasks
      .filter((s) => s.dependencies && s.dependencies.length > 0)
      .map((s) => s.id);

    if (noDeps.length > 0) executionOrder.push(noDeps);
    withDeps.forEach((id) => executionOrder.push([id]));

    return {
      missionId: subtasks[0]?.id?.split(':sub-')[0] || 'unknown',
      subtasks,
      executionOrder,
    };
  }

  /**
   * Step 3: Execute the plan by dispatching subtasks to appropriate agents.
   */
  async execute(plan: ExecutionPlan): Promise<ExecutionResult[]> {
    this.logger.debug(
      `Executing plan with ${plan.executionOrder.length} wave(s)`,
    );

    const results: ExecutionResult[] = [];

    for (const wave of plan.executionOrder) {
      // Execute each wave in parallel
      const waveResults = await Promise.all(
        wave.map(async (subtaskId) => {
          const subtask = plan.subtasks.find((s) => s.id === subtaskId);
          if (!subtask) {
            return {
              subtaskId,
              success: false,
              error: `Subtask not found: ${subtaskId}`,
            };
          }

          return this.executeSubtask(subtask);
        }),
      );

      results.push(...waveResults);
    }

    return results;
  }

  /**
   * Step 4: Critique execution results for quality and correctness.
   */
  async critique(results: ExecutionResult[]): Promise<CritiqueResult[]> {
    this.logger.debug(`Critiquing ${results.length} execution result(s)`);

    return results.map((result) => {
      const issues: string[] = [];
      const suggestions: string[] = [];

      if (!result.success) {
        issues.push(`Execution failed: ${result.error || 'unknown error'}`);
        suggestions.push('Retry with alternative agent or parameters');
      }

      if (result.duration && result.duration > 30000) {
        issues.push('Execution took longer than 30s threshold');
        suggestions.push('Consider optimizing or breaking down the task');
      }

      const severity: 'low' | 'medium' | 'high' = !result.success
        ? 'high'
        : issues.length > 0
          ? 'medium'
          : 'low';

      return {
        subtaskId: result.subtaskId,
        passed: issues.length === 0,
        issues,
        suggestions,
        severity,
      };
    });
  }

  /**
   * Step 5: Repair issues identified during critique.
   * Re-executes failed subtasks with adjusted parameters.
   */
  async repair(context: {
    critiques: CritiqueResult[];
    results: ExecutionResult[];
  }): Promise<RepairResult[]> {
    this.logger.debug(
      `Repairing ${context.critiques.length} critiqued subtask(s)`,
    );

    const repairResults: RepairResult[] = [];

    for (const critique of context.critiques) {
      if (critique.passed) continue;

      const originalResult = context.results.find(
        (r) => r.subtaskId === critique.subtaskId,
      );

      let attempts = 0;
      let repaired = false;
      let remainingIssues = [...critique.issues];
      let data: any = undefined;

      // Attempt repair up to 3 times
      for (let i = 0; i < 3 && !repaired; i++) {
        attempts++;
        try {
          // Try to re-execute with a different agent or adjusted parameters
          const subtask: Subtask = {
            id: critique.subtaskId,
            description: `Repair attempt ${attempts} for ${critique.subtaskId}`,
            requiredCapabilities: originalResult?.agentKey
              ? ['general']
              : ['general'],
          };

          const retryResult = await this.executeSubtask(subtask);
          if (retryResult.success) {
            repaired = true;
            remainingIssues = [];
            data = retryResult.data;
          }
        } catch {
          remainingIssues.push(`Repair attempt ${attempts} failed`);
        }
      }

      repairResults.push({
        subtaskId: critique.subtaskId,
        repaired,
        attempts,
        data,
        remainingIssues,
      });
    }

    return repairResults;
  }

  /**
   * Step 6: Validate repaired results against quality criteria.
   */
  async validate(
    items: Array<RepairResult | ExecutionResult>,
  ): Promise<ValidationResult[]> {
    this.logger.debug(`Validating ${items.length} result(s)`);

    return items.map((item) => {
      const checks: Array<{ name: string; passed: boolean; detail?: string }> =
        [];

      // Check 1: Success/failure
      const isSuccess = 'success' in item ? item.success : 'repaired' in item ? item.repaired : true;
      checks.push({
        name: 'success',
        passed: isSuccess,
        detail: isSuccess ? undefined : 'Execution did not succeed',
      });

      // Check 2: Data presence
      const hasData = !!(item as any).data;
      checks.push({
        name: 'has_data',
        passed: hasData,
        detail: hasData ? undefined : 'No data returned',
      });

      // Check 3: No remaining issues (for RepairResult)
      if ('remainingIssues' in item) {
        const noRemaining = item.remainingIssues.length === 0;
        checks.push({
          name: 'no_remaining_issues',
          passed: noRemaining,
          detail: noRemaining
            ? undefined
            : `${item.remainingIssues.length} issue(s) remain`,
        });
      }

      const score =
        checks.filter((c) => c.passed).length / checks.length;
      const valid = score >= 0.5; // at least half the checks pass

      return {
        subtaskId: (item as any).subtaskId || 'unknown',
        valid,
        score,
        checks,
      };
    });
  }

  /**
   * Step 7: Package validated results for delivery.
   */
  deliver(validations: ValidationResult[]): DeliveryPackage {
    const allValid = validations.every((v) => v.valid);
    const someValid = validations.some((v) => v.valid);

    const status: DeliveryPackage['status'] = allValid
      ? 'success'
      : someValid
        ? 'partial'
        : 'failed';

    const summary = allValid
      ? `All ${validations.length} subtask(s) validated successfully`
      : someValid
        ? `${validations.filter((v) => v.valid).length}/${validations.length} subtask(s) validated`
        : 'No subtasks passed validation';

    return {
      missionId: '',
      status,
      results: [],
      critiques: [],
      validations,
      totalDuration: 0,
      summary,
    };
  }

  // ─── State tracking ─────────────────────────────────────────

  getPipelineState(missionId: string): PipelineState {
    return this.pipelineStates.get(missionId) || 'idle';
  }

  private setState(missionId: string, state: PipelineState): void {
    this.pipelineStates.set(missionId, state);
    this.logger.debug(`Mission ${missionId} → ${state}`);
  }

  // ─── Internal helpers ───────────────────────────────────────

  /**
   * Find and execute a subtask using the most appropriate agent
   * from the registry.
   */
  private async executeSubtask(subtask: Subtask): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Find agents that match the required capabilities
      const candidates = this.registry
        .getAll()
        .filter((agent) =>
          subtask.requiredCapabilities.some((cap) =>
            agent.capabilities.includes(cap),
          ),
        );

      if (candidates.length === 0) {
        // Fallback: try any agent in the preferred cluster
        if (subtask.preferredCluster) {
          const clusterAgents = this.registry.getByCluster(
            subtask.preferredCluster,
          );
          if (clusterAgents.length > 0) {
            const agent = clusterAgents[0];
            const key = `${agent.cluster}:${agent.name}`;
            const result = await this.registry.executeAgent(key, {
              agentId: key,
              tenantId: 'system',
              taskId: subtask.id,
              config: {},
            });

            return {
              subtaskId: subtask.id,
              agentKey: key,
              success: result.success,
              data: result.data,
              error: result.error,
              duration: Date.now() - startTime,
            };
          }
        }

        return {
          subtaskId: subtask.id,
          success: false,
          error: `No agent found with capabilities: ${subtask.requiredCapabilities.join(', ')}`,
          duration: Date.now() - startTime,
        };
      }

      // Pick the first matching agent
      const agent = candidates[0];
      const key = `${agent.cluster}:${agent.name}`;
      const result = await this.registry.executeAgent(key, {
        agentId: key,
        tenantId: 'system',
        taskId: subtask.id,
        config: {},
      });

      this.eventBus.emit(AgentEventType.TOOL_EXECUTED, key, {
        subtaskId: subtask.id,
        success: result.success,
      });

      return {
        subtaskId: subtask.id,
        agentKey: key,
        success: result.success,
        data: result.data,
        error: result.error,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        subtaskId: subtask.id,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }
}
