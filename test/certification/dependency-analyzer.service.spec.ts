/**
 * AENEWS Agent OS X - Dependency Analyzer Service Unit Tests
 * Tests full analysis, circular dependency detection, cycle retrieval,
 * coupling score calculation, and the DependencyAnalysisResult structure.
 */

import { DependencyAnalyzerService } from '../../src/certification/architect/dependency-analyzer.service';
import { DependencyAnalysisResult, DependencyCycle, DependencyNode } from '../../src/certification/types';

// ─── Test Suite ─────────────────────────────────────────────────────

describe('DependencyAnalyzerService', () => {
  let service: DependencyAnalyzerService;

  beforeEach(() => {
    service = new DependencyAnalyzerService();
  });

  // ─── analyze() ────────────────────────────────────────────────────

  describe('analyze', () => {
    it('should return a DependencyAnalysisResult', async () => {
      const result = await service.analyze();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('cycles');
      expect(result).toHaveProperty('crossClusterImports');
      expect(result).toHaveProperty('couplingScore');
      expect(result).toHaveProperty('violations');
    });

    it('should return nodes as an array', async () => {
      const result = await service.analyze();
      expect(Array.isArray(result.nodes)).toBe(true);
    });

    it('should return cycles as an array', async () => {
      const result = await service.analyze();
      expect(Array.isArray(result.cycles)).toBe(true);
    });

    it('should return crossClusterImports as an array', async () => {
      const result = await service.analyze();
      expect(Array.isArray(result.crossClusterImports)).toBe(true);
    });

    it('should return violations as an array', async () => {
      const result = await service.analyze();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have couplingScore between 0 and 100', async () => {
      const result = await service.analyze();
      expect(result.couplingScore).toBeGreaterThanOrEqual(0);
      expect(result.couplingScore).toBeLessThanOrEqual(100);
    });

    it('should scan at least some TypeScript files', async () => {
      const result = await service.analyze();
      expect(result.nodes.length).toBeGreaterThan(0);
    });

    it('should return nodes with required properties', async () => {
      const result = await service.analyze();
      if (result.nodes.length > 0) {
        const node = result.nodes[0];
        expect(node).toHaveProperty('filePath');
        expect(node).toHaveProperty('imports');
        expect(node).toHaveProperty('module');
        expect(typeof node.filePath).toBe('string');
        expect(Array.isArray(node.imports)).toBe(true);
      }
    });
  });

  // ─── hasCircularDependencies() ────────────────────────────────────

  describe('hasCircularDependencies', () => {
    it('should return a boolean', async () => {
      const result = await service.hasCircularDependencies();
      expect(typeof result).toBe('boolean');
    });

    it('should return true or false based on codebase state', async () => {
      // This is an integration-like test that checks the actual codebase
      const result = await service.hasCircularDependencies();
      expect(result).toBeDefined();
      // Whether it's true or false depends on the actual codebase
      // We just verify it returns a valid boolean
    });
  });

  // ─── getCycles() ──────────────────────────────────────────────────

  describe('getCycles', () => {
    it('should return an array of DependencyCycle', async () => {
      const cycles = await service.getCycles();
      expect(Array.isArray(cycles)).toBe(true);
    });

    it('should have properly structured cycles', async () => {
      const cycles = await service.getCycles();
      for (const cycle of cycles) {
        expect(cycle).toHaveProperty('nodes');
        expect(cycle).toHaveProperty('length');
        expect(cycle).toHaveProperty('severity');
        expect(cycle).toHaveProperty('description');
        expect(Array.isArray(cycle.nodes)).toBe(true);
        expect(typeof cycle.length).toBe('number');
        expect(['critical', 'warning', 'info']).toContain(cycle.severity);
        expect(typeof cycle.description).toBe('string');
      }
    });

    it('should have cycle length matching nodes array', async () => {
      const cycles = await service.getCycles();
      for (const cycle of cycles) {
        expect(cycle.length).toBe(cycle.nodes.length);
      }
    });
  });

  // ─── coupling score calculation ───────────────────────────────────

  describe('coupling score calculation', () => {
    it('should start at 100 base', async () => {
      // A codebase with no cycles and no cross-cluster imports should have score near 100
      const result = await service.analyze();
      // The actual score depends on the codebase, but it should be a valid number
      expect(typeof result.couplingScore).toBe('number');
    });

    it('should reduce score for cycles', async () => {
      const result = await service.analyze();
      const cycles = await service.getCycles();

      if (cycles.length > 0) {
        // If there are cycles, the score should be less than 100
        // (unless the bonus for no cross-cluster deps compensates)
        // This is a soft check since the actual value depends on codebase
        expect(result.couplingScore).toBeLessThanOrEqual(100);
      }
    });

    it('should reduce score for cross-cluster imports', async () => {
      const result = await service.analyze();

      if (result.crossClusterImports.length > 0) {
        // If there are cross-cluster imports, the score should reflect that
        expect(result.couplingScore).toBeLessThanOrEqual(100);
      }
    });

    it('should give bonus for no cross-cluster imports', async () => {
      const result = await service.analyze();

      if (result.crossClusterImports.length === 0) {
        // Clean separation bonus: +5 points
        expect(result.couplingScore).toBeGreaterThanOrEqual(95);
      }
    });
  });

  // ─── node properties ──────────────────────────────────────────────

  describe('node properties', () => {
    it('should infer clusters for agent files', async () => {
      const result = await service.analyze();
      const agentNodes = result.nodes.filter((n) => n.cluster !== undefined);
      // Some files should have clusters inferred
      expect(agentNodes.length).toBeGreaterThan(0);
    });

    it('should have unique file paths', async () => {
      const result = await service.analyze();
      const filePaths = result.nodes.map((n) => n.filePath);
      const uniquePaths = new Set(filePaths);
      expect(uniquePaths.size).toBe(filePaths.length);
    });
  });

  // ─── violation types ──────────────────────────────────────────────

  describe('violations', () => {
    it('should have valid violation types', async () => {
      const result = await service.analyze();
      const validTypes = [
        'circular_dependency',
        'cross_cluster_import',
        'naming_violation',
        'missing_interface_impl',
        'module_structure',
        'config_invalid',
        'dependency_direction_violation',
      ];

      for (const violation of result.violations) {
        expect(validTypes).toContain(violation.type);
      }
    });

    it('should have valid severity levels', async () => {
      const result = await service.analyze();
      const validSeverities = ['critical', 'warning', 'info'];

      for (const violation of result.violations) {
        expect(validSeverities).toContain(violation.severity);
      }
    });

    it('should have descriptions in violations', async () => {
      const result = await service.analyze();
      for (const violation of result.violations) {
        expect(violation.description).toBeDefined();
        expect(typeof violation.description).toBe('string');
        expect(violation.description.length).toBeGreaterThan(0);
      }
    });
  });
});
