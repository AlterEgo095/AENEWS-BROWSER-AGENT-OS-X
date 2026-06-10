import { Logger } from '@nestjs/common';
import { ClusterType, AgentStatus } from './entities/agent.entity';

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

export abstract class BaseAgent {
  protected readonly logger: Logger;
  abstract readonly name: string;
  abstract readonly cluster: ClusterType;
  abstract readonly capabilities: string[];
  abstract readonly version: string;
  abstract readonly description: string;

  protected status: AgentStatus = AgentStatus.IDLE;
  protected config: Record<string, any> = {};

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Called when the agent is first initialized with configuration.
   * Subclasses can override to perform setup logic.
   */
  async onInitialize(config: Record<string, any>): Promise<void> {
    this.config = config;
    this.status = AgentStatus.IDLE;
    this.logger.log(`Agent ${this.name} initialized`);
  }

  /**
   * Called when the agent transitions to a running state.
   * Subclasses can override for start-specific logic.
   */
  async onStart(): Promise<void> {
    this.status = AgentStatus.RUNNING;
    this.logger.log(`Agent ${this.name} started`);
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
  }

  /**
   * Called when the agent is paused mid-execution.
   */
  async onPause(): Promise<void> {
    this.status = AgentStatus.PAUSED;
    this.logger.log(`Agent ${this.name} paused`);
  }

  /**
   * Called when the agent resumes from a paused state.
   */
  async onResume(): Promise<void> {
    this.status = AgentStatus.RUNNING;
    this.logger.log(`Agent ${this.name} resumed`);
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
    };
  }

  /**
   * Wraps the execute method with lifecycle management, timing, and error handling.
   * This is the preferred entry point for running an agent — it ensures onStart/onError
   * hooks fire correctly and captures execution duration.
   */
  public async wrapExecution(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      await this.onStart();
      const result = await this.execute(context);
      result.duration = Date.now() - startTime;
      this.status = AgentStatus.IDLE;
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
