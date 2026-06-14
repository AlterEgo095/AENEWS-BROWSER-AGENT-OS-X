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
var ArchitectCertificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectCertificationService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("../types");
const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const AGENTS_DIR = path.join(SOURCE_ROOT, 'agents');
const CLUSTER_DIRECTORIES = {
    browser: 'browser',
    computer: 'computer',
    coding: 'coding',
    office: 'office',
    marketing: 'marketing',
    business: 'business',
    infrastructure: 'infrastructure',
    security: 'security',
    'meta-intelligence': 'meta_intelligence',
};
const ALLOWED_CLUSTER_IMPORTS = {
    browser: ['base', 'interfaces', 'decorators'],
    computer: ['base', 'interfaces', 'decorators'],
    coding: ['base', 'interfaces', 'decorators'],
    office: ['base', 'interfaces', 'decorators'],
    marketing: ['base', 'interfaces', 'decorators'],
    business: ['base', 'interfaces', 'decorators'],
    infrastructure: ['base', 'interfaces', 'decorators'],
    security: ['base', 'interfaces', 'decorators'],
    'meta-intelligence': ['base', 'interfaces', 'decorators'],
};
let ArchitectCertificationService = ArchitectCertificationService_1 = class ArchitectCertificationService {
    constructor() {
        this.logger = new common_1.Logger(ArchitectCertificationService_1.name);
    }
    async runAll() {
        const startTime = Date.now();
        this.logger.log('Starting architectural integrity certification...');
        const tests = [];
        const criticalFailures = [];
        const testMethods = [
            () => this.testNoCircularDependencies(),
            () => this.testCleanArchitecture(),
            () => this.testNamingConventions(),
            () => this.testNoInterClusterCoupling(),
            () => this.testInterfaceCompliance(),
            () => this.testModuleStructure(),
            () => this.testAgentConfigValidity(),
        ];
        for (const testFn of testMethods) {
            try {
                const result = await testFn();
                tests.push(result);
                if (!result.passed && result.score < 50) {
                    criticalFailures.push(`${result.name}: Score ${result.score}/100`);
                }
            }
            catch (error) {
                const errMsg = error.message;
                this.logger.error(`Test execution failed: ${errMsg}`);
                tests.push({
                    name: testFn.name || 'unknown',
                    passed: false,
                    score: 0,
                    durationMs: 0,
                    error: errMsg,
                });
                criticalFailures.push(`Test execution error: ${errMsg}`);
            }
        }
        const testWeights = [0.2, 0.15, 0.1, 0.2, 0.15, 0.1, 0.1];
        let weightedSum = 0;
        for (let i = 0; i < tests.length; i++) {
            const weight = testWeights[i] || 0.1;
            weightedSum += tests[i].score * weight;
        }
        const score = Math.round(weightedSum);
        const passed = score >= 90 && criticalFailures.length === 0;
        const durationMs = Date.now() - startTime;
        this.logger.log(`Architectural certification complete: score=${score}, passed=${passed}, ` +
            `duration=${durationMs}ms, criticalFailures=${criticalFailures.length}`);
        return {
            domain: types_1.CertificationDomain.ARCHITECTURE,
            weight: 0.1,
            score,
            tests,
            passed,
            criticalFailures,
        };
    }
    async testNoCircularDependencies() {
        const startTime = Date.now();
        const name = 'No Circular Dependencies';
        this.logger.log(`Running test: ${name}`);
        try {
            const files = await this.scanSourceFiles(AGENTS_DIR);
            const depGraph = await this.buildDependencyGraph(files);
            const cycles = this.detectCycles(depGraph);
            const totalNodes = depGraph.size;
            const totalEdges = Array.from(depGraph.values()).reduce((sum, node) => sum + node.imports.length, 0);
            if (cycles.length === 0) {
                return {
                    name,
                    passed: true,
                    score: 100,
                    durationMs: Date.now() - startTime,
                    details: {
                        totalFiles: totalNodes,
                        totalImports: totalEdges,
                        cyclesFound: 0,
                    },
                };
            }
            const penalty = Math.min(cycles.length * 15, 100);
            const score = Math.max(0, 100 - penalty);
            this.logger.warn(`Found ${cycles.length} circular dependenc(ies): ` +
                cycles.map((c) => c.nodes.join(' → ')).join('; '));
            return {
                name,
                passed: score >= 90,
                score,
                durationMs: Date.now() - startTime,
                details: {
                    totalFiles: totalNodes,
                    totalImports: totalEdges,
                    cyclesFound: cycles.length,
                    cycles: cycles.map((c) => ({
                        path: c.nodes.join(' → '),
                        length: c.length,
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
    async testCleanArchitecture() {
        const startTime = Date.now();
        const name = 'Clean Architecture Compliance';
        this.logger.log(`Running test: ${name}`);
        try {
            const violations = [];
            const files = await this.scanSourceFiles(AGENTS_DIR);
            for (const file of files) {
                if (file.relativePath.includes('.interface.ts')) {
                    const hasInjectable = file.content.includes('@Injectable');
                    const hasClassImpl = /class\s+\w+\s+(implements|extends)\s+\w+/.test(file.content) &&
                        !file.content.includes('export interface');
                    if (hasInjectable) {
                        violations.push({
                            type: 'module_structure',
                            source: file.relativePath,
                            description: `Interface file contains @Injectable decorator — interfaces should be pure type definitions`,
                            severity: 'warning',
                        });
                    }
                }
            }
            for (const file of files) {
                if (!file.relativePath.includes('.service.ts') &&
                    !file.relativePath.includes('.module.ts')) {
                    continue;
                }
                for (const imp of file.imports) {
                    if (imp.includes('.service.ts') || imp.includes('-agent.service')) {
                        if (imp.includes('base-agent.service') || imp.includes('base/base-agent')) {
                            continue;
                        }
                        const sourceDir = path.dirname(file.relativePath);
                        const importDir = path.dirname(imp);
                        if (sourceDir === importDir) {
                            continue;
                        }
                        violations.push({
                            type: 'cross_cluster_import',
                            source: file.relativePath,
                            target: imp,
                            description: `Implementation imports another implementation directly: ${imp}. Consider importing from interfaces instead.`,
                            severity: 'info',
                        });
                    }
                }
            }
            const interfaceFiles = files.filter((f) => f.relativePath.includes('/interfaces/'));
            const hasInterfaceIndex = interfaceFiles.some((f) => f.relativePath.endsWith('/interfaces/index.ts'));
            if (!hasInterfaceIndex) {
                violations.push({
                    type: 'module_structure',
                    source: 'agents/interfaces/index.ts',
                    description: 'Missing interfaces barrel export file (index.ts)',
                    severity: 'warning',
                });
            }
            const criticalViolations = violations.filter((v) => v.severity === 'critical');
            const warningViolations = violations.filter((v) => v.severity === 'warning');
            const infoViolations = violations.filter((v) => v.severity === 'info');
            const penalty = criticalViolations.length * 25 +
                warningViolations.length * 5 +
                Math.min(infoViolations.length * 1, 20);
            const score = Math.max(0, 100 - penalty);
            return {
                name,
                passed: score >= 90,
                score,
                durationMs: Date.now() - startTime,
                details: {
                    totalViolations: violations.length,
                    critical: criticalViolations.length,
                    warnings: warningViolations.length,
                    info: infoViolations.length,
                    violations: violations.slice(0, 20).map((v) => ({
                        type: v.type,
                        source: v.source,
                        target: v.target,
                        description: v.description,
                        severity: v.severity,
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
    async testNamingConventions() {
        const startTime = Date.now();
        const name = 'Naming Conventions';
        this.logger.log(`Running test: ${name}`);
        try {
            const violations = [];
            const allFiles = await this.getAllFilesRecursive(AGENTS_DIR, '.ts');
            for (const filePath of allFiles) {
                const relativePath = path.relative(AGENTS_DIR, filePath);
                const fileName = path.basename(filePath);
                const dirName = path.dirname(relativePath);
                if (fileName === 'index.ts' ||
                    fileName.endsWith('.spec.ts') ||
                    fileName.endsWith('.test.ts')) {
                    continue;
                }
                if (fileName.endsWith('.d.ts')) {
                    continue;
                }
                if (fileName.endsWith('.service.ts') && !fileName.endsWith('-agent.service.ts')) {
                    const isInfrastructureService = dirName.includes('events') ||
                        dirName.includes('memory') ||
                        dirName.includes('registry') ||
                        dirName.includes('orchestrator') ||
                        dirName.includes('health') ||
                        dirName.includes('communication') ||
                        dirName.includes('decorators');
                    if (!isInfrastructureService) {
                        violations.push({
                            type: 'naming_violation',
                            source: relativePath,
                            description: `Agent service file should follow *-agent.service.ts pattern, got: ${fileName}`,
                            severity: 'warning',
                        });
                    }
                }
                if (fileName.endsWith('.module.ts')) {
                    const clusterDirs = Object.keys(CLUSTER_DIRECTORIES);
                    const isInClusterRoot = clusterDirs.some((cluster) => dirName === cluster || dirName.startsWith(cluster + path.sep));
                    if (isInClusterRoot && !fileName.includes('-cluster.module.ts')) {
                        const isRootModule = clusterDirs.some((cluster) => dirName === cluster &&
                            fileName === `${cluster}-cluster.module.ts`.replace(/-/, '-'));
                        const isDirectClusterChild = clusterDirs.some((cluster) => dirName === cluster);
                        if (isDirectClusterChild && !fileName.endsWith('-cluster.module.ts')) {
                        }
                    }
                }
                if (fileName.includes('interface') && !fileName.endsWith('.interface.ts')) {
                    violations.push({
                        type: 'naming_violation',
                        source: relativePath,
                        description: `Interface file should follow *.interface.ts pattern, got: ${fileName}`,
                        severity: 'warning',
                    });
                }
            }
            const agentFiles = allFiles.filter((f) => f.endsWith('-agent.service.ts'));
            for (const filePath of agentFiles) {
                const content = fs.readFileSync(filePath, 'utf-8');
                const relativePath = path.relative(AGENTS_DIR, filePath);
                const configConstMatch = content.match(/(?:export\s+(?:const|readonly)\s+)(\w+CONFIG)/g);
                if (configConstMatch) {
                    for (const match of configConstMatch) {
                        const constName = match.replace(/export\s+(?:const|readonly)\s+/, '');
                        if (!constName.endsWith('_CONFIG')) {
                            violations.push({
                                type: 'naming_violation',
                                source: relativePath,
                                description: `Config constant should end with _CONFIG, got: ${constName}`,
                                severity: 'info',
                            });
                        }
                    }
                }
            }
            const warningCount = violations.filter((v) => v.severity === 'warning').length;
            const infoCount = violations.filter((v) => v.severity === 'info').length;
            const penalty = Math.min(warningCount * 10 + infoCount * 2, 100);
            const score = Math.max(0, 100 - penalty);
            return {
                name,
                passed: score >= 90,
                score,
                durationMs: Date.now() - startTime,
                details: {
                    totalFilesChecked: allFiles.length,
                    violations: violations.length,
                    warnings: warningCount,
                    info: infoCount,
                    violationDetails: violations.slice(0, 20).map((v) => ({
                        source: v.source,
                        description: v.description,
                        severity: v.severity,
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
    async testNoInterClusterCoupling() {
        const startTime = Date.now();
        const name = 'No Inter-Cluster Coupling';
        this.logger.log(`Running test: ${name}`);
        try {
            const violations = [];
            const files = await this.scanSourceFiles(AGENTS_DIR);
            const clusterDirs = Object.keys(CLUSTER_DIRECTORIES);
            for (const file of files) {
                const fileCluster = this.getFileCluster(file.relativePath, clusterDirs);
                if (!fileCluster)
                    continue;
                const allowedImports = ALLOWED_CLUSTER_IMPORTS[fileCluster] || [
                    'base',
                    'interfaces',
                    'decorators',
                ];
                for (const imp of file.imports) {
                    const importCluster = this.getImportCluster(imp, clusterDirs);
                    if (importCluster && importCluster !== fileCluster) {
                        const isModuleImport = imp.includes('.module.ts') || imp.includes('-cluster.module');
                        const isAgentFile = file.relativePath.includes('-agent.service.ts');
                        if (isAgentFile) {
                            violations.push({
                                type: 'cross_cluster_import',
                                source: file.relativePath,
                                target: imp,
                                description: `Agent in '${fileCluster}' cluster imports from '${importCluster}' cluster: ${imp}`,
                                severity: 'critical',
                            });
                        }
                        else if (isModuleImport) {
                            violations.push({
                                type: 'cross_cluster_import',
                                source: file.relativePath,
                                target: imp,
                                description: `Module in '${fileCluster}' cluster imports from '${importCluster}' cluster: ${imp}`,
                                severity: 'warning',
                            });
                        }
                    }
                }
            }
            const criticalCount = violations.filter((v) => v.severity === 'critical').length;
            const warningCount = violations.filter((v) => v.severity === 'warning').length;
            const penalty = criticalCount * 25 + Math.min(warningCount * 5, 30);
            const score = Math.max(0, 100 - penalty);
            return {
                name,
                passed: score >= 90,
                score,
                durationMs: Date.now() - startTime,
                details: {
                    totalFilesChecked: files.length,
                    violations: violations.length,
                    critical: criticalCount,
                    warnings: warningCount,
                    violationDetails: violations.slice(0, 20).map((v) => ({
                        source: v.source,
                        target: v.target,
                        description: v.description,
                        severity: v.severity,
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
    async testInterfaceCompliance() {
        const startTime = Date.now();
        const name = 'Interface Compliance';
        this.logger.log(`Running test: ${name}`);
        try {
            const violations = [];
            const agentFiles = await this.getAllFilesRecursive(AGENTS_DIR, '-agent.service.ts');
            for (const filePath of agentFiles) {
                const content = fs.readFileSync(filePath, 'utf-8');
                const relativePath = path.relative(AGENTS_DIR, filePath);
                if (!content.includes('extends BaseAgentService')) {
                    violations.push({
                        type: 'missing_interface_impl',
                        source: relativePath,
                        description: `Agent does not extend BaseAgentService`,
                        severity: 'critical',
                    });
                }
                if (!content.includes('@Injectable')) {
                    violations.push({
                        type: 'missing_interface_impl',
                        source: relativePath,
                        description: `Agent missing @Injectable decorator`,
                        severity: 'critical',
                    });
                }
                if (!content.includes('defineConfig()')) {
                    violations.push({
                        type: 'missing_interface_impl',
                        source: relativePath,
                        description: `Agent missing defineConfig() implementation`,
                        severity: 'critical',
                    });
                }
                if (!content.includes('onInitialize()')) {
                    violations.push({
                        type: 'missing_interface_impl',
                        source: relativePath,
                        description: `Agent missing onInitialize() implementation`,
                        severity: 'critical',
                    });
                }
                if (!content.includes('onExecute(')) {
                    violations.push({
                        type: 'missing_interface_impl',
                        source: relativePath,
                        description: `Agent missing onExecute() implementation`,
                        severity: 'critical',
                    });
                }
                if (!content.includes('onDestroy()')) {
                    violations.push({
                        type: 'missing_interface_impl',
                        source: relativePath,
                        description: `Agent missing onDestroy() implementation`,
                        severity: 'critical',
                    });
                }
                if (!content.includes('registerTool(') && !content.includes('registerTool({')) {
                    violations.push({
                        type: 'missing_interface_impl',
                        source: relativePath,
                        description: `Agent does not register any tools in onInitialize()`,
                        severity: 'warning',
                    });
                }
                if (!content.includes('base-agent.service') && !content.includes('BaseAgentService')) {
                    violations.push({
                        type: 'missing_interface_impl',
                        source: relativePath,
                        description: `Agent does not import BaseAgentService`,
                        severity: 'critical',
                    });
                }
            }
            const criticalCount = violations.filter((v) => v.severity === 'critical').length;
            const warningCount = violations.filter((v) => v.severity === 'warning').length;
            const penalty = criticalCount * 20 + Math.min(warningCount * 5, 30);
            const score = Math.max(0, 100 - penalty);
            return {
                name,
                passed: score >= 90,
                score,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgentsChecked: agentFiles.length,
                    violations: violations.length,
                    critical: criticalCount,
                    warnings: warningCount,
                    violationDetails: violations.slice(0, 30).map((v) => ({
                        source: v.source,
                        description: v.description,
                        severity: v.severity,
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
    async testModuleStructure() {
        const startTime = Date.now();
        const name = 'Module Structure';
        this.logger.log(`Running test: ${name}`);
        try {
            const violations = [];
            const clusterDirs = Object.keys(CLUSTER_DIRECTORIES);
            for (const clusterDir of clusterDirs) {
                const clusterPath = path.join(AGENTS_DIR, clusterDir);
                if (!fs.existsSync(clusterPath)) {
                    violations.push({
                        type: 'module_structure',
                        source: clusterDir,
                        description: `Cluster directory does not exist: ${clusterDir}`,
                        severity: 'critical',
                    });
                    continue;
                }
                const expectedModuleName = `${clusterDir}-cluster.module.ts`;
                const modulePath = path.join(clusterPath, expectedModuleName);
                if (!fs.existsSync(modulePath)) {
                    violations.push({
                        type: 'module_structure',
                        source: `${clusterDir}/${expectedModuleName}`,
                        description: `Cluster module file not found: ${expectedModuleName}`,
                        severity: 'critical',
                    });
                    continue;
                }
                const moduleContent = fs.readFileSync(modulePath, 'utf-8');
                if (!moduleContent.includes('BaseAgentModule')) {
                    violations.push({
                        type: 'module_structure',
                        source: `${clusterDir}/${expectedModuleName}`,
                        description: `Cluster module does not import BaseAgentModule`,
                        severity: 'critical',
                    });
                }
                if (!moduleContent.includes('@Module(')) {
                    violations.push({
                        type: 'module_structure',
                        source: `${clusterDir}/${expectedModuleName}`,
                        description: `Cluster module missing @Module() decorator`,
                        severity: 'critical',
                    });
                }
                if (!moduleContent.includes('providers:') && !moduleContent.includes('providers :')) {
                    violations.push({
                        type: 'module_structure',
                        source: `${clusterDir}/${expectedModuleName}`,
                        description: `Cluster module missing providers array`,
                        severity: 'critical',
                    });
                }
                if (!moduleContent.includes('exports:') && !moduleContent.includes('exports :')) {
                    violations.push({
                        type: 'module_structure',
                        source: `${clusterDir}/${expectedModuleName}`,
                        description: `Cluster module missing exports array`,
                        severity: 'warning',
                    });
                }
                const agentFiles = await this.getAllFilesRecursive(clusterPath, '-agent.service.ts');
                for (const agentPath of agentFiles) {
                    const agentContent = fs.readFileSync(agentPath, 'utf-8');
                    const agentRelativePath = path.relative(clusterPath, agentPath);
                    const classMatch = agentContent.match(/export\s+class\s+(\w+)/);
                    if (classMatch) {
                        const className = classMatch[1];
                        if (!moduleContent.includes(className)) {
                            violations.push({
                                type: 'module_structure',
                                source: `${clusterDir}/${expectedModuleName}`,
                                description: `Agent ${className} (${agentRelativePath}) not registered in cluster module providers/exports`,
                                severity: 'warning',
                            });
                        }
                    }
                }
            }
            const criticalCount = violations.filter((v) => v.severity === 'critical').length;
            const warningCount = violations.filter((v) => v.severity === 'warning').length;
            const penalty = criticalCount * 20 + Math.min(warningCount * 5, 30);
            const score = Math.max(0, 100 - penalty);
            return {
                name,
                passed: score >= 90,
                score,
                durationMs: Date.now() - startTime,
                details: {
                    clustersChecked: clusterDirs.length,
                    violations: violations.length,
                    critical: criticalCount,
                    warnings: warningCount,
                    violationDetails: violations.slice(0, 20).map((v) => ({
                        source: v.source,
                        description: v.description,
                        severity: v.severity,
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
    async testAgentConfigValidity() {
        const startTime = Date.now();
        const name = 'Agent Config Validity';
        this.logger.log(`Running test: ${name}`);
        try {
            const violations = [];
            const agentFiles = await this.getAllFilesRecursive(AGENTS_DIR, '-agent.service.ts');
            const seenIds = new Map();
            const clusterDirs = Object.keys(CLUSTER_DIRECTORIES);
            for (const filePath of agentFiles) {
                const content = fs.readFileSync(filePath, 'utf-8');
                const relativePath = path.relative(AGENTS_DIR, filePath);
                const configMatch = content.match(/export\s+const\s+(\w+CONFIG)\s*:\s*AgentConfig\s*=\s*\{([\s\S]*?)\};/);
                if (!configMatch) {
                    const altMatch = content.match(/(\w+_CONFIG)\s*:\s*AgentConfig\s*=\s*\{/);
                    if (!altMatch) {
                        violations.push({
                            type: 'config_invalid',
                            source: relativePath,
                            description: `No AgentConfig constant found in agent file`,
                            severity: 'warning',
                        });
                        continue;
                    }
                }
                const requiredFields = [
                    'id:',
                    'name:',
                    'cluster:',
                    'version:',
                    'capabilities:',
                    'permissions:',
                ];
                for (const field of requiredFields) {
                    if (!content.includes(field)) {
                        violations.push({
                            type: 'config_invalid',
                            source: relativePath,
                            description: `Agent config missing required field: ${field.replace(':', '')}`,
                            severity: 'critical',
                        });
                    }
                }
                const idMatch = content.match(/id:\s*['"]([^'"]+)['"]/);
                if (idMatch) {
                    const agentId = idMatch[1];
                    if (seenIds.has(agentId)) {
                        violations.push({
                            type: 'config_invalid',
                            source: relativePath,
                            description: `Duplicate agent ID: '${agentId}' (also in ${seenIds.get(agentId)})`,
                            severity: 'critical',
                        });
                    }
                    else {
                        seenIds.set(agentId, relativePath);
                    }
                    const fileCluster = this.getFileCluster(relativePath, clusterDirs);
                    if (fileCluster &&
                        !agentId.startsWith(fileCluster.replace('-', '') + '-') &&
                        !agentId.includes(fileCluster)) {
                        const clusterInId = agentId.startsWith(CLUSTER_DIRECTORIES[fileCluster]?.replace('_', '') + '-') ||
                            agentId.includes(fileCluster);
                        if (!clusterInId) {
                            violations.push({
                                type: 'config_invalid',
                                source: relativePath,
                                description: `Agent ID '${agentId}' doesn't follow '{cluster}-{name}' convention for cluster '${fileCluster}'`,
                                severity: 'info',
                            });
                        }
                    }
                }
                const clusterFieldMatch = content.match(/cluster:\s*AgentCluster\.(\w+)/);
                if (clusterFieldMatch) {
                    const declaredCluster = clusterFieldMatch[1];
                    const fileCluster = this.getFileCluster(relativePath, clusterDirs);
                    if (fileCluster) {
                        const expectedEnumValue = CLUSTER_DIRECTORIES[fileCluster]
                            ?.toUpperCase()
                            .replace(/-/g, '_');
                        if (expectedEnumValue && declaredCluster !== expectedEnumValue) {
                            violations.push({
                                type: 'config_invalid',
                                source: relativePath,
                                description: `Agent declares cluster '${declaredCluster}' but is in '${fileCluster}' directory (expected: ${expectedEnumValue})`,
                                severity: 'critical',
                            });
                        }
                    }
                }
            }
            const criticalCount = violations.filter((v) => v.severity === 'critical').length;
            const warningCount = violations.filter((v) => v.severity === 'warning').length;
            const infoCount = violations.filter((v) => v.severity === 'info').length;
            const penalty = criticalCount * 20 + Math.min(warningCount * 5, 20) + Math.min(infoCount, 10);
            const score = Math.max(0, 100 - penalty);
            return {
                name,
                passed: score >= 90,
                score,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgentsChecked: agentFiles.length,
                    uniqueIds: seenIds.size,
                    violations: violations.length,
                    critical: criticalCount,
                    warnings: warningCount,
                    info: infoCount,
                    violationDetails: violations.slice(0, 30).map((v) => ({
                        source: v.source,
                        description: v.description,
                        severity: v.severity,
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
    async getAllFilesRecursive(dir, suffix) {
        const results = [];
        if (!fs.existsSync(dir)) {
            this.logger.warn(`Directory does not exist: ${dir}`);
            return results;
        }
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const subResults = await this.getAllFilesRecursive(fullPath, suffix);
                results.push(...subResults);
            }
            else if (entry.name.endsWith(suffix) ||
                (suffix.startsWith('.') && entry.name.endsWith(suffix))) {
                results.push(fullPath);
            }
        }
        return results;
    }
    async scanSourceFiles(dir) {
        const results = [];
        const allTsFiles = await this.getAllFilesRecursive(dir, '.ts');
        for (const filePath of allTsFiles) {
            const basename = path.basename(filePath);
            if (basename.endsWith('.spec.ts') ||
                basename.endsWith('.test.ts') ||
                basename.endsWith('.d.ts')) {
                continue;
            }
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const relativePath = path.relative(SOURCE_ROOT, filePath);
                const imports = this.parseImports(content, filePath);
                const exports = this.parseExports(content);
                const classes = this.parseClasses(content);
                const interfaces = this.parseInterfaces(content);
                results.push({
                    filePath,
                    relativePath,
                    content,
                    imports,
                    exports,
                    classes,
                    interfaces,
                });
            }
            catch (error) {
                this.logger.warn(`Failed to scan file ${filePath}: ${error.message}`);
            }
        }
        return results;
    }
    parseImports(content, filePath) {
        const imports = [];
        const importRegex = /import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const importPath = match[1];
            if (importPath.startsWith('.')) {
                const resolvedDir = path.dirname(filePath);
                let resolvedPath = path.resolve(resolvedDir, importPath);
                if (!resolvedPath.endsWith('.ts')) {
                    resolvedPath += '.ts';
                }
                imports.push(path.relative(SOURCE_ROOT, resolvedPath));
            }
        }
        return imports;
    }
    parseExports(content) {
        const exports = [];
        const exportRegex = /export\s+(?:default\s+)?(?:class|const|interface|enum|function|type|abstract\s+class)\s+(\w+)/g;
        let match;
        while ((match = exportRegex.exec(content)) !== null) {
            exports.push(match[1]);
        }
        return exports;
    }
    parseClasses(content) {
        const classes = [];
        const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g;
        let match;
        while ((match = classRegex.exec(content)) !== null) {
            classes.push(match[1]);
        }
        return classes;
    }
    parseInterfaces(content) {
        const interfaces = [];
        const interfaceRegex = /(?:export\s+)?interface\s+(\w+)/g;
        let match;
        while ((match = interfaceRegex.exec(content)) !== null) {
            interfaces.push(match[1]);
        }
        return interfaces;
    }
    async buildDependencyGraph(files) {
        const graph = new Map();
        for (const file of files) {
            graph.set(file.relativePath, {
                filePath: file.relativePath,
                imports: file.imports,
                module: file.relativePath.split('/').slice(0, 3).join('/'),
                cluster: this.inferCluster(file.relativePath),
            });
        }
        return graph;
    }
    detectCycles(graph) {
        const cycles = [];
        const color = new Map();
        const parent = new Map();
        for (const key of graph.keys()) {
            color.set(key, 0);
            parent.set(key, null);
        }
        const dfs = (node, path) => {
            color.set(node, 1);
            path.push(node);
            const depNode = graph.get(node);
            if (depNode) {
                for (const neighbor of depNode.imports) {
                    if (!graph.has(neighbor))
                        continue;
                    const neighborColor = color.get(neighbor);
                    if (neighborColor === 1) {
                        const cycleStartIndex = path.indexOf(neighbor);
                        if (cycleStartIndex !== -1) {
                            const cyclePath = [...path.slice(cycleStartIndex), neighbor];
                            cycles.push({
                                nodes: cyclePath,
                                length: cyclePath.length - 1,
                                severity: cyclePath.length <= 2
                                    ? 'critical'
                                    : cyclePath.length <= 4
                                        ? 'warning'
                                        : 'info',
                                description: `Circular dependency: ${cyclePath.join(' → ')}`,
                            });
                        }
                    }
                    else if (neighborColor === 0) {
                        parent.set(neighbor, node);
                        dfs(neighbor, path);
                    }
                }
            }
            path.pop();
            color.set(node, 2);
        };
        for (const key of graph.keys()) {
            if (color.get(key) === 0) {
                dfs(key, []);
            }
        }
        return cycles;
    }
    inferCluster(relativePath) {
        const parts = relativePath.replace(/\\/g, '/').split('/');
        if (parts.length >= 3 && parts[0] === 'agents') {
            return parts[1];
        }
        if (parts[0] === 'certification')
            return 'certification';
        if (parts[0] === 'gateway')
            return 'gateway';
        return undefined;
    }
    getFileCluster(relativePath, clusterDirs) {
        const normalizedPath = relativePath.replace(/\\/g, '/');
        for (const cluster of clusterDirs) {
            const clusterPrefix = `agents/${cluster}/`;
            if (normalizedPath.includes(clusterPrefix)) {
                return cluster;
            }
        }
        return null;
    }
    getImportCluster(importPath, clusterDirs) {
        const normalizedPath = importPath.replace(/\\/g, '/');
        for (const cluster of clusterDirs) {
            const clusterPrefix = `agents/${cluster}/`;
            if (normalizedPath.includes(clusterPrefix)) {
                return cluster;
            }
        }
        return null;
    }
};
exports.ArchitectCertificationService = ArchitectCertificationService;
exports.ArchitectCertificationService = ArchitectCertificationService = ArchitectCertificationService_1 = __decorate([
    (0, common_1.Injectable)()
], ArchitectCertificationService);
//# sourceMappingURL=architect-certification.service.js.map