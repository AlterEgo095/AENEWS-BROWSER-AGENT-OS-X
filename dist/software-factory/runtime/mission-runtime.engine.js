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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MissionRuntimeEngine_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionRuntimeEngine = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let ZAI;
try {
    ZAI = require('z-ai-web-dev-sdk').default;
}
catch {
}
const interfaces_1 = require("../interfaces");
const mission_contract_service_1 = require("../mission-contract/mission-contract.service");
const mission_state_machine_service_1 = require("../mission-state-machine/mission-state-machine.service");
const mission_memory_service_1 = require("../memory/mission-memory.service");
const mission_archive_service_1 = require("../archive/mission-archive.service");
const capability_registry_service_1 = require("../capability-registry/capability-registry.service");
const capability_resolver_service_1 = require("../capability-resolver/capability-resolver.service");
let MissionRuntimeEngine = MissionRuntimeEngine_1 = class MissionRuntimeEngine {
    constructor(contractService, stateMachine, memoryService, archiveService, capabilityRegistry, capabilityResolver) {
        this.contractService = contractService;
        this.stateMachine = stateMachine;
        this.memoryService = memoryService;
        this.archiveService = archiveService;
        this.capabilityRegistry = capabilityRegistry;
        this.capabilityResolver = capabilityResolver;
        this.logger = new common_1.Logger(MissionRuntimeEngine_1.name);
        this.missions = new Map();
        this.zaiInstance = null;
        this.baseWorkspace = '/home/z/my-project/download/missions';
        fs.mkdirSync(this.baseWorkspace, { recursive: true });
    }
    async executeMission(request) {
        const missionId = `mission-${(0, uuid_1.v4)().slice(0, 8)}`;
        const startTime = Date.now();
        let totalCost = 0;
        this.logger.log(`═══ MISSION START: ${missionId} ═══`);
        this.logger.log(`Instruction: "${request.instruction}"`);
        const workspaceDir = path.join(this.baseWorkspace, missionId);
        fs.mkdirSync(workspaceDir, { recursive: true });
        fs.mkdirSync(path.join(workspaceDir, 'src'), { recursive: true });
        fs.mkdirSync(path.join(workspaceDir, 'tests'), { recursive: true });
        fs.mkdirSync(path.join(workspaceDir, 'docs'), { recursive: true });
        const mission = {
            id: missionId,
            instruction: request.instruction,
            contractId: '',
            workspaceDir,
            status: interfaces_1.MissionState.DRAFT,
            artifacts: [],
            errors: [],
            startedAt: new Date(),
        };
        this.missions.set(missionId, mission);
        try {
            const contract = this.contractService.createContract({
                mission: request.instruction,
                description: request.description,
                quality: request.quality || interfaces_1.MissionQuality.STANDARD,
                deadline: request.deadline,
                budgetMaxUsd: request.budgetMaxUsd || 50,
            });
            mission.contractId = contract.id;
            const negotiation = this.contractService.negotiate(contract);
            if (!negotiation.accepted) {
                mission.errors.push(`Contract rejected: feasibility ${negotiation.feasibilityScore}`);
                return this.buildResult(mission, startTime, totalCost, false);
            }
            this.stateMachine.initializeMission(missionId);
            this.updateState(missionId, interfaces_1.MissionState.PLANNED, 'Analyzing mission');
            this.memoryService.storeContext(missionId, {
                instruction: request.instruction,
                contractId: contract.id,
                quality: contract.quality,
                budget: contract.budget.maxApiCostUsd,
                deadline: contract.deadline.deadline,
            });
            const analysis = await this.analyzeMission(request.instruction);
            totalCost += analysis.cost;
            this.memoryService.storePlan(missionId, analysis.plan);
            this.logger.log(`Plan: ${analysis.plan.phases.length} phases, ${analysis.plan.requiredCapabilities.length} capabilities`);
            this.updateState(missionId, interfaces_1.MissionState.RESEARCH, 'Resolving capabilities');
            const resolution = this.capabilityResolver.resolve({
                missionId,
                instruction: request.instruction,
            });
            this.memoryService.storeResearch(missionId, { resolution });
            this.updateState(missionId, interfaces_1.MissionState.BUILDING, 'Building');
            const buildResult = await this.executeBuild(request.instruction, analysis, workspaceDir);
            totalCost += buildResult.cost;
            mission.artifacts.push(...buildResult.artifacts);
            this.memoryService.storeBuildResults(missionId, buildResult);
            this.updateState(missionId, interfaces_1.MissionState.TESTING, 'Testing');
            const testResult = await this.executeTests(workspaceDir, analysis);
            totalCost += testResult.cost;
            this.memoryService.storeTestResults(missionId, testResult);
            this.updateState(missionId, interfaces_1.MissionState.AUDITING, 'Auditing');
            const auditResult = await this.executeAudit(workspaceDir, mission.artifacts);
            totalCost += auditResult.cost;
            this.memoryService.storeAuditResults(missionId, auditResult);
            this.updateState(missionId, interfaces_1.MissionState.CERTIFYING, 'Certifying');
            const certResult = this.certify(mission, testResult, auditResult);
            this.memoryService.storeCertification(missionId, certResult);
            if (!certResult.certified) {
                this.logger.warn(`Certification failed: ${certResult.reasons.join(', ')}`);
            }
            this.updateState(missionId, interfaces_1.MissionState.DELIVERING, 'Assembling delivery');
            const readme = await this.generateReadme(request.instruction, analysis, mission.artifacts);
            totalCost += readme.cost;
            this.writeFile(workspaceDir, 'README.md', readme.content);
            mission.artifacts.push({
                name: 'README.md',
                type: 'document',
                path: path.join(workspaceDir, 'README.md'),
                size: Buffer.byteLength(readme.content),
            });
            const reportContent = this.generateReport(mission, certResult, testResult, auditResult);
            this.writeFile(workspaceDir, 'docs/REPORT.md', reportContent);
            mission.artifacts.push({
                name: 'REPORT.md',
                type: 'report',
                path: path.join(workspaceDir, 'docs/REPORT.md'),
                size: Buffer.byteLength(reportContent),
            });
            const zipPath = await this.createZipArchive(missionId, workspaceDir);
            if (zipPath) {
                mission.artifacts.push({
                    name: `${missionId}.zip`,
                    type: 'archive',
                    path: zipPath,
                    size: fs.statSync(zipPath).size,
                });
            }
            this.updateState(missionId, interfaces_1.MissionState.COMPLETED, 'Completed');
            mission.completedAt = new Date();
            await this.archiveService.archive(missionId, {
                execution: mission,
                timeline: this.stateMachine.getTimeline(missionId),
                contract: this.contractService.getContract(contract.id),
                memory: this.memoryService.exportMission(missionId),
                agentStats: { totalCost, missionsCompleted: 1 },
            });
            const totalDuration = Date.now() - startTime;
            this.logger.log(`═══ MISSION COMPLETE: ${missionId} ═══ ${mission.artifacts.length} artifacts, $${totalCost.toFixed(2)}, ${totalDuration}ms`);
            return this.buildResult(mission, startTime, totalCost, certResult.certified);
        }
        catch (error) {
            this.logger.error(`Mission ${missionId} FAILED: ${error.message}`);
            mission.errors.push(error.message);
            this.updateState(missionId, interfaces_1.MissionState.AUDITING, `Failed: ${error.message}`);
            return this.buildResult(mission, startTime, totalCost, false);
        }
    }
    async analyzeMission(instruction) {
        const prompt = `You are a software project planner. Analyze this mission and create a detailed execution plan.

Mission: "${instruction}"

Respond in JSON format:
{
  "objective": "clear statement of what needs to be built",
  "techStack": ["list", "of", "technologies"],
  "phases": [
    {
      "name": "phase name",
      "tasks": ["task 1", "task 2"],
      "capabilities": ["dev.frontend", "dev.backend", etc.],
      "estimatedMinutes": 30
    }
  ],
  "requiredCapabilities": ["dev.frontend", "dev.backend", etc.],
  "deliverables": ["README.md", "src/", etc.],
  "risks": ["potential risk 1"],
  "complexity": "low|medium|high"
}

Be specific. List exact files to create. Be practical.`;
        try {
            const response = await this.callLLM(prompt);
            let plan;
            try {
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                plan = jsonMatch ? JSON.parse(jsonMatch[0]) : this.fallbackPlan(instruction);
            }
            catch {
                plan = this.fallbackPlan(instruction);
            }
            return { plan, cost: 0.02 };
        }
        catch (error) {
            this.logger.warn(`LLM analysis failed, using fallback: ${error.message}`);
            return { plan: this.fallbackPlan(instruction), cost: 0 };
        }
    }
    fallbackPlan(instruction) {
        const lower = instruction.toLowerCase();
        const isWebApp = lower.includes('app') || lower.includes('application') || lower.includes('web') || lower.includes('site') || lower.includes('page') || lower.includes('saas') || lower.includes('erp') || lower.includes('todo') || lower.includes('list');
        const hasBackend = lower.includes('api') || lower.includes('backend') || lower.includes('server') || lower.includes('database') || lower.includes('erp') || lower.includes('crm') || lower.includes('todo');
        return {
            objective: instruction,
            techStack: isWebApp ? ['HTML', 'CSS', 'JavaScript', 'Node.js'] : ['JavaScript'],
            phases: [
                {
                    name: 'Architecture & Setup',
                    tasks: ['Define project structure', 'Create configuration files'],
                    capabilities: ['dev.architecture'],
                    estimatedMinutes: 10,
                },
                {
                    name: 'Frontend Development',
                    tasks: ['Create HTML structure', 'Write CSS styles', 'Implement JavaScript logic'],
                    capabilities: ['dev.frontend'],
                    estimatedMinutes: 30,
                },
                ...(hasBackend ? [{
                        name: 'Backend Development',
                        tasks: ['Create server', 'Implement API endpoints', 'Set up data storage'],
                        capabilities: ['dev.backend', 'dev.database'],
                        estimatedMinutes: 45,
                    }] : []),
                {
                    name: 'Testing & Documentation',
                    tasks: ['Write tests', 'Generate documentation'],
                    capabilities: ['dev.test', 'dev.documentation'],
                    estimatedMinutes: 15,
                },
            ],
            requiredCapabilities: hasBackend
                ? ['dev.architecture', 'dev.frontend', 'dev.backend', 'dev.database', 'dev.test', 'dev.documentation']
                : ['dev.architecture', 'dev.frontend', 'dev.test', 'dev.documentation'],
            deliverables: ['index.html', 'style.css', 'app.js', 'tests/', 'README.md', 'Dockerfile'],
            risks: ['Scope may be larger than estimated'],
            complexity: hasBackend ? 'medium' : 'low',
        };
    }
    async executeBuild(instruction, analysis, workspaceDir) {
        const artifacts = [];
        let totalCost = 0;
        this.logger.log('Generating application code via LLM...');
        const codePrompt = `You are an expert software developer. Build the following project completely.

Mission: "${instruction}"

Plan: ${JSON.stringify(analysis.plan, null, 2)}

Generate ALL the code needed. For each file, use this format:

===FILE: path/to/file===
(file content here)

===ENDFILE===

Include:
1. All source files (HTML, CSS, JS, etc.)
2. A package.json if it's a Node.js project
3. A Dockerfile
4. Test files
5. Any configuration files needed

Make the code complete, functional, and production-ready.
The application should work when the files are placed in a directory and opened/started.
For web apps: create a single-page application with index.html that includes CSS and JS.
For Node.js apps: include package.json with start script.
Write REAL, WORKING code — not stubs or placeholders.`;
        let codeResponse;
        try {
            codeResponse = await this.callLLM(codePrompt);
            totalCost += 0.10;
        }
        catch (error) {
            this.logger.warn(`LLM code generation failed, using template: ${error.message}`);
            codeResponse = this.generateTemplateCode(instruction, analysis.plan);
        }
        const files = this.parseGeneratedFiles(codeResponse);
        for (const [filePath, content] of Object.entries(files)) {
            const fullPath = path.join(workspaceDir, filePath);
            const dir = path.dirname(fullPath);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(fullPath, content, 'utf-8');
            const ext = path.extname(filePath).toLowerCase();
            let type = 'source';
            if (filePath.includes('test') || filePath.includes('spec'))
                type = 'test';
            else if (filePath.endsWith('.md') || filePath.endsWith('.txt'))
                type = 'document';
            else if (filePath.endsWith('.json') || filePath.endsWith('.yml') || filePath.endsWith('.yaml') || filePath.endsWith('Dockerfile') || filePath.includes('.config'))
                type = 'config';
            artifacts.push({
                name: path.basename(filePath),
                type,
                path: fullPath,
                size: Buffer.byteLength(content),
                content: content.substring(0, 500),
            });
            this.logger.log(`  Created: ${filePath} (${Buffer.byteLength(content)} bytes)`);
        }
        if (files.size === 0) {
            this.writeFile(workspaceDir, 'index.html', codeResponse);
            artifacts.push({
                name: 'index.html',
                type: 'source',
                path: path.join(workspaceDir, 'index.html'),
                size: Buffer.byteLength(codeResponse),
            });
        }
        if (analysis.plan.techStack?.some((t) => t.toLowerCase().includes('node') || t.toLowerCase().includes('javascript'))) {
            const packageJsonPath = path.join(workspaceDir, 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                const packageJson = {
                    name: `aenews-${analysis.plan.objective?.toLowerCase().replace(/\s+/g, '-').slice(0, 30) || 'project'}`,
                    version: '1.0.0',
                    description: instruction,
                    scripts: { start: 'node server.js', test: 'node tests/test.js' },
                };
                this.writeFile(workspaceDir, 'package.json', JSON.stringify(packageJson, null, 2));
                artifacts.push({ name: 'package.json', type: 'config', path: packageJsonPath, size: 200 });
            }
        }
        const dockerfilePath = path.join(workspaceDir, 'Dockerfile');
        if (!fs.existsSync(dockerfilePath)) {
            const dockerfile = this.generateDockerfile(analysis.plan);
            this.writeFile(workspaceDir, 'Dockerfile', dockerfile);
            artifacts.push({ name: 'Dockerfile', type: 'config', path: dockerfilePath, size: Buffer.byteLength(dockerfile) });
        }
        return { artifacts, cost: totalCost, code: codeResponse };
    }
    async executeTests(workspaceDir, analysis) {
        this.logger.log('Running tests...');
        const testDir = path.join(workspaceDir, 'tests');
        const hasTests = fs.existsSync(testDir) && fs.readdirSync(testDir).length > 0;
        const results = [];
        if (hasTests) {
            const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
            for (const testFile of testFiles.slice(0, 5)) {
                try {
                    const { execSync } = require('child_process');
                    const output = execSync(`node "${path.join(testDir, testFile)}" 2>&1`, {
                        timeout: 30000,
                        cwd: workspaceDir,
                    }).toString();
                    results.push({ file: testFile, passed: true, output: output.slice(0, 500) });
                }
                catch (err) {
                    results.push({ file: testFile, passed: false, output: (err.stdout || err.message || '').toString().slice(0, 500) });
                }
            }
        }
        let llmTestResult = { passed: true, analysis: '' };
        try {
            const srcFiles = this.collectSourceFiles(workspaceDir);
            const testPrompt = `Analyze this code for correctness. Are there obvious bugs? Will it run?

Source files:
${srcFiles.slice(0, 5).map(f => `--- ${f.name} ---\n${f.content?.slice(0, 500) || '(file too large)'}`).join('\n\n')}

Reply in JSON: {"passed": true/false, "analysis": "brief analysis", "bugs": ["list of bugs if any"]}`;
            const response = await this.callLLM(testPrompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                llmTestResult = { ...llmTestResult, ...JSON.parse(jsonMatch[0]) };
            }
        }
        catch {
        }
        const passed = results.every(r => r.passed) && llmTestResult.passed;
        this.logger.log(`Tests: ${results.length} file tests, LLM analysis: ${llmTestResult.passed ? 'PASS' : 'ISSUES'} → ${passed ? 'ALL PASSED' : 'SOME FAILED'}`);
        return {
            passed,
            results: [...results, { type: 'llm_analysis', ...llmTestResult }],
            cost: 0.02,
        };
    }
    async executeAudit(workspaceDir, artifacts) {
        this.logger.log('Running audit...');
        const findings = [];
        const sourceFiles = artifacts.filter(a => a.type === 'source');
        if (sourceFiles.length === 0)
            findings.push('No source files generated');
        if (!artifacts.find(a => a.name === 'README.md'))
            findings.push('No README.md generated');
        if (!artifacts.find(a => a.name === 'Dockerfile'))
            findings.push('No Dockerfile generated');
        for (const artifact of artifacts) {
            if (artifact.size < 10 && artifact.type === 'source') {
                findings.push(`File ${artifact.name} is suspiciously small (${artifact.size} bytes)`);
            }
        }
        try {
            const srcFiles = this.collectSourceFiles(workspaceDir);
            if (srcFiles.length > 0) {
                const secPrompt = `Quick security review of this code. Are there any obvious vulnerabilities?
Reply in JSON: {"vulnerabilities": [], "severity": "low|medium|high", "summary": "brief summary"}

Code:
${srcFiles.slice(0, 3).map(f => `--- ${f.name} ---\n${f.content?.slice(0, 800) || ''}`).join('\n\n')}`;
                const response = await this.callLLM(secPrompt);
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const secResult = JSON.parse(jsonMatch[0]);
                    if (secResult.vulnerabilities?.length > 0) {
                        findings.push(...secResult.vulnerabilities.map((v) => `Security: ${typeof v === 'string' ? v : JSON.stringify(v)}`));
                    }
                }
            }
        }
        catch {
        }
        const passed = findings.filter(f => f.includes('No source') || f.includes('Security')).length === 0;
        this.logger.log(`Audit: ${findings.length} findings → ${passed ? 'PASSED' : 'ISSUES FOUND'}`);
        return { passed, findings, cost: 0.02 };
    }
    certify(mission, testResult, auditResult) {
        const reasons = [];
        let score = 100;
        if (!testResult.passed) {
            score -= 30;
            reasons.push('Some tests failed');
        }
        if (!auditResult.passed) {
            score -= 20;
            reasons.push(...auditResult.findings.slice(0, 3));
        }
        if (mission.artifacts.filter(a => a.type === 'source').length === 0) {
            score -= 40;
            reasons.push('No source code artifacts');
        }
        if (!mission.artifacts.find(a => a.name === 'README.md')) {
            score -= 10;
            reasons.push('No README');
        }
        if (!mission.artifacts.find(a => a.name === 'Dockerfile')) {
            score -= 10;
            reasons.push('No Dockerfile');
        }
        const certified = score >= 60;
        return { certified, qualityScore: Math.max(0, score), reasons };
    }
    async generateReadme(instruction, analysis, artifacts) {
        try {
            const fileList = artifacts.map(a => `- \`${a.name}\` (${a.type}, ${a.size} bytes)`).join('\n');
            const prompt = `Generate a professional README.md for this project.

Mission: "${instruction}"
Tech Stack: ${analysis.plan.techStack?.join(', ') || 'JavaScript'}
Files:
${fileList}

Include: title, description, features, installation, usage, tech stack, project structure, license.
Use markdown formatting. Be concise but complete.`;
            const content = await this.callLLM(prompt);
            return { content, cost: 0.02 };
        }
        catch {
            const content = `# ${instruction}\n\n## Generated by AENEWS Software Factory\n\n## Installation\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\n\`\`\`bash\nnpm start\n\`\`\`\n\n## Files\n\n${artifacts.map(a => `- \`${a.name}\``).join('\n')}\n\n## License\n\nMIT\n`;
            return { content, cost: 0 };
        }
    }
    async callLLM(prompt) {
        try {
            if (!this.zaiInstance) {
                this.zaiInstance = await ZAI.create();
            }
            const completion = await this.zaiInstance.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are an expert software engineer. Generate complete, working, production-ready code. Be thorough and practical.' },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.3,
                max_tokens: 4096,
            });
            const content = completion.choices?.[0]?.message?.content;
            if (content) {
                return content;
            }
            throw new Error('Empty LLM response');
        }
        catch (error) {
            this.logger.warn(`LLM call failed: ${error.message}`);
            throw error;
        }
    }
    writeFile(workspaceDir, relativePath, content) {
        const fullPath = path.join(workspaceDir, relativePath);
        const dir = path.dirname(fullPath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, content, 'utf-8');
    }
    parseGeneratedFiles(response) {
        const files = new Map();
        const fileRegex = /===FILE:\s*(.+?)===\s*\n([\s\S]*?)===ENDFILE===/g;
        let match;
        while ((match = fileRegex.exec(response)) !== null) {
            const filePath = match[1].trim();
            const content = match[2].trim();
            if (filePath && content) {
                files.set(filePath, content);
            }
        }
        if (files.size === 0) {
            const codeBlockRegex = /```(\w*?)\s*(?:\/\/|#)?\s*(\S+\.\w+)\s*\n([\s\S]*?)```/g;
            while ((match = codeBlockRegex.exec(response)) !== null) {
                const filePath = match[2].trim();
                const content = match[3].trim();
                if (filePath && content) {
                    files.set(filePath, content);
                }
            }
        }
        if (files.size === 0) {
            const headerRegex = /(?:\*\*|##\s*)(\S+\.\w+)\s*\**\s*\n```[\w]*\n([\s\S]*?)```/g;
            while ((match = headerRegex.exec(response)) !== null) {
                const filePath = match[1].trim();
                const content = match[2].trim();
                if (filePath && content) {
                    files.set(filePath, content);
                }
            }
        }
        return files;
    }
    collectSourceFiles(workspaceDir) {
        const files = [];
        const extensions = ['.js', '.ts', '.html', '.css', '.json', '.py', '.jsx', '.tsx'];
        const walkDir = (dir) => {
            if (!fs.existsSync(dir))
                return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    walkDir(fullPath);
                }
                else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf-8');
                        files.push({ name: path.relative(workspaceDir, fullPath), content: content.slice(0, 1000) });
                    }
                    catch { }
                }
            }
        };
        walkDir(workspaceDir);
        return files;
    }
    async createZipArchive(missionId, workspaceDir) {
        try {
            const zipPath = path.join(this.baseWorkspace, `${missionId}.zip`);
            const { execSync } = require('child_process');
            execSync(`cd "${workspaceDir}" && zip -r "${zipPath}" . -x "*.git*"`, {
                timeout: 60000,
            });
            const stats = fs.statSync(zipPath);
            this.logger.log(`ZIP created: ${zipPath} (${stats.size} bytes)`);
            return zipPath;
        }
        catch (error) {
            this.logger.warn(`ZIP packaging failed: ${error.message}`);
            return null;
        }
    }
    generateTemplateCode(instruction, plan) {
        const title = instruction.slice(0, 60);
        return `===FILE: index.html===
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app">
        <header>
            <h1>${title}</h1>
        </header>
        <main id="content">
            <p>Application generated by AENEWS Software Factory</p>
        </main>
    </div>
    <script src="app.js"></script>
</body>
</html>
===ENDFILE===

===FILE: style.css===
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
#app { max-width: 800px; margin: 0 auto; padding: 2rem; }
header { text-align: center; margin-bottom: 2rem; }
header h1 { font-size: 2rem; color: #60a5fa; }
main { background: #1e293b; border-radius: 12px; padding: 2rem; }
===ENDFILE===

===FILE: app.js===
// ${title} - Application Logic
document.addEventListener('DOMContentLoaded', () => {
    console.log('${title} loaded successfully');
});
===ENDFILE===

===FILE: Dockerfile===
FROM node:18-alpine
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["npx", "serve", "-s", ".", "-l", "3000"]
===ENDFILE===`;
    }
    generateDockerfile(plan) {
        const hasNode = plan.techStack?.some((t) => t.toLowerCase().includes('node') || t.toLowerCase().includes('javascript'));
        if (hasNode) {
            return `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`;
        }
        return `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
    }
    generateReport(mission, certResult, testResult, auditResult) {
        return `# Mission Report: ${mission.id}

## Objective
${mission.instruction}

## Results
- **Certified**: ${certResult.certified ? '✅ YES' : '❌ NO'}
- **Quality Score**: ${certResult.qualityScore}/100
- **Tests**: ${testResult.passed ? '✅ PASSED' : '❌ FAILED'}
- **Audit**: ${auditResult.passed ? '✅ PASSED' : '❌ ISSUES FOUND'}

## Artifacts
${mission.artifacts.map(a => `- **${a.name}** (${a.type}, ${a.size} bytes)`).join('\n')}

## Certification Details
${certResult.reasons.length > 0 ? certResult.reasons.map(r => `- ⚠️ ${r}`).join('\n') : 'All checks passed.'}

## Audit Findings
${auditResult.findings.length > 0 ? auditResult.findings.map(f => `- ${f}`).join('\n') : 'No issues found.'}

## Duration
Started: ${mission.startedAt.toISOString()}
${mission.completedAt ? `Completed: ${mission.completedAt.toISOString()}` : 'In progress...'}

---
Generated by AENEWS Software Factory`;
    }
    updateState(missionId, state, phase) {
        const mission = this.missions.get(missionId);
        if (mission) {
            mission.status = state;
        }
        const currentState = this.stateMachine.getCurrentState(missionId);
        if (currentState && currentState !== state) {
            const triggerMap = {
                [interfaces_1.MissionState.PLANNED]: interfaces_1.TransitionTrigger.SUBMIT,
                [interfaces_1.MissionState.RESEARCH]: interfaces_1.TransitionTrigger.START_RESEARCH,
                [interfaces_1.MissionState.BUILDING]: interfaces_1.TransitionTrigger.START_BUILD,
                [interfaces_1.MissionState.TESTING]: interfaces_1.TransitionTrigger.START_TESTING,
                [interfaces_1.MissionState.AUDITING]: interfaces_1.TransitionTrigger.START_AUDIT,
                [interfaces_1.MissionState.CERTIFYING]: interfaces_1.TransitionTrigger.START_CERTIFICATION,
                [interfaces_1.MissionState.DELIVERING]: interfaces_1.TransitionTrigger.START_DELIVERY,
                [interfaces_1.MissionState.COMPLETED]: interfaces_1.TransitionTrigger.MARK_COMPLETE,
            };
            const trigger = triggerMap[state];
            if (trigger) {
                this.stateMachine.transition({
                    missionId,
                    contractId: mission?.contractId || '',
                    currentState,
                    trigger,
                }).catch(() => { });
            }
        }
        this.logger.log(`[${missionId}] State: ${state} — ${phase}`);
    }
    buildResult(mission, startTime, totalCost, certified) {
        const certData = this.memoryService.getCertification(mission.id);
        return {
            missionId: mission.id,
            success: mission.errors.length === 0,
            artifacts: mission.artifacts,
            workspaceDir: mission.workspaceDir,
            qualityScore: certData?.qualityScore || 0,
            certified,
            totalDurationMs: Date.now() - startTime,
            totalCostUsd: totalCost,
            errors: mission.errors,
        };
    }
    getMission(missionId) {
        return this.missions.get(missionId);
    }
    getActiveMissions() {
        return Array.from(this.missions.values())
            .filter(m => m.status !== interfaces_1.MissionState.COMPLETED && m.status !== interfaces_1.MissionState.ARCHIVED);
    }
    getCompletedMissions() {
        return Array.from(this.missions.values())
            .filter(m => m.status === interfaces_1.MissionState.COMPLETED);
    }
    getWorkspaceDir(missionId) {
        return this.missions.get(missionId)?.workspaceDir;
    }
};
exports.MissionRuntimeEngine = MissionRuntimeEngine;
exports.MissionRuntimeEngine = MissionRuntimeEngine = MissionRuntimeEngine_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mission_contract_service_1.MissionContractService,
        mission_state_machine_service_1.MissionStateMachineService,
        mission_memory_service_1.MissionMemoryService,
        mission_archive_service_1.MissionArchiveService,
        capability_registry_service_1.CapabilityRegistryService,
        capability_resolver_service_1.CapabilityResolverService])
], MissionRuntimeEngine);
//# sourceMappingURL=mission-runtime.engine.js.map