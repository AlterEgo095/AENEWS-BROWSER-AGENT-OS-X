export interface SecurityCheckResult {
    allowed: boolean;
    sanitized: any;
    threats: SecurityThreat[];
    riskScore: number;
    policy: string;
    action: 'allow' | 'sanitize' | 'block' | 'quarantine';
}
export interface SecurityThreat {
    type: SecurityThreatType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    source: string;
    detectedAt: Date;
    payload?: string;
}
export declare enum SecurityThreatType {
    PROMPT_INJECTION = "prompt_injection",
    COMMAND_INJECTION = "command_injection",
    SQL_INJECTION = "sql_injection",
    XSS = "xss",
    CSRF = "csrf",
    PATH_TRAVERSAL = "path_traversal",
    EXCESSIVE_PERMISSION = "excessive_permission",
    SENSITIVE_DATA_EXPOSURE = "sensitive_data_exposure",
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
    SUSPICIOUS_PATTERN = "suspicious_pattern"
}
export interface SecurityPolicy {
    id: string;
    name: string;
    description: string;
    rules: SecurityRule[];
    defaultAction: 'allow' | 'block';
    priority: number;
    enabled: boolean;
}
export interface SecurityRule {
    id: string;
    type: 'pattern' | 'whitelist' | 'blacklist' | 'rate_limit' | 'permission_check';
    field: string;
    pattern?: string;
    values?: string[];
    maxRate?: number;
    windowMs?: number;
    action: 'allow' | 'block' | 'sanitize';
}
export interface AuditLogEntry {
    id: string;
    timestamp: Date;
    agentId: string;
    action: string;
    resource: string;
    result: 'allowed' | 'blocked' | 'sanitized';
    threats: SecurityThreat[];
    riskScore: number;
    policy: string;
    metadata: Record<string, any>;
}
export declare class SecurityGatewayService {
    private readonly logger;
    private readonly policies;
    private readonly auditLog;
    private readonly rateCounters;
    private readonly injectionPatterns;
    constructor();
    process(agentId: string, action: string, resource: string, input: any, context?: {
        permissions?: string[];
        metadata?: Record<string, any>;
    }): Promise<SecurityCheckResult>;
    private validateInput;
    private detectInjection;
    private sanitize;
    private checkRateLimit;
    private evaluatePolicies;
    private evaluateRule;
    private checkPermissions;
    registerPolicy(policy: SecurityPolicy): void;
    unregisterPolicy(policyId: string): boolean;
    getPolicies(): SecurityPolicy[];
    getAuditLog(limit?: number): AuditLogEntry[];
    getAuditLogForAgent(agentId: string, limit?: number): AuditLogEntry[];
    private initializeDefaultPolicies;
}
