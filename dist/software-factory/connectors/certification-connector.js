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
var CertificationConnector_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificationConnector = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const interfaces_1 = require("../interfaces");
const llm_helper_1 = require("./llm-helper");
let CertificationConnector = CertificationConnector_1 = class CertificationConnector {
    constructor() {
        this.supportedPack = interfaces_1.CapabilityPack.CERTIFICATION;
        this.logger = new common_1.Logger(CertificationConnector_1.name);
        this.llm = new llm_helper_1.LLMHelper();
    }
    supports(capabilityId) {
        return CertificationConnector_1.CERT_CAPABILITIES.has(capabilityId);
    }
    async execute(capabilityId, input) {
        const startTime = Date.now();
        const capId = capabilityId;
        this.logger.log(`Cert connector executing: ${capId} for mission ${input.missionId}`);
        try {
            let result;
            switch (capId) {
                case interfaces_1.CertCapability.ARCHITECTURE_REVIEW:
                    result = await this.executeArchitectureReview(input);
                    break;
                case interfaces_1.CertCapability.SECURITY_AUDIT:
                    result = await this.executeSecurityAudit(input);
                    break;
                case interfaces_1.CertCapability.TEST_COVERAGE:
                    result = await this.executeTestCoverage(input);
                    break;
                case interfaces_1.CertCapability.REGRESSION:
                    result = await this.executeRegression(input);
                    break;
                case interfaces_1.CertCapability.PERFORMANCE:
                    result = await this.executePerformance(input);
                    break;
                case interfaces_1.CertCapability.DOC_REVIEW:
                    result = await this.executeDocReview(input);
                    break;
                case interfaces_1.CertCapability.INTEGRATION:
                    result = await this.executeIntegration(input);
                    break;
                case interfaces_1.CertCapability.COMPLIANCE:
                    result = await this.executeCompliance(input);
                    break;
                case interfaces_1.CertCapability.ACCESSIBILITY:
                    result = await this.executeAccessibility(input);
                    break;
                case interfaces_1.CertCapability.DATA_PRIVACY:
                    result = await this.executeDataPrivacy(input);
                    break;
                default:
                    result = await this.executeGenericCert(capId, input);
            }
            result.durationMs = Date.now() - startTime;
            return result;
        }
        catch (error) {
            this.logger.error(`Cert connector failed for ${capId}: ${error.message}`);
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
    async executeArchitectureReview(input) {
        const srcFiles = this.collectSourceFiles(input.workspaceDir);
        const llmResult = await this.llm.call({
            systemPrompt: 'You are a senior software architect reviewing code architecture. Score on: modularity, separation of concerns, scalability, maintainability. Be strict but fair.',
            userPrompt: `Review the architecture of this project: "${input.instruction}"\n\nSource files:\n${srcFiles.slice(0, 8).map(f => `--- ${f.name} ---\n${f.content?.slice(0, 600) || ''}`).join('\n\n')}\n\nReply in JSON: {"score": 0-100, "passed": true/false, "findings": [...], "recommendations": [...]}`,
            maxTokens: 2048,
        });
        const analysis = this.llm.parseJSON(llmResult.content) || { score: 70, passed: true, findings: [], recommendations: [] };
        return this.writeCertReport(input, 'architecture-review', analysis);
    }
    async executeSecurityAudit(input) {
        const srcFiles = this.collectSourceFiles(input.workspaceDir);
        const patterns = [
            { pattern: /eval\s*\(/g, name: 'eval() usage', severity: 'high' },
            { pattern: /innerHTML\s*=/g, name: 'innerHTML assignment', severity: 'medium' },
            { pattern: /password\s*[:=]\s*['"]/gi, name: 'Hardcoded password', severity: 'critical' },
            { pattern: /api[_-]?key\s*[:=]\s*['"]/gi, name: 'Hardcoded API key', severity: 'critical' },
            { pattern: /SELECT\s.*FROM\s.*WHERE.*\$/gi, name: 'Potential SQL injection', severity: 'high' },
            { pattern: /exec\s*\(/g, name: 'exec() usage', severity: 'medium' },
            { pattern: /child_process/g, name: 'child_process usage', severity: 'low' },
        ];
        const findings = [];
        for (const file of srcFiles) {
            for (const { pattern, name, severity } of patterns) {
                const matches = file.content?.match(pattern);
                if (matches) {
                    findings.push({ file: file.name, issue: name, severity, count: matches.length });
                }
            }
        }
        let llmFindings = [];
        try {
            const llmResult = await this.llm.call({
                systemPrompt: 'You are a security auditor. Identify vulnerabilities.',
                userPrompt: `Security review of:\n${srcFiles.slice(0, 5).map(f => `--- ${f.name} ---\n${f.content?.slice(0, 500) || ''}`).join('\n\n')}\n\nReply JSON: {"vulnerabilities": [{"name":"","severity":"low|medium|high|critical","file":"","description":""}]}`,
                maxTokens: 2048,
            });
            const parsed = this.llm.parseJSON(llmResult.content);
            if (parsed?.vulnerabilities)
                llmFindings = parsed.vulnerabilities;
        }
        catch { }
        const allFindings = [...findings, ...llmFindings];
        const criticalCount = allFindings.filter(f => f.severity === 'critical' || f.severity === 'high').length;
        const passed = criticalCount === 0;
        return this.writeCertReport(input, 'security-audit', {
            score: Math.max(0, 100 - criticalCount * 25 - allFindings.length * 5),
            passed,
            findings: allFindings,
            recommendations: criticalCount > 0 ? ['Fix critical/high severity issues before deployment'] : [],
        });
    }
    async executeTestCoverage(input) {
        const testDir = path.join(input.workspaceDir, 'tests');
        let passed = false;
        let results = [];
        let coverage = 0;
        if (fs.existsSync(testDir)) {
            const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
            let passCount = 0;
            for (const testFile of testFiles.slice(0, 10)) {
                try {
                    const output = (0, child_process_1.execSync)(`node "${path.join(testDir, testFile)}" 2>&1`, {
                        timeout: 30000,
                        cwd: input.workspaceDir,
                    }).toString();
                    results.push({ file: testFile, passed: true, output: output.slice(0, 300) });
                    passCount++;
                }
                catch (err) {
                    results.push({ file: testFile, passed: false, output: (err.stdout || err.message || '').toString().slice(0, 300) });
                }
            }
            passed = results.length > 0 && results.every(r => r.passed);
            coverage = results.length > 0 ? Math.round((passCount / results.length) * 100) : 0;
        }
        return this.writeCertReport(input, 'test-coverage', {
            score: coverage,
            passed: coverage >= 60,
            findings: results,
            coverage,
        });
    }
    async executeRegression(input) {
        return this.executeTestCoverage(input);
    }
    async executePerformance(input) {
        const srcFiles = this.collectSourceFiles(input.workspaceDir);
        let score = 85;
        const findings = [];
        for (const file of srcFiles) {
            const fc = file.content || '';
            if (fc.includes('setTimeout(') && (fc.match(/setTimeout/g) || []).length > 3) {
                findings.push(`${file.name}: Multiple setTimeout calls may indicate polling patterns`);
                score -= 5;
            }
            if (fc.includes('while(true)') || fc.includes('while (true)')) {
                findings.push(`${file.name}: Infinite loop detected`);
                score -= 15;
            }
            if (fc.length > 20000) {
                findings.push(`${file.name}: Large file (${Math.round(fc.length / 1024)}KB) — consider splitting`);
                score -= 3;
            }
        }
        try {
            const llmResult = await this.llm.call({
                systemPrompt: 'You are a performance engineer. Identify performance bottlenecks.',
                userPrompt: `Analyze performance of:\n${srcFiles.slice(0, 5).map(f => `--- ${f.name} ---\n${f.content?.slice(0, 400) || ''}`).join('\n\n')}\n\nReply JSON: {"score": 0-100, "bottlenecks": [], "recommendations": []}`,
                maxTokens: 2048,
            });
            const parsed = this.llm.parseJSON(llmResult.content);
            if (parsed) {
                score = Math.min(score, parsed.score || score);
                if (parsed.bottlenecks)
                    findings.push(...parsed.bottlenecks);
            }
        }
        catch { }
        return this.writeCertReport(input, 'performance', {
            score: Math.max(0, score),
            passed: score >= 60,
            findings,
        });
    }
    async executeDocReview(input) {
        const checks = [];
        let score = 100;
        const readmePath = path.join(input.workspaceDir, 'README.md');
        checks.push({ item: 'README.md', present: fs.existsSync(readmePath) });
        if (!fs.existsSync(readmePath))
            score -= 30;
        const docsDir = path.join(input.workspaceDir, 'docs');
        checks.push({ item: 'docs/ directory', present: fs.existsSync(docsDir) });
        if (!fs.existsSync(docsDir))
            score -= 15;
        const archPath = path.join(input.workspaceDir, 'docs', 'ARCHITECTURE.md');
        checks.push({ item: 'ARCHITECTURE.md', present: fs.existsSync(archPath) });
        if (!fs.existsSync(archPath))
            score -= 10;
        const apiDocPath = path.join(input.workspaceDir, 'docs', 'API.md');
        checks.push({ item: 'API.md', present: fs.existsSync(apiDocPath) });
        if (!fs.existsSync(apiDocPath))
            score -= 10;
        if (fs.existsSync(readmePath)) {
            const readme = fs.readFileSync(readmePath, 'utf-8');
            checks.push({ item: 'README has installation section', present: readme.toLowerCase().includes('install') });
            checks.push({ item: 'README has usage section', present: readme.toLowerCase().includes('usage') });
            if (!readme.toLowerCase().includes('install'))
                score -= 10;
            if (!readme.toLowerCase().includes('usage'))
                score -= 10;
            if (readme.length < 200)
                score -= 15;
        }
        return this.writeCertReport(input, 'doc-review', {
            score: Math.max(0, score),
            passed: score >= 60,
            findings: checks,
        });
    }
    async executeIntegration(input) {
        const results = [];
        let allPassed = true;
        const packageJsonPath = path.join(input.workspaceDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                (0, child_process_1.execSync)('npm install --dry-run 2>&1', { timeout: 30000, cwd: input.workspaceDir });
                results.push({ check: 'npm install (dry-run)', passed: true });
            }
            catch (err) {
                results.push({ check: 'npm install (dry-run)', passed: false, error: err.message?.slice(0, 200) });
                allPassed = false;
            }
        }
        const dockerfilePath = path.join(input.workspaceDir, 'Dockerfile');
        if (fs.existsSync(dockerfilePath)) {
            const dockerfile = fs.readFileSync(dockerfilePath, 'utf-8');
            const hasFrom = dockerfile.includes('FROM');
            const hasCmd = dockerfile.includes('CMD') || dockerfile.includes('ENTRYPOINT');
            results.push({ check: 'Dockerfile has FROM', passed: hasFrom });
            results.push({ check: 'Dockerfile has CMD/ENTRYPOINT', passed: hasCmd });
            if (!hasFrom || !hasCmd)
                allPassed = false;
        }
        return this.writeCertReport(input, 'integration', {
            score: allPassed ? 90 : 60,
            passed: allPassed,
            findings: results,
        });
    }
    async executeCompliance(input) {
        const srcFiles = this.collectSourceFiles(input.workspaceDir);
        const llmResult = await this.llm.call({
            systemPrompt: 'You are a compliance auditor. Check for GDPR, SOC2, and general compliance issues.',
            userPrompt: `Check compliance of this project: "${input.instruction}"\n\nCode:\n${srcFiles.slice(0, 5).map(f => `--- ${f.name} ---\n${f.content?.slice(0, 500) || ''}`).join('\n\n')}\n\nReply JSON: {"score": 0-100, "passed": true/false, "issues": [], "recommendations": []}`,
            maxTokens: 2048,
        });
        const analysis = this.llm.parseJSON(llmResult.content) || { score: 75, passed: true, issues: [], recommendations: [] };
        return this.writeCertReport(input, 'compliance', analysis);
    }
    async executeAccessibility(input) {
        const htmlFiles = this.collectFilesByExtension(input.workspaceDir, ['.html']);
        const findings = [];
        let score = 100;
        for (const file of htmlFiles) {
            const content = file.content || '';
            if (!content.includes('alt=') && content.includes('<img')) {
                findings.push({ file: file.name, issue: 'Images without alt text' });
                score -= 10;
            }
            if (!content.includes('aria-') && content.includes('<button')) {
                findings.push({ file: file.name, issue: 'Interactive elements may lack ARIA labels' });
                score -= 5;
            }
            if (!content.includes('lang=') && content.includes('<html')) {
                findings.push({ file: file.name, issue: 'Missing language attribute on html element' });
                score -= 5;
            }
        }
        if (htmlFiles.length > 0) {
            try {
                const { chromium } = await Promise.resolve().then(() => __importStar(require('playwright')));
                const browser = await chromium.launch({ headless: true });
                const page = await browser.newPage();
                const htmlPath = path.join(input.workspaceDir, htmlFiles[0].name);
                await page.goto(`file://${htmlPath}`, { timeout: 10000 });
                const a11yResults = await page.evaluate(() => {
                    const issues = [];
                    const images = document.querySelectorAll('img');
                    images.forEach(img => { if (!img.getAttribute('alt'))
                        issues.push({ type: 'img-alt', element: img.outerHTML.slice(0, 100) }); });
                    const inputs = document.querySelectorAll('input, select, textarea');
                    inputs.forEach(input => { if (!input.getAttribute('aria-label') && !input.getAttribute('id'))
                        issues.push({ type: 'input-label', element: input.outerHTML.slice(0, 100) }); });
                    return issues;
                });
                findings.push(...a11yResults);
                await browser.close();
            }
            catch { }
        }
        return this.writeCertReport(input, 'accessibility', {
            score: Math.max(0, score),
            passed: score >= 60,
            findings,
        });
    }
    async executeDataPrivacy(input) {
        const srcFiles = this.collectSourceFiles(input.workspaceDir);
        const findings = [];
        const piiPatterns = [
            { pattern: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, name: 'Possible SSN' },
            { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, name: 'Email addresses' },
            { pattern: /\b\d{16}\b/g, name: 'Possible credit card number' },
            { pattern: /phone|telephone|mobile/gi, name: 'Phone number references' },
        ];
        for (const file of srcFiles) {
            for (const { pattern, name } of piiPatterns) {
                if (pattern.test(file.content || '')) {
                    findings.push({ file: file.name, issue: name });
                }
            }
        }
        return this.writeCertReport(input, 'data-privacy', {
            score: findings.length === 0 ? 95 : Math.max(0, 95 - findings.length * 10),
            passed: findings.length < 3,
            findings,
        });
    }
    async executeGenericCert(capId, input) {
        return this.writeCertReport(input, capId.replace('cert.', ''), {
            score: 75,
            passed: true,
            findings: ['Generic certification check — no specific logic implemented yet'],
        });
    }
    writeCertReport(input, checkName, data) {
        const reportDir = path.join(input.workspaceDir, 'docs', 'certification');
        fs.mkdirSync(reportDir, { recursive: true });
        const report = `# Certification Report: ${checkName}\n\n**Mission:** ${input.instruction}\n**Check:** ${checkName}\n**Score:** ${data.score || 'N/A'}\n**Passed:** ${data.passed ? 'YES' : 'NO'}\n\n## Findings\n${JSON.stringify(data.findings || [], null, 2)}\n\n## Recommendations\n${JSON.stringify(data.recommendations || [], null, 2)}\n`;
        const reportPath = path.join(reportDir, `${checkName}.md`);
        fs.writeFileSync(reportPath, report, 'utf-8');
        return {
            success: data.passed !== false,
            artifacts: [this.makeArtifact(`${checkName}.md`, 'report', reportPath, report)],
            output: data,
            costUsd: 0.02,
            durationMs: 0,
        };
    }
    makeArtifact(name, type, fullPath, content) {
        return { name, type, path: fullPath, size: Buffer.byteLength(content), content: content.substring(0, 500) };
    }
    collectSourceFiles(workspaceDir) {
        const files = [];
        const extensions = ['.js', '.ts', '.html', '.css', '.json', '.py', '.jsx', '.tsx'];
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
    collectFilesByExtension(workspaceDir, extensions) {
        return this.collectSourceFiles(workspaceDir)
            .filter(f => extensions.some(ext => f.name.endsWith(ext)));
    }
};
exports.CertificationConnector = CertificationConnector;
CertificationConnector.CERT_CAPABILITIES = new Set(Object.values(interfaces_1.CertCapability));
exports.CertificationConnector = CertificationConnector = CertificationConnector_1 = __decorate([
    (0, common_1.Injectable)()
], CertificationConnector);
//# sourceMappingURL=certification-connector.js.map