/**
 * AENEWS Agent OS X - Task Decomposer Service
 * Decomposes complex tasks into smaller, manageable subtasks
 * that can be distributed across agents.
 * Supports recursive decomposition, dependency identification,
 * and execution order determination (parallel vs sequential).
 */

import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentInput,
  AgentCluster,
  TaskPriority,
  TaskDefinition,
  TaskStatus,
} from '../interfaces/agent.interface';
import { MemoryService } from '../memory/memory.service';
import { AgentConnectorBridge } from '../bridge';

// ─── Decomposition Strategy ───────────────────────────────────────
export enum DecompositionStrategy {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  HYBRID = 'hybrid',
  CONDITIONAL = 'conditional',
}

// ─── Subtask Template ─────────────────────────────────────────────
export interface SubtaskTemplate {
  id: string;
  description: string;
  cluster?: AgentCluster;
  capability?: string;
  priority: TaskPriority;
  payload: any;
  dependencies?: string[];
  estimatedDurationMs?: number;
}

// ─── Decomposition Result ─────────────────────────────────────────
export interface DecompositionResult {
  taskId: string;
  subtasks: TaskDefinition[];
  strategy: DecompositionStrategy;
  estimatedDurationMs: number;
  complexity: TaskComplexity;
}

// ─── Task Complexity ──────────────────────────────────────────────
export enum TaskComplexity {
  TRIVIAL = 'trivial',
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  HIGHLY_COMPLEX = 'highly_complex',
}

// ─── Decomposition Config ─────────────────────────────────────────
export interface DecompositionConfig {
  maxRecursionDepth: number;
  maxSubtasksPerLevel: number;
  minSubtaskComplexity: TaskComplexity;
  enableRecursiveDecomposition: boolean;
  enableHistoricalLookup: boolean;
}

const DEFAULT_DECOMPOSITION_CONFIG: DecompositionConfig = {
  maxRecursionDepth: 3,
  maxSubtasksPerLevel: 20,
  minSubtaskComplexity: TaskComplexity.MODERATE,
  enableRecursiveDecomposition: true,
  enableHistoricalLookup: true,
};

@Injectable()
export class TaskDecomposerService {
  private readonly logger = new Logger(TaskDecomposerService.name);
  private readonly config: DecompositionConfig = { ...DEFAULT_DECOMPOSITION_CONFIG };

  constructor(
    private readonly memoryService: MemoryService,
    @Optional() @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {}

  /**
   * Decompose a task into subtasks based on the input payload.
   * Supports recursive decomposition for complex tasks.
   */
  async decompose(input: AgentInput): Promise<TaskDefinition[]> {
    const startTime = Date.now();
    this.logger.log(`Decomposing task ${input.taskId}`);

    try {
      // Try LLM decomposition first when bridge is available
      let subtasks: TaskDefinition[] | null = null;

      if (this.bridge) {
        try {
          subtasks = await this.llmDecompose(input);
          if (subtasks && subtasks.length > 0) {
            this.logger.log(`LLM decomposition succeeded for task ${input.taskId}`);
          }
        } catch (error) {
          this.logger.warn(
            `LLM decomposition failed for task ${input.taskId}, falling back to rule-based: ${(error as Error).message}`,
          );
          subtasks = null;
        }
      }

      // Fall back to rule-based decomposition if LLM didn't produce results
      if (!subtasks || subtasks.length === 0) {
        if (this.config.enableHistoricalLookup) {
          const historicalDecomposition = await this.findHistoricalDecomposition(input);

          if (historicalDecomposition) {
            this.logger.log(`Found historical decomposition for task similar to ${input.taskId}`);
            subtasks = this.adaptHistoricalDecomposition(input, historicalDecomposition);
          } else {
            // Analyze the task and create decomposition
            const complexity = this.assessComplexity(input);
            const strategy = this.selectStrategy(complexity, input);
            subtasks = this.performDecomposition(input, strategy, complexity);
          }
        } else {
          const complexity = this.assessComplexity(input);
          const strategy = this.selectStrategy(complexity, input);
          subtasks = this.performDecomposition(input, strategy, complexity);
        }
      }

      // Apply recursive decomposition if enabled and subtasks are still complex
      if (this.config.enableRecursiveDecomposition) {
        subtasks = await this.recursiveDecompose(subtasks, 1);
      }

      // Enrich subtasks with metadata
      const enrichedSubtasks = subtasks.map((subtask) => ({
        ...subtask,
        parentId: input.taskId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Limit subtasks per level
      const limitedSubtasks = enrichedSubtasks.slice(0, this.config.maxSubtasksPerLevel);

      // Store the decomposition for future reference
      await this.storeDecomposition(input, limitedSubtasks);

      this.logger.log(
        `Decomposed task ${input.taskId} into ${limitedSubtasks.length} subtasks ` +
          `in ${Date.now() - startTime}ms`,
      );

      return limitedSubtasks;
    } catch (error) {
      this.logger.error(`Failed to decompose task ${input.taskId}: ${(error as Error).message}`);
      // Return single subtask as fallback
      return [this.createSingleSubtask(input)];
    }
  }

  /**
   * Decompose a single subtask further (for recursive decomposition).
   */
  async decomposeSubtask(subtask: TaskDefinition, depth: number = 1): Promise<TaskDefinition[]> {
    if (depth > this.config.maxRecursionDepth) {
      return [subtask];
    }

    const input: AgentInput = {
      taskId: subtask.id,
      payload: subtask.input.payload,
      context: subtask.input.context,
      parentTaskId: subtask.parentId,
      priority: subtask.priority,
    };

    const complexity = this.assessComplexity(input);

    // Only decompose if the subtask is complex enough
    if (
      this.getComplexityScore(complexity) <
      this.getComplexityScore(this.config.minSubtaskComplexity)
    ) {
      return [subtask];
    }

    const strategy = this.selectStrategy(complexity, input);
    const childSubtasks = this.performDecomposition(input, strategy, complexity);

    // Mark as having subtasks
    const enriched = childSubtasks.map((child, index) => ({
      ...child,
      parentId: subtask.id,
      metadata: {
        ...child.metadata,
        recursionDepth: depth,
        siblingIndex: index,
      },
    }));

    return enriched;
  }

  /**
   * Assess the complexity of a task.
   */
  assessComplexity(input: AgentInput): TaskComplexity {
    const payloadStr = JSON.stringify(input.payload);
    const payloadSize = payloadStr.length;
    const hasMultipleSteps = input.context?.steps && Array.isArray(input.context.steps);
    const stepCount = hasMultipleSteps ? (input.context?.steps as any[])?.length || 0 : 0;
    const hasDependencies = input.context?.dependencies?.length > 0;
    const requiresMultipleClusters = input.context?.clusters?.length > 1;

    let score = 0;

    // Size-based scoring
    if (payloadSize > 10000) score += 2;
    else if (payloadSize > 1000) score += 1;

    // Step-based scoring
    if (stepCount > 5) score += 3;
    else if (stepCount > 2) score += 2;
    else if (stepCount > 0) score += 1;

    // Dependency-based scoring
    if (hasDependencies) score += 2;

    // Multi-cluster scoring
    if (requiresMultipleClusters) score += 2;

    // Context complexity
    if (input.context?.requiresValidation) score += 1;
    if (input.context?.requiresRepair) score += 1;

    if (score >= 8) return TaskComplexity.HIGHLY_COMPLEX;
    if (score >= 6) return TaskComplexity.COMPLEX;
    if (score >= 4) return TaskComplexity.MODERATE;
    if (score >= 2) return TaskComplexity.SIMPLE;
    return TaskComplexity.TRIVIAL;
  }

  /**
   * Select the best decomposition strategy for a task.
   */
  selectStrategy(complexity: TaskComplexity, input: AgentInput): DecompositionStrategy {
    const hasDependencies = input.context?.dependencies?.length > 0;
    const hasConditionalLogic = input.context?.conditions?.length > 0;

    if (hasConditionalLogic) {
      return DecompositionStrategy.CONDITIONAL;
    }

    if (hasDependencies) {
      return DecompositionStrategy.HYBRID;
    }

    switch (complexity) {
      case TaskComplexity.TRIVIAL:
      case TaskComplexity.SIMPLE:
        return DecompositionStrategy.SEQUENTIAL;
      case TaskComplexity.MODERATE:
        return DecompositionStrategy.PARALLEL;
      case TaskComplexity.COMPLEX:
      case TaskComplexity.HIGHLY_COMPLEX:
        return DecompositionStrategy.HYBRID;
      default:
        return DecompositionStrategy.SEQUENTIAL;
    }
  }

  /**
   * Identify dependencies between subtasks.
   */
  identifyDependencies(subtasks: TaskDefinition[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    for (const subtask of subtasks) {
      const deps: string[] = [];

      // Explicit dependencies from metadata
      const explicitDeps = subtask.metadata?.dependencies as string[] | undefined;
      if (explicitDeps && Array.isArray(explicitDeps)) {
        deps.push(...explicitDeps);
      }

      // Data flow dependencies (if a subtask's input references another's output)
      for (const other of subtasks) {
        if (other.id === subtask.id) continue;
        if (this.hasDataDependency(subtask, other)) {
          deps.push(other.id);
        }
      }

      dependencies.set(subtask.id, deps);
    }

    return dependencies;
  }

  /**
   * Determine execution order (groups of subtasks that can run in parallel).
   */
  determineExecutionOrder(
    subtasks: TaskDefinition[],
    dependencies: Map<string, string[]>,
  ): string[][] {
    const order: string[][] = [];
    const completed = new Set<string>();
    const remaining = new Set(subtasks.map((s) => s.id));

    while (remaining.size > 0) {
      // Find tasks with no unresolved dependencies
      const ready: string[] = [];

      for (const taskId of remaining) {
        const deps = dependencies.get(taskId) || [];
        if (deps.every((dep) => completed.has(dep))) {
          ready.push(taskId);
        }
      }

      if (ready.length === 0) {
        // Break circular dependencies by force-adding remaining tasks
        this.logger.warn('Circular dependency detected, force-resolving');
        order.push(Array.from(remaining));
        break;
      }

      order.push(ready);

      for (const taskId of ready) {
        completed.add(taskId);
        remaining.delete(taskId);
      }
    }

    return order;
  }

  /**
   * LLM-powered decomposition: uses the AgentConnectorBridge to intelligently
   * decompose tasks via an LLM call. Falls back gracefully on any error.
   */
  async llmDecompose(input: AgentInput): Promise<TaskDefinition[]> {
    if (!this.bridge) {
      return [];
    }

    const userPrompt = JSON.stringify({
      taskId: input.taskId,
      payload: input.payload,
      context: input.context,
      priority: input.priority,
      parentTaskId: input.parentTaskId,
    });

    const result = await this.bridge.callLLM({
      systemPrompt:
        'You are an expert task decomposer for an AI agent platform. Break down the mission into atomic subtasks. ' +
        'Available clusters: browser, computer, coding, office, marketing, business, infrastructure, security, meta_intelligence. ' +
        'Available capabilities: dev.*, browser.*, office.*, business.*, cert.*, delivery.*. ' +
        'Output JSON: {subtasks: [{id, description, cluster, capability, parameters, dependencies[], priority}], executionGroups: [[subtask ids that can run in parallel]]}',
      userPrompt,
      temperature: 0.3,
      maxTokens: 4096,
    });

    const parsed = JSON.parse(result.content);
    const rawSubtasks = parsed.subtasks || [];

    return rawSubtasks.map((raw: any, index: number) => ({
      id: raw.id || uuidv4(),
      parentId: input.taskId,
      cluster: raw.cluster as AgentCluster | undefined,
      status: TaskStatus.PENDING,
      priority: raw.priority || input.priority || TaskPriority.NORMAL,
      input: {
        taskId: raw.id || uuidv4(),
        payload: raw.parameters || { description: raw.description },
        context: {
          ...input.context,
          stepIndex: index,
          stepDescription: raw.description,
        },
        parentTaskId: input.taskId,
        priority: raw.priority || input.priority || TaskPriority.NORMAL,
      },
      subtasks: [],
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
      correlationId: input.context?.correlationId || uuidv4(),
      metadata: {
        stepIndex: index,
        stepDescription: raw.description,
        dependencies: raw.dependencies || [],
        capability: raw.capability,
        llmGenerated: true,
      },
    }));
  }

  // ─── Private Methods ─────────────────────────────────────────────

  /**
   * Recursively decompose subtasks that are still complex.
   */
  private async recursiveDecompose(
    subtasks: TaskDefinition[],
    depth: number,
  ): Promise<TaskDefinition[]> {
    if (depth > this.config.maxRecursionDepth) {
      return subtasks;
    }

    const result: TaskDefinition[] = [];

    for (const subtask of subtasks) {
      const complexity = this.assessComplexity(subtask.input);

      if (
        this.getComplexityScore(complexity) >=
        this.getComplexityScore(this.config.minSubtaskComplexity)
      ) {
        const childSubtasks = await this.decomposeSubtask(subtask, depth);
        result.push(...childSubtasks);
      } else {
        result.push(subtask);
      }
    }

    return result;
  }

  private getComplexityScore(complexity: TaskComplexity): number {
    switch (complexity) {
      case TaskComplexity.TRIVIAL:
        return 0;
      case TaskComplexity.SIMPLE:
        return 1;
      case TaskComplexity.MODERATE:
        return 2;
      case TaskComplexity.COMPLEX:
        return 3;
      case TaskComplexity.HIGHLY_COMPLEX:
        return 4;
      default:
        return 0;
    }
  }

  private performDecomposition(
    input: AgentInput,
    strategy: DecompositionStrategy,
    complexity: TaskComplexity,
  ): TaskDefinition[] {
    const subtasks: TaskDefinition[] = [];
    const payload = input.payload;

    // Check if the payload has explicit steps
    if (payload.steps && Array.isArray(payload.steps)) {
      for (let i = 0; i < payload.steps.length; i++) {
        const step = payload.steps[i];
        subtasks.push(this.createSubtaskFromStep(input, step, i));
      }
    } else if (payload.operations && Array.isArray(payload.operations)) {
      for (let i = 0; i < payload.operations.length; i++) {
        const op = payload.operations[i];
        subtasks.push(this.createSubtaskFromOperation(input, op, i));
      }
    } else if (payload.tasks && Array.isArray(payload.tasks)) {
      for (let i = 0; i < payload.tasks.length; i++) {
        const task = payload.tasks[i];
        subtasks.push(this.createSubtaskFromStep(input, task, i));
      }
    } else if (complexity === TaskComplexity.TRIVIAL || complexity === TaskComplexity.SIMPLE) {
      // Single subtask for simple tasks
      subtasks.push(this.createSingleSubtask(input));
    } else {
      // Analyze and decompose complex payloads
      subtasks.push(...this.analyzeAndDecompose(input, strategy));
    }

    // Ensure we have at least one subtask
    if (subtasks.length === 0) {
      subtasks.push(this.createSingleSubtask(input));
    }

    return subtasks;
  }

  private createSubtaskFromStep(parentInput: AgentInput, step: any, index: number): TaskDefinition {
    return {
      id: uuidv4(),
      parentId: parentInput.taskId,
      agentId: step.agentId,
      cluster: step.cluster,
      status: TaskStatus.PENDING,
      priority: step.priority || parentInput.priority || TaskPriority.NORMAL,
      input: {
        taskId: uuidv4(),
        payload: step.payload || step,
        context: {
          ...parentInput.context,
          stepIndex: index,
          stepDescription: step.description || `Step ${index + 1}`,
        },
        parentTaskId: parentInput.taskId,
        priority: step.priority || parentInput.priority || TaskPriority.NORMAL,
      },
      subtasks: [],
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
      correlationId: parentInput.context?.correlationId || uuidv4(),
      metadata: {
        stepIndex: index,
        stepDescription: step.description || `Step ${index + 1}`,
        dependencies: step.dependencies || [],
      },
    };
  }

  private createSubtaskFromOperation(
    parentInput: AgentInput,
    operation: any,
    index: number,
  ): TaskDefinition {
    return {
      id: uuidv4(),
      parentId: parentInput.taskId,
      agentId: operation.agentId,
      cluster: operation.cluster,
      status: TaskStatus.PENDING,
      priority: operation.priority || parentInput.priority || TaskPriority.NORMAL,
      input: {
        taskId: uuidv4(),
        payload: operation,
        context: {
          ...parentInput.context,
          operationIndex: index,
          operationType: operation.type || 'unknown',
        },
        parentTaskId: parentInput.taskId,
        priority: operation.priority || parentInput.priority || TaskPriority.NORMAL,
      },
      subtasks: [],
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
      correlationId: parentInput.context?.correlationId || uuidv4(),
      metadata: {
        operationIndex: index,
        operationType: operation.type || 'unknown',
      },
    };
  }

  private createSingleSubtask(input: AgentInput): TaskDefinition {
    return {
      id: uuidv4(),
      parentId: input.parentTaskId,
      status: TaskStatus.PENDING,
      priority: input.priority || TaskPriority.NORMAL,
      input: {
        ...input,
        taskId: input.taskId,
      },
      subtasks: [],
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
      correlationId: input.context?.correlationId || uuidv4(),
      metadata: {
        isSingleSubtask: true,
      },
    };
  }

  private analyzeAndDecompose(
    input: AgentInput,
    strategy: DecompositionStrategy,
  ): TaskDefinition[] {
    const subtasks: TaskDefinition[] = [];
    const payload = input.payload;

    // Identify logical components in the payload
    const components = this.identifyComponents(payload);

    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      subtasks.push({
        id: uuidv4(),
        parentId: input.taskId,
        cluster: component.cluster,
        status: TaskStatus.PENDING,
        priority: component.priority || input.priority || TaskPriority.NORMAL,
        input: {
          taskId: uuidv4(),
          payload: component.payload,
          context: {
            ...input.context,
            componentIndex: i,
            componentName: component.name,
          },
          parentTaskId: input.taskId,
          priority: component.priority || input.priority || TaskPriority.NORMAL,
        },
        subtasks: [],
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        correlationId: input.context?.correlationId || uuidv4(),
        metadata: {
          componentName: component.name,
          dependencies: component.dependencies || [],
          strategy,
        },
      });
    }

    return subtasks;
  }

  private identifyComponents(payload: any): Array<{
    name: string;
    payload: any;
    cluster?: AgentCluster;
    priority?: TaskPriority;
    dependencies?: string[];
  }> {
    const components: Array<{
      name: string;
      payload: any;
      cluster?: AgentCluster;
      priority?: TaskPriority;
      dependencies?: string[];
    }> = [];

    if (typeof payload !== 'object' || payload === null) {
      components.push({ name: 'main', payload });
      return components;
    }

    // Split payload into logical components based on keys
    const keys = Object.keys(payload);

    if (keys.length <= 1) {
      components.push({ name: 'main', payload });
      return components;
    }

    // Group related keys
    const groups = this.groupRelatedKeys(keys, payload);

    for (const group of groups) {
      const groupPayload: Record<string, any> = {};
      for (const key of group.keys) {
        groupPayload[key] = payload[key];
      }
      components.push({
        name: group.name,
        payload: groupPayload,
        cluster: this.inferCluster(group.keys),
        dependencies: group.dependencies,
      });
    }

    return components;
  }

  private groupRelatedKeys(
    keys: string[],
    payload: any,
  ): Array<{ name: string; keys: string[]; dependencies?: string[] }> {
    const browserKeys = keys.filter((k) =>
      /url|page|browser|navigate|click|type|screenshot/i.test(k),
    );
    const dataKeys = keys.filter((k) => /data|result|output|content|text|value/i.test(k));
    const configKeys = keys.filter((k) => /config|option|setting|param|option/i.test(k));
    const otherKeys = keys.filter(
      (k) => !browserKeys.includes(k) && !dataKeys.includes(k) && !configKeys.includes(k),
    );

    const groups: Array<{ name: string; keys: string[]; dependencies?: string[] }> = [];

    if (browserKeys.length > 0) {
      groups.push({
        name: 'browser_operations',
        keys: browserKeys,
        dependencies: [],
      });
    }

    if (dataKeys.length > 0) {
      groups.push({
        name: 'data_processing',
        keys: dataKeys,
        dependencies: browserKeys.length > 0 ? ['browser_operations'] : [],
      });
    }

    if (configKeys.length > 0) {
      groups.push({
        name: 'configuration',
        keys: configKeys,
        dependencies: [],
      });
    }

    if (otherKeys.length > 0) {
      groups.push({
        name: 'other_operations',
        keys: otherKeys,
        dependencies: dataKeys.length > 0 ? ['data_processing'] : [],
      });
    }

    return groups;
  }

  private inferCluster(keys: string[]): AgentCluster | undefined {
    const keyStr = keys.join(' ').toLowerCase();

    if (/url|page|browser|navigate|click|type|screenshot/.test(keyStr)) {
      return AgentCluster.BROWSER;
    }
    if (/file|directory|read|write|path/.test(keyStr)) {
      return AgentCluster.COMPUTER;
    }
    if (/code|compile|test|deploy/.test(keyStr)) {
      return AgentCluster.CODING;
    }
    if (/email|document|spreadsheet|presentation/.test(keyStr)) {
      return AgentCluster.OFFICE;
    }
    if (/campaign|social|content|seo/.test(keyStr)) {
      return AgentCluster.MARKETING;
    }

    return undefined;
  }

  /**
   * Check if subtask A has a data dependency on subtask B.
   */
  private hasDataDependency(subtaskA: TaskDefinition, subtaskB: TaskDefinition): boolean {
    const payloadA = JSON.stringify(subtaskA.input.payload);
    const taskIdB = subtaskB.id;

    // Check if subtask A references subtask B's ID in its payload
    if (payloadA.includes(taskIdB)) {
      return true;
    }

    // Check if subtask A explicitly depends on subtask B's output
    const requiresOutput = subtaskA.input.context?.requiresOutputFrom as string[] | undefined;
    if (requiresOutput && requiresOutput.includes(subtaskB.id)) {
      return true;
    }

    return false;
  }

  private async findHistoricalDecomposition(input: AgentInput): Promise<TaskDefinition[] | null> {
    try {
      const payloadHash = this.hashPayload(input.payload);
      const result = await this.memoryService.retrieve(
        'task-decomposer',
        `decomposition:${payloadHash}`,
        'long_term' as any,
      );
      return (result?.value as any)?.subtasks ?? null;
    } catch {
      return null;
    }
  }

  private adaptHistoricalDecomposition(
    input: AgentInput,
    historical: TaskDefinition[],
  ): TaskDefinition[] {
    return historical.map((subtask) => ({
      ...subtask,
      id: uuidv4(),
      parentId: input.taskId,
      status: TaskStatus.PENDING,
      input: {
        ...subtask.input,
        taskId: uuidv4(),
        parentTaskId: input.taskId,
        context: { ...input.context, ...subtask.input.context },
      },
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      correlationId: input.context?.correlationId || uuidv4(),
    }));
  }

  private async storeDecomposition(input: AgentInput, subtasks: TaskDefinition[]): Promise<void> {
    try {
      const payloadHash = this.hashPayload(input.payload);
      await this.memoryService.store(
        'task-decomposer',
        `decomposition:${payloadHash}`,
        { subtasks, inputPayload: input.payload },
        'long_term' as any,
        { tags: ['decomposition', 'historical'] },
      );
    } catch {
      // Non-critical, ignore storage failures
    }
  }

  private hashPayload(payload: any): string {
    const str = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}
