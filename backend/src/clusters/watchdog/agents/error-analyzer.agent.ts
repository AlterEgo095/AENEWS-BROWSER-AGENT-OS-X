import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * ErrorAnalyzerAgent — LLM-powered error analysis for the Watchdog Cluster.
 *
 * Analyzes error traces from failed missions and agents, identifies root causes,
 * classifies errors by type and severity, and suggests remediation strategies.
 *
 * When LLM is available: Uses real LLM calls for intelligent error diagnosis
 * and root cause analysis.
 * Falls back to pattern-matching and heuristic analysis when LLM is unavailable.
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
  readonly version = '2.0.0';
  readonly description =
    'LLM-powered error analysis: identifies root causes, classifies errors by type and severity, and suggests remediation strategies';

  readonly missionCategories = [MissionCategory.INFRASTRUCTURE_MGMT, MissionCategory.AI_ORCHESTRATION];
  readonly creditCost = 1;
  readonly powerLevel = 1;
  readonly tier = 'standard';

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

          if (!errorMessage) {
            return { success: false, error: '"errorMessage" is required for error analysis' };
          }

          this.logger.log(
            `Analyzing error "${errorId}" from agent ${sourceAgent || 'unknown'} (cluster: ${sourceCluster || 'unknown'})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, errorId, sourceAgent });

          // Try LLM-powered error analysis
          const llmResult = await this.executeWithLLM(
            `You are an error analysis expert. Analyze the following error and provide a comprehensive diagnosis.
Return a JSON object with this exact structure:
{
  "rootCause": {
    "identified": true,
    "category": "infrastructure|application|data|configuration|dependency|resource|network|timeout|permission|unknown",
    "type": "timeout|connection-refused|auth-failure|null-pointer|out-of-memory|stack-overflow|data-corruption|misconfiguration|unknown",
    "description": "...",
    "confidence": 0.91,
    "evidence": ["..."],
    "location": "..."
  },
  "errorCategory": "transient|persistent|intermittent|cascading|systemic",
  "severity": "low|medium|high|critical|fatal",
  "isRecoverable": true,
  "estimatedRecoveryEffort": "trivial|moderate|significant|major|unknown",
  "affectedComponents": ["..."],
  "suggestedRemediation": [
    { "id": "rem-1", "strategy": "retry|reassign|simplify|fallback|escalate|restart|patch|reconfigure", "description": "...", "priority": "critical|high|medium|low", "estimatedSuccessRate": 0.85, "estimatedTime": 5000, "riskLevel": "low|medium|high", "automated": true, "prerequisites": [] }
  ]
}`,
            `Error ID: ${errorId}\nError message: ${errorMessage}\nStack trace: ${stackTrace.slice(0, 3000)}\nSource agent: ${sourceAgent}\nSource cluster: ${sourceCluster}\nMission ID: ${missionId}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.rootCause) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, errorId, category: parsed.rootCause.category, severity: parsed.severity });
              return {
                success: true,
                data: {
                  action,
                  errorId,
                  errorMessage,
                  stackTrace: config.includeStackTrace ?? true ? stackTrace : undefined,
                  sourceAgent,
                  sourceCluster,
                  missionId,
                  taskId: config.taskId || '',
                  errorTimestamp: config.errorTimestamp || new Date().toISOString(),
                  correlationId: config.correlationId || '',
                  analysis: {
                    rootCause: parsed.rootCause,
                    errorCategory: parsed.errorCategory || 'unknown',
                    severity: parsed.severity || 'medium',
                    isRecoverable: parsed.isRecoverable ?? true,
                    estimatedRecoveryEffort: parsed.estimatedRecoveryEffort || 'unknown',
                    affectedComponents: parsed.affectedComponents || [],
                    suggestedRemediation: parsed.suggestedRemediation || [],
                    context: (config.includeContext ?? true)
                      ? {
                          systemState: {},
                          recentChanges: [],
                          relatedErrors: [],
                          resourceUtilization: { cpu: 0, memory: 0, disk: 0, network: 0 },
                        }
                      : undefined,
                  },
                  status: 'error_analyzed',
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          // Fallback: pattern-based analysis
          this.logger.log('LLM unavailable — falling back to pattern-based error analysis');
          const patternAnalysis = this.patternBasedAnalysis(errorMessage, stackTrace);
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, errorId, source: 'fallback' });
          return {
            success: true,
            data: {
              action,
              errorId,
              errorMessage,
              stackTrace: config.includeStackTrace ?? true ? stackTrace : undefined,
              sourceAgent,
              sourceCluster,
              missionId,
              taskId: config.taskId || '',
              errorTimestamp: config.errorTimestamp || new Date().toISOString(),
              correlationId: config.correlationId || '',
              analysis: patternAnalysis,
              status: 'error_analyzed',
              generatedBy: 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'classify-error': {
          const errorMessage = config.errorMessage || '';
          const stackTrace = config.stackTrace || '';
          const errorCode = config.errorCode || '';

          if (!errorMessage && !errorCode) {
            return { success: false, error: '"errorMessage" or "errorCode" is required for error classification' };
          }

          this.logger.log(`Classifying error from agent ${config.sourceAgent || 'unknown'}`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action });

          const llmResult = await this.executeWithLLM(
            `You are an error classification expert. Classify the following error into a structured taxonomy.
Return a JSON object with this structure:
{
  "type": "runtime|logic|syntax|resource|network|authentication|authorization|validation|timeout|data_integrity|concurrency|configuration|dependency|unknown",
  "category": "transient|persistent|intermittent|cascading|systemic",
  "severity": "low|medium|high|critical|fatal",
  "isRecoverable": true,
  "isRetryable": true,
  "requiresHumanIntervention": false,
  "tags": ["..."],
  "taxonomy": {
    "domain": "...",
    "subdomain": "...",
    "errorFamily": "...",
    "errorClass": "..."
  }
}`,
            `Error message: ${errorMessage}\nError code: ${errorCode}\nStack trace: ${stackTrace.slice(0, 2000)}\nHTTP status: ${config.httpStatus || 'N/A'}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.type) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, type: parsed.type, severity: parsed.severity });
              return {
                success: true,
                data: {
                  action,
                  errorMessage,
                  stackTrace,
                  errorCode,
                  httpStatus: config.httpStatus || 0,
                  sourceAgent: config.sourceAgent || '',
                  sourceCluster: config.sourceCluster || '',
                  classification: {
                    type: parsed.type,
                    category: parsed.category || 'unknown',
                    severity: parsed.severity || 'medium',
                    isRecoverable: parsed.isRecoverable ?? true,
                    isRetryable: parsed.isRetryable ?? false,
                    requiresHumanIntervention: parsed.requiresHumanIntervention ?? false,
                    tags: parsed.tags || [],
                    relatedPatterns: config.includeRelatedPatterns ?? true ? [] : undefined,
                    taxonomy: parsed.taxonomy || { domain: '', subdomain: '', errorFamily: '', errorClass: '' },
                  },
                  status: 'error_classified',
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          // Fallback: regex-based classification
          this.logger.log('LLM unavailable — falling back to regex-based classification');
          const classification = this.regexBasedClassification(errorMessage, errorCode);
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action,
              errorMessage,
              stackTrace,
              errorCode,
              httpStatus: config.httpStatus || 0,
              sourceAgent: config.sourceAgent || '',
              sourceCluster: config.sourceCluster || '',
              classification,
              status: 'error_classified',
              generatedBy: 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'suggest-remediation': {
          const errorId = config.errorId || '';
          const errorCategory = config.errorCategory || '';
          const severity = config.severity || 'medium';
          const rootCauseCategory = config.rootCauseCategory || '';
          const isRecoverable = config.isRecoverable ?? true;

          if (!errorId && !errorCategory) {
            return { success: false, error: '"errorId" or "errorCategory" is required for remediation suggestions' };
          }

          this.logger.log(
            `Suggesting remediation for error ${errorId || errorCategory} (severity: ${severity})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, errorId, severity });

          const llmResult = await this.executeWithLLM(
            `You are a remediation expert. Generate specific remediation suggestions for the given error.
Return a JSON object with this structure:
{
  "suggestions": [
    { "id": "rem-1", "strategy": "retry|reassign|simplify|fallback|escalate|restart|patch|reconfigure|ignore", "title": "...", "description": "...", "priority": "critical|high|medium|low", "estimatedSuccessRate": 0.85, "estimatedTime": 5000, "riskLevel": "low|medium|high", "automated": true, "prerequisites": [], "sideEffects": [], "validationSteps": [] }
  ],
  "recommended": { "strategy": "...", "suggestionId": "...", "rationale": "..." },
  "preventionMeasures": [
    { "measure": "...", "description": "...", "effort": "low|medium|high", "impact": "low|medium|high" }
  ]
}`,
            `Error ID: ${errorId}\nError category: ${errorCategory}\nSeverity: ${severity}\nRoot cause: ${rootCauseCategory}\nRecoverable: ${isRecoverable}\nConstraints: ${JSON.stringify(config.contextConstraints || [])}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.suggestions) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, suggestionCount: parsed.suggestions.length });
              return {
                success: true,
                data: {
                  action,
                  errorId,
                  errorCategory,
                  severity,
                  rootCauseCategory,
                  isRecoverable,
                  contextConstraints: config.contextConstraints || [],
                  preferredStrategies: config.preferredStrategies || [],
                  maxSuggestions: config.maxSuggestions || 5,
                  includeAutomatedOnly: config.includeAutomatedOnly ?? false,
                  remediation: {
                    suggestions: parsed.suggestions,
                    recommended: parsed.recommended || { strategy: '', suggestionId: '', rationale: '' },
                    escalationThreshold: { maxRetries: 3, timeoutSeconds: 300, escalationTarget: '' },
                    preventionMeasures: parsed.preventionMeasures || [],
                  },
                  status: 'remediation_suggested',
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          // Fallback
          this.logger.log('LLM unavailable — falling back to template remediation');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action,
              errorId,
              errorCategory,
              severity,
              rootCauseCategory,
              isRecoverable,
              contextConstraints: config.contextConstraints || [],
              preferredStrategies: config.preferredStrategies || [],
              maxSuggestions: config.maxSuggestions || 5,
              includeAutomatedOnly: config.includeAutomatedOnly ?? false,
              remediation: {
                suggestions: isRecoverable
                  ? [{ id: 'rem-1', strategy: 'retry' as const, title: 'Retry the operation', description: 'Retry the failed operation with exponential backoff', priority: 'high' as const, estimatedSuccessRate: 0.7, estimatedTime: 10000, riskLevel: 'low' as const, automated: true, prerequisites: [] as string[], sideEffects: [] as string[], validationSteps: ['Verify operation succeeds on retry'] as string[] }]
                  : [{ id: 'rem-1', strategy: 'escalate' as const, title: 'Escalate to human operator', description: 'Error is not automatically recoverable — requires human intervention', priority: 'critical' as const, estimatedSuccessRate: 0.9, estimatedTime: 0, riskLevel: 'low' as const, automated: false, prerequisites: [] as string[], sideEffects: [] as string[], validationSteps: [] as string[] }],
                recommended: { strategy: isRecoverable ? 'retry' : 'escalate', suggestionId: 'rem-1', rationale: 'Template recommendation (LLM unavailable for context-aware suggestions)' },
                escalationThreshold: { maxRetries: 3, timeoutSeconds: 300, escalationTarget: '' },
                preventionMeasures: [],
              },
              status: 'remediation_suggested',
              generatedBy: 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'trace-root-cause': {
          const errorId = config.errorId || '';
          const errorMessage = config.errorMessage || '';
          const stackTrace = config.stackTrace || '';

          if (!errorId && !errorMessage) {
            return { success: false, error: '"errorId" or "errorMessage" is required for root cause tracing' };
          }

          this.logger.log(
            `Tracing root cause for error ${errorId || 'direct-input'}`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, errorId });

          const llmResult = await this.executeWithLLM(
            `You are a root cause analysis expert. Trace the root cause of the following error through the causal chain.
Return a JSON object with this structure:
{
  "rootCause": {
    "identified": true,
    "category": "infrastructure|application|data|configuration|dependency|resource|network|timeout|permission|unknown",
    "description": "...",
    "confidence": 0.9,
    "evidence": ["..."],
    "location": "...",
    "component": "...",
    "firstOccurrence": "..."
  },
  "causalChain": [
    { "step": 1, "component": "...", "event": "...", "timestamp": "...", "type": "trigger|propagation|amplification|manifestation", "details": "...", "confidence": 0.9 }
  ],
  "contributingFactors": [
    { "factor": "...", "weight": 0.8, "description": "...", "category": "...", "actionable": true }
  ],
  "blastRadius": {
    "directlyAffected": ["..."],
    "indirectlyAffected": ["..."],
    "potentiallyAffected": ["..."],
    "totalComponentsAtRisk": 3
  }
}`,
            `Error ID: ${errorId}\nError message: ${errorMessage}\nStack trace: ${stackTrace.slice(0, 3000)}\nSource agent: ${config.sourceAgent || ''}\nSource cluster: ${config.sourceCluster || ''}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.rootCause) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, errorId, identified: parsed.rootCause.identified });
              return {
                success: true,
                data: {
                  action,
                  errorId,
                  errorMessage,
                  sourceAgent: config.sourceAgent || '',
                  sourceCluster: config.sourceCluster || '',
                  maxTraceDepth: config.maxTraceDepth || 10,
                  timeRange: config.timeRange || '1h',
                  crossComponentTrace: config.crossComponentTrace ?? true,
                  trace: {
                    rootCause: parsed.rootCause,
                    causalChain: parsed.causalChain || [],
                    timeline: (config.includeTimeline ?? true) ? parsed.causalChain?.map((c: any) => ({
                      timestamp: c.timestamp || new Date().toISOString(),
                      event: c.event || '',
                      component: c.component || '',
                      type: c.type === 'trigger' ? 'cause' as const : c.type === 'manifestation' ? 'symptom' as const : 'propagation' as const,
                      severity: 'error' as const,
                      details: c.details || '',
                    })) : undefined,
                    dependencyGraph: (config.includeDependencyGraph ?? true) ? { nodes: [], edges: [], failedNodes: [] } : undefined,
                    contributingFactors: parsed.contributingFactors || [],
                    blastRadius: parsed.blastRadius || { directlyAffected: [], indirectlyAffected: [], potentiallyAffected: [], totalComponentsAtRisk: 0 },
                  },
                  status: 'root_cause_traced',
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          // Fallback: stack trace parsing
          this.logger.log('LLM unavailable — falling back to stack trace parsing');
          const traceResult = this.parseStackTrace(errorMessage, stackTrace);
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, errorId, source: 'fallback' });
          return {
            success: true,
            data: {
              action,
              errorId,
              errorMessage,
              sourceAgent: config.sourceAgent || '',
              sourceCluster: config.sourceCluster || '',
              maxTraceDepth: config.maxTraceDepth || 10,
              timeRange: config.timeRange || '1h',
              crossComponentTrace: config.crossComponentTrace ?? true,
              trace: traceResult,
              status: 'root_cause_traced',
              generatedBy: 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}. Supported: analyze-error, classify-error, suggest-remediation, trace-root-cause` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Pattern-Based Analysis Fallback ───────────────────────────────

  private patternBasedAnalysis(errorMessage: string, stackTrace: string) {
    const msg = errorMessage.toLowerCase();
    let category: string = 'unknown';
    let type: string = 'unknown';
    let severity: string = 'medium';
    let isRecoverable = true;

    if (msg.includes('timeout') || msg.includes('timed out')) {
      category = 'timeout'; type = 'timeout'; severity = 'high'; isRecoverable = true;
    } else if (msg.includes('connection') || msg.includes('econnrefused') || msg.includes('network')) {
      category = 'network'; type = 'connection-refused'; severity = 'high'; isRecoverable = true;
    } else if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('forbidden')) {
      category = 'permission'; type = 'auth-failure'; severity = 'critical'; isRecoverable = false;
    } else if (msg.includes('memory') || msg.includes('oom') || msg.includes('out of memory')) {
      category = 'resource'; type = 'out-of-memory'; severity = 'critical'; isRecoverable = false;
    } else if (msg.includes('config') || msg.includes('env') || msg.includes('missing')) {
      category = 'configuration'; type = 'misconfiguration'; severity = 'high'; isRecoverable = true;
    } else if (msg.includes('null') || msg.includes('undefined') || msg.includes('cannot read')) {
      category = 'application'; type = 'null-pointer'; severity = 'high'; isRecoverable = false;
    }

    return {
      rootCause: {
        identified: category !== 'unknown',
        category,
        type,
        description: `Pattern-based diagnosis: ${errorMessage.slice(0, 200)}`,
        confidence: category !== 'unknown' ? 0.7 : 0.3,
        evidence: [errorMessage.slice(0, 500)],
        location: stackTrace ? stackTrace.split('\n')[0] || '' : '',
      },
      errorCategory: isRecoverable ? 'transient' : 'persistent',
      severity,
      isRecoverable,
      estimatedRecoveryEffort: isRecoverable ? 'moderate' : 'significant',
      affectedComponents: [],
      errorPattern: {
        isFirstOccurrence: true,
        occurrenceCount: 0,
        frequency: 'one-time',
        trendingDirection: 'unknown',
      },
      suggestedRemediation: [],
      context: {
        systemState: {},
        recentChanges: [],
        relatedErrors: [],
        resourceUtilization: { cpu: 0, memory: 0, disk: 0, network: 0 },
      },
    };
  }

  private regexBasedClassification(errorMessage: string, errorCode: string) {
    const msg = (errorMessage || '').toLowerCase();
    let type = 'unknown';
    let category = 'transient';
    let severity = 'medium';
    let isRecoverable = true;
    let isRetryable = false;

    if (msg.includes('timeout')) { type = 'timeout'; isRetryable = true; }
    else if (msg.includes('connection') || msg.includes('network')) { type = 'network'; isRetryable = true; }
    else if (msg.includes('auth') || msg.includes('unauthorized')) { type = 'authentication'; severity = 'critical'; isRecoverable = false; }
    else if (msg.includes('null') || msg.includes('undefined')) { type = 'runtime'; severity = 'high'; }
    else if (msg.includes('syntax') || msg.includes('parse')) { type = 'syntax'; severity = 'high'; isRecoverable = false; }
    else if (msg.includes('memory') || msg.includes('oom')) { type = 'resource'; severity = 'critical'; }

    return {
      type,
      category,
      severity,
      isRecoverable,
      isRetryable,
      requiresHumanIntervention: !isRecoverable,
      tags: [type, category, severity],
      taxonomy: { domain: 'application', subdomain: type, errorFamily: category, errorClass: type },
    };
  }

  private parseStackTrace(errorMessage: string, stackTrace: string) {
    const lines = stackTrace.split('\n').filter((l) => l.trim());
    const causalChain = lines.slice(0, 5).map((line, i) => ({
      step: i + 1,
      component: line.trim().split(' ')[0] || 'unknown',
      event: line.trim().slice(0, 100),
      timestamp: new Date().toISOString(),
      type: (i === 0 ? 'trigger' : i === lines.length - 1 ? 'manifestation' : 'propagation') as 'trigger' | 'propagation' | 'amplification' | 'manifestation',
      details: line.trim(),
      confidence: 0.5,
    }));

    return {
      rootCause: {
        identified: causalChain.length > 0,
        category: 'application',
        description: `Stack trace analysis: ${errorMessage.slice(0, 200)}`,
        confidence: 0.4,
        evidence: lines.slice(0, 3),
        location: lines[0] || '',
        component: causalChain[0]?.component || '',
        firstOccurrence: new Date().toISOString(),
      },
      causalChain,
      timeline: causalChain.map((c) => ({
        timestamp: c.timestamp,
        event: c.event,
        component: c.component,
        type: 'cause' as const,
        severity: 'error' as const,
        details: c.details,
      })),
      dependencyGraph: {
        nodes: causalChain.map((c) => ({
          id: c.component,
          type: 'component',
          name: c.component,
          status: 'unknown' as const,
        })),
        edges: causalChain.slice(1).map((c, i) => ({
          from: causalChain[i].component,
          to: c.component,
          type: 'calls' as const,
          status: 'degraded' as const,
        })),
        failedNodes: [causalChain[0]?.component].filter(Boolean),
      },
      contributingFactors: [],
      blastRadius: {
        directlyAffected: causalChain.map((c) => c.component),
        indirectlyAffected: [],
        potentiallyAffected: [],
        totalComponentsAtRisk: causalChain.length,
      },
    };
  }
}
