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
var SecurityCertificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityCertificationService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("../types");
const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const AGENTS_DIR = path.join(SOURCE_ROOT, 'agents');
const SECURITY_DIR = path.join(SOURCE_ROOT, 'agents', 'security');
const CONFIG_DIR = path.join(SOURCE_ROOT, 'config');
let SecurityCertificationService = SecurityCertificationService_1 = class SecurityCertificationService {
    constructor() {
        this.logger = new common_1.Logger(SecurityCertificationService_1.name);
        this.serviceAnalyses = null;
    }
    async runAll() {
        const startTime = Date.now();
        this.logger.log('Starting Security certification...');
        const tests = [];
        const criticalFailures = [];
        const services = await this.analyzeServices();
        this.logger.log(`Analyzed ${services.length} security services`);
        const testMethods = [
            { name: 'No Exposed Secrets', fn: () => this.testNoExposedSecrets() },
            { name: 'No Injection Vulnerabilities', fn: () => this.testNoInjectionVulnerabilities() },
            { name: 'Dependency Vulnerabilities', fn: () => this.testDependencyVulnerabilities() },
            { name: 'Permission Model', fn: () => this.testPermissionModel(services) },
            { name: 'Plugin Isolation', fn: () => this.testPluginIsolation() },
            { name: 'RBAC Enforcement', fn: () => this.testRBACEnforcement(services) },
            { name: 'Audit Logging', fn: () => this.testAuditLogging(services) },
            { name: 'Encryption', fn: () => this.testEncryption(services) },
            { name: 'Token Management', fn: () => this.testTokenManagement(services) },
            { name: 'Zero Trust Compliance', fn: () => this.testZeroTrustCompliance(services) },
        ];
        for (const testDef of testMethods) {
            try {
                const result = await testDef.fn();
                tests.push(result);
                if (!result.passed && result.score < 50) {
                    criticalFailures.push(`${testDef.name}: Score ${result.score}/100`);
                }
            }
            catch (error) {
                const errMsg = error.message;
                this.logger.error(`Test "${testDef.name}" execution failed: ${errMsg}`);
                tests.push({
                    name: testDef.name,
                    passed: false,
                    score: 0,
                    durationMs: 0,
                    error: errMsg,
                });
                criticalFailures.push(`Test "${testDef.name}" execution error: ${errMsg}`);
            }
        }
        const testWeights = [0.15, 0.12, 0.08, 0.1, 0.08, 0.1, 0.1, 0.1, 0.08, 0.09];
        let weightedSum = 0;
        for (let i = 0; i < tests.length; i++) {
            const weight = testWeights[i] || 0.1;
            weightedSum += tests[i].score * weight;
        }
        const score = Math.round(weightedSum);
        const passed = score >= 90 && criticalFailures.length === 0;
        const durationMs = Date.now() - startTime;
        this.logger.log(`Security certification complete: score=${score}, passed=${passed}, ` +
            `duration=${durationMs}ms, criticalFailures=${criticalFailures.length}`);
        return {
            domain: types_1.CertificationDomain.SECURITY,
            weight: 0.15,
            score,
            tests,
            passed,
            criticalFailures,
        };
    }
    async testNoExposedSecrets() {
        const startTime = Date.now();
        const name = 'No Exposed Secrets';
        this.logger.log(`Running test: ${name}`);
        try {
            const findings = [];
            const secretPatterns = [
                {
                    pattern: /password\s*[:=]\s*['"][^'"]{4,}['"]/gi,
                    name: 'hardcoded-password',
                    severity: 'critical',
                },
                {
                    pattern: /api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/gi,
                    name: 'hardcoded-api-key',
                    severity: 'critical',
                },
                {
                    pattern: /secret[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/gi,
                    name: 'hardcoded-secret-key',
                    severity: 'critical',
                },
                {
                    pattern: /access[_-]?token\s*[:=]\s*['"][^'"]{8,}['"]/gi,
                    name: 'hardcoded-access-token',
                    severity: 'critical',
                },
                {
                    pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
                    name: 'bearer-token-in-code',
                    severity: 'critical',
                },
                {
                    pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
                    name: 'private-key-in-code',
                    severity: 'critical',
                },
                {
                    pattern: /mongodb(?:\+srv)?:\/\/[^'"\s]+:[^'"\s]+@/gi,
                    name: 'db-connection-string-with-password',
                    severity: 'warning',
                },
                {
                    pattern: /postgres(?:ql)?:\/\/[^'"\s]+:[^'"\s]+@/gi,
                    name: 'postgres-connection-with-password',
                    severity: 'warning',
                },
                {
                    pattern: /redis:\/\/:[^'"\s]+@/gi,
                    name: 'redis-connection-with-password',
                    severity: 'warning',
                },
                { pattern: /sk-[a-zA-Z0-9]{20,}/g, name: 'openai-api-key', severity: 'critical' },
                { pattern: /AKIA[0-9A-Z]{16}/g, name: 'aws-access-key', severity: 'critical' },
            ];
            const allowedPatterns = [
                'process.env',
                'configService.get',
                'ConfigService',
                'example.com',
                'placeholder',
                'changeme',
                'your-',
                'xxx',
                'localhost',
                'test',
                'dummy',
                'mock',
                'fake',
                'sample',
                'default',
            ];
            const allTsFiles = await this.getAllTsFiles(SOURCE_ROOT);
            const filesToSkip = ['node_modules', '.git', 'dist', 'certification'];
            for (const filePath of allTsFiles) {
                const relativePath = path.relative(SOURCE_ROOT, filePath);
                if (filesToSkip.some((skip) => relativePath.includes(skip))) {
                    continue;
                }
                if (filePath.endsWith('.d.ts'))
                    continue;
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const lines = content.split('\n');
                    for (const { pattern, name: patternName, severity } of secretPatterns) {
                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            if (allowedPatterns.some((allowed) => line.includes(allowed))) {
                                continue;
                            }
                            const trimmed = line.trim();
                            if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
                                continue;
                            }
                            if (pattern.test(line)) {
                                findings.push({
                                    filePath: relativePath,
                                    line: i + 1,
                                    pattern: patternName,
                                    severity,
                                });
                            }
                            pattern.lastIndex = 0;
                        }
                    }
                }
                catch {
                }
            }
            const criticalFindings = findings.filter((f) => f.severity === 'critical');
            const warningFindings = findings.filter((f) => f.severity === 'warning');
            const penalty = criticalFindings.length * 25 + warningFindings.length * 5;
            const score = Math.max(0, 100 - penalty);
            return {
                name,
                passed: score >= 90 && criticalFindings.length === 0,
                score,
                durationMs: Date.now() - startTime,
                details: {
                    totalFilesScanned: allTsFiles.length,
                    totalFindings: findings.length,
                    criticalFindings: criticalFindings.length,
                    warningFindings: warningFindings.length,
                    findings: findings.slice(0, 20).map((f) => ({
                        file: f.filePath,
                        line: f.line,
                        pattern: f.pattern,
                        severity: f.severity,
                    })),
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testNoInjectionVulnerabilities() {
        const startTime = Date.now();
        const name = 'No Injection Vulnerabilities';
        this.logger.log(`Running test: ${name}`);
        try {
            const issues = [];
            let score = 100;
            const allTsFiles = await this.getAllTsFiles(AGENTS_DIR);
            const filesToSkip = ['node_modules', '.git', 'dist'];
            let evalUsage = 0;
            let noValidationCount = 0;
            let sqlConcatCount = 0;
            for (const filePath of allTsFiles) {
                const relativePath = path.relative(SOURCE_ROOT, filePath);
                if (filesToSkip.some((skip) => relativePath.includes(skip)))
                    continue;
                if (filePath.endsWith('.d.ts'))
                    continue;
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const evalMatches = content.match(/\beval\s*\(/g);
                    if (evalMatches) {
                        evalUsage += evalMatches.length;
                        issues.push(`${relativePath}: Uses eval() (${evalMatches.length} occurrence(s))`);
                    }
                    const functionConstructorMatches = content.match(/new\s+Function\s*\(/g);
                    if (functionConstructorMatches) {
                        evalUsage += functionConstructorMatches.length;
                        issues.push(`${relativePath}: Uses new Function() constructor`);
                    }
                    const sqlConcatMatches = content.match(/query\s*\(\s*['"`].*\+\s*['"`]/g);
                    if (sqlConcatMatches) {
                        sqlConcatCount += sqlConcatMatches.length;
                        issues.push(`${relativePath}: Potential SQL injection via string concatenation`);
                    }
                    if (content.includes('onExecute') &&
                        !content.includes('validate') &&
                        !content.includes('Validation')) {
                        noValidationCount++;
                    }
                }
                catch {
                }
            }
            score -= evalUsage * 20;
            score -= sqlConcatCount * 10;
            score -= Math.min(noValidationCount * 2, 20);
            const finalScore = Math.max(0, score);
            return {
                name,
                passed: finalScore >= 90 && evalUsage === 0,
                score: finalScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalFilesScanned: allTsFiles.length,
                    evalUsage,
                    sqlConcatCount,
                    agentsWithoutValidation: noValidationCount,
                    issues: issues.slice(0, 20),
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testDependencyVulnerabilities() {
        const startTime = Date.now();
        const name = 'Dependency Vulnerabilities';
        this.logger.log(`Running test: ${name}`);
        try {
            const issues = [];
            let score = 100;
            const packageJsonPath = path.join(SOURCE_ROOT, '..', 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                const altPath = path.join(SOURCE_ROOT, 'package.json');
                if (!fs.existsSync(altPath)) {
                    return {
                        name,
                        passed: false,
                        score: 50,
                        durationMs: Date.now() - startTime,
                        error: 'package.json not found',
                    };
                }
            }
            const pkgPath = fs.existsSync(packageJsonPath)
                ? packageJsonPath
                : path.join(SOURCE_ROOT, 'package.json');
            const pkgContent = fs.readFileSync(pkgPath, 'utf-8');
            const pkg = JSON.parse(pkgContent);
            const allDeps = {
                ...pkg.dependencies,
                ...pkg.devDependencies,
            };
            const knownVulnerable = {
                lodash: '<4.17.21',
                express: '<4.17.3',
                'node-fetch': '<2.6.7',
                axios: '<0.21.1',
            };
            for (const [pkgName, vulnerableVersion] of Object.entries(knownVulnerable)) {
                if (allDeps[pkgName]) {
                    issues.push(`Potentially vulnerable: ${pkgName}@${allDeps[pkgName]} (known issues in ${vulnerableVersion})`);
                    score -= 10;
                }
            }
            const insecurePatterns = ['http-proxy-middleware@0.', 'event-stream'];
            for (const pattern of insecurePatterns) {
                const [pkgName, version] = pattern.split('@');
                if (allDeps[pkgName] && allDeps[pkgName].includes(version || '0')) {
                    issues.push(`Insecure package version: ${pattern}`);
                    score -= 15;
                }
            }
            const securityPackages = ['helmet', 'csurf', 'express-rate-limit', 'bcrypt', 'jsonwebtoken'];
            const presentSecurity = securityPackages.filter((p) => allDeps[p]);
            if (presentSecurity.length > 0) {
                score += 0;
            }
            return {
                name,
                passed: score >= 90,
                score: Math.max(0, Math.min(score, 100)),
                durationMs: Date.now() - startTime,
                details: {
                    totalDependencies: Object.keys(allDeps).length,
                    securityPackagesPresent: presentSecurity,
                    issues: issues.slice(0, 20),
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testPermissionModel(services) {
        const startTime = Date.now();
        const name = 'Permission Model';
        this.logger.log(`Running test: ${name}`);
        try {
            let totalScore = 0;
            const agentsWithoutPermissions = [];
            const agentsWithWildcard = [];
            const agentFiles = await this.getAllFilesRecursive(AGENTS_DIR, '-agent.service.ts');
            for (const filePath of agentFiles) {
                const content = fs.readFileSync(filePath, 'utf-8');
                const relativePath = path.relative(SOURCE_ROOT, filePath);
                let agentScore = 0;
                if (content.includes('permissions:')) {
                    agentScore += 40;
                    const permMatch = content.match(/permissions\s*:\s*\[([^\]]*)\]/);
                    if (permMatch && permMatch[1].trim().length > 0) {
                        agentScore += 30;
                        if (!permMatch[1].includes("'*'") &&
                            !permMatch[1].includes('"*"') &&
                            !permMatch[1].includes('all')) {
                            agentScore += 15;
                        }
                        else {
                            agentsWithWildcard.push(relativePath);
                        }
                        const permEntries = permMatch[1].split(',').filter((s) => s.trim().length > 0);
                        if (permEntries.length >= 2) {
                            agentScore += 15;
                        }
                    }
                }
                else {
                    agentsWithoutPermissions.push(relativePath);
                }
                totalScore += Math.min(agentScore, 100);
            }
            const avgScore = agentFiles.length > 0 ? Math.round(totalScore / agentFiles.length) : 0;
            return {
                name,
                passed: avgScore >= 90 && agentsWithWildcard.length === 0,
                score: avgScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agentFiles.length,
                    agentsWithoutPermissions: agentsWithoutPermissions.length,
                    agentsWithWildcard: agentsWithWildcard.length,
                    agentsWithoutPermissionsList: agentsWithoutPermissions.slice(0, 10),
                    agentsWithWildcardList: agentsWithWildcard.slice(0, 10),
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testPluginIsolation() {
        const startTime = Date.now();
        const name = 'Plugin Isolation';
        this.logger.log(`Running test: ${name}`);
        try {
            const violations = [];
            const clusterDirs = [
                'browser',
                'computer',
                'coding',
                'office',
                'marketing',
                'business',
                'infrastructure',
                'security',
                'meta-intelligence',
            ];
            const agentFiles = await this.getAllFilesRecursive(AGENTS_DIR, '-agent.service.ts');
            for (const filePath of agentFiles) {
                const content = fs.readFileSync(filePath, 'utf-8');
                const relativePath = path.relative(AGENTS_DIR, filePath);
                const agentCluster = relativePath.split(path.sep)[0];
                if (!clusterDirs.includes(agentCluster))
                    continue;
                const importRegex = /import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
                let match;
                while ((match = importRegex.exec(content)) !== null) {
                    const importPath = match[1];
                    if (!importPath.startsWith('.'))
                        continue;
                    for (const cluster of clusterDirs) {
                        if (cluster === agentCluster)
                            continue;
                        if (importPath.includes(`/${cluster}/`) || importPath.includes(`\\${cluster}\\`)) {
                            violations.push({
                                source: relativePath,
                                target: importPath,
                            });
                        }
                    }
                }
            }
            const penalty = Math.min(violations.length * 10, 100);
            const score = Math.max(0, 100 - penalty);
            return {
                name,
                passed: score >= 90,
                score,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgentFilesChecked: agentFiles.length,
                    crossClusterViolations: violations.length,
                    violations: violations.slice(0, 20),
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testRBACEnforcement(services) {
        const startTime = Date.now();
        const name = 'RBAC Enforcement';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const accessControl = services.find((s) => s.fileName.includes('access-control'));
            if (accessControl) {
                score += 15;
            }
            else {
                issues.push('AccessControlAgentService not found');
            }
            if (accessControl) {
                if (accessControl.content.includes('role') || accessControl.content.includes('Role')) {
                    score += 20;
                }
                else {
                    issues.push('Missing role management');
                }
                if (accessControl.content.includes('permission') ||
                    accessControl.content.includes('Permission') ||
                    accessControl.content.includes('checkPermission')) {
                    score += 20;
                }
                else {
                    issues.push('Missing permission checks');
                }
                if (accessControl.content.includes('RBAC') ||
                    accessControl.content.includes('rbac') ||
                    (accessControl.content.includes('role') && accessControl.content.includes('permission'))) {
                    score += 15;
                }
                if (accessControl.content.includes('ACL') ||
                    accessControl.content.includes('accessList') ||
                    accessControl.content.includes('permissionMatrix')) {
                    score += 10;
                }
                if (accessControl.hasInjectable)
                    score += 3;
                if (accessControl.hasLogger)
                    score += 2;
            }
            const decoratorPath = path.join(SOURCE_ROOT, 'agents', 'decorators', 'permission.decorator.ts');
            if (fs.existsSync(decoratorPath)) {
                score += 10;
            }
            const rolesPath = path.join(SOURCE_ROOT, 'agents', 'decorators', 'roles.decorator.ts');
            if (fs.existsSync(rolesPath)) {
                score += 5;
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!accessControl,
                    permissionDecoratorExists: fs.existsSync(decoratorPath),
                    rolesDecoratorExists: fs.existsSync(rolesPath),
                    issues,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testAuditLogging(services) {
        const startTime = Date.now();
        const name = 'Audit Logging';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const audit = services.find((s) => s.fileName.includes('audit'));
            if (audit) {
                score += 15;
            }
            else {
                issues.push('AuditAgentService not found');
            }
            if (audit) {
                if (audit.content.includes('log') ||
                    audit.content.includes('Log') ||
                    audit.content.includes('audit')) {
                    score += 20;
                }
                if (audit.content.includes('trail') ||
                    audit.content.includes('Trail') ||
                    audit.content.includes('eventLog') ||
                    audit.content.includes('auditLog')) {
                    score += 15;
                }
                if (audit.content.includes('authentication') ||
                    audit.content.includes('login') ||
                    audit.content.includes('Authentication')) {
                    score += 15;
                }
                if (audit.content.includes('access') || audit.content.includes('Access')) {
                    score += 10;
                }
                if (audit.hasInjectable)
                    score += 3;
                if (audit.hasLogger)
                    score += 2;
            }
            const eventBusPath = path.join(SOURCE_ROOT, 'agents', 'events', 'event-bus.service.ts');
            if (fs.existsSync(eventBusPath)) {
                const eventBusContent = fs.readFileSync(eventBusPath, 'utf-8');
                if (eventBusContent.includes('this.logger') && eventBusContent.includes('publish')) {
                    score += 10;
                }
            }
            const eventStorePath = path.join(SOURCE_ROOT, 'agents', 'events', 'event-store.service.ts');
            if (fs.existsSync(eventStorePath)) {
                const storeContent = fs.readFileSync(eventStorePath, 'utf-8');
                if (storeContent.includes('store(') && storeContent.includes('query(')) {
                    score += 10;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    auditServiceFound: !!audit,
                    eventBusProvidesLogging: fs.existsSync(eventBusPath),
                    eventStoreProvidesAudit: fs.existsSync(eventStorePath),
                    issues,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testEncryption(services) {
        const startTime = Date.now();
        const name = 'Encryption';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const encryption = services.find((s) => s.fileName.includes('encryption'));
            if (encryption) {
                score += 15;
            }
            else {
                issues.push('EncryptionAgentService not found');
            }
            if (encryption) {
                if (encryption.content.includes('encryptData') || encryption.content.includes('encrypt')) {
                    score += 15;
                }
                else {
                    issues.push('Missing encrypt functionality');
                }
                if (encryption.content.includes('decryptData') || encryption.content.includes('decrypt')) {
                    score += 15;
                }
                else {
                    issues.push('Missing decrypt functionality');
                }
                if (encryption.content.includes('generateKey') ||
                    encryption.content.includes('keyManagement') ||
                    encryption.content.includes('KeyRecord')) {
                    score += 15;
                }
                else {
                    issues.push('Missing key management');
                }
                if (encryption.content.includes('rotateKeys') || encryption.content.includes('rotation')) {
                    score += 10;
                }
                if (encryption.content.includes('manageCertificate') ||
                    encryption.content.includes('certificate')) {
                    score += 10;
                }
                if (encryption.content.includes('AES-256') ||
                    encryption.content.includes('RSA') ||
                    encryption.content.includes('algorithm')) {
                    score += 5;
                }
                if (encryption.content.includes('verifySignature') ||
                    encryption.content.includes('signature')) {
                    score += 5;
                }
                if (encryption.hasInjectable)
                    score += 3;
                if (encryption.hasLogger)
                    score += 2;
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!encryption,
                    methodsFound: encryption?.methods || [],
                    issues,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testTokenManagement(services) {
        const startTime = Date.now();
        const name = 'Token Management';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const auth = services.find((s) => s.fileName.includes('authentication'));
            if (auth) {
                score += 15;
            }
            else {
                issues.push('AuthenticationAgentService not found');
            }
            if (auth) {
                if (auth.content.includes('token') ||
                    auth.content.includes('Token') ||
                    auth.content.includes('validate')) {
                    score += 15;
                }
                else {
                    issues.push('Missing token validation');
                }
                if (auth.content.includes('revoke') ||
                    auth.content.includes('Revocation') ||
                    auth.content.includes('blacklist')) {
                    score += 15;
                }
                if (auth.content.includes('jwt') ||
                    auth.content.includes('JWT') ||
                    auth.content.includes('jsonwebtoken')) {
                    score += 15;
                }
                if (auth.content.includes('authenticate') ||
                    auth.content.includes('login') ||
                    auth.content.includes('Authentication')) {
                    score += 10;
                }
                if (auth.content.includes('session') || auth.content.includes('Session')) {
                    score += 10;
                }
                if (auth.hasInjectable)
                    score += 3;
                if (auth.hasLogger)
                    score += 2;
            }
            const jwtConfigPath = path.join(CONFIG_DIR, 'jwt.config.ts');
            if (fs.existsSync(jwtConfigPath)) {
                score += 10;
            }
            const authDecoratorPath = path.join(SOURCE_ROOT, 'agents', 'decorators', 'public.decorator.ts');
            if (fs.existsSync(authDecoratorPath)) {
                score += 5;
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!auth,
                    jwtConfigFound: fs.existsSync(jwtConfigPath),
                    authDecoratorFound: fs.existsSync(authDecoratorPath),
                    issues,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testZeroTrustCompliance(services) {
        const startTime = Date.now();
        const name = 'Zero Trust Compliance';
        this.logger.log(`Running test: ${name}`);
        try {
            let totalScore = 0;
            const agentsWithoutPermissionChecks = [];
            const agentFiles = await this.getAllFilesRecursive(AGENTS_DIR, '-agent.service.ts');
            for (const filePath of agentFiles) {
                const content = fs.readFileSync(filePath, 'utf-8');
                const relativePath = path.relative(SOURCE_ROOT, filePath);
                let agentScore = 0;
                if (content.includes('permissions:')) {
                    agentScore += 25;
                }
                if (content.includes('extends BaseAgentService')) {
                    agentScore += 25;
                }
                if (content.includes('id:') && content.includes('cluster:')) {
                    agentScore += 20;
                }
                if (content.includes('try') && content.includes('catch') && content.includes('onExecute')) {
                    agentScore += 15;
                }
                if (content.includes('@Injectable')) {
                    agentScore += 10;
                }
                if (content.includes('permission') ||
                    content.includes('Permission') ||
                    content.includes('checkPermission')) {
                    agentScore += 5;
                }
                if (agentScore < 60) {
                    agentsWithoutPermissionChecks.push(relativePath);
                }
                totalScore += Math.min(agentScore, 100);
            }
            const avgScore = agentFiles.length > 0 ? Math.round(totalScore / agentFiles.length) : 0;
            return {
                name,
                passed: avgScore >= 90,
                score: avgScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agentFiles.length,
                    agentsWithoutProperChecks: agentsWithoutPermissionChecks.length,
                    agentsList: agentsWithoutPermissionChecks.slice(0, 10),
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async getAllTsFiles(dir) {
        const results = [];
        if (!fs.existsSync(dir)) {
            return results;
        }
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
                    continue;
                }
                const subResults = await this.getAllTsFiles(fullPath);
                results.push(...subResults);
            }
            else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
                results.push(fullPath);
            }
        }
        return results;
    }
    async getAllFilesRecursive(dir, suffix) {
        const results = [];
        if (!fs.existsSync(dir)) {
            return results;
        }
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const subResults = await this.getAllFilesRecursive(fullPath, suffix);
                results.push(...subResults);
            }
            else if (entry.name.endsWith(suffix)) {
                results.push(fullPath);
            }
        }
        return results;
    }
    async analyzeServices() {
        if (this.serviceAnalyses) {
            return this.serviceAnalyses;
        }
        const results = [];
        if (!fs.existsSync(SECURITY_DIR)) {
            this.logger.warn(`Security directory not found: ${SECURITY_DIR}`);
            return results;
        }
        const files = fs
            .readdirSync(SECURITY_DIR)
            .filter((f) => f.endsWith('.service.ts') && !f.endsWith('.spec.ts'));
        const subdirs = fs
            .readdirSync(SECURITY_DIR, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => d.name);
        for (const subdir of subdirs) {
            const subdirPath = path.join(SECURITY_DIR, subdir);
            const subFiles = fs
                .readdirSync(subdirPath)
                .filter((f) => f.endsWith('.service.ts') && !f.endsWith('.spec.ts'));
            for (const fileName of subFiles) {
                files.push(path.join(subdir, fileName));
            }
        }
        for (const fileName of files) {
            const filePath = path.join(SECURITY_DIR, fileName);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const classMatch = content.match(/export\s+class\s+(\w+)/);
                const className = classMatch ? classMatch[1] : fileName.replace('.service.ts', '');
                const methodRegex = /(?:async\s+)?(\w+)\s*\(/g;
                const methods = [];
                let methodMatch;
                while ((methodMatch = methodRegex.exec(content)) !== null) {
                    const mName = methodMatch[1];
                    if (![
                        'if',
                        'for',
                        'while',
                        'switch',
                        'catch',
                        'constructor',
                        'return',
                        'new',
                        'throw',
                        'typeof',
                    ].includes(mName)) {
                        methods.push(mName);
                    }
                }
                const uniqueMethods = Array.from(new Set(methods));
                results.push({
                    filePath,
                    fileName,
                    content,
                    className,
                    methods: uniqueMethods,
                    hasInjectable: content.includes('@Injectable'),
                    hasLogger: content.includes('Logger') || content.includes('this.logger'),
                });
            }
            catch (error) {
                this.logger.warn(`Failed to analyze ${filePath}: ${error.message}`);
            }
        }
        this.serviceAnalyses = results;
        return results;
    }
};
exports.SecurityCertificationService = SecurityCertificationService;
exports.SecurityCertificationService = SecurityCertificationService = SecurityCertificationService_1 = __decorate([
    (0, common_1.Injectable)()
], SecurityCertificationService);
//# sourceMappingURL=security-certification.service.js.map