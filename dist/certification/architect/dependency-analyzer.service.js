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
var DependencyAnalyzerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyAnalyzerService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ALLOWED_DEPENDENCY_DIRECTIONS = {
    orchestrator: ['memory', 'events', 'communication', 'health', 'registry'],
    memory: [],
    events: [],
    communication: ['events'],
    health: ['events'],
    registry: [],
    base: [],
    browser: ['base', 'memory', 'events'],
    computer: ['base', 'memory', 'events'],
    coding: ['base', 'memory', 'events'],
    office: ['base', 'memory', 'events'],
    marketing: ['base', 'memory', 'events'],
    business: ['base', 'memory', 'events'],
    infrastructure: ['base', 'memory', 'events'],
    security: ['base', 'memory', 'events'],
    'meta-intelligence': ['base', 'memory', 'events', 'orchestrator'],
    certification: ['agents', 'memory', 'events'],
    'self-evolution': ['base', 'memory', 'events', 'certification'],
    gateway: ['memory', 'events', 'security'],
};
let DependencyAnalyzerService = DependencyAnalyzerService_1 = class DependencyAnalyzerService {
    constructor() {
        this.logger = new common_1.Logger(DependencyAnalyzerService_1.name);
        this.srcRoot = path.resolve(__dirname, '..', '..');
    }
    async analyze() {
        this.logger.log('Starting dependency analysis...');
        const scanStart = Date.now();
        const nodes = await this.scanAllFiles();
        this.logger.log(`Scanned ${nodes.length} TypeScript modules`);
        const adjacency = this.buildAdjacencyList(nodes);
        const cycles = this.detectCycles(nodes, adjacency);
        this.logger.log(`Detected ${cycles.length} circular dependencies`);
        const crossClusterImports = this.detectCrossClusterImports(nodes);
        this.logger.log(`Detected ${crossClusterImports.length} cross-cluster imports`);
        const violations = this.detectViolations(nodes, cycles, crossClusterImports);
        this.logger.log(`Detected ${violations.length} architecture violations`);
        const couplingScore = this.calculateCouplingScore(nodes, cycles, crossClusterImports);
        const duration = Date.now() - scanStart;
        this.logger.log(`Dependency analysis complete in ${duration}ms: ` +
            `coupling=${couplingScore}/100, cycles=${cycles.length}, violations=${violations.length}`);
        return {
            nodes,
            cycles,
            crossClusterImports,
            couplingScore,
            violations,
        };
    }
    async hasCircularDependencies() {
        const nodes = await this.scanAllFiles();
        const adjacency = this.buildAdjacencyList(nodes);
        const cycles = this.detectCycles(nodes, adjacency);
        return cycles.length > 0;
    }
    async getCycles() {
        const nodes = await this.scanAllFiles();
        const adjacency = this.buildAdjacencyList(nodes);
        return this.detectCycles(nodes, adjacency);
    }
    async scanAllFiles() {
        const nodes = [];
        const files = this.getAllTsFiles(this.srcRoot);
        for (const filePath of files) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const imports = this.extractImports(content, filePath);
                const cluster = this.inferCluster(filePath);
                nodes.push({
                    filePath: this.toRelativePath(filePath),
                    imports,
                    module: this.inferModule(filePath),
                    cluster,
                });
            }
            catch (error) {
                this.logger.warn(`Failed to scan ${filePath}: ${error.message}`);
            }
        }
        return nodes;
    }
    getAllTsFiles(dir) {
        const files = [];
        const excludeDirs = ['node_modules', 'dist', '.git', 'coverage', 'backend', 'frontend'];
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (excludeDirs.includes(entry.name))
                    continue;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    files.push(...this.getAllTsFiles(fullPath));
                }
                else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
                    files.push(fullPath);
                }
            }
        }
        catch (error) {
            this.logger.warn(`Cannot read directory ${dir}: ${error.message}`);
        }
        return files;
    }
    extractImports(content, fromFile) {
        const imports = [];
        const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const importPath = match[1];
            if (importPath.startsWith('.')) {
                const resolved = this.resolveRelativeImport(importPath, fromFile);
                if (resolved) {
                    imports.push(resolved);
                }
            }
        }
        const sideEffectRegex = /import\s+['"]([^'"]+)['"]/g;
        while ((match = sideEffectRegex.exec(content)) !== null) {
            const importPath = match[1];
            if (importPath.startsWith('.')) {
                const resolved = this.resolveRelativeImport(importPath, fromFile);
                if (resolved) {
                    imports.push(resolved);
                }
            }
        }
        return imports;
    }
    resolveRelativeImport(importPath, fromFile) {
        try {
            const fromDir = path.dirname(fromFile);
            const resolved = path.resolve(fromDir, importPath);
            if (fs.existsSync(resolved + '.ts')) {
                return this.toRelativePath(resolved + '.ts');
            }
            if (fs.existsSync(path.join(resolved, 'index.ts'))) {
                return this.toRelativePath(path.join(resolved, 'index.ts'));
            }
            if (fs.existsSync(resolved)) {
                return this.toRelativePath(resolved);
            }
            return null;
        }
        catch {
            return null;
        }
    }
    toRelativePath(fullPath) {
        return path.relative(this.srcRoot, fullPath).replace(/\\/g, '/');
    }
    inferCluster(filePath) {
        const relative = this.toRelativePath(filePath);
        const parts = relative.split('/');
        if (parts.length >= 3 && parts[0] === 'agents') {
            return parts[1];
        }
        if (parts[0] === 'certification')
            return 'certification';
        if (parts[0] === 'gateway')
            return 'gateway';
        return undefined;
    }
    inferModule(filePath) {
        const relative = this.toRelativePath(filePath);
        const parts = relative.split('/');
        return parts.slice(0, Math.min(parts.length, 3)).join('/');
    }
    buildAdjacencyList(nodes) {
        const adjacency = new Map();
        for (const node of nodes) {
            adjacency.set(node.filePath, node.imports);
        }
        return adjacency;
    }
    detectCycles(nodes, adjacency) {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const path = [];
        const dfs = (nodePath) => {
            if (recursionStack.has(nodePath)) {
                const cycleStart = path.indexOf(nodePath);
                if (cycleStart >= 0) {
                    const cyclePath = path.slice(cycleStart);
                    cycles.push({
                        nodes: [...cyclePath, nodePath],
                        length: cyclePath.length + 1,
                        severity: cyclePath.length <= 2 ? 'critical' : cyclePath.length <= 4 ? 'warning' : 'info',
                        description: `Circular dependency: ${[...cyclePath, nodePath].join(' → ')}`,
                    });
                }
                return;
            }
            if (visited.has(nodePath))
                return;
            visited.add(nodePath);
            recursionStack.add(nodePath);
            path.push(nodePath);
            const neighbors = adjacency.get(nodePath) || [];
            for (const neighbor of neighbors) {
                dfs(neighbor);
            }
            recursionStack.delete(nodePath);
            path.pop();
        };
        for (const node of nodes) {
            if (!visited.has(node.filePath)) {
                dfs(node.filePath);
            }
        }
        return this.deduplicateCycles(cycles);
    }
    deduplicateCycles(cycles) {
        const seen = new Set();
        return cycles.filter((cycle) => {
            const key = [...cycle.nodes].sort().join('|');
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    detectCrossClusterImports(nodes) {
        const violations = [];
        for (const node of nodes) {
            if (!node.cluster)
                continue;
            const allowedDeps = ALLOWED_DEPENDENCY_DIRECTIONS[node.cluster] || [];
            for (const imp of node.imports) {
                const targetCluster = this.inferClusterFromPath(imp);
                if (!targetCluster || targetCluster === node.cluster)
                    continue;
                if (!allowedDeps.includes(targetCluster)) {
                    violations.push({
                        sourceFile: node.filePath,
                        sourceCluster: node.cluster,
                        targetFile: imp,
                        targetCluster,
                        severity: this.isClusterUpstream(node.cluster, targetCluster) ? 'critical' : 'warning',
                    });
                }
            }
        }
        return violations;
    }
    inferClusterFromPath(relativePath) {
        const parts = relativePath.split('/');
        if (parts.length >= 2 && parts[0] === 'agents') {
            return parts[1];
        }
        if (parts[0] === 'certification')
            return 'certification';
        if (parts[0] === 'gateway')
            return 'gateway';
        return undefined;
    }
    isClusterUpstream(source, target) {
        const upstreamModules = ['orchestrator', 'registry', 'certification'];
        return upstreamModules.includes(target);
    }
    detectViolations(nodes, cycles, crossClusterImports) {
        const violations = [];
        for (const cycle of cycles) {
            violations.push({
                type: 'circular_dependency',
                source: cycle.nodes[0],
                target: cycle.nodes[cycle.nodes.length - 1],
                description: cycle.description,
                severity: cycle.severity,
            });
        }
        for (const imp of crossClusterImports) {
            violations.push({
                type: 'cross_cluster_import',
                source: imp.sourceFile,
                target: imp.targetFile,
                description: `${imp.sourceCluster} imports from ${imp.targetCluster}: ${imp.sourceFile} → ${imp.targetFile}`,
                severity: imp.severity,
            });
        }
        for (const node of nodes) {
            const basename = path.basename(node.filePath, '.ts');
            if (basename.includes('-agent.service') && !node.filePath.includes('/agents/')) {
                violations.push({
                    type: 'naming_violation',
                    source: node.filePath,
                    description: `Agent service file found outside agents directory: ${node.filePath}`,
                    severity: 'warning',
                });
            }
        }
        for (const node of nodes) {
            const cluster = node.cluster;
            if (!cluster)
                continue;
            const allowed = ALLOWED_DEPENDENCY_DIRECTIONS[cluster] || [];
            for (const imp of node.imports) {
                const targetCluster = this.inferClusterFromPath(imp);
                if (targetCluster && targetCluster !== cluster && !allowed.includes(targetCluster)) {
                    violations.push({
                        type: 'dependency_direction_violation',
                        source: node.filePath,
                        target: imp,
                        description: `Cluster "${cluster}" imports from "${targetCluster}" which violates dependency direction rules`,
                        severity: 'critical',
                    });
                }
            }
        }
        return violations;
    }
    calculateCouplingScore(nodes, cycles, crossClusterImports) {
        let score = 100;
        for (const cycle of cycles) {
            if (cycle.severity === 'critical')
                score -= 15;
            else if (cycle.severity === 'warning')
                score -= 8;
            else
                score -= 3;
        }
        for (const imp of crossClusterImports) {
            if (imp.severity === 'critical')
                score -= 10;
            else if (imp.severity === 'warning')
                score -= 5;
            else
                score -= 2;
        }
        if (crossClusterImports.length === 0)
            score += 5;
        return Math.max(0, Math.min(100, score));
    }
};
exports.DependencyAnalyzerService = DependencyAnalyzerService;
exports.DependencyAnalyzerService = DependencyAnalyzerService = DependencyAnalyzerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DependencyAnalyzerService);
//# sourceMappingURL=dependency-analyzer.service.js.map