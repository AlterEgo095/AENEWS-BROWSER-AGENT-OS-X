import { OnModuleInit } from '@nestjs/common';
export declare enum ApprovalActionType {
    DELETE = "delete",
    DEPLOY_PRODUCTION = "deploy_production",
    PAYMENT = "payment",
    EMAIL_SEND = "email_send",
    SOCIAL_MEDIA_POST = "social_media_post",
    SSH_ACCESS = "ssh_access",
    DNS_CHANGE = "dns_change",
    DATABASE_MIGRATION = "database_migration",
    API_KEY_ROTATION = "api_key_rotation",
    CONFIGURATION_CHANGE = "configuration_change",
    USER_DATA_EXPORT = "user_data_export",
    SCALE_UP = "scale_up"
}
export declare enum ApprovalStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    EXPIRED = "expired",
    CANCELLED = "cancelled"
}
export interface ApprovalRequest {
    id: string;
    agentId: string;
    action: string;
    actionType: ApprovalActionType;
    payload: any;
    justification: string;
    riskAssessment: RiskAssessment;
    status: ApprovalStatus;
    requestedAt: Date;
    resolvedAt: Date | null;
    approvedBy: string | null;
    rejectionReason: string | null;
    expiresAt: Date;
    metadata: Record<string, any>;
}
export interface RiskAssessment {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    impactDescription: string;
    reversibility: 'reversible' | 'partially_reversible' | 'irreversible';
}
export interface ApprovalPolicy {
    actionType: ApprovalActionType;
    requiresApproval: boolean;
    autoApproveBelowRisk?: 'low' | 'medium';
    expiryMinutes: number;
    requiredApprovers: number;
}
export declare enum ApprovalEventType {
    APPROVAL_REQUESTED = "APPROVAL_REQUESTED",
    APPROVAL_GRANTED = "APPROVAL_GRANTED",
    APPROVAL_REJECTED = "APPROVAL_REJECTED",
    APPROVAL_EXPIRED = "APPROVAL_EXPIRED",
    APPROVAL_CANCELLED = "APPROVAL_CANCELLED",
    APPROVAL_AUTO_APPROVED = "APPROVAL_AUTO_APPROVED"
}
export interface ApprovalEvent {
    type: ApprovalEventType;
    requestId: string;
    agentId: string;
    actionType: ApprovalActionType;
    timestamp: Date;
    metadata: Record<string, any>;
}
export interface EnforceResult {
    allowed: boolean;
    requestId: string | null;
    reason: string;
}
export interface ApprovalStats {
    totalRequests: number;
    byStatus: Record<ApprovalStatus, number>;
    byActionType: Record<string, number>;
    averageApprovalTimeMs: number | null;
    approvalRate: number;
}
export declare class HumanApprovalService implements OnModuleInit {
    private readonly logger;
    private readonly requests;
    private readonly policies;
    private readonly events;
    onModuleInit(): void;
    initialize(): void;
    requestApproval(agentId: string, action: string, actionType: ApprovalActionType, payload: any, justification: string): ApprovalRequest;
    approve(requestId: string, approvedBy: string): ApprovalRequest;
    reject(requestId: string, rejectedBy: string, reason: string): ApprovalRequest;
    cancel(requestId: string): ApprovalRequest;
    checkApprovalRequired(actionType: ApprovalActionType, riskLevel?: 'low' | 'medium' | 'high' | 'critical'): boolean;
    getRequest(requestId: string): ApprovalRequest | null;
    getPendingRequests(agentId?: string): ApprovalRequest[];
    getRequestsByActionType(actionType: ApprovalActionType): ApprovalRequest[];
    enforceApproval(agentId: string, action: string, actionType: ApprovalActionType, payload: any): EnforceResult;
    processExpiredRequests(): number;
    assessRisk(actionType: ApprovalActionType, payload: any): RiskAssessment;
    getApprovalStats(): ApprovalStats;
    updatePolicy(actionType: ApprovalActionType, policy: Partial<Omit<ApprovalPolicy, 'actionType'>>): ApprovalPolicy;
    private generateRequestId;
    private emitEvent;
    private findExistingApproval;
    private payloadMatches;
    private boundRequests;
}
