/**
 * AENEWS Agent OS X - EQI Calculator Service
 * Calculates the Enterprise Quality Index (EQI) from domain scores using
 * weighted sums, determines certification levels, and generates recommendations.
 */

import { Injectable, Logger } from '@nestjs/common';
import { CertificationLevel, CertificationDomain, DomainWeights, DomainResult } from './types';

@Injectable()
export class EqiCalculatorService {
  private readonly logger = new Logger(EqiCalculatorService.name);

  private readonly weights: DomainWeights = {
    architecture: 0.1,
    tests: 0.1,
    orchestration: 0.15,
    agents: 0.15,
    browser: 0.1,
    memory: 0.1,
    security: 0.15,
    performance: 0.1,
    documentation: 0.05,
  };

  /**
   * Calculate the EQI from domain scores using weighted sum.
   * EQI is a weighted average of all domain scores, with penalties
   * for critical failures.
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

      // Apply penalty for critical failures
      if (domain.criticalFailures.length > 0) {
        // Each critical failure reduces the EQI by 2 points
        criticalPenalty += domain.criticalFailures.length * 2;
        this.logger.warn(
          `Domain ${domain.domain} has ${domain.criticalFailures.length} critical failure(s): ` +
            domain.criticalFailures.join(', '),
        );
      }
    }

    if (totalWeight === 0) {
      this.logger.error('Total weight is zero, cannot calculate EQI');
      return 0;
    }

    // Normalize if not all domains are present
    // Domain scores are already 0-100, so weighted average is also 0-100
    const normalizedEqi = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Apply critical failure penalty (capped at 30 points max penalty)
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
   * Generate actionable recommendations based on weak domains.
   * Focuses on domains scoring below 90 or with critical failures.
   */
  generateRecommendations(domains: DomainResult[]): string[] {
    const recommendations: string[] = [];

    for (const domain of domains) {
      const domainName = domain.domain;

      // Critical failure recommendations (highest priority)
      if (domain.criticalFailures.length > 0) {
        for (const failure of domain.criticalFailures) {
          recommendations.push(
            `[CRITICAL] ${domainName}: ${failure} — Must be resolved before certification`,
          );
        }
      }

      // Score-based recommendations
      if (domain.score < 50) {
        recommendations.push(
          `${domainName}: Score of ${domain.score}/100 is critically low. ` +
            `Major refactoring required in this area.`,
        );
      } else if (domain.score < 70) {
        recommendations.push(
          `${domainName}: Score of ${domain.score}/100 needs significant improvement. ` +
            `Focus on addressing failing tests first.`,
        );
      } else if (domain.score < 90) {
        // Identify specific failing tests for targeted improvement
        const failedTests = domain.tests.filter((t) => !t.passed).map((t) => t.name);

        if (failedTests.length > 0) {
          recommendations.push(
            `${domainName}: Score of ${domain.score}/100 is close to passing. ` +
              `Focus on: ${failedTests.join(', ')}`,
          );
        } else {
          recommendations.push(
            `${domainName}: Score of ${domain.score}/100 — Review test weights and partial scores.`,
          );
        }
      }

      // Domain-specific recommendations
      recommendations.push(...this.getDomainSpecificRecommendations(domain));
    }

    // Sort: critical first, then by domain score ascending
    const critical = recommendations.filter((r) => r.startsWith('[CRITICAL]'));
    const nonCritical = recommendations.filter((r) => !r.startsWith('[CRITICAL]'));

    return [...critical, ...nonCritical];
  }

  /**
   * Identify all critical failures across all domains.
   */
  identifyCriticalFailures(domains: DomainResult[]): string[] {
    const failures: string[] = [];

    for (const domain of domains) {
      for (const failure of domain.criticalFailures) {
        failures.push(`[${domain.domain}] ${failure}`);
      }
    }

    if (failures.length > 0) {
      this.logger.error(`Found ${failures.length} critical failure(s): ${failures.join('; ')}`);
    }

    return failures;
  }

  /**
   * Get the weight for a specific domain.
   */
  getWeight(domain: CertificationDomain): number {
    return this.weights[domain as keyof DomainWeights] ?? 0;
  }

  /**
   * Get all domain weights.
   */
  getWeights(): DomainWeights {
    return { ...this.weights };
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  private getDomainSpecificRecommendations(domain: DomainResult): string[] {
    const recs: string[] = [];

    switch (domain.domain) {
      case CertificationDomain.ARCHITECTURE:
        if (domain.score < 90) {
          recs.push(
            'Architecture: Review circular dependencies, cross-cluster imports, ' +
              'and naming conventions. Run architect-certification for details.',
          );
        }
        break;

      case CertificationDomain.TESTS:
        if (domain.score < 90) {
          recs.push(
            'Tests: Increase test coverage, especially for agent lifecycle methods ' +
              'and error handling paths.',
          );
        }
        break;

      case CertificationDomain.ORCHESTRATION:
        if (domain.score < 90) {
          recs.push(
            'Orchestration: Verify task decomposition, planning, execution, ' +
              'critique-repair loop, and delivery pipeline.',
          );
        }
        break;

      case CertificationDomain.AGENTS:
        if (domain.score < 90) {
          recs.push(
            'Agents: Ensure all agents extend BaseAgentService, implement required methods, ' +
              'and register tools properly.',
          );
        }
        break;

      case CertificationDomain.BROWSER:
        if (domain.score < 90) {
          recs.push(
            'Browser: Verify all 17 browser agents are functional with proper tool registration.',
          );
        }
        break;

      case CertificationDomain.MEMORY:
        if (domain.score < 90) {
          recs.push(
            'Memory: Check working, session, and long-term memory tiers. ' +
              'Verify RAG, knowledge graph, and vector search services.',
          );
        }
        break;

      case CertificationDomain.SECURITY:
        if (domain.score < 90) {
          recs.push(
            'Security: Review authentication, authorization, encryption, ' +
              'audit logging, and threat detection capabilities.',
          );
        }
        break;

      case CertificationDomain.PERFORMANCE:
        if (domain.score < 90) {
          recs.push(
            'Performance: Profile agent execution times, memory consumption, ' +
              'and concurrent task handling.',
          );
        }
        break;

      case CertificationDomain.DOCUMENTATION:
        if (domain.score < 90) {
          recs.push(
            'Documentation: Ensure all agents have JSDoc comments, ' +
              'interfaces are documented, and API docs are up to date.',
          );
        }
        break;
    }

    return recs;
  }
}
