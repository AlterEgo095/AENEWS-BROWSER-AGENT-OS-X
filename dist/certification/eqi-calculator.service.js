"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EqiCalculatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EqiCalculatorService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("./types");
let EqiCalculatorService = EqiCalculatorService_1 = class EqiCalculatorService {
    constructor() {
        this.logger = new common_1.Logger(EqiCalculatorService_1.name);
        this.weights = {
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
    }
    calculateEqi(domains) {
        if (domains.length === 0) {
            this.logger.warn('No domains provided for EQI calculation');
            return 0;
        }
        let weightedSum = 0;
        let totalWeight = 0;
        let criticalPenalty = 0;
        for (const domain of domains) {
            const weight = this.weights[domain.domain];
            if (weight === undefined) {
                this.logger.warn(`Unknown domain: ${domain.domain}, skipping`);
                continue;
            }
            weightedSum += domain.score * weight;
            totalWeight += weight;
            if (domain.criticalFailures.length > 0) {
                criticalPenalty += domain.criticalFailures.length * 2;
                this.logger.warn(`Domain ${domain.domain} has ${domain.criticalFailures.length} critical failure(s)`);
            }
        }
        if (totalWeight === 0)
            return 0;
        const normalizedEqi = totalWeight > 0 ? weightedSum / totalWeight : 0;
        const penalty = Math.min(criticalPenalty, 30);
        const eqi = Math.max(0, normalizedEqi - penalty);
        this.logger.log(`EQI calculated: ${eqi.toFixed(2)} (raw: ${normalizedEqi.toFixed(2)}, penalty: -${penalty})`);
        return Math.round(eqi * 100) / 100;
    }
    determineLevel(eqi) {
        if (eqi >= 98)
            return types_1.CertificationLevel.PLATINUM;
        if (eqi >= 95)
            return types_1.CertificationLevel.GOLD;
        if (eqi >= 90)
            return types_1.CertificationLevel.SILVER;
        return types_1.CertificationLevel.REJECTED;
    }
    determineMilestone(eqi) {
        if (eqi >= 99.5)
            return types_1.EqiMilestone.AUTONOMOUS_ENTERPRISE;
        if (eqi >= 98)
            return types_1.EqiMilestone.PLATINUM;
        if (eqi >= 95)
            return types_1.EqiMilestone.GOLD;
        if (eqi >= 90)
            return types_1.EqiMilestone.SILVER;
        if (eqi >= 85)
            return types_1.EqiMilestone.MVP_ENTERPRISE;
        if (eqi >= 75)
            return types_1.EqiMilestone.ARCHITECTURE_STABLE;
        return null;
    }
    generateRecommendations(domains) {
        const recommendations = [];
        for (const domain of domains) {
            if (domain.criticalFailures.length > 0) {
                for (const failure of domain.criticalFailures) {
                    recommendations.push(`[CRITICAL] ${domain.domain}: ${failure}`);
                }
            }
            if (domain.score < 50) {
                recommendations.push(`${domain.domain}: Score of ${domain.score}/100 is critically low.`);
            }
            else if (domain.score < 70) {
                recommendations.push(`${domain.domain}: Score of ${domain.score}/100 needs significant improvement.`);
            }
            else if (domain.score < 90) {
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
    identifyCriticalFailures(domains) {
        const failures = [];
        for (const domain of domains) {
            for (const failure of domain.criticalFailures) {
                failures.push(`[${domain.domain}] ${failure}`);
            }
        }
        return failures;
    }
    getWeight(domain) {
        return this.weights[domain] ?? 0;
    }
    getWeights() {
        return { ...this.weights };
    }
    getDomainSpecificRecommendations(domain) {
        const recs = [];
        switch (domain.domain) {
            case types_1.CertificationDomain.ARCHITECTURE:
                if (domain.score < 90)
                    recs.push('Architecture: Run Dependency Analyzer to detect circular dependencies and coupling violations.');
                break;
            case types_1.CertificationDomain.AGENTS:
                if (domain.score < 90)
                    recs.push('Agents: Verify all agents extend BaseAgentService, implement required methods, and register tools.');
                break;
            case types_1.CertificationDomain.ORCHESTRATION:
                if (domain.score < 90)
                    recs.push('Orchestration: Test the full pipeline decompose→plan→execute→critique→repair→validate→deliver.');
                break;
            case types_1.CertificationDomain.BROWSER:
                if (domain.score < 90)
                    recs.push('Browser: Validate all 17 browser agents with functional tests.');
                break;
            case types_1.CertificationDomain.MEMORY:
                if (domain.score < 90)
                    recs.push('Memory: Verify Unified Memory Gateway with store/retrieve/search/summarize/promote/archive API. Test cross-tier retrieval.');
                break;
            case types_1.CertificationDomain.SECURITY:
                if (domain.score < 90)
                    recs.push('Security: Verify Security Gateway pipeline: Validation→Sanitization→Policy→Permission→Execution. Test injection prevention.');
                break;
            case types_1.CertificationDomain.PERFORMANCE:
                if (domain.score < 90)
                    recs.push('Performance: Profile execution times, memory, CPU, concurrent agents, and event bus throughput.');
                break;
            case types_1.CertificationDomain.TESTS:
                if (domain.score < 90)
                    recs.push('Tests: Increase unit, integration, E2E coverage. Each agent should have its own test folder.');
                break;
            case types_1.CertificationDomain.DOCUMENTATION:
                if (domain.score < 90)
                    recs.push('Documentation: Run auto-generation. Ensure JSDoc, OpenAPI, Mermaid diagrams, ADR, README.');
                break;
            case types_1.CertificationDomain.OBSERVABILITY:
                if (domain.score < 90)
                    recs.push('Observability: Verify metrics collection, distributed tracing, structured logging, and alerting.');
                break;
        }
        return recs;
    }
};
exports.EqiCalculatorService = EqiCalculatorService;
exports.EqiCalculatorService = EqiCalculatorService = EqiCalculatorService_1 = __decorate([
    (0, common_1.Injectable)()
], EqiCalculatorService);
//# sourceMappingURL=eqi-calculator.service.js.map