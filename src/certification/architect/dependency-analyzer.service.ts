/**
 * AENEWS Agent OS X - Dependency Analyzer Service
 * Scans the entire TypeScript codebase, builds a dependency graph,
 * detects circular dependencies, cross-cluster imports, and coupling violations.
 * Enforces the strict unidirectional dependency flow:
 *
 *   Planner → TaskGraph → Dispatcher → Executor → EventBus
 *
 * Never:
 *   EventBus → TaskGraph → Orchestrator (upstream coupling)
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  DependencyNode,
  DependencyCycle,
  DependencyAnalysisResult,
  CrossClusterImport,
  ArchitectureViolation,
} from '../types';

// ─── Allowed Dependency Directions ─────────────────────────────────
// These define the strict directional flow that must be respected.

const ALLOWED_DEPENDENCY_DIRECTIONS: Record<string, string[]> = {
  // Orchestrator can depend on everything below it
  orchestrator: ['memory', 'events', 'communication', 'health', 'registry'],
  // Memory is foundational - no upstream deps
  memory: [],
  // Events is foundational
  events: [],
  // Communication depends on events
  communication: ['events'],
  // Health depends on events
  health: ['events'],
  // Registry is foundational
  registry: [],
  // Base is foundational
  base: [],
  // Cluster modules can depend on base and memory
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
  // Self-evolution depends on certification and agents
  'self-evolution': ['base', 'memory', 'events', 'certification'],
  // Gateway modules are foundational
  gateway: ['memory', 'events', 'security'],
};

@Injectable()
export class DependencyAnalyzerService {
  private readonly logger = new Logger(DependencyAnalyzerService.name);

  /** Root directory for scanning */
  private readonly srcRoot: string;

  constructor() {
    this.srcRoot = path.resolve(__dirname, '..', '..');
  }

  /**
   * Run a full dependency analysis on the codebase.
   * Returns all nodes, cycles, cross-cluster imports, and violations.
   */
  async analyze(): Promise<DependencyAnalysisResult> {
    this.logger.log('Starting dependency analysis...');

    const scanStart = Date.now();

    // Step 1: Scan all TypeScript files
    const nodes = await this.scanAllFiles();
    this.logger.log(`Scanned ${nodes.length} TypeScript modules`);

    // Step 2: Build adjacency list
    const adjacency = this.buildAdjacencyList(nodes);

    // Step 3: Detect circular dependencies
    const cycles = this.detectCycles(nodes, adjacency);
    this.logger.log(`Detected ${cycles.length} circular dependencies`);

    // Step 4: Detect cross-cluster imports
    const crossClusterImports = this.detectCrossClusterImports(nodes);
    this.logger.log(`Detected ${crossClusterImports.length} cross-cluster imports`);

    // Step 5: Detect architecture violations
    const violations = this.detectViolations(nodes, cycles, crossClusterImports);
    this.logger.log(`Detected ${violations.length} architecture violations`);

    // Step 6: Calculate coupling score
    const couplingScore = this.calculateCouplingScore(nodes, cycles, crossClusterImports);

    const duration = Date.now() - scanStart;
    this.logger.log(
      `Dependency analysis complete in ${duration}ms: ` +
        `coupling=${couplingScore}/100, cycles=${cycles.length}, violations=${violations.length}`,
    );

    return {
      nodes,
      cycles,
      crossClusterImports,
      couplingScore,
      violations,
    };
  }

  /**
   * Quick check: are there any circular dependencies?
   */
  async hasCircularDependencies(): Promise<boolean> {
    const nodes = await this.scanAllFiles();
    const adjacency = this.buildAdjacencyList(nodes);
    const cycles = this.detectCycles(nodes, adjacency);
    return cycles.length > 0;
  }

  /**
   * Get all cycles in the dependency graph.
   */
  async getCycles(): Promise<DependencyCycle[]> {
    const nodes = await this.scanAllFiles();
    const adjacency = this.buildAdjacencyList(nodes);
    return this.detectCycles(nodes, adjacency);
  }

  // ─── File Scanning ──────────────────────────────────────────────

  private async scanAllFiles(): Promise<DependencyNode[]> {
    const nodes: DependencyNode[] = [];
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
      } catch (error) {
        this.logger.warn(`Failed to scan ${filePath}: ${(error as Error).message}`);
      }
    }

    return nodes;
  }

  private getAllTsFiles(dir: string): string[] {
    const files: string[] = [];
    const excludeDirs = ['node_modules', 'dist', '.git', 'coverage', 'backend', 'frontend'];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (excludeDirs.includes(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...this.getAllTsFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.logger.warn(`Cannot read directory ${dir}: ${(error as Error).message}`);
    }

    return files;
  }

  private extractImports(content: string, fromFile: string): string[] {
    const imports: string[] = [];

    // Match: import ... from '...'
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];

      // Only track relative imports (internal dependencies)
      if (importPath.startsWith('.')) {
        const resolved = this.resolveRelativeImport(importPath, fromFile);
        if (resolved) {
          imports.push(resolved);
        }
      }
    }

    // Match: import '...'
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

  private resolveRelativeImport(importPath: string, fromFile: string): string | null {
    try {
      const fromDir = path.dirname(fromFile);
      const resolved = path.resolve(fromDir, importPath);

      // Try with .ts extension
      if (fs.existsSync(resolved + '.ts')) {
        return this.toRelativePath(resolved + '.ts');
      }
      // Try with /index.ts
      if (fs.existsSync(path.join(resolved, 'index.ts'))) {
        return this.toRelativePath(path.join(resolved, 'index.ts'));
      }
      // Try as-is
      if (fs.existsSync(resolved)) {
        return this.toRelativePath(resolved);
      }

      return null;
    } catch {
      return null;
    }
  }

  private toRelativePath(fullPath: string): string {
    return path.relative(this.srcRoot, fullPath).replace(/\\/g, '/');
  }

  private inferCluster(filePath: string): string | undefined {
    const relative = this.toRelativePath(filePath);
    const parts = relative.split('/');

    if (parts.length >= 3 && parts[0] === 'agents') {
      return parts[1]; // e.g., 'browser', 'security', 'orchestrator'
    }

    if (parts[0] === 'certification') return 'certification';
    if (parts[0] === 'gateway') return 'gateway';

    return undefined;
  }

  private inferModule(filePath: string): string {
    const relative = this.toRelativePath(filePath);
    const parts = relative.split('/');
    return parts.slice(0, Math.min(parts.length, 3)).join('/');
  }

  // ─── Cycle Detection (DFS-based) ────────────────────────────────

  private buildAdjacencyList(nodes: DependencyNode[]): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();

    for (const node of nodes) {
      adjacency.set(node.filePath, node.imports);
    }

    return adjacency;
  }

  private detectCycles(
    nodes: DependencyNode[],
    adjacency: Map<string, string[]>,
  ): DependencyCycle[] {
    const cycles: DependencyCycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodePath: string): void => {
      if (recursionStack.has(nodePath)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodePath);
        if (cycleStart >= 0) {
          const cyclePath = path.slice(cycleStart);
          cycles.push({
            nodes: [...cyclePath, nodePath],
            length: cyclePath.length + 1,
            severity:
              cyclePath.length <= 2 ? 'critical' : cyclePath.length <= 4 ? 'warning' : 'info',
            description: `Circular dependency: ${[...cyclePath, nodePath].join(' → ')}`,
          });
        }
        return;
      }

      if (visited.has(nodePath)) return;

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

  private deduplicateCycles(cycles: DependencyCycle[]): DependencyCycle[] {
    const seen = new Set<string>();
    return cycles.filter((cycle) => {
      const key = [...cycle.nodes].sort().join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ─── Cross-Cluster Import Detection ─────────────────────────────

  private detectCrossClusterImports(nodes: DependencyNode[]): CrossClusterImport[] {
    const violations: CrossClusterImport[] = [];

    for (const node of nodes) {
      if (!node.cluster) continue;

      const allowedDeps = ALLOWED_DEPENDENCY_DIRECTIONS[node.cluster] || [];

      for (const imp of node.imports) {
        const targetCluster = this.inferClusterFromPath(imp);
        if (!targetCluster || targetCluster === node.cluster) continue;

        // Check if this cross-cluster dependency is allowed
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

  private inferClusterFromPath(relativePath: string): string | undefined {
    const parts = relativePath.split('/');
    if (parts.length >= 2 && parts[0] === 'agents') {
      return parts[1];
    }
    if (parts[0] === 'certification') return 'certification';
    if (parts[0] === 'gateway') return 'gateway';
    return undefined;
  }

  private isClusterUpstream(source: string, target: string): boolean {
    // Upstream = target is a higher-level module (orchestrator, registry)
    // that should not be imported by lower-level modules
    const upstreamModules = ['orchestrator', 'registry', 'certification'];
    return upstreamModules.includes(target);
  }

  // ─── Architecture Violations ────────────────────────────────────

  private detectViolations(
    nodes: DependencyNode[],
    cycles: DependencyCycle[],
    crossClusterImports: CrossClusterImport[],
  ): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];

    // Circular dependencies
    for (const cycle of cycles) {
      violations.push({
        type: 'circular_dependency',
        source: cycle.nodes[0],
        target: cycle.nodes[cycle.nodes.length - 1],
        description: cycle.description,
        severity: cycle.severity,
      });
    }

    // Cross-cluster imports
    for (const imp of crossClusterImports) {
      violations.push({
        type: 'cross_cluster_import',
        source: imp.sourceFile,
        target: imp.targetFile,
        description: `${imp.sourceCluster} imports from ${imp.targetCluster}: ${imp.sourceFile} → ${imp.targetFile}`,
        severity: imp.severity,
      });
    }

    // Naming conventions
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

    // Dependency direction violations
    for (const node of nodes) {
      const cluster = node.cluster;
      if (!cluster) continue;

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

  // ─── Coupling Score Calculation ─────────────────────────────────

  private calculateCouplingScore(
    nodes: DependencyNode[],
    cycles: DependencyCycle[],
    crossClusterImports: CrossClusterImport[],
  ): number {
    let score = 100;

    // Penalty for each cycle
    for (const cycle of cycles) {
      if (cycle.severity === 'critical') score -= 15;
      else if (cycle.severity === 'warning') score -= 8;
      else score -= 3;
    }

    // Penalty for cross-cluster imports
    for (const imp of crossClusterImports) {
      if (imp.severity === 'critical') score -= 10;
      else if (imp.severity === 'warning') score -= 5;
      else score -= 2;
    }

    // Bonus for clean separation (no cross-cluster deps)
    if (crossClusterImports.length === 0) score += 5;

    return Math.max(0, Math.min(100, score));
  }
}
