import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, AgentStatus, ClusterType } from './entities/agent.entity';
import { Execution } from './entities/execution.entity';
import { Task } from '../task/entities/task.entity';
import { AgentRegistryService } from './registry/agent-registry.service';
import { AgentLifecycleService } from './lifecycle/agent-lifecycle.service';
import { AgentContext, AgentResult } from './agent.abstract';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Execution)
    private readonly executionRepository: Repository<Execution>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly registry: AgentRegistryService,
    private readonly lifecycle: AgentLifecycleService,
  ) {}

  /**
   * Create a new agent record in the database.
   */
  async create(createDto: {
    name: string;
    cluster: ClusterType;
    tenantId: string;
    config?: Record<string, any>;
    description?: string;
    capabilities?: string[];
    version?: string;
  }): Promise<Agent> {
    const agent = this.agentRepository.create({
      name: createDto.name,
      cluster: createDto.cluster,
      tenantId: createDto.tenantId,
      config: createDto.config || {},
      description: createDto.description,
      capabilities: createDto.capabilities || [],
      version: createDto.version || '1.0.0',
      status: AgentStatus.IDLE,
      isEnabled: true,
    });
    return this.agentRepository.save(agent);
  }

  /**
   * List agents with optional filtering by tenant and cluster, plus pagination.
   */
  async findAll(
    tenantId?: string,
    cluster?: ClusterType,
    page = 1,
    limit = 20,
  ): Promise<{ data: Agent[]; total: number }> {
    const query = this.agentRepository.createQueryBuilder('agent');
    if (tenantId) query.andWhere('agent.tenantId = :tenantId', { tenantId });
    if (cluster) query.andWhere('agent.cluster = :cluster', { cluster });
    query.skip((page - 1) * limit).take(limit);
    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  /**
   * Find a single agent by ID. Throws NotFoundException if not found.
   */
  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentRepository.findOne({ where: { id } });
    if (!agent) {
      throw new NotFoundException(`Agent ${id} not found`);
    }
    return agent;
  }

  /**
   * Update an agent's properties.
   */
  async update(id: string, updateDto: Partial<Agent>): Promise<Agent> {
    await this.agentRepository.update(id, updateDto);
    return this.findOne(id);
  }

  /**
   * Delete an agent by ID.
   */
  async remove(id: string): Promise<void> {
    const result = await this.agentRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Agent ${id} not found`);
    }
  }

  /**
   * Execute an agent by its database ID.
   *
   * This method:
   * 1. Looks up the agent in the database
   * 2. Validates it exists and is enabled
   * 3. Delegates to the in-memory registry for actual execution
   * 4. Records the execution result in the database
   * 5. Updates the agent's status and lastExecutionAt timestamp
   */
  async executeAgent(agentId: string, context: AgentContext): Promise<AgentResult> {
    const agent = await this.findOne(agentId);
    if (!agent.isEnabled) {
      return {
        success: false,
        error: `Agent ${agentId} is disabled`,
      };
    }

    const registryKey = `${agent.cluster}:${agent.name}`;
    const startTime = new Date();

    // Mark agent as running in the database
    await this.agentRepository.update(agentId, {
      status: AgentStatus.RUNNING,
      lastExecutionAt: new Date(),
    });

    try {
      const result = await this.registry.executeAgent(registryKey, context);

      // Persist the execution record
      const execution = this.executionRepository.create({
        agentId,
        taskId: context.taskId,
        tenantId: context.tenantId,
        status: result.success ? AgentStatus.COMPLETED : AgentStatus.ERROR,
        input: context.config,
        output: result.data,
        error: result.error,
        durationMs: result.duration,
        metadata: result.metadata || {},
        startedAt: startTime,
        completedAt: new Date(),
      });
      await this.executionRepository.save(execution);

      // Reset agent status to idle
      await this.agentRepository.update(agentId, {
        status: AgentStatus.IDLE,
      });

      return result;
    } catch (error: any) {
      // Mark agent as error in the database
      await this.agentRepository.update(agentId, {
        status: AgentStatus.ERROR,
      });

      // Still record the failed execution
      const execution = this.executionRepository.create({
        agentId,
        taskId: context.taskId,
        tenantId: context.tenantId,
        status: AgentStatus.ERROR,
        input: context.config,
        error: error.message,
        durationMs: Date.now() - startTime.getTime(),
        metadata: {},
        startedAt: startTime,
        completedAt: new Date(),
      });
      await this.executionRepository.save(execution);

      throw error;
    }
  }

  /**
   * Get aggregated statistics per cluster from the in-memory registry.
   */
  async getClusterStats(): Promise<Record<string, any>> {
    return this.registry.getClusterStats();
  }

  /**
   * Retrieve paginated execution history for a given agent.
   */
  async getAgentExecutions(
    agentId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Execution[]; total: number }> {
    const [data, total] = await this.executionRepository.findAndCount({
      where: { agentId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }
}
