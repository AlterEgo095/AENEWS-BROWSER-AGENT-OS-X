import { OnModuleInit } from '@nestjs/common';
export declare enum RuleType {
    PROHIBITION = "prohibition",
    REQUIREMENT = "requirement",
    CONSTRAINT = "constraint",
    GUIDELINE = "guideline"
}
export declare enum RuleSeverity {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low"
}
export declare enum RuleEnforcement {
    BLOCK = "block",
    WARN = "warn",
    LOG = "log"
}
export interface ConstitutionalRule {
    id: string;
    name: string;
    description: string;
    ruleType: RuleType;
    severity: RuleSeverity;
    enforcement: RuleEnforcement;
    conditions: RuleCondition[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface RuleCondition {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'regex';
    value: any;
}
export interface ConstitutionalViolation {
    ruleId: string;
    ruleName: string;
    agentId: string;
    action: string;
    timestamp: Date;
    blocked: boolean;
    reason: string;
    severity: RuleSeverity;
}
export interface ActionContext {
    agentId: string;
    action: string;
    actionType: string;
    resource?: string;
    payload?: any;
    target?: string;
    environment?: string;
}
export interface EvaluationResult {
    allowed: boolean;
    violations: ConstitutionalViolation[];
    warnings: string[];
    auditEntries: string[];
}
export interface RuleFilter {
    ruleType?: RuleType;
    severity?: RuleSeverity;
    isActive?: boolean;
}
export interface RuleStats {
    totalRules: number;
    activeRules: number;
    inactiveRules: number;
    byType: Record<RuleType, number>;
    bySeverity: Record<RuleSeverity, number>;
    byEnforcement: Record<RuleEnforcement, number>;
    totalViolations: number;
    violationsBySeverity: Record<RuleSeverity, number>;
    violationsBlocked: number;
}
export declare class ConstitutionalBlockError extends Error {
    readonly evaluationResult: EvaluationResult;
    constructor(message: string, evaluationResult: EvaluationResult);
}
export declare class ConstitutionalAiService implements OnModuleInit {
    private readonly logger;
    private readonly rules;
    private readonly violations;
    private readonly auditLog;
    onModuleInit(): void;
    initialize(): void;
    addRule(rule: ConstitutionalRule): ConstitutionalRule;
    removeRule(ruleId: string): void;
    updateRule(ruleId: string, updates: Partial<Pick<ConstitutionalRule, 'conditions' | 'enforcement' | 'severity' | 'description' | 'name' | 'ruleType'>>): ConstitutionalRule;
    evaluate(actionContext: ActionContext): EvaluationResult;
    getRules(filter?: RuleFilter): ConstitutionalRule[];
    getViolations(agentId?: string, since?: Date): ConstitutionalViolation[];
    getRuleStats(): RuleStats;
    enforceBeforeExecution(agentId: string, action: string, payload?: any): EvaluationResult;
    private evaluateConditions;
    private resolveFieldValue;
    private evaluateOperator;
    private recordViolation;
    private appendAuditLog;
    private findRuleConflicts;
    private conditionsOverlap;
    private conditionsCompatible;
}
