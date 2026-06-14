/**
 * AENEWS Agent OS X - Task Queue Processor
 *
 * Bull queue processor for agent task execution.
 * Handles individual agent task assignment and execution
 * with retry, timeout, and real-time progress reporting.
 *
 * Queue: "task:queue"
 * Concurrency: 5
 */

import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AgentRegistryService } from '../agents/registry/agent-registry.service';
import { InterAgentCommService } from '../agents/communication/inter-agent-comm.service';
import { RealtimeGateway, RealtimeEventType } from '../realtime/realtime.gateway';
import { EventBusService } from '../agents/events/event-bus.service';
import { AgentEventType } from '../agents/interfaces/agent-event.interface';

// ─── Job Data ──────────────────────────────────────────────────────
export interface TaskJobData {
  taskId: string;
  agentId: string;
  cluster?: string;
  payload: any;
  priority?: number;
  timeoutMs?: number;
  correlationId?: string;
  parentMissionId?: string;
}

// ─── Job Result ────────────────────────────────────────────────────
export interface TaskJobResult {
  taskId: string;
  agentId: string;
  success: boolean;
  result: any;
  executionTimeMs: number;
  error?: string;
}

@Processor('task:queue')
export class TaskQueueProcessor {
  private readonly logger = new Logger(TaskQueueProcessor.name);

  constructor(
    private readonly agentRegistry: AgentRegistryService,
    private readonly interAgentComm: InterAgentCommService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly eventBus: EventBusService,
  ) {}

  @Process({ name: 'execute' })
  async processTask(job: Job<TaskJobData>): Promise<TaskJobResult> {
    const { taskId, agentId, payload, parentMissionId } = job.data;
    const startTime = Date.now();

    this.logger.log(`Processing task ${taskId} for agent ${agentId}`);

    await job.progress(10);

    // Push real-time event: task executing
    if (parentMissionId) {
      this.realtimeGateway.pushOrchestrationEvent(parentMissionId, RealtimeEventType.ORCH_EXECUTE, {
        taskId,
        agentId,
        phase: 'executing',
      });
    }

    this.realtimeGateway.pushAgentEvent(
      agentId,
      job.data.cluster || 'unknown',
      RealtimeEventType.AGENT_STARTED,
      { taskId, phase: 'executing' },
    );

    try {
      // Get agent from registry
      const agent = this.agentRegistry.getAgent(agentId);

      if (!agent) {
        throw new Error(`Agent not found in registry: ${agentId}`);
      }

      await job.progress(30);

      // Execute agent
      const result = await agent.execute({
        taskId,
        payload,
        context: { timeout: job.data.timeoutMs || 120000 },
      });

      await job.progress(90);

      const executionTimeMs = Date.now() - startTime;

      // Push real-time completion event
      if (parentMissionId) {
        this.realtimeGateway.pushOrchestrationEvent(
          parentMissionId,
          RealtimeEventType.ORCH_EXECUTE,
          { taskId, agentId, phase: 'completed', executionTimeMs },
        );
      }

      this.realtimeGateway.pushAgentEvent(
        agentId,
        job.data.cluster || 'unknown',
        RealtimeEventType.AGENT_STOPPED,
        { taskId, executionTimeMs },
      );

      // Emit event bus event
      await this.eventBus.publish({
        type: AgentEventType.TASK_COMPLETED,
        sourceAgentId: agentId,
        cluster: job.data.cluster as any,
        payload: { taskId, executionTimeMs, success: true },
        priority: 1,
        correlationId: job.data.correlationId || taskId,
        metadata: {},
      });

      return {
        taskId,
        agentId,
        success: true,
        result,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;

      this.logger.error(`Task ${taskId} failed for agent ${agentId}: ${(error as Error).message}`);

      // Push real-time error event
      this.realtimeGateway.pushAgentEvent(
        agentId,
        job.data.cluster || 'unknown',
        RealtimeEventType.AGENT_ERROR,
        { taskId, error: (error as Error).message, executionTimeMs },
      );

      // Emit event bus event
      await this.eventBus.publish({
        type: AgentEventType.TASK_FAILED,
        sourceAgentId: agentId,
        cluster: job.data.cluster as any,
        payload: { taskId, error: (error as Error).message, executionTimeMs },
        priority: 2,
        correlationId: job.data.correlationId || taskId,
        metadata: {},
      });

      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job<TaskJobData>): void {
    this.logger.log(`Task job ${job.id} started for task ${job.data.taskId}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<TaskJobData>, result: TaskJobResult): void {
    this.logger.log(
      `Task job ${job.id} completed: task ${result.taskId} (${result.executionTimeMs}ms)`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job<TaskJobData>, error: Error): void {
    this.logger.error(`Task job ${job.id} failed for task ${job.data.taskId}: ${error.message}`);
  }
}
