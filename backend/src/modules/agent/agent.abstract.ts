import { Logger } from '@nestjs/common';
import { ClusterType, AgentStatus } from './entities/agent.entity';
import { LLMService } from '../llm/llm.service';
import {
  AgentBridgeService,
} from '../agent-framework/services/agent-bridge.service';
import {
  AgentEventBusService,
  AgentEventType,
} from '../agent-framework/services/agent-event-bus.service';

export interface AgentContext {
  agentId: string;
  tenantId: string;
  taskId?: string;
  config: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
  duration?: number;
}

/** Default timeout for agent operations (30 seconds). */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * BaseAgent — abstract foundation for all AENEWS Agent OS X agents.
 *
 * Provides:
 * - Lifecycle hooks (onInitialize, onStart, onStop, onPause, onResume, onError)
 * - Optional injection of LLMService, AgentBridgeService, AgentEventBusService
 * - Helper methods: executeWithLLM, executeViaBridge, withTimeout
 * - Event emission for observability
 * - Timeout protection for all operations
 */
export abstract class BaseAgent {
  protected readonly logger: Logger;
  abstract readonly name: string;
  abstract readonly cluster: ClusterType;
  abstract readonly capabilities: string[];
  abstract readonly version: string;
  abstract readonly description: string;

  protected status: AgentStatus = AgentStatus.IDLE;
  protected config: Record<string, any> = {};

  // ── Optional service dependencies (set via setServices) ────────────
  protected llmService?: LLMService;
  protected bridgeService?: AgentBridgeService;
  protected eventBus?: AgentEventBusService;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Inject external service dependencies post-construction.
   * Called by cluster modules after creating agent instances.
   * All parameters are optional — agents degrade gracefully when unavailable.
   */
  setServices(services: {
    llmService?: LLMService;
    bridgeService?: AgentBridgeService;
    eventBus?: AgentEventBusService;
  }): void {
    this.llmService = services.llmService;
    this.bridgeService = services.bridgeService;
    this.eventBus = services.eventBus;
    this.logger.debug(
      `Services injected — LLM: ${!!this.llmService}, Bridge: ${!!this.bridgeService}, EventBus: ${!!this.eventBus}`,
    );
  }

  // ── LLM Helper ────────────────────────────────────────────────────

  /**
   * Execute a prompt against the LLM service.
   * Returns the LLM response content, or null if LLM is unavailable/fails.
   *
   * @param systemPrompt  The system prompt that defines the agent's persona/task
   * @param userPrompt    The user-level prompt containing the specific task
   * @param options       Optional LLM generation options (temperature, maxTokens, etc.)
   */
  protected async executeWithLLM(
    systemPrompt: string,
    userPrompt: string,
    options?: { temperature?: number; maxTokens?: number; responseFormat?: 'text' | 'json' },
  ): Promise<string | null> {
    if (!this.llmService) {
      this.logger.debug('LLMService not available — skipping LLM call');
      return null;
    }

    if (!this.llmService.isAnyAvailable()) {
      this.logger.debug('No LLM provider available — skipping LLM call');
      return null;
    }

    try {
      const response = await this.withTimeout(
        this.llmService.chatWithSystem(systemPrompt, userPrompt, {
          temperature: options?.temperature ?? 0.3,
          maxTokens: options?.maxTokens ?? 2048,
          responseFormat: options?.responseFormat ?? 'json',
        }),
        25_000, // 25s timeout for LLM calls
      );

      this.emitEvent(AgentEventType.TOOL_EXECUTED, {
        tool: 'llm',
        tokensUsed: response.usage.totalTokens,
        model: response.model,
      });

      return response.content;
    } catch (error: any) {
      this.logger.warn(
        `LLM call failed: ${error.message}`,
      );
      this.emitEvent(AgentEventType.AGENT_FAILED, {
        source: 'llm',
        error: error.message,
      });
      return null;
    }
  }

  // ── Bridge Helper ─────────────────────────────────────────────────

  /**
   * Execute an action via the AgentBridgeService (Software Factory connector).
   * Returns the connector result, or null if bridge is unavailable/fails.
   *
   * @param connector  Connector name (e.g., 'browser', 'coding', 'computer')
   * @param action     Action name supported by the connector
   * @param params     Parameters for the action
   */
  protected async executeViaBridge(
    connector: string,
    action: string,
    params: Record<string, any>,
  ): Promise<any> {
    if (!this.bridgeService) {
      this.logger.debug('AgentBridgeService not available — skipping bridge call');
      return null;
    }

    try {
      const result = await this.withTimeout(
        this.bridgeService.executeViaConnector(connector, action, params),
        15_000, // 15s timeout for bridge calls
      );

      this.emitEvent(AgentEventType.TOOL_EXECUTED, {
        connector,
        action,
        success: true,
      });

      return result;
    } catch (error: any) {
      this.logger.warn(
        `Bridge call failed (${connector}.${action}): ${error.message}`,
      );
      this.emitEvent(AgentEventType.AGENT_FAILED, {
        source: 'bridge',
        connector,
        action,
        error: error.message,
      });
      return null;
    }
  }

  // ── Event Emission ────────────────────────────────────────────────

  /**
   * Emit an agent event via the event bus.
   * No-op if event bus is not configured.
   */
  protected emitEvent(eventType: AgentEventType, data?: any): void {
    if (!this.eventBus) return;
    try {
      this.eventBus.emit(eventType, this.name, data);
    } catch {
      // Never let event emission failures affect agent execution
    }
  }

  // ── Timeout Wrapper ───────────────────────────────────────────────

  /**
   * Wraps a promise with a timeout.
   * If the promise does not settle within `ms` milliseconds, rejects with
   * a TimeoutError. Emits a timeout event for observability.
   *
   * @param promise  The promise to wrap
   * @param ms       Timeout in milliseconds (default: 30s)
   */
  protected withTimeout<T>(promise: Promise<T>, ms: number = DEFAULT_TIMEOUT_MS): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.emitEvent(AgentEventType.AGENT_FAILED, {
          source: 'timeout',
          timeoutMs: ms,
          agentName: this.name,
        });
        reject(new Error(`Operation timed out after ${ms}ms`));
      }, ms);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  // ── JSON Parsing Helper ───────────────────────────────────────────

  /**
   * Safely parse a JSON string from LLM output.
   * Returns null if parsing fails.
   */
  protected safeJsonParse(text: string | null): any | null {
    if (!text) return null;
    try {
      // Try direct parse
      return JSON.parse(text);
    } catch {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch {
          return null;
        }
      }
      // Try finding first { to last }
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end > start) {
        try {
          return JSON.parse(text.slice(start, end + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  // ── Lifecycle Hooks ───────────────────────────────────────────────

  /**
   * Called when the agent is first initialized with configuration.
   * Subclasses can override to perform setup logic.
   */
  async onInitialize(config: Record<string, any>): Promise<void> {
    this.config = config;
    this.status = AgentStatus.IDLE;
    this.logger.log(`Agent ${this.name} initialized`);
    this.emitEvent(AgentEventType.AGENT_INITIALIZED, { config });
  }

  /**
   * Called when the agent transitions to a running state.
   * Subclasses can override for start-specific logic.
   */
  async onStart(): Promise<void> {
    this.status = AgentStatus.RUNNING;
    this.logger.log(`Agent ${this.name} started`);
    this.emitEvent(AgentEventType.AGENT_STARTED);
  }

  /**
   * The core execution method that every agent MUST implement.
   * This contains the primary business logic of the agent.
   */
  abstract execute(context: AgentContext): Promise<AgentResult>;

  /**
   * Called when the agent is stopped gracefully.
   */
  async onStop(): Promise<void> {
    this.status = AgentStatus.STOPPED;
    this.logger.log(`Agent ${this.name} stopped`);
    this.emitEvent(AgentEventType.AGENT_STOPPED);
  }

  /**
   * Called when the agent is paused mid-execution.
   */
  async onPause(): Promise<void> {
    this.status = AgentStatus.PAUSED;
    this.logger.log(`Agent ${this.name} paused`);
    this.emitEvent(AgentEventType.AGENT_PAUSED);
  }

  /**
   * Called when the agent resumes from a paused state.
   */
  async onResume(): Promise<void> {
    this.status = AgentStatus.RUNNING;
    this.logger.log(`Agent ${this.name} resumed`);
    this.emitEvent(AgentEventType.AGENT_RESUMED);
  }

  /**
   * Called when an error occurs during execution.
   * Subclasses can override for custom error handling or cleanup.
   */
  async onError(error: Error): Promise<void> {
    this.status = AgentStatus.ERROR;
    this.logger.error(
      `Agent ${this.name} error: ${error.message}`,
      error.stack,
    );
    this.emitEvent(AgentEventType.AGENT_FAILED, {
      error: error.message,
      stack: error.stack,
    });
  }

  /**
   * Returns the current status of the agent.
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Returns a summary of the agent's identity and current state.
   */
  getInfo() {
    return {
      name: this.name,
      cluster: this.cluster,
      capabilities: this.capabilities,
      version: this.version,
      description: this.description,
      status: this.status,
      hasLLM: !!this.llmService,
      hasBridge: !!this.bridgeService,
      hasEventBus: !!this.eventBus,
    };
  }

  /**
   * Wraps the execute method with lifecycle management, timing, error handling,
   * and timeout protection.
   *
   * This is the preferred entry point for running an agent — it ensures onStart/onError
   * hooks fire correctly, captures execution duration, and enforces a 30s timeout.
   */
  public async wrapExecution(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      await this.onStart();
      const result = await this.withTimeout(
        this.execute(context),
        DEFAULT_TIMEOUT_MS,
      );
      result.duration = Date.now() - startTime;
      this.status = AgentStatus.IDLE;
      this.emitEvent(AgentEventType.AGENT_COMPLETED, {
        success: result.success,
        duration: result.duration,
      });
      return result;
    } catch (error: any) {
      await this.onError(error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }
}
