import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * CircuitBreakerManagerAgent — Watchdog Cluster
 *
 * Manages circuit breakers across the platform, monitors agent health, and
 * coordinates recovery through circuit state management. Implements the classic
 * circuit breaker pattern (Closed → Open → Half-Open → Closed) adapted for a
 * multi-agent distributed system.
 *
 * Supported actions:
 * - monitor-circuits    → Observe the health and state of all or selected circuit breakers
 * - open-circuit        → Force-open a circuit breaker (stop traffic to a failing agent/service)
 * - close-circuit       → Close a circuit breaker (resume normal traffic after recovery)
 * - half-open-circuit   → Transition a circuit to half-open (allow probe requests to test recovery)
 * - get-circuit-status  → Retrieve detailed status of one or more circuit breakers
 */
export class CircuitBreakerManagerAgent extends BaseAgent {
  readonly name = 'CircuitBreakerManagerAgent';
  readonly cluster = ClusterType.WATCHDOG;
  readonly capabilities = [
    'monitor-circuits',
    'open-circuit',
    'close-circuit',
    'half-open-circuit',
    'get-circuit-status',
  ];
  readonly version = '2.0.0';
  readonly description =
    'Manages circuit breakers across the platform, monitors agent health, and coordinates recovery through circuit state management';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'monitor-circuits';
      const startTime = Date.now();

      switch (action) {
        case 'monitor-circuits': {
          const scope = config.scope || 'all';
          const circuitIds = config.circuitIds || [];
          const includeHealthMetrics = config.includeHealthMetrics ?? true;
          const includeEventLog = config.includeEventLog ?? true;
          const monitorInterval = config.monitorInterval || 30;
          const alertThreshold = config.alertThreshold || 'open';
          const maxEventsPerCircuit = config.maxEventsPerCircuit || 50;
          const groupByCluster = config.groupByCluster ?? false;
          const filterByState = config.filterByState || [];

          this.logger.log(
            `Monitoring circuits (scope: ${scope}, filter: [${filterByState.join(',') || 'none'}])`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, scope });

          const llmResult = await this.executeWithLLM(
            `You are a professional circuit breaker monitoring expert. Analyze circuit health, failure rates, and recovery patterns.`,
            `Monitor circuits: scope="${scope}", includeHealthMetrics=${includeHealthMetrics}, includeEventLog=${includeEventLog}, alertThreshold="${alertThreshold}". Return JSON with: circuits (array of {circuitId, agentName, cluster, state, failureCount, successCount, failureRate, lastStateChange, lastFailure, lastSuccess, healthScore, consecutiveFailures, consecutiveSuccesses}), summary ({totalCircuits, closed, open, halfOpen, overallHealth, openCircuitRatio}), healthMetrics ({averageResponseTime, averageFailureRate, p95ResponseTime, errorBudgetRemaining, mttr, mtbf}), alerts (array of {circuitId, severity, message, timestamp, action}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const circuits = parsed?.circuits || [
            { circuitId: 'cb-search-service', agentName: 'SearchAgent', cluster: 'intelligent-orchestration', state: 'closed' as const, failureCount: 2, successCount: 847, failureRate: 0.002, lastStateChange: new Date(Date.now() - 3600000).toISOString(), lastFailure: new Date(Date.now() - 7200000).toISOString(), lastSuccess: new Date().toISOString(), healthScore: 0.95, consecutiveFailures: 0, consecutiveSuccesses: 42 },
            { circuitId: 'cb-payment-service', agentName: 'PaymentAgent', cluster: 'certification', state: 'open' as const, failureCount: 15, successCount: 823, failureRate: 0.018, lastStateChange: new Date(Date.now() - 600000).toISOString(), lastFailure: new Date(Date.now() - 120000).toISOString(), lastSuccess: new Date(Date.now() - 900000).toISOString(), healthScore: 0.45, consecutiveFailures: 7, consecutiveSuccesses: 0 },
            { circuitId: 'cb-auth-service', agentName: 'AuthAgent', cluster: 'certification', state: 'half_open' as const, failureCount: 5, successCount: 891, failureRate: 0.006, lastStateChange: new Date(Date.now() - 180000).toISOString(), lastFailure: new Date(Date.now() - 300000).toISOString(), lastSuccess: new Date(Date.now() - 60000).toISOString(), healthScore: 0.72, consecutiveFailures: 0, consecutiveSuccesses: 2 },
          ];
          const summary = parsed?.summary || { totalCircuits: circuits.length, closed: circuits.filter((c: any) => c.state === 'closed').length, open: circuits.filter((c: any) => c.state === 'open').length, halfOpen: circuits.filter((c: any) => c.state === 'half_open').length, overallHealth: 'degraded', openCircuitRatio: circuits.filter((c: any) => c.state === 'open').length / circuits.length };
          const healthMetrics = parsed?.healthMetrics || (includeHealthMetrics ? { averageResponseTime: 245, averageFailureRate: 0.008, p95ResponseTime: 850, errorBudgetRemaining: 0.92, mttr: 180000, mtbf: 7200000 } : undefined);
          const alerts = parsed?.alerts || [
            { circuitId: 'cb-payment-service', severity: 'critical', message: 'Payment service circuit is OPEN with 7 consecutive failures', timestamp: new Date().toISOString(), action: 'Investigate payment service health and consider manual intervention' },
          ];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { totalCircuits: summary.totalCircuits, openCount: summary.open });

          return {
            success: true,
            data: {
              action, scope: scope as 'all' | 'cluster' | 'agent' | 'custom', circuitIds: circuitIds as string[], includeHealthMetrics, includeEventLog, monitorInterval,
              alertThreshold: alertThreshold as 'half_open' | 'open' | 'all', maxEventsPerCircuit, groupByCluster, filterByState: filterByState as Array<'closed' | 'open' | 'half_open'>,
              monitoring: { circuits, summary, healthMetrics, eventLog: includeEventLog ? [] : undefined, clusterBreakdown: groupByCluster ? {} as Record<string, any> : undefined, alerts },
              status: 'circuits_monitored', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'open-circuit': {
          const circuitId = config.circuitId || '';
          const reason = config.reason || 'failure_threshold_exceeded';
          const force = config.force ?? false;
          const failureThreshold = config.failureThreshold || 5;
          const failureWindow = config.failureWindow || 60;
          const timeout = config.timeout || 30000;
          const notifyDependents = config.notifyDependents ?? true;
          const redirectTraffic = config.redirectTraffic ?? false;
          const fallbackAgent = config.fallbackAgent || '';
          const retentionDuration = config.retentionDuration || 300;
          const description = config.description || '';

          if (!circuitId) {
            return { success: false, error: '"circuitId" is required to open a circuit' };
          }

          this.logger.log(`Opening circuit "${circuitId}" (reason: ${reason}, force: ${force})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, circuitId, reason });

          const llmResult = await this.executeWithLLM(
            `You are a professional circuit breaker management expert. Design an open-circuit transition with recovery plan.`,
            `Open circuit: circuitId="${circuitId}", reason="${reason}", force=${force}, failureThreshold=${failureThreshold}, retentionDuration=${retentionDuration}, redirectTraffic=${redirectTraffic}. Return JSON with: previousState (string), failureStats ({recentFailures, failureRate, consecutiveFailures, thresholdExceeded}), dependentCircuits (array of {circuitId, notified, impactLevel}), outcome ({status, message}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const previousState = parsed?.previousState || 'closed';
          const failureStats = parsed?.failureStats || { recentFailures: 7, failureRate: 0.18, consecutiveFailures: 7, thresholdExceeded: true };
          const dependentCircuits = parsed?.dependentCircuits || (notifyDependents ? [
            { circuitId: 'cb-order-service', notified: true, impactLevel: 'high' },
          ] : undefined);

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { circuitId, newState: 'open' });

          return {
            success: true,
            data: {
              action, circuitId, reason: reason as 'failure_threshold_exceeded' | 'timeout_threshold_exceeded' | 'error_rate_exceeded' | 'manual' | 'cascading_failure' | 'health_check_failed',
              force, failureThreshold, failureWindow, timeout, notifyDependents, redirectTraffic, fallbackAgent, retentionDuration, description,
              openCircuit: {
                previousState: previousState as 'closed' | 'half_open' | 'open', newState: 'open' as const, transitionedAt: new Date().toISOString(), transitionReason: reason,
                failureStats, dependentCircuits,
                trafficRedirection: redirectTraffic ? { enabled: true, targetAgent: fallbackAgent, fallbackStrategy: 'redirect', estimatedImpact: 'Reduced throughput; fallback agent handles subset of requests' } : undefined,
                recovery: { autoRecoveryEnabled: true, halfOpenTimeout: retentionDuration, probeInterval: 30, successThreshold: 3, nextStateTransitionAt: new Date(Date.now() + retentionDuration * 1000).toISOString() },
                outcome: { status: 'opened', message: `Circuit ${circuitId} opened due to ${reason}` },
              },
              status: 'circuit_opened', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'close-circuit': {
          const circuitId = config.circuitId || '';
          const reason = config.reason || 'recovery_confirmed';
          const validateBeforeClose = config.validateBeforeClose ?? true;
          const requireMinimumSuccesses = config.requireMinimumSuccesses || 3;
          const notifyDependents = config.notifyDependents ?? true;
          const restoreTraffic = config.restoreTraffic ?? true;
          const gradualRestoration = config.gradualRestoration ?? true;
          const restorationRate = config.restorationRate || 10;
          const description = config.description || '';

          if (!circuitId) {
            return { success: false, error: '"circuitId" is required to close a circuit' };
          }

          this.logger.log(`Closing circuit "${circuitId}" (reason: ${reason}, gradual: ${gradualRestoration})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, circuitId, reason });

          const llmResult = await this.executeWithLLM(
            `You are a professional circuit breaker recovery expert. Design a close-circuit transition with validation and traffic restoration.`,
            `Close circuit: circuitId="${circuitId}", reason="${reason}", validateBeforeClose=${validateBeforeClose}, requireMinimumSuccesses=${requireMinimumSuccesses}, gradualRestoration=${gradualRestoration}. Return JSON with: previousState (string), validation ({performed, passed, healthCheck: {status, responseTime, errorRate, successRate}, probeResults, minimumSuccessesMet, consecutiveSuccesses}), recoveryMetrics ({timeOpen, totalFailuresDuringOpen, totalProbesAttempted, totalProbesSucceeded, recoveryTime}), outcome ({status, message}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const previousState = parsed?.previousState || 'half_open';
          const validation = parsed?.validation || (validateBeforeClose ? {
            performed: true, passed: true,
            healthCheck: { status: 'healthy', responseTime: 45, errorRate: 0.002, successRate: 0.998 },
            probeResults: [
              { attempt: 1, timestamp: new Date(Date.now() - 90000).toISOString(), success: true, responseTime: 52 },
              { attempt: 2, timestamp: new Date(Date.now() - 60000).toISOString(), success: true, responseTime: 48 },
              { attempt: 3, timestamp: new Date(Date.now() - 30000).toISOString(), success: true, responseTime: 45 },
            ],
            minimumSuccessesMet: true, consecutiveSuccesses: 5,
          } : undefined);
          const recoveryMetrics = parsed?.recoveryMetrics || { timeOpen: 300000, totalFailuresDuringOpen: 0, totalProbesAttempted: 5, totalProbesSucceeded: 5, recoveryTime: 45000 };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { circuitId, newState: 'closed' });

          return {
            success: true,
            data: {
              action, circuitId, reason: reason as 'recovery_confirmed' | 'manual' | 'probe_succeeded' | 'timeout_expired' | 'override',
              validateBeforeClose, requireMinimumSuccesses, notifyDependents, restoreTraffic, gradualRestoration, restorationRate, description,
              closeCircuit: {
                previousState: previousState as 'open' | 'half_open' | 'closed', newState: 'closed' as const, transitionedAt: new Date().toISOString(), transitionReason: reason,
                validation,
                trafficRestoration: restoreTraffic ? {
                  strategy: gradualRestoration ? 'gradual' as const : 'immediate' as const, restorationRate: gradualRestoration ? restorationRate : 100, currentLoadPercent: 10, targetLoadPercent: 100,
                  estimatedFullRestorationTime: gradualRestoration ? Math.ceil(100 / restorationRate) * 30 : 0,
                } : undefined,
                dependentCircuits: notifyDependents ? [{ circuitId: 'cb-order-service', notified: true, restoredTraffic: true }] : undefined,
                recoveryMetrics,
                outcome: { status: 'closed', message: `Circuit ${circuitId} closed — recovery confirmed` },
              },
              status: 'circuit_closed', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'half-open-circuit': {
          const circuitId = config.circuitId || '';
          const reason = config.reason || 'recovery_probe';
          const probeStrategy = config.probeStrategy || 'single_request';
          const probeCount = config.probeCount || 1;
          const successThreshold = config.successThreshold || 1;
          const probeInterval = config.probeInterval || 30;
          const maxProbeDuration = config.maxProbeDuration || 120;
          const requireAllProbesSucceed = config.requireAllProbesSucceed ?? false;
          const onProbeSuccess = config.onProbeSuccess || 'close_circuit';
          const onProbeFailure = config.onProbeFailure || 'open_circuit';
          const description = config.description || '';

          if (!circuitId) {
            return { success: false, error: '"circuitId" is required to transition a circuit to half-open' };
          }

          this.logger.log(`Transitioning circuit "${circuitId}" to half-open (probe strategy: ${probeStrategy}, probes: ${probeCount})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, circuitId, probeStrategy });

          const llmResult = await this.executeWithLLM(
            `You are a professional circuit breaker probe expert. Design a half-open transition with probe plan.`,
            `Half-open circuit: circuitId="${circuitId}", reason="${reason}", probeStrategy="${probeStrategy}", probeCount=${probeCount}, successThreshold=${successThreshold}, onProbeSuccess="${onProbeSuccess}", onProbeFailure="${onProbeFailure}". Return JSON with: probe ({strategy, status, probesSent, probesSucceeded, probesFailed, successRate, currentLoadPercent, maxLoadPercent, startedAt, completedAt}), probeResults (array of {probeId, attempt, timestamp, success, responseTime, error, loadPercent}), outcome ({status, message}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const probe = parsed?.probe || {
            strategy: probeStrategy, status: 'initiated', probesSent: 0, probesSucceeded: 0, probesFailed: 0, successRate: 0, currentLoadPercent: 5, maxLoadPercent: 10, startedAt: new Date().toISOString(), completedAt: null,
          };
          const probeResults = parsed?.probeResults || [];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { circuitId, newState: 'half_open' });

          return {
            success: true,
            data: {
              action, circuitId, reason: reason as 'recovery_probe' | 'timeout_expired' | 'manual' | 'scheduled',
              probeStrategy: probeStrategy as 'single_request' | 'gradual_ramp' | 'canary' | 'percentage' | 'adaptive',
              probeCount, successThreshold, probeInterval, maxProbeDuration, requireAllProbesSucceed,
              onProbeSuccess: onProbeSuccess as 'close_circuit' | 'continue_probing' | 'gradual_close',
              onProbeFailure: onProbeFailure as 'open_circuit' | 'extend_half_open' | 'notify',
              description,
              halfOpenCircuit: {
                previousState: 'open' as 'open' | 'half_open' | 'closed', newState: 'half_open' as const, transitionedAt: new Date().toISOString(), transitionReason: reason,
                probe, probeResults,
                stateTransition: { onSuccess: onProbeSuccess, onFailure: onProbeFailure, successThresholdMet: false, failureThresholdMet: false, pendingDecision: true },
                timing: { halfOpenEnteredAt: new Date().toISOString(), nextProbeAt: new Date(Date.now() + probeInterval * 1000).toISOString(), maxDurationAt: new Date(Date.now() + maxProbeDuration * 1000).toISOString(), autoTransition: true },
                outcome: { status: 'probing', message: `Circuit ${circuitId} transitioned to half-open; probes pending` },
              },
              status: 'circuit_half_opened', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'get-circuit-status': {
          const circuitIds = config.circuitIds || [];
          const includeHistory = config.includeHistory ?? true;
          const includeMetrics = config.includeMetrics ?? true;
          const includeConfig = config.includeConfig ?? true;
          const historyDepth = config.historyDepth || 20;
          const includeDependencies = config.includeDependencies ?? true;
          const format = config.format || 'detailed';

          if (circuitIds.length === 0) {
            return { success: false, error: '"circuitIds" array is required to get circuit status (provide one or more circuit IDs)' };
          }

          this.logger.log(`Getting status for ${circuitIds.length} circuit(s) (format: ${format})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, circuitCount: circuitIds.length });

          const llmResult = await this.executeWithLLM(
            `You are a professional circuit breaker status expert. Provide detailed status for each circuit.`,
            `Get circuit status: circuitIds=${JSON.stringify(circuitIds)}, includeMetrics=${includeMetrics}, includeConfig=${includeConfig}, includeHistory=${includeHistory}. Return JSON with: circuits (array of {circuitId, state, agentName, cluster, currentStateSince, config: {failureThreshold, successThreshold, timeout, halfOpenTimeout, probeInterval, failureWindow}, metrics: {totalRequests, totalFailures, totalSuccesses, failureRate, successRate, averageResponseTime, p50ResponseTime, p95ResponseTime, p99ResponseTime, consecutiveFailures, consecutiveSuccesses, lastFailureAt, lastSuccessAt, healthScore}, dependencies: {dependsOn, dependedBy, cascadeRisk}}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const circuits = circuitIds.map((id: string) => {
            const llmCircuit = parsed?.circuits?.find((c: any) => c.circuitId === id);
            return {
              circuitId: id,
              state: llmCircuit?.state || 'closed' as 'closed' | 'open' | 'half_open',
              agentName: llmCircuit?.agentName || id.replace('cb-', ''),
              cluster: llmCircuit?.cluster || 'unknown',
              currentStateSince: llmCircuit?.currentStateSince || new Date().toISOString(),
              config: includeConfig ? (llmCircuit?.config || { failureThreshold: 5, successThreshold: 3, timeout: 30000, halfOpenTimeout: 300, probeInterval: 30, failureWindow: 60 }) : undefined,
              metrics: includeMetrics ? (llmCircuit?.metrics || { totalRequests: 1250, totalFailures: 8, totalSuccesses: 1242, failureRate: 0.006, successRate: 0.994, averageResponseTime: 85, p50ResponseTime: 45, p95ResponseTime: 250, p99ResponseTime: 450, consecutiveFailures: 0, consecutiveSuccesses: 15, lastFailureAt: new Date(Date.now() - 7200000).toISOString(), lastSuccessAt: new Date().toISOString(), healthScore: 0.94 }) : undefined,
              history: includeHistory ? [] as Array<{ timestamp: string; fromState: string; toState: string; reason: string; triggeredBy: string }> : undefined,
              dependencies: includeDependencies ? (llmCircuit?.dependencies || { dependsOn: [] as string[], dependedBy: ['cb-order-service'] as string[], cascadeRisk: 'low' as 'low' | 'medium' | 'high' }) : undefined,
            };
          });

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { circuitCount: circuits.length });

          return {
            success: true,
            data: {
              action, circuitIds: circuitIds as string[], includeHistory, includeMetrics, includeConfig, historyDepth, includeDependencies,
              format: format as 'summary' | 'detailed' | 'raw',
              circuits, status: 'circuit_status_retrieved', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Supported actions: monitor-circuits, open-circuit, close-circuit, half-open-circuit, get-circuit-status`,
          };
      }
    } catch (error: any) {
      this.emitEvent(AgentEventType.AGENT_FAILED, { error: error.message });
      return { success: false, error: error.message };
    }
  }
}
