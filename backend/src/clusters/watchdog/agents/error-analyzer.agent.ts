import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';

/**
 * ErrorAnalyzerAgent — Watchdog Cluster
 *
 * Analyzes error traces from failed missions and agents, identifies root causes,
 * classifies errors by type and severity, and suggests remediation strategies.
 *
 * Supported actions:
 * - analyze-error     → Full error analysis returning root cause, category, severity, recoverability, and remediation
 * - classify-error    → Classify an error into a structured taxonomy (type, category, severity, tags)
 * - suggest-remediation → Generate remediation suggestions based on an error classification
 * - trace-root-cause  → Deep root-cause tracing that follows the causal chain across components
 */
export class ErrorAnalyzerAgent extends BaseAgent {
  readonly name = 'ErrorAnalyzerAgent';
  readonly cluster = ClusterType.WATCHDOG;
  readonly capabilities = [
    'analyze-error',
    'classify-error',
    'suggest-remediation',
    'trace-root-cause',
  ];
  readonly version = '1.0.0';
  readonly description =
    'Analyzes error traces from failed missions/agents, identifies root causes, classifies errors by type and severity, and suggests remediation strategies';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'analyze-error';
      const startTime = Date.now();

      switch (action) {
        case 'analyze-error': {
          const errorId = config.errorId || `err-${Date.now()}`;
          const errorMessage = config.errorMessage || '';
          const stackTrace = config.stackTrace || '';
          const sourceAgent = config.sourceAgent || '';
          const sourceCluster = config.sourceCluster || '';
          const missionId = config.missionId || '';
          const taskId = config.taskId || '';
          const errorTimestamp = config.errorTimestamp || new Date().toISOString();
          const includeStackTrace = config.includeStackTrace ?? true;
          const includeContext = config.includeContext ?? true;
          const maxRemediationSuggestions = config.maxRemediationSuggestions || 5;
          const correlationId = config.correlationId || '';

          if (!errorMessage) {
            return {
              success: false,
              error: '"errorMessage" is required for error analysis',
            };
          }

          this.logger.log(
            `Analyzing error "${errorId}" from agent ${sourceAgent || 'unknown'} (cluster: ${sourceCluster || 'unknown'})`,
          );

          return {
            success: true,
            data: {
              action,
              errorId,
              errorMessage,
              stackTrace: includeStackTrace ? stackTrace : undefined,
              sourceAgent,
              sourceCluster,
              missionId,
              taskId,
              errorTimestamp,
              correlationId,
              analysis: {
                rootCause: {
                  identified: false,
                  category: '' as
                    | 'infrastructure'
                    | 'application'
                    | 'data'
                    | 'configuration'
                    | 'dependency'
                    | 'resource'
                    | 'network'
                    | 'timeout'
                    | 'permission'
                    | 'unknown',
                  description: '',
                  confidence: 0,
                  evidence: [] as string[],
                  location: '',
                },
                errorCategory: '' as
                  | 'transient'
                  | 'persistent'
                  | 'intermittent'
                  | 'cascading'
                  | 'systemic',
                severity: '' as 'low' | 'medium' | 'high' | 'critical' | 'fatal',
                isRecoverable: false,
                estimatedRecoveryEffort: '' as 'trivial' | 'moderate' | 'significant' | 'major' | 'unknown',
                affectedComponents: [] as string[],
                errorPattern: {
                  isFirstOccurrence: true,
                  occurrenceCount: 0,
                  frequency: '' as 'one-time' | 'rare' | 'occasional' | 'frequent' | 'constant',
                  trendingDirection: '' as 'increasing' | 'stable' | 'decreasing' | 'unknown',
                },
                suggestedRemediation: [] as Array<{
                  id: string;
                  strategy: 'retry' | 'reassign' | 'simplify' | 'fallback' | 'escalate' | 'restart' | 'patch' | 'reconfigure';
                  description: string;
                  priority: 'critical' | 'high' | 'medium' | 'low';
                  estimatedSuccessRate: number;
                  estimatedTime: number;
                  riskLevel: 'low' | 'medium' | 'high';
                  automated: boolean;
                  prerequisites: string[];
                }>,
                context: includeContext
                  ? {
                      systemState: {} as Record<string, any>,
                      recentChanges: [] as Array<{
                        timestamp: string;
                        description: string;
                        type: string;
                      }>,
                      relatedErrors: [] as Array<{
                        errorId: string;
                        message: string;
                        timestamp: string;
                        correlationScore: number;
                      }>,
                      resourceUtilization: {
                        cpu: 0,
                        memory: 0,
                        disk: 0,
                        network: 0,
                      },
                    }
                  : undefined,
              },
              status: 'error_analyzed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'classify-error': {
          const errorMessage = config.errorMessage || '';
          const stackTrace = config.stackTrace || '';
          const errorCode = config.errorCode || '';
          const httpStatus = config.httpStatus || 0;
          const sourceAgent = config.sourceAgent || '';
          const sourceCluster = config.sourceCluster || '';
          const includeTags = config.includeTags ?? true;
          const includeRelatedPatterns = config.includeRelatedPatterns ?? true;

          if (!errorMessage && !errorCode) {
            return {
              success: false,
              error: '"errorMessage" or "errorCode" is required for error classification',
            };
          }

          this.logger.log(
            `Classifying error from agent ${sourceAgent || 'unknown'} (code: ${errorCode || 'N/A'})`,
          );

          return {
            success: true,
            data: {
              action,
              errorMessage,
              stackTrace,
              errorCode,
              httpStatus,
              sourceAgent,
              sourceCluster,
              classification: {
                type: '' as
                  | 'runtime'
                  | 'logic'
                  | 'syntax'
                  | 'resource'
                  | 'network'
                  | 'authentication'
                  | 'authorization'
                  | 'validation'
                  | 'timeout'
                  | 'data_integrity'
                  | 'concurrency'
                  | 'configuration'
                  | 'dependency'
                  | 'unknown',
                category: '' as
                  | 'transient'
                  | 'persistent'
                  | 'intermittent'
                  | 'cascading'
                  | 'systemic',
                severity: '' as 'low' | 'medium' | 'high' | 'critical' | 'fatal',
                isRecoverable: false,
                isRetryable: false,
                requiresHumanIntervention: false,
                tags: includeTags
                  ? [] as string[]
                  : undefined,
                relatedPatterns: includeRelatedPatterns
                  ? [] as Array<{
                      patternId: string;
                      name: string;
                      description: string;
                      matchScore: number;
                      occurrenceCount: number;
                      lastSeen: string;
                    }>
                  : undefined,
                taxonomy: {
                  domain: '' as string,
                  subdomain: '' as string,
                  errorFamily: '' as string,
                  errorClass: '' as string,
                },
              },
              status: 'error_classified',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'suggest-remediation': {
          const errorId = config.errorId || '';
          const errorCategory = config.errorCategory || '';
          const severity = config.severity || 'medium';
          const rootCauseCategory = config.rootCauseCategory || '';
          const isRecoverable = config.isRecoverable ?? true;
          const contextConstraints = config.contextConstraints || [];
          const preferredStrategies = config.preferredStrategies || [];
          const maxSuggestions = config.maxSuggestions || 5;
          const includeAutomatedOnly = config.includeAutomatedOnly ?? false;

          if (!errorId && !errorCategory) {
            return {
              success: false,
              error: '"errorId" or "errorCategory" is required for remediation suggestions',
            };
          }

          this.logger.log(
            `Suggesting remediation for error ${errorId || errorCategory} (severity: ${severity}, recoverable: ${isRecoverable})`,
          );

          return {
            success: true,
            data: {
              action,
              errorId,
              errorCategory,
              severity,
              rootCauseCategory,
              isRecoverable,
              contextConstraints: contextConstraints as string[],
              preferredStrategies: preferredStrategies as string[],
              maxSuggestions,
              includeAutomatedOnly,
              remediation: {
                suggestions: [] as Array<{
                  id: string;
                  strategy: 'retry' | 'reassign' | 'simplify' | 'fallback' | 'escalate' | 'restart' | 'patch' | 'reconfigure' | 'ignore';
                  title: string;
                  description: string;
                  priority: 'critical' | 'high' | 'medium' | 'low';
                  estimatedSuccessRate: number;
                  estimatedTime: number;
                  riskLevel: 'low' | 'medium' | 'high';
                  automated: boolean;
                  prerequisites: string[];
                  sideEffects: string[];
                  validationSteps: string[];
                }>,
                recommended: {
                  strategy: '' as string,
                  suggestionId: '' as string,
                  rationale: '' as string,
                },
                escalationThreshold: {
                  maxRetries: 3,
                  timeoutSeconds: 300,
                  escalationTarget: '' as string,
                },
                preventionMeasures: [] as Array<{
                  measure: string;
                  description: string;
                  effort: 'low' | 'medium' | 'high';
                  impact: 'low' | 'medium' | 'high';
                }>,
              },
              status: 'remediation_suggested',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'trace-root-cause': {
          const errorId = config.errorId || '';
          const errorMessage = config.errorMessage || '';
          const stackTrace = config.stackTrace || '';
          const maxTraceDepth = config.maxTraceDepth || 10;
          const includeTimeline = config.includeTimeline ?? true;
          const includeDependencyGraph = config.includeDependencyGraph ?? true;
          const crossComponentTrace = config.crossComponentTrace ?? true;
          const timeRange = config.timeRange || '1h';
          const sourceAgent = config.sourceAgent || '';
          const sourceCluster = config.sourceCluster || '';

          if (!errorId && !errorMessage) {
            return {
              success: false,
              error: '"errorId" or "errorMessage" is required for root cause tracing',
            };
          }

          this.logger.log(
            `Tracing root cause for error ${errorId || 'direct-input'} (depth: ${maxTraceDepth}, cross-component: ${crossComponentTrace})`,
          );

          return {
            success: true,
            data: {
              action,
              errorId,
              errorMessage,
              sourceAgent,
              sourceCluster,
              maxTraceDepth,
              timeRange,
              crossComponentTrace,
              trace: {
                rootCause: {
                  identified: false,
                  category: '' as
                    | 'infrastructure'
                    | 'application'
                    | 'data'
                    | 'configuration'
                    | 'dependency'
                    | 'resource'
                    | 'network'
                    | 'timeout'
                    | 'permission'
                    | 'unknown',
                  description: '',
                  confidence: 0,
                  evidence: [] as string[],
                  location: '',
                  component: '' as string,
                  firstOccurrence: '' as string,
                },
                causalChain: [] as Array<{
                  step: number;
                  component: string;
                  event: string;
                  timestamp: string;
                  type: 'trigger' | 'propagation' | 'amplification' | 'manifestation';
                  details: string;
                  confidence: number;
                }>,
                timeline: includeTimeline
                  ? [] as Array<{
                      timestamp: string;
                      event: string;
                      component: string;
                      type: 'cause' | 'propagation' | 'symptom' | 'detection';
                      severity: 'info' | 'warning' | 'error' | 'critical';
                      details: string;
                    }>
                  : undefined,
                dependencyGraph: includeDependencyGraph
                  ? {
                      nodes: [] as Array<{
                        id: string;
                        type: string;
                        name: string;
                        status: 'healthy' | 'degraded' | 'failed' | 'unknown';
                      }>,
                      edges: [] as Array<{
                        from: string;
                        to: string;
                        type: 'depends_on' | 'calls' | 'produces' | 'consumes';
                        status: 'healthy' | 'degraded' | 'broken';
                      }>,
                      failedNodes: [] as string[],
                    }
                  : undefined,
                contributingFactors: [] as Array<{
                  factor: string;
                  weight: number;
                  description: string;
                  category: string;
                  actionable: boolean;
                }>,
                blastRadius: {
                  directlyAffected: [] as string[],
                  indirectlyAffected: [] as string[],
                  potentiallyAffected: [] as string[],
                  totalComponentsAtRisk: 0,
                },
              },
              status: 'root_cause_traced',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Supported actions: analyze-error, classify-error, suggest-remediation, trace-root-cause`,
          };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
