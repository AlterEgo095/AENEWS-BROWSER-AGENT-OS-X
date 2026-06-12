/**
 * AENEWS Agent OS X - Debugging Agent
 * Debugs code issues, traces errors, suggests fixes, applies fixes, and validates them.
 * Provides systematic error analysis and resolution workflow.
 */

import { Injectable } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';

// ─── Agent Configuration ──────────────────────────────────────────

export const DEBUGGING_AGENT_CONFIG: AgentConfig = {
  id: 'coding-debugging',
  name: 'Debugging',
  cluster: AgentCluster.CODING,
  version: '1.0.0',
  description:
    'Debug code issues, trace errors through execution paths, suggest and apply fixes, and validate that fixes resolve the issue. Provides systematic error analysis and resolution.',
  capabilities: [
    {
      name: 'analyzeError',
      description: 'Analyze an error to determine root cause, severity, and affected code paths',
      inputSchema: {
        type: 'object',
        properties: {
          error: { type: 'object', description: 'Error object with message, stack, and type' },
          code: { type: 'string', description: 'Source code where error occurred' },
          language: { type: 'string', description: 'Programming language' },
          context: { type: 'object', description: 'Additional runtime context' },
        },
        required: ['error'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          rootCause: { type: 'string' },
          severity: { type: 'string' },
          affectedPaths: { type: 'array', items: { type: 'string' } },
          analysis: { type: 'string' },
          relatedErrors: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    {
      name: 'traceExecution',
      description: 'Trace the execution path leading to an error',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Source code to trace' },
          entryPoint: { type: 'string', description: 'Function or entry point to start tracing' },
          language: { type: 'string', description: 'Programming language' },
          inputs: { type: 'object', description: 'Input values for the trace' },
          maxDepth: { type: 'number', description: 'Maximum trace depth' },
        },
        required: ['code', 'entryPoint', 'language'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          traceSteps: { type: 'array', items: { type: 'object' } },
          errorPoint: { type: 'object' },
          variablesAtError: { type: 'object' },
          executionFlow: { type: 'string' },
        },
      },
    },
    {
      name: 'suggestFix',
      description: 'Suggest potential fixes for a given error or code issue',
      inputSchema: {
        type: 'object',
        properties: {
          error: { type: 'object', description: 'Error description or object' },
          code: { type: 'string', description: 'Source code' },
          language: { type: 'string', description: 'Programming language' },
          maxSuggestions: { type: 'number', default: 3 },
        },
        required: ['error', 'code', 'language'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          suggestions: { type: 'array', items: { type: 'object' } },
          confidence: { type: 'number' },
          autoFixable: { type: 'boolean' },
        },
      },
    },
    {
      name: 'applyFix',
      description: 'Apply a suggested fix to the source code',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Source code to fix' },
          fix: { type: 'object', description: 'Fix object from suggestFix' },
          language: { type: 'string', description: 'Programming language' },
          dryRun: { type: 'boolean', default: true },
        },
        required: ['code', 'fix', 'language'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          fixedCode: { type: 'string' },
          applied: { type: 'boolean' },
          changes: { type: 'array', items: { type: 'object' } },
          dryRun: { type: 'boolean' },
        },
      },
    },
    {
      name: 'validateFix',
      description: 'Validate that an applied fix resolves the original error',
      inputSchema: {
        type: 'object',
        properties: {
          originalCode: { type: 'string', description: 'Original code before fix' },
          fixedCode: { type: 'string', description: 'Code after fix was applied' },
          error: { type: 'object', description: 'Original error to validate against' },
          language: { type: 'string', description: 'Programming language' },
        },
        required: ['originalCode', 'fixedCode', 'error', 'language'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          valid: { type: 'boolean' },
          residualIssues: { type: 'array', items: { type: 'object' } },
          regressionRisk: { type: 'string' },
          verificationSteps: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:code', 'write:code', 'read:logs', 'execute:debug'],
  maxConcurrentTasks: 3,
  timeout: 90000,
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1500,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface ErrorAnalysis {
  errorType: string;
  message: string;
  rootCause: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedPaths: string[];
  analysis: string;
  relatedErrors: Array<{ type: string; message: string; likelihood: number }>;
}

interface TraceStep {
  step: number;
  location: string;
  line: number;
  function: string;
  action: string;
  variables: Record<string, any>;
  timestamp: number;
}

interface FixSuggestion {
  id: string;
  title: string;
  description: string;
  codeChange: string;
  confidence: number;
  autoFixable: boolean;
  sideEffects: string[];
}

interface AppliedChange {
  type: 'replacement' | 'insertion' | 'deletion';
  lineStart: number;
  lineEnd: number;
  before: string;
  after: string;
  description: string;
}

interface ValidationError {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  line?: number;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class DebuggingAgentService extends BaseAgentService {
  private debugSessions: Map<
    string,
    {
      error: any;
      analysis?: ErrorAnalysis;
      suggestions?: FixSuggestion[];
      appliedFixes: AppliedChange[];
      validated: boolean;
    }
  > = new Map();

  protected defineConfig(): AgentConfig {
    return DEBUGGING_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'analyzeError',
      description: 'Analyze an error to determine root cause and severity',
      execute: async (params: {
        error: Record<string, any>;
        code?: string;
        language?: string;
        context?: Record<string, any>;
      }) => this.analyzeError(params),
    });

    this.registerTool({
      name: 'traceExecution',
      description: 'Trace execution path leading to an error',
      execute: async (params: {
        code: string;
        entryPoint: string;
        language: string;
        inputs?: Record<string, any>;
        maxDepth?: number;
      }) => this.traceExecution(params),
    });

    this.registerTool({
      name: 'suggestFix',
      description: 'Suggest potential fixes for an error',
      execute: async (params: {
        error: Record<string, any>;
        code: string;
        language: string;
        maxSuggestions?: number;
      }) => this.suggestFix(params),
    });

    this.registerTool({
      name: 'applyFix',
      description: 'Apply a suggested fix to source code',
      execute: async (params: {
        code: string;
        fix: Record<string, any>;
        language: string;
        dryRun?: boolean;
      }) => this.applyFix(params),
    });

    this.registerTool({
      name: 'validateFix',
      description: 'Validate that a fix resolves the original error',
      execute: async (params: {
        originalCode: string;
        fixedCode: string;
        error: Record<string, any>;
        language: string;
      }) => this.validateFix(params),
    });

    await this.storeInWorkingMemory('debugging:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('Debugging agent initialized with 5 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { action, ...params } = input.payload;

    if (!action) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        'Missing required parameter: action',
        startTime,
      );
    }

    const supportedActions = [
      'analyzeError',
      'traceExecution',
      'suggestFix',
      'applyFix',
      'validateFix',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown debugging action: ${action}. Supported: ${supportedActions.join(', ')}`,
        startTime,
      );
    }

    try {
      const tool = this.getTool(action);
      if (!tool) {
        return this.createAgentOutput(
          input.taskId,
          false,
          null,
          `Tool not found: ${action}`,
          startTime,
        );
      }

      const result = await tool.execute(params);

      // Store debug session data
      const sessionId = input.context?.sessionId || input.taskId;
      if (!this.debugSessions.has(sessionId)) {
        this.debugSessions.set(sessionId, {
          error: params.error,
          appliedFixes: [],
          validated: false,
        });
      }
      const session = this.debugSessions.get(sessionId)!;

      switch (action) {
        case 'analyzeError':
          session.analysis = result as ErrorAnalysis;
          break;
        case 'suggestFix':
          session.suggestions = result.suggestions;
          break;
        case 'applyFix':
          session.appliedFixes.push(...(result.changes || []));
          break;
        case 'validateFix':
          session.validated = result.valid;
          break;
      }

      await this.storeInWorkingMemory(
        `debugging:session:${sessionId}`,
        { action, result, timestamp: new Date() },
        600000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Debugging execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.debugSessions.clear();
    this.logger.log('Debugging agent destroyed, sessions cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async analyzeError(params: {
    error: Record<string, any>;
    code?: string;
    language?: string;
    context?: Record<string, any>;
  }): Promise<ErrorAnalysis> {
    const { error, code, language = 'typescript', context } = params;

    if (!error) {
      throw new Error('Error object is required for analysis');
    }

    const errorMessage = error.message || error.msg || error.toString?.() || 'Unknown error';
    const errorStack = error.stack || '';
    const errorType = error.name || error.type || this.classifyError(errorMessage);

    // Determine root cause
    const rootCause = this.determineRootCause(errorMessage, errorStack, code, language);

    // Determine severity
    const severity = this.determineSeverity(errorType, errorMessage, code);

    // Identify affected code paths
    const affectedPaths = this.extractAffectedPaths(errorStack, code);

    // Generate analysis text
    const analysis = this.generateAnalysisText(
      errorType,
      errorMessage,
      rootCause,
      severity,
      affectedPaths,
      language,
    );

    // Find related errors
    const relatedErrors = this.findRelatedErrors(errorType, errorMessage, code, language);

    this.logger.log(
      `Error analyzed: type=${errorType}, severity=${severity}, rootCause=${rootCause.substring(0, 80)}`,
    );

    return {
      errorType,
      message: errorMessage,
      rootCause,
      severity,
      affectedPaths,
      analysis,
      relatedErrors,
    };
  }

  private async traceExecution(params: {
    code: string;
    entryPoint: string;
    language: string;
    inputs?: Record<string, any>;
    maxDepth?: number;
  }): Promise<{
    traceSteps: TraceStep[];
    errorPoint: { line: number; function: string; reason: string } | null;
    variablesAtError: Record<string, any>;
    executionFlow: string;
  }> {
    const { code, entryPoint, language, inputs = {}, maxDepth = 50 } = params;

    if (!code || typeof code !== 'string') {
      throw new Error('Source code is required for tracing');
    }
    if (!entryPoint || typeof entryPoint !== 'string') {
      throw new Error('Entry point is required for tracing');
    }

    const lines = code.split('\n');
    const traceSteps: TraceStep[] = [];
    let stepCounter = 0;

    // Find entry point in code
    const entryLine = this.findFunctionStartLine(lines, entryPoint, language);
    if (entryLine === -1) {
      throw new Error(`Entry point "${entryPoint}" not found in code`);
    }

    // Simulate execution trace
    let currentLine = entryLine;
    let currentFunction = entryPoint;
    const variables: Record<string, any> = { ...inputs };
    let errorPoint: { line: number; function: string; reason: string } | null = null;

    while (currentLine < lines.length && stepCounter < maxDepth) {
      const line = lines[currentLine].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
        currentLine++;
        continue;
      }

      stepCounter++;
      const traceStep: TraceStep = {
        step: stepCounter,
        location: `line ${currentLine + 1}`,
        line: currentLine + 1,
        function: currentFunction,
        action: this.describeLineAction(line, language),
        variables: { ...variables },
        timestamp: Date.now(),
      };

      // Track variable assignments
      this.trackVariableAssignment(line, variables, language);

      // Check for function calls (enter new function)
      const funcCall = this.extractFunctionCall(line, language);
      if (funcCall) {
        const funcStart = this.findFunctionStartLine(lines, funcCall, language);
        if (funcStart !== -1) {
          currentFunction = funcCall;
        }
      }

      // Check for potential error points
      if (this.isErrorPoint(line, language)) {
        errorPoint = {
          line: currentLine + 1,
          function: currentFunction,
          reason: this.identifyErrorReason(line, language),
        };
      }

      // Detect function exit
      if (line === '}' && currentFunction !== entryPoint) {
        currentFunction = entryPoint;
      }

      traceSteps.push(traceStep);
      currentLine++;
    }

    // Build execution flow description
    const executionFlow = this.buildExecutionFlowDescription(traceSteps, entryPoint, errorPoint);

    this.logger.log(
      `Execution trace complete: ${traceSteps.length} step(s), error at ${errorPoint ? `line ${errorPoint.line}` : 'none'}`,
    );

    return {
      traceSteps,
      errorPoint,
      variablesAtError: variables,
      executionFlow,
    };
  }

  private async suggestFix(params: {
    error: Record<string, any>;
    code: string;
    language: string;
    maxSuggestions?: number;
  }): Promise<{
    suggestions: FixSuggestion[];
    confidence: number;
    autoFixable: boolean;
  }> {
    const { error, code, language, maxSuggestions = 3 } = params;

    if (!error) {
      throw new Error('Error description is required');
    }
    if (!code || typeof code !== 'string') {
      throw new Error('Source code is required');
    }
    if (!language || typeof language !== 'string') {
      throw new Error('Programming language is required');
    }

    const errorMessage = error.message || error.msg || error.toString?.() || 'Unknown error';
    const errorType = error.name || error.type || this.classifyError(errorMessage);

    const suggestions: FixSuggestion[] = [];
    const lines = code.split('\n');

    // Type error fixes
    if (errorType.toLowerCase().includes('type') || errorMessage.toLowerCase().includes('type')) {
      suggestions.push(...this.suggestTypeErrorFixes(errorMessage, lines, language));
    }

    // Reference error fixes
    if (
      errorType.toLowerCase().includes('reference') ||
      errorMessage.toLowerCase().includes('is not defined')
    ) {
      suggestions.push(...this.suggestReferenceErrorFixes(errorMessage, lines, language));
    }

    // Null/undefined error fixes
    if (
      errorMessage.toLowerCase().includes('null') ||
      errorMessage.toLowerCase().includes('undefined') ||
      errorMessage.toLowerCase().includes('cannot read propert')
    ) {
      suggestions.push(...this.suggestNullErrorFixes(errorMessage, lines, language));
    }

    // Syntax error fixes
    if (
      errorType.toLowerCase().includes('syntax') ||
      errorMessage.toLowerCase().includes('unexpected')
    ) {
      suggestions.push(...this.suggestSyntaxErrorFixes(errorMessage, lines, language));
    }

    // Range error fixes
    if (
      errorType.toLowerCase().includes('range') ||
      errorMessage.toLowerCase().includes('out of range')
    ) {
      suggestions.push(...this.suggestRangeErrorFixes(errorMessage, lines, language));
    }

    // Generic fixes
    if (suggestions.length === 0) {
      suggestions.push(...this.suggestGenericFixes(errorMessage, lines, language));
    }

    // Limit suggestions
    const limitedSuggestions = suggestions.slice(0, maxSuggestions);

    // Calculate overall confidence
    const avgConfidence =
      limitedSuggestions.length > 0
        ? limitedSuggestions.reduce((sum, s) => sum + s.confidence, 0) / limitedSuggestions.length
        : 0;

    const autoFixable = limitedSuggestions.some((s) => s.autoFixable);

    this.logger.log(
      `Suggested ${limitedSuggestions.length} fix(es), confidence=${avgConfidence.toFixed(2)}, autoFixable=${autoFixable}`,
    );

    return { suggestions: limitedSuggestions, confidence: avgConfidence, autoFixable };
  }

  private async applyFix(params: {
    code: string;
    fix: Record<string, any>;
    language: string;
    dryRun?: boolean;
  }): Promise<{
    fixedCode: string;
    applied: boolean;
    changes: AppliedChange[];
    dryRun: boolean;
  }> {
    const { code, fix, language, dryRun = true } = params;

    if (!code || typeof code !== 'string') {
      throw new Error('Source code is required');
    }
    if (!fix || typeof fix !== 'object') {
      throw new Error('Fix object is required');
    }

    const lines = code.split('\n');
    const changes: AppliedChange[] = [];
    let fixedCode = code;

    const fixType = fix.type || fix.fixType || 'replacement';
    const targetLine = fix.line ? fix.line - 1 : this.findTargetLine(lines, fix, language);

    if (targetLine >= 0 && targetLine < lines.length) {
      switch (fixType) {
        case 'replacement': {
          const before = lines[targetLine];
          let after = before;

          if (fix.search && fix.replace) {
            after = before.replace(new RegExp(this.escapeRegex(fix.search), 'g'), fix.replace);
          } else if (fix.newLine) {
            after = fix.newLine;
          }

          if (before !== after) {
            lines[targetLine] = after;
            changes.push({
              type: 'replacement',
              lineStart: targetLine + 1,
              lineEnd: targetLine + 1,
              before,
              after,
              description: fix.description || `Replaced line ${targetLine + 1}`,
            });
          }
          break;
        }
        case 'insertion': {
          const insertLine = fix.insertBefore ? targetLine : targetLine + 1;
          const newLine = fix.newLine || fix.code || '';
          lines.splice(insertLine, 0, newLine);
          changes.push({
            type: 'insertion',
            lineStart: insertLine + 1,
            lineEnd: insertLine + 1,
            before: '',
            after: newLine,
            description: fix.description || `Inserted line after ${targetLine + 1}`,
          });
          break;
        }
        case 'deletion': {
          const deleteCount = fix.deleteCount || 1;
          const deleted = lines.splice(targetLine, deleteCount);
          changes.push({
            type: 'deletion',
            lineStart: targetLine + 1,
            lineEnd: targetLine + deleteCount,
            before: deleted.join('\n'),
            after: '',
            description:
              fix.description || `Deleted line(s) ${targetLine + 1}-${targetLine + deleteCount}`,
          });
          break;
        }
      }
    }

    fixedCode = lines.join('\n');

    if (!dryRun) {
      await this.storeInWorkingMemory(
        'debugging:lastFix',
        {
          fix,
          changes,
          timestamp: new Date(),
          applied: true,
        },
        300000,
      );
    }

    this.logger.log(
      `${dryRun ? 'Dry run: ' : ''}Applied fix: ${changes.length} change(s), type=${fixType}`,
    );

    return { fixedCode, applied: !dryRun && changes.length > 0, changes, dryRun };
  }

  private async validateFix(params: {
    originalCode: string;
    fixedCode: string;
    error: Record<string, any>;
    language: string;
  }): Promise<{
    valid: boolean;
    residualIssues: ValidationError[];
    regressionRisk: 'low' | 'medium' | 'high';
    verificationSteps: string[];
  }> {
    const { originalCode, fixedCode, error, language } = params;

    if (!originalCode || typeof originalCode !== 'string') {
      throw new Error('Original code is required');
    }
    if (!fixedCode || typeof fixedCode !== 'string') {
      throw new Error('Fixed code is required');
    }
    if (!error) {
      throw new Error('Error object is required for validation');
    }

    const errorMessage = error.message || error.msg || error.toString?.() || 'Unknown error';
    const errorType = error.name || error.type || '';
    const residualIssues: ValidationError[] = [];
    const verificationSteps: string[] = [];

    // 1. Check that the fixed code is different from original
    if (originalCode === fixedCode) {
      residualIssues.push({
        type: 'no-change',
        message: 'Fixed code is identical to original code — no fix was applied',
        severity: 'high',
      });
    }
    verificationSteps.push('Verify that the fixed code differs from the original');

    // 2. Check for syntax validity (basic structural check)
    const syntaxCheck = this.performBasicSyntaxCheck(fixedCode, language);
    if (!syntaxCheck.valid) {
      residualIssues.push({
        type: 'syntax',
        message: `Syntax issue after fix: ${syntaxCheck.message}`,
        severity: 'high',
      });
    }
    verificationSteps.push('Verify syntax correctness of fixed code');

    // 3. Check that the original error pattern is no longer present
    const errorPatternPresent = this.checkErrorPatternExists(
      fixedCode,
      errorMessage,
      errorType,
      language,
    );
    if (errorPatternPresent) {
      residualIssues.push({
        type: 'error-pattern',
        message: 'The original error pattern may still exist in the fixed code',
        severity: 'medium',
      });
    }
    verificationSteps.push('Verify that the original error pattern is resolved');

    // 4. Check for new issues introduced by the fix
    const newIssues = this.detectNewIssues(originalCode, fixedCode, language);
    residualIssues.push(...newIssues);
    verificationSteps.push('Check for regressions or new issues introduced by the fix');

    // 5. Check balanced brackets/braces
    const balanceCheck = this.checkBalancedDelimiters(fixedCode);
    if (!balanceCheck.balanced) {
      residualIssues.push({
        type: 'structure',
        message: `Unbalanced delimiters: ${balanceCheck.message}`,
        severity: 'high',
      });
    }
    verificationSteps.push('Verify balanced delimiters (braces, brackets, parentheses)');

    // 6. Verify imports/dependencies are still valid
    const importCheck = this.checkImportConsistency(originalCode, fixedCode, language);
    if (!importCheck.consistent) {
      residualIssues.push({
        type: 'imports',
        message: `Import inconsistency: ${importCheck.message}`,
        severity: 'medium',
      });
    }
    verificationSteps.push('Verify import statements are still valid after fix');

    // Determine overall validity
    const highSeverityIssues = residualIssues.filter((i) => i.severity === 'high');
    const valid = highSeverityIssues.length === 0 && !errorPatternPresent;

    // Determine regression risk
    const totalIssues = residualIssues.length;
    let regressionRisk: 'low' | 'medium' | 'high' = 'low';
    if (highSeverityIssues.length > 0) regressionRisk = 'high';
    else if (totalIssues > 2) regressionRisk = 'medium';

    this.logger.log(
      `Fix validation: valid=${valid}, ${residualIssues.length} residual issue(s), risk=${regressionRisk}`,
    );

    return { valid, residualIssues, regressionRisk, verificationSteps };
  }

  // ─── Error Analysis Helpers ────────────────────────────────────

  private classifyError(message: string): string {
    const lower = message.toLowerCase();

    if (lower.includes('typeerror') || lower.includes('type error')) return 'TypeError';
    if (lower.includes('referenceerror') || lower.includes('is not defined'))
      return 'ReferenceError';
    if (lower.includes('syntaxerror') || lower.includes('unexpected')) return 'SyntaxError';
    if (lower.includes('rangeerror') || lower.includes('out of range')) return 'RangeError';
    if (lower.includes('null') || lower.includes('undefined')) return 'NullReferenceError';
    if (lower.includes('timeout') || lower.includes('timed out')) return 'TimeoutError';
    if (lower.includes('permission') || lower.includes('access denied')) return 'PermissionError';
    if (lower.includes('not found') || lower.includes('enoent')) return 'NotFoundError';
    if (lower.includes('connection') || lower.includes('econnrefused')) return 'ConnectionError';
    if (lower.includes('memory') || lower.includes('heap')) return 'MemoryError';

    return 'UnknownError';
  }

  private determineRootCause(
    errorMessage: string,
    stack: string,
    code?: string,
    language?: string,
  ): string {
    const lower = errorMessage.toLowerCase();

    // Null/undefined access
    if (lower.includes('cannot read propert') || lower.includes('cannot read properties')) {
      const match = errorMessage.match(/cannot read (?:properties of|propert[yies])\s+(\w+)/i);
      const prop = match ? match[1] : 'property';
      return `Attempting to access "${prop}" on a null or undefined value. The object is likely not initialized or the access path contains a null/undefined intermediate.`;
    }

    // Not defined
    if (lower.includes('is not defined')) {
      const match = errorMessage.match(/(\w+)\s+is not defined/i);
      const name = match ? match[1] : 'variable';
      return `"${name}" is referenced but not declared or imported. Check for typos, missing imports, or scope issues.`;
    }

    // Type mismatch
    if (lower.includes('is not a function')) {
      const match = errorMessage.match(/(\w+)\s+is not a function/i);
      const name = match ? match[1] : 'value';
      return `"${name}" is being called as a function but is not of callable type. Verify the variable type and method availability.`;
    }

    // Cannot read properties of undefined
    if (lower.includes('is not iterable')) {
      return 'Attempting to iterate over a non-iterable value. Ensure the target is an array, string, or other iterable object.';
    }

    // Syntax errors
    if (lower.includes('unexpected token') || lower.includes('unexpected end')) {
      return 'Syntax error in the code. Check for missing brackets, parentheses, semicolons, or string delimiters.';
    }

    // Timeout
    if (lower.includes('timeout') || lower.includes('timed out')) {
      return 'An operation exceeded its time limit. This may be caused by an infinite loop, unresponsive external service, or insufficient timeout configuration.';
    }

    // Default
    return `Error: ${errorMessage}. Analyze the stack trace and code context to identify the specific cause.`;
  }

  private determineSeverity(
    errorType: string,
    errorMessage: string,
    code?: string,
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: unhandled exceptions, security errors
    if (
      errorType.includes('Security') ||
      errorType.includes('Permission') ||
      errorMessage.toLowerCase().includes('fatal')
    ) {
      return 'critical';
    }

    // High: runtime errors that crash the application
    if (
      errorType.includes('TypeError') ||
      errorType.includes('ReferenceError') ||
      errorType.includes('NullReference')
    ) {
      return 'high';
    }

    // Medium: recoverable errors
    if (
      errorType.includes('RangeError') ||
      errorType.includes('ConnectionError') ||
      errorType.includes('Timeout')
    ) {
      return 'medium';
    }

    // Low: syntax errors caught at compile time, warnings
    if (errorType.includes('SyntaxError')) {
      return 'low';
    }

    return 'medium';
  }

  private extractAffectedPaths(stack: string, code?: string): string[] {
    const paths: string[] = [];

    if (stack) {
      const stackLines = stack.split('\n');
      for (const line of stackLines) {
        const match = line.match(/at\s+.*?\(([^)]+)\)/);
        if (match) {
          paths.push(match[1]);
        }
      }
    }

    if (paths.length === 0 && code) {
      paths.push('source code (no stack trace available)');
    }

    return paths.slice(0, 10);
  }

  private generateAnalysisText(
    errorType: string,
    errorMessage: string,
    rootCause: string,
    severity: string,
    affectedPaths: string[],
    language: string,
  ): string {
    let analysis = `Error Analysis Report\n`;
    analysis += `=====================\n`;
    analysis += `Type: ${errorType}\n`;
    analysis += `Message: ${errorMessage}\n`;
    analysis += `Severity: ${severity}\n`;
    analysis += `Language: ${language}\n\n`;
    analysis += `Root Cause: ${rootCause}\n\n`;

    if (affectedPaths.length > 0) {
      analysis += `Affected Code Paths:\n`;
      for (const path of affectedPaths) {
        analysis += `  - ${path}\n`;
      }
      analysis += '\n';
    }

    analysis += `Recommended Next Steps:\n`;
    analysis += `  1. Use traceExecution to follow the execution path\n`;
    analysis += `  2. Use suggestFix to get potential fixes\n`;
    analysis += `  3. Use applyFix to apply a fix\n`;
    analysis += `  4. Use validateFix to verify the fix\n`;

    return analysis;
  }

  private findRelatedErrors(
    errorType: string,
    errorMessage: string,
    code?: string,
    language?: string,
  ): Array<{ type: string; message: string; likelihood: number }> {
    const related: Array<{ type: string; message: string; likelihood: number }> = [];
    const lower = errorMessage.toLowerCase();

    // Null errors often cascade
    if (lower.includes('null') || lower.includes('undefined')) {
      related.push({
        type: 'TypeError',
        message: 'Related null/undefined access may exist in the same code path',
        likelihood: 0.7,
      });
    }

    // Reference errors may indicate missing imports
    if (lower.includes('is not defined')) {
      related.push({
        type: 'ImportError',
        message: 'Missing or incorrect import statement',
        likelihood: 0.8,
      });
    }

    // Type errors may have sibling type issues
    if (lower.includes('is not a function')) {
      related.push({
        type: 'TypeError',
        message: 'Other method calls on the same object may also fail',
        likelihood: 0.5,
      });
    }

    return related;
  }

  // ─── Trace Execution Helpers ───────────────────────────────────

  private findFunctionStartLine(lines: string[], functionName: string, language: string): number {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (language === 'typescript' || language === 'javascript') {
        if (
          line.includes(`function ${functionName}`) ||
          line.includes(`${functionName} =`) ||
          line.includes(`${functionName}(`) ||
          line.match(new RegExp(`\\b${functionName}\\s*\\(`))
        ) {
          return i;
        }
      }
      if (language === 'python') {
        if (line.includes(`def ${functionName}`)) {
          return i;
        }
      }
    }
    return -1;
  }

  private describeLineAction(line: string, language: string): string {
    if (line.match(/\bif\s*\(/)) return 'Conditional check';
    if (line.match(/\bfor\s*\(/) || line.match(/\bwhile\s*\(/)) return 'Loop iteration';
    if (line.match(/\breturn\b/)) return 'Return value';
    if (line.match(/\bthrow\b/) || line.match(/\braise\b/)) return 'Throw exception';
    if (line.match(/\btry\b/) || line.match(/\bcatch\b/)) return 'Exception handling';
    if (line.match(/\bawait\b/)) return 'Await async operation';
    if (line.match(/\bnew\b/)) return 'Create new instance';
    if (line.match(/=\s*(?:async\s+)?function/)) return 'Define function';
    if (line.includes('console.log') || line.includes('print(')) return 'Log output';
    if (line.match(/\w+\.\w+\(/)) return 'Method call';
    return 'Execute statement';
  }

  private trackVariableAssignment(
    line: string,
    variables: Record<string, any>,
    language: string,
  ): void {
    const assignMatch = line.match(/(?:const|let|var)?\s*(\w+)\s*=\s*(.+?)[;,\)]?$/);
    if (assignMatch) {
      const name = assignMatch[1];
      const value = assignMatch[2].trim();
      // Store simplified representation
      variables[name] =
        value.startsWith("'") || value.startsWith('"')
          ? 'string'
          : /^\d+$/.test(value)
            ? 'number'
            : value === 'true' || value === 'false'
              ? 'boolean'
              : value === 'null'
                ? null
                : value === 'undefined'
                  ? undefined
                  : 'expression';
    }
  }

  private extractFunctionCall(line: string, language: string): string | null {
    const match = line.match(/(\w+)\s*\(/);
    return match ? match[1] : null;
  }

  private isErrorPoint(line: string, language: string): boolean {
    if (language === 'typescript' || language === 'javascript') {
      return (
        line.includes('.null') ||
        line.includes('undefined') ||
        line.includes('throw ') ||
        line.includes('catch (') ||
        (line.includes('[') && !line.includes(']')) ||
        (line.includes('.length') && line.includes('undefined'))
      );
    }
    return line.includes('raise ') || line.includes('except ') || line.includes('None');
  }

  private identifyErrorReason(line: string, language: string): string {
    if (line.includes('undefined')) return 'Potential undefined access';
    if (line.includes('null')) return 'Potential null reference';
    if (line.includes('throw')) return 'Explicit exception thrown';
    if (line.includes('raise')) return 'Explicit exception raised';
    if (line.includes('None')) return 'Potential None reference';
    return 'Potential error point detected';
  }

  private buildExecutionFlowDescription(
    steps: TraceStep[],
    entryPoint: string,
    errorPoint: { line: number; function: string; reason: string } | null,
  ): string {
    let flow = `Execution flow for ${entryPoint}:\n`;

    for (const step of steps) {
      flow += `  Step ${step.step}: [Line ${step.line}] ${step.action} in ${step.function}\n`;
    }

    if (errorPoint) {
      flow += `\nError detected at line ${errorPoint.line} in ${errorPoint.function}: ${errorPoint.reason}`;
    } else {
      flow += '\nNo obvious error point detected in the trace.';
    }

    return flow;
  }

  // ─── Fix Suggestion Helpers ────────────────────────────────────

  private suggestTypeErrorFixes(
    errorMessage: string,
    lines: string[],
    language: string,
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    // Cannot read properties of undefined
    if (
      errorMessage.includes('cannot read properties of') ||
      errorMessage.includes('cannot read propert')
    ) {
      suggestions.push({
        id: 'fix-null-guard',
        title: 'Add null/undefined guard',
        description: 'Add optional chaining or null check before accessing properties',
        codeChange: 'Replace obj.prop with obj?.prop or add if (obj) check',
        confidence: 0.85,
        autoFixable: true,
        sideEffects: ['May silently return undefined instead of throwing'],
      });

      suggestions.push({
        id: 'fix-default-value',
        title: 'Provide default value',
        description: 'Use nullish coalescing to provide a default value',
        codeChange: 'Replace obj.prop with (obj?.prop) ?? defaultValue',
        confidence: 0.7,
        autoFixable: true,
        sideEffects: ['Behavior changes if the property was intentionally undefined'],
      });
    }

    // is not a function
    if (errorMessage.includes('is not a function')) {
      suggestions.push({
        id: 'fix-method-check',
        title: 'Add method existence check',
        description: 'Check if the method exists before calling it',
        codeChange: 'Replace obj.method() with typeof obj.method === "function" && obj.method()',
        confidence: 0.6,
        autoFixable: false,
        sideEffects: ['Condition may silently skip the method call'],
      });
    }

    return suggestions;
  }

  private suggestReferenceErrorFixes(
    errorMessage: string,
    lines: string[],
    language: string,
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];
    const match = errorMessage.match(/(\w+)\s+is not defined/i);
    const varName = match ? match[1] : '';

    if (varName) {
      // Check if it might be a missing import
      const hasImportSection = lines.some(
        (l) => l.startsWith('import ') || l.startsWith('require('),
      );
      if (hasImportSection) {
        suggestions.push({
          id: 'fix-missing-import',
          title: `Add missing import for "${varName}"`,
          description: `The variable "${varName}" is referenced but not imported. Add an import statement.`,
          codeChange: `import { ${varName} } from 'module';`,
          confidence: 0.75,
          autoFixable: false,
          sideEffects: ['Need to determine the correct module path'],
        });
      }

      suggestions.push({
        id: 'fix-typo',
        title: `Check for typo: "${varName}"`,
        description: `"${varName}" may be a typo. Check similar variable names in scope.`,
        codeChange: `Search for similar names in the codebase`,
        confidence: 0.4,
        autoFixable: false,
        sideEffects: [],
      });

      suggestions.push({
        id: 'fix-declare',
        title: `Declare "${varName}"`,
        description: `Add a declaration for "${varName}" if it was intended to be used.`,
        codeChange: `const ${varName} = /* provide value */;`,
        confidence: 0.3,
        autoFixable: false,
        sideEffects: ['Must provide the correct initial value'],
      });
    }

    return suggestions;
  }

  private suggestNullErrorFixes(
    errorMessage: string,
    lines: string[],
    language: string,
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    suggestions.push({
      id: 'fix-optional-chaining',
      title: 'Use optional chaining',
      description:
        'Replace property access with optional chaining operator to safely handle null/undefined',
      codeChange: 'Replace obj.prop with obj?.prop',
      confidence: 0.9,
      autoFixable: true,
      sideEffects: ['Changes behavior: returns undefined instead of throwing'],
    });

    suggestions.push({
      id: 'fix-null-check',
      title: 'Add explicit null check',
      description: 'Add an if-statement to check for null/undefined before access',
      codeChange: 'Add: if (obj != null) { ... } around the access',
      confidence: 0.85,
      autoFixable: false,
      sideEffects: ['Must handle the null case appropriately'],
    });

    suggestions.push({
      id: 'fix-initialize',
      title: 'Initialize with default value',
      description: 'Ensure the variable is initialized before use',
      codeChange: 'Initialize: const obj = existingObj || {}',
      confidence: 0.7,
      autoFixable: false,
      sideEffects: ['Default value may not match expected type'],
    });

    return suggestions;
  }

  private suggestSyntaxErrorFixes(
    errorMessage: string,
    lines: string[],
    language: string,
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    // Missing closing bracket
    if (errorMessage.includes('unexpected end') || errorMessage.includes('EOF')) {
      suggestions.push({
        id: 'fix-missing-bracket',
        title: 'Add missing closing bracket',
        description: 'The code may be missing a closing bracket, brace, or parenthesis',
        codeChange: 'Review and add missing closing delimiters',
        confidence: 0.7,
        autoFixable: false,
        sideEffects: [],
      });
    }

    // Unexpected token
    if (errorMessage.includes('unexpected token')) {
      const tokenMatch = errorMessage.match(/unexpected token\s+['"]?(\S+)['"]?/i);
      const token = tokenMatch ? tokenMatch[1] : '';

      suggestions.push({
        id: 'fix-unexpected-token',
        title: `Fix unexpected token "${token}"`,
        description: `The token "${token}" was not expected. Check for missing operators, delimiters, or typos.`,
        codeChange: 'Review syntax around the error location',
        confidence: 0.5,
        autoFixable: false,
        sideEffects: [],
      });
    }

    return suggestions;
  }

  private suggestRangeErrorFixes(
    errorMessage: string,
    lines: string[],
    language: string,
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    suggestions.push({
      id: 'fix-bound-check',
      title: 'Add boundary check',
      description: 'Add range validation before array access or numeric operations',
      codeChange: 'Add: if (index >= 0 && index < array.length) before access',
      confidence: 0.7,
      autoFixable: false,
      sideEffects: ['Must handle out-of-range case'],
    });

    suggestions.push({
      id: 'fix-recursive-base',
      title: 'Fix recursion base case',
      description: 'If this is a RangeError from recursion, check the base case',
      codeChange: 'Ensure recursive function has a proper termination condition',
      confidence: 0.6,
      autoFixable: false,
      sideEffects: [],
    });

    return suggestions;
  }

  private suggestGenericFixes(
    errorMessage: string,
    lines: string[],
    language: string,
  ): FixSuggestion[] {
    return [
      {
        id: 'fix-add-error-handling',
        title: 'Add error handling',
        description: 'Wrap the error-prone code in a try-catch block',
        codeChange: 'Add try-catch around the failing code section',
        confidence: 0.5,
        autoFixable: false,
        sideEffects: ['Error may be silently caught; ensure proper handling'],
      },
      {
        id: 'fix-log-debug',
        title: 'Add debug logging',
        description: 'Add logging to trace the values leading to the error',
        codeChange: 'Add console.log/debug statements before the error point',
        confidence: 0.4,
        autoFixable: true,
        sideEffects: ['Adds temporary debug output that should be removed'],
      },
    ];
  }

  // ─── Apply Fix Helpers ─────────────────────────────────────────

  private findTargetLine(lines: string[], fix: Record<string, any>, language: string): number {
    // Try to find the line based on the fix description
    if (fix.search) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(fix.search)) return i;
      }
    }

    if (fix.pattern) {
      const regex = new RegExp(fix.pattern);
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) return i;
      }
    }

    return -1;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ─── Validation Helpers ────────────────────────────────────────

  private performBasicSyntaxCheck(
    code: string,
    language: string,
  ): { valid: boolean; message: string } {
    // Check for obvious syntax issues
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;

    if (Math.abs(openBraces - closeBraces) > 1) {
      return {
        valid: false,
        message: `Unbalanced braces: ${openBraces} open, ${closeBraces} close`,
      };
    }

    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;

    if (Math.abs(openParens - closeParens) > 1) {
      return {
        valid: false,
        message: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
      };
    }

    return { valid: true, message: 'No obvious syntax issues detected' };
  }

  private checkErrorPatternExists(
    code: string,
    errorMessage: string,
    errorType: string,
    language: string,
  ): boolean {
    const lower = errorMessage.toLowerCase();

    if (lower.includes('null') || lower.includes('undefined')) {
      // Check for property access without optional chaining
      const propAccessWithoutChaining = code.match(/\w+\.\w+/g);
      const chainedAccess = code.match(/\w+\?\.\w+/g);
      const unchainedCount =
        (propAccessWithoutChaining?.length || 0) - (chainedAccess?.length || 0);
      return unchainedCount > 5; // If many unchained accesses remain, pattern may still exist
    }

    return false;
  }

  private detectNewIssues(
    originalCode: string,
    fixedCode: string,
    language: string,
  ): ValidationError[] {
    const issues: ValidationError[] = [];

    // Check for accidentally deleted code
    const originalLines = originalCode.split('\n').filter((l) => l.trim().length > 0);
    const fixedLines = fixedCode.split('\n').filter((l) => l.trim().length > 0);

    if (originalLines.length - fixedLines.length > 5) {
      issues.push({
        type: 'deletion',
        message: 'Significant code was removed — verify this was intentional',
        severity: 'medium',
      });
    }

    // Check for duplicate lines introduced
    const lineCounts = new Map<string, number>();
    for (const line of fixedLines) {
      if (line.trim().length > 10) {
        lineCounts.set(line.trim(), (lineCounts.get(line.trim()) || 0) + 1);
      }
    }
    const duplicates = Array.from(lineCounts.entries()).filter(([, count]) => count > 1);
    if (duplicates.length > 2) {
      issues.push({
        type: 'duplication',
        message: 'Duplicate lines detected in fixed code',
        severity: 'low',
      });
    }

    return issues;
  }

  private checkBalancedDelimiters(code: string): { balanced: boolean; message: string } {
    const stack: string[] = [];
    const pairs: Record<string, string> = { '{': '}', '(': ')', '[': ']' };

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      if (char in pairs) {
        stack.push(char);
      } else if (Object.values(pairs).includes(char)) {
        if (stack.length === 0) {
          return {
            balanced: false,
            message: `Unmatched closing delimiter '${char}' at position ${i}`,
          };
        }
        const last = stack.pop()!;
        if (pairs[last] !== char) {
          return {
            balanced: false,
            message: `Mismatched delimiters: '${last}' and '${char}' at position ${i}`,
          };
        }
      }
    }

    if (stack.length > 0) {
      return { balanced: false, message: `Unclosed delimiter(s): ${stack.join(', ')}` };
    }

    return { balanced: true, message: 'All delimiters are balanced' };
  }

  private checkImportConsistency(
    originalCode: string,
    fixedCode: string,
    language: string,
  ): { consistent: boolean; message: string } {
    const originalImports = this.extractImports(originalCode);
    const fixedImports = this.extractImports(fixedCode);

    // Check that no imports were accidentally removed
    const removedImports = originalImports.filter((imp) => !fixedImports.includes(imp));

    if (removedImports.length > 0) {
      return {
        consistent: false,
        message: `Imports removed: ${removedImports.join(', ')}`,
      };
    }

    return { consistent: true, message: 'Import statements are consistent' };
  }

  private extractImports(code: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }
}
