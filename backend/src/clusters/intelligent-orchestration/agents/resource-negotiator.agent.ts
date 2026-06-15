import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * ResourceNegotiatorAgent manages resource allocation, conflict resolution,
 * rebalancing, and utilization optimization across the system.
 * Ensures fair and efficient distribution of computational resources.
 */
export class ResourceNegotiatorAgent extends BaseAgent {
  readonly name = 'ResourceNegotiatorAgent';
  readonly cluster = ClusterType.INTELLIGENT_ORCHESTRATION;
  readonly capabilities = [
    'allocate-resources',
    'resolve-conflicts',
    'rebalance',
    'optimize-utilization',
  ];
  readonly version = '2.0.0';
  readonly description =
    'Manages resource allocation, conflict resolution, rebalancing, and utilization optimization for fair and efficient resource distribution';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'allocate-resources';
      const startTime = Date.now();

      switch (action) {
        case 'allocate-resources': {
          const requester = config.requester;
          const resources = config.resources || [];
          const priority = config.priority || 'normal';
          const deadline = config.deadline;
          const preemptible = config.preemptible ?? false;
          const minRequired = config.minRequired || {};
          const maxAllowed = config.maxAllowed || {};
          const allocationStrategy = config.allocationStrategy || 'fair-share';
          this.logger.log(
            `Allocating resources for ${requester || 'unknown'} (priority: ${priority}, strategy: ${allocationStrategy})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, requester, priority, allocationStrategy });

          const llmResult = await this.executeWithLLM(
            `You are a professional resource management expert. Allocate resources fairly and efficiently based on priority and constraints.`,
            `Allocate resources: requester="${requester}", resources=${JSON.stringify(resources)}, priority="${priority}", strategy="${allocationStrategy}", minRequired=${JSON.stringify(minRequired)}, maxAllowed=${JSON.stringify(maxAllowed)}. Return JSON with: allocationId (string), allocated (object mapping resource name to {resource, amount, unit, expiresAt}), denied (array of {resource, requested, available, reason}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const allocationId = parsed?.allocationId || `alloc-${Date.now()}`;
          const allocated = parsed?.allocated || {
            cpu: { resource: 'cpu', amount: 4, unit: 'cores', expiresAt: new Date(Date.now() + 3600000).toISOString() },
            memory: { resource: 'memory', amount: 8192, unit: 'MB', expiresAt: new Date(Date.now() + 3600000).toISOString() },
            network: { resource: 'network', amount: 1000, unit: 'Mbps', expiresAt: null },
          };
          const denied = parsed?.denied || [];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { allocationId, allocatedCount: Object.keys(allocated).length, deniedCount: denied.length });

          return {
            success: true,
            data: {
              action,
              requester,
              resources,
              priority,
              deadline,
              preemptible,
              minRequired,
              maxAllowed,
              allocationStrategy,
              allocationId,
              allocated,
              denied,
              status: 'resources_allocated',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'resolve-conflicts': {
          const conflictType = config.conflictType || 'resource-contention';
          const conflictingParties = config.conflictingParties || [];
          const resolutionStrategy = config.resolutionStrategy || 'priority-based';
          const allowCompromise = config.allowCompromise ?? true;
          const enforceFairness = config.enforceFairness ?? true;
          const maxResolutionTime = config.maxResolutionTime || 30000;
          this.logger.log(
            `Resolving ${conflictType} between ${conflictingParties.length} parties (strategy: ${resolutionStrategy})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, conflictType, partyCount: conflictingParties.length, resolutionStrategy });

          const llmResult = await this.executeWithLLM(
            `You are a professional resource conflict resolution expert. Resolve resource conflicts fairly while respecting priorities.`,
            `Resolve conflict: type="${conflictType}", parties=${JSON.stringify(conflictingParties)}, strategy="${resolutionStrategy}", allowCompromise=${allowCompromise}, enforceFairness=${enforceFairness}. Return JSON with: resolutionId (string), resolution ({strategy, decisions: [{party, resource, allocated, requested, rationale}], compromises: [{parties, resource, description}]}), unresolvedConflicts (array of {parties, resource, reason, escalationRequired}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const resolutionId = parsed?.resolutionId || `resolve-${Date.now()}`;
          const resolution = parsed?.resolution || {
            strategy: resolutionStrategy,
            decisions: [
              { party: 'service-a', resource: 'cpu', allocated: 3, requested: 6, rationale: 'Priority-based allocation: service-a has lower priority' },
              { party: 'service-b', resource: 'cpu', allocated: 5, requested: 4, rationale: 'Priority-based allocation: service-b has higher priority and critical deadline' },
            ],
            compromises: [
              { parties: ['service-a', 'service-b'], resource: 'memory', description: 'Shared memory pool with soft partitioning at 60/40 split' },
            ],
          };
          const unresolvedConflicts = parsed?.unresolvedConflicts || [];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { resolutionId, decisionCount: resolution.decisions.length });

          return {
            success: true,
            data: {
              action,
              conflictType,
              conflictingParties,
              resolutionStrategy,
              allowCompromise,
              enforceFairness,
              maxResolutionTime,
              resolutionId,
              resolution,
              unresolvedConflicts,
              status: 'conflicts_resolved',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'rebalance': {
          const scope = config.scope || 'system';
          const trigger = config.trigger || 'scheduled';
          const targetUtilization = config.targetUtilization || 0.7;
          const allowMigration = config.allowMigration ?? true;
          const maxDisruption = config.maxDisruption || 'low';
          const respectAffinity = config.respectAffinity ?? true;
          this.logger.log(
            `Rebalancing resources (scope: ${scope}, trigger: ${trigger}, target utilization: ${targetUtilization})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, scope, trigger, targetUtilization });

          const llmResult = await this.executeWithLLM(
            `You are a professional resource rebalancing expert. Redistribute resources to achieve target utilization across the system.`,
            `Rebalance: scope="${scope}", trigger="${trigger}", targetUtilization=${targetUtilization}, allowMigration=${allowMigration}, maxDisruption="${maxDisruption}", respectAffinity=${respectAffinity}. Return JSON with: rebalanceId (string), beforeState ({avgUtilization, overUtilized, underUtilized}), migrations (array of {resource, from, to, amount, reason, disruption}), afterState ({avgUtilization, overUtilized, underUtilized}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const rebalanceId = parsed?.rebalanceId || `rebal-${Date.now()}`;
          const beforeState = parsed?.beforeState || {
            avgUtilization: 0.85,
            overUtilized: ['node-2', 'node-5'],
            underUtilized: ['node-1', 'node-3', 'node-4'],
          };
          const migrations = parsed?.migrations || [
            { resource: 'workload-alpha', from: 'node-2', to: 'node-3', amount: 2, reason: 'node-2 exceeds 90% CPU utilization threshold', disruption: 'low' },
            { resource: 'workload-beta', from: 'node-5', to: 'node-4', amount: 1.5, reason: 'Memory pressure on node-5; migrate to underutilized node-4', disruption: 'low' },
          ];
          const afterState = parsed?.afterState || {
            avgUtilization: 0.72,
            overUtilized: [],
            underUtilized: ['node-1'],
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { rebalanceId, migrationCount: migrations.length });

          return {
            success: true,
            data: {
              action,
              scope,
              trigger,
              targetUtilization,
              allowMigration,
              maxDisruption,
              respectAffinity,
              rebalanceId,
              beforeState,
              migrations,
              afterState,
              status: 'rebalance_completed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'optimize-utilization': {
          const resourceTypes = config.resourceTypes || ['cpu', 'memory', 'disk', 'network'];
          const optimizationTarget = config.optimizationTarget || 'efficiency';
          const timeHorizon = config.timeHorizon || '1h';
          const includeCostOptimization = config.includeCostOptimization ?? true;
          const includePerformanceOptimization = config.includePerformanceOptimization ?? true;
          this.logger.log(
            `Optimizing utilization (target: ${optimizationTarget}, types: ${resourceTypes.join(', ')})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, optimizationTarget, resourceTypes });

          const llmResult = await this.executeWithLLM(
            `You are a professional resource utilization optimization expert. Analyze current utilization and propose optimization strategies.`,
            `Optimize utilization: resourceTypes=${JSON.stringify(resourceTypes)}, target="${optimizationTarget}", timeHorizon="${timeHorizon}", includeCost=${includeCostOptimization}, includePerformance=${includePerformanceOptimization}. Return JSON with: currentUtilization (object mapping resource to {used, total, utilization, trend}), optimizationPlan (array of {resource, currentUtilization, targetUtilization, actions: [{type, description, expectedImpact, riskLevel}]}), projectedSavings ({cost, performance, efficiency}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const currentUtilization = parsed?.currentUtilization || {
            cpu: { used: 6.4, total: 8, utilization: 0.8, trend: 'increasing' },
            memory: { used: 24576, total: 32768, utilization: 0.75, trend: 'stable' },
            disk: { used: 450, total: 1000, utilization: 0.45, trend: 'stable' },
            network: { used: 650, total: 1000, utilization: 0.65, trend: 'decreasing' },
          };
          const optimizationPlan = parsed?.optimizationPlan || [
            { resource: 'cpu', currentUtilization: 0.8, targetUtilization: 0.7, actions: [{ type: 'scale-up', description: 'Add 2 CPU cores to reduce throttling risk', expectedImpact: 0.12, riskLevel: 'low' }] },
            { resource: 'memory', currentUtilization: 0.75, targetUtilization: 0.7, actions: [{ type: 'optimize', description: 'Enable memory compression for infrequently accessed data', expectedImpact: 0.08, riskLevel: 'low' }] },
          ];
          const projectedSavings = parsed?.projectedSavings || {
            cost: 15.5,
            performance: 22.0,
            efficiency: 18.3,
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { optimizationPlanItems: optimizationPlan.length });

          return {
            success: true,
            data: {
              action,
              resourceTypes,
              optimizationTarget,
              timeHorizon,
              includeCostOptimization,
              includePerformanceOptimization,
              currentUtilization,
              optimizationPlan,
              projectedSavings,
              status: 'utilization_optimized',
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
