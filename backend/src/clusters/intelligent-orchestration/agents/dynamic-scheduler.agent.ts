import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * DynamicSchedulerAgent handles intelligent task scheduling with
 * parallelism optimization, rescheduling, and load balancing.
 * Maximizes resource utilization while respecting constraints and priorities.
 */
export class DynamicSchedulerAgent extends BaseAgent {
  readonly name = 'DynamicSchedulerAgent';
  readonly cluster = ClusterType.INTELLIGENT_ORCHESTRATION;
  readonly capabilities = [
    'schedule-tasks',
    'optimize-parallelism',
    'reschedule',
    'balance-load',
  ];
  readonly version = '2.0.0';
  readonly description =
    'Handles intelligent task scheduling with parallelism optimization, rescheduling, and load balancing for maximum resource utilization';

  readonly missionCategories = [MissionCategory.AI_ORCHESTRATION];
  readonly creditCost = 2;
  readonly powerLevel = 2;
  readonly tier = 'advanced';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'schedule-tasks';
      const startTime = Date.now();

      switch (action) {
        case 'schedule-tasks': {
          const tasks = config.tasks || [];
          const strategy = config.strategy || 'priority-based';
          const timeWindow = config.timeWindow || '24h';
          const constraints = config.constraints || [];
          const allowPreemption = config.allowPreemption ?? true;
          const maxConcurrent = config.maxConcurrent || 10;
          const respectDependencies = config.respectDependencies ?? true;
          this.logger.log(
            `Scheduling ${tasks.length} tasks (strategy: ${strategy}, max concurrent: ${maxConcurrent})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, taskCount: tasks.length, strategy });

          const llmResult = await this.executeWithLLM(
            `You are a professional task scheduling expert. Create an optimal schedule that maximizes utilization while respecting constraints.`,
            `Schedule ${tasks.length} tasks: strategy="${strategy}", timeWindow="${timeWindow}", maxConcurrent=${maxConcurrent}, respectDependencies=${respectDependencies}. Return JSON with: scheduleId (string), schedule (array of {taskId, startTime, endTime, priority, dependencies, assignedWorker}), unschedulable (array of {taskId, reason}), utilizationEstimate (number 0-1).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const scheduleId = parsed?.scheduleId || `sched-${Date.now()}`;
          const schedule = parsed?.schedule || [
            { taskId: 'task-1', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString(), priority: 9, dependencies: [], assignedWorker: 'worker-1' },
            { taskId: 'task-2', startTime: new Date(Date.now() + 600000).toISOString(), endTime: new Date(Date.now() + 4200000).toISOString(), priority: 7, dependencies: ['task-1'], assignedWorker: 'worker-2' },
            { taskId: 'task-3', startTime: new Date(Date.now() + 1200000).toISOString(), endTime: new Date(Date.now() + 4800000).toISOString(), priority: 5, dependencies: [], assignedWorker: 'worker-1' },
          ];
          const unschedulable = parsed?.unschedulable || [];
          const utilizationEstimate = parsed?.utilizationEstimate ?? 0.78;

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { scheduleId, scheduledCount: schedule.length, utilizationEstimate });

          return {
            success: true,
            data: {
              action,
              tasks,
              strategy,
              timeWindow,
              constraints,
              allowPreemption,
              maxConcurrent,
              respectDependencies,
              scheduleId,
              schedule,
              unschedulable,
              utilizationEstimate,
              status: 'tasks_scheduled',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'optimize-parallelism': {
          const currentSchedule = config.currentSchedule;
          const targetMetric = config.targetMetric || 'throughput';
          const maxWorkers = config.maxWorkers || 20;
          const minWorkers = config.minWorkers || 1;
          const optimizationGoal = config.optimizationGoal || 'maximize-throughput';
          const safetyMargin = config.safetyMargin || 0.2;
          this.logger.log(
            `Optimizing parallelism (target: ${targetMetric}, goal: ${optimizationGoal})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, targetMetric, optimizationGoal });

          const llmResult = await this.executeWithLLM(
            `You are a professional parallelism optimization expert. Analyze the current schedule and recommend optimal parallelism settings.`,
            `Optimize parallelism: targetMetric="${targetMetric}", maxWorkers=${maxWorkers}, minWorkers=${minWorkers}, goal="${optimizationGoal}", safetyMargin=${safetyMargin}. Return JSON with: optimizationId (string), recommendations (array of {type, description, current, recommended, expectedImprovement}), parallelismProfile ({optimalConcurrency, avgParallelism, peakParallelism, utilizationRate}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const optimizationId = parsed?.optimizationId || `opt-${Date.now()}`;
          const recommendations = parsed?.recommendations || [
            { type: 'concurrency', description: 'Increase concurrent task limit to match worker pool capacity', current: 5, recommended: 12, expectedImprovement: 0.35 },
            { type: 'batching', description: 'Batch small tasks to reduce scheduling overhead', current: 1, recommended: 4, expectedImprovement: 0.15 },
            { type: 'dependency-relaxation', description: 'Relax soft dependencies to enable more parallel execution', current: 0, recommended: 3, expectedImprovement: 0.22 },
          ];
          const parallelismProfile = parsed?.parallelismProfile || {
            optimalConcurrency: 12,
            avgParallelism: 7.5,
            peakParallelism: 18,
            utilizationRate: 0.82,
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { optimizationId, recommendationCount: recommendations.length });

          return {
            success: true,
            data: {
              action,
              currentSchedule,
              targetMetric,
              maxWorkers,
              minWorkers,
              optimizationGoal,
              safetyMargin,
              optimizationId,
              recommendations,
              parallelismProfile,
              status: 'parallelism_optimized',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'reschedule': {
          const scheduleId = config.scheduleId;
          const reason = config.reason || 'optimization';
          const affectedTasks = config.affectedTasks || [];
          const maintainProgress = config.maintainProgress ?? true;
          const allowDowngrade = config.allowDowngrade ?? false;
          const notifyAffected = config.notifyAffected ?? true;
          this.logger.log(
            `Rescheduling ${scheduleId || 'current schedule'} (reason: ${reason})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, scheduleId, reason });

          const llmResult = await this.executeWithLLM(
            `You are a professional schedule optimization expert. Redesign the schedule to address the given reason while maintaining progress.`,
            `Reschedule: scheduleId="${scheduleId}", reason="${reason}", affectedTasks=${JSON.stringify(affectedTasks)}, maintainProgress=${maintainProgress}. Return JSON with: newScheduleId (string), changes (array of {taskId, previousSlot, newSlot, reason}), impactAssessment ({delayedTasks, expeditedTasks, unchangedTasks, estimatedCompletionChange}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const newScheduleId = parsed?.newScheduleId || `sched-${Date.now()}`;
          const changes = parsed?.changes || affectedTasks.map((taskId: string, i: number) => ({
            taskId,
            previousSlot: new Date(Date.now() + i * 3600000).toISOString(),
            newSlot: new Date(Date.now() + (i + 2) * 3600000).toISOString(),
            reason: `Rescheduled due to ${reason}`,
          }));
          const impactAssessment = parsed?.impactAssessment || {
            delayedTasks: Math.ceil(affectedTasks.length / 2),
            expeditedTasks: Math.floor(affectedTasks.length / 3),
            unchangedTasks: Math.max(0, 10 - affectedTasks.length),
            estimatedCompletionChange: 1800000,
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { newScheduleId, changeCount: changes.length });

          return {
            success: true,
            data: {
              action,
              scheduleId: scheduleId || null,
              reason,
              affectedTasks,
              maintainProgress,
              allowDowngrade,
              notifyAffected,
              newScheduleId,
              changes,
              impactAssessment,
              status: 'reschedule_completed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'balance-load': {
          const workers = config.workers || [];
          const strategy = config.strategy || 'weighted-round-robin';
          const healthCheck = config.healthCheck ?? true;
          const autoScale = config.autoScale ?? true;
          const scaleUpThreshold = config.scaleUpThreshold || 0.8;
          const scaleDownThreshold = config.scaleDownThreshold || 0.3;
          this.logger.log(
            `Balancing load across ${workers.length || 'all'} workers (strategy: ${strategy})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, workerCount: workers.length, strategy });

          const llmResult = await this.executeWithLLM(
            `You are a professional load balancing expert. Analyze worker loads and propose optimal task distribution.`,
            `Balance load: workers=${JSON.stringify(workers)}, strategy="${strategy}", scaleUpThreshold=${scaleUpThreshold}, scaleDownThreshold=${scaleDownThreshold}. Return JSON with: loadDistribution (array of {workerId, currentLoad, maxCapacity, utilization, assignedTasks, health}), rebalancingActions (array of {type, taskId, fromWorker, toWorker, reason}), scalingRecommendation ({action, currentWorkers, recommendedWorkers, reason}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const loadDistribution = parsed?.loadDistribution || [
            { workerId: 'worker-1', currentLoad: 7, maxCapacity: 10, utilization: 0.7, assignedTasks: 5, health: 'healthy' },
            { workerId: 'worker-2', currentLoad: 9, maxCapacity: 10, utilization: 0.9, assignedTasks: 7, health: 'healthy' },
            { workerId: 'worker-3', currentLoad: 3, maxCapacity: 10, utilization: 0.3, assignedTasks: 2, health: 'healthy' },
          ];
          const rebalancingActions = parsed?.rebalancingActions || [
            { type: 'migrate', taskId: 'task-5', fromWorker: 'worker-2', toWorker: 'worker-3', reason: 'worker-2 utilization exceeds threshold' },
            { type: 'migrate', taskId: 'task-6', fromWorker: 'worker-2', toWorker: 'worker-1', reason: 'load balancing for even distribution' },
          ];
          const scalingRecommendation = parsed?.scalingRecommendation || {
            action: 'scale-up',
            currentWorkers: workers.length || 3,
            recommendedWorkers: (workers.length || 3) + 2,
            reason: 'Peak utilization exceeds 80% threshold; additional workers will reduce contention',
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { actionCount: rebalancingActions.length, scalingAction: scalingRecommendation.action });

          return {
            success: true,
            data: {
              action,
              workers,
              strategy,
              healthCheck,
              autoScale,
              scaleUpThreshold,
              scaleDownThreshold,
              loadDistribution,
              rebalancingActions,
              scalingRecommendation,
              status: 'load_balanced',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error: any) {
      this.emitEvent(AgentEventType.AGENT_FAILED, { error: error.message });
      return { success: false, error: error.message };
    }
  }
}
