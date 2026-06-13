/**
 * AENEWS Agent OS X - Error Analyzer Agent
 * Watchdog/Self-Healing Cluster — Agent 1 of 3
 *
 * Analyzes error traces from failed missions/agents, identifies root causes,
 * classifies errors by type and severity, and suggests remediation strategies.
 * Uses LLM-powered analysis with a rule-based fallback for resilience.
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentCluster, AgentInput, AgentOutput } from '../interfaces/agent.interface';
import { AgentConnectorBridge } from '../bridge';

// ─── Error Categories ─────────────────────────────────────────────

export enum ErrorCategory {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  LLM_FAILURE = 'LLM_FAILURE',
  PLAYWRIGHT_CRASH = 'PLAYWRIGHT_CRASH',
  SHELL_ERROR = 'SHELL_ERROR',
  FILE_SYSTEM = 'FILE_SYSTEM',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  RESOURCE_EXHAUSTION = 'RESOURCE_EXHAUSTION',
  CONFIGURATION = 'CONFIGURATION',
  DEPENDENCY = 'DEPENDENCY',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN',
}

// ─── Error Severity ───────────────────────────────────────────────

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// ─── Remediation Strategy ─────────────────────────────────────────

export enum RemediationStrategy {
  RETRY = 'retry',
  RECONFIGURE = 'reconfigure',
  FALLBACK = 'fallback',
  ESCALATE = 'escalate',
  SKIP = 'skip',
}

// ─── Error Analysis Result ────────────────────────────────────────

export interface ErrorAnalysisResult {
  rootCause: string;
  errorCategory: ErrorCategory;
  severity: ErrorSeverity;
  isRecoverable: boolean;
  suggestedRemediation: {
    strategy: RemediationStrategy;
    parameters: Record<string, any>;
    estimatedRecoveryTimeMs: number;
  };
  relatedErrors: string[];
  preventionStrategies: string[];
}

// ─── Agent Configuration ──────────────────────────────────────────

export const WATCHDOG_ERROR_ANALYZER_CONFIG: AgentConfig = {
  id: 'watchdog-error-analyzer',
  name: 'ErrorAnalyzer',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '2.0.0',
  description:
    'Analyzes error traces from failed missions/agents, identifies root causes, classifies errors, and suggests remediation',
  capabilities: [
    {
      name: 'analyzeError',
      description: 'Analyze an error trace and identify root cause',
      inputSchema: {
        type: 'object',
        properties: {
          error: { type: 'object', description: 'The error object or trace' },
          context: { type: 'object', description: 'Execution context when error occurred' },
          missionId: { type: 'string', description: 'Mission ID where error occurred' },
        },
        required: ['error'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          analysis: { type: 'object', description: 'Full error analysis result' },
          costUsd: { type: 'number', description: 'Cost of LLM analysis in USD' },
        },
      },
    },
    {
      name: 'classifyError',
      description: 'Classify an error by type and severity',
      inputSchema: {
        type: 'object',
        properties: {
          error: { type: 'object', description: 'The error to classify' },
          errorMessage: { type: 'string', description: 'Error message string' },
        },
        required: ['error'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          errorCategory: { type: 'string', description: 'Error category classification' },
          severity: { type: 'string', description: 'Error severity level' },
        },
      },
    },
    {
      name: 'suggestRemediation',
      description: 'Suggest remediation steps for an error',
      inputSchema: {
        type: 'object',
        properties: {
          error: { type: 'object', description: 'The error to remediate' },
          errorCategory: { type: 'string', description: 'Pre-classified error category' },
          severity: { type: 'string', description: 'Pre-classified severity' },
        },
        required: ['error'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          strategy: { type: 'string', description: 'Recommended remediation strategy' },
          parameters: { type: 'object', description: 'Parameters for the strategy' },
          estimatedRecoveryTimeMs: { type: 'number', description: 'Estimated recovery time' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:error', 'read:mission', 'write:diagnosis'],
  maxConcurrentTasks: 5,
  timeout: 45000,
  retryPolicy: { maxRetries: 2, backoffMs: 1000, exponentialBackoff: true },
};

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class ErrorAnalyzerAgentService extends BaseAgentService {
  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) @Optional() private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }

  protected defineConfig(): AgentConfig {
    return WATCHDOG_ERROR_ANALYZER_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.logger.log('Error Analyzer agent initialized');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { error, context, missionId } = input.payload;

    // ── LLM-powered analysis ────────────────────────────────────
    if (this.bridge) {
      try {
        const llmResult = await this.bridge.callLLM({
          systemPrompt: `You are an expert error analyst for an AI agent platform. Analyze the error trace, classify it, identify the root cause, and suggest specific remediation steps.

Error categories: NETWORK, TIMEOUT, LLM_FAILURE, PLAYWRIGHT_CRASH, SHELL_ERROR, FILE_SYSTEM, VALIDATION, PERMISSION, RESOURCE_EXHAUSTION, CONFIGURATION, DEPENDENCY, DATA_CORRUPTION, RATE_LIMIT, UNKNOWN

Output JSON:
{
  "rootCause": "string - the fundamental cause",
  "errorCategory": "one of the categories above",
  "severity": "low|medium|high|critical",
  "isRecoverable": boolean,
  "suggestedRemediation": {
    "strategy": "retry|reconfigure|fallback|escalate|skip",
    "parameters": {},
    "estimatedRecoveryTimeMs": number
  },
  "relatedErrors": ["similar error patterns"],
  "preventionStrategies": ["how to prevent this in the future"]
}`,
          userPrompt: `Analyze this error:\nError: ${JSON.stringify(error)}\nContext: ${JSON.stringify(context)}\nMission ID: ${missionId}`,
          temperature: 0.1,
          maxTokens: 2048,
        });

        const analysis = this.parseAnalysis(llmResult.content);

        // Store error pattern in working memory for future reference
        await this.storeInWorkingMemory(
          `error-pattern:${analysis.errorCategory || 'UNKNOWN'}`,
          analysis,
          3600000, // 1 hour TTL
        );

        return this.createAgentOutput(
          input.taskId,
          true,
          {
            analysis,
            costUsd: llmResult.costUsd,
          },
          undefined,
          startTime,
        );
      } catch (err) {
        this.logger.warn(`LLM error analysis failed: ${(err as Error).message}`);
      }
    }

    // ── Fallback: rule-based error classification ───────────────
    const fallbackAnalysis = this.classifyErrorFallback(error, context);
    await this.storeInWorkingMemory(
      `error-pattern:${fallbackAnalysis.errorCategory}`,
      fallbackAnalysis,
      3600000,
    );

    return this.createAgentOutput(
      input.taskId,
      true,
      { analysis: fallbackAnalysis },
      undefined,
      startTime,
    );
  }

  protected async onDestroy(): Promise<void> {
    this.logger.log('Error Analyzer agent destroyed');
  }

  // ─── Private Helpers ─────────────────────────────────────────────

  private parseAnalysis(content: string): ErrorAnalysisResult {
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          rootCause: parsed.rootCause || 'Unknown root cause',
          errorCategory: Object.values(ErrorCategory).includes(parsed.errorCategory)
            ? parsed.errorCategory
            : ErrorCategory.UNKNOWN,
          severity: Object.values(ErrorSeverity).includes(parsed.severity)
            ? parsed.severity
            : ErrorSeverity.MEDIUM,
          isRecoverable: parsed.isRecoverable ?? true,
          suggestedRemediation: {
            strategy: Object.values(RemediationStrategy).includes(
              parsed.suggestedRemediation?.strategy,
            )
              ? parsed.suggestedRemediation.strategy
              : RemediationStrategy.RETRY,
            parameters: parsed.suggestedRemediation?.parameters || {},
            estimatedRecoveryTimeMs: parsed.suggestedRemediation?.estimatedRecoveryTimeMs || 5000,
          },
          relatedErrors: Array.isArray(parsed.relatedErrors) ? parsed.relatedErrors : [],
          preventionStrategies: Array.isArray(parsed.preventionStrategies)
            ? parsed.preventionStrategies
            : [],
        };
      }
    } catch {
      // Parsing failed, return raw content
    }
    return {
      rootCause: content.substring(0, 500),
      errorCategory: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: true,
      suggestedRemediation: {
        strategy: RemediationStrategy.RETRY,
        parameters: {},
        estimatedRecoveryTimeMs: 5000,
      },
      relatedErrors: [],
      preventionStrategies: [],
    };
  }

  /**
   * Fallback error classification using simple pattern matching.
   * Used when the LLM is unavailable or returns unparseable output.
   */
  private classifyErrorFallback(error: any, context?: any): ErrorAnalysisResult {
    const errorMsg = String(
      error?.message || error?.toString?.() || error || 'Unknown error',
    ).toLowerCase();
    const stackTrace = String(error?.stack || '').toLowerCase();

    let category = ErrorCategory.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    let strategy = RemediationStrategy.RETRY;
    let isRecoverable = true;
    let estimatedRecoveryMs = 5000;

    // Pattern-based classification
    if (
      errorMsg.includes('econnrefused') ||
      errorMsg.includes('enotfound') ||
      errorMsg.includes('network') ||
      errorMsg.includes('fetch')
    ) {
      category = ErrorCategory.NETWORK;
      severity = ErrorSeverity.HIGH;
      strategy = RemediationStrategy.RETRY;
      estimatedRecoveryMs = 10000;
    } else if (
      errorMsg.includes('timeout') ||
      errorMsg.includes('timed out') ||
      errorMsg.includes('deadline')
    ) {
      category = ErrorCategory.TIMEOUT;
      severity = ErrorSeverity.MEDIUM;
      strategy = RemediationStrategy.RETRY;
      estimatedRecoveryMs = 8000;
    } else if (
      errorMsg.includes('rate limit') ||
      errorMsg.includes('429') ||
      errorMsg.includes('too many requests')
    ) {
      category = ErrorCategory.RATE_LIMIT;
      severity = ErrorSeverity.MEDIUM;
      strategy = RemediationStrategy.RETRY;
      estimatedRecoveryMs = 30000;
    } else if (
      errorMsg.includes('llm') ||
      errorMsg.includes('openai') ||
      errorMsg.includes('token') ||
      errorMsg.includes('completion')
    ) {
      category = ErrorCategory.LLM_FAILURE;
      severity = ErrorSeverity.HIGH;
      strategy = RemediationStrategy.FALLBACK;
      estimatedRecoveryMs = 15000;
    } else if (
      errorMsg.includes('playwright') ||
      errorMsg.includes('browser') ||
      errorMsg.includes('page crashed')
    ) {
      category = ErrorCategory.PLAYWRIGHT_CRASH;
      severity = ErrorSeverity.HIGH;
      strategy = RemediationStrategy.RETRY;
      estimatedRecoveryMs = 20000;
    } else if (
      errorMsg.includes('enoent') ||
      errorMsg.includes('permission denied') ||
      errorMsg.includes('eacces')
    ) {
      category = ErrorCategory.FILE_SYSTEM;
      severity = ErrorSeverity.HIGH;
      strategy = RemediationStrategy.RECONFIGURE;
      estimatedRecoveryMs = 5000;
    } else if (
      errorMsg.includes('shell') ||
      errorMsg.includes('command failed') ||
      errorMsg.includes('exit code')
    ) {
      category = ErrorCategory.SHELL_ERROR;
      severity = ErrorSeverity.MEDIUM;
      strategy = RemediationStrategy.FALLBACK;
      estimatedRecoveryMs = 8000;
    } else if (
      errorMsg.includes('validation') ||
      errorMsg.includes('invalid') ||
      errorMsg.includes('schema')
    ) {
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.LOW;
      strategy = RemediationStrategy.RECONFIGURE;
      estimatedRecoveryMs = 2000;
    } else if (
      errorMsg.includes('unauthorized') ||
      errorMsg.includes('forbidden') ||
      errorMsg.includes('access denied')
    ) {
      category = ErrorCategory.PERMISSION;
      severity = ErrorSeverity.HIGH;
      strategy = RemediationStrategy.ESCALATE;
      isRecoverable = false;
      estimatedRecoveryMs = 60000;
    } else if (
      errorMsg.includes('out of memory') ||
      errorMsg.includes('oom') ||
      errorMsg.includes('resource')
    ) {
      category = ErrorCategory.RESOURCE_EXHAUSTION;
      severity = ErrorSeverity.CRITICAL;
      strategy = RemediationStrategy.ESCALATE;
      estimatedRecoveryMs = 30000;
    } else if (
      errorMsg.includes('config') ||
      errorMsg.includes('missing env') ||
      errorMsg.includes('misconfigur')
    ) {
      category = ErrorCategory.CONFIGURATION;
      severity = ErrorSeverity.HIGH;
      strategy = RemediationStrategy.RECONFIGURE;
      estimatedRecoveryMs = 5000;
    } else if (
      errorMsg.includes('dependency') ||
      errorMsg.includes('module not found') ||
      errorMsg.includes('cannot find')
    ) {
      category = ErrorCategory.DEPENDENCY;
      severity = ErrorSeverity.HIGH;
      strategy = RemediationStrategy.RECONFIGURE;
      estimatedRecoveryMs = 10000;
    } else if (
      errorMsg.includes('corrupt') ||
      errorMsg.includes('integrity') ||
      errorMsg.includes('checksum')
    ) {
      category = ErrorCategory.DATA_CORRUPTION;
      severity = ErrorSeverity.CRITICAL;
      strategy = RemediationStrategy.ESCALATE;
      isRecoverable = false;
      estimatedRecoveryMs = 60000;
    }

    // Stack trace can refine the classification
    if (stackTrace.includes('playwright') && category === ErrorCategory.UNKNOWN) {
      category = ErrorCategory.PLAYWRIGHT_CRASH;
    }
    if (stackTrace.includes('child_process') && category === ErrorCategory.UNKNOWN) {
      category = ErrorCategory.SHELL_ERROR;
    }

    return {
      rootCause: String(error?.message || error || 'Unknown error'),
      errorCategory: category,
      severity,
      isRecoverable,
      suggestedRemediation: {
        strategy,
        parameters: { retryCount: 1, backoffMs: 1000 },
        estimatedRecoveryTimeMs: estimatedRecoveryMs,
      },
      relatedErrors: [],
      preventionStrategies: this.getPreventionStrategies(category),
    };
  }

  private getPreventionStrategies(category: ErrorCategory): string[] {
    const strategies: Record<ErrorCategory, string[]> = {
      [ErrorCategory.NETWORK]: [
        'Implement retry with exponential backoff',
        'Add circuit breaker pattern',
        'Use connection pooling',
      ],
      [ErrorCategory.TIMEOUT]: [
        'Increase timeout thresholds',
        'Optimize slow operations',
        'Implement async processing',
      ],
      [ErrorCategory.LLM_FAILURE]: [
        'Add fallback LLM providers',
        'Implement token budget management',
        'Cache frequent LLM calls',
      ],
      [ErrorCategory.PLAYWRIGHT_CRASH]: [
        'Restart browser on crash',
        'Add page stability checks',
        'Implement browser session recovery',
      ],
      [ErrorCategory.SHELL_ERROR]: [
        'Validate commands before execution',
        'Add shell error parsers',
        'Implement sandbox isolation',
      ],
      [ErrorCategory.FILE_SYSTEM]: [
        'Check file existence before operations',
        'Validate permissions',
        'Use atomic writes',
      ],
      [ErrorCategory.VALIDATION]: [
        'Add input validation layer',
        'Implement schema checking',
        'Use type-safe interfaces',
      ],
      [ErrorCategory.PERMISSION]: [
        'Pre-validate permissions',
        'Implement role-based access',
        'Add permission caching',
      ],
      [ErrorCategory.RESOURCE_EXHAUSTION]: [
        'Implement resource quotas',
        'Add memory monitoring',
        'Use resource pooling',
      ],
      [ErrorCategory.CONFIGURATION]: [
        'Validate configuration at startup',
        'Use config schema validation',
        'Implement config hot-reload',
      ],
      [ErrorCategory.DEPENDENCY]: [
        'Pin dependency versions',
        'Implement dependency health checks',
        'Add fallback implementations',
      ],
      [ErrorCategory.DATA_CORRUPTION]: [
        'Add data integrity checks',
        'Implement checksums',
        'Use write-ahead logging',
      ],
      [ErrorCategory.RATE_LIMIT]: [
        'Implement rate limiting on client side',
        'Add request queuing',
        'Use token bucket algorithm',
      ],
      [ErrorCategory.UNKNOWN]: [
        'Add comprehensive error logging',
        'Implement error fingerprinting',
        'Create error taxonomy',
      ],
    };
    return strategies[category] || [];
  }
}
