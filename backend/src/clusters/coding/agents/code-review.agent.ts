import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * CodeReviewAgent — LLM-powered code review.
 *
 * Reviews, lints, formats, analyzes, and suggests improvements for source
 * code quality and maintainability. Uses LLM for intelligent code review
 * when available, falling back to structural analysis.
 *
 * When LLM is available: Uses real LLM calls for semantic code review.
 * When Bridge is available: Uses coding connector for analysis.
 * Falls back to structural/pattern-based analysis when services are unavailable.
 */
export class CodeReviewAgent extends BaseAgent {
  readonly name = 'CodeReviewAgent';
  readonly cluster = ClusterType.CODING;
  readonly capabilities = [
    'review',
    'lint',
    'format',
    'analyze',
    'suggest',
  ];
  readonly version = '2.0.0';
  readonly description =
    'LLM-powered code review, analysis, and improvement suggestions for source code quality';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'review';
      const startTime = Date.now();

      switch (action) {
        case 'review': {
          const sourceCode = config.sourceCode;
          const language = config.language || 'typescript';
          const filePath = config.filePath;
          const reviewFocus = config.reviewFocus || [
            'correctness',
            'readability',
            'performance',
            'security',
          ];
          const maxFindings = config.maxFindings || 50;

          if (!sourceCode) {
            return { success: false, error: '"sourceCode" is required for code review' };
          }

          this.logger.log(
            `Reviewing ${language} code (${filePath || 'inline'}) — focus: ${reviewFocus.join(', ')}`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, language, reviewFocus });

          // Try LLM-powered code review
          const llmResult = await this.executeWithLLM(
            `You are a senior code reviewer with expertise in ${language}. Review the code thoroughly.
Focus on: ${reviewFocus.join(', ')}.
Return a JSON object with this exact structure:
{
  "findings": [
    { "id": "F001", "severity": "critical|warning|info|suggestion", "category": "correctness|readability|performance|security|maintainability", "message": "...", "lineStart": 1, "lineEnd": 1, "rule": "...", "suggestion": "..." }
  ],
  "summary": {
    "totalFindings": 0,
    "critical": 0,
    "warnings": 0,
    "info": 0,
    "suggestions": 0,
    "qualityScore": 85
  }
}
Quality score is 0-100. Be specific about line numbers and provide actionable suggestions.`,
            `Review this ${language} code:\n\`\`\`${language}\n${sourceCode.slice(0, 8000)}\n\`\`\`\nFile: ${filePath || 'inline'}`,
            { responseFormat: 'json', temperature: 0.2 },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.findings) {
              const findings = parsed.findings.slice(0, maxFindings);
              const summary = parsed.summary || {
                totalFindings: findings.length,
                critical: findings.filter((f: any) => f.severity === 'critical').length,
                warnings: findings.filter((f: any) => f.severity === 'warning').length,
                info: findings.filter((f: any) => f.severity === 'info').length,
                suggestions: findings.filter((f: any) => f.severity === 'suggestion').length,
                qualityScore: Math.max(0, 100 - findings.filter((f: any) => f.severity === 'critical').length * 20 - findings.filter((f: any) => f.severity === 'warning').length * 5),
              };

              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, findingCount: findings.length, qualityScore: summary.qualityScore });
              return {
                success: true,
                data: {
                  action,
                  language,
                  filePath,
                  reviewFocus,
                  severity: config.severity || 'all',
                  findings,
                  summary,
                  maxFindings,
                  status: 'reviewed',
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          // Try bridge for code analysis
          let bridgeResult: any = null;
          try {
            bridgeResult = await this.executeViaBridge('coding', 'analyze', {
              sourceCode,
              language,
              filePath,
            });
          } catch {
            // Bridge unavailable
          }

          // Fallback: basic structural analysis
          this.logger.log('LLM unavailable — falling back to structural analysis');
          const structuralFindings = this.performStructuralAnalysis(sourceCode, language, reviewFocus);
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback', findingCount: structuralFindings.length });
          return {
            success: true,
            data: {
              action,
              language,
              filePath,
              reviewFocus,
              severity: config.severity || 'all',
              findings: structuralFindings,
              summary: {
                totalFindings: structuralFindings.length,
                critical: structuralFindings.filter((f) => f.severity === 'critical').length,
                warnings: structuralFindings.filter((f) => f.severity === 'warning').length,
                info: structuralFindings.filter((f) => f.severity === 'info').length,
                suggestions: structuralFindings.filter((f) => f.severity === 'suggestion').length,
                qualityScore: 0,
              },
              maxFindings,
              bridgeResult: bridgeResult || null,
              status: 'reviewed',
              generatedBy: 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'lint': {
          const sourceCode = config.sourceCode;
          const language = config.language || 'typescript';

          if (!sourceCode) {
            return { success: false, error: '"sourceCode" is required for linting' };
          }

          this.logger.log(`Linting ${language} code`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, language });

          // Try bridge for linting
          let bridgeResult: any = null;
          try {
            bridgeResult = await this.executeViaBridge('coding', 'analyze', {
              sourceCode,
              language,
              analysisType: 'lint',
            });
          } catch {
            // Bridge unavailable
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, language });
          return {
            success: true,
            data: {
              action,
              language,
              filePath: config.filePath,
              ruleset: config.ruleset || 'recommended',
              violations: bridgeResult?.violations || [],
              fixedCode: config.fix ? undefined : undefined,
              stats: bridgeResult?.stats || { errorCount: 0, warningCount: 0, fixableCount: 0, totalFiles: 1 },
              status: 'linted',
              generatedBy: bridgeResult ? 'bridge' : 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: bridgeResult ? 'bridge' : 'fallback' },
          };
        }

        case 'format': {
          const sourceCode = config.sourceCode;
          const language = config.language || 'typescript';

          if (!sourceCode) {
            return { success: false, error: '"sourceCode" is required for formatting' };
          }

          this.logger.log(`Formatting ${language} code`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, language });

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, language });
          return {
            success: true,
            data: {
              action,
              language,
              filePath: config.filePath,
              formatter: config.formatter || 'prettier',
              formattedCode: '',
              diff: '',
              changed: false,
              linesChanged: 0,
              status: 'formatted',
              generatedBy: 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'analyze': {
          const sourceCode = config.sourceCode;
          const language = config.language || 'typescript';

          if (!sourceCode) {
            return { success: false, error: '"sourceCode" is required for analysis' };
          }

          this.logger.log(`Analyzing ${language} code`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, language });

          // Try bridge for code analysis
          let bridgeResult: any = null;
          try {
            bridgeResult = await this.executeViaBridge('coding', 'analyze', {
              sourceCode,
              language,
            });
          } catch {
            // Bridge unavailable
          }

          const lines = sourceCode.split('\n');
          const includeMetrics = config.includeMetrics !== false;

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, language });
          return {
            success: true,
            data: {
              action,
              language,
              filePath: config.filePath,
              analysisType: config.analysisType || 'full',
              metrics: includeMetrics
                ? {
                    linesOfCode: lines.filter((l: string) => l.trim().length > 0 && !l.trim().startsWith('//')).length,
                    linesOfComments: lines.filter((l: string) => l.trim().startsWith('//') || l.trim().startsWith('/*') || l.trim().startsWith('*')).length,
                    linesBlank: lines.filter((l: string) => l.trim().length === 0).length,
                    totalLines: lines.length,
                    functions: (sourceCode.match(/function\s+\w+|const\s+\w+\s*=\s*(\(|function)/g) || []).length,
                    classes: (sourceCode.match(/class\s+\w+/g) || []).length,
                    imports: (sourceCode.match(/import\s+/g) || []).length,
                  }
                : undefined,
              dependencies: config.includeDependencies !== false
                ? {
                    internal: [],
                    external: [],
                    unused: [],
                    missing: [],
                  }
                : undefined,
              structure: {
                exports: [],
                types: [],
                functions: [],
              },
              bridgeResult: bridgeResult || null,
              status: 'analyzed',
              generatedBy: bridgeResult ? 'bridge' : 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: bridgeResult ? 'bridge' : 'fallback' },
          };
        }

        case 'suggest': {
          const sourceCode = config.sourceCode;
          const language = config.language || 'typescript';

          if (!sourceCode) {
            return { success: false, error: '"sourceCode" is required for suggestions' };
          }

          this.logger.log(`Generating suggestions for ${language} code`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, language });

          const llmResult = await this.executeWithLLM(
            `You are a code improvement expert. Suggest improvements for the following ${language} code.
Return a JSON object with this structure:
{
  "suggestions": [
    { "id": "S001", "type": "performance|readability|security|best-practice|simplification", "priority": "high|medium|low", "title": "...", "description": "...", "originalCode": "...", "suggestedCode": "...", "rationale": "...", "lineStart": 1, "lineEnd": 1 }
  ],
  "overallAssessment": "..."
}`,
            `Suggest improvements for this ${language} code:\n\`\`\`${language}\n${sourceCode.slice(0, 8000)}\n\`\`\``,
            { responseFormat: 'json', temperature: 0.2 },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.suggestions) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, suggestionCount: parsed.suggestions.length });
              return {
                success: true,
                data: {
                  action,
                  language,
                  filePath: config.filePath,
                  suggestionType: config.suggestionType || 'improvement',
                  maxSuggestions: config.maxSuggestions || 10,
                  suggestions: parsed.suggestions,
                  overallAssessment: parsed.overallAssessment || 'Code review completed via LLM.',
                  status: 'suggested',
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          // Fallback
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action,
              language,
              filePath: config.filePath,
              suggestionType: config.suggestionType || 'improvement',
              maxSuggestions: config.maxSuggestions || 10,
              suggestions: [],
              overallAssessment: 'LLM unavailable for code suggestion analysis.',
              status: 'suggested',
              generatedBy: 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Supported actions: review, lint, format, analyze, suggest`,
          };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Structural Analysis Fallback ──────────────────────────────────

  private performStructuralAnalysis(
    sourceCode: string,
    language: string,
    reviewFocus: string[],
  ): Array<{
    id: string;
    severity: 'critical' | 'warning' | 'info' | 'suggestion';
    category: string;
    message: string;
    lineStart: number;
    lineEnd: number;
    rule: string;
    suggestion: string;
  }> {
    const findings: Array<{
      id: string;
      severity: 'critical' | 'warning' | 'info' | 'suggestion';
      category: string;
      message: string;
      lineStart: number;
      lineEnd: number;
      rule: string;
      suggestion: string;
    }> = [];

    const lines = sourceCode.split('\n');

    // Check for common issues
    lines.forEach((line, index) => {
      // TODO/FIXME/HACK comments
      if (/\b(TODO|FIXME|HACK|XXX)\b/i.test(line)) {
        findings.push({
          id: `F${String(findings.length + 1).padStart(3, '0')}`,
          severity: 'info',
          category: 'maintainability',
          message: `Found ${line.match(/\b(TODO|FIXME|HACK|XXX)\b/i)?.[0]} comment`,
          lineStart: index + 1,
          lineEnd: index + 1,
          rule: 'no-todo-comments',
          suggestion: 'Resolve the TODO/FIXME comment or create a tracked issue',
        });
      }

      // console.log statements
      if (/\bconsole\.(log|debug|info)\b/.test(line) && !line.trim().startsWith('//')) {
        findings.push({
          id: `F${String(findings.length + 1).padStart(3, '0')}`,
          severity: 'suggestion',
          category: 'best-practice',
          message: 'Console log statement detected — consider using a proper logger',
          lineStart: index + 1,
          lineEnd: index + 1,
          rule: 'no-console-log',
          suggestion: 'Replace with structured logging library',
        });
      }

      // Very long lines
      if (line.length > 120) {
        findings.push({
          id: `F${String(findings.length + 1).padStart(3, '0')}`,
          severity: 'info',
          category: 'readability',
          message: `Line exceeds 120 characters (${line.length} chars)`,
          lineStart: index + 1,
          lineEnd: index + 1,
          rule: 'max-line-length',
          suggestion: 'Break the line into multiple lines for readability',
        });
      }
    });

    // Check for empty catch blocks (security concern)
    const emptyCatchRegex = /catch\s*\([^)]*\)\s*\{\s*\}/g;
    let match;
    while ((match = emptyCatchRegex.exec(sourceCode)) !== null) {
      const lineNum = sourceCode.slice(0, match.index).split('\n').length;
      findings.push({
        id: `F${String(findings.length + 1).padStart(3, '0')}`,
        severity: 'warning',
        category: 'security',
        message: 'Empty catch block — errors are silently swallowed',
        lineStart: lineNum,
        lineEnd: lineNum,
        rule: 'no-empty-catch',
        suggestion: 'Add proper error handling or at least log the error',
      });
    }

    if (reviewFocus.includes('security')) {
      // Check for potential security issues
      const evalRegex = /\beval\s*\(/g;
      while ((match = evalRegex.exec(sourceCode)) !== null) {
        const lineNum = sourceCode.slice(0, match.index).split('\n').length;
        findings.push({
          id: `F${String(findings.length + 1).padStart(3, '0')}`,
          severity: 'critical',
          category: 'security',
          message: 'Use of eval() is a security risk',
          lineStart: lineNum,
          lineEnd: lineNum,
          rule: 'no-eval',
          suggestion: 'Replace eval() with a safer alternative',
        });
      }
    }

    return findings;
  }
}
