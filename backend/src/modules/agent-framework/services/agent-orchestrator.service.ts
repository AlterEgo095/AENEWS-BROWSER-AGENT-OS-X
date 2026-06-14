import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentRegistryService } from '../../agent/registry/agent-registry.service';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import { AgentHealthService } from './agent-health.service';
import { ClusterType } from '../../agent/entities/agent.entity';
import { LLMService } from '../../llm/llm.service';

// ─── Pipeline Types ──────────────────────────────────────────

export interface Mission {
  id: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  constraints?: Record<string, any>;
  metadata?: Record<string, any>;
  /** Expected output schema for validation (JSON Schema format) */
  expectedSchema?: Record<string, any>;
  /** Minimum quality score (0–1) required for validation to pass */
  qualityThreshold?: number;
  /** Objectives that must be addressed in the result */
  objectives?: string[];
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

// ─── Pipeline Metrics ────────────────────────────────────────

export interface StepMetrics {
  stepName: string;
  durationMs: number;
  llmUsed: boolean;
  agentDispatchCount: number;
  success: boolean;
  errorMessage?: string;
}

export interface PipelineMetrics {
  missionId: string;
  missionDescription: string;
  missionPriority: string;
  totalDurationMs: number;
  stepMetrics: StepMetrics[];
  totalAgentDispatches: number;
  repairRate: number; // % of executions needing repair
  successRate: number; // per mission: 1 = success, 0.5 = partial, 0 = failed
  timestamp: string;
}

// ─── Default Pipeline Timeouts (ms) ──────────────────────────

const DEFAULT_PIPELINE_TIMEOUTS: Record<string, number> = {
  decompose: 30_000,   // 30s
  plan: 45_000,        // 45s
  execute: 120_000,    // 2min (longest, includes agent execution)
  critique: 30_000,    // 30s
  repair: 60_000,      // 1min
  validate: 20_000,    // 20s
  deliver: 15_000,     // 15s
};

// ─── Safety Patterns ─────────────────────────────────────────

/** Patterns that indicate potentially harmful output content */
const SAFETY_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(exec|eval|system)\s*\(/i, label: 'code_injection_risk' },
  { pattern: /\b(drop\s+table|delete\s+from|truncate\s)/i, label: 'destructive_sql' },
  { pattern: /\b(rm\s+-rf|del\s+\/[sq])/i, label: 'destructive_command' },
  { pattern: /\b(password|secret|api[_-]?key)\s*[:=]/i, label: 'credential_exposure' },
];

// ─── Service ─────────────────────────────────────────────────

/**
 * Agent Orchestrator — implements the full mission pipeline:
 *
 *   Decompose → Plan → Execute → Critique → Repair → Validate → Deliver
 *
 * Each step uses the AgentRegistryService to discover capable agents
 * and emits events via AgentEventBusService for observability.
 *
 * Enhanced features:
 *   - Timeout protection per pipeline step (configurable via env vars)
 *   - findBestAgent for intelligent agent selection with health + load awareness
 *   - Improved validation with schema, quality, completeness, constraints, and safety checks
 *   - Concurrent mission support (deduplication of active pipelines)
 *   - Structured logging for observability
 *   - Pipeline metrics tracking
 *
 * When LLM is available, the orchestrator uses it for intelligent
 * decomposition, planning, critiquing, and repair. When LLM is
 * unavailable, it falls back to heuristic methods.
 */
@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);

  /** Per-mission pipeline state tracking */
  private readonly pipelineStates = new Map<string, PipelineState>();

  /** Concurrent mission deduplication: active pipeline promises */
  private readonly activePipelines = new Map<string, Promise<DeliveryPackage>>();

  /** Pipeline execution metrics history (in-memory, last 1000 missions) */
  private readonly metricsHistory: PipelineMetrics[] = [];
  private readonly MAX_METRICS_HISTORY = 1000;

  /** Step-level agent dispatch counter (reset per pipeline) */
  private currentStepDispatchCount = 0;

  /** Configurable pipeline timeouts */
  private readonly pipelineTimeouts: Record<string, number>;

  constructor(
    private readonly registry: AgentRegistryService,
    private readonly eventBus: AgentEventBusService,
    private readonly memory: AgentMemoryService,
    @Optional() private readonly llmService: LLMService,
    @Optional() private readonly healthService: AgentHealthService,
    @Optional() private readonly configService: ConfigService,
  ) {
    // Load timeouts from env vars with fallback to defaults
    this.pipelineTimeouts = { ...DEFAULT_PIPELINE_TIMEOUTS };
    if (this.configService) {
      for (const step of Object.keys(DEFAULT_PIPELINE_TIMEOUTS)) {
        const envKey = `PIPELINE_TIMEOUT_${step.toUpperCase()}`;
        const envVal = this.configService.get<string>(envKey);
        if (envVal) {
          const parsed = parseInt(envVal, 10);
          if (!isNaN(parsed) && parsed > 0) {
            this.pipelineTimeouts[step] = parsed;
          }
        }
      }
    }
    this.logger.log({
      msg: 'AgentOrchestrator initialized with pipeline timeouts',
      timeouts: this.pipelineTimeouts,
    });
  }

  // ─── Full Pipeline ──────────────────────────────────────────

  /**
   * Execute a complete mission through the full pipeline.
   *
   * Concurrent mission support: if this mission already has an active
   * pipeline running, return its promise instead of starting a duplicate.
   */
  async executeMission(mission: Mission): Promise<DeliveryPackage> {
    // Deduplicate: if this mission already has an active pipeline, await it
    if (this.activePipelines.has(mission.id)) {
      this.logger.log({
        step: 'executeMission',
        missionId: mission.id,
        msg: 'Mission already has an active pipeline — returning existing promise',
      });
      return this.activePipelines.get(mission.id)!;
    }

    const pipelinePromise = this.runPipeline(mission).finally(() => {
      this.activePipelines.delete(mission.id);
    });

    this.activePipelines.set(mission.id, pipelinePromise);
    return pipelinePromise;
  }

  /**
   * Internal pipeline execution. Wrapped by executeMission for deduplication.
   */
  private async runPipeline(mission: Mission): Promise<DeliveryPackage> {
    const pipelineStartTime = Date.now();
    const stepMetrics: StepMetrics[] = [];
    this.currentStepDispatchCount = 0;

    this.logStructured('pipeline_start', mission.id, {
      description: mission.description,
      priority: mission.priority || 'medium',
    });

    try {
      // 1. Decompose
      this.setState(mission.id, 'decomposing');
      this.eventBus.emit(AgentEventType.AGENT_STARTED, mission.id, {
        phase: 'decompose',
      });
      const decomposeStart = Date.now();
      let llmUsedDecompose = false;
      let subtasks: Subtask[];
      try {
        subtasks = await this.withTimeout(
          this.decompose(mission),
          this.pipelineTimeouts.decompose,
          'decompose',
        );
        llmUsedDecompose = this.llmService?.isAnyAvailable() ?? false;
      } catch (error: any) {
        stepMetrics.push({
          stepName: 'decompose',
          durationMs: Date.now() - decomposeStart,
          llmUsed: false,
          agentDispatchCount: 0,
          success: false,
          errorMessage: error.message,
        });
        throw error;
      }
      stepMetrics.push({
        stepName: 'decompose',
        durationMs: Date.now() - decomposeStart,
        llmUsed: llmUsedDecompose,
        agentDispatchCount: 0,
        success: true,
      });
      await this.memory.store(mission.id, MemoryTier.WORKING, 'subtasks', subtasks);

      this.logStructured('decompose', mission.id, {
        subtaskCount: subtasks.length,
        durationMs: Date.now() - decomposeStart,
        llmUsed: llmUsedDecompose,
      });

      // 2. Plan
      this.setState(mission.id, 'planning');
      const planStart = Date.now();
      let llmUsedPlan = false;
      let plan: ExecutionPlan;
      try {
        plan = await this.withTimeout(
          this.plan(subtasks),
          this.pipelineTimeouts.plan,
          'plan',
        );
        llmUsedPlan = this.llmService?.isAnyAvailable() ?? false;
      } catch (error: any) {
        stepMetrics.push({
          stepName: 'plan',
          durationMs: Date.now() - planStart,
          llmUsed: false,
          agentDispatchCount: 0,
          success: false,
          errorMessage: error.message,
        });
        throw error;
      }
      stepMetrics.push({
        stepName: 'plan',
        durationMs: Date.now() - planStart,
        llmUsed: llmUsedPlan,
        agentDispatchCount: 0,
        success: true,
      });
      await this.memory.store(mission.id, MemoryTier.WORKING, 'plan', plan);

      this.logStructured('plan', mission.id, {
        waveCount: plan.executionOrder.length,
        subtaskCount: plan.subtasks.length,
        durationMs: Date.now() - planStart,
        llmUsed: llmUsedPlan,
      });

      // 3. Execute
      this.setState(mission.id, 'executing');
      const execStart = Date.now();
      const dispatchCountBeforeExecute = this.currentStepDispatchCount;
      let results: ExecutionResult[];
      try {
        results = await this.withTimeout(
          this.execute(plan),
          this.pipelineTimeouts.execute,
          'execute',
        );
      } catch (error: any) {
        stepMetrics.push({
          stepName: 'execute',
          durationMs: Date.now() - execStart,
          llmUsed: false,
          agentDispatchCount: this.currentStepDispatchCount - dispatchCountBeforeExecute,
          success: false,
          errorMessage: error.message,
        });
        throw error;
      }
      const executeDispatchCount = this.currentStepDispatchCount - dispatchCountBeforeExecute;
      stepMetrics.push({
        stepName: 'execute',
        durationMs: Date.now() - execStart,
        llmUsed: false,
        agentDispatchCount: executeDispatchCount,
        success: true,
      });
      await this.memory.store(mission.id, MemoryTier.WORKING, 'results', results);

      this.logStructured('execute', mission.id, {
        resultCount: results.length,
        successCount: results.filter((r) => r.success).length,
        failCount: results.filter((r) => !r.success).length,
        agentDispatchCount: executeDispatchCount,
        durationMs: Date.now() - execStart,
      });

      // 4. Critique
      this.setState(mission.id, 'critiquing');
      const critiqueStart = Date.now();
      let llmUsedCritique = false;
      let critiques: CritiqueResult[];
      try {
        critiques = await this.withTimeout(
          this.critique(results),
          this.pipelineTimeouts.critique,
          'critique',
        );
        llmUsedCritique = this.llmService?.isAnyAvailable() ?? false;
      } catch (error: any) {
        stepMetrics.push({
          stepName: 'critique',
          durationMs: Date.now() - critiqueStart,
          llmUsed: false,
          agentDispatchCount: 0,
          success: false,
          errorMessage: error.message,
        });
        throw error;
      }
      stepMetrics.push({
        stepName: 'critique',
        durationMs: Date.now() - critiqueStart,
        llmUsed: llmUsedCritique,
        agentDispatchCount: 0,
        success: true,
      });
      await this.memory.store(mission.id, MemoryTier.WORKING, 'critiques', critiques);

      this.logStructured('critique', mission.id, {
        passedCount: critiques.filter((c) => c.passed).length,
        failedCount: critiques.filter((c) => !c.passed).length,
        durationMs: Date.now() - critiqueStart,
        llmUsed: llmUsedCritique,
      });

      // 5. Repair (only for failed/critiqued subtasks)
      const needsRepair = critiques.filter((c) => !c.passed);
      let repairResults: RepairResult[] = [];
      if (needsRepair.length > 0) {
        this.setState(mission.id, 'repairing');
        const repairStart = Date.now();
        const dispatchCountBeforeRepair = this.currentStepDispatchCount;
        let llmUsedRepair = false;
        try {
          repairResults = await this.withTimeout(
            this.repair({ critiques: needsRepair, results }),
            this.pipelineTimeouts.repair,
            'repair',
          );
          llmUsedRepair = this.llmService?.isAnyAvailable() ?? false;
        } catch (error: any) {
          stepMetrics.push({
            stepName: 'repair',
            durationMs: Date.now() - repairStart,
            llmUsed: false,
            agentDispatchCount: this.currentStepDispatchCount - dispatchCountBeforeRepair,
            success: false,
            errorMessage: error.message,
          });
          throw error;
        }
        const repairDispatchCount = this.currentStepDispatchCount - dispatchCountBeforeRepair;
        stepMetrics.push({
          stepName: 'repair',
          durationMs: Date.now() - repairStart,
          llmUsed: llmUsedRepair,
          agentDispatchCount: repairDispatchCount,
          success: true,
        });
        await this.memory.store(mission.id, MemoryTier.WORKING, 'repairs', repairResults);

        this.logStructured('repair', mission.id, {
          repairCount: needsRepair.length,
          repairedCount: repairResults.filter((r) => r.repaired).length,
          agentDispatchCount: repairDispatchCount,
          durationMs: Date.now() - repairStart,
          llmUsed: llmUsedRepair,
        });
      }

      // 6. Validate
      this.setState(mission.id, 'validating');
      const validateStart = Date.now();
      let validations: ValidationResult[];
      try {
        validations = await this.withTimeout(
          this.validate(
            repairResults.length > 0 ? repairResults : (results as any[]),
            mission,
          ),
          this.pipelineTimeouts.validate,
          'validate',
        );
      } catch (error: any) {
        stepMetrics.push({
          stepName: 'validate',
          durationMs: Date.now() - validateStart,
          llmUsed: false,
          agentDispatchCount: 0,
          success: false,
          errorMessage: error.message,
        });
        throw error;
      }
      stepMetrics.push({
        stepName: 'validate',
        durationMs: Date.now() - validateStart,
        llmUsed: false,
        agentDispatchCount: 0,
        success: true,
      });
      await this.memory.store(mission.id, MemoryTier.WORKING, 'validations', validations);

      this.logStructured('validate', mission.id, {
        validCount: validations.filter((v) => v.valid).length,
        invalidCount: validations.filter((v) => !v.valid).length,
        avgScore: validations.length > 0
          ? validations.reduce((sum, v) => sum + v.score, 0) / validations.length
          : 0,
        durationMs: Date.now() - validateStart,
      });

      // 7. Deliver
      this.setState(mission.id, 'delivering');
      const deliverStart = Date.now();
      let delivery: DeliveryPackage;
      try {
        delivery = await this.withTimeout(
          Promise.resolve(this.deliver(validations)),
          this.pipelineTimeouts.deliver,
          'deliver',
        );
      } catch (error: any) {
        stepMetrics.push({
          stepName: 'deliver',
          durationMs: Date.now() - deliverStart,
          llmUsed: false,
          agentDispatchCount: 0,
          success: false,
          errorMessage: error.message,
        });
        throw error;
      }
      stepMetrics.push({
        stepName: 'deliver',
        durationMs: Date.now() - deliverStart,
        llmUsed: false,
        agentDispatchCount: 0,
        success: true,
      });

      delivery.missionId = mission.id;
      delivery.results = results;
      delivery.critiques = critiques;
      delivery.validations = validations;
      delivery.totalDuration = Date.now() - pipelineStartTime;

      this.setState(mission.id, 'completed');
      this.eventBus.emit(AgentEventType.AGENT_COMPLETED, mission.id, {
        status: delivery.status,
        duration: delivery.totalDuration,
      });

      // Persist to long-term memory
      await this.memory.store(mission.id, MemoryTier.LONG_TERM, 'delivery', delivery);

      // Record pipeline metrics
      const totalExecutions = results.length;
      const repairableCount = needsRepair.length;
      const metrics = this.buildMetrics(mission, pipelineStartTime, stepMetrics, delivery);
      this.recordMetrics(metrics);

      // Record execution results to health service
      if (this.healthService) {
        for (const result of results) {
          if (result.agentKey) {
            this.healthService.recordExecution(
              result.agentKey,
              result.duration || 0,
              result.success,
              result.error,
            );
          }
        }
      }

      this.logStructured('pipeline_complete', mission.id, {
        status: delivery.status,
        totalDurationMs: delivery.totalDuration,
        totalAgentDispatches: metrics.totalAgentDispatches,
        repairRate: metrics.repairRate,
      });

      return delivery;
    } catch (error: any) {
      this.setState(mission.id, 'failed');
      this.eventBus.emit(AgentEventType.AGENT_FAILED, mission.id, {
        error: error.message,
      });

      // Record failed pipeline metrics
      const metrics = this.buildMetrics(mission, pipelineStartTime, stepMetrics, null);
      this.recordMetrics(metrics);

      this.logStructured('pipeline_failed', mission.id, {
        error: error.message,
        totalDurationMs: Date.now() - pipelineStartTime,
      });

      return {
        missionId: mission.id,
        status: 'failed',
        results: [],
        critiques: [],
        validations: [],
        totalDuration: Date.now() - pipelineStartTime,
        summary: `Mission failed: ${error.message}`,
      };
    }
  }

  // ─── Timeout Protection ─────────────────────────────────────

  /**
   * Wrap a promise with a timeout. If the promise does not resolve
   * within the specified duration, it is rejected with a timeout error.
   */
  private withTimeout<T>(promise: Promise<T>, ms: number, stepName: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Pipeline step "${stepName}" timed out after ${ms}ms`)),
          ms,
        ),
      ),
    ]);
  }

  // ─── Pipeline Steps ─────────────────────────────────────────

  /**
   * Step 1: Decompose a mission into subtasks.
   * Uses LLM when available for intelligent decomposition,
   * falls back to simple heuristic when LLM is unavailable.
   */
  async decompose(mission: Mission): Promise<Subtask[]> {
    this.logger.debug(`Decomposing mission: ${mission.id}`);

    // Try LLM-powered decomposition first
    if (this.llmService?.isAnyAvailable()) {
      try {
        return await this.decomposeWithLLM(mission);
      } catch (error: any) {
        this.logger.warn(
          `LLM decomposition failed, falling back to heuristic: ${error.message}`,
        );
      }
    }

    // Fallback: simple heuristic decomposition
    return this.decomposeHeuristic(mission);
  }

  /**
   * Step 2: Create an execution plan from subtasks.
   * Uses LLM when available for intelligent planning,
   * falls back to simple topological ordering.
   */
  async plan(subtasks: Subtask[]): Promise<ExecutionPlan> {
    this.logger.debug(`Planning execution for ${subtasks.length} subtasks`);

    // Try LLM-powered planning first
    if (this.llmService?.isAnyAvailable()) {
      try {
        return await this.planWithLLM(subtasks);
      } catch (error: any) {
        this.logger.warn(
          `LLM planning failed, falling back to heuristic: ${error.message}`,
        );
      }
    }

    // Fallback: simple topological ordering
    return this.planHeuristic(subtasks);
  }

  /**
   * Step 3: Execute the plan by dispatching subtasks to appropriate agents.
   * Uses findBestAgent for intelligent agent selection.
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
   * Uses LLM when available for intelligent critique,
   * falls back to rule-based evaluation.
   */
  async critique(results: ExecutionResult[]): Promise<CritiqueResult[]> {
    this.logger.debug(`Critiquing ${results.length} execution result(s)`);

    // Try LLM-powered critique first
    if (this.llmService?.isAnyAvailable()) {
      try {
        return await this.critiqueWithLLM(results);
      } catch (error: any) {
        this.logger.warn(
          `LLM critique failed, falling back to heuristic: ${error.message}`,
        );
      }
    }

    // Fallback: rule-based critique
    return this.critiqueHeuristic(results);
  }

  /**
   * Step 5: Repair issues identified during critique.
   * Uses LLM when available for intelligent repair suggestions,
   * falls back to re-execution.
   */
  async repair(context: {
    critiques: CritiqueResult[];
    results: ExecutionResult[];
  }): Promise<RepairResult[]> {
    this.logger.debug(
      `Repairing ${context.critiques.length} critiqued subtask(s)`,
    );

    // Try LLM-powered repair first
    if (this.llmService?.isAnyAvailable()) {
      try {
        return await this.repairWithLLM(context);
      } catch (error: any) {
        this.logger.warn(
          `LLM repair failed, falling back to heuristic: ${error.message}`,
        );
      }
    }

    // Fallback: simple re-execution repair
    return this.repairHeuristic(context);
  }

  /**
   * Step 6: Validate repaired results against quality criteria.
   *
   * Enhanced validation checks:
   *   1. Success/failure check
   *   2. Data presence check
   *   3. Schema validation (if expectedSchema provided in mission)
   *   4. Quality threshold (minimum score from critique/validation)
   *   5. Completeness check (all objectives addressed, if provided)
   *   6. No remaining issues (for RepairResult)
   *   7. Constraint compliance (all constraints satisfied, if provided)
   *   8. Safety check (no harmful outputs detected)
   */
  async validate(
    items: Array<RepairResult | ExecutionResult>,
    mission?: Mission,
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

      // Check 3: Schema validation
      if (mission?.expectedSchema && hasData) {
        const schemaValid = this.validateSchema(
          (item as any).data,
          mission.expectedSchema,
        );
        checks.push({
          name: 'schema_validation',
          passed: schemaValid,
          detail: schemaValid ? undefined : 'Result data does not match expected schema',
        });
      }

      // Check 4: Quality threshold
      if (mission?.qualityThreshold !== undefined) {
        // Use the success status and data quality as proxy for quality score
        const qualityScore = isSuccess ? (hasData ? 1.0 : 0.6) : 0.1;
        const meetsThreshold = qualityScore >= mission.qualityThreshold;
        checks.push({
          name: 'quality_threshold',
          passed: meetsThreshold,
          detail: meetsThreshold
            ? undefined
            : `Quality score ${qualityScore.toFixed(2)} below threshold ${mission.qualityThreshold}`,
        });
      }

      // Check 5: Completeness — all objectives addressed
      if (mission?.objectives && mission.objectives.length > 0 && hasData) {
        const dataStr = JSON.stringify((item as any).data).toLowerCase();
        const addressedObjectives = mission.objectives.filter((obj) =>
          dataStr.includes(obj.toLowerCase()),
        );
        const allAddressed = addressedObjectives.length === mission.objectives.length;
        checks.push({
          name: 'completeness',
          passed: allAddressed,
          detail: allAddressed
            ? undefined
            : `${mission.objectives.length - addressedObjectives.length} objective(s) not addressed: ` +
              mission.objectives.filter((obj) => !addressedObjectives.includes(obj)).join(', '),
        });
      }

      // Check 6: No remaining issues (for RepairResult)
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

      // Check 7: Constraint compliance
      if (mission?.constraints) {
        const constraintIssues = this.checkConstraints(
          (item as any).data,
          mission.constraints,
        );
        checks.push({
          name: 'constraint_compliance',
          passed: constraintIssues.length === 0,
          detail: constraintIssues.length > 0
            ? `Constraint violations: ${constraintIssues.join('; ')}`
            : undefined,
        });
      }

      // Check 8: Safety check
      if (hasData) {
        const safetyResult = this.safetyCheck((item as any).data);
        checks.push({
          name: 'safety_check',
          passed: safetyResult.safe,
          detail: safetyResult.safe
            ? undefined
            : `Safety concerns detected: ${safetyResult.flags.join(', ')}`,
        });
      }

      const score =
        checks.filter((c) => c.passed).length / checks.length;
      const valid = score >= 0.6; // at least 60% of checks must pass (raised from 50%)

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

  /**
   * Check if a mission currently has an active pipeline.
   */
  isMissionActive(missionId: string): boolean {
    return this.activePipelines.has(missionId);
  }

  private setState(missionId: string, state: PipelineState): void {
    this.pipelineStates.set(missionId, state);
    this.logger.debug(`Mission ${missionId} → ${state}`);
  }

  // ─── Validation Helpers ─────────────────────────────────────

  /**
   * Basic schema validation: checks that all required top-level keys
   * exist in the data object. This is a lightweight check — full JSON
   * Schema validation would require a library like ajv.
   */
  private validateSchema(
    data: any,
    schema: Record<string, any>,
  ): boolean {
    if (!data || typeof data !== 'object') return false;

    try {
      const required = schema.required || [];
      if (Array.isArray(required)) {
        for (const key of required) {
          if (!(key in data)) return false;
        }
      }

      // Check type hints if provided in schema.properties
      const properties = schema.properties || {};
      for (const [key, propSchema] of Object.entries(properties)) {
        const prop = propSchema as any;
        if (key in data && prop.type) {
          const actualType = typeof data[key];
          const expectedType = prop.type;
          if (expectedType === 'string' && actualType !== 'string') return false;
          if (expectedType === 'number' && actualType !== 'number') return false;
          if (expectedType === 'boolean' && actualType !== 'boolean') return false;
          if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(data[key]))) return false;
          if (expectedType === 'array' && !Array.isArray(data[key])) return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check constraint compliance against mission constraints.
   * Returns an array of violation descriptions.
   */
  private checkConstraints(
    data: any,
    constraints: Record<string, any>,
  ): string[] {
    const violations: string[] = [];

    if (!data || typeof data !== 'object') return violations;

    try {
      // Check max length constraints
      if (constraints.maxLength && typeof data === 'string') {
        if (data.length > constraints.maxLength) {
          violations.push(`Data exceeds max length of ${constraints.maxLength}`);
        }
      }

      // Check allowed values
      if (constraints.allowedValues && Array.isArray(constraints.allowedValues)) {
        const dataStr = JSON.stringify(data);
        const hasAllowed = constraints.allowedValues.some((v: any) =>
          dataStr.includes(String(v)),
        );
        if (!hasAllowed) {
          violations.push('Data does not contain any of the allowed values');
        }
      }

      // Check forbidden patterns
      if (constraints.forbiddenPatterns && Array.isArray(constraints.forbiddenPatterns)) {
        const dataStr = JSON.stringify(data);
        for (const pattern of constraints.forbiddenPatterns) {
          if (dataStr.includes(pattern)) {
            violations.push(`Data contains forbidden pattern: ${pattern}`);
          }
        }
      }

      // Check required fields in data
      if (constraints.requiredFields && Array.isArray(constraints.requiredFields)) {
        for (const field of constraints.requiredFields) {
          if (!(field in data)) {
            violations.push(`Missing required field: ${field}`);
          }
        }
      }

      // Check numeric range constraints
      if (constraints.numericRange) {
        const range = constraints.numericRange;
        for (const [field, bounds] of Object.entries(range)) {
          const b = bounds as { min?: number; max?: number };
          if (field in data && typeof data[field] === 'number') {
            if (b.min !== undefined && data[field] < b.min) {
              violations.push(`Field ${field} is below minimum ${b.min}`);
            }
            if (b.max !== undefined && data[field] > b.max) {
              violations.push(`Field ${field} exceeds maximum ${b.max}`);
            }
          }
        }
      }
    } catch {
      violations.push('Constraint validation encountered an error');
    }

    return violations;
  }

  /**
   * Safety check: scan data for potentially harmful patterns.
   */
  private safetyCheck(data: any): { safe: boolean; flags: string[] } {
    const flags: string[] = [];

    try {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);

      for (const { pattern, label } of SAFETY_PATTERNS) {
        if (pattern.test(dataStr)) {
          flags.push(label);
        }
      }
    } catch {
      // If we can't serialize, assume safe
    }

    return { safe: flags.length === 0, flags };
  }

  // ─── Metrics ────────────────────────────────────────────────

  /**
   * Build pipeline metrics from the collected step metrics.
   */
  private buildMetrics(
    mission: Mission,
    pipelineStartTime: number,
    stepMetrics: StepMetrics[],
    delivery: DeliveryPackage | null,
  ): PipelineMetrics {
    const totalAgentDispatches = stepMetrics.reduce(
      (sum, sm) => sum + sm.agentDispatchCount,
      0,
    );

    // Calculate repair rate
    const executeStep = stepMetrics.find((s) => s.stepName === 'execute');
    const repairStep = stepMetrics.find((s) => s.stepName === 'repair');
    const totalExecutions = delivery?.results?.length || 0;
    const repairCount = repairStep ? delivery?.critiques?.filter((c) => !c.passed).length || 0 : 0;
    const repairRate = totalExecutions > 0 ? repairCount / totalExecutions : 0;

    // Calculate success rate
    let successRate = 0;
    if (delivery) {
      if (delivery.status === 'success') successRate = 1;
      else if (delivery.status === 'partial') successRate = 0.5;
      else successRate = 0;
    }

    return {
      missionId: mission.id,
      missionDescription: mission.description,
      missionPriority: mission.priority || 'medium',
      totalDurationMs: Date.now() - pipelineStartTime,
      stepMetrics,
      totalAgentDispatches,
      repairRate,
      successRate,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Record pipeline metrics. Keeps the last MAX_METRICS_HISTORY entries.
   */
  private recordMetrics(metrics: PipelineMetrics): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.MAX_METRICS_HISTORY) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Get aggregated pipeline metrics.
   */
  getMetrics(): {
    totalMissions: number;
    recentMetrics: PipelineMetrics[];
    aggregateRepairRate: number;
    aggregateSuccessRate: number;
    averageDurationMs: number;
  } {
    const total = this.metricsHistory.length;
    if (total === 0) {
      return {
        totalMissions: 0,
        recentMetrics: [],
        aggregateRepairRate: 0,
        aggregateSuccessRate: 0,
        averageDurationMs: 0,
      };
    }

    const aggregateRepairRate =
      this.metricsHistory.reduce((sum, m) => sum + m.repairRate, 0) / total;
    const aggregateSuccessRate =
      this.metricsHistory.reduce((sum, m) => sum + m.successRate, 0) / total;
    const averageDurationMs =
      this.metricsHistory.reduce((sum, m) => sum + m.totalDurationMs, 0) / total;

    return {
      totalMissions: total,
      recentMetrics: this.metricsHistory.slice(-20), // last 20 missions
      aggregateRepairRate,
      aggregateSuccessRate,
      averageDurationMs,
    };
  }

  /**
   * Get metrics for a specific mission type (by priority).
   */
  getMetricsByPriority(priority: string): PipelineMetrics[] {
    return this.metricsHistory.filter((m) => m.missionPriority === priority);
  }

  // ─── Structured Logging ─────────────────────────────────────

  /**
   * Structured logging helper. Uses NestJS Logger with object payload
   * for better observability and log parsing.
   */
  private logStructured(step: string, missionId: string, data: Record<string, any>): void {
    this.logger.log({
      step,
      missionId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── LLM-powered Pipeline Steps ─────────────────────────────

  /**
   * Decompose a mission using LLM for intelligent task breakdown.
   */
  private async decomposeWithLLM(mission: Mission): Promise<Subtask[]> {
    const systemPrompt = `You are an expert task decomposition agent. Your job is to break down a mission description into a list of concrete, executable subtasks.

For each subtask, provide:
- description: A clear, actionable description of what needs to be done
- requiredCapabilities: An array of capability strings needed (e.g., "general", "web-search", "data-analysis", "code-generation")
- preferredCluster: The most suitable agent cluster (one of: browser, computer, coding, office, marketing, business, infrastructure, security, llm-intelligence)
- dependencies: An array of subtask indices (0-based) that must complete before this subtask can start
- priority: A number from 1 (highest) to 10 (lowest)

Respond with valid JSON only, in this format:
{
  "subtasks": [
    {
      "description": "...",
      "requiredCapabilities": ["..."],
      "preferredCluster": "...",
      "dependencies": [],
      "priority": 1
    }
  ]
}`;

    const userMessage = `Decompose the following mission into subtasks:

Mission ID: ${mission.id}
Description: ${mission.description}
Priority: ${mission.priority || 'medium'}
Constraints: ${JSON.stringify(mission.constraints || {})}
Metadata: ${JSON.stringify(mission.metadata || {})}`;

    const response = await this.llmService!.chatWithSystem(
      systemPrompt,
      userMessage,
      { responseFormat: 'json', temperature: 0.3 },
    );

    const parsed = JSON.parse(response.content);
    const subtasks: Subtask[] = (parsed.subtasks || []).map(
      (s: any, index: number) => ({
        id: `${mission.id}:sub-${index + 1}`,
        description: s.description,
        requiredCapabilities: s.requiredCapabilities || ['general'],
        preferredCluster: s.preferredCluster as ClusterType | undefined,
        dependencies: (s.dependencies || []).map(
          (depIdx: number) => `${mission.id}:sub-${depIdx + 1}`,
        ),
        priority: s.priority ?? index + 1,
      }),
    );

    // If LLM returned no subtasks, fall back
    if (subtasks.length === 0) {
      throw new Error('LLM returned empty decomposition');
    }

    this.logger.log(
      `LLM decomposed mission ${mission.id} into ${subtasks.length} subtask(s)`,
    );
    return subtasks;
  }

  /**
   * Plan execution order using LLM for intelligent scheduling.
   */
  private async planWithLLM(subtasks: Subtask[]): Promise<ExecutionPlan> {
    const systemPrompt = `You are an expert execution planner. Given a list of subtasks with dependencies, determine the optimal execution order.

Group subtasks into waves where all subtasks in a wave can execute in parallel (no dependencies between them).
Subtasks in later waves depend on subtasks from earlier waves.

Respond with valid JSON only, in this format:
{
  "executionOrder": [
    ["subtask-id-1", "subtask-id-2"],
    ["subtask-id-3"]
  ],
  "estimatedDuration": 30000
}`;

    const userMessage = `Plan the execution order for these subtasks:

${subtasks.map((s) => `- ID: ${s.id}, Description: ${s.description}, Dependencies: ${JSON.stringify(s.dependencies || [])}, Priority: ${s.priority}`).join('\n')}`;

    const response = await this.llmService!.chatWithSystem(
      systemPrompt,
      userMessage,
      { responseFormat: 'json', temperature: 0.2 },
    );

    const parsed = JSON.parse(response.content);
    const missionId = subtasks[0]?.id?.split(':sub-')[0] || 'unknown';

    return {
      missionId,
      subtasks,
      executionOrder: parsed.executionOrder || [],
      estimatedDuration: parsed.estimatedDuration,
    };
  }

  /**
   * Critique execution results using LLM for intelligent quality evaluation.
   */
  private async critiqueWithLLM(
    results: ExecutionResult[],
  ): Promise<CritiqueResult[]> {
    const systemPrompt = `You are an expert quality critic. Evaluate the execution results of subtasks and identify issues.

For each subtask result, provide:
- passed: boolean indicating if the result is acceptable
- issues: array of strings describing problems found
- suggestions: array of strings with improvement recommendations
- severity: "low", "medium", or "high"

Respond with valid JSON only, in this format:
{
  "critiques": [
    {
      "subtaskId": "...",
      "passed": true,
      "issues": [],
      "suggestions": [],
      "severity": "low"
    }
  ]
}`;

    const userMessage = `Critique these execution results:

${results.map((r) => `- Subtask: ${r.subtaskId}, Success: ${r.success}, Duration: ${r.duration}ms, Error: ${r.error || 'none'}, Data: ${r.data ? JSON.stringify(r.data).slice(0, 200) : 'none'}`).join('\n')}`;

    const response = await this.llmService!.chatWithSystem(
      systemPrompt,
      userMessage,
      { responseFormat: 'json', temperature: 0.3 },
    );

    const parsed = JSON.parse(response.content);

    // Merge LLM critiques with any results not covered
    const llmCritiques = new Map<string, CritiqueResult>();
    for (const c of parsed.critiques || []) {
      llmCritiques.set(c.subtaskId, {
        subtaskId: c.subtaskId,
        passed: c.passed,
        issues: c.issues || [],
        suggestions: c.suggestions || [],
        severity: c.severity || 'low',
      });
    }

    // Fill in any missing subtasks with heuristic results
    const heuristicResults = this.critiqueHeuristic(results);
    for (const hr of heuristicResults) {
      if (!llmCritiques.has(hr.subtaskId)) {
        llmCritiques.set(hr.subtaskId, hr);
      }
    }

    return Array.from(llmCritiques.values());
  }

  /**
   * Repair using LLM for intelligent fix suggestions.
   */
  private async repairWithLLM(context: {
    critiques: CritiqueResult[];
    results: ExecutionResult[];
  }): Promise<RepairResult[]> {
    const systemPrompt = `You are an expert repair agent. Given failed subtask critiques and their original execution results, suggest repair strategies.

For each failed subtask, provide:
- repaired: boolean indicating if the issue can likely be resolved
- remainingIssues: array of strings describing issues that cannot be resolved
- repairStrategy: a description of the recommended repair approach

Respond with valid JSON only, in this format:
{
  "repairs": [
    {
      "subtaskId": "...",
      "repaired": true,
      "remainingIssues": [],
      "repairStrategy": "..."
    }
  ]
}`;

    const userMessage = `Analyze these failed subtask critiques and suggest repairs:

${context.critiques.map((c) => `Subtask: ${c.subtaskId}
Issues: ${c.issues.join('; ')}
Suggestions: ${c.suggestions.join('; ')}
Severity: ${c.severity}`).join('\n\n')}

Original results:
${context.results.map((r) => `Subtask: ${r.subtaskId}, Success: ${r.success}, Error: ${r.error || 'none'}`).join('\n')}`;

    const response = await this.llmService!.chatWithSystem(
      systemPrompt,
      userMessage,
      { responseFormat: 'json', temperature: 0.3 },
    );

    const parsed = JSON.parse(response.content);

    // Build repair results from LLM suggestions, then attempt re-execution
    const repairResults: RepairResult[] = [];

    for (const repair of parsed.repairs || []) {
      const critique = context.critiques.find(
        (c) => c.subtaskId === repair.subtaskId,
      );
      const originalResult = context.results.find(
        (r) => r.subtaskId === repair.subtaskId,
      );

      let attempts = 0;
      let repaired = repair.repaired ?? false;
      let data: any = undefined;
      const remainingIssues = repair.remainingIssues || [];

      // If LLM suggests the issue is repairable, attempt re-execution
      if (repaired && critique) {
        const subtask: Subtask = {
          id: critique.subtaskId,
          description: `LLM-guided repair for ${critique.subtaskId}: ${repair.repairStrategy || 're-execute'}`,
          requiredCapabilities: ['general'],
        };

        try {
          attempts++;
          const retryResult = await this.executeSubtask(subtask);
          if (retryResult.success) {
            repaired = true;
            data = retryResult.data;
          } else {
            remainingIssues.push(
              `Re-execution failed: ${retryResult.error || 'unknown'}`,
            );
          }
        } catch {
          remainingIssues.push('Re-execution threw an exception');
        }
      }

      repairResults.push({
        subtaskId: repair.subtaskId,
        repaired,
        attempts,
        data,
        remainingIssues,
      });
    }

    // Handle any critiques not covered by LLM response
    const coveredIds = new Set(
      (parsed.repairs || []).map((r: any) => r.subtaskId),
    );
    const uncovered = context.critiques.filter((c) => !coveredIds.has(c.subtaskId));
    if (uncovered.length > 0) {
      const heuristicRepairs = await this.repairHeuristic({
        critiques: uncovered,
        results: context.results,
      });
      repairResults.push(...heuristicRepairs);
    }

    return repairResults;
  }

  // ─── Heuristic Fallback Methods ─────────────────────────────

  /**
   * Simple heuristic decomposition: create one subtask per required capability.
   */
  private decomposeHeuristic(mission: Mission): Subtask[] {
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
   * Simple topological ordering for execution planning.
   */
  private planHeuristic(subtasks: Subtask[]): ExecutionPlan {
    const executionOrder: string[][] = [];

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
   * Rule-based critique: check for failures and slow executions.
   */
  private critiqueHeuristic(results: ExecutionResult[]): CritiqueResult[] {
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
   * Simple re-execution repair strategy.
   */
  private async repairHeuristic(context: {
    critiques: CritiqueResult[];
    results: ExecutionResult[];
  }): Promise<RepairResult[]> {
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

  // ─── Internal helpers ───────────────────────────────────────

  /**
   * Find and execute a subtask using the most appropriate agent
   * from the registry. Uses findBestAgent for intelligent selection
   * with health + load awareness.
   */
  private async executeSubtask(subtask: Subtask): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.currentStepDispatchCount++;

    try {
      // Use findBestAgent for intelligent agent selection
      const bestAgent = this.registry.findBestAgent({
        clusterType: subtask.preferredCluster,
        capabilities: subtask.requiredCapabilities,
        priority: 'medium',
      });

      if (bestAgent) {
        const key = `${bestAgent.cluster}:${bestAgent.name}`;
        try {
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
          // If the best agent fails, fall back to other candidates
          this.logger.warn({
            step: 'executeSubtask',
            subtaskId: subtask.id,
            agentKey: key,
            msg: `Best agent failed, falling back to alternatives: ${error.message}`,
          });
        }
      }

      // Fallback: find any agent in the preferred cluster
      if (subtask.preferredCluster) {
        const clusterAgents = this.registry.getByCluster(subtask.preferredCluster);
        const availableAgent = clusterAgents.find(
          (a) => a.getStatus() !== 'running' as any,
        ) || clusterAgents[0];

        if (availableAgent) {
          const key = `${availableAgent.cluster}:${availableAgent.name}`;
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

      // Last resort: try any agent at all
      const allAgents = this.registry.getAll();
      if (allAgents.length > 0) {
        const agent = allAgents[0];
        const key = `${agent.cluster}:${agent.name}`;
        try {
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
        } catch (error: any) {
          return {
            subtaskId: subtask.id,
            success: false,
            error: `All agent attempts failed: ${error.message}`,
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
