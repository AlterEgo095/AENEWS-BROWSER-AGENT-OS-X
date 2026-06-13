import { CertificationLevel, CertificationDomain, DomainWeights, DomainResult, EqiMilestone } from './types';
export declare class EqiCalculatorService {
    private readonly logger;
    private readonly weights;
    calculateEqi(domains: DomainResult[]): number;
    determineLevel(eqi: number): CertificationLevel;
    determineMilestone(eqi: number): EqiMilestone | null;
    generateRecommendations(domains: DomainResult[]): string[];
    identifyCriticalFailures(domains: DomainResult[]): string[];
    getWeight(domain: CertificationDomain): number;
    getWeights(): DomainWeights;
    private getDomainSpecificRecommendations;
}
