import { Injectable, Logger, Optional } from '@nestjs/common';
import { AgentRegistryService } from '../../agent/registry/agent-registry.service';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import { ClusterType } from '../../agent/entities/agent.entity';
import { LLMService } from '../../llm/llm.service';

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
 *
 * When LLM is available, the orchestrator uses it for intelligent
 * decomposition, planning, critiquing, and repair. When LLM is
 * unavailable, it falls back to heuristic methods.
 */
@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);
  private readonly pipelineStates = new Map<string, PipelineState>();

  constructor(
    private readonly registry: AgentRegistryService,
    private readonly eventBus: AgentEventBusService,
    private readonly memory: AgentMemoryService,
    @Optional() private readonly llmService: LLMService,
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
