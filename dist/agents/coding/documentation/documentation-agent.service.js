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
exports.DocumentationAgentService = exports.DOCUMENTATION_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.DOCUMENTATION_AGENT_CONFIG = {
    id: 'coding-documentation',
    name: 'Documentation',
    cluster: agent_interface_1.AgentCluster.CODING,
    version: '1.0.0',
    description: 'Generate and update code documentation, API documentation, READMEs, changelogs, and type documentation. Supports JSDoc, TSDoc, OpenAPI, and Markdown formats.',
    capabilities: [
        {
            name: 'generateDocs',
            description: 'Generate inline code documentation (JSDoc/TSDoc/docstrings) for source code',
            inputSchema: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'Source code to document' },
                    language: { type: 'string', description: 'Programming language' },
                    style: { type: 'string', enum: ['jsdoc', 'tsdoc', 'docstring', 'xml'], default: 'jsdoc' },
                    includeExamples: { type: 'boolean', default: true },
                },
                required: ['code', 'language'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    documentedCode: { type: 'string' },
                    docBlocks: { type: 'array', items: { type: 'object' } },
                    coverage: { type: 'number' },
                },
            },
        },
        {
            name: 'generateApiDocs',
            description: 'Generate API documentation from route definitions and controllers',
            inputSchema: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'Source code with API endpoints' },
                    language: { type: 'string', description: 'Programming language' },
                    format: { type: 'string', enum: ['openapi', 'markdown', 'html'], default: 'openapi' },
                    version: { type: 'string', default: '1.0.0' },
                },
                required: ['code', 'language'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    documentation: { type: 'string' },
                    endpoints: { type: 'array', items: { type: 'object' } },
                    format: { type: 'string' },
                },
            },
        },
        {
            name: 'generateReadme',
            description: 'Generate a README.md file for a project or module',
            inputSchema: {
                type: 'object',
                properties: {
                    projectName: { type: 'string', description: 'Project name' },
                    description: { type: 'string', description: 'Project description' },
                    packageJson: { type: 'object', description: 'Package.json contents' },
                    features: { type: 'array', items: { type: 'string' } },
                    installationSteps: { type: 'array', items: { type: 'string' } },
                },
                required: ['projectName', 'description'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    content: { type: 'string' },
                    sections: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'updateChangelog',
            description: 'Update or generate a CHANGELOG.md file with version entries',
            inputSchema: {
                type: 'object',
                properties: {
                    currentChangelog: { type: 'string', description: 'Existing changelog content' },
                    version: { type: 'string', description: 'New version number' },
                    changes: { type: 'array', items: { type: 'object' } },
                    date: { type: 'string', description: 'Release date' },
                },
                required: ['version', 'changes'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    content: { type: 'string' },
                    version: { type: 'string' },
                    entriesAdded: { type: 'number' },
                },
            },
        },
        {
            name: 'generateTypeDocs',
            description: 'Generate documentation for TypeScript types, interfaces, and enums',
            inputSchema: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'TypeScript source code with type definitions' },
                    format: { type: 'string', enum: ['markdown', 'html', 'json'], default: 'markdown' },
                    includePrivate: { type: 'boolean', default: false },
                },
                required: ['code'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    documentation: { type: 'string' },
                    types: { type: 'array', items: { type: 'object' } },
                    format: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:code',
        'write:documentation',
        'read:package',
        'read:repository',
    ],
    maxConcurrentTasks: 5,
    timeout: 60000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 1000,
        exponentialBackoff: true,
    },
};
let DocumentationAgentService = class DocumentationAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.docHistory = [];
    }
    defineConfig() {
        return exports.DOCUMENTATION_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'generateDocs',
            description: 'Generate inline code documentation',
            execute: async (params) => this.generateDocs(params),
        });
        this.registerTool({
            name: 'generateApiDocs',
            description: 'Generate API documentation',
            execute: async (params) => this.generateApiDocs(params),
        });
        this.registerTool({
            name: 'generateReadme',
            description: 'Generate a README.md file',
            execute: async (params) => this.generateReadme(params),
        });
        this.registerTool({
            name: 'updateChangelog',
            description: 'Update or generate a CHANGELOG.md',
            execute: async (params) => this.updateChangelog(params),
        });
        this.registerTool({
            name: 'generateTypeDocs',
            description: 'Generate TypeScript type documentation',
            execute: async (params) => this.generateTypeDocs(params),
        });
        await this.storeInWorkingMemory('docs:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Documentation agent initialized with 5 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.DevCapability.DOCUMENTATION, {
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
            'generateDocs',
            'generateApiDocs',
            'generateReadme',
            'updateChangelog',
            'generateTypeDocs',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown documentation action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            this.docHistory.push({
                action,
                timestamp: new Date(),
                outputSize: JSON.stringify(result).length,
            });
            await this.storeInWorkingMemory(`docs:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Documentation execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.docHistory = [];
        this.logger.log('Documentation agent destroyed, history cleared');
    }
    async generateDocs(params) {
        const { code, language, style = 'jsdoc', includeExamples = true } = params;
        if (!code || typeof code !== 'string') {
            throw new Error('Source code is required');
        }
        if (!language || typeof language !== 'string') {
            throw new Error('Programming language is required');
        }
        const lines = code.split('\n');
        const docBlocks = [];
        const resultLines = [];
        let totalDocTargets = 0;
        let documentedTargets = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const prevLine = i > 0 ? lines[i - 1].trim() : '';
            const hasExistingDoc = prevLine.endsWith('*/') || prevLine.startsWith('"""') || prevLine.includes("'''");
            const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?/);
            if (funcMatch) {
                totalDocTargets++;
                const doc = this.generateFunctionDoc(funcMatch[1], funcMatch[2], funcMatch[3], style, language, includeExamples);
                if (!hasExistingDoc) {
                    resultLines.push(doc);
                    documentedTargets++;
                }
                docBlocks.push({
                    target: funcMatch[1],
                    type: 'function',
                    line: i + 1,
                    doc: doc,
                });
            }
            const classMatch = line.match(/(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/);
            if (classMatch) {
                totalDocTargets++;
                const doc = this.generateClassDoc(classMatch[1], style);
                if (!hasExistingDoc) {
                    resultLines.push(doc);
                    documentedTargets++;
                }
                docBlocks.push({
                    target: classMatch[1],
                    type: 'class',
                    line: i + 1,
                    doc,
                });
            }
            const methodMatch = line.match(/(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?\s*{/);
            if (methodMatch &&
                !funcMatch &&
                !['if', 'for', 'while', 'switch', 'catch'].includes(methodMatch[1])) {
                totalDocTargets++;
                const doc = this.generateMethodDoc(methodMatch[1], methodMatch[2], methodMatch[3], style, language);
                if (!hasExistingDoc) {
                    resultLines.push(doc);
                    documentedTargets++;
                }
                docBlocks.push({
                    target: methodMatch[1],
                    type: 'method',
                    line: i + 1,
                    doc,
                });
            }
            const interfaceMatch = line.match(/(?:export\s+)?interface\s+(\w+)/);
            if (interfaceMatch) {
                totalDocTargets++;
                const doc = this.generateInterfaceDoc(interfaceMatch[1], style);
                if (!hasExistingDoc) {
                    resultLines.push(doc);
                    documentedTargets++;
                }
                docBlocks.push({
                    target: interfaceMatch[1],
                    type: 'interface',
                    line: i + 1,
                    doc,
                });
            }
            resultLines.push(line);
        }
        const coverage = totalDocTargets > 0 ? Math.round((documentedTargets / totalDocTargets) * 100) : 100;
        const documentedCode = resultLines.join('\n');
        this.logger.log(`Generated documentation: ${docBlocks.length} doc block(s), ${coverage}% coverage`);
        return { documentedCode, docBlocks, coverage };
    }
    async generateApiDocs(params) {
        const { code, language, format = 'openapi', version = '1.0.0' } = params;
        if (!code || typeof code !== 'string') {
            throw new Error('Source code is required');
        }
        const endpoints = this.extractApiEndpoints(code, language);
        if (endpoints.length === 0) {
            throw new Error('No API endpoints found in the provided code');
        }
        let documentation;
        switch (format) {
            case 'openapi':
                documentation = this.renderOpenApiDocs(endpoints, version);
                break;
            case 'markdown':
                documentation = this.renderMarkdownApiDocs(endpoints, version);
                break;
            case 'html':
                documentation = this.renderHtmlApiDocs(endpoints, version);
                break;
            default:
                documentation = this.renderOpenApiDocs(endpoints, version);
        }
        this.logger.log(`Generated API docs: ${endpoints.length} endpoint(s), format=${format}`);
        return { documentation, endpoints, format };
    }
    async generateReadme(params) {
        const { projectName, description, packageJson, features = [], installationSteps = [] } = params;
        if (!projectName || typeof projectName !== 'string') {
            throw new Error('Project name is required');
        }
        if (!description || typeof description !== 'string') {
            throw new Error('Project description is required');
        }
        const sections = [];
        let content = '';
        content += `# ${projectName}\n\n`;
        content += `${description}\n\n`;
        sections.push('header');
        if (packageJson) {
            content += this.generateBadges(packageJson);
            sections.push('badges');
        }
        if (features.length > 0) {
            content += `## Features\n\n`;
            for (const feature of features) {
                content += `- ${feature}\n`;
            }
            content += '\n';
            sections.push('features');
        }
        content += `## Installation\n\n`;
        if (installationSteps.length > 0) {
            for (const step of installationSteps) {
                content += `${step}\n`;
            }
        }
        else if (packageJson?.name) {
            content += '```bash\n';
            content += `npm install ${packageJson.name}\n`;
            content += '```\n\n';
            content += 'or\n\n';
            content += '```bash\n';
            content += `yarn add ${packageJson.name}\n`;
            content += '```\n';
        }
        else {
            content += '```bash\n';
            content += 'npm install\n';
            content += '```\n';
        }
        content += '\n';
        sections.push('installation');
        content += `## Usage\n\n`;
        content += '```typescript\n';
        content += `import { ${this.toPascalCase(projectName)} } from '${packageJson?.name || projectName}';\n\n`;
        content += `const instance = new ${this.toPascalCase(projectName)}();\n`;
        content += '// Configure and use the module\n';
        content += '```\n\n';
        sections.push('usage');
        if (packageJson?.config || features.some((f) => f.toLowerCase().includes('config'))) {
            content += `## Configuration\n\n`;
            content += '| Option | Type | Default | Description |\n';
            content += '|--------|------|---------|-------------|\n';
            content += "| `option1` | `string` | `'default'` | Description for option1 |\n";
            content += '| `option2` | `boolean` | `false` | Description for option2 |\n\n';
            sections.push('configuration');
        }
        content += `## API Reference\n\n`;
        content += `See [API Documentation](./docs/api.md) for detailed API reference.\n\n`;
        sections.push('api');
        content += `## Contributing\n\n`;
        content += `1. Fork the repository\n`;
        content += `2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)\n`;
        content += `3. Commit your changes (\`git commit -m 'Add amazing feature'\`)\n`;
        content += `4. Push to the branch (\`git push origin feature/amazing-feature\`)\n`;
        content += `5. Open a Pull Request\n\n`;
        sections.push('contributing');
        const license = packageJson?.license || 'MIT';
        content += `## License\n\n`;
        content += `This project is licensed under the ${license} License.\n`;
        sections.push('license');
        this.logger.log(`Generated README: ${sections.length} section(s)`);
        return { content, sections };
    }
    async updateChangelog(params) {
        const { currentChangelog, version, changes, date } = params;
        if (!version || typeof version !== 'string') {
            throw new Error('Version is required');
        }
        if (!changes || !Array.isArray(changes) || changes.length === 0) {
            throw new Error('At least one change entry is required');
        }
        if (!/^\d+\.\d+\.\d+/.test(version)) {
            throw new Error('Version must follow semver format (e.g., 1.0.0)');
        }
        const releaseDate = date || new Date().toISOString().split('T')[0];
        const grouped = this.groupChangesByType(changes);
        let newEntry = `## [${version}] - ${releaseDate}\n\n`;
        const typeLabels = {
            added: '### Added',
            changed: '### Changed',
            deprecated: '### Deprecated',
            removed: '### Removed',
            fixed: '### Fixed',
            security: '### Security',
        };
        for (const [type, entries] of Object.entries(grouped)) {
            const label = typeLabels[type] || `### ${type}`;
            newEntry += `${label}\n\n`;
            for (const entry of entries) {
                const scope = entry.scope ? `**${entry.scope}:** ` : '';
                newEntry += `- ${scope}${entry.description}\n`;
            }
            newEntry += '\n';
        }
        let content;
        if (currentChangelog) {
            const headerEnd = currentChangelog.indexOf('\n\n');
            if (headerEnd !== -1) {
                content =
                    currentChangelog.substring(0, headerEnd + 2) +
                        newEntry +
                        currentChangelog.substring(headerEnd + 2);
            }
            else {
                content = currentChangelog + '\n\n' + newEntry;
            }
        }
        else {
            content = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n${newEntry}`;
        }
        this.logger.log(`Updated changelog: version ${version}, ${changes.length} entr(ies)`);
        return { content, version, entriesAdded: changes.length };
    }
    async generateTypeDocs(params) {
        const { code, format = 'markdown', includePrivate = false } = params;
        if (!code || typeof code !== 'string') {
            throw new Error('TypeScript source code is required');
        }
        const types = this.extractTypeDefinitions(code, includePrivate);
        if (types.length === 0) {
            throw new Error('No type definitions found in the provided code');
        }
        let documentation;
        switch (format) {
            case 'markdown':
                documentation = this.renderMarkdownTypeDocs(types);
                break;
            case 'html':
                documentation = this.renderHtmlTypeDocs(types);
                break;
            case 'json':
                documentation = JSON.stringify(types, null, 2);
                break;
            default:
                documentation = this.renderMarkdownTypeDocs(types);
        }
        this.logger.log(`Generated type docs: ${types.length} type(s), format=${format}`);
        return { documentation, types, format };
    }
    generateFunctionDoc(name, paramsStr, returnType, style, language, includeExamples) {
        if (language === 'python') {
            return this.generatePythonDocstring(name, paramsStr, returnType, includeExamples);
        }
        const params = this.parseParamsList(paramsStr);
        const lines = [];
        lines.push('/**');
        lines.push(` * ${this.generateDescription(name)}`);
        for (const param of params) {
            lines.push(` * @param ${param.name} - ${this.generateParamDescription(param.name, param.type)}`);
        }
        if (returnType && returnType !== 'void') {
            lines.push(` * @returns {${returnType}} ${this.generateReturnDescription(returnType)}`);
        }
        if (includeExamples) {
            lines.push(' *');
            lines.push(` * @example`);
            lines.push(` * \`\`\`typescript`);
            lines.push(` * const result = ${name}(${params.map((p) => p.name).join(', ')});`);
            lines.push(` * \`\`\``);
        }
        lines.push(' */');
        return lines.join('\n');
    }
    generateClassDoc(name, style) {
        const lines = [];
        lines.push('/**');
        lines.push(` * ${name} class`);
        lines.push(` *`);
        lines.push(` * Provides functionality for ${this.humanizeName(name)}.`);
        lines.push(' */');
        return lines.join('\n');
    }
    generateMethodDoc(name, paramsStr, returnType, style, language) {
        const params = this.parseParamsList(paramsStr);
        const lines = [];
        lines.push('  /**');
        lines.push(`   * ${this.generateDescription(name)}`);
        for (const param of params) {
            lines.push(`   * @param ${param.name} - ${this.generateParamDescription(param.name, param.type)}`);
        }
        if (returnType && returnType !== 'void') {
            lines.push(`   * @returns {${returnType}} ${this.generateReturnDescription(returnType)}`);
        }
        lines.push('   */');
        return lines.join('\n');
    }
    generateInterfaceDoc(name, style) {
        const lines = [];
        lines.push('/**');
        lines.push(` * ${name} interface`);
        lines.push(` *`);
        lines.push(` * Defines the contract for ${this.humanizeName(name)}.`);
        lines.push(' */');
        return lines.join('\n');
    }
    generatePythonDocstring(name, paramsStr, returnType, includeExamples) {
        const params = this.parsePythonParamsList(paramsStr);
        const lines = [];
        lines.push('    """');
        lines.push(`    ${this.generateDescription(name)}.`);
        lines.push('');
        for (const param of params) {
            lines.push(`    Args:`);
            lines.push(`        ${param.name} (${param.type || 'Any'}): ${this.generateParamDescription(param.name, param.type)}`);
        }
        if (returnType && returnType !== 'None') {
            lines.push('');
            lines.push(`    Returns:`);
            lines.push(`        ${returnType}: ${this.generateReturnDescription(returnType)}`);
        }
        if (includeExamples) {
            lines.push('');
            lines.push('    Example:');
            lines.push(`        >>> result = ${name}(${params.map((p) => p.name).join(', ')})`);
        }
        lines.push('    """');
        return lines.join('\n');
    }
    extractApiEndpoints(code, language) {
        const endpoints = [];
        const nestjsRegex = /@(Get|Post|Put|Delete|Patch)\(['"]([^'"]+)['"]\)(?:\s*\n\s*@HttpCode\(\d+\))?(?:\s*\n\s*@\w+)*\s*\n\s*(?:async\s+)?(\w+)\s*\(([^)]*)\)/g;
        let match;
        while ((match = nestjsRegex.exec(code)) !== null) {
            const method = match[1].toUpperCase();
            const path = match[2];
            const handlerName = match[3];
            const params = this.parseApiParams(match[4], path);
            endpoints.push({
                method,
                path,
                description: `${handlerName} handler`,
                parameters: params,
                responses: this.inferResponses(method),
                tags: this.extractControllerTag(code, match.index),
            });
        }
        const expressRegex = /(?:router|app)\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
        while ((match = expressRegex.exec(code)) !== null) {
            endpoints.push({
                method: match[1].toUpperCase(),
                path: match[2],
                description: `${match[1].toUpperCase()} ${match[2]}`,
                parameters: [],
                responses: this.inferResponses(match[1].toUpperCase()),
                tags: [],
            });
        }
        return endpoints;
    }
    parseApiParams(paramsStr, path) {
        const params = [];
        const pathParams = path.match(/:(\w+)/g);
        if (pathParams) {
            for (const param of pathParams) {
                const name = param.replace(':', '');
                params.push({
                    name,
                    type: 'string',
                    required: true,
                    description: `Path parameter: ${name}`,
                });
            }
        }
        const methodParams = paramsStr.split(',').filter((p) => p.trim().length > 0);
        for (const param of methodParams) {
            const trimmed = param.trim();
            if (trimmed.includes('@Body()') || trimmed.includes('@Req()') || trimmed.includes('@Res()')) {
                continue;
            }
            const nameMatch = trimmed.match(/(\w+)$/);
            if (nameMatch) {
                params.push({
                    name: nameMatch[1],
                    type: 'string',
                    required: !trimmed.includes('?'),
                    description: `Parameter: ${nameMatch[1]}`,
                });
            }
        }
        return params;
    }
    inferResponses(method) {
        const responses = [
            { code: 200, description: 'Successful response' },
        ];
        if (['POST'].includes(method)) {
            responses.unshift({ code: 201, description: 'Resource created successfully' });
        }
        responses.push({ code: 400, description: 'Bad request' });
        responses.push({ code: 401, description: 'Unauthorized' });
        responses.push({ code: 500, description: 'Internal server error' });
        return responses;
    }
    extractControllerTag(code, position) {
        const beforePosition = code.substring(0, position);
        const controllerMatch = beforePosition.match(/@Controller\(['"]?([^'")\]]+)/g);
        if (controllerMatch) {
            const lastController = controllerMatch[controllerMatch.length - 1];
            const tag = lastController
                .replace("@Controller('", '')
                .replace('@Controller("', '')
                .replace('@Controller(', '');
            return [tag];
        }
        return ['default'];
    }
    renderOpenApiDocs(endpoints, version) {
        const spec = {
            openapi: '3.0.3',
            info: {
                title: 'API Documentation',
                version,
                description: 'Auto-generated API documentation',
            },
            paths: {},
        };
        for (const endpoint of endpoints) {
            if (!spec.paths[endpoint.path]) {
                spec.paths[endpoint.path] = {};
            }
            spec.paths[endpoint.path][endpoint.method.toLowerCase()] = {
                summary: endpoint.description,
                tags: endpoint.tags,
                parameters: endpoint.parameters.map((p) => ({
                    name: p.name,
                    in: p.required ? 'path' : 'query',
                    required: p.required,
                    schema: { type: p.type.toLowerCase() === 'string' ? 'string' : p.type },
                    description: p.description,
                })),
                responses: endpoint.responses.reduce((acc, r) => {
                    acc[r.code] = { description: r.description };
                    return acc;
                }, {}),
            };
        }
        return JSON.stringify(spec, null, 2);
    }
    renderMarkdownApiDocs(endpoints, version) {
        let md = `# API Documentation\n\n`;
        md += `Version: ${version}\n\n`;
        md += `## Endpoints\n\n`;
        for (const endpoint of endpoints) {
            md += `### ${endpoint.method} ${endpoint.path}\n\n`;
            md += `${endpoint.description}\n\n`;
            if (endpoint.parameters.length > 0) {
                md += `**Parameters:**\n\n`;
                md += `| Name | Type | Required | Description |\n`;
                md += `|------|------|----------|-------------|\n`;
                for (const param of endpoint.parameters) {
                    md += `| \`${param.name}\` | ${param.type} | ${param.required ? 'Yes' : 'No'} | ${param.description} |\n`;
                }
                md += '\n';
            }
            md += `**Responses:**\n\n`;
            md += `| Code | Description |\n`;
            md += `|------|-------------|\n`;
            for (const response of endpoint.responses) {
                md += `| ${response.code} | ${response.description} |\n`;
            }
            md += '\n---\n\n';
        }
        return md;
    }
    renderHtmlApiDocs(endpoints, version) {
        let html = `<!DOCTYPE html>\n<html>\n<head><title>API Documentation v${version}</title></head>\n<body>\n`;
        html += `<h1>API Documentation</h1>\n<p>Version: ${version}</p>\n`;
        for (const endpoint of endpoints) {
            html += `<h2>${endpoint.method} ${endpoint.path}</h2>\n`;
            html += `<p>${endpoint.description}</p>\n`;
            if (endpoint.parameters.length > 0) {
                html += `<h3>Parameters</h3><table><tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr>\n`;
                for (const param of endpoint.parameters) {
                    html += `<tr><td>${param.name}</td><td>${param.type}</td><td>${param.required}</td><td>${param.description}</td></tr>\n`;
                }
                html += `</table>\n`;
            }
            html += `<h3>Responses</h3><table><tr><th>Code</th><th>Description</th></tr>\n`;
            for (const response of endpoint.responses) {
                html += `<tr><td>${response.code}</td><td>${response.description}</td></tr>\n`;
            }
            html += `</table>\n<hr>\n`;
        }
        html += `</body></html>`;
        return html;
    }
    extractTypeDefinitions(code, includePrivate) {
        const types = [];
        const interfaceRegex = /(?:export\s+)?interface\s+(\w+)\s*(?:extends\s+\w+\s*)?\{([^}]*)\}/g;
        let match;
        while ((match = interfaceRegex.exec(code)) !== null) {
            const name = match[1];
            const body = match[2];
            const isExported = code.substring(match.index - 7, match.index).includes('export');
            const properties = this.parseTypeProperties(body);
            types.push({
                name,
                kind: 'interface',
                description: `${name} interface definition`,
                properties,
                exported: isExported,
            });
        }
        const typeRegex = /(?:export\s+)?type\s+(\w+)\s*(?:<[^>]+>)?\s*=\s*([^;]+);/g;
        while ((match = typeRegex.exec(code)) !== null) {
            const name = match[1];
            const definition = match[2].trim();
            const isExported = code.substring(match.index - 7, match.index).includes('export');
            types.push({
                name,
                kind: 'type',
                description: `${name} type alias: ${definition.substring(0, 50)}`,
                exported: isExported,
            });
        }
        const enumRegex = /(?:export\s+)?enum\s+(\w+)\s*\{([^}]*)\}/g;
        while ((match = enumRegex.exec(code)) !== null) {
            const name = match[1];
            const body = match[2];
            const isExported = code.substring(match.index - 7, match.index).includes('export');
            const values = body
                .split(',')
                .map((v) => v.trim().split('=')[0].trim())
                .filter((v) => v.length > 0);
            types.push({
                name,
                kind: 'enum',
                description: `${name} enumeration`,
                values,
                exported: isExported,
            });
        }
        const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?\s*\{/g;
        while ((match = classRegex.exec(code)) !== null) {
            const name = match[1];
            const isExported = code.substring(match.index - 7, match.index).includes('export');
            types.push({
                name,
                kind: 'class',
                description: `${name} class`,
                exported: isExported,
            });
        }
        return types;
    }
    parseTypeProperties(body) {
        const properties = [];
        const lines = body
            .split(';')
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
        for (const line of lines) {
            const propMatch = line.match(/(\w+)(\??):\s*([^;]+)/);
            if (propMatch) {
                properties.push({
                    name: propMatch[1],
                    type: propMatch[3].trim(),
                    optional: propMatch[2] === '?',
                    description: `Property ${propMatch[1]} of type ${propMatch[3].trim()}`,
                });
            }
        }
        return properties;
    }
    renderMarkdownTypeDocs(types) {
        let md = `# Type Documentation\n\n`;
        for (const type of types) {
            md += `## ${type.name}\n\n`;
            md += `**Kind:** ${type.kind} ${type.exported ? '(exported)' : '(internal)'}\n\n`;
            md += `${type.description}\n\n`;
            if (type.properties && type.properties.length > 0) {
                md += `### Properties\n\n`;
                md += `| Name | Type | Optional | Description |\n`;
                md += `|------|------|----------|-------------|\n`;
                for (const prop of type.properties) {
                    md += `| \`${prop.name}\` | \`${prop.type}\` | ${prop.optional ? 'Yes' : 'No'} | ${prop.description} |\n`;
                }
                md += '\n';
            }
            if (type.values && type.values.length > 0) {
                md += `### Values\n\n`;
                for (const value of type.values) {
                    md += `- \`${value}\`\n`;
                }
                md += '\n';
            }
            md += '---\n\n';
        }
        return md;
    }
    renderHtmlTypeDocs(types) {
        let html = `<!DOCTYPE html><html><head><title>Type Documentation</title></head><body><h1>Type Documentation</h1>`;
        for (const type of types) {
            html += `<h2>${type.name}</h2>`;
            html += `<p><strong>Kind:</strong> ${type.kind} ${type.exported ? '(exported)' : '(internal)'}</p>`;
            html += `<p>${type.description}</p>`;
            if (type.properties && type.properties.length > 0) {
                html += `<h3>Properties</h3><table><tr><th>Name</th><th>Type</th><th>Optional</th><th>Description</th></tr>`;
                for (const prop of type.properties) {
                    html += `<tr><td><code>${prop.name}</code></td><td><code>${prop.type}</code></td><td>${prop.optional}</td><td>${prop.description}</td></tr>`;
                }
                html += `</table>`;
            }
            if (type.values && type.values.length > 0) {
                html += `<h3>Values</h3><ul>`;
                for (const value of type.values) {
                    html += `<li><code>${value}</code></li>`;
                }
                html += `</ul>`;
            }
            html += `<hr>`;
        }
        html += `</body></html>`;
        return html;
    }
    groupChangesByType(changes) {
        const grouped = {};
        const order = ['added', 'changed', 'deprecated', 'removed', 'fixed', 'security'];
        for (const type of order) {
            const entries = changes.filter((c) => c.type === type);
            if (entries.length > 0) {
                grouped[type] = entries;
            }
        }
        for (const change of changes) {
            if (!order.includes(change.type)) {
                if (!grouped[change.type])
                    grouped[change.type] = [];
                grouped[change.type].push(change);
            }
        }
        return grouped;
    }
    generateBadges(packageJson) {
        let badges = '';
        const name = packageJson.name || 'package';
        if (packageJson.version) {
            badges += `![Version](https://img.shields.io/badge/version-${packageJson.version}-blue) `;
        }
        if (packageJson.license) {
            badges += `![License](https://img.shields.io/badge/license-${packageJson.license}-green) `;
        }
        badges += `![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen) `;
        return badges.trim() + '\n\n';
    }
    parseParamsList(paramsStr) {
        if (!paramsStr.trim())
            return [];
        return paramsStr
            .split(',')
            .map((param) => {
            const trimmed = param.trim();
            const parts = trimmed.split(':');
            const name = parts[0].replace(/\?.*$/, '').trim();
            const type = parts[1] ? parts[1].replace(/\s*=\s*.*$/, '').trim() : 'any';
            return { name, type };
        })
            .filter((p) => p.name.length > 0);
    }
    parsePythonParamsList(paramsStr) {
        if (!paramsStr.trim())
            return [];
        return paramsStr
            .split(',')
            .map((param) => {
            const trimmed = param.trim();
            if (trimmed === 'self' || trimmed === 'cls')
                return { name: trimmed, type: 'self' };
            const parts = trimmed.split(':');
            const name = parts[0].replace(/\s*=\s*.*$/, '').trim();
            const type = parts[1] ? parts[1].replace(/\s*=\s*.*$/, '').trim() : 'Any';
            return { name, type };
        })
            .filter((p) => p.name.length > 0 && p.type !== 'self');
    }
    generateDescription(name) {
        return `${this.humanizeName(name)}`;
    }
    generateParamDescription(name, type) {
        const lower = name.toLowerCase();
        if (lower.includes('id'))
            return `Unique identifier for the ${name.replace(/id/i, '').trim() || 'resource'}`;
        if (lower.includes('name'))
            return 'Name of the item';
        if (lower.includes('type'))
            return 'Type classification';
        if (lower.includes('limit'))
            return 'Maximum number of items to return';
        if (lower.includes('offset'))
            return 'Number of items to skip';
        if (lower.includes('page'))
            return 'Page number for pagination';
        if (lower.includes('query'))
            return 'Search query string';
        if (lower.includes('sort'))
            return 'Sort order specification';
        if (lower.includes('filter'))
            return 'Filter criteria';
        return `The ${name} parameter`;
    }
    generateReturnDescription(returnType) {
        const lower = returnType.toLowerCase();
        if (lower.includes('promise'))
            return 'A promise resolving to the result';
        if (lower.includes('array') || lower.includes('list'))
            return 'Array of results';
        if (lower.includes('boolean'))
            return 'True if operation succeeded, false otherwise';
        if (lower.includes('void'))
            return 'No return value';
        if (lower.includes('number'))
            return 'Numeric result';
        if (lower.includes('string'))
            return 'String result';
        return `Result of type ${returnType}`;
    }
    humanizeName(name) {
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/[-_]/g, ' ')
            .replace(/^\s/, '')
            .toLowerCase()
            .trim();
    }
    toPascalCase(str) {
        return str
            .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
            .replace(/^(.)/, (_, c) => c.toUpperCase());
    }
};
exports.DocumentationAgentService = DocumentationAgentService;
exports.DocumentationAgentService = DocumentationAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], DocumentationAgentService);
//# sourceMappingURL=documentation-agent.service.js.map