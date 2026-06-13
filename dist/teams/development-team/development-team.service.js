"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DevelopmentTeamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevelopmentTeamService = void 0;
const common_1 = require("@nestjs/common");
let DevelopmentTeamService = DevelopmentTeamService_1 = class DevelopmentTeamService {
    constructor() {
        this.logger = new common_1.Logger(DevelopmentTeamService_1.name);
        this.projects = new Map();
        this.taskLog = new Map();
        this.metrics = {
            totalTasks: 0,
            successfulTasks: 0,
            failedTasks: 0,
            totalDurationMs: 0,
            totalTestsPassed: 0,
            totalTestsFailed: 0,
        };
    }
    async execute(task) {
        const start = Date.now();
        this.logger.log(`Executing dev task [${task.capability}] for mission ${task.missionId}`);
        this.ensureProject(task.missionId);
        try {
            let result;
            switch (task.capability) {
                case 'frontend':
                    result = await this.generateFrontend(task.params.spec, task.missionId);
                    break;
                case 'backend':
                    result = await this.generateBackend(task.params.spec, task.missionId);
                    break;
                case 'database':
                    result = await this.setupDatabase(task.params.schema, task.missionId);
                    break;
                case 'devops':
                    result = await this.deploy(task.params.config, task.missionId);
                    break;
                case 'qa':
                    result = await this.runTests(task.params.paths, task.missionId);
                    break;
                case 'documentation':
                    result = await this.generateDocumentation(task.params.code, task.missionId);
                    break;
                case 'code_review':
                    result = await this.reviewCode(task.params.code, task.missionId);
                    break;
                case 'debug':
                    result = await this.debug(task.params.issue, task.missionId);
                    break;
                default:
                    throw new Error(`Unknown dev capability: ${task.capability}`);
            }
            result.taskId = task.id;
            this.metrics.totalTasks++;
            this.metrics.successfulTasks++;
            this.metrics.totalDurationMs += result.durationMs;
            if (result.testsPassed)
                this.metrics.totalTestsPassed += result.testsPassed;
            if (result.testsFailed)
                this.metrics.totalTestsFailed += result.testsFailed;
            this.taskLog.set(task.id, { task, result });
            this.logger.log(`Dev task [${task.capability}] completed in ${result.durationMs}ms`);
            return result;
        }
        catch (error) {
            const durationMs = Date.now() - start;
            const result = { taskId: task.id, success: false, artifacts: [], error: error.message, durationMs };
            this.metrics.totalTasks++;
            this.metrics.failedTasks++;
            this.metrics.totalDurationMs += durationMs;
            this.taskLog.set(task.id, { task, result });
            this.logger.error(`Dev task [${task.capability}] failed: ${error.message}`);
            return result;
        }
    }
    async generateFrontend(spec, missionId) {
        const start = Date.now();
        const projectId = missionId || 'default';
        const componentName = spec.name || 'App';
        const framework = spec.framework || 'react';
        const components = spec.components || [componentName];
        this.logger.log(`Generating frontend: ${componentName} (${framework}) with ${components.length} components`);
        await this.sleep(300 + components.length * 100);
        const artifacts = [];
        for (const comp of components) {
            const kebab = this.toKebabCase(comp);
            artifacts.push(`src/components/${kebab}/${kebab}.tsx`);
            artifacts.push(`src/components/${kebab}/${kebab}.module.css`);
            artifacts.push(`src/components/${kebab}/${kebab}.test.tsx`);
            artifacts.push(`src/components/${kebab}/index.ts`);
        }
        const project = this.projects.get(projectId);
        if (project) {
            project.frontendFiles.push(...artifacts);
            project.lastActivity = new Date();
        }
        const code = this.generateFrontendTemplate(componentName, framework);
        return { taskId: '', success: true, artifacts, code, durationMs: Date.now() - start };
    }
    async generateBackend(spec, missionId) {
        const start = Date.now();
        const projectId = missionId || 'default';
        const moduleName = spec.name || 'AppModule';
        const framework = spec.framework || 'nestjs';
        const endpoints = spec.endpoints || ['get', 'post', 'put', 'delete'];
        this.logger.log(`Generating backend: ${moduleName} (${framework}) with ${endpoints.length} endpoints`);
        await this.sleep(400 + endpoints.length * 80);
        const kebab = this.toKebabCase(moduleName);
        const artifacts = [
            `src/${kebab}/${kebab}.module.ts`,
            `src/${kebab}/${kebab}.controller.ts`,
            `src/${kebab}/${kebab}.service.ts`,
            `src/${kebab}/dto/create-${kebab}.dto.ts`,
            `src/${kebab}/dto/update-${kebab}.dto.ts`,
            `src/${kebab}/entities/${kebab}.entity.ts`,
            `src/${kebab}/${kebab}.controller.spec.ts`,
            `src/${kebab}/${kebab}.service.spec.ts`,
        ];
        const project = this.projects.get(projectId);
        if (project) {
            project.backendFiles.push(...artifacts);
            project.lastActivity = new Date();
        }
        const code = this.generateBackendTemplate(moduleName, endpoints);
        return { taskId: '', success: true, artifacts, code, durationMs: Date.now() - start };
    }
    async setupDatabase(schema, missionId) {
        const start = Date.now();
        const projectId = missionId || 'default';
        const dbName = schema.name || 'app_db';
        const dbType = schema.type || 'postgresql';
        const tables = schema.tables || [{ name: 'users', columns: ['id', 'email', 'name', 'created_at'] }];
        this.logger.log(`Setting up database: ${dbName} (${dbType}) with ${tables.length} tables`);
        await this.sleep(500 + tables.length * 150);
        const timestamp = Date.now();
        const artifacts = [
            `migrations/${timestamp}-create-${this.toKebabCase(dbName)}-schema.ts`,
            `migrations/${timestamp}-create-${this.toKebabCase(dbName)}-indexes.ts`,
            `prisma/schema.prisma`,
            `src/config/database.config.ts`,
        ];
        const code = tables.map((t) => `CREATE TABLE ${t.name} (\n  ${t.columns.map((c) => `  ${c} TEXT`).join(',\n')}\n);`).join('\n\n');
        const project = this.projects.get(projectId);
        if (project) {
            project.dbMigrations.push(...artifacts);
            project.lastActivity = new Date();
        }
        return { taskId: '', success: true, artifacts, code, durationMs: Date.now() - start };
    }
    async deploy(config, missionId) {
        const start = Date.now();
        const projectId = missionId || 'default';
        const env = config.environment || 'staging';
        const provider = config.provider || 'aws';
        const region = config.region || 'us-east-1';
        const services = config.services || ['api', 'web'];
        this.logger.log(`Deploying to ${env} on ${provider}/${region}: ${services.join(', ')}`);
        await this.sleep(200);
        await this.sleep(300);
        await this.sleep(400);
        await this.sleep(200);
        const success = Math.random() > 0.05;
        const deploymentStatus = success ? 'deployed' : 'failed';
        const project = this.projects.get(projectId);
        if (project) {
            project.deployments.push({ env, status: deploymentStatus, timestamp: new Date() });
            project.lastActivity = new Date();
        }
        const artifacts = [`deployments/${env}-${Date.now()}.yaml`, `docker-compose.${env}.yml`];
        return {
            taskId: '',
            success,
            artifacts,
            code: success ? `# Deployment Manifest\nenvironment: ${env}\nprovider: ${provider}\nregion: ${region}\nservices:\n${services.map((s) => `  - ${s}`).join('\n')}\nstatus: ${deploymentStatus}\nversion: ${this.generateVersion()}` : undefined,
            error: success ? undefined : `Deployment to ${env} failed: health check timeout`,
            durationMs: Date.now() - start,
        };
    }
    async runTests(paths, missionId) {
        const start = Date.now();
        const projectId = missionId || 'default';
        const testPaths = paths.length > 0 ? paths : ['src/**/*.spec.ts'];
        this.logger.log(`Running tests: ${testPaths.join(', ')}`);
        await this.sleep(500 + testPaths.length * 200);
        const totalTests = Math.floor(Math.random() * 30) + 10;
        const passRate = 0.85 + Math.random() * 0.15;
        const testsPassed = Math.floor(totalTests * passRate);
        const testsFailed = totalTests - testsPassed;
        const project = this.projects.get(projectId);
        if (project) {
            project.testRuns.push({ passed: testsPassed, failed: testsFailed, timestamp: new Date() });
            project.lastActivity = new Date();
        }
        const artifacts = [`test-results/${Date.now()}-junit.xml`, `test-results/${Date.now()}-coverage.json`];
        return {
            taskId: '',
            success: testsFailed === 0,
            artifacts,
            code: `Test Suite Results\n${'='.repeat(40)}\nTotal: ${totalTests}\nPassed: ${testsPassed}\nFailed: ${testsFailed}\nCoverage: ${(passRate * 100).toFixed(1)}%\n`,
            testsPassed,
            testsFailed,
            durationMs: Date.now() - start,
        };
    }
    async generateDocumentation(code, missionId) {
        const start = Date.now();
        const projectId = missionId || 'default';
        this.logger.log(`Generating documentation for mission ${projectId}`);
        await this.sleep(400 + Math.min(code?.length || 0, 5000) / 50);
        const artifacts = ['docs/API.md', 'docs/ARCHITECTURE.md', 'docs/README.md', 'docs/CHANGELOG.md'];
        const doc = `# API Documentation\n\n## Overview\n\nThis documentation covers the auto-generated API endpoints.\n\n## Endpoints\n\n### GET /api/v1/status\nReturns the current system status.\n\n**Response:**\n\`\`\`json\n{ "status": "ok", "version": "${this.generateVersion()}" }\n\`\`\`\n\n### POST /api/v1/execute\nExecute a task on the development pipeline.\n\n**Request Body:**\n\`\`\`json\n{ "capability": "frontend", "params": {} }\n\`\`\`\n`;
        return { taskId: '', success: true, artifacts, code: doc, durationMs: Date.now() - start };
    }
    async reviewCode(code, missionId) {
        const start = Date.now();
        const projectId = missionId || 'default';
        this.logger.log(`Reviewing code for mission ${projectId}`);
        await this.sleep(600 + Math.min(code?.length || 0, 5000) / 30);
        const issues = { critical: Math.random() > 0.8 ? 1 : 0, major: Math.floor(Math.random() * 3), minor: Math.floor(Math.random() * 5) + 1, suggestions: Math.floor(Math.random() * 4) + 2 };
        const artifacts = [`reviews/${Date.now()}-code-review.json`];
        const reviewCode = `# Code Review Report\n\n## Summary\n- Critical: ${issues.critical}\n- Major: ${issues.major}\n- Minor: ${issues.minor}\n- Suggestions: ${issues.suggestions}\n\n## Verdict: ${issues.critical > 0 ? 'CHANGES REQUIRED' : issues.major > 2 ? 'NEEDS IMPROVEMENT' : 'APPROVED'}\n`;
        return { taskId: '', success: issues.critical === 0, artifacts, code: reviewCode, durationMs: Date.now() - start };
    }
    async debug(issue, missionId) {
        const start = Date.now();
        const projectId = missionId || 'default';
        this.logger.log(`Debugging issue for mission ${projectId}: ${issue.description || 'Unknown'}`);
        await this.sleep(800 + Math.random() * 1200);
        const rootCauses = [
            'Null reference in async callback - missing null check on response.data',
            'Race condition between concurrent DB writes - add optimistic locking',
            'Missing error boundary in component tree - unhandled promise rejection',
            'Incorrect TypeScript type assertion - runtime type mismatch',
            'Memory leak in event listener - listener not removed on component unmount',
        ];
        const selectedCause = rootCauses[Math.floor(Math.random() * rootCauses.length)];
        const confidence = Math.round((70 + Math.random() * 30) * 100) / 100;
        const artifacts = [`debug/${Date.now()}-root-cause-analysis.md`, `debug/${Date.now()}-proposed-fix.patch`];
        const debugCode = `# Root Cause Analysis\n\n## Issue\n${issue.description || issue.error || 'Unspecified error'}\n\n## Root Cause\n${selectedCause}\n\n## Confidence\n${confidence}%\n\n## Suggested Fix\n1. Add defensive null check before accessing the property\n2. Add unit test covering the edge case\n3. Add integration test for the failure scenario\n`;
        return { taskId: '', success: true, artifacts, code: debugCode, durationMs: Date.now() - start };
    }
    getStatus() {
        const projectSummaries = Array.from(this.projects.entries()).map(([missionId, project]) => ({
            missionId,
            frontendFileCount: project.frontendFiles.length,
            backendFileCount: project.backendFiles.length,
            dbMigrationCount: project.dbMigrations.length,
            deploymentCount: project.deployments.length,
            testRunCount: project.testRuns.length,
            lastActivity: project.lastActivity,
        }));
        return {
            team: 'development',
            activeProjects: this.projects.size,
            tasksCompleted: this.metrics.successfulTasks,
            tasksFailed: this.metrics.failedTasks,
            totalTestsPassed: this.metrics.totalTestsPassed,
            totalTestsFailed: this.metrics.totalTestsFailed,
            avgDurationMs: this.metrics.totalTasks > 0 ? Math.round(this.metrics.totalDurationMs / this.metrics.totalTasks) : 0,
            projects: projectSummaries,
        };
    }
    ensureProject(missionId) {
        let project = this.projects.get(missionId);
        if (!project) {
            project = { missionId, frontendFiles: [], backendFiles: [], dbMigrations: [], deployments: [], testRuns: [], lastActivity: new Date() };
            this.projects.set(missionId, project);
            this.logger.log(`Created dev project for mission ${missionId}`);
        }
        return project;
    }
    generateFrontendTemplate(name, framework) {
        const pascal = this.toPascalCase(name);
        if (framework === 'react' || framework === 'nextjs') {
            return `import React from 'react';\nimport styles from './${this.toKebabCase(name)}.module.css';\n\nexport interface ${pascal}Props {\n  title?: string;\n  children?: React.ReactNode;\n}\n\nexport const ${pascal}: React.FC<${pascal}Props> = ({ title, children }) => {\n  return (\n    <div className={styles.container}>\n      {title && <h1 className={styles.title}>{title}</h1>}\n      {children}\n    </div>\n  );\n};\n\nexport default ${pascal};\n`;
        }
        return `// ${pascal} component (${framework})\nexport class ${pascal} {\n  render() {\n    return '<div>${name}</div>';\n  }\n}\n`;
    }
    generateBackendTemplate(name, endpoints) {
        const pascal = this.toPascalCase(name);
        const kebab = this.toKebabCase(name);
        const methods = endpoints.map((ep) => {
            const method = ep.toUpperCase();
            const handler = ep.toLowerCase();
            return `\n  @${method === 'GET' ? 'Get' : method === 'POST' ? 'Post' : method === 'PUT' ? 'Put' : 'Delete'}()\n  async ${handler}() {\n    return this.service.${handler}();\n  }`;
        }).join('\n');
        return `import { Controller, Get, Post, Put, Delete } from '@nestjs/common';\nimport { ${pascal}Service } from './${kebab}.service';\n\n@Controller('${kebab}')\nexport class ${pascal}Controller {\n  constructor(private readonly service: ${pascal}Service) {}\n${methods}\n}\n`;
    }
    toKebabCase(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
    }
    toPascalCase(str) {
        return str.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^./, (c) => c.toUpperCase());
    }
    generateVersion() {
        return `${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 20)}.${Math.floor(Math.random() * 50)}`;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.DevelopmentTeamService = DevelopmentTeamService;
exports.DevelopmentTeamService = DevelopmentTeamService = DevelopmentTeamService_1 = __decorate([
    (0, common_1.Injectable)()
], DevelopmentTeamService);
//# sourceMappingURL=development-team.service.js.map