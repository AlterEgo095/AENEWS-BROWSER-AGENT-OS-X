/**
 * AENEWS Agent OS X - EQI Calculator Service Unit Tests
 * Tests EQI calculation, certification levels, milestones,
 * recommendations, critical failures, and weight validation.
 */

import { EqiCalculatorService } from '../../src/certification/eqi-calculator.service';
import {
  CertificationLevel,
  CertificationDomain,
  DomainResult,
  EqiMilestone,
} from '../../src/certification/types';

// ─── Helper: Create a DomainResult ──────────────────────────────────

function createDomainResult(
  domain: CertificationDomain,
  score: number,
  criticalFailures: string[] = [],
  tests: Array<{ name: string; passed: boolean; score: number; durationMs: number }> = [],
): DomainResult {
  return {
    domain,
    weight: 0,
    score,
    tests: tests.map((t) => ({
      name: t.name,
      passed: t.passed,
      score: t.score,
      durationMs: t.durationMs,
    })),
    passed: score >= 70,
    criticalFailures,
  };
}

// ─── Helper: Create all domains with a given score ──────────────────

function createAllDomains(score: number, criticalFailures: string[] = []): DomainResult[] {
  return Object.values(CertificationDomain).map((domain) =>
    createDomainResult(domain, score, criticalFailures),
  );
}

// ─── Test Suite ─────────────────────────────────────────────────────

describe('EqiCalculatorService', () => {
  let service: EqiCalculatorService;

  beforeEach(() => {
    service = new EqiCalculatorService();
  });

  // ─── calculateEqi ─────────────────────────────────────────────────

  describe('calculateEqi', () => {
    it('should return 0 for empty domains', () => {
      const eqi = service.calculateEqi([]);
      expect(eqi).toBe(0);
    });

    it('should return 0 for all-zero scores', () => {
      const domains = createAllDomains(0);
      const eqi = service.calculateEqi(domains);
      expect(eqi).toBe(0);
    });

    it('should return ~100 for perfect scores', () => {
      const domains = createAllDomains(100);
      const eqi = service.calculateEqi(domains);
      expect(eqi).toBe(100);
    });

    it('should calculate weighted EQI correctly for mixed scores', () => {
      const domains = [
        createDomainResult(CertificationDomain.ARCHITECTURE, 90),
        createDomainResult(CertificationDomain.AGENTS, 85),
        createDomainResult(CertificationDomain.ORCHESTRATION, 95),
        createDomainResult(CertificationDomain.BROWSER, 80),
        createDomainResult(CertificationDomain.MEMORY, 90),
        createDomainResult(CertificationDomain.SECURITY, 88),
        createDomainResult(CertificationDomain.PERFORMANCE, 75),
        createDomainResult(CertificationDomain.TESTS, 70),
        createDomainResult(CertificationDomain.DOCUMENTATION, 60),
        createDomainResult(CertificationDomain.OBSERVABILITY, 65),
      ];
      const eqi = service.calculateEqi(domains);
      expect(eqi).toBeGreaterThan(0);
      expect(eqi).toBeLessThan(100);
    });

    it('should skip unknown domains', () => {
      const domains = [
        createDomainResult('unknown_domain' as CertificationDomain, 100),
      ];
      const eqi = service.calculateEqi(domains);
      expect(eqi).toBe(0); // No known domains, so totalWeight = 0
    });

    it('should handle partial domain coverage', () => {
      const domains = [
        createDomainResult(CertificationDomain.SECURITY, 100),
        createDomainResult(CertificationDomain.ORCHESTRATION, 100),
      ];
      const eqi = service.calculateEqi(domains);
      expect(eqi).toBeGreaterThan(0);
    });

    it('should apply penalty for critical failures', () => {
      const domainsClean = createAllDomains(100);
      const eqiClean = service.calculateEqi(domainsClean);

      const domainsWithFailures = createAllDomains(100, ['Critical failure detected']);
      const eqiWithFailures = service.calculateEqi(domainsWithFailures);

      expect(eqiWithFailures).toBeLessThan(eqiClean);
    });

    it('should cap penalty at 30 points', () => {
      // 20 critical failures would be 20*2=40 penalty, but capped at 30
      const domains = createAllDomains(100, Array(20).fill('Critical failure'));
      const eqi = service.calculateEqi(domains);
      // Max penalty is 30, so EQI should be max(0, 100 - 30) = 70
      expect(eqi).toBeGreaterThanOrEqual(70);
    });

    it('should not return negative EQI', () => {
      const domains = createAllDomains(0, Array(20).fill('Failure'));
      const eqi = service.calculateEqi(domains);
      expect(eqi).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── determineLevel ───────────────────────────────────────────────

  describe('determineLevel', () => {
    it('should return PLATINUM for EQI >= 98', () => {
      expect(service.determineLevel(98)).toBe(CertificationLevel.PLATINUM);
      expect(service.determineLevel(99)).toBe(CertificationLevel.PLATINUM);
      expect(service.determineLevel(100)).toBe(CertificationLevel.PLATINUM);
    });

    it('should return GOLD for EQI >= 95 and < 98', () => {
      expect(service.determineLevel(95)).toBe(CertificationLevel.GOLD);
      expect(service.determineLevel(96)).toBe(CertificationLevel.GOLD);
      expect(service.determineLevel(97.9)).toBe(CertificationLevel.GOLD);
    });

    it('should return SILVER for EQI >= 90 and < 95', () => {
      expect(service.determineLevel(90)).toBe(CertificationLevel.SILVER);
      expect(service.determineLevel(92)).toBe(CertificationLevel.SILVER);
      expect(service.determineLevel(94.9)).toBe(CertificationLevel.SILVER);
    });

    it('should return REJECTED for EQI < 90', () => {
      expect(service.determineLevel(89)).toBe(CertificationLevel.REJECTED);
      expect(service.determineLevel(50)).toBe(CertificationLevel.REJECTED);
      expect(service.determineLevel(0)).toBe(CertificationLevel.REJECTED);
    });
  });

  // ─── determineMilestone ───────────────────────────────────────────

  describe('determineMilestone', () => {
    it('should return AUTONOMOUS_ENTERPRISE for EQI >= 99.5', () => {
      expect(service.determineMilestone(99.5)).toBe(EqiMilestone.AUTONOMOUS_ENTERPRISE);
      expect(service.determineMilestone(100)).toBe(EqiMilestone.AUTONOMOUS_ENTERPRISE);
    });

    it('should return PLATINUM for EQI >= 98 and < 99.5', () => {
      expect(service.determineMilestone(98)).toBe(EqiMilestone.PLATINUM);
      expect(service.determineMilestone(99)).toBe(EqiMilestone.PLATINUM);
    });

    it('should return GOLD for EQI >= 95 and < 98', () => {
      expect(service.determineMilestone(95)).toBe(EqiMilestone.GOLD);
      expect(service.determineMilestone(97)).toBe(EqiMilestone.GOLD);
    });

    it('should return SILVER for EQI >= 90 and < 95', () => {
      expect(service.determineMilestone(90)).toBe(EqiMilestone.SILVER);
      expect(service.determineMilestone(93)).toBe(EqiMilestone.SILVER);
    });

    it('should return MVP_ENTERPRISE for EQI >= 85 and < 90', () => {
      expect(service.determineMilestone(85)).toBe(EqiMilestone.MVP_ENTERPRISE);
      expect(service.determineMilestone(88)).toBe(EqiMilestone.MVP_ENTERPRISE);
    });

    it('should return ARCHITECTURE_STABLE for EQI >= 75 and < 85', () => {
      expect(service.determineMilestone(75)).toBe(EqiMilestone.ARCHITECTURE_STABLE);
      expect(service.determineMilestone(80)).toBe(EqiMilestone.ARCHITECTURE_STABLE);
    });

    it('should return null for EQI < 75', () => {
      expect(service.determineMilestone(74)).toBeNull();
      expect(service.determineMilestone(50)).toBeNull();
      expect(service.determineMilestone(0)).toBeNull();
    });
  });

  // ─── generateRecommendations ──────────────────────────────────────

  describe('generateRecommendations', () => {
    it('should generate critical recommendations for critical failures', () => {
      const domains = [
        createDomainResult(CertificationDomain.SECURITY, 60, ['SQL injection vulnerability detected']),
      ];
      const recs = service.generateRecommendations(domains);
      expect(recs.some((r) => r.startsWith('[CRITICAL]'))).toBe(true);
      expect(recs.some((r) => r.includes('SQL injection'))).toBe(true);
    });

    it('should generate recommendations for critically low scores (< 50)', () => {
      const domains = [
        createDomainResult(CertificationDomain.PERFORMANCE, 30),
      ];
      const recs = service.generateRecommendations(domains);
      expect(recs.some((r) => r.includes('critically low'))).toBe(true);
    });

    it('should generate recommendations for low scores (< 70)', () => {
      const domains = [
        createDomainResult(CertificationDomain.TESTS, 55),
      ];
      const recs = service.generateRecommendations(domains);
      expect(recs.some((r) => r.includes('needs significant improvement'))).toBe(true);
    });

    it('should generate recommendations for medium scores (< 90) with failed tests', () => {
      const domains = [
        createDomainResult(CertificationDomain.BROWSER, 80, [], [
          { name: 'test-navigation', passed: false, score: 60, durationMs: 100 },
          { name: 'test-click', passed: true, score: 100, durationMs: 50 },
        ]),
      ];
      const recs = service.generateRecommendations(domains);
      expect(recs.some((r) => r.includes('Focus on'))).toBe(true);
    });

    it('should prioritize critical recommendations first', () => {
      const domains = [
        createDomainResult(CertificationDomain.SECURITY, 40, ['Vulnerability found']),
        createDomainResult(CertificationDomain.TESTS, 60),
      ];
      const recs = service.generateRecommendations(domains);
      const firstCriticalIdx = recs.findIndex((r) => r.startsWith('[CRITICAL]'));
      const firstNonCriticalIdx = recs.findIndex((r) => !r.startsWith('[CRITICAL]'));
      if (firstCriticalIdx >= 0 && firstNonCriticalIdx >= 0) {
        expect(firstCriticalIdx).toBeLessThan(firstNonCriticalIdx);
      }
    });

    it('should generate domain-specific recommendations', () => {
      const domains = [
        createDomainResult(CertificationDomain.ARCHITECTURE, 80),
      ];
      const recs = service.generateRecommendations(domains);
      expect(recs.some((r) => r.includes('Dependency Analyzer'))).toBe(true);
    });

    it('should generate security domain recommendation', () => {
      const domains = [
        createDomainResult(CertificationDomain.SECURITY, 80),
      ];
      const recs = service.generateRecommendations(domains);
      expect(recs.some((r) => r.includes('Security Gateway'))).toBe(true);
    });
  });

  // ─── identifyCriticalFailures ─────────────────────────────────────

  describe('identifyCriticalFailures', () => {
    it('should identify critical failures across domains', () => {
      const domains = [
        createDomainResult(CertificationDomain.SECURITY, 60, ['SQL injection', 'XSS vulnerability']),
        createDomainResult(CertificationDomain.MEMORY, 90, []),
      ];
      const failures = service.identifyCriticalFailures(domains);
      expect(failures).toHaveLength(2);
      expect(failures[0]).toContain('[security]');
      expect(failures[0]).toContain('SQL injection');
      expect(failures[1]).toContain('[security]');
      expect(failures[1]).toContain('XSS vulnerability');
    });

    it('should return empty array for no critical failures', () => {
      const domains = createAllDomains(100);
      const failures = service.identifyCriticalFailures(domains);
      expect(failures).toEqual([]);
    });
  });

  // ─── weights ──────────────────────────────────────────────────────

  describe('weights', () => {
    it('should have all 10 domain weights defined', () => {
      const weights = service.getWeights();
      const keys = Object.keys(weights);
      expect(keys).toHaveLength(10);
    });

    it('should have weights summing to 1.0', () => {
      const weights = service.getWeights();
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    });

    it('should have security and orchestration as highest weights', () => {
      const weights = service.getWeights();
      expect(weights.security).toBe(0.15);
      expect(weights.orchestration).toBe(0.15);
    });

    it('should return individual weight by domain', () => {
      expect(service.getWeight(CertificationDomain.SECURITY)).toBe(0.15);
      expect(service.getWeight(CertificationDomain.ARCHITECTURE)).toBe(0.08);
      expect(service.getWeight(CertificationDomain.DOCUMENTATION)).toBe(0.05);
    });

    it('should return 0 for unknown domain', () => {
      expect(service.getWeight('unknown' as CertificationDomain)).toBe(0);
    });
  });

  // ─── EQI penalty for critical failures ────────────────────────────

  describe('EQI penalty for critical failures', () => {
    it('should deduct 2 points per critical failure', () => {
      const domainsNoFailures = createAllDomains(100);
      const eqiNoFailures = service.calculateEqi(domainsNoFailures);

      const domainsWith1Failure = createAllDomains(100, ['One failure']);
      const eqiWith1Failure = service.calculateEqi(domainsWith1Failure);

      // Each domain gets a 2-point penalty per failure
      // 10 domains * 1 failure * 2 = 20 penalty (but capped at 30)
      // Actually it's totalFailures * 2, so 10 * 1 * 2 = 20
      expect(eqiWith1Failure).toBeLessThan(eqiNoFailures);
    });

    it('should cap total penalty at 30', () => {
      // 20 total critical failures => 40 penalty, capped at 30
      const manyFailures = Array(20).fill('Critical failure');
      const domains = createAllDomains(100, manyFailures);
      const eqi = service.calculateEqi(domains);
      // 100 - 30 = 70 (penalty capped at 30)
      expect(eqi).toBeGreaterThanOrEqual(70);
    });
  });
});
