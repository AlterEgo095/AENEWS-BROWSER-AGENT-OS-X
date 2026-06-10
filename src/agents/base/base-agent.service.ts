/**
 * AENEWS Agent OS X - Base Agent Service
 * Abstract base class that all 80+ agents extend.
 * Implements full lifecycle, event emission, memory integration,
 * health monitoring, retry logic, permission checking, timeout handling,
 * metrics collection, correlation ID tracking, tool management, and contextual logging.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentConfig,
  AgentStatus,
  AgentInput,
  AgentOutput,
  AgentMetrics,
  AgentState,
  AgentHealthState,
  AgentTool,
  AgentError,
  AgentErrorCode,
  TaskPriority,
} from '../interfaces/agent.interface';
import {
  LifecyclePhase,
  LifecycleContext,
  LifecycleHook,
  VALID_TRANSITIONS,
} from '../interfaces/agent-lifecycle.interface';
import {
  AgentEventType,
  AgentEvent,
  EventPriority,
  AgentStatusChangedPayload,
  AgentErrorPayload,
} from '../interfaces/agent-event.interface';
import {
  PermissionAction,
  PermissionResource,
} from '../interfaces/agent-permission.interface';
import { MemoryTier } from '../interfaces/agent-memory.interface';

@Injectable()
export abstract class BaseAgentService implements OnModuleInit, OnModuleDestroy {
  // ─── Logger ──────────────────────────────────────────────────────
  protected readonly logger: Logger;

  // ─── Agent State ─────────────────────────────────────────────────
  protected config: AgentConfig;
  protected status: AgentStatus = AgentStatus.IDLE;
  protected currentTasks: Set<string> = new Set();
  protected completedTaskCount: number = 0;
  protected failedTaskCount: number = 0;
  protected lastActivity: Date = new Date();
  protected startedAt: Date | null = null;
  protected correlationId: string = '';
  protected lifecyclePhase: LifecyclePhase | null = null;

  // ─── Tool Registry ───────────────────────────────────────────────
  protected readonly tools: Map<string, AgentTool> = new Map();

  // ─── Health State ────────────────────────────────────────────────
  protected healthState: AgentHealthState = {
    isHealthy: true,
    lastHealthCheck: new Date(),
    consecutiveFailures: 0,
    uptimeMs: 0,
  };

  // ─── Lifecycle Hooks ─────────────────────────────────────────────
  protected lifecycleHooks: Map<LifecyclePhase, LifecycleHook[]> = new Map();

  // ─── Timers ──────────────────────────────────────────────────────
  protected healthCheckInterval: NodeJS.Timer | null = null;
  protected metricsInterval: NodeJS.Timer | null = null;
  protected activeTimeouts: Map<string, NodeJS.Timeout> = new Map();

  // ─── Circuit Breaker ─────────────────────────────────────────────
  protected circuitBreaker = {
    state: 'closed' as 'open' | 'closed' | 'half_open',
    failureCount: 0,
    lastFailureTime: null as Date | null,
    successThreshold: 3,
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    halfOpenSuccesses: 0,
  };

  // ─── Constructor ─────────────────────────────────────────────────
  constructor(
    protected readonly eventBusService?: any,
    protected readonly memoryService?: any,
    protected readonly permissionEvaluator?: any,
  ) {
    this.config = this.defineConfig();
    this.logger = new Logger(`${this.config.name}Agent`);
    this.initializeLifecycleHooks();
  }

  // ─── Abstract Methods (Must Implement) ───────────────────────────

  /**
   * Define the agent's configuration.
   * Called during construction before any other initialization.
   */
  protected abstract defineConfig(): AgentConfig;

  /**
   * Called when the agent is initializing.
   * Set up connections, load data, etc.
   */
  protected abstract onInitialize(): Promise<void>;

  /**
   * Called when the agent needs to execute a task.
   * This is the main execution logic for the agent.
   */
  protected abstract onExecute(input: AgentInput): Promise<AgentOutput>;

  /**
   * Called when the agent is being destroyed.
   * Clean up resources, connections, etc.
   */
  protected abstract onDestroy(): Promise<void>;

  // ─── Optional Overrides ──────────────────────────────────────────

  /**
   * Called during health checks. Override to add custom health logic.
   */
  protected async onHealthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Called when the agent is paused. Override for custom pause behavior.
   */
  protected async onPause(): Promise<void> {}

  /**
   * Called when the agent is resumed. Override for custom resume behavior.
   */
  protected async onResume(): Promise<void> {}

  /**
   * Called before execution for custom validation.
   */
  protected async onValidateInput(input: AgentInput): Promise<boolean> {
    return !!input.taskId && !!input.payload;
  }

  /**
   * Called after a successful execution.
   */
  protected async onSuccess(input: AgentInput, output: AgentOutput): Promise<void> {}

  /**
   * Called after a failed execution.
   */
  protected async onFailure(input: AgentInput, error: Error): Promise<void> {}

  // ─── Lifecycle: Initialize ───────────────────────────────────────

  async onModuleInit(): Promise<void> {
    try {
      await this.transitionTo(AgentStatus.INITIALIZING);
      this.executeLifecyclePhase(LifecyclePhase.PRE_INITIALIZE);

      await this.onInitialize();

      this.executeLifecyclePhase(LifecyclePhase.POST_INITIALIZE);
      await this.transitionTo(AgentStatus.IDLE);

      this.startHealthMonitoring();
      this.startMetricsCollection();

      this.logger.log(`Agent initialized: ${this.config.id} (${this.config.cluster})`);
      this.emitEvent(AgentEventType.AGENT_INITIALIZED, {
        agentId: this.config.id,
        cluster: this.config.cluster,
        version: this.config.version,
      });
    } catch (error) {
      this.logger.error(`Agent initialization failed: ${(error as Error).message}`, (error as Error).stack);
      await this.transitionTo(AgentStatus.ERROR);
      this.emitEvent(AgentEventType.AGENT_ERROR, {
        errorCode: AgentErrorCode.INITIALIZATION_FAILED,
        errorMessage: (error as Error).message,
        recoverable: false,
      } as AgentErrorPayload);
      throw error;
    }
  }

  // ─── Lifecycle: Start ────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.status === AgentStatus.RUNNING) {
      throw new AgentError(
        'Agent is already running',
        AgentErrorCode.ALREADY_RUNNING,
        this.config.id,
      );
    }

    this.executeLifecyclePhase(LifecyclePhase.PRE_START);
    this.startedAt = new Date();
    await this.transitionTo(AgentStatus.RUNNING);
    this.executeLifecyclePhase(LifecyclePhase.POST_START);

    this.logger.log(`Agent started: ${this.config.id}`);
    this.emitEvent(AgentEventType.AGENT_STARTED, {
      agentId: this.config.id,
      cluster: this.config.cluster,
    });
  }

  // ─── Lifecycle: Execute ──────────────────────────────────────────

  async execute(input: AgentInput): Promise<AgentOutput> {
    // 1. Check status
    if (this.status !== AgentStatus.RUNNING && this.status !== AgentStatus.IDLE) {
      throw new AgentError(
        `Agent cannot execute in ${this.status} state`,
        AgentErrorCode.NOT_RUNNING,
        this.config.id,
        input.taskId,
      );
    }

    // 2. Check circuit breaker
    if (this.circuitBreaker.state === 'open') {
      throw new AgentError(
        'Circuit breaker is open; agent is not accepting tasks',
        AgentErrorCode.CIRCUIT_BREAKER_OPEN,
        this.config.id,
        input.taskId,
      );
    }

    // 3. Check max concurrent tasks
    if (this.currentTasks.size >= this.config.maxConcurrentTasks) {
      throw new AgentError(
        `Max concurrent tasks (${this.config.maxConcurrentTasks}) reached`,
        AgentErrorCode.MAX_CONCURRENT_TASKS,
        this.config.id,
        input.taskId,
      );
    }

    // 4. Check permissions
    await this.checkPermission(PermissionAction.EXECUTE, PermissionResource.TASK);

    // 5. Validate input
    const isValid = await this.onValidateInput(input);
    if (!isValid) {
      throw new AgentError(
        'Invalid input provided',
        AgentErrorCode.INVALID_INPUT,
        this.config.id,
        input.taskId,
      );
    }

    // 6. Set up execution context
    this.correlationId = input.context?.correlationId || uuidv4();
    this.currentTasks.add(input.taskId);
    this.lastActivity = new Date();

    // 7. Record start time
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    this.executeLifecyclePhase(LifecyclePhase.PRE_EXECUTE, { taskId: input.taskId });
    this.emitEvent(AgentEventType.TASK_STARTED, {
      taskId: input.taskId,
      agentId: this.config.id,
      priority: input.priority || TaskPriority.NORMAL,
    });

    try {
      // Auto-start if idle
      if (this.status === AgentStatus.IDLE) {
        await this.start();
      }

      // 8. Execute with retry logic (exponential backoff)
      let retryCount = 0;
      let lastError: Error | null = null;

      const output = await this.executeWithRetry<AgentOutput>(async () => {
        try {
          // Execute with timeout
          const result = await this.executeWithTimeout(input);
          return result;
        } catch (execError) {
          retryCount++;
          lastError = execError as Error;

          if (retryCount > this.config.retryPolicy.maxRetries) {
            throw execError;
          }

          const backoffMs = this.calculateBackoff(retryCount);
          this.logger.warn(
            `Task ${input.taskId} failed (attempt ${retryCount}/${this.config.retryPolicy.maxRetries}), ` +
            `retrying in ${backoffMs}ms: ${lastError.message}`,
          );
          await this.sleep(backoffMs);

          // Re-throw so executeWithRetry can handle it
          throw execError;
        }
      });

      // 9. Collect metrics and emit events on success
      this.currentTasks.delete(input.taskId);
      this.completedTaskCount++;
      this.lastActivity = new Date();

      this.recordCircuitBreakerSuccess();

      // Store result in memory
      await this.storeExecutionResult(input, output);

      // Lifecycle and event hooks
      this.executeLifecyclePhase(LifecyclePhase.POST_EXECUTE, { taskId: input.taskId });
      this.emitEvent(AgentEventType.TASK_COMPLETED, {
        taskId: input.taskId,
        agentId: this.config.id,
        success: true,
        executionTimeMs: Date.now() - startTime,
        result: output.result,
      });

      await this.onSuccess(input, output);

      // 10. Return output
      return output;
    } catch (error) {
      this.currentTasks.delete(input.taskId);
      this.failedTaskCount++;
      this.recordCircuitBreakerFailure();
      this.lastActivity = new Date();

      const agentError = error as AgentError;
      this.logger.error(
        `Task ${input.taskId} execution error: ${agentError.message}`,
        agentError.stack,
      );

      this.emitEvent(AgentEventType.AGENT_ERROR, {
        errorCode: agentError.code || AgentErrorCode.EXECUTION_FAILED,
        errorMessage: agentError.message,
        taskId: input.taskId,
        recoverable: true,
      } as AgentErrorPayload);

      this.emitEvent(AgentEventType.TASK_FAILED, {
        taskId: input.taskId,
        agentId: this.config.id,
        success: false,
        executionTimeMs: Date.now() - startTime,
        error: agentError.message,
      });

      await this.onFailure(input, agentError);

      // 10. Return output (with error info)
      return {
        taskId: input.taskId,
        success: false,
        result: null,
        error: agentError.message,
        metrics: this.collectMetrics(startTime, startMemory),
        timestamp: new Date(),
      };
    }
  }

  // ─── Lifecycle: Pause ────────────────────────────────────────────

  async pause(): Promise<void> {
    this.executeLifecyclePhase(LifecyclePhase.PRE_PAUSE);
    await this.onPause();
    await this.transitionTo(AgentStatus.PAUSED);
    this.executeLifecyclePhase(LifecyclePhase.POST_PAUSE);

    this.logger.log(`Agent paused: ${this.config.id}`);
    this.emitEvent(AgentEventType.AGENT_PAUSED, {
      previousStatus: AgentStatus.RUNNING,
      newStatus: AgentStatus.PAUSED,
      reason: 'Manual pause',
    } as AgentStatusChangedPayload);
  }

  // ─── Lifecycle: Resume ───────────────────────────────────────────

  async resume(): Promise<void> {
    this.executeLifecyclePhase(LifecyclePhase.PRE_RESUME);
    await this.onResume();
    await this.transitionTo(AgentStatus.RUNNING);
    this.executeLifecyclePhase(LifecyclePhase.POST_RESUME);

    this.logger.log(`Agent resumed: ${this.config.id}`);
    this.emitEvent(AgentEventType.AGENT_RESUMED, {
      previousStatus: AgentStatus.PAUSED,
      newStatus: AgentStatus.RUNNING,
      reason: 'Manual resume',
    } as AgentStatusChangedPayload);
  }

  // ─── Lifecycle: Stop ─────────────────────────────────────────────

  async stop(): Promise<void> {
    this.executeLifecyclePhase(LifecyclePhase.PRE_STOP);

    // Clear all active timeouts
    for (const [taskId, timeout] of this.activeTimeouts) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(taskId);
    }

    // Wait for current tasks to finish (with a grace period)
    const gracePeriodMs = 5000;
    const startTime = Date.now();
    while (this.currentTasks.size > 0 && Date.now() - startTime < gracePeriodMs) {
      await this.sleep(100);
    }

    // Force-clear remaining tasks
    if (this.currentTasks.size > 0) {
      this.logger.warn(
        `Force-stopping with ${this.currentTasks.size} active tasks`,
      );
      this.currentTasks.clear();
    }

    this.stopHealthMonitoring();
    this.stopMetricsCollection();

    await this.transitionTo(AgentStatus.STOPPED);
    this.executeLifecyclePhase(LifecyclePhase.POST_STOP);

    this.logger.log(`Agent stopped: ${this.config.id}`);
    this.emitEvent(AgentEventType.AGENT_STOPPED, {
      agentId: this.config.id,
      completedTasks: this.completedTaskCount,
      failedTasks: this.failedTaskCount,
    });
  }

  // ─── Lifecycle: Destroy ──────────────────────────────────────────

  async onModuleDestroy(): Promise<void> {
    this.executeLifecyclePhase(LifecyclePhase.PRE_DESTROY);

    if (this.status === AgentStatus.RUNNING || this.status === AgentStatus.PAUSED) {
      await this.stop();
    }

    await this.onDestroy();

    // Unregister all tools
    for (const [toolName] of this.tools) {
      this.tools.delete(toolName);
    }

    this.executeLifecyclePhase(LifecyclePhase.POST_DESTROY);

    this.logger.log(`Agent destroyed: ${this.config.id}`);
    this.emitEvent(AgentEventType.AGENT_DESTROYED, {
      agentId: this.config.id,
      cluster: this.config.cluster,
    });
  }

  // ─── Health Check ────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    return this.performHealthCheck();
  }

  // ─── State Management ────────────────────────────────────────────

  getState(): AgentState {
    return {
      config: { ...this.config },
      status: this.status,
      currentTasks: Array.from(this.currentTasks),
      completedTasks: this.completedTaskCount,
      failedTasks: this.failedTaskCount,
      lastActivity: this.lastActivity,
      health: { ...this.healthState },
    };
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  getHealthState(): AgentHealthState {
    return { ...this.healthState };
  }

  /**
   * Initialize the agent state object.
   * Called during construction to set up the initial state.
   */
  private initializeState(): AgentState {
    return {
      config: { ...this.config },
      status: AgentStatus.IDLE,
      currentTasks: [],
      completedTasks: 0,
      failedTasks: 0,
      lastActivity: new Date(),
      health: {
        isHealthy: true,
        lastHealthCheck: new Date(),
        consecutiveFailures: 0,
        uptimeMs: 0,
      },
    };
  }

  // ─── Tool Management ─────────────────────────────────────────────

  /**
   * Register a tool that this agent can use.
   */
  registerTool(tool: AgentTool): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn(`Tool "${tool.name}" is already registered, overwriting`);
    }
    this.tools.set(tool.name, tool);
    this.logger.log(`Registered tool: ${tool.name}`);
  }

  /**
   * Unregister a tool by name.
   */
  unregisterTool(name: string): boolean {
    const deleted = this.tools.delete(name);
    if (deleted) {
      this.logger.log(`Unregistered tool: ${name}`);
    } else {
      this.logger.warn(`Tool "${name}" not found for unregistration`);
    }
    return deleted;
  }

  /**
   * Get a registered tool by name.
   */
  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools.
   */
  getAllTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Execute a tool by name with the given arguments.
   */
  async executeTool(name: string, ...args: any[]): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new AgentError(
        `Tool "${name}" not found`,
        AgentErrorCode.EXECUTION_FAILED,
        this.config.id,
      );
    }
    return tool.execute(...args);
  }

  // ─── Permission Checking ─────────────────────────────────────────

  /**
   * Check if the agent has a specific permission.
   * Overloaded: supports both enum-based and string-based checks.
   */
  protected async checkPermission(
    action: PermissionAction | string,
    resource: PermissionResource | string,
  ): Promise<boolean> {
    const permissionString = `${action}:${resource}`;

    const hasPermission = this.config.permissions.includes(permissionString) ||
      this.config.permissions.includes('*');

    if (!hasPermission) {
      // Also check via the permission evaluator if available
      if (this.permissionEvaluator && typeof this.permissionEvaluator.hasPermission === 'function') {
        const evaluated = await this.permissionEvaluator.hasPermission(
          this.config.id,
          action as PermissionAction,
          resource as PermissionResource,
        );
        if (evaluated) return true;
      }

      throw new AgentError(
        `Permission denied: ${permissionString}`,
        AgentErrorCode.PERMISSION_DENIED,
        this.config.id,
      );
    }

    return true;
  }

  /**
   * Check permission by resource and action strings.
   * Returns boolean without throwing.
   */
  hasPermissionForResource(resource: string, action: string): boolean {
    return this.config.permissions.includes(`${action}:${resource}`) ||
      this.config.permissions.includes('*');
  }

  // ─── Timeout Handling ────────────────────────────────────────────

  /**
   * Execute agent task with a timeout.
   */
  protected async executeWithTimeout(input: AgentInput): Promise<AgentOutput> {
    const timeoutMs = input.context?.timeout || this.config.timeout;

    return new Promise<AgentOutput>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.activeTimeouts.delete(input.taskId);
        reject(
          new AgentError(
            `Task timed out after ${timeoutMs}ms`,
            AgentErrorCode.TIMEOUT,
            this.config.id,
            input.taskId,
          ),
        );
      }, timeoutMs);

      this.activeTimeouts.set(input.taskId, timeoutId);

      this.onExecute(input)
        .then((output) => {
          clearTimeout(timeoutId);
          this.activeTimeouts.delete(input.taskId);
          resolve(output);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          this.activeTimeouts.delete(input.taskId);
          reject(error);
        });
    });
  }

  /**
   * Generic timeout wrapper for any promise.
   * Rejects with AgentError if the promise does not resolve within the specified time.
   */
  protected withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new AgentError(
            `Operation timed out after ${ms}ms`,
            AgentErrorCode.TIMEOUT,
            this.config.id,
          ),
        );
      }, ms);

      promise
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  // ─── Retry Logic ─────────────────────────────────────────────────

  /**
   * Calculate exponential backoff delay for a given retry attempt.
   */
  protected calculateBackoff(retryCount: number): number {
    const { backoffMs, exponentialBackoff } = this.config.retryPolicy;
    if (exponentialBackoff) {
      return backoffMs * Math.pow(2, retryCount - 1) + Math.random() * 100;
    }
    return backoffMs;
  }

  /**
   * Execute a function with retry logic and exponential backoff.
   * Retries up to maxRetries times on failure.
   */
  protected async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    const { maxRetries, backoffMs, exponentialBackoff } = this.config.retryPolicy;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt >= maxRetries) {
          this.logger.error(
            `All ${maxRetries} retries exhausted: ${lastError.message}`,
          );
          throw new AgentError(
            `Retry exhausted after ${maxRetries} attempts: ${lastError.message}`,
            AgentErrorCode.RETRY_EXHAUSTED,
            this.config.id,
            undefined,
            lastError,
          );
        }

        const delay = exponentialBackoff
          ? backoffMs * Math.pow(2, attempt) + Math.random() * 100
          : backoffMs;

        this.logger.warn(
          `Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay)}ms: ${lastError.message}`,
        );

        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError!;
  }

  // ─── Metrics Collection ──────────────────────────────────────────

  protected collectMetrics(startTime: number, startMemory: number): AgentMetrics {
    const memoryUsed = process.memoryUsage();
    return {
      executionTimeMs: Date.now() - startTime,
      memoryUsedMb: Math.round(((memoryUsed.heapUsed - startMemory) / 1024 / 1024) * 100) / 100,
      cpuUsagePercent: Math.round((process.cpuUsage().user ?? 0) / 1000) / 100,
    };
  }

  // ─── Health Monitoring ───────────────────────────────────────────

  protected startHealthMonitoring(): void {
    const intervalMs = 30000; // Check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, intervalMs);
  }

  protected stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval as any);
      this.healthCheckInterval = null;
    }
  }

  protected async performHealthCheck(): Promise<boolean> {
    try {
      const customHealthy = await this.onHealthCheck();
      const isHealthy = customHealthy && this.status !== AgentStatus.ERROR;

      const previousHealth = this.healthState.isHealthy;
      this.healthState = {
        isHealthy,
        lastHealthCheck: new Date(),
        consecutiveFailures: isHealthy ? 0 : this.healthState.consecutiveFailures + 1,
        uptimeMs: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
      };

      if (!isHealthy && this.healthState.consecutiveFailures >= 3) {
        this.logger.warn(
          `Agent unhealthy: ${this.healthState.consecutiveFailures} consecutive failures`,
        );
        this.emitEvent(AgentEventType.AGENT_HEALTH_CHANGED, {
          isHealthy: false,
          previousHealth,
          consecutiveFailures: this.healthState.consecutiveFailures,
        });
      }

      return isHealthy;
    } catch (error) {
      this.healthState.consecutiveFailures++;
      this.healthState.isHealthy = false;
      this.healthState.lastHealthCheck = new Date();
      this.logger.error(`Health check failed: ${(error as Error).message}`);
      return false;
    }
  }

  // ─── Metrics Collection Timer ────────────────────────────────────

  protected startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.emitMetrics();
    }, 60000); // Every minute
  }

  protected stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval as any);
      this.metricsInterval = null;
    }
  }

  protected emitMetrics(): void {
    const state = this.getState();
    this.emitEvent(AgentEventType.AGENT_STATUS_CHANGED, {
      agentId: this.config.id,
      status: this.status,
      activeTasks: this.currentTasks.size,
      completedTasks: this.completedTaskCount,
      failedTasks: this.failedTaskCount,
      healthState: this.healthState,
    });
  }

  // ─── State Transitions ───────────────────────────────────────────

  protected async transitionTo(newStatus: AgentStatus): Promise<void> {
    const previousStatus = this.status;

    if (!this.isValidTransition(previousStatus, newStatus)) {
      this.logger.warn(
        `Invalid state transition: ${previousStatus} → ${newStatus}`,
      );
      // Allow some transitions for recovery scenarios
      if (newStatus !== AgentStatus.ERROR && newStatus !== AgentStatus.STOPPED) {
        throw new AgentError(
          `Invalid state transition: ${previousStatus} → ${newStatus}`,
          AgentErrorCode.EXECUTION_FAILED,
          this.config.id,
        );
      }
    }

    this.status = newStatus;
    this.lastActivity = new Date();

    this.emitEvent(AgentEventType.AGENT_STATUS_CHANGED, {
      previousStatus,
      newStatus,
      reason: `Transition from ${previousStatus} to ${newStatus}`,
    } as AgentStatusChangedPayload);

    this.logger.log(`State transition: ${previousStatus} → ${newStatus}`);
  }

  protected isValidTransition(from: AgentStatus, to: AgentStatus): boolean {
    const validTargets = VALID_TRANSITIONS[from];
    return validTargets ? validTargets.includes(to) : false;
  }

  // ─── Event Emission ──────────────────────────────────────────────

  /**
   * Emit an event through the event bus.
   * Supports both typed AgentEventType and arbitrary string event types.
   */
  protected emitEvent<T>(type: AgentEventType | string, payload: T): void {
    if (this.eventBusService && typeof this.eventBusService.publish === 'function') {
      const event: Omit<AgentEvent<T>, 'id' | 'timestamp' | 'version'> = {
        type: type as AgentEventType,
        sourceAgentId: this.config.id,
        cluster: this.config.cluster,
        payload,
        priority: EventPriority.NORMAL,
        correlationId: this.correlationId,
        metadata: {
          agentVersion: this.config.version,
          agentCluster: this.config.cluster,
        },
      };

      this.eventBusService.publish(event).catch((error: Error) => {
        this.logger.error(
          `Failed to emit event ${type}: ${error.message}`,
        );
      });
    }
  }

  // ─── Memory Integration ──────────────────────────────────────────

  protected async storeInWorkingMemory<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    if (this.memoryService) {
      await (this.memoryService as any).store(this.config.id, key, value, MemoryTier.WORKING, { ttlMs });
    }
  }

  protected async retrieveFromWorkingMemory<T>(key: string): Promise<T | null> {
    if (this.memoryService) {
      const entry = await (this.memoryService as any).retrieve(this.config.id, key, MemoryTier.WORKING);
      return entry?.value ?? null;
    }
    return null;
  }

  protected async storeInSessionMemory<T>(
    key: string,
    value: T,
    sessionId?: string,
    ttlMs?: number,
  ): Promise<void> {
    if (this.memoryService) {
      await (this.memoryService as any).store(this.config.id, key, value, MemoryTier.SESSION, {
        sessionId,
        ttlMs,
      });
    }
  }

  protected async retrieveFromSessionMemory<T>(key: string): Promise<T | null> {
    if (this.memoryService) {
      const entry = await (this.memoryService as any).retrieve(this.config.id, key, MemoryTier.SESSION);
      return entry?.value ?? null;
    }
    return null;
  }

  protected async storeInLongTermMemory<T>(key: string, value: T): Promise<void> {
    if (this.memoryService) {
      await (this.memoryService as any).store(this.config.id, key, value, MemoryTier.LONG_TERM);
    }
  }

  protected async retrieveFromLongTermMemory<T>(key: string): Promise<T | null> {
    if (this.memoryService) {
      const entry = await (this.memoryService as any).retrieve(this.config.id, key, MemoryTier.LONG_TERM);
      return entry?.value ?? null;
    }
    return null;
  }

  protected async queryMemory(query: any): Promise<any> {
    if (this.memoryService && typeof this.memoryService.query === 'function') {
      return this.memoryService.query(query);
    }
    return { entries: [], total: 0, hasMore: false };
  }

  // ─── Execution Result Storage ────────────────────────────────────

  protected async storeExecutionResult(
    input: AgentInput,
    output: AgentOutput,
  ): Promise<void> {
    try {
      // Store in working memory for quick access
      await this.storeInWorkingMemory(
        `task:${input.taskId}:result`,
        output,
        300000, // 5 minutes TTL
      );

      // Store successful results in long-term memory
      if (output.success) {
        await this.storeInLongTermMemory(
          `task:${input.taskId}:completed`,
          {
            input: input.payload,
            result: output.result,
            metrics: output.metrics,
            timestamp: output.timestamp,
          },
        );
      }

      // Store in session memory if session context exists
      if (input.context?.sessionId) {
        await this.storeInSessionMemory(
          `task:${input.taskId}:result`,
          output,
          input.context.sessionId,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to store execution result for task ${input.taskId}: ${(error as Error).message}`,
      );
    }
  }

  // ─── Circuit Breaker ─────────────────────────────────────────────

  protected recordCircuitBreakerSuccess(): void {
    if (this.circuitBreaker.state === 'half_open') {
      this.circuitBreaker.halfOpenSuccesses++;
      if (this.circuitBreaker.halfOpenSuccesses >= this.circuitBreaker.successThreshold) {
        this.circuitBreaker.state = 'closed';
        this.circuitBreaker.failureCount = 0;
        this.circuitBreaker.halfOpenSuccesses = 0;
        this.logger.log('Circuit breaker closed');
        this.emitEvent(AgentEventType.CIRCUIT_BREAKER_CLOSED, {
          agentId: this.config.id,
          state: 'closed',
          failureCount: 0,
          lastFailureTime: this.circuitBreaker.lastFailureTime || new Date(),
        });
      }
    } else if (this.circuitBreaker.state === 'closed') {
      this.circuitBreaker.failureCount = 0;
    }
  }

  protected recordCircuitBreakerFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = new Date();

    if (this.circuitBreaker.state === 'half_open') {
      this.circuitBreaker.state = 'open';
      this.logger.warn('Circuit breaker opened (failure during half-open)');
    } else if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
      this.circuitBreaker.state = 'open';
      this.logger.error(
        `Circuit breaker opened after ${this.circuitBreaker.failureCount} failures`,
      );
      this.emitEvent(AgentEventType.CIRCUIT_BREAKER_OPENED, {
        agentId: this.config.id,
        state: 'open',
        failureCount: this.circuitBreaker.failureCount,
        lastFailureTime: this.circuitBreaker.lastFailureTime,
      });

      // Schedule transition to half-open
      setTimeout(() => {
        if (this.circuitBreaker.state === 'open') {
          this.circuitBreaker.state = 'half_open';
          this.circuitBreaker.halfOpenSuccesses = 0;
          this.logger.log('Circuit breaker transitioned to half-open');
        }
      }, this.circuitBreaker.resetTimeoutMs);
    }
  }

  // ─── Lifecycle Hook Management ───────────────────────────────────

  protected initializeLifecycleHooks(): void {
    const phases = Object.values(LifecyclePhase);
    for (const phase of phases) {
      this.lifecycleHooks.set(phase, []);
    }
  }

  registerLifecycleHook(phase: LifecyclePhase, hook: LifecycleHook): void {
    const hooks = this.lifecycleHooks.get(phase) || [];
    hooks.push(hook);
    this.lifecycleHooks.set(phase, hooks);
  }

  removeLifecycleHook(phase: LifecyclePhase, hook: LifecycleHook): void {
    const hooks = this.lifecycleHooks.get(phase) || [];
    const index = hooks.indexOf(hook);
    if (index >= 0) {
      hooks.splice(index, 1);
    }
  }

  protected async executeLifecyclePhase(
    phase: LifecyclePhase,
    extraContext?: Record<string, any>,
  ): Promise<void> {
    this.lifecyclePhase = phase;
    const hooks = this.lifecycleHooks.get(phase) || [];

    const context: LifecycleContext = {
      agentId: this.config.id,
      phase,
      previousStatus: this.status,
      newStatus: this.status,
      timestamp: new Date(),
      correlationId: this.correlationId,
      ...extraContext,
    };

    for (const hook of hooks) {
      try {
        const result = await hook(context);
        if (!result.shouldProceed) {
          this.logger.warn(
            `Lifecycle hook for ${phase} blocked execution: ${result.error?.message || 'No reason provided'}`,
          );
          break;
        }
      } catch (error) {
        this.logger.error(
          `Lifecycle hook error for ${phase}: ${(error as Error).message}`,
        );
      }
    }
  }

  // ─── Correlation ID ──────────────────────────────────────────────

  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  getCorrelationId(): string {
    return this.correlationId;
  }

  // ─── Utility ─────────────────────────────────────────────────────

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected generateId(): string {
    return uuidv4();
  }

  protected createAgentOutput(
    taskId: string,
    success: boolean,
    result: any,
    error?: string,
    startTime?: number,
  ): AgentOutput {
    return {
      taskId,
      success,
      result,
      error,
      metrics: startTime
        ? this.collectMetrics(startTime, process.memoryUsage().heapUsed)
        : { executionTimeMs: 0, memoryUsedMb: 0, cpuUsagePercent: 0 },
      timestamp: new Date(),
    };
  }

  // ─── Capability Check ────────────────────────────────────────────

  hasCapability(capabilityName: string): boolean {
    return this.config.capabilities.some((cap) => cap.name === capabilityName);
  }

  getCapabilities(): string[] {
    return this.config.capabilities.map((cap) => cap.name);
  }

  // ─── Task Management ─────────────────────────────────────────────

  getCurrentTaskCount(): number {
    return this.currentTasks.size;
  }

  canAcceptTask(): boolean {
    return (
      this.status === AgentStatus.RUNNING ||
      this.status === AgentStatus.IDLE
    ) && this.currentTasks.size < this.config.maxConcurrentTasks &&
      this.circuitBreaker.state !== 'open';
  }

  // ─── Maintenance Mode ────────────────────────────────────────────

  async enterMaintenance(): Promise<void> {
    await this.transitionTo(AgentStatus.MAINTENANCE);
    this.logger.log(`Agent entered maintenance mode: ${this.config.id}`);
  }

  async exitMaintenance(): Promise<void> {
    await this.transitionTo(AgentStatus.IDLE);
    this.logger.log(`Agent exited maintenance mode: ${this.config.id}`);
  }
}
