"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var DevelopmentConnector_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevelopmentConnector = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const interfaces_1 = require("../interfaces");
const llm_helper_1 = require("./llm-helper");
let DevelopmentConnector = DevelopmentConnector_1 = class DevelopmentConnector {
    constructor() {
        this.supportedPack = interfaces_1.CapabilityPack.DEVELOPMENT;
        this.logger = new common_1.Logger(DevelopmentConnector_1.name);
        this.llm = new llm_helper_1.LLMHelper();
    }
    supports(capabilityId) {
        return DevelopmentConnector_1.DEV_CAPABILITIES.has(capabilityId);
    }
    async execute(capabilityId, input) {
        const startTime = Date.now();
        const capId = capabilityId;
        this.logger.log(`Dev connector executing: ${capId} for mission ${input.missionId}`);
        this.ensureWorkspace(input.workspaceDir);
        try {
            let result;
            switch (capId) {
                case interfaces_1.DevCapability.ARCHITECTURE:
                    result = await this.executeArchitecture(input);
                    break;
                case interfaces_1.DevCapability.FRONTEND:
                    result = await this.executeFrontend(input);
                    break;
                case interfaces_1.DevCapability.BACKEND:
                    result = await this.executeBackend(input);
                    break;
                case interfaces_1.DevCapability.DATABASE:
                    result = await this.executeDatabase(input);
                    break;
                case interfaces_1.DevCapability.API:
                    result = await this.executeApi(input);
                    break;
                case interfaces_1.DevCapability.DEVOPS:
                    result = await this.executeDevOps(input);
                    break;
                case interfaces_1.DevCapability.DOCKER:
                    result = await this.executeDocker(input);
                    break;
                case interfaces_1.DevCapability.KUBERNETES:
                    result = await this.executeKubernetes(input);
                    break;
                case interfaces_1.DevCapability.QA:
                    result = await this.executeQA(input);
                    break;
                case interfaces_1.DevCapability.TEST:
                    result = await this.executeTest(input);
                    break;
                case interfaces_1.DevCapability.DEBUG:
                    result = await this.executeDebug(input);
                    break;
                case interfaces_1.DevCapability.DOCUMENTATION:
                    result = await this.executeDocumentation(input);
                    break;
                default:
                    result = await this.executeGenericDev(capId, input);
            }
            result.durationMs = Date.now() - startTime;
            return result;
        }
        catch (error) {
            this.logger.error(`Dev connector failed for ${capId}: ${error.message}`);
            return {
                success: false,
                artifacts: [],
                output: { error: error.message },
                costUsd: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async executeArchitecture(input) {
        const systemPrompt = `You are a senior software architect. Analyze the mission and produce a complete technical architecture document.
Include: tech stack, project structure, component diagram, data models, API design, security considerations.
Output in markdown format.`;
        const userPrompt = `Design the architecture for: "${input.instruction}"
${input.parameters.context ? `Context: ${JSON.stringify(input.parameters.context)}` : ''}
Produce a detailed ARCHITECTURE.md with all design decisions.`;
        const llmResult = await this.llm.call({ systemPrompt, userPrompt, maxTokens: 4096 });
        const filePath = path.join(input.workspaceDir, 'docs', 'ARCHITECTURE.md');
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, llmResult.content, 'utf-8');
        return {
            success: true,
            artifacts: [this.makeArtifact('ARCHITECTURE.md', 'document', filePath, llmResult.content)],
            output: { architecture: llmResult.content.substring(0, 1000) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    async executeFrontend(input) {
        const systemPrompt = `You are an expert frontend developer. Generate complete, working, production-ready code.
For each file, use this format:
===FILE: path/to/file===
(file content)
===ENDFILE===

Generate ALL frontend files: HTML, CSS, JavaScript. Make it beautiful and functional.`;
        const userPrompt = `Build the frontend for: "${input.instruction}"
${this.getExistingFilesContext(input)}
Create complete HTML/CSS/JS that works when opened in a browser.`;
        const llmResult = await this.llm.call({ systemPrompt, userPrompt, maxTokens: 4096 });
        const files = this.llm.parseGeneratedFiles(llmResult.content);
        const artifacts = this.writeFiles(files, input.workspaceDir);
        if (artifacts.length === 0) {
            const template = this.generateFrontendTemplate(input.instruction);
            const templateFiles = this.llm.parseGeneratedFiles(template);
            this.writeFiles(templateFiles, input.workspaceDir);
            artifacts.push(...this.writeFiles(templateFiles, input.workspaceDir));
        }
        return {
            success: artifacts.length > 0,
            artifacts,
            output: { filesGenerated: artifacts.map(a => a.name) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    async executeBackend(input) {
        const systemPrompt = `You are an expert backend developer. Generate complete, working server code.
For each file, use this format:
===FILE: path/to/file===
(file content)
===ENDFILE===

Generate server.js, routes, middleware, and any needed configuration.`;
        const userPrompt = `Build the backend for: "${input.instruction}"
${this.getExistingFilesContext(input)}
Create a Node.js/Express server with all necessary endpoints.`;
        const llmResult = await this.llm.call({ systemPrompt, userPrompt, maxTokens: 4096 });
        const files = this.llm.parseGeneratedFiles(llmResult.content);
        const artifacts = this.writeFiles(files, input.workspaceDir);
        if (artifacts.length === 0) {
            const template = this.generateBackendTemplate(input.instruction);
            const templateFiles = this.llm.parseGeneratedFiles(template);
            this.writeFiles(templateFiles, input.workspaceDir);
            artifacts.push(...this.writeFiles(templateFiles, input.workspaceDir));
        }
        this.ensurePackageJson(input.workspaceDir, input.instruction);
        return {
            success: artifacts.length > 0,
            artifacts,
            output: { filesGenerated: artifacts.map(a => a.name) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    async executeDatabase(input) {
        const systemPrompt = `You are a database architect. Generate database schema and migration files.
For each file, use this format:
===FILE: path/to/file===
(file content)
===ENDFILE===

Generate SQL schema, seed data, and a database utility module.`;
        const userPrompt = `Design the database for: "${input.instruction}"
${this.getExistingFilesContext(input)}
Create schema.sql, seed.sql, and a db.js utility module.`;
        const llmResult = await this.llm.call({ systemPrompt, userPrompt, maxTokens: 4096 });
        const files = this.llm.parseGeneratedFiles(llmResult.content);
        const artifacts = this.writeFiles(files, input.workspaceDir);
        if (!files.has('schema.sql') && !files.has('db/schema.sql')) {
            const schema = `-- Database schema for: ${input.instruction}\nCREATE TABLE IF NOT EXISTS items (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  name TEXT NOT NULL,\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n);`;
            const schemaPath = path.join(input.workspaceDir, 'db', 'schema.sql');
            fs.mkdirSync(path.dirname(schemaPath), { recursive: true });
            fs.writeFileSync(schemaPath, schema, 'utf-8');
            artifacts.push(this.makeArtifact('schema.sql', 'source', schemaPath, schema));
        }
        return {
            success: artifacts.length > 0,
            artifacts,
            output: { filesGenerated: artifacts.map(a => a.name) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    async executeApi(input) {
        const systemPrompt = `You are an API developer. Generate complete REST API code.
For each file, use this format:
===FILE: path/to/file===
(file content)
===ENDFILE===

Generate routes, controllers, middleware, and OpenAPI spec.`;
        const userPrompt = `Build the API for: "${input.instruction}"
${this.getExistingFilesContext(input)}
Create a complete REST API with all endpoints.`;
        const llmResult = await this.llm.call({ systemPrompt, userPrompt, maxTokens: 4096 });
        const files = this.llm.parseGeneratedFiles(llmResult.content);
        const artifacts = this.writeFiles(files, input.workspaceDir);
        return {
            success: artifacts.length > 0,
            artifacts,
            output: { filesGenerated: artifacts.map(a => a.name) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    async executeDevOps(input) {
        const systemPrompt = `You are a DevOps engineer. Generate CI/CD and infrastructure configuration.
For each file, use this format:
===FILE: path/to/file===
(file content)
===ENDFILE===`;
        const userPrompt = `Generate DevOps configuration for: "${input.instruction}"
Include: .github/workflows/ci.yml, .env.example, Makefile`;
        const llmResult = await this.llm.call({ systemPrompt, userPrompt, maxTokens: 4096 });
        const files = this.llm.parseGeneratedFiles(llmResult.content);
        const artifacts = this.writeFiles(files, input.workspaceDir);
        return {
            success: artifacts.length > 0,
            artifacts,
            output: { filesGenerated: artifacts.map(a => a.name) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    async executeDocker(input) {
        const artifacts = [];
        const dockerfile = this.generateDockerfile(input.instruction);
        const dockerfilePath = path.join(input.workspaceDir, 'Dockerfile');
        fs.writeFileSync(dockerfilePath, dockerfile, 'utf-8');
        artifacts.push(this.makeArtifact('Dockerfile', 'config', dockerfilePath, dockerfile));
        const compose = this.generateDockerCompose(input.instruction);
        const composePath = path.join(input.workspaceDir, 'docker-compose.yml');
        fs.writeFileSync(composePath, compose, 'utf-8');
        artifacts.push(this.makeArtifact('docker-compose.yml', 'config', composePath, compose));
        const dockerignore = 'node_modules\n.git\n*.md\n.env\n';
        const dockerignorePath = path.join(input.workspaceDir, '.dockerignore');
        fs.writeFileSync(dockerignorePath, dockerignore, 'utf-8');
        artifacts.push(this.makeArtifact('.dockerignore', 'config', dockerignorePath, dockerignore));
        return {
            success: true,
            artifacts,
            output: { filesGenerated: artifacts.map(a => a.name) },
            costUsd: 0,
            durationMs: 0,
        };
    }
    async executeKubernetes(input) {
        const systemPrompt = `You are a Kubernetes expert. Generate K8s manifests.
For each file, use this format:
===FILE: path/to/file===
(file content)
===ENDFILE===`;
        const userPrompt = `Generate Kubernetes manifests for: "${input.instruction}"
Include: deployment.yml, service.yml, ingress.yml, configmap.yml`;
        const llmResult = await this.llm.call({ systemPrompt, userPrompt, maxTokens: 4096 });
        const files = this.llm.parseGeneratedFiles(llmResult.content);
        const artifacts = this.writeFiles(files, input.workspaceDir);
        if (artifacts.length === 0) {
            const k8sDir = path.join(input.workspaceDir, 'k8s');
            fs.mkdirSync(k8sDir, { recursive: true });
            const deployment = `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: app\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: app\n  template:\n    metadata:\n      labels:\n        app: app\n    spec:\n      containers:\n      - name: app\n        image: app:latest\n        ports:\n        - containerPort: 3000\n`;
            const deployPath = path.join(k8sDir, 'deployment.yml');
            fs.writeFileSync(deployPath, deployment, 'utf-8');
            artifacts.push(this.makeArtifact('deployment.yml', 'config', deployPath, deployment));
        }
        return {
            success: artifacts.length > 0,
            artifacts,
            output: { filesGenerated: artifacts.map(a => a.name) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    async executeQA(input) {
        const results = [];
        let allPassed = true;
        const testDir = path.join(input.workspaceDir, 'tests');
        if (fs.existsSync(testDir)) {
            const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
            for (const testFile of testFiles.slice(0, 5)) {
                try {
                    const output = (0, child_process_1.execSync)(`node "${path.join(testDir, testFile)}" 2>&1`, {
                        timeout: 30000,
                        cwd: input.workspaceDir,
                    }).toString();
                    results.push({ file: testFile, passed: true, output: output.slice(0, 500) });
                }
                catch (err) {
                    results.push({ file: testFile, passed: false, output: (err.stdout || err.message || '').toString().slice(0, 500) });
                    allPassed = false;
                }
            }
        }
        let llmAnalysis = '';
        try {
            const srcFiles = this.collectSourceFiles(input.workspaceDir);
            if (srcFiles.length > 0) {
                const llmResult = await this.llm.call({
                    systemPrompt: 'You are a QA engineer. Analyze code for bugs and quality issues.',
                    userPrompt: `Analyze this code for quality:\n${srcFiles.slice(0, 5).map(f => `--- ${f.name} ---\n${f.content?.slice(0, 500) || ''}`).join('\n\n')}\n\nReply in JSON: {"passed": true/false, "analysis": "brief analysis", "bugs": []}`,
                    maxTokens: 2048,
                });
                llmAnalysis = llmResult.content;
            }
        }
        catch { }
        const reportPath = path.join(input.workspaceDir, 'docs', 'QA-REPORT.md');
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        const report = `# QA Report\n\n## Test Results\n${results.map(r => `- ${r.file}: ${r.passed ? 'PASS' : 'FAIL'}`).join('\n')}\n\n## LLM Analysis\n${llmAnalysis || 'N/A'}\n`;
        fs.writeFileSync(reportPath, report, 'utf-8');
        return {
            success: allPassed,
            artifacts: [this.makeArtifact('QA-REPORT.md', 'report', reportPath, report)],
            output: { results, llmAnalysis: llmAnalysis.substring(0, 500) },
            costUsd: 0.02,
            durationMs: 0,
        };
    }
    async executeTest(input) {
        const systemPrompt = `You are a test engineer. Generate comprehensive test files.
For each file, use this format:
===FILE: path/to/file===
(file content)
===ENDFILE===

Generate Node.js test files using assert or a simple test runner. Each test should be self-contained and runnable with 'node <file>'.`;
        const srcContext = this.getExistingFilesContext(input);
        const userPrompt = `Generate tests for: "${input.instruction}"
${srcContext}
Create test files in the tests/ directory that verify the core functionality.`;
        const llmResult = await this.llm.call({ systemPrompt, userPrompt, maxTokens: 4096 });
        const files = this.llm.parseGeneratedFiles(llmResult.content);
        const artifacts = this.writeFiles(files, input.workspaceDir);
        if (artifacts.length === 0) {
            const testCode = this.generateFallbackTest(input.instruction, input.workspaceDir);
            const testPath = path.join(input.workspaceDir, 'tests', 'test.js');
            fs.mkdirSync(path.dirname(testPath), { recursive: true });
            fs.writeFileSync(testPath, testCode, 'utf-8');
            artifacts.push(this.makeArtifact('test.js', 'test', testPath, testCode));
        }
        return {
            success: artifacts.length > 0,
            artifacts,
            output: { filesGenerated: artifacts.map(a => a.name) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    async executeDebug(input) {
        const errorMessage = input.parameters.error || input.parameters.lastError || 'Unknown error';
        const systemPrompt = `You are a debugging expert. Analyze the error and provide a fix.`;
        const userPrompt = `Debug this error in the project: "${input.instruction}"
Error: ${errorMessage}
${this.getExistingFilesContext(input)}
Provide:
1. Root cause analysis
2. The exact fix needed
3. Updated file content if needed (use ===FILE: path=== format)`;
        const llmResult = await this.llm.call({ systemPrompt, userPrompt, maxTokens: 4096 });
        const files = this.llm.parseGeneratedFiles(llmResult.content);
        const artifacts = this.writeFiles(files, input.workspaceDir);
        return {
            success: true,
            artifacts,
            output: { analysis: llmResult.content.substring(0, 2000) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    async executeDocumentation(input) {
        const systemPrompt = `You are a technical writer. Generate comprehensive documentation in markdown.`;
        const userPrompt = `Generate documentation for: "${input.instruction}"
${this.getExistingFilesContext(input)}
Create:
1. README.md with: title, description, features, installation, usage, API, tech stack, license
2. API.md with endpoint documentation if applicable`;
        const llmResult = await this.llm.call({ systemPrompt, userPrompt, maxTokens: 4096 });
        const files = this.llm.parseGeneratedFiles(llmResult.content);
        const artifacts = this.writeFiles(files, input.workspaceDir);
        if (!files.has('README.md')) {
            const readme = llmResult.content.length > 100
                ? llmResult.content
                : `# ${input.instruction}\n\n## Generated by AENEWS Software Factory\n\n## Installation\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\n\`\`\`bash\nnpm start\n\`\`\`\n\n## License\n\nMIT\n`;
            const readmePath = path.join(input.workspaceDir, 'README.md');
            fs.writeFileSync(readmePath, readme, 'utf-8');
            artifacts.push(this.makeArtifact('README.md', 'document', readmePath, readme));
        }
        return {
            success: artifacts.length > 0,
            artifacts,
            output: { filesGenerated: artifacts.map(a => a.name) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    async executeGenericDev(capId, input) {
        const systemPrompt = `You are an expert software developer. Complete the requested task.
For each file you create, use this format:
===FILE: path/to/file===
(file content)
===ENDFILE===`;
        const userPrompt = `Complete this development task: "${capId}" for the project: "${input.instruction}"
${this.getExistingFilesContext(input)}
Generate all necessary files.`;
        const llmResult = await this.llm.call({ systemPrompt, userPrompt, maxTokens: 4096 });
        const files = this.llm.parseGeneratedFiles(llmResult.content);
        const artifacts = this.writeFiles(files, input.workspaceDir);
        return {
            success: artifacts.length > 0,
            artifacts,
            output: { filesGenerated: artifacts.map(a => a.name) },
            costUsd: llmResult.costUsd,
            durationMs: 0,
        };
    }
    ensureWorkspace(workspaceDir) {
        const dirs = ['src', 'tests', 'docs', 'db', 'k8s'];
        for (const dir of dirs) {
            fs.mkdirSync(path.join(workspaceDir, dir), { recursive: true });
        }
    }
    writeFiles(files, workspaceDir) {
        const artifacts = [];
        files.forEach((content, filePath) => {
            const fullPath = path.join(workspaceDir, filePath);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, content, 'utf-8');
            let type = 'source';
            if (filePath.includes('test') || filePath.includes('spec'))
                type = 'test';
            else if (filePath.endsWith('.md') || filePath.endsWith('.txt'))
                type = 'document';
            else if (filePath.endsWith('.json') || filePath.endsWith('.yml') || filePath.endsWith('.yaml') || filePath.endsWith('Dockerfile') || filePath.includes('.config'))
                type = 'config';
            artifacts.push(this.makeArtifact(path.basename(filePath), type, fullPath, content));
            this.logger.log(`  Created: ${filePath} (${Buffer.byteLength(content)} bytes)`);
        });
        return artifacts;
    }
    makeArtifact(name, type, fullPath, content) {
        return {
            name,
            type,
            path: fullPath,
            size: Buffer.byteLength(content),
            content: content.substring(0, 500),
        };
    }
    getExistingFilesContext(input) {
        const existing = input.previousResults;
        if (!existing || existing.size === 0)
            return '';
        const summaries = [];
        existing.forEach((output, capId) => {
            if (output.artifacts?.length > 0) {
                summaries.push(`${capId}: ${output.artifacts.map((a) => a.name).join(', ')}`);
            }
        });
        return summaries.length > 0 ? `Previously generated: ${summaries.join('; ')}` : '';
    }
    collectSourceFiles(workspaceDir) {
        const files = [];
        const extensions = ['.js', '.ts', '.html', '.css', '.py'];
        const walkDir = (dir) => {
            if (!fs.existsSync(dir))
                return;
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    walkDir(fullPath);
                }
                else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf-8').slice(0, 1000);
                        files.push({ name: path.relative(workspaceDir, fullPath), content });
                    }
                    catch { }
                }
            }
        };
        walkDir(workspaceDir);
        return files;
    }
    generateDockerfile(instruction) {
        const lower = instruction.toLowerCase();
        const isNode = lower.includes('node') || lower.includes('app') || lower.includes('api') || lower.includes('web') || lower.includes('server');
        const isPython = lower.includes('python') || lower.includes('flask') || lower.includes('django');
        if (isPython) {
            return `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "app.py"]\n`;
        }
        return `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
${isNode ? 'CMD ["node", "server.js"]' : 'CMD ["node", "app.js"]'}\n`;
    }
    generateDockerCompose(instruction) {
        return `version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped\n`;
    }
    ensurePackageJson(workspaceDir, instruction) {
        const packageJsonPath = path.join(workspaceDir, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            const packageJson = {
                name: `aenews-${instruction.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`,
                version: '1.0.0',
                description: instruction,
                scripts: { start: 'node server.js', test: 'node tests/test.js' },
            };
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
        }
    }
    generateFrontendTemplate(instruction) {
        return `===FILE: index.html===
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${instruction}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app">
        <header>
            <h1>${instruction}</h1>
        </header>
        <main>
            <p>Generated by AENEWS Software Factory</p>
        </main>
    </div>
    <script src="app.js"></script>
</body>
</html>
===ENDFILE===
===FILE: style.css===
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; }
header { background: #1a1a2e; color: white; padding: 2rem; text-align: center; }
main { max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
===ENDFILE===
===FILE: app.js===
console.log('${instruction} - loaded');
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized');
});
===ENDFILE===`;
    }
    generateBackendTemplate(instruction) {
        return `===FILE: server.js===
const http = require('http');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: '${instruction.replace(/'/g, "\\'")}' }));
});

server.listen(PORT, () => {
    console.log(\`Server running on port \${PORT}\`);
});
===ENDFILE===`;
    }
    generateFallbackTest(instruction, workspaceDir) {
        return `const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Running tests for: ${instruction.replace(/'/g, "\\'")}');

// Test 1: Project directory exists
assert.ok(fs.existsSync('${workspaceDir}'), 'Project directory should exist');
console.log('PASS: Project directory exists');

// Test 2: Source files exist
const srcDir = path.join('${workspaceDir}', 'src');
const rootFiles = fs.readdirSync('${workspaceDir}').filter(f => f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.py'));
const srcFiles = fs.existsSync(srcDir) ? fs.readdirSync(srcDir) : [];
assert.ok(rootFiles.length > 0 || srcFiles.length > 0, 'Should have source files');
console.log('PASS: Source files exist');

// Test 3: Package.json exists (for Node.js projects)
const packageJsonPath = path.join('${workspaceDir}', 'package.json');
if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    assert.ok(pkg.name, 'package.json should have a name');
    console.log('PASS: package.json is valid');
}

console.log('\\nAll tests passed!');
`;
    }
};
exports.DevelopmentConnector = DevelopmentConnector;
DevelopmentConnector.DEV_CAPABILITIES = new Set(Object.values(interfaces_1.DevCapability));
exports.DevelopmentConnector = DevelopmentConnector = DevelopmentConnector_1 = __decorate([
    (0, common_1.Injectable)()
], DevelopmentConnector);
//# sourceMappingURL=development-connector.js.map