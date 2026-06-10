import { Injectable, Logger } from '@nestjs/common';
import { AgentRegistryService } from '../registry/agent-registry.service';
import { AgentStatus } from '../entities/agent.entity';

@Injectable()
export class AgentLifecycleService {
  private readonly logger = new Logger(AgentLifecycleService.name);

  constructor(private readonly registry: AgentRegistryService) {}

  /**
   * Initialize an agent with the given configuration.
   */
  async initializeAgent(
    key: string,
    config: Record<string, any>,
  ): Promise<void> {
    const agent = this.registry.get(key);
    if (!agent) throw new Error(`Agent not found: ${key}`);
    await agent.onInitialize(config);
    this.logger.log(`Agent ${key} initialized`);
  }

  /**
   * Start an agent, transitioning it to RUNNING state.
   */
  async startAgent(key: string): Promise<void> {
    const agent = this.registry.get(key);
    if (!agent) throw new Error(`Agent not found: ${key}`);
    await agent.onStart();
  }

  /**
   * Stop an agent, transitioning it to STOPPED state.
   */
  async stopAgent(key: string): Promise<void> {
    const agent = this.registry.get(key);
    if (!agent) throw new Error(`Agent not found: ${key}`);
    await agent.onStop();
  }

  /**
   * Pause an agent, transitioning it to PAUSED state.
   */
  async pauseAgent(key: string): Promise<void> {
    const agent = this.registry.get(key);
    if (!agent) throw new Error(`Agent not found: ${key}`);
    await agent.onPause();
  }

  /**
   * Resume a paused agent, transitioning it back to RUNNING state.
   */
  async resumeAgent(key: string): Promise<void> {
    const agent = this.registry.get(key);
    if (!agent) throw new Error(`Agent not found: ${key}`);
    await agent.onResume();
  }

  /**
   * Restart an agent by stopping then starting it.
   */
  async restartAgent(key: string): Promise<void> {
    await this.stopAgent(key);
    await this.startAgent(key);
  }

  /**
   * Initialize all registered agents with the provided configuration.
   * Failures are logged but do not prevent other agents from initializing.
   */
  async initializeAll(config: Record<string, any> = {}): Promise<void> {
    const agents = this.registry.getAll();
    let successCount = 0;

    for (const agent of agents) {
      try {
        await agent.onInitialize(config);
        successCount++;
      } catch (error: any) {
        this.logger.error(
          `Failed to initialize ${agent.name}: ${error.message}`,
        );
      }
    }
    this.logger.log(
      `Initialized ${successCount}/${agents.length} agents`,
    );
  }

  /**
   * Stop all running agents gracefully.
   * Failures are logged but do not prevent other agents from stopping.
   */
  async stopAll(): Promise<void> {
    const agents = this.registry.getAll();
    let successCount = 0;

    for (const agent of agents) {
      try {
        if (agent.getStatus() !== AgentStatus.STOPPED) {
          await agent.onStop();
          successCount++;
        }
      } catch (error: any) {
        this.logger.error(`Failed to stop ${agent.name}: ${error.message}`);
      }
    }
    this.logger.log(
      `Stopped ${successCount} agents`,
    );
  }
}
