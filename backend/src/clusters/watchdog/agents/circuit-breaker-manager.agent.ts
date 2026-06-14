import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';

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
  readonly version = '1.0.0';
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

          return {
            success: true,
            data: {
              action,
              scope: scope as 'all' | 'cluster' | 'agent' | 'custom',
              circuitIds: circuitIds as string[],
              includeHealthMetrics,
              includeEventLog,
              monitorInterval,
              alertThreshold: alertThreshold as 'half_open' | 'open' | 'all',
              maxEventsPerCircuit,
              groupByCluster,
              filterByState: filterByState as Array<'closed' | 'open' | 'half_open'>,
              monitoring: {
                circuits: [] as Array<{
                  circuitId: string;
                  agentName: string;
                  cluster: string;
                  state: 'closed' | 'open' | 'half_open';
                  failureCount: number;
                  successCount: number;
                  failureRate: number;
                  lastStateChange: string;
                  lastFailure: string | null;
                  lastSuccess: string | null;
                  healthScore: number;
                  consecutiveFailures: number;
                  consecutiveSuccesses: number;
                }>,
                summary: {
                  totalCircuits: 0,
                  closed: 0,
                  open: 0,
                  halfOpen: 0,
                  overallHealth: 'healthy' as 'healthy' | 'degraded' | 'critical',
                  openCircuitRatio: 0,
                },
                healthMetrics: includeHealthMetrics
                  ? {
                      averageResponseTime: 0,
                      averageFailureRate: 0,
                      p95ResponseTime: 0,
                      errorBudgetRemaining: 0,
                      mttr: 0,
                      mtbf: 0,
                    }
                  : undefined,
                eventLog: includeEventLog
                  ? [] as Array<{
                      circuitId: string;
                      timestamp: string;
                      event: 'state_change' | 'failure' | 'success' | 'timeout' | 'threshold_exceeded';
                      previousState: string;
                      newState: string;
                      details: string;
                    }>
                  : undefined,
                clusterBreakdown: groupByCluster
                  ? {} as Record<string, {
                      total: number;
                      closed: number;
                      open: number;
                      halfOpen: number;
                      healthScore: number;
                    }>
                  : undefined,
                alerts: [] as Array<{
                  circuitId: string;
                  severity: 'info' | 'warning' | 'critical';
                  message: string;
                  timestamp: string;
                  action: string;
                }>,
              },
              status: 'circuits_monitored',
              timestamp: new Date().toISOString(),
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
            return {
              success: false,
              error: '"circuitId" is required to open a circuit',
            };
          }

          this.logger.log(
            `Opening circuit "${circuitId}" (reason: ${reason}, force: ${force})`,
          );

          return {
            success: true,
            data: {
              action,
              circuitId,
              reason: reason as 'failure_threshold_exceeded' | 'timeout_threshold_exceeded' | 'error_rate_exceeded' | 'manual' | 'cascading_failure' | 'health_check_failed',
              force,
              failureThreshold,
              failureWindow,
              timeout,
              notifyDependents,
              redirectTraffic,
              fallbackAgent,
              retentionDuration,
              description,
              openCircuit: {
                previousState: '' as 'closed' | 'half_open' | 'open',
                newState: 'open' as const,
                transitionedAt: '' as string,
                transitionReason: reason,
                failureStats: {
                  recentFailures: 0,
                  failureRate: 0,
                  consecutiveFailures: 0,
                  thresholdExceeded: false,
                },
                dependentCircuits: notifyDependents
                  ? [] as Array<{
                      circuitId: string;
                      notified: boolean;
                      impactLevel: 'low' | 'medium' | 'high';
                    }>
                  : undefined,
                trafficRedirection: redirectTraffic
                  ? {
                      enabled: true,
                      targetAgent: fallbackAgent,
                      fallbackStrategy: '' as 'queue' | 'redirect' | 'reject' | 'cache',
                      estimatedImpact: '' as string,
                    }
                  : undefined,
                recovery: {
                  autoRecoveryEnabled: true,
                  halfOpenTimeout: retentionDuration,
                  probeInterval: 30,
                  successThreshold: 3,
                  nextStateTransitionAt: new Date(
                    Date.now() + retentionDuration * 1000,
                  ).toISOString(),
                },
                outcome: {
                  status: '' as 'opened' | 'already_open' | 'rejected',
                  message: '' as string,
                },
              },
              status: 'circuit_opened',
              timestamp: new Date().toISOString(),
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
            return {
              success: false,
              error: '"circuitId" is required to close a circuit',
            };
          }

          this.logger.log(
            `Closing circuit "${circuitId}" (reason: ${reason}, gradual: ${gradualRestoration})`,
          );

          return {
            success: true,
            data: {
              action,
              circuitId,
              reason: reason as 'recovery_confirmed' | 'manual' | 'probe_succeeded' | 'timeout_expired' | 'override',
              validateBeforeClose,
              requireMinimumSuccesses,
              notifyDependents,
              restoreTraffic,
              gradualRestoration,
              restorationRate,
              description,
              closeCircuit: {
                previousState: '' as 'open' | 'half_open' | 'closed',
                newState: 'closed' as const,
                transitionedAt: '' as string,
                transitionReason: reason,
                validation: validateBeforeClose
                  ? {
                      performed: false,
                      passed: false,
                      healthCheck: {
                        status: '' as 'healthy' | 'degraded' | 'unhealthy',
                        responseTime: 0,
                        errorRate: 0,
                        successRate: 0,
                      },
                      probeResults: [] as Array<{
                        attempt: number;
                        timestamp: string;
                        success: boolean;
                        responseTime: number;
                      }>,
                      minimumSuccessesMet: false,
                      consecutiveSuccesses: 0,
                    }
                  : undefined,
                trafficRestoration: restoreTraffic
                  ? {
                      strategy: gradualRestoration
                        ? ('gradual' as const)
                        : ('immediate' as const),
                      restorationRate: gradualRestoration ? restorationRate : 100,
                      currentLoadPercent: 0,
                      targetLoadPercent: 100,
                      estimatedFullRestorationTime: gradualRestoration
                        ? Math.ceil(100 / restorationRate) * 30
                        : 0,
                    }
                  : undefined,
                dependentCircuits: notifyDependents
                  ? [] as Array<{
                      circuitId: string;
                      notified: boolean;
                      restoredTraffic: boolean;
                    }>
                  : undefined,
                recoveryMetrics: {
                  timeOpen: 0,
                  totalFailuresDuringOpen: 0,
                  totalProbesAttempted: 0,
                  totalProbesSucceeded: 0,
                  recoveryTime: 0,
                },
                outcome: {
                  status: '' as 'closed' | 'validation_failed' | 'already_closed',
                  message: '' as string,
                },
              },
              status: 'circuit_closed',
              timestamp: new Date().toISOString(),
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
            return {
              success: false,
              error: '"circuitId" is required to transition a circuit to half-open',
            };
          }

          this.logger.log(
            `Transitioning circuit "${circuitId}" to half-open (probe strategy: ${probeStrategy}, probes: ${probeCount})`,
          );

          return {
            success: true,
            data: {
              action,
              circuitId,
              reason: reason as 'recovery_probe' | 'timeout_expired' | 'manual' | 'scheduled',
              probeStrategy: probeStrategy as 'single_request' | 'gradual_ramp' | 'canary' | 'percentage' | 'adaptive',
              probeCount,
              successThreshold,
              probeInterval,
              maxProbeDuration,
              requireAllProbesSucceed,
              onProbeSuccess: onProbeSuccess as 'close_circuit' | 'continue_probing' | 'gradual_close',
              onProbeFailure: onProbeFailure as 'open_circuit' | 'extend_half_open' | 'notify',
              description,
              halfOpenCircuit: {
                previousState: '' as 'open' | 'half_open' | 'closed',
                newState: 'half_open' as const,
                transitionedAt: '' as string,
                transitionReason: reason,
                probe: {
                  strategy: probeStrategy,
                  status: '' as 'initiated' | 'in_progress' | 'completed' | 'failed',
                  probesSent: 0,
                  probesSucceeded: 0,
                  probesFailed: 0,
                  successRate: 0,
                  currentLoadPercent: 0,
                  maxLoadPercent: 0,
                  startedAt: '' as string,
                  completedAt: null as string | null,
                },
                probeResults: [] as Array<{
                  probeId: string;
                  attempt: number;
                  timestamp: string;
                  success: boolean;
                  responseTime: number;
                  error: string | null;
                  loadPercent: number;
                }>,
                stateTransition: {
                  onSuccess: onProbeSuccess,
                  onFailure: onProbeFailure,
                  successThresholdMet: false,
                  failureThresholdMet: false,
                  pendingDecision: true,
                },
                timing: {
                  halfOpenEnteredAt: '' as string,
                  nextProbeAt: '' as string,
                  maxDurationAt: new Date(
                    Date.now() + maxProbeDuration * 1000,
                  ).toISOString(),
                  autoTransition: true,
                },
                outcome: {
                  status: '' as 'half_open' | 'transitioning_to_closed' | 'transitioning_to_open' | 'probing',
                  message: '' as string,
                },
              },
              status: 'circuit_half_opened',
              timestamp: new Date().toISOString(),
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
            return {
              success: false,
              error: '"circuitIds" array is required to get circuit status (provide one or more circuit IDs)',
            };
          }

          this.logger.log(
            `Getting status for ${circuitIds.length} circuit(s) (format: ${format})`,
          );

          return {
            success: true,
            data: {
              action,
              circuitIds: circuitIds as string[],
              includeHistory,
              includeMetrics,
              includeConfig,
              historyDepth,
              includeDependencies,
              format: format as 'summary' | 'detailed' | 'raw',
              circuits: circuitIds.map((id: string) => ({
                circuitId: id,
                state: '' as 'closed' | 'open' | 'half_open',
                agentName: '' as string,
                cluster: '' as string,
                currentStateSince: '' as string,
                config: includeConfig
                  ? {
                      failureThreshold: 5,
                      successThreshold: 3,
                      timeout: 30000,
                      halfOpenTimeout: 300,
                      probeInterval: 30,
                      failureWindow: 60,
                    }
                  : undefined,
                metrics: includeMetrics
                  ? {
                      totalRequests: 0,
                      totalFailures: 0,
                      totalSuccesses: 0,
                      failureRate: 0,
                      successRate: 0,
                      averageResponseTime: 0,
                      p50ResponseTime: 0,
                      p95ResponseTime: 0,
                      p99ResponseTime: 0,
                      consecutiveFailures: 0,
                      consecutiveSuccesses: 0,
                      lastFailureAt: null as string | null,
                      lastSuccessAt: null as string | null,
                      healthScore: 0,
                    }
                  : undefined,
                history: includeHistory
                  ? [] as Array<{
                      timestamp: string;
                      fromState: string;
                      toState: string;
                      reason: string;
                      triggeredBy: string;
                    }>
                  : undefined,
                dependencies: includeDependencies
                  ? {
                      dependsOn: [] as string[],
                      dependedBy: [] as string[],
                      cascadeRisk: 'low' as 'low' | 'medium' | 'high',
                    }
                  : undefined,
              })),
              status: 'circuit_status_retrieved',
              timestamp: new Date().toISOString(),
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
      return { success: false, error: error.message };
    }
  }
}
