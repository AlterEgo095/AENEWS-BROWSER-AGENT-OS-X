import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * CodeGenerationAgent — LLM-powered code generation.
 *
 * Generates, completes, refactors, translates, and scaffolds source code
 * across multiple languages and frameworks.
 *
 * When LLM is available: Uses real LLM calls for intelligent code generation.
 * When Bridge is available: Uses coding connector for code analysis.
 * Falls back to structured simulation when services are unavailable.
 */
export class CodeGenerationAgent extends BaseAgent {
  readonly name = 'CodeGenerationAgent';
  readonly cluster = ClusterType.CODING;
  readonly capabilities = [
    'generate',
    'complete',
    'refactor',
    'translate',
    'scaffold',
  ];
  readonly version = '2.0.0';
  readonly description =
    'LLM-powered code generation, completion, refactoring, translation, and scaffolding across multiple languages';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'generate';
      const startTime = Date.now();

      switch (action) {
        case 'generate': {
          const language = config.language || 'typescript';
          const framework = config.framework;
          const prompt = config.prompt;
          const filePath = config.filePath;
          const template = config.template;
          const options = config.options || {};

          if (!prompt && !template) {
            return {
              success: false,
              error: 'Either "prompt" or "template" is required for code generation',
            };
          }

          this.logger.log(
            `Generating ${language} code${framework ? ` with ${framework}` : ''} — prompt: ${(prompt || template || '').substring(0, 80)}...`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, language, framework });

          // Try LLM-powered code generation
          const llmResult = await this.executeWithLLM(
            `You are an expert code generator. Generate the following code.
Return ONLY valid ${language} code. ${framework ? `Use the ${framework} framework.` : ''}
Include necessary imports. Follow best practices and modern patterns.
${options.style === 'minimal' ? 'Keep the code minimal and focused.' : 'Include comprehensive error handling and comments.'}`,
            `Generate ${language} code for: ${prompt || template}\n${filePath ? `File path: ${filePath}` : ''}\n${options.additionalContext ? `Additional context: ${options.additionalContext}` : ''}`,
            { responseFormat: 'text', temperature: 0.2, maxTokens: 4096 },
          );

          if (llmResult) {
            // Try bridge for code analysis
            let bridgeAnalysis: any = null;
            try {
              bridgeAnalysis = await this.executeViaBridge('coding', 'analyze', {
                sourceCode: llmResult,
                language,
              });
            } catch {
              // Bridge unavailable
            }

            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, language, codeLength: llmResult.length });
            return {
              success: true,
              data: {
                action,
                language,
                framework,
                filePath,
                prompt: prompt || template,
                generatedCode: llmResult,
                imports: this.extractImports(llmResult, language),
                exports: this.extractExports(llmResult, language),
                dependencies: [],
                options,
                analysis: bridgeAnalysis || null,
                status: 'generated',
                generatedBy: 'llm',
                timestamp: new Date().toISOString(),
              },
              metadata: { duration: Date.now() - startTime, source: 'llm', codeLength: llmResult.length },
            };
          }

          // Try bridge connector for code generation
          let bridgeResult: any = null;
          try {
            bridgeResult = await this.executeViaBridge('coding', 'generate', {
              language,
              framework,
              prompt: prompt || template,
              filePath,
            });
          } catch {
            // Bridge unavailable
          }

          if (bridgeResult) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, language, source: 'bridge' });
            return {
              success: true,
              data: {
                action,
                language,
                framework,
                filePath,
                prompt: prompt || template,
                generatedCode: bridgeResult.result || '',
                imports: [],
                exports: [],
                dependencies: [],
                options,
                status: 'generated',
                generatedBy: 'bridge',
                timestamp: new Date().toISOString(),
              },
              metadata: { duration: Date.now() - startTime, source: 'bridge' },
            };
          }

          // Fallback
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, language, source: 'fallback' });
          return {
            success: true,
            data: {
              action,
              language,
              framework,
              filePath,
              prompt: prompt || template,
              generatedCode: '',
              imports: [] as string[],
              exports: [] as string[],
              dependencies: [] as string[],
              options,
              status: 'generated',
              generatedBy: 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback', note: 'LLM and Bridge unavailable — empty code returned' },
          };
        }

        case 'complete': {
          const language = config.language || 'typescript';
          const sourceCode = config.sourceCode;
          const cursorPosition = config.cursorPosition || 0;
          const maxTokens = config.maxTokens || 256;

          if (!sourceCode) {
            return { success: false, error: '"sourceCode" is required for code completion' };
          }

          this.logger.log(
            `Completing ${language} code at position ${cursorPosition} (maxTokens: ${maxTokens})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, language });

          // Get context around cursor
          const beforeCursor = sourceCode.slice(0, cursorPosition);
          const afterCursor = sourceCode.slice(cursorPosition, cursorPosition + 500);

          const llmResult = await this.executeWithLLM(
            `You are an expert code completion assistant. Complete the code at the cursor position.
Return ONLY the completion text, nothing else. Do not repeat code before the cursor.`,
            `Language: ${language}\nCode before cursor:\n\`\`\`\n${beforeCursor.slice(-2000)}\n\`\`\`\nCode after cursor:\n\`\`\`\n${afterCursor.slice(0, 500)}\n\`\`\``,
            { responseFormat: 'text', temperature: 0.1, maxTokens },
          );

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, language });
          return {
            success: true,
            data: {
              action,
              language,
              cursorPosition,
              maxTokens,
              completion: llmResult || '',
              suggestions: llmResult
                ? [{ text: llmResult, confidence: 0.9, type: 'completion' }]
                : [],
              status: 'completed',
              generatedBy: llmResult ? 'llm' : 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: llmResult ? 'llm' : 'fallback' },
          };
        }

        case 'refactor': {
          const language = config.language || 'typescript';
          const sourceCode = config.sourceCode;
          const strategy = config.strategy || 'readability';
          const preserveBehavior = config.preserveBehavior !== false;

          if (!sourceCode) {
            return { success: false, error: '"sourceCode" is required for refactoring' };
          }

          this.logger.log(
            `Refactoring ${language} code with strategy "${strategy}" (preserveBehavior: ${preserveBehavior})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, language, strategy });

          const llmResult = await this.executeWithLLM(
            `You are an expert code refactoring assistant. Refactor the given code with focus on ${strategy}.
${preserveBehavior ? 'Preserve the exact same behavior — do not change any external interfaces.' : 'You may adjust interfaces if it improves the design.'}
Return the refactored code as plain text.`,
            `Language: ${language}\nStrategy: ${strategy}\nCode:\n\`\`\`\n${sourceCode.slice(0, 6000)}\n\`\`\``,
            { responseFormat: 'text', temperature: 0.2, maxTokens: 4096 },
          );

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, language });
          return {
            success: true,
            data: {
              action,
              language,
              strategy,
              preserveBehavior,
              targetPatterns: config.targetPatterns || [],
              maxComplexity: config.maxComplexity,
              refactoredCode: llmResult || '',
              changes: llmResult ? [{ type: 'refactor', description: `Applied ${strategy} refactoring via LLM`, lineStart: 0, lineEnd: 0 }] : [],
              metrics: {
                originalComplexity: 0,
                refactoredComplexity: 0,
                linesReduced: sourceCode.split('\n').length - (llmResult?.split('\n').length || 0),
                duplicationReduced: 0,
              },
              status: 'refactored',
              generatedBy: llmResult ? 'llm' : 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: llmResult ? 'llm' : 'fallback' },
          };
        }

        case 'translate': {
          const sourceLanguage = config.sourceLanguage;
          const targetLanguage = config.targetLanguage;
          const sourceCode = config.sourceCode;
          const preserveComments = config.preserveComments !== false;
          const adaptIdioms = config.adaptIdioms !== false;

          if (!sourceLanguage || !targetLanguage || !sourceCode) {
            return { success: false, error: '"sourceLanguage", "targetLanguage", and "sourceCode" are required for translation' };
          }

          this.logger.log(`Translating code from ${sourceLanguage} to ${targetLanguage}`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, sourceLanguage, targetLanguage });

          const llmResult = await this.executeWithLLM(
            `You are an expert code translator. Translate the code from ${sourceLanguage} to ${targetLanguage}.
${preserveComments ? 'Preserve all comments.' : ''} ${adaptIdioms ? 'Adapt language-specific idioms and patterns.' : ''}
Return ONLY the translated code.`,
            `Source code:\n\`\`\`\n${sourceCode.slice(0, 6000)}\n\`\`\``,
            { responseFormat: 'text', temperature: 0.2, maxTokens: 4096 },
          );

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, targetLanguage });
          return {
            success: true,
            data: {
              action,
              sourceLanguage,
              targetLanguage,
              preserveComments,
              adaptIdioms,
              translatedCode: llmResult || '',
              translationNotes: llmResult ? ['Translated via LLM'] : ['LLM unavailable for translation'],
              unmappedConstructs: [],
              status: 'translated',
              generatedBy: llmResult ? 'llm' : 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: llmResult ? 'llm' : 'fallback' },
          };
        }

        case 'scaffold': {
          const projectType = config.projectType || 'library';
          const language = config.language || 'typescript';
          const framework = config.framework;
          const projectName = config.projectName;
          const features = config.features || [];

          if (!projectName) {
            return { success: false, error: '"projectName" is required for scaffolding' };
          }

          this.logger.log(
            `Scaffolding ${projectType} project "${projectName}" in ${language}${framework ? ` with ${framework}` : ''}`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, projectType, language, projectName });

          const llmResult = await this.executeWithLLM(
            `You are a project scaffolding expert. Generate a project structure for the following project.
Return a JSON object with this structure:
{
  "files": [
    { "path": "...", "content": "...", "description": "..." }
  ],
  "structure": {
    "directories": ["..."],
    "entryPoint": "...",
    "configFiles": ["..."]
  },
  "nextSteps": ["..."]
}`,
            `Project type: ${projectType}\nLanguage: ${language}\nFramework: ${framework || 'none'}\nProject name: ${projectName}\nFeatures: ${JSON.stringify(features)}`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 4096 },
          );

          const parsed = this.safeJsonParse(llmResult);

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, projectName });
          return {
            success: true,
            data: {
              action,
              projectType,
              language,
              framework,
              projectName,
              features,
              outputDir: config.outputDir,
              files: parsed?.files || [],
              structure: parsed?.structure || { directories: [], entryPoint: '', configFiles: [] },
              nextSteps: parsed?.nextSteps || [],
              status: 'scaffolded',
              generatedBy: parsed ? 'llm' : 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: parsed ? 'llm' : 'fallback' },
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Supported actions: generate, complete, refactor, translate, scaffold`,
          };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private extractImports(code: string, language: string): string[] {
    const patterns: Record<string, RegExp> = {
      typescript: /import\s+.*?from\s+['"](.*?)['"]/g,
      javascript: /import\s+.*?from\s+['"](.*?)['"]/g,
      python: /import\s+(\S+)|from\s+(\S+)\s+import/g,
      java: /import\s+([\w.]+);/g,
      go: /import\s+"([^"]+)"/g,
    };
    const regex = patterns[language] || patterns.typescript;
    const imports: string[] = [];
    let match;
    while ((match = regex.exec(code)) !== null) {
      imports.push(match[1] || match[2] || match[0]);
    }
    return imports;
  }

  private extractExports(code: string, language: string): string[] {
    const patterns: Record<string, RegExp> = {
      typescript: /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)/g,
      javascript: /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g,
      python: /^(?:class|def)\s+(\w+)/gm,
      java: /public\s+(?:class|interface|enum)\s+(\w+)/g,
    };
    const regex = patterns[language] || patterns.typescript;
    const exports: string[] = [];
    let match;
    while ((match = regex.exec(code)) !== null) {
      exports.push(match[1]);
    }
    return exports;
  }
}
