/**
 * AENEWS Agent OS X - Code Generation Agent
 * Generates code from specifications, templates, and natural language descriptions.
 * Supports refactoring and optimization of existing code.
 */

import { Injectable, Inject } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
import { DevCapability } from '../../../software-factory/interfaces';

// ─── Agent Configuration ──────────────────────────────────────────

export const CODE_GENERATION_AGENT_CONFIG: AgentConfig = {
  id: 'coding-code-generation',
  name: 'CodeGeneration',
  cluster: AgentCluster.CODING,
  version: '1.0.0',
  description:
    'Generate code from specifications, templates, and natural language descriptions. Supports refactoring and optimization of existing code with multi-language support.',
  capabilities: [
    {
      name: 'generateFromSpec',
      description: 'Generate code from a structured specification document',
      inputSchema: {
        type: 'object',
        properties: {
          spec: { type: 'string', description: 'Structured specification document' },
          language: { type: 'string', description: 'Target programming language' },
          framework: { type: 'string', description: 'Target framework (e.g., NestJS, React)' },
          style: { type: 'string', description: 'Code style guide to follow' },
        },
        required: ['spec', 'language'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          language: { type: 'string' },
          files: { type: 'array', items: { type: 'object' } },
          warnings: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'generateFromTemplate',
      description: 'Generate code from a pre-defined template with variable substitution',
      inputSchema: {
        type: 'object',
        properties: {
          templateId: { type: 'string', description: 'Template identifier' },
          variables: { type: 'object', description: 'Key-value pairs for template substitution' },
          outputFileName: { type: 'string', description: 'Desired output file name' },
        },
        required: ['templateId', 'variables'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          fileName: { type: 'string' },
          templateId: { type: 'string' },
          substitutedVars: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'generateFromDescription',
      description: 'Generate code from a natural language description',
      inputSchema: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Natural language description of desired code',
          },
          language: { type: 'string', description: 'Target programming language' },
          context: { type: 'string', description: 'Additional context or existing code' },
          constraints: {
            type: 'array',
            items: { type: 'string' },
            description: 'Constraints to follow',
          },
        },
        required: ['description', 'language'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          language: { type: 'string' },
          explanation: { type: 'string' },
          imports: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'refactorCode',
      description: 'Refactor existing code to improve structure and readability',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Source code to refactor' },
          language: { type: 'string', description: 'Programming language' },
          goals: { type: 'array', items: { type: 'string' }, description: 'Refactoring goals' },
          preserveBehavior: { type: 'boolean', default: true },
        },
        required: ['code', 'language'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          refactoredCode: { type: 'string' },
          changes: { type: 'array', items: { type: 'object' } },
          improvedMetrics: { type: 'object' },
        },
      },
    },
    {
      name: 'optimizeCode',
      description: 'Optimize code for performance, memory, or other metrics',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Source code to optimize' },
          language: { type: 'string', description: 'Programming language' },
          target: { type: 'string', enum: ['performance', 'memory', 'readability', 'bundle-size'] },
          level: { type: 'string', enum: ['safe', 'moderate', 'aggressive'], default: 'safe' },
        },
        required: ['code', 'language', 'target'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          optimizedCode: { type: 'string' },
          improvements: { type: 'array', items: { type: 'object' } },
          estimatedGain: { type: 'string' },
          tradeoffs: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:code', 'write:code', 'read:templates', 'write:generated'],
  maxConcurrentTasks: 4,
  timeout: 60000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1500,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface CodeTemplate {
  id: string;
  language: string;
  framework: string;
  content: string;
  variables: string[];
  description: string;
}

interface GeneratedFile {
  name: string;
  path: string;
  content: string;
  language: string;
}

interface RefactoringChange {
  type: string;
  description: string;
  lineStart: number;
  lineEnd: number;
  before: string;
  after: string;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class CodeGenerationAgentService extends BaseAgentService {
  private templates: Map<string, CodeTemplate> = new Map();
  private generationHistory: Array<{
    action: string;
    language: string;
    timestamp: Date;
    success: boolean;
  }> = [];

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }

  protected defineConfig(): AgentConfig {
    return CODE_GENERATION_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    // Seed built-in templates
    this.seedTemplates();

    // Register tools
    this.registerTool({
      name: 'generateFromSpec',
      description: 'Generate code from a structured specification',
      execute: async (params: {
        spec: string;
        language: string;
        framework?: string;
        style?: string;
      }) => this.generateFromSpec(params),
    });

    this.registerTool({
      name: 'generateFromTemplate',
      description: 'Generate code from a pre-defined template',
      execute: async (params: {
        templateId: string;
        variables: Record<string, string>;
        outputFileName?: string;
      }) => this.generateFromTemplate(params),
    });

    this.registerTool({
      name: 'generateFromDescription',
      description: 'Generate code from a natural language description',
      execute: async (params: {
        description: string;
        language: string;
        context?: string;
        constraints?: string[];
      }) => this.generateFromDescription(params),
    });

    this.registerTool({
      name: 'refactorCode',
      description: 'Refactor existing code to improve structure and readability',
      execute: async (params: {
        code: string;
        language: string;
        goals?: string[];
        preserveBehavior?: boolean;
      }) => this.refactorCode(params),
    });

    this.registerTool({
      name: 'optimizeCode',
      description: 'Optimize code for performance, memory, or other metrics',
      execute: async (params: { code: string; language: string; target: string; level?: string }) =>
        this.optimizeCode(params),
    });

    await this.storeInWorkingMemory('codegen:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('CodeGeneration agent initialized with 5 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    // Delegate to real connector
    if (this.bridge) {
      try {
        // Determine FRONTEND vs BACKEND based on payload language/framework
        const lang = (input.payload?.language || '').toLowerCase();
        const framework = (input.payload?.framework || '').toLowerCase();
        const frontendLangs = ['html', 'css', 'javascript', 'typescript', 'jsx', 'tsx'];
        const frontendFrameworks = ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt'];
        const isFrontend =
          frontendLangs.includes(lang) || frontendFrameworks.some((f) => framework.includes(f));
        const capability = isFrontend ? DevCapability.FRONTEND : DevCapability.BACKEND;

        const result = await this.bridge.executeCapability(capability, {
          missionId: input.taskId,
          instruction: JSON.stringify(input.payload),
          workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
          parameters: input.payload,
        });

        return this.createAgentOutput(
          input.taskId,
          result.success,
          result.output,
          result.error,
          startTime,
        );
      } catch (error) {
        this.logger.warn(`Bridge failed, fallback to local: ${(error as Error).message}`);
      }
    }

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
      'generateFromSpec',
      'generateFromTemplate',
      'generateFromDescription',
      'refactorCode',
      'optimizeCode',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown code generation action: ${action}. Supported: ${supportedActions.join(', ')}`,
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

      this.generationHistory.push({
        action,
        language: params.language || 'unknown',
        timestamp: new Date(),
        success: true,
      });

      // Store generation result in session memory for context continuity
      await this.storeInWorkingMemory(
        `codegen:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`CodeGeneration execution failed for ${action}: ${msg}`);

      this.generationHistory.push({
        action,
        language: params.language || 'unknown',
        timestamp: new Date(),
        success: false,
      });

      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.templates.clear();
    this.generationHistory = [];
    this.logger.log('CodeGeneration agent destroyed, templates and history cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async generateFromSpec(params: {
    spec: string;
    language: string;
    framework?: string;
    style?: string;
  }): Promise<{
    code: string;
    language: string;
    files: GeneratedFile[];
    warnings: string[];
  }> {
    const { spec, language, framework, style } = params;

    if (!spec || typeof spec !== 'string') {
      throw new Error('A valid specification string is required');
    }
    if (!language || typeof language !== 'string') {
      throw new Error('A valid programming language is required');
    }

    const warnings: string[] = [];

    // Parse specification into structured sections
    const specSections = this.parseSpec(spec);
    const normalizedLang = this.normalizeLanguage(language);

    // Validate framework compatibility
    if (framework) {
      const isCompatible = this.validateFrameworkCompatibility(normalizedLang, framework);
      if (!isCompatible) {
        warnings.push(
          `Framework "${framework}" may not be fully compatible with ${normalizedLang}`,
        );
      }
    }

    // Generate code from each spec section
    const files: GeneratedFile[] = [];
    for (const section of specSections) {
      const generatedCode = this.synthesizeCode(section, normalizedLang, framework, style);
      const fileName = this.inferFileName(section.name, normalizedLang, framework);

      files.push({
        name: fileName,
        path: `./src/${section.name}/${fileName}`,
        content: generatedCode,
        language: normalizedLang,
      });
    }

    // Produce a main combined code output
    const code = files.map((f) => f.content).join('\n\n');

    this.logger.log(
      `Generated code from spec: ${files.length} file(s), language=${normalizedLang}, framework=${framework || 'none'}`,
    );

    return { code, language: normalizedLang, files, warnings };
  }

  private async generateFromTemplate(params: {
    templateId: string;
    variables: Record<string, string>;
    outputFileName?: string;
  }): Promise<{
    code: string;
    fileName: string;
    templateId: string;
    substitutedVars: string[];
  }> {
    const { templateId, variables, outputFileName } = params;

    if (!templateId || typeof templateId !== 'string') {
      throw new Error('A valid templateId is required');
    }
    if (!variables || typeof variables !== 'object') {
      throw new Error('Variables must be a key-value object');
    }

    const template = this.templates.get(templateId);
    if (!template) {
      const available = Array.from(this.templates.keys()).join(', ');
      throw new Error(`Template not found: ${templateId}. Available: ${available}`);
    }

    // Perform variable substitution
    let code = template.content;
    const substitutedVars: string[] = [];

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      if (code.includes(placeholder)) {
        code = code.replaceAll(placeholder, value);
        substitutedVars.push(key);
      }
    }

    // Check for unsubstituted variables
    const remainingPlaceholders = code.match(/\{\{(\w+)\}\}/g);
    if (remainingPlaceholders) {
      const missingVars = remainingPlaceholders.map((p) => p.replace(/[{}]/g, ''));
      throw new Error(
        `Unsubstituted template variables: ${missingVars.join(', ')}. Provide values for all placeholders.`,
      );
    }

    const fileName =
      outputFileName || `${templateId}.generated.${this.getExtension(template.language)}`;

    this.logger.log(
      `Generated code from template: ${templateId}, substituted ${substitutedVars.length} variable(s)`,
    );

    return { code, fileName, templateId, substitutedVars };
  }

  private async generateFromDescription(params: {
    description: string;
    language: string;
    context?: string;
    constraints?: string[];
  }): Promise<{
    code: string;
    language: string;
    explanation: string;
    imports: string[];
  }> {
    const { description, language, context, constraints } = params;

    if (!description || typeof description !== 'string') {
      throw new Error('A valid description string is required');
    }
    if (!language || typeof language !== 'string') {
      throw new Error('A valid programming language is required');
    }

    const normalizedLang = this.normalizeLanguage(language);

    // Analyze description for intent and structure
    const intent = this.analyzeDescriptionIntent(description);

    // Generate code structure based on intent analysis
    const code = this.synthesizeFromDescription(description, normalizedLang, context, constraints);

    // Extract imports from generated code
    const imports = this.extractImports(code, normalizedLang);

    // Generate explanation
    const explanation = this.generateExplanation(intent, normalizedLang, constraints);

    this.logger.log(
      `Generated code from description: language=${normalizedLang}, intent=${intent.type}`,
    );

    return { code, language: normalizedLang, explanation, imports };
  }

  private async refactorCode(params: {
    code: string;
    language: string;
    goals?: string[];
    preserveBehavior?: boolean;
  }): Promise<{
    refactoredCode: string;
    changes: RefactoringChange[];
    improvedMetrics: Record<string, number>;
  }> {
    const { code, language, goals = [], preserveBehavior = true } = params;

    if (!code || typeof code !== 'string') {
      throw new Error('Source code is required for refactoring');
    }
    if (!language || typeof language !== 'string') {
      throw new Error('Programming language is required');
    }

    const normalizedLang = this.normalizeLanguage(language);
    const changes: RefactoringChange[] = [];

    let refactoredCode = code;
    const originalLines = code.split('\n');

    // Apply refactoring patterns
    const patterns = this.getRefactoringPatterns(goals, normalizedLang);

    for (const pattern of patterns) {
      const result = this.applyRefactoringPattern(refactoredCode, pattern, preserveBehavior);
      if (result.modified) {
        changes.push(result.change);
        refactoredCode = result.code;
      }
    }

    // Calculate improved metrics
    const refactoredLines = refactoredCode.split('\n');
    const improvedMetrics: Record<string, number> = {
      linesReduced: originalLines.length - refactoredLines.length,
      complexityReduction: this.estimateComplexityReduction(originalLines, refactoredLines),
      duplicateCodeReduction: this.estimateDuplicateReduction(code, refactoredCode),
    };

    this.logger.log(`Refactored code: ${changes.length} change(s), language=${normalizedLang}`);

    return { refactoredCode, changes, improvedMetrics };
  }

  private async optimizeCode(params: {
    code: string;
    language: string;
    target: string;
    level?: string;
  }): Promise<{
    optimizedCode: string;
    improvements: Array<{ type: string; description: string; impact: string }>;
    estimatedGain: string;
    tradeoffs: string[];
  }> {
    const { code, language, target, level = 'safe' } = params;

    if (!code || typeof code !== 'string') {
      throw new Error('Source code is required for optimization');
    }
    if (!language || typeof language !== 'string') {
      throw new Error('Programming language is required');
    }
    const validTargets = ['performance', 'memory', 'readability', 'bundle-size'];
    if (!validTargets.includes(target)) {
      throw new Error(`Invalid optimization target: ${target}. Valid: ${validTargets.join(', ')}`);
    }
    const validLevels = ['safe', 'moderate', 'aggressive'];
    if (!validLevels.includes(level)) {
      throw new Error(`Invalid optimization level: ${level}. Valid: ${validLevels.join(', ')}`);
    }

    const normalizedLang = this.normalizeLanguage(language);
    const improvements: Array<{ type: string; description: string; impact: string }> = [];
    const tradeoffs: string[] = [];

    let optimizedCode = code;

    // Apply optimization strategies based on target and level
    const strategies = this.getOptimizationStrategies(target, level, normalizedLang);

    for (const strategy of strategies) {
      const result = this.applyOptimizationStrategy(optimizedCode, strategy, normalizedLang);
      if (result.modified) {
        optimizedCode = result.code;
        improvements.push({
          type: strategy.type,
          description: strategy.description,
          impact: result.impact,
        });

        if (result.tradeoff) {
          tradeoffs.push(result.tradeoff);
        }
      }
    }

    // Estimate overall gain
    const estimatedGain = this.estimateOptimizationGain(improvements, target, level);

    this.logger.log(
      `Optimized code: target=${target}, level=${level}, ${improvements.length} improvement(s)`,
    );

    return { optimizedCode, improvements, estimatedGain, tradeoffs };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private seedTemplates(): void {
    const builtInTemplates: CodeTemplate[] = [
      {
        id: 'nestjs-controller',
        language: 'typescript',
        framework: 'nestjs',
        content: `import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { {{ServiceName}} } from './{{serviceName}}.service';

@Controller('{{routePath}}')
export class {{ControllerName}}Controller {
  constructor(private readonly {{serviceName}}Service: {{ServiceName}}) {}

  @Get()
  findAll() {
    return this.{{serviceName}}Service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.{{serviceName}}Service.findOne(id);
  }

  @Post()
  create(@Body() createDto: any) {
    return this.{{serviceName}}Service.create(createDto);
  }
}`,
        variables: ['ServiceName', 'serviceName', 'ControllerName', 'routePath'],
        description: 'NestJS REST controller with CRUD endpoints',
      },
      {
        id: 'nestjs-service',
        language: 'typescript',
        framework: 'nestjs',
        content: `import { Injectable } from '@nestjs/common';

@Injectable()
export class {{ServiceName}} {
  private items: Map<string, any> = new Map();

  async findAll(): Promise<any[]> {
    return Array.from(this.items.values());
  }

  async findOne(id: string): Promise<any> {
    return this.items.get(id) || null;
  }

  async create(data: any): Promise<any> {
    const id = crypto.randomUUID();
    this.items.set(id, { id, ...data });
    return this.items.get(id);
  }

  async update(id: string, data: any): Promise<any> {
    const existing = this.items.get(id);
    if (!existing) return null;
    this.items.set(id, { ...existing, ...data });
    return this.items.get(id);
  }

  async remove(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}`,
        variables: ['ServiceName'],
        description: 'NestJS injectable service with in-memory CRUD',
      },
      {
        id: 'react-component',
        language: 'typescript',
        framework: 'react',
        content: `import React from 'react';

interface {{ComponentName}}Props {
  title?: string;
  children?: React.ReactNode;
}

export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = ({ title, children }) => {
  return (
    <div className="{{componentName}}-container">
      {title && <h2>{title}</h2>}
      <div className="{{componentName}}-content">
        {children}
      </div>
    </div>
  );
};

export default {{ComponentName}};`,
        variables: ['ComponentName', 'componentName'],
        description: 'React functional component with TypeScript',
      },
      {
        id: 'express-route',
        language: 'typescript',
        framework: 'express',
        content: `import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ message: '{{routeName}} list retrieved' });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    res.status(201).json({ message: '{{routeName}} created', data });
  } catch (error) {
    next(error);
  }
});

export default router;`,
        variables: ['routeName'],
        description: 'Express.js route with CRUD endpoints',
      },
    ];

    for (const template of builtInTemplates) {
      this.templates.set(template.id, template);
    }
  }

  private parseSpec(
    spec: string,
  ): Array<{ name: string; type: string; description: string; methods?: string[] }> {
    const sections: Array<{ name: string; type: string; description: string; methods?: string[] }> =
      [];
    const lines = spec.split('\n');
    let currentSection: (typeof sections)[0] | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        const name = trimmed.replace(/^#+\s*/, '');
        currentSection = {
          name: this.toPascalCase(name),
          type: name.toLowerCase().includes('service')
            ? 'service'
            : name.toLowerCase().includes('controller')
              ? 'controller'
              : 'module',
          description: name,
        };
      } else if (currentSection && trimmed.length > 0) {
        if (!currentSection.methods) currentSection.methods = [];
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          currentSection.methods.push(trimmed.replace(/^[-*]\s*/, ''));
        }
      }
    }

    if (currentSection) sections.push(currentSection);

    // Default section if spec has no headers
    if (sections.length === 0) {
      sections.push({
        name: 'GeneratedModule',
        type: 'module',
        description: spec.substring(0, 100),
      });
    }

    return sections;
  }

  private synthesizeCode(
    section: { name: string; type: string; description: string; methods?: string[] },
    language: string,
    framework?: string,
    style?: string,
  ): string {
    const methods = section.methods || ['findAll', 'findOne', 'create', 'update', 'remove'];

    if (language === 'typescript' && framework === 'nestjs') {
      if (section.type === 'controller') {
        return this.generateNestJSController(section.name, methods);
      } else if (section.type === 'service') {
        return this.generateNestJSService(section.name, methods);
      }
    }

    // Generic code generation fallback
    return this.generateGenericModule(section.name, language, methods);
  }

  private generateNestJSController(name: string, methods: string[]): string {
    const routePath = this.toKebabCase(name);
    const serviceVar = this.toCamelCase(name);

    const methodImplementations = methods
      .map((method) => {
        const httpMethod = this.inferHttpMethod(method);
        const hasParam = ['findOne', 'update', 'remove', 'delete', 'get'].some((m) =>
          method.toLowerCase().includes(m.toLowerCase()),
        );

        if (hasParam) {
          return `  @${httpMethod}(':id')
  ${method}(@Param('id') id: string) {
    return this.${serviceVar}Service.${method}(id);
  }`;
        }
        return `  @${httpMethod}()
  ${method}() {
    return this.${serviceVar}Service.${method}();
  }`;
      })
      .join('\n\n');

    return `import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ${name}Service } from './${routePath}.service';

@Controller('${routePath}')
export class ${name}Controller {
  constructor(private readonly ${serviceVar}Service: ${name}Service) {}

${methodImplementations}
}`;
  }

  private generateNestJSService(name: string, methods: string[]): string {
    const methodImplementations = methods
      .map((method) => {
        const hasParam = ['findOne', 'update', 'remove', 'delete', 'get'].some((m) =>
          method.toLowerCase().includes(m.toLowerCase()),
        );

        if (hasParam) {
          return `  async ${method}(id: string): Promise<any> {
    // TODO: Implement ${method} logic
    return { id, message: '${method} executed' };
  }`;
        }
        return `  async ${method}(): Promise<any> {
    // TODO: Implement ${method} logic
    return { message: '${method} executed' };
  }`;
      })
      .join('\n\n');

    return `import { Injectable } from '@nestjs/common';

@Injectable()
export class ${name}Service {

${methodImplementations}
}`;
  }

  private generateGenericModule(name: string, language: string, methods: string[]): string {
    const methodImplementations = methods
      .map((method) => {
        return `  function ${method}() {\n    // TODO: Implement ${method}\n    return null;\n  }`;
      })
      .join('\n\n');

    if (language === 'python') {
      return `"""${name} module generated from specification"""\n\nclass ${name}:\n${methods.map((m) => `    def ${m}(self):\n        """TODO: Implement ${m}"""\n        pass`).join('\n\n')}`;
    }

    return `// ${name} module generated from specification

${methodImplementations}`;
  }

  private inferFileName(name: string, language: string, framework?: string): string {
    const kebab = this.toKebabCase(name);
    const ext = this.getExtension(language);

    if (framework === 'nestjs' && language === 'typescript') {
      if (name.toLowerCase().includes('controller')) return `${kebab}.controller.${ext}`;
      if (name.toLowerCase().includes('service')) return `${kebab}.service.${ext}`;
      if (name.toLowerCase().includes('module')) return `${kebab}.module.${ext}`;
    }

    return `${kebab}.${ext}`;
  }

  private analyzeDescriptionIntent(description: string): { type: string; features: string[] } {
    const lower = description.toLowerCase();
    const features: string[] = [];
    let type = 'function';

    if (lower.includes('class') || lower.includes('service') || lower.includes('module')) {
      type = 'class';
    }
    if (lower.includes('api') || lower.includes('endpoint') || lower.includes('route')) {
      type = 'api';
      features.push('routing');
    }
    if (lower.includes('component') || lower.includes('ui') || lower.includes('render')) {
      type = 'component';
      features.push('rendering');
    }
    if (lower.includes('database') || lower.includes('model') || lower.includes('schema')) {
      features.push('data-model');
    }
    if (lower.includes('test') || lower.includes('spec')) {
      features.push('testing');
    }
    if (lower.includes('auth') || lower.includes('login') || lower.includes('permission')) {
      features.push('authentication');
    }

    return { type, features };
  }

  private synthesizeFromDescription(
    description: string,
    language: string,
    context?: string,
    constraints?: string[],
  ): string {
    const intent = this.analyzeDescriptionIntent(description);
    const constraintComment = constraints?.length
      ? `\n// Constraints: ${constraints.join(', ')}`
      : '';

    const contextComment = context ? `\n// Context: ${context.substring(0, 200)}` : '';

    if (language === 'typescript') {
      if (intent.type === 'class') {
        const className = this.extractClassName(description) || 'GeneratedClass';
        return `/**${constraintComment}${contextComment}
 * Generated from description: ${description.substring(0, 100)}
 */
export class ${className} {
  constructor() {
    // Initialize instance
  }

  // Implement class methods based on: ${description.substring(0, 80)}
  async execute(): Promise<void> {
    // TODO: Implement core logic
  }
}`;
      }

      if (intent.type === 'api') {
        return `/**${constraintComment}${contextComment}
 * API module generated from description
 */
import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  // TODO: Implement GET handler for: ${description.substring(0, 60)}
  res.json({ status: 'ok' });
});

router.post('/', async (req, res) => {
  // TODO: Implement POST handler
  const data = req.body;
  res.status(201).json({ created: true, data });
});

export default router;`;
      }

      return `/**${constraintComment}${contextComment}
 * Generated from description: ${description.substring(0, 100)}
 */
export async function generatedFunction(): Promise<void> {
  // TODO: Implement logic for: ${description.substring(0, 80)}
}`;
    }

    if (language === 'python') {
      return `"""${constraintComment}${contextComment}
Generated from description: ${description.substring(0, 100)}
"""

def generated_function():
    """TODO: Implement logic for: ${description.substring(0, 80)}"""
    pass`;
    }

    return `// Generated from description: ${description.substring(0, 100)}${constraintComment}${contextComment}`;
  }

  private extractImports(code: string, language: string): string[] {
    const imports: string[] = [];

    if (language === 'typescript' || language === 'javascript') {
      const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(code)) !== null) {
        imports.push(match[1]);
      }
    } else if (language === 'python') {
      const importRegex = /^(?:from\s+(\S+)\s+)?import\s+/gm;
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(code)) !== null) {
        imports.push(match[1] || match[0].trim());
      }
    }

    return imports;
  }

  private generateExplanation(
    intent: { type: string; features: string[] },
    language: string,
    constraints?: string[],
  ): string {
    let explanation = `Generated ${intent.type} in ${language}`;

    if (intent.features.length > 0) {
      explanation += ` with features: ${intent.features.join(', ')}`;
    }

    if (constraints?.length) {
      explanation += `. Applied constraints: ${constraints.join(', ')}`;
    }

    return explanation + '. Review and implement the TODO placeholders.';
  }

  private getRefactoringPatterns(
    goals: string[],
    language: string,
  ): Array<{ type: string; description: string; pattern: RegExp; replacement: string }> {
    const patterns: Array<{
      type: string;
      description: string;
      pattern: RegExp;
      replacement: string;
    }> = [];

    const allGoals = goals.length > 0 ? goals : ['readability', 'dry', 'simplification'];

    if (allGoals.includes('readability') || allGoals.includes('simplification')) {
      // Remove consecutive blank lines
      patterns.push({
        type: 'cleanup',
        description: 'Remove consecutive blank lines',
        pattern: /\n{3,}/g,
        replacement: '\n\n',
      });

      // Remove trailing whitespace
      patterns.push({
        type: 'cleanup',
        description: 'Remove trailing whitespace',
        pattern: /[ \t]+$/gm,
        replacement: '',
      });
    }

    if (allGoals.includes('dry') && (language === 'typescript' || language === 'javascript')) {
      // Extract repeated string literals into constants (simplified pattern)
      patterns.push({
        type: 'dry',
        description: 'Identify repeated string literals for extraction',
        pattern: /(['"`])([^'"`]{3,})\1/g,
        replacement: '$1$2$1', // No-op, just identifies
      });
    }

    if (
      allGoals.includes('modernization') &&
      (language === 'typescript' || language === 'javascript')
    ) {
      // Convert var to const/let
      patterns.push({
        type: 'modernization',
        description: 'Convert var declarations to const/let',
        pattern: /\bvar\s+/g,
        replacement: 'const ',
      });
    }

    return patterns;
  }

  private applyRefactoringPattern(
    code: string,
    pattern: { type: string; description: string; pattern: RegExp; replacement: string },
    preserveBehavior: boolean,
  ): { modified: boolean; code: string; change: RefactoringChange } {
    const newCode = code.replace(pattern.pattern, pattern.replacement);
    const modified = newCode !== code;

    // Count lines affected
    const originalLines = code.split('\n');
    let lineStart = -1;
    let lineEnd = -1;

    for (let i = 0; i < originalLines.length; i++) {
      if (originalLines[i] !== newCode.split('\n')[i]) {
        if (lineStart === -1) lineStart = i + 1;
        lineEnd = i + 1;
      }
    }

    return {
      modified,
      code: modified ? newCode : code,
      change: {
        type: pattern.type,
        description: pattern.description,
        lineStart: lineStart || 0,
        lineEnd: lineEnd || 0,
        before: pattern.pattern.source,
        after: pattern.replacement,
      },
    };
  }

  private getOptimizationStrategies(
    target: string,
    level: string,
    language: string,
  ): Array<{ type: string; description: string; target: string }> {
    const strategies: Array<{ type: string; description: string; target: string }> = [];

    if (target === 'performance') {
      strategies.push(
        {
          type: 'loop-optimization',
          description: 'Optimize loop patterns for performance',
          target: 'performance',
        },
        {
          type: 'caching',
          description: 'Add memoization/caching for expensive computations',
          target: 'performance',
        },
        {
          type: 'async-optimization',
          description: 'Convert synchronous operations to async where beneficial',
          target: 'performance',
        },
      );

      if (level === 'aggressive') {
        strategies.push(
          {
            type: 'inline-functions',
            description: 'Inline small functions to reduce call overhead',
            target: 'performance',
          },
          {
            type: 'early-return',
            description: 'Add early returns to avoid unnecessary computation',
            target: 'performance',
          },
        );
      }
    }

    if (target === 'memory') {
      strategies.push(
        {
          type: 'object-pooling',
          description: 'Suggest object pooling for frequently created objects',
          target: 'memory',
        },
        {
          type: 'stream-processing',
          description: 'Convert bulk data processing to streaming',
          target: 'memory',
        },
      );
    }

    if (target === 'readability') {
      strategies.push(
        {
          type: 'extract-method',
          description: 'Extract complex logic into named methods',
          target: 'readability',
        },
        {
          type: 'meaningful-names',
          description: 'Suggest more descriptive variable names',
          target: 'readability',
        },
        {
          type: 'add-comments',
          description: 'Add inline comments for complex logic',
          target: 'readability',
        },
      );
    }

    if (target === 'bundle-size') {
      strategies.push(
        {
          type: 'tree-shaking',
          description: 'Mark unused exports for tree-shaking',
          target: 'bundle-size',
        },
        {
          type: 'lazy-loading',
          description: 'Suggest dynamic imports for lazy loading',
          target: 'bundle-size',
        },
      );

      if (level !== 'safe') {
        strategies.push({
          type: 'minification-safe',
          description: 'Ensure code is minification-safe',
          target: 'bundle-size',
        });
      }
    }

    return strategies;
  }

  private applyOptimizationStrategy(
    code: string,
    strategy: { type: string; description: string; target: string },
    language: string,
  ): { modified: boolean; code: string; impact: string; tradeoff?: string } {
    let optimizedCode = code;
    let modified = false;
    let impact = 'low';
    let tradeoff: string | undefined;

    switch (strategy.type) {
      case 'early-return': {
        // Add early return patterns in if-else chains
        const pattern = /if\s*\(([^)]+)\)\s*\{\s*return\s+([^;]+);\s*\}\s*else\s*\{/g;
        const newCode = code.replace(pattern, 'if ($1) {\n    return $2;\n  }\n  {');
        if (newCode !== code) {
          optimizedCode = newCode;
          modified = true;
          impact = 'medium';
        }
        break;
      }
      case 'caching': {
        // Add memoization comment
        if ((language === 'typescript' || language === 'javascript') && code.includes('function')) {
          const cacheComment = '// OPTIMIZE: Consider adding memoization to expensive functions\n';
          if (!code.includes('OPTIMIZE:')) {
            optimizedCode = cacheComment + code;
            modified = true;
            impact = 'medium';
            tradeoff = 'Memoization increases memory usage proportional to unique inputs';
          }
        }
        break;
      }
      case 'lazy-loading': {
        if ((language === 'typescript' || language === 'javascript') && code.includes('import ')) {
          optimizedCode = code.replace(
            /import\s+(\w+)\s+from\s+(['"]([^'"]+)['"])/g,
            '// OPTIMIZE: Consider dynamic import: const $1 = await import($2)\nimport $1 from $2',
          );
          modified = optimizedCode !== code;
          impact = 'high';
          tradeoff = 'Dynamic imports add async overhead on first load';
        }
        break;
      }
      default: {
        // Generic strategy: add optimization suggestions as comments
        const comment = `// OPTIMIZE [${strategy.type}]: ${strategy.description}\n`;
        if (!code.includes(`OPTIMIZE [${strategy.type}]`)) {
          optimizedCode = comment + code;
          modified = true;
          impact = 'low';
        }
        break;
      }
    }

    return { modified, code: optimizedCode, impact, tradeoff };
  }

  private estimateComplexityReduction(originalLines: string[], refactoredLines: string[]): number {
    // Simplified cyclomatic complexity estimation based on branch keywords
    const countBranches = (lines: string[]) =>
      lines.reduce((count, line) => {
        const branchKeywords = ['if ', 'else ', 'switch ', 'case ', 'for ', 'while ', 'catch '];
        return count + branchKeywords.filter((kw) => line.includes(kw)).length;
      }, 0);

    const originalBranches = countBranches(originalLines);
    const refactoredBranches = countBranches(refactoredLines);

    if (originalBranches === 0) return 0;
    return Math.round(((originalBranches - refactoredBranches) / originalBranches) * 100);
  }

  private estimateDuplicateReduction(originalCode: string, refactoredCode: string): number {
    // Simplified duplicate estimation by comparing line frequencies
    const countLineFrequencies = (code: string): number => {
      const lines = code
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      const freq = new Map<string, number>();
      for (const line of lines) {
        freq.set(line, (freq.get(line) || 0) + 1);
      }
      let duplicates = 0;
      for (const count of freq.values()) {
        if (count > 1) duplicates += count - 1;
      }
      return duplicates;
    };

    const originalDuplicates = countLineFrequencies(originalCode);
    const refactoredDuplicates = countLineFrequencies(refactoredCode);

    if (originalDuplicates === 0) return 0;
    return Math.round(((originalDuplicates - refactoredDuplicates) / originalDuplicates) * 100);
  }

  private estimateOptimizationGain(
    improvements: Array<{ type: string; description: string; impact: string }>,
    target: string,
    level: string,
  ): string {
    if (improvements.length === 0) return 'No measurable improvement';

    const highImpact = improvements.filter((i) => i.impact === 'high').length;
    const mediumImpact = improvements.filter((i) => i.impact === 'medium').length;

    const baseGain =
      highImpact * 20 + mediumImpact * 10 + (improvements.length - highImpact - mediumImpact) * 5;
    const levelMultiplier = level === 'aggressive' ? 1.5 : level === 'moderate' ? 1.2 : 1.0;

    const estimatedPercent = Math.min(90, Math.round(baseGain * levelMultiplier));

    return `~${estimatedPercent}% estimated improvement in ${target}`;
  }

  private normalizeLanguage(language: string): string {
    const lower = language.toLowerCase().trim();
    const aliases: Record<string, string> = {
      ts: 'typescript',
      js: 'javascript',
      py: 'python',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      java: 'java',
      kt: 'kotlin',
      cs: 'csharp',
      cpp: 'cpp',
      c: 'c',
    };
    return aliases[lower] || lower;
  }

  private getExtension(language: string): string {
    const extensions: Record<string, string> = {
      typescript: 'ts',
      javascript: 'js',
      python: 'py',
      ruby: 'rb',
      go: 'go',
      rust: 'rs',
      java: 'java',
      kotlin: 'kt',
      csharp: 'cs',
      cpp: 'cpp',
      c: 'c',
    };
    return extensions[language] || 'txt';
  }

  private validateFrameworkCompatibility(language: string, framework: string): boolean {
    const compatibility: Record<string, string[]> = {
      typescript: ['nestjs', 'express', 'react', 'nextjs', 'angular', 'vue'],
      javascript: ['express', 'react', 'nextjs', 'vue', 'svelte'],
      python: ['django', 'flask', 'fastapi'],
      ruby: ['rails', 'sinatra'],
      go: ['gin', 'echo', 'fiber'],
      java: ['spring', 'quarkus', 'micronaut'],
    };

    const supported = compatibility[language];
    if (!supported) return true; // Unknown language, assume compatible
    return supported.includes(framework.toLowerCase());
  }

  private inferHttpMethod(methodName: string): string {
    const lower = methodName.toLowerCase();
    if (
      lower.includes('create') ||
      lower.includes('add') ||
      lower.includes('insert') ||
      lower.includes('post')
    )
      return 'Post';
    if (
      lower.includes('update') ||
      lower.includes('edit') ||
      lower.includes('modify') ||
      lower.includes('put') ||
      lower.includes('patch')
    )
      return 'Put';
    if (lower.includes('delete') || lower.includes('remove')) return 'Delete';
    return 'Get';
  }

  private extractClassName(description: string): string | null {
    const match = description.match(/(?:class|called|named)\s+(\w+)/i);
    return match ? this.toPascalCase(match[1]) : null;
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (_, c) => c.toUpperCase());
  }

  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '-$1')
      .replace(/[-_\s]+/g, '-')
      .replace(/^-/, '')
      .toLowerCase();
  }
}
