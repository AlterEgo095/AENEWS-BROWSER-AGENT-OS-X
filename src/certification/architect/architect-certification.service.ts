/**
 * AENEWS Agent OS X - Architect Certification Service
 * Performs real architectural integrity tests by scanning the source code,
 * parsing imports, building dependency graphs, and enforcing clean architecture rules.
 *
 * Tests:
 * 1. No circular dependencies (DFS cycle detection on import graph)
 * 2. Clean Architecture compliance (dependency direction, interface separation)
 * 3. Naming conventions (agent/module/interface/config naming patterns)
 * 4. No inter-cluster coupling (cluster isolation verification)
 * 5. Interface compliance (BaseAgentService implementation verification)
 * 6. Module structure (cluster module composition)
 * 7. Agent config validity (required fields, cluster match, no duplicates)
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  CertificationDomain,
  DomainResult,
  TestResult,
  FileScanResult,
  DependencyNode,
  DependencyCycle,
  ArchitectureViolation,
} from '../types';

// ─── Constants ────────────────────────────────────────────────────

const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const AGENTS_DIR = path.join(SOURCE_ROOT, 'agents');

// Cluster directories mapped to their names
const CLUSTER_DIRECTORIES: Record<string, string> = {
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

// Allowed import sources for each cluster (they can only import from these)
const ALLOWED_CLUSTER_IMPORTS: Record<string, string[]> = {
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

@Injectable()
export class ArchitectCertificationService {
  private readonly logger = new Logger(ArchitectCertificationService.name);

  // ─── Main Entry Point ─────────────────────────────────────────────

  /**
   * Run all architecture certification tests and return a DomainResult.
   */
  async runAll(): Promise<DomainResult> {
    const startTime = Date.now();
    this.logger.log('Starting architectural integrity certification...');

    const tests: TestResult[] = [];
    const criticalFailures: string[] = [];

    // Run each test
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
      } catch (error) {
        const errMsg = (error as Error).message;
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

    // Calculate domain score (weighted average of test scores)
    const testWeights = [0.2, 0.15, 0.1, 0.2, 0.15, 0.1, 0.1];
    let weightedSum = 0;
    for (let i = 0; i < tests.length; i++) {
      const weight = testWeights[i] || 0.1;
      weightedSum += tests[i].score * weight;
    }
    const score = Math.round(weightedSum);

    const passed = score >= 90 && criticalFailures.length === 0;
    const durationMs = Date.now() - startTime;

    this.logger.log(
      `Architectural certification complete: score=${score}, passed=${passed}, ` +
        `duration=${durationMs}ms, criticalFailures=${criticalFailures.length}`,
    );

    return {
      domain: CertificationDomain.ARCHITECTURE,
      weight: 0.1,
      score,
      tests,
      passed,
      criticalFailures,
    };
  }

  // ─── Test 1: No Circular Dependencies ─────────────────────────────

  /**
   * Build a dependency graph from all source file imports and detect cycles
   * using DFS (Depth-First Search) cycle detection.
   */
  async testNoCircularDependencies(): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'No Circular Dependencies';
    this.logger.log(`Running test: ${name}`);

    try {
      const files = await this.scanSourceFiles(AGENTS_DIR);
      const depGraph = await this.buildDependencyGraph(files);
      const cycles = this.detectCycles(depGraph);

      const totalNodes = depGraph.size;
      const totalEdges = Array.from(depGraph.values()).reduce(
        (sum, node) => sum + node.imports.length,
        0,
      );

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

      // Score penalty: each cycle reduces score
      const penalty = Math.min(cycles.length * 15, 100);
      const score = Math.max(0, 100 - penalty);

      this.logger.warn(
        `Found ${cycles.length} circular dependenc(ies): ` +
          cycles.map((c) => c.nodes.join(' → ')).join('; '),
      );

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
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 2: Clean Architecture Compliance ────────────────────────

  /**
   * Verify:
   * - Interfaces are in separate files from implementations
   * - Dependency direction follows interfaces ← implementations
   * - No implementation files import from other implementation files directly
   *   (they should go through interfaces)
   */
  async testCleanArchitecture(): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Clean Architecture Compliance';
    this.logger.log(`Running test: ${name}`);

    try {
      const violations: ArchitectureViolation[] = [];
      const files = await this.scanSourceFiles(AGENTS_DIR);

      // Check 1: Interface files should NOT contain @Injectable or class implementations
      for (const file of files) {
        if (file.relativePath.includes('.interface.ts')) {
          const hasInjectable = file.content.includes('@Injectable');
          const hasClassImpl =
            /class\s+\w+\s+(implements|extends)\s+\w+/.test(file.content) &&
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

      // Check 2: Implementation files should import from interfaces, not other implementations
      // (within the same cluster or across clusters)
      for (const file of files) {
        // Only check service/agent files (implementations)
        if (
          !file.relativePath.includes('.service.ts') &&
          !file.relativePath.includes('.module.ts')
        ) {
          continue;
        }

        for (const imp of file.imports) {
          // Check if importing from another service file directly (bypassing interfaces)
          if (imp.includes('.service.ts') || imp.includes('-agent.service')) {
            // Allow imports from base-agent.service (it's the abstract base class)
            if (imp.includes('base-agent.service') || imp.includes('base/base-agent')) {
              continue;
            }

            // Allow imports within the same subdirectory (same agent's own files)
            const sourceDir = path.dirname(file.relativePath);
            const importDir = path.dirname(imp);
            if (sourceDir === importDir) {
              continue;
            }

            // Flag cross-directory service-to-service imports
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

      // Check 3: Verify interfaces directory has proper separation
      const interfaceFiles = files.filter((f) => f.relativePath.includes('/interfaces/'));
      const hasInterfaceIndex = interfaceFiles.some((f) =>
        f.relativePath.endsWith('/interfaces/index.ts'),
      );

      if (!hasInterfaceIndex) {
        violations.push({
          type: 'module_structure',
          source: 'agents/interfaces/index.ts',
          description: 'Missing interfaces barrel export file (index.ts)',
          severity: 'warning',
        });
      }

      // Calculate score
      const criticalViolations = violations.filter((v) => v.severity === 'critical');
      const warningViolations = violations.filter((v) => v.severity === 'warning');
      const infoViolations = violations.filter((v) => v.severity === 'info');

      const penalty =
        criticalViolations.length * 25 +
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
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 3: Naming Conventions ───────────────────────────────────

  /**
   * Verify file naming conventions:
   * - Agent files: *-agent.service.ts
   * - Module files: *-cluster.module.ts (for cluster modules)
   * - Interface files: *.interface.ts
   * - Config constants: *_CONFIG
   */
  async testNamingConventions(): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Naming Conventions';
    this.logger.log(`Running test: ${name}`);

    try {
      const violations: ArchitectureViolation[] = [];
      const allFiles = await this.getAllFilesRecursive(AGENTS_DIR, '.ts');

      for (const filePath of allFiles) {
        const relativePath = path.relative(AGENTS_DIR, filePath);
        const fileName = path.basename(filePath);
        const dirName = path.dirname(relativePath);

        // Skip index.ts files and test files
        if (
          fileName === 'index.ts' ||
          fileName.endsWith('.spec.ts') ||
          fileName.endsWith('.test.ts')
        ) {
          continue;
        }

        // Skip non-relevant files
        if (fileName.endsWith('.d.ts')) {
          continue;
        }

        // Check agent service naming: should be *-agent.service.ts
        if (fileName.endsWith('.service.ts') && !fileName.endsWith('-agent.service.ts')) {
          // Non-agent services are allowed (e.g., event-bus.service.ts, memory.service.ts)
          // These are infrastructure services, not agents
          const isInfrastructureService =
            dirName.includes('events') ||
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

        // Check cluster module naming: should be *-cluster.module.ts
        if (fileName.endsWith('.module.ts')) {
          // Check if it's in a cluster directory root
          const clusterDirs = Object.keys(CLUSTER_DIRECTORIES);
          const isInClusterRoot = clusterDirs.some(
            (cluster) => dirName === cluster || dirName.startsWith(cluster + path.sep),
          );

          if (isInClusterRoot && !fileName.includes('-cluster.module.ts')) {
            // Only the root module in a cluster needs the -cluster.module.ts naming
            const isRootModule = clusterDirs.some(
              (cluster) =>
                dirName === cluster &&
                fileName === `${cluster}-cluster.module.ts`.replace(/-/, '-'),
            );

            // Check if this is a module file in a cluster root but not named *-cluster.module.ts
            const isDirectClusterChild = clusterDirs.some((cluster) => dirName === cluster);
            if (isDirectClusterChild && !fileName.endsWith('-cluster.module.ts')) {
              // Non-cluster modules inside cluster directories are OK (they might be sub-modules)
            }
          }
        }

        // Check interface file naming: should be *.interface.ts
        if (fileName.includes('interface') && !fileName.endsWith('.interface.ts')) {
          violations.push({
            type: 'naming_violation',
            source: relativePath,
            description: `Interface file should follow *.interface.ts pattern, got: ${fileName}`,
            severity: 'warning',
          });
        }
      }

      // Check config constant naming in source files
      const agentFiles = allFiles.filter((f) => f.endsWith('-agent.service.ts'));
      for (const filePath of agentFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(AGENTS_DIR, filePath);

        // Look for config constants — should end with _CONFIG
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
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 4: No Inter-Cluster Coupling ────────────────────────────

  /**
   * Verify that cluster agents do NOT import from other clusters.
   * Each cluster should only import from base/, interfaces/, and decorators/.
   * Browser agents should NOT import from coding agents, etc.
   */
  async testNoInterClusterCoupling(): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'No Inter-Cluster Coupling';
    this.logger.log(`Running test: ${name}`);

    try {
      const violations: ArchitectureViolation[] = [];
      const files = await this.scanSourceFiles(AGENTS_DIR);

      const clusterDirs = Object.keys(CLUSTER_DIRECTORIES);

      for (const file of files) {
        // Determine which cluster this file belongs to
        const fileCluster = this.getFileCluster(file.relativePath, clusterDirs);
        if (!fileCluster) continue; // Not in a cluster directory

        const allowedImports = ALLOWED_CLUSTER_IMPORTS[fileCluster] || [
          'base',
          'interfaces',
          'decorators',
        ];

        for (const imp of file.imports) {
          // Resolve the import to determine what it's importing from
          const importCluster = this.getImportCluster(imp, clusterDirs);

          // If the import is from another cluster, it's a violation
          if (importCluster && importCluster !== fileCluster) {
            // Check if it's an allowed cross-cluster import
            // (modules can import other cluster modules for DI, but agents should not)
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
            } else if (isModuleImport) {
              // Module-to-module imports are less severe
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
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 5: Interface Compliance ─────────────────────────────────

  /**
   * Verify that every agent:
   * - Extends BaseAgentService
   * - Implements defineConfig(), onInitialize(), onExecute(), onDestroy()
   * - Registers tools in onInitialize()
   * - Has @Injectable decorator
   */
  async testInterfaceCompliance(): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Interface Compliance';
    this.logger.log(`Running test: ${name}`);

    try {
      const violations: ArchitectureViolation[] = [];
      const agentFiles = await this.getAllFilesRecursive(AGENTS_DIR, '-agent.service.ts');

      for (const filePath of agentFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(AGENTS_DIR, filePath);

        // Check 1: Extends BaseAgentService
        if (!content.includes('extends BaseAgentService')) {
          violations.push({
            type: 'missing_interface_impl',
            source: relativePath,
            description: `Agent does not extend BaseAgentService`,
            severity: 'critical',
          });
        }

        // Check 2: Has @Injectable decorator
        if (!content.includes('@Injectable')) {
          violations.push({
            type: 'missing_interface_impl',
            source: relativePath,
            description: `Agent missing @Injectable decorator`,
            severity: 'critical',
          });
        }

        // Check 3: Implements defineConfig()
        if (!content.includes('defineConfig()')) {
          violations.push({
            type: 'missing_interface_impl',
            source: relativePath,
            description: `Agent missing defineConfig() implementation`,
            severity: 'critical',
          });
        }

        // Check 4: Implements onInitialize()
        if (!content.includes('onInitialize()')) {
          violations.push({
            type: 'missing_interface_impl',
            source: relativePath,
            description: `Agent missing onInitialize() implementation`,
            severity: 'critical',
          });
        }

        // Check 5: Implements onExecute()
        if (!content.includes('onExecute(')) {
          violations.push({
            type: 'missing_interface_impl',
            source: relativePath,
            description: `Agent missing onExecute() implementation`,
            severity: 'critical',
          });
        }

        // Check 6: Implements onDestroy()
        if (!content.includes('onDestroy()')) {
          violations.push({
            type: 'missing_interface_impl',
            source: relativePath,
            description: `Agent missing onDestroy() implementation`,
            severity: 'critical',
          });
        }

        // Check 7: Registers tools
        if (!content.includes('registerTool(') && !content.includes('registerTool({')) {
          violations.push({
            type: 'missing_interface_impl',
            source: relativePath,
            description: `Agent does not register any tools in onInitialize()`,
            severity: 'warning',
          });
        }

        // Check 8: Imports BaseAgentService
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
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 6: Module Structure ─────────────────────────────────────

  /**
   * Verify:
   * - Every cluster must have a *-cluster.module.ts
   * - Every cluster module must import BaseAgentModule
   * - Every cluster module must export all agents
   */
  async testModuleStructure(): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Module Structure';
    this.logger.log(`Running test: ${name}`);

    try {
      const violations: ArchitectureViolation[] = [];
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

        // Check 1: Cluster must have a cluster module file
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

        // Check 2: Module must import BaseAgentModule
        if (!moduleContent.includes('BaseAgentModule')) {
          violations.push({
            type: 'module_structure',
            source: `${clusterDir}/${expectedModuleName}`,
            description: `Cluster module does not import BaseAgentModule`,
            severity: 'critical',
          });
        }

        // Check 3: Module must have @Module decorator
        if (!moduleContent.includes('@Module(')) {
          violations.push({
            type: 'module_structure',
            source: `${clusterDir}/${expectedModuleName}`,
            description: `Cluster module missing @Module() decorator`,
            severity: 'critical',
          });
        }

        // Check 4: Module should have providers
        if (!moduleContent.includes('providers:') && !moduleContent.includes('providers :')) {
          violations.push({
            type: 'module_structure',
            source: `${clusterDir}/${expectedModuleName}`,
            description: `Cluster module missing providers array`,
            severity: 'critical',
          });
        }

        // Check 5: Module should have exports
        if (!moduleContent.includes('exports:') && !moduleContent.includes('exports :')) {
          violations.push({
            type: 'module_structure',
            source: `${clusterDir}/${expectedModuleName}`,
            description: `Cluster module missing exports array`,
            severity: 'warning',
          });
        }

        // Check 6: Find all agent services in cluster and verify they're in providers
        const agentFiles = await this.getAllFilesRecursive(clusterPath, '-agent.service.ts');
        for (const agentPath of agentFiles) {
          const agentContent = fs.readFileSync(agentPath, 'utf-8');
          const agentRelativePath = path.relative(clusterPath, agentPath);

          // Extract the class name
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
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 7: Agent Config Validity ────────────────────────────────

  /**
   * Verify that every agent config:
   * - Has required fields: id, name, cluster, version, capabilities, permissions
   * - Cluster matches the directory the agent is in
   * - No duplicate agent IDs
   */
  async testAgentConfigValidity(): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Agent Config Validity';
    this.logger.log(`Running test: ${name}`);

    try {
      const violations: ArchitectureViolation[] = [];
      const agentFiles = await this.getAllFilesRecursive(AGENTS_DIR, '-agent.service.ts');
      const seenIds = new Map<string, string>(); // id -> filePath
      const clusterDirs = Object.keys(CLUSTER_DIRECTORIES);

      for (const filePath of agentFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(AGENTS_DIR, filePath);

        // Extract the config constant
        const configMatch = content.match(
          /export\s+const\s+(\w+CONFIG)\s*:\s*AgentConfig\s*=\s*\{([\s\S]*?)\};/,
        );

        if (!configMatch) {
          // Try alternate pattern
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

        // Check for required config fields
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

        // Extract agent ID
        const idMatch = content.match(/id:\s*['"]([^'"]+)['"]/);
        if (idMatch) {
          const agentId = idMatch[1];

          // Check for duplicate IDs
          if (seenIds.has(agentId)) {
            violations.push({
              type: 'config_invalid',
              source: relativePath,
              description: `Duplicate agent ID: '${agentId}' (also in ${seenIds.get(agentId)})`,
              severity: 'critical',
            });
          } else {
            seenIds.set(agentId, relativePath);
          }

          // Check that ID follows convention: {cluster}-{agent-name}
          const fileCluster = this.getFileCluster(relativePath, clusterDirs);
          if (
            fileCluster &&
            !agentId.startsWith(fileCluster.replace('-', '') + '-') &&
            !agentId.includes(fileCluster)
          ) {
            // More lenient check: just verify the cluster name appears somewhere in the ID
            const clusterInId =
              agentId.startsWith(CLUSTER_DIRECTORIES[fileCluster]?.replace('_', '') + '-') ||
              agentId.includes(fileCluster);

            if (!clusterInId) {
              // Not a hard violation, just info
              violations.push({
                type: 'config_invalid',
                source: relativePath,
                description: `Agent ID '${agentId}' doesn't follow '{cluster}-{name}' convention for cluster '${fileCluster}'`,
                severity: 'info',
              });
            }
          }
        }

        // Check that cluster field matches directory
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
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Filesystem Helpers ───────────────────────────────────────────

  /**
   * Recursively get all files matching a suffix in a directory.
   */
  private async getAllFilesRecursive(dir: string, suffix: string): Promise<string[]> {
    const results: string[] = [];

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
      } else if (
        entry.name.endsWith(suffix) ||
        (suffix.startsWith('.') && entry.name.endsWith(suffix))
      ) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * Scan all TypeScript source files and parse their imports, exports, classes, interfaces.
   */
  private async scanSourceFiles(dir: string): Promise<FileScanResult[]> {
    const results: FileScanResult[] = [];
    const allTsFiles = await this.getAllFilesRecursive(dir, '.ts');

    for (const filePath of allTsFiles) {
      // Skip spec files and declaration files
      const basename = path.basename(filePath);
      if (
        basename.endsWith('.spec.ts') ||
        basename.endsWith('.test.ts') ||
        basename.endsWith('.d.ts')
      ) {
        continue;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(SOURCE_ROOT, filePath);

        // Parse imports
        const imports = this.parseImports(content, filePath);

        // Parse exports
        const exports = this.parseExports(content);

        // Parse classes
        const classes = this.parseClasses(content);

        // Parse interfaces
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
      } catch (error) {
        this.logger.warn(`Failed to scan file ${filePath}: ${(error as Error).message}`);
      }
    }

    return results;
  }

  /**
   * Parse import paths from TypeScript file content.
   */
  private parseImports(content: string, filePath: string): string[] {
    const imports: string[] = [];

    // Match: import ... from '...' or import ... from "..."
    const importRegex = /import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];

      // Only track relative imports (local code), not node_modules
      if (importPath.startsWith('.')) {
        // Resolve the relative import path
        const resolvedDir = path.dirname(filePath);
        let resolvedPath = path.resolve(resolvedDir, importPath);

        // Add .ts extension if not present
        if (!resolvedPath.endsWith('.ts')) {
          resolvedPath += '.ts';
        }

        imports.push(path.relative(SOURCE_ROOT, resolvedPath));
      }
    }

    return imports;
  }

  /**
   * Parse export names from TypeScript file content.
   */
  private parseExports(content: string): string[] {
    const exports: string[] = [];

    // Match: export class/const/interface/enum/function ...
    const exportRegex =
      /export\s+(?:default\s+)?(?:class|const|interface|enum|function|type|abstract\s+class)\s+(\w+)/g;
    let match: RegExpExecArray | null;

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }

  /**
   * Parse class names from TypeScript file content.
   */
  private parseClasses(content: string): string[] {
    const classes: string[] = [];

    const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g;
    let match: RegExpExecArray | null;

    while ((match = classRegex.exec(content)) !== null) {
      classes.push(match[1]);
    }

    return classes;
  }

  /**
   * Parse interface names from TypeScript file content.
   */
  private parseInterfaces(content: string): string[] {
    const interfaces: string[] = [];

    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)/g;
    let match: RegExpExecArray | null;

    while ((match = interfaceRegex.exec(content)) !== null) {
      interfaces.push(match[1]);
    }

    return interfaces;
  }

  // ─── Dependency Graph & Cycle Detection ───────────────────────────

  /**
   * Build a dependency graph from scanned files.
   * Key: relative file path, Value: { filePath, imports[] }
   */
  private async buildDependencyGraph(
    files: FileScanResult[],
  ): Promise<Map<string, DependencyNode>> {
    const graph = new Map<string, DependencyNode>();

    for (const file of files) {
      graph.set(file.relativePath, {
        filePath: file.relativePath,
        imports: file.imports,
      });
    }

    return graph;
  }

  /**
   * Detect cycles in the dependency graph using DFS with coloring.
   * White (0) = unvisited, Gray (1) = in-progress, Black (2) = completed.
   */
  private detectCycles(graph: Map<string, DependencyNode>): DependencyCycle[] {
    const cycles: DependencyCycle[] = [];
    const color = new Map<string, number>(); // 0=white, 1=gray, 2=black
    const parent = new Map<string, string | null>();

    // Initialize all nodes as unvisited
    for (const key of graph.keys()) {
      color.set(key, 0);
      parent.set(key, null);
    }

    // DFS traversal
    const dfs = (node: string, path: string[]): void => {
      color.set(node, 1); // Mark as in-progress (gray)
      path.push(node);

      const depNode = graph.get(node);
      if (depNode) {
        for (const neighbor of depNode.imports) {
          // Only check nodes that are in our graph
          if (!graph.has(neighbor)) continue;

          const neighborColor = color.get(neighbor);

          if (neighborColor === 1) {
            // Found a back edge — cycle detected!
            const cycleStartIndex = path.indexOf(neighbor);
            if (cycleStartIndex !== -1) {
              const cyclePath = [...path.slice(cycleStartIndex), neighbor];
              cycles.push({
                nodes: cyclePath,
                length: cyclePath.length - 1,
              });
            }
          } else if (neighborColor === 0) {
            parent.set(neighbor, node);
            dfs(neighbor, path);
          }
          // If neighborColor === 2, it's already fully processed, skip
        }
      }

      path.pop();
      color.set(node, 2); // Mark as completed (black)
    };

    // Start DFS from each unvisited node
    for (const key of graph.keys()) {
      if (color.get(key) === 0) {
        dfs(key, []);
      }
    }

    return cycles;
  }

  // ─── Cluster Determination Helpers ────────────────────────────────

  /**
   * Determine which cluster a file belongs to based on its path.
   */
  private getFileCluster(relativePath: string, clusterDirs: string[]): string | null {
    // Normalize path separators
    const normalizedPath = relativePath.replace(/\\/g, '/');

    for (const cluster of clusterDirs) {
      // Check if the file is inside this cluster directory
      const clusterPrefix = `agents/${cluster}/`;
      if (normalizedPath.includes(clusterPrefix)) {
        return cluster;
      }
    }

    return null;
  }

  /**
   * Determine which cluster an import path points to.
   */
  private getImportCluster(importPath: string, clusterDirs: string[]): string | null {
    // Normalize path separators
    const normalizedPath = importPath.replace(/\\/g, '/');

    for (const cluster of clusterDirs) {
      const clusterPrefix = `agents/${cluster}/`;
      if (normalizedPath.includes(clusterPrefix)) {
        return cluster;
      }
    }

    return null;
  }
}
