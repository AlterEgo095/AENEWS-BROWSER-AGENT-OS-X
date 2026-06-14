"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGenerationAgentService = exports.CODE_GENERATION_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.CODE_GENERATION_AGENT_CONFIG = {
    id: 'coding-code-generation',
    name: 'CodeGeneration',
    cluster: agent_interface_1.AgentCluster.CODING,
    version: '1.0.0',
    description: 'Generate code from specifications, templates, and natural language descriptions. Supports refactoring and optimization of existing code with multi-language support.',
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
let CodeGenerationAgentService = class CodeGenerationAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.templates = new Map();
        this.generationHistory = [];
    }
    defineConfig() {
        return exports.CODE_GENERATION_AGENT_CONFIG;
    }
    async onInitialize() {
        this.seedTemplates();
        this.registerTool({
            name: 'generateFromSpec',
            description: 'Generate code from a structured specification',
            execute: async (params) => this.generateFromSpec(params),
        });
        this.registerTool({
            name: 'generateFromTemplate',
            description: 'Generate code from a pre-defined template',
            execute: async (params) => this.generateFromTemplate(params),
        });
        this.registerTool({
            name: 'generateFromDescription',
            description: 'Generate code from a natural language description',
            execute: async (params) => this.generateFromDescription(params),
        });
        this.registerTool({
            name: 'refactorCode',
            description: 'Refactor existing code to improve structure and readability',
            execute: async (params) => this.refactorCode(params),
        });
        this.registerTool({
            name: 'optimizeCode',
            description: 'Optimize code for performance, memory, or other metrics',
            execute: async (params) => this.optimizeCode(params),
        });
        await this.storeInWorkingMemory('codegen:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('CodeGeneration agent initialized with 5 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const lang = (input.payload?.language || '').toLowerCase();
                const framework = (input.payload?.framework || '').toLowerCase();
                const frontendLangs = ['html', 'css', 'javascript', 'typescript', 'jsx', 'tsx'];
                const frontendFrameworks = ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt'];
                const isFrontend = frontendLangs.includes(lang) || frontendFrameworks.some((f) => framework.includes(f));
                const capability = isFrontend ? interfaces_1.DevCapability.FRONTEND : interfaces_1.DevCapability.BACKEND;
                const result = await this.bridge.executeCapability(capability, {
                    missionId: input.taskId,
                    instruction: JSON.stringify(input.payload),
                    workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
                    parameters: input.payload,
                });
                return this.createAgentOutput(input.taskId, result.success, result.output, result.error, startTime);
            }
            catch (error) {
                this.logger.warn(`Bridge failed, fallback to local: ${error.message}`);
            }
        }
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'generateFromSpec',
            'generateFromTemplate',
            'generateFromDescription',
            'refactorCode',
            'optimizeCode',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown code generation action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            this.generationHistory.push({
                action,
                language: params.language || 'unknown',
                timestamp: new Date(),
                success: true,
            });
            await this.storeInWorkingMemory(`codegen:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
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
    async onDestroy() {
        this.templates.clear();
        this.generationHistory = [];
        this.logger.log('CodeGeneration agent destroyed, templates and history cleared');
    }
    async generateFromSpec(params) {
        const { spec, language, framework, style } = params;
        if (!spec || typeof spec !== 'string') {
            throw new Error('A valid specification string is required');
        }
        if (!language || typeof language !== 'string') {
            throw new Error('A valid programming language is required');
        }
        const warnings = [];
        const specSections = this.parseSpec(spec);
        const normalizedLang = this.normalizeLanguage(language);
        if (framework) {
            const isCompatible = this.validateFrameworkCompatibility(normalizedLang, framework);
            if (!isCompatible) {
                warnings.push(`Framework "${framework}" may not be fully compatible with ${normalizedLang}`);
            }
        }
        const files = [];
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
        const code = files.map((f) => f.content).join('\n\n');
        this.logger.log(`Generated code from spec: ${files.length} file(s), language=${normalizedLang}, framework=${framework || 'none'}`);
        return { code, language: normalizedLang, files, warnings };
    }
    async generateFromTemplate(params) {
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
        let code = template.content;
        const substitutedVars = [];
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            if (code.includes(placeholder)) {
                code = code.replaceAll(placeholder, value);
                substitutedVars.push(key);
            }
        }
        const remainingPlaceholders = code.match(/\{\{(\w+)\}\}/g);
        if (remainingPlaceholders) {
            const missingVars = remainingPlaceholders.map((p) => p.replace(/[{}]/g, ''));
            throw new Error(`Unsubstituted template variables: ${missingVars.join(', ')}. Provide values for all placeholders.`);
        }
        const fileName = outputFileName || `${templateId}.generated.${this.getExtension(template.language)}`;
        this.logger.log(`Generated code from template: ${templateId}, substituted ${substitutedVars.length} variable(s)`);
        return { code, fileName, templateId, substitutedVars };
    }
    async generateFromDescription(params) {
        const { description, language, context, constraints } = params;
        if (!description || typeof description !== 'string') {
            throw new Error('A valid description string is required');
        }
        if (!language || typeof language !== 'string') {
            throw new Error('A valid programming language is required');
        }
        const normalizedLang = this.normalizeLanguage(language);
        const intent = this.analyzeDescriptionIntent(description);
        const code = this.synthesizeFromDescription(description, normalizedLang, context, constraints);
        const imports = this.extractImports(code, normalizedLang);
        const explanation = this.generateExplanation(intent, normalizedLang, constraints);
        this.logger.log(`Generated code from description: language=${normalizedLang}, intent=${intent.type}`);
        return { code, language: normalizedLang, explanation, imports };
    }
    async refactorCode(params) {
        const { code, language, goals = [], preserveBehavior = true } = params;
        if (!code || typeof code !== 'string') {
            throw new Error('Source code is required for refactoring');
        }
        if (!language || typeof language !== 'string') {
            throw new Error('Programming language is required');
        }
        const normalizedLang = this.normalizeLanguage(language);
        const changes = [];
        let refactoredCode = code;
        const originalLines = code.split('\n');
        const patterns = this.getRefactoringPatterns(goals, normalizedLang);
        for (const pattern of patterns) {
            const result = this.applyRefactoringPattern(refactoredCode, pattern, preserveBehavior);
            if (result.modified) {
                changes.push(result.change);
                refactoredCode = result.code;
            }
        }
        const refactoredLines = refactoredCode.split('\n');
        const improvedMetrics = {
            linesReduced: originalLines.length - refactoredLines.length,
            complexityReduction: this.estimateComplexityReduction(originalLines, refactoredLines),
            duplicateCodeReduction: this.estimateDuplicateReduction(code, refactoredCode),
        };
        this.logger.log(`Refactored code: ${changes.length} change(s), language=${normalizedLang}`);
        return { refactoredCode, changes, improvedMetrics };
    }
    async optimizeCode(params) {
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
        const improvements = [];
        const tradeoffs = [];
        let optimizedCode = code;
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
        const estimatedGain = this.estimateOptimizationGain(improvements, target, level);
        this.logger.log(`Optimized code: target=${target}, level=${level}, ${improvements.length} improvement(s)`);
        return { optimizedCode, improvements, estimatedGain, tradeoffs };
    }
    seedTemplates() {
        const builtInTemplates = [
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
    parseSpec(spec) {
        const sections = [];
        const lines = spec.split('\n');
        let currentSection = null;
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
            }
            else if (currentSection && trimmed.length > 0) {
                if (!currentSection.methods)
                    currentSection.methods = [];
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    currentSection.methods.push(trimmed.replace(/^[-*]\s*/, ''));
                }
            }
        }
        if (currentSection)
            sections.push(currentSection);
        if (sections.length === 0) {
            sections.push({
                name: 'GeneratedModule',
                type: 'module',
                description: spec.substring(0, 100),
            });
        }
        return sections;
    }
    synthesizeCode(section, language, framework, style) {
        const methods = section.methods || ['findAll', 'findOne', 'create', 'update', 'remove'];
        if (language === 'typescript' && framework === 'nestjs') {
            if (section.type === 'controller') {
                return this.generateNestJSController(section.name, methods);
            }
            else if (section.type === 'service') {
                return this.generateNestJSService(section.name, methods);
            }
        }
        return this.generateGenericModule(section.name, language, methods);
    }
    generateNestJSController(name, methods) {
        const routePath = this.toKebabCase(name);
        const serviceVar = this.toCamelCase(name);
        const methodImplementations = methods
            .map((method) => {
            const httpMethod = this.inferHttpMethod(method);
            const hasParam = ['findOne', 'update', 'remove', 'delete', 'get'].some((m) => method.toLowerCase().includes(m.toLowerCase()));
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
    generateNestJSService(name, methods) {
        const methodImplementations = methods
            .map((method) => {
            const hasParam = ['findOne', 'update', 'remove', 'delete', 'get'].some((m) => method.toLowerCase().includes(m.toLowerCase()));
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
    generateGenericModule(name, language, methods) {
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
    inferFileName(name, language, framework) {
        const kebab = this.toKebabCase(name);
        const ext = this.getExtension(language);
        if (framework === 'nestjs' && language === 'typescript') {
            if (name.toLowerCase().includes('controller'))
                return `${kebab}.controller.${ext}`;
            if (name.toLowerCase().includes('service'))
                return `${kebab}.service.${ext}`;
            if (name.toLowerCase().includes('module'))
                return `${kebab}.module.${ext}`;
        }
        return `${kebab}.${ext}`;
    }
    analyzeDescriptionIntent(description) {
        const lower = description.toLowerCase();
        const features = [];
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
    synthesizeFromDescription(description, language, context, constraints) {
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
    extractImports(code, language) {
        const imports = [];
        if (language === 'typescript' || language === 'javascript') {
            const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
            let match;
            while ((match = importRegex.exec(code)) !== null) {
                imports.push(match[1]);
            }
        }
        else if (language === 'python') {
            const importRegex = /^(?:from\s+(\S+)\s+)?import\s+/gm;
            let match;
            while ((match = importRegex.exec(code)) !== null) {
                imports.push(match[1] || match[0].trim());
            }
        }
        return imports;
    }
    generateExplanation(intent, language, constraints) {
        let explanation = `Generated ${intent.type} in ${language}`;
        if (intent.features.length > 0) {
            explanation += ` with features: ${intent.features.join(', ')}`;
        }
        if (constraints?.length) {
            explanation += `. Applied constraints: ${constraints.join(', ')}`;
        }
        return explanation + '. Review and implement the TODO placeholders.';
    }
    getRefactoringPatterns(goals, language) {
        const patterns = [];
        const allGoals = goals.length > 0 ? goals : ['readability', 'dry', 'simplification'];
        if (allGoals.includes('readability') || allGoals.includes('simplification')) {
            patterns.push({
                type: 'cleanup',
                description: 'Remove consecutive blank lines',
                pattern: /\n{3,}/g,
                replacement: '\n\n',
            });
            patterns.push({
                type: 'cleanup',
                description: 'Remove trailing whitespace',
                pattern: /[ \t]+$/gm,
                replacement: '',
            });
        }
        if (allGoals.includes('dry') && (language === 'typescript' || language === 'javascript')) {
            patterns.push({
                type: 'dry',
                description: 'Identify repeated string literals for extraction',
                pattern: /(['"`])([^'"`]{3,})\1/g,
                replacement: '$1$2$1',
            });
        }
        if (allGoals.includes('modernization') &&
            (language === 'typescript' || language === 'javascript')) {
            patterns.push({
                type: 'modernization',
                description: 'Convert var declarations to const/let',
                pattern: /\bvar\s+/g,
                replacement: 'const ',
            });
        }
        return patterns;
    }
    applyRefactoringPattern(code, pattern, preserveBehavior) {
        const newCode = code.replace(pattern.pattern, pattern.replacement);
        const modified = newCode !== code;
        const originalLines = code.split('\n');
        let lineStart = -1;
        let lineEnd = -1;
        for (let i = 0; i < originalLines.length; i++) {
            if (originalLines[i] !== newCode.split('\n')[i]) {
                if (lineStart === -1)
                    lineStart = i + 1;
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
    getOptimizationStrategies(target, level, language) {
        const strategies = [];
        if (target === 'performance') {
            strategies.push({
                type: 'loop-optimization',
                description: 'Optimize loop patterns for performance',
                target: 'performance',
            }, {
                type: 'caching',
                description: 'Add memoization/caching for expensive computations',
                target: 'performance',
            }, {
                type: 'async-optimization',
                description: 'Convert synchronous operations to async where beneficial',
                target: 'performance',
            });
            if (level === 'aggressive') {
                strategies.push({
                    type: 'inline-functions',
                    description: 'Inline small functions to reduce call overhead',
                    target: 'performance',
                }, {
                    type: 'early-return',
                    description: 'Add early returns to avoid unnecessary computation',
                    target: 'performance',
                });
            }
        }
        if (target === 'memory') {
            strategies.push({
                type: 'object-pooling',
                description: 'Suggest object pooling for frequently created objects',
                target: 'memory',
            }, {
                type: 'stream-processing',
                description: 'Convert bulk data processing to streaming',
                target: 'memory',
            });
        }
        if (target === 'readability') {
            strategies.push({
                type: 'extract-method',
                description: 'Extract complex logic into named methods',
                target: 'readability',
            }, {
                type: 'meaningful-names',
                description: 'Suggest more descriptive variable names',
                target: 'readability',
            }, {
                type: 'add-comments',
                description: 'Add inline comments for complex logic',
                target: 'readability',
            });
        }
        if (target === 'bundle-size') {
            strategies.push({
                type: 'tree-shaking',
                description: 'Mark unused exports for tree-shaking',
                target: 'bundle-size',
            }, {
                type: 'lazy-loading',
                description: 'Suggest dynamic imports for lazy loading',
                target: 'bundle-size',
            });
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
    applyOptimizationStrategy(code, strategy, language) {
        let optimizedCode = code;
        let modified = false;
        let impact = 'low';
        let tradeoff;
        switch (strategy.type) {
            case 'early-return': {
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
                    optimizedCode = code.replace(/import\s+(\w+)\s+from\s+(['"]([^'"]+)['"])/g, '// OPTIMIZE: Consider dynamic import: const $1 = await import($2)\nimport $1 from $2');
                    modified = optimizedCode !== code;
                    impact = 'high';
                    tradeoff = 'Dynamic imports add async overhead on first load';
                }
                break;
            }
            default: {
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
    estimateComplexityReduction(originalLines, refactoredLines) {
        const countBranches = (lines) => lines.reduce((count, line) => {
            const branchKeywords = ['if ', 'else ', 'switch ', 'case ', 'for ', 'while ', 'catch '];
            return count + branchKeywords.filter((kw) => line.includes(kw)).length;
        }, 0);
        const originalBranches = countBranches(originalLines);
        const refactoredBranches = countBranches(refactoredLines);
        if (originalBranches === 0)
            return 0;
        return Math.round(((originalBranches - refactoredBranches) / originalBranches) * 100);
    }
    estimateDuplicateReduction(originalCode, refactoredCode) {
        const countLineFrequencies = (code) => {
            const lines = code
                .split('\n')
                .map((l) => l.trim())
                .filter((l) => l.length > 0);
            const freq = new Map();
            for (const line of lines) {
                freq.set(line, (freq.get(line) || 0) + 1);
            }
            let duplicates = 0;
            for (const count of freq.values()) {
                if (count > 1)
                    duplicates += count - 1;
            }
            return duplicates;
        };
        const originalDuplicates = countLineFrequencies(originalCode);
        const refactoredDuplicates = countLineFrequencies(refactoredCode);
        if (originalDuplicates === 0)
            return 0;
        return Math.round(((originalDuplicates - refactoredDuplicates) / originalDuplicates) * 100);
    }
    estimateOptimizationGain(improvements, target, level) {
        if (improvements.length === 0)
            return 'No measurable improvement';
        const highImpact = improvements.filter((i) => i.impact === 'high').length;
        const mediumImpact = improvements.filter((i) => i.impact === 'medium').length;
        const baseGain = highImpact * 20 + mediumImpact * 10 + (improvements.length - highImpact - mediumImpact) * 5;
        const levelMultiplier = level === 'aggressive' ? 1.5 : level === 'moderate' ? 1.2 : 1.0;
        const estimatedPercent = Math.min(90, Math.round(baseGain * levelMultiplier));
        return `~${estimatedPercent}% estimated improvement in ${target}`;
    }
    normalizeLanguage(language) {
        const lower = language.toLowerCase().trim();
        const aliases = {
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
    getExtension(language) {
        const extensions = {
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
    validateFrameworkCompatibility(language, framework) {
        const compatibility = {
            typescript: ['nestjs', 'express', 'react', 'nextjs', 'angular', 'vue'],
            javascript: ['express', 'react', 'nextjs', 'vue', 'svelte'],
            python: ['django', 'flask', 'fastapi'],
            ruby: ['rails', 'sinatra'],
            go: ['gin', 'echo', 'fiber'],
            java: ['spring', 'quarkus', 'micronaut'],
        };
        const supported = compatibility[language];
        if (!supported)
            return true;
        return supported.includes(framework.toLowerCase());
    }
    inferHttpMethod(methodName) {
        const lower = methodName.toLowerCase();
        if (lower.includes('create') ||
            lower.includes('add') ||
            lower.includes('insert') ||
            lower.includes('post'))
            return 'Post';
        if (lower.includes('update') ||
            lower.includes('edit') ||
            lower.includes('modify') ||
            lower.includes('put') ||
            lower.includes('patch'))
            return 'Put';
        if (lower.includes('delete') || lower.includes('remove'))
            return 'Delete';
        return 'Get';
    }
    extractClassName(description) {
        const match = description.match(/(?:class|called|named)\s+(\w+)/i);
        return match ? this.toPascalCase(match[1]) : null;
    }
    toPascalCase(str) {
        return str
            .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
            .replace(/^(.)/, (_, c) => c.toUpperCase());
    }
    toCamelCase(str) {
        const pascal = this.toPascalCase(str);
        return pascal.charAt(0).toLowerCase() + pascal.slice(1);
    }
    toKebabCase(str) {
        return str
            .replace(/([A-Z])/g, '-$1')
            .replace(/[-_\s]+/g, '-')
            .replace(/^-/, '')
            .toLowerCase();
    }
};
exports.CodeGenerationAgentService = CodeGenerationAgentService;
exports.CodeGenerationAgentService = CodeGenerationAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], CodeGenerationAgentService);
//# sourceMappingURL=code-generation-agent.service.js.map