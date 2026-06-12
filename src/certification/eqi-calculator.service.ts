/**
 * AENEWS Agent OS X - EQI Calculator Service
 * Calculates the Enterprise Quality Index (EQI) from domain scores using
 * weighted sums, determines certification levels, and generates recommendations.
 *
 * v2 Weights:
 *   Architecture   8%   Agents        12%   Orchestration 15%
 *   Browser       10%   Memory        12%   Security      15%
 *   Performance    8%   Tests         10%   Documentation  5%
 *   Observability  5%
 */

import { Injectable, Logger } from '@nestjs/common';
import { CertificationLevel, CertificationDomain, DomainWeights, DomainResult, EqiMilestone } from './types';

@Injectable()
export class EqiCalculatorService {
  private readonly logger = new Logger(EqiCalculatorService.name);

  private readonly weights: DomainWeights = {
    architecture: 0.08,
    agents: 0.12,
    orchestration: 0.15,
    browser: 0.10,
    memory: 0.12,
    security: 0.15,
    performance: 0.08,
    tests: 0.10,
    documentation: 0.05,
    observability: 0.05,
  };

  /**
   * Calculate the EQI from domain scores using weighted sum.
   */
  calculateEqi(domains: DomainResult[]): number {
    if (domains.length === 0) {
      this.logger.warn('No domains provided for EQI calculation');
      return 0;
    }

    let weightedSum = 0;
    let totalWeight = 0;
    let criticalPenalty = 0;

    for (const domain of domains) {
      const weight = this.weights[domain.domain as keyof DomainWeights];
      if (weight === undefined) {
        this.logger.warn(`Unknown domain: ${domain.domain}, skipping`);
        continue;
      }

      weightedSum += domain.score * weight;
      totalWeight += weight;

      // Penalty for critical failures
      if (domain.criticalFailures.length > 0) {
        criticalPenalty += domain.criticalFailures.length * 2;
        this.logger.warn(
          `Domain ${domain.domain} has ${domain.criticalFailures.length} critical failure(s)`,
        );
      }
    }

    if (totalWeight === 0) return 0;

    const normalizedEqi = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const penalty = Math.min(criticalPenalty, 30);
    const eqi = Math.max(0, normalizedEqi - penalty);

    this.logger.log(
      `EQI calculated: ${eqi.toFixed(2)} (raw: ${normalizedEqi.toFixed(2)}, penalty: -${penalty})`,
    );

    return Math.round(eqi * 100) / 100;
  }

  /**
   * Determine the certification level based on EQI score.
   */
  determineLevel(eqi: number): CertificationLevel {
    if (eqi >= 98) return CertificationLevel.PLATINUM;
    if (eqi >= 95) return CertificationLevel.GOLD;
    if (eqi >= 90) return CertificationLevel.SILVER;
    return CertificationLevel.REJECTED;
  }

  /**
   * Determine the milestone achieved.
   */
  determineMilestone(eqi: number): EqiMilestone | null {
    if (eqi >= 99.5) return EqiMilestone.AUTONOMOUS_ENTERPRISE;
    if (eqi >= 98) return EqiMilestone.PLATINUM;
    if (eqi >= 95) return EqiMilestone.GOLD;
    if (eqi >= 90) return EqiMilestone.SILVER;
    if (eqi >= 85) return EqiMilestone.MVP_ENTERPRISE;
    if (eqi >= 75) return EqiMilestone.ARCHITECTURE_STABLE;
    return null;
  }

  /**
   * Generate actionable recommendations based on weak domains.
   */
  generateRecommendations(domains: DomainResult[]): string[] {
    const recommendations: string[] = [];

    for (const domain of domains) {
      if (domain.criticalFailures.length > 0) {
        for (const failure of domain.criticalFailures) {
          recommendations.push(`[CRITICAL] ${domain.domain}: ${failure}`);
        }
      }

      if (domain.score < 50) {
        recommendations.push(`${domain.domain}: Score of ${domain.score}/100 is critically low.`);
      } else if (domain.score < 70) {
        recommendations.push(`${domain.domain}: Score of ${domain.score}/100 needs significant improvement.`);
      } else if (domain.score < 90) {
        const failedTests = domain.tests.filter((t) => !t.passed).map((t) => t.name);
        if (failedTests.length > 0) {
          recommendations.push(`${domain.domain}: Score ${domain.score}/100. Focus on: ${failedTests.join(', ')}`);
        }
      }

      recommendations.push(...this.getDomainSpecificRecommendations(domain));
    }

    const critical = recommendations.filter((r) => r.startsWith('[CRITICAL]'));
    const nonCritical = recommendations.filter((r) => !r.startsWith('[CRITICAL]'));
    return [...critical, ...nonCritical];
  }

  identifyCriticalFailures(domains: DomainResult[]): string[] {
    const failures: string[] = [];
    for (const domain of domains) {
      for (const failure of domain.criticalFailures) {
        failures.push(`[${domain.domain}] ${failure}`);
      }
    }
    return failures;
  }

  getWeight(domain: CertificationDomain): number {
    return this.weights[domain as keyof DomainWeights] ?? 0;
  }

  getWeights(): DomainWeights {
    return { ...this.weights };
  }

  private getDomainSpecificRecommendations(domain: DomainResult): string[] {
    const recs: string[] = [];

    switch (domain.domain) {
      case CertificationDomain.ARCHITECTURE:
        if (domain.score < 90) recs.push('Architecture: Run Dependency Analyzer to detect circular dependencies and coupling violations.');
        break;
      case CertificationDomain.AGENTS:
        if (domain.score < 90) recs.push('Agents: Verify all agents extend BaseAgentService, implement required methods, and register tools.');
        break;
      case CertificationDomain.ORCHESTRATION:
        if (domain.score < 90) recs.push('Orchestration: Test the full pipeline decompose→plan→execute→critique→repair→validate→deliver.');
        break;
      case CertificationDomain.BROWSER:
        if (domain.score < 90) recs.push('Browser: Validate all 17 browser agents with functional tests.');
        break;
      case CertificationDomain.MEMORY:
        if (domain.score < 90) recs.push('Memory: Verify Unified Memory Gateway with store/retrieve/search/summarize/promote/archive API. Test cross-tier retrieval.');
        break;
      case CertificationDomain.SECURITY:
        if (domain.score < 90) recs.push('Security: Verify Security Gateway pipeline: Validation→Sanitization→Policy→Permission→Execution. Test injection prevention.');
        break;
      case CertificationDomain.PERFORMANCE:
        if (domain.score < 90) recs.push('Performance: Profile execution times, memory, CPU, concurrent agents, and event bus throughput.');
        break;
      case CertificationDomain.TESTS:
        if (domain.score < 90) recs.push('Tests: Increase unit, integration, E2E coverage. Each agent should have its own test folder.');
        break;
      case CertificationDomain.DOCUMENTATION:
        if (domain.score < 90) recs.push('Documentation: Run auto-generation. Ensure JSDoc, OpenAPI, Mermaid diagrams, ADR, README.');
        break;
      case CertificationDomain.OBSERVABILITY:
        if (domain.score < 90) recs.push('Observability: Verify metrics collection, distributed tracing, structured logging, and alerting.');
        break;
    }

    return recs;
  }
}
