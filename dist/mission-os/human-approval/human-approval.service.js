"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HumanApprovalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanApprovalService = exports.ApprovalEventType = exports.ApprovalStatus = exports.ApprovalActionType = void 0;
const common_1 = require("@nestjs/common");
var ApprovalActionType;
(function (ApprovalActionType) {
    ApprovalActionType["DELETE"] = "delete";
    ApprovalActionType["DEPLOY_PRODUCTION"] = "deploy_production";
    ApprovalActionType["PAYMENT"] = "payment";
    ApprovalActionType["EMAIL_SEND"] = "email_send";
    ApprovalActionType["SOCIAL_MEDIA_POST"] = "social_media_post";
    ApprovalActionType["SSH_ACCESS"] = "ssh_access";
    ApprovalActionType["DNS_CHANGE"] = "dns_change";
    ApprovalActionType["DATABASE_MIGRATION"] = "database_migration";
    ApprovalActionType["API_KEY_ROTATION"] = "api_key_rotation";
    ApprovalActionType["CONFIGURATION_CHANGE"] = "configuration_change";
    ApprovalActionType["USER_DATA_EXPORT"] = "user_data_export";
    ApprovalActionType["SCALE_UP"] = "scale_up";
})(ApprovalActionType || (exports.ApprovalActionType = ApprovalActionType = {}));
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["PENDING"] = "pending";
    ApprovalStatus["APPROVED"] = "approved";
    ApprovalStatus["REJECTED"] = "rejected";
    ApprovalStatus["EXPIRED"] = "expired";
    ApprovalStatus["CANCELLED"] = "cancelled";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
var ApprovalEventType;
(function (ApprovalEventType) {
    ApprovalEventType["APPROVAL_REQUESTED"] = "APPROVAL_REQUESTED";
    ApprovalEventType["APPROVAL_GRANTED"] = "APPROVAL_GRANTED";
    ApprovalEventType["APPROVAL_REJECTED"] = "APPROVAL_REJECTED";
    ApprovalEventType["APPROVAL_EXPIRED"] = "APPROVAL_EXPIRED";
    ApprovalEventType["APPROVAL_CANCELLED"] = "APPROVAL_CANCELLED";
    ApprovalEventType["APPROVAL_AUTO_APPROVED"] = "APPROVAL_AUTO_APPROVED";
})(ApprovalEventType || (exports.ApprovalEventType = ApprovalEventType = {}));
const MAX_REQUESTS = 50_000;
const MAX_EVENTS = 100_000;
const RISK_LEVEL_ORDER = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
};
let HumanApprovalService = HumanApprovalService_1 = class HumanApprovalService {
    constructor() {
        this.logger = new common_1.Logger(HumanApprovalService_1.name);
        this.requests = new Map();
        this.policies = new Map();
        this.events = [];
    }
    onModuleInit() {
        this.initialize();
        this.logger.log('HumanApprovalService initialised');
    }
    initialize() {
        this.logger.log('Loading default approval policies...');
        const defaultPolicies = [
            {
                actionType: ApprovalActionType.DELETE,
                requiresApproval: true,
                autoApproveBelowRisk: undefined,
                expiryMinutes: 60,
                requiredApprovers: 1,
            },
            {
                actionType: ApprovalActionType.DEPLOY_PRODUCTION,
                requiresApproval: true,
                autoApproveBelowRisk: undefined,
                expiryMinutes: 120,
                requiredApprovers: 2,
            },
            {
                actionType: ApprovalActionType.PAYMENT,
                requiresApproval: true,
                autoApproveBelowRisk: 'low',
                expiryMinutes: 30,
                requiredApprovers: 1,
            },
            {
                actionType: ApprovalActionType.EMAIL_SEND,
                requiresApproval: true,
                autoApproveBelowRisk: 'low',
                expiryMinutes: 30,
                requiredApprovers: 1,
            },
            {
                actionType: ApprovalActionType.SOCIAL_MEDIA_POST,
                requiresApproval: true,
                autoApproveBelowRisk: undefined,
                expiryMinutes: 60,
                requiredApprovers: 1,
            },
            {
                actionType: ApprovalActionType.SSH_ACCESS,
                requiresApproval: true,
                autoApproveBelowRisk: undefined,
                expiryMinutes: 30,
                requiredApprovers: 1,
            },
            {
                actionType: ApprovalActionType.DNS_CHANGE,
                requiresApproval: true,
                autoApproveBelowRisk: undefined,
                expiryMinutes: 60,
                requiredApprovers: 2,
            },
            {
                actionType: ApprovalActionType.DATABASE_MIGRATION,
                requiresApproval: true,
                autoApproveBelowRisk: undefined,
                expiryMinutes: 120,
                requiredApprovers: 2,
            },
            {
                actionType: ApprovalActionType.API_KEY_ROTATION,
                requiresApproval: true,
                autoApproveBelowRisk: 'low',
                expiryMinutes: 60,
                requiredApprovers: 1,
            },
            {
                actionType: ApprovalActionType.CONFIGURATION_CHANGE,
                requiresApproval: true,
                autoApproveBelowRisk: 'low',
                expiryMinutes: 45,
                requiredApprovers: 1,
            },
            {
                actionType: ApprovalActionType.USER_DATA_EXPORT,
                requiresApproval: true,
                autoApproveBelowRisk: undefined,
                expiryMinutes: 60,
                requiredApprovers: 2,
            },
            {
                actionType: ApprovalActionType.SCALE_UP,
                requiresApproval: true,
                autoApproveBelowRisk: 'medium',
                expiryMinutes: 30,
                requiredApprovers: 1,
            },
        ];
        for (const policy of defaultPolicies) {
            this.policies.set(policy.actionType, { ...policy });
        }
        this.logger.log(`Loaded ${defaultPolicies.length} default approval policies`);
    }
    requestApproval(agentId, action, actionType, payload, justification) {
        const id = this.generateRequestId();
        const riskAssessment = this.assessRisk(actionType, payload);
        const policy = this.policies.get(actionType);
        if (!policy) {
            this.logger.warn(`No approval policy found for action type "${actionType}" — defaulting to requiring approval`);
        }
        const effectivePolicy = policy ?? {
            actionType,
            requiresApproval: true,
            expiryMinutes: 60,
            requiredApprovers: 1,
        };
        const now = new Date();
        const expiresAt = new Date(now.getTime() + effectivePolicy.expiryMinutes * 60_000);
        let status = ApprovalStatus.PENDING;
        let approvedBy = null;
        let resolvedAt = null;
        if (effectivePolicy.requiresApproval && effectivePolicy.autoApproveBelowRisk) {
            const autoApproveThreshold = RISK_LEVEL_ORDER[effectivePolicy.autoApproveBelowRisk] ?? -1;
            const assessedLevel = RISK_LEVEL_ORDER[riskAssessment.riskLevel] ?? 99;
            if (assessedLevel <= autoApproveThreshold) {
                status = ApprovalStatus.APPROVED;
                approvedBy = 'system:auto-approve';
                resolvedAt = new Date();
                this.logger.log(`Auto-approved request ${id}: action="${action}" type=${actionType} risk=${riskAssessment.riskLevel}`);
            }
        }
        if (!effectivePolicy.requiresApproval) {
            status = ApprovalStatus.APPROVED;
            approvedBy = 'system:no-approval-required';
            resolvedAt = new Date();
        }
        const request = {
            id,
            agentId,
            action,
            actionType,
            payload,
            justification,
            riskAssessment,
            status,
            requestedAt: now,
            resolvedAt,
            approvedBy,
            rejectionReason: null,
            expiresAt,
            metadata: {},
        };
        this.requests.set(id, request);
        this.boundRequests();
        if (status === ApprovalStatus.APPROVED) {
            this.emitEvent(ApprovalEventType.APPROVAL_AUTO_APPROVED, request);
        }
        else {
            this.emitEvent(ApprovalEventType.APPROVAL_REQUESTED, request);
        }
        this.logger.log(`Approval request created: ${id} agent=${agentId} action="${action}" type=${actionType} risk=${riskAssessment.riskLevel} status=${status}`);
        return { ...request };
    }
    approve(requestId, approvedBy) {
        const request = this.requests.get(requestId);
        if (!request) {
            throw new Error(`Approval request "${requestId}" not found`);
        }
        if (request.status !== ApprovalStatus.PENDING) {
            throw new Error(`Cannot approve request "${requestId}" — current status is "${request.status}", expected "${ApprovalStatus.PENDING}"`);
        }
        if (request.expiresAt && new Date() > request.expiresAt) {
            request.status = ApprovalStatus.EXPIRED;
            request.metadata.expiredDuringApproval = true;
            this.emitEvent(ApprovalEventType.APPROVAL_EXPIRED, request);
            this.logger.warn(`Approval request "${requestId}" expired before it could be approved`);
            throw new Error(`Approval request "${requestId}" has expired and can no longer be approved`);
        }
        request.status = ApprovalStatus.APPROVED;
        request.approvedBy = approvedBy;
        request.resolvedAt = new Date();
        this.emitEvent(ApprovalEventType.APPROVAL_GRANTED, request);
        this.logger.log(`Approval granted: ${requestId} approvedBy="${approvedBy}" action="${request.action}" type=${request.actionType}`);
        return { ...request };
    }
    reject(requestId, rejectedBy, reason) {
        const request = this.requests.get(requestId);
        if (!request) {
            throw new Error(`Approval request "${requestId}" not found`);
        }
        if (request.status !== ApprovalStatus.PENDING) {
            throw new Error(`Cannot reject request "${requestId}" — current status is "${request.status}", expected "${ApprovalStatus.PENDING}"`);
        }
        request.status = ApprovalStatus.REJECTED;
        request.approvedBy = rejectedBy;
        request.rejectionReason = reason;
        request.resolvedAt = new Date();
        this.emitEvent(ApprovalEventType.APPROVAL_REJECTED, request);
        this.logger.warn(`Approval rejected: ${requestId} rejectedBy="${rejectedBy}" reason="${reason}" action="${request.action}" type=${request.actionType}`);
        return { ...request };
    }
    cancel(requestId) {
        const request = this.requests.get(requestId);
        if (!request) {
            throw new Error(`Approval request "${requestId}" not found`);
        }
        if (request.status !== ApprovalStatus.PENDING) {
            throw new Error(`Cannot cancel request "${requestId}" — current status is "${request.status}", expected "${ApprovalStatus.PENDING}"`);
        }
        request.status = ApprovalStatus.CANCELLED;
        request.resolvedAt = new Date();
        request.metadata.cancelledAt = new Date().toISOString();
        this.emitEvent(ApprovalEventType.APPROVAL_CANCELLED, request);
        this.logger.log(`Approval cancelled: ${requestId} action="${request.action}" type=${request.actionType}`);
        return { ...request };
    }
    checkApprovalRequired(actionType, riskLevel) {
        const policy = this.policies.get(actionType);
        if (!policy) {
            return true;
        }
        if (!policy.requiresApproval) {
            return false;
        }
        if (riskLevel && policy.autoApproveBelowRisk) {
            const threshold = RISK_LEVEL_ORDER[policy.autoApproveBelowRisk] ?? -1;
            const assessed = RISK_LEVEL_ORDER[riskLevel] ?? 99;
            if (assessed <= threshold) {
                return false;
            }
        }
        return true;
    }
    getRequest(requestId) {
        const request = this.requests.get(requestId);
        return request ? { ...request } : null;
    }
    getPendingRequests(agentId) {
        let results = [];
        for (const request of this.requests.values()) {
            if (request.status === ApprovalStatus.PENDING) {
                if (!agentId || request.agentId === agentId) {
                    results.push(request);
                }
            }
        }
        results.sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());
        return results.map((r) => ({ ...r }));
    }
    getRequestsByActionType(actionType) {
        const results = [];
        for (const request of this.requests.values()) {
            if (request.actionType === actionType) {
                results.push(request);
            }
        }
        results.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
        return results.map((r) => ({ ...r }));
    }
    enforceApproval(agentId, action, actionType, payload) {
        const riskAssessment = this.assessRisk(actionType, payload);
        const approvalRequired = this.checkApprovalRequired(actionType, riskAssessment.riskLevel);
        if (!approvalRequired) {
            const request = this.requestApproval(agentId, action, actionType, payload, `Auto-approved via enforceApproval: risk=${riskAssessment.riskLevel}`);
            return {
                allowed: true,
                requestId: request.id,
                reason: `Action auto-approved: risk level "${riskAssessment.riskLevel}" is within auto-approve threshold for ${actionType}`,
            };
        }
        const existingApproved = this.findExistingApproval(agentId, action, actionType, payload);
        if (existingApproved) {
            return {
                allowed: true,
                requestId: existingApproved.id,
                reason: `Action already approved via request ${existingApproved.id}`,
            };
        }
        const request = this.requestApproval(agentId, action, actionType, payload, `Approval required via enforceApproval: risk=${riskAssessment.riskLevel}`);
        return {
            allowed: false,
            requestId: request.id,
            reason: `Action requires human approval. Risk level: "${riskAssessment.riskLevel}". ` +
                `Request ${request.id} is pending. Expires at ${request.expiresAt.toISOString()}.`,
        };
    }
    processExpiredRequests() {
        const now = new Date();
        let expiredCount = 0;
        for (const request of this.requests.values()) {
            if (request.status !== ApprovalStatus.PENDING)
                continue;
            if (request.expiresAt && now > request.expiresAt) {
                request.status = ApprovalStatus.EXPIRED;
                request.resolvedAt = now;
                request.metadata.expiredAt = now.toISOString();
                this.emitEvent(ApprovalEventType.APPROVAL_EXPIRED, request);
                expiredCount++;
                this.logger.warn(`Approval request expired: ${request.id} action="${request.action}" type=${request.actionType} agent=${request.agentId}`);
            }
        }
        if (expiredCount > 0) {
            this.logger.log(`Processed ${expiredCount} expired approval request(s)`);
        }
        return expiredCount;
    }
    assessRisk(actionType, payload) {
        const factors = [];
        let riskLevel = 'medium';
        let reversibility = 'partially_reversible';
        let impactDescription = '';
        const p = payload ?? {};
        switch (actionType) {
            case ApprovalActionType.DELETE: {
                const target = (p.target ?? p.resource ?? p.path ?? '').toString().toLowerCase();
                const environment = (p.environment ?? p.env ?? '').toString().toLowerCase();
                if (target.includes('production') || environment === 'production') {
                    riskLevel = 'critical';
                    reversibility = 'irreversible';
                    factors.push('Deletion targets production environment');
                    factors.push('Production data loss is irreversible');
                    impactDescription = 'Irreversible deletion in production — data will be permanently lost with no recovery path.';
                }
                else if (target.includes('database') || target.includes('db')) {
                    riskLevel = 'critical';
                    reversibility = 'irreversible';
                    factors.push('Database deletion is irreversible without backup');
                    impactDescription = 'Database deletion — data will be permanently lost unless a backup exists.';
                }
                else if (target.includes('user') || target.includes('account')) {
                    riskLevel = 'high';
                    reversibility = 'partially_reversible';
                    factors.push('User/account deletion may affect real people');
                    impactDescription = 'User data deletion — may impact real users and their stored data.';
                }
                else if (environment === 'staging' || environment === 'test') {
                    riskLevel = 'low';
                    reversibility = 'reversible';
                    factors.push('Deletion in non-production environment');
                    impactDescription = 'Deletion in test/staging — limited blast radius, usually recoverable.';
                }
                else {
                    riskLevel = 'medium';
                    reversibility = 'partially_reversible';
                    factors.push('Generic deletion operation');
                    impactDescription = 'Deletion of a resource — may be partially recoverable depending on backup state.';
                }
                break;
            }
            case ApprovalActionType.DEPLOY_PRODUCTION: {
                const hasTests = p.testsPassed === true || p.testResults?.passed === true;
                const hasReview = p.codeReviewed === true || p.reviewApproved === true;
                const rollbackPlan = p.rollbackPlan === true || p.canRollback === true;
                const service = (p.service ?? p.application ?? '').toString().toLowerCase();
                if (!hasTests) {
                    factors.push('No test verification before deploy');
                    riskLevel = 'critical';
                }
                if (!hasReview) {
                    factors.push('No code review before deploy');
                    riskLevel = 'high';
                }
                if (!rollbackPlan) {
                    factors.push('No rollback plan available');
                }
                if (service.includes('payment') || service.includes('auth') || service.includes('core')) {
                    factors.push('Deploying critical service (payment/auth/core)');
                    riskLevel = 'critical';
                }
                if (factors.length === 0) {
                    riskLevel = 'medium';
                    factors.push('Standard production deployment with tests and review');
                }
                reversibility = rollbackPlan ? 'partially_reversible' : 'irreversible';
                impactDescription = hasTests && hasReview && rollbackPlan
                    ? 'Production deployment with proper safeguards — reversible via rollback.'
                    : 'Production deployment with incomplete safeguards — potential for prolonged outage or data issues.';
                break;
            }
            case ApprovalActionType.PAYMENT: {
                const amount = Number(p.amount ?? 0);
                const currency = (p.currency ?? 'usd').toString().toLowerCase();
                const recipient = (p.recipient ?? p.vendor ?? '').toString().toLowerCase();
                if (amount > 10000) {
                    riskLevel = 'critical';
                    reversibility = 'irreversible';
                    factors.push(`Payment amount is very large: ${amount} ${currency.toUpperCase()}`);
                    impactDescription = `Very large payment of ${amount} ${currency.toUpperCase()} — likely irreversible once processed.`;
                }
                else if (amount > 1000) {
                    riskLevel = 'high';
                    reversibility = 'partially_reversible';
                    factors.push(`Payment amount is significant: ${amount} ${currency.toUpperCase()}`);
                    impactDescription = `Significant payment of ${amount} ${currency.toUpperCase()} — may be partially recoverable.`;
                }
                else if (amount > 100) {
                    riskLevel = 'medium';
                    reversibility = 'partially_reversible';
                    factors.push(`Moderate payment: ${amount} ${currency.toUpperCase()}`);
                    impactDescription = `Moderate payment of ${amount} ${currency.toUpperCase()}.`;
                }
                else {
                    riskLevel = 'low';
                    reversibility = 'reversible';
                    factors.push(`Small payment: ${amount} ${currency.toUpperCase()}`);
                    impactDescription = `Small payment of ${amount} ${currency.toUpperCase()} — typically refundable.`;
                }
                if (recipient.includes('unknown') || recipient === '') {
                    factors.push('Unknown or unverified recipient');
                    riskLevel = 'high';
                }
                if (p.recurring === true) {
                    factors.push('Recurring payment — ongoing financial commitment');
                    riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
                }
                break;
            }
            case ApprovalActionType.EMAIL_SEND: {
                const recipientCount = Number(p.recipientCount ?? p.recipients?.length ?? 1);
                const isExternal = p.external === true || p.recipientType === 'external';
                const hasAttachments = p.attachments === true || (p.attachmentCount ?? 0) > 0;
                const isMarketing = p.marketing === true || p.campaign === true;
                if (recipientCount > 10000) {
                    riskLevel = 'critical';
                    factors.push(`Mass email to ${recipientCount} recipients`);
                }
                else if (recipientCount > 1000) {
                    riskLevel = 'high';
                    factors.push(`Large audience email: ${recipientCount} recipients`);
                }
                else if (recipientCount > 100) {
                    riskLevel = 'medium';
                    factors.push(`Medium audience email: ${recipientCount} recipients`);
                }
                else {
                    riskLevel = 'low';
                    factors.push(`Small audience email: ${recipientCount} recipient(s)`);
                }
                if (isExternal) {
                    factors.push('Email targets external recipients');
                    riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
                }
                if (isMarketing) {
                    factors.push('Marketing/promotional email — compliance risk');
                    riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
                }
                if (hasAttachments) {
                    factors.push('Email contains attachments — security risk');
                }
                reversibility = 'irreversible';
                impactDescription = `Email dispatch to ${recipientCount} recipient(s) — once sent, cannot be recalled.`;
                break;
            }
            case ApprovalActionType.SOCIAL_MEDIA_POST: {
                const platform = (p.platform ?? '').toString().toLowerCase();
                const hasMedia = p.hasMedia === true || p.mediaCount > 0;
                const isScheduled = p.scheduled === true;
                const audienceSize = Number(p.audienceSize ?? p.followers ?? 0);
                riskLevel = 'high';
                factors.push('Social media post — public-facing brand communication');
                if (['twitter', 'x', 'facebook', 'instagram', 'linkedin'].includes(platform)) {
                    factors.push(`Platform: ${platform}`);
                }
                if (audienceSize > 100000) {
                    riskLevel = 'critical';
                    factors.push(`Large audience: ${audienceSize} followers — maximum brand exposure`);
                }
                if (hasMedia) {
                    factors.push('Post includes media content');
                }
                if (isScheduled) {
                    factors.push('Post is scheduled — may need time-sensitive review');
                }
                reversibility = 'partially_reversible';
                impactDescription = 'Social media post is public-facing and may be screenshotted or shared before deletion is possible.';
                break;
            }
            case ApprovalActionType.SSH_ACCESS: {
                const target = (p.target ?? p.host ?? '').toString().toLowerCase();
                const environment = (p.environment ?? p.env ?? '').toString().toLowerCase();
                const isRoot = p.user === 'root' || p.root === true;
                const isInteractive = p.interactive !== false;
                riskLevel = 'high';
                factors.push('SSH access — direct system access');
                if (target.includes('production') || environment === 'production') {
                    riskLevel = 'critical';
                    factors.push('SSH to production server');
                }
                if (isRoot) {
                    riskLevel = 'critical';
                    factors.push('Root-level SSH access — unrestricted system control');
                }
                if (isInteractive) {
                    factors.push('Interactive session — uncontrolled command execution possible');
                }
                reversibility = 'partially_reversible';
                impactDescription = isRoot
                    ? 'Root SSH access — any change can be made to the system, some irreversible.'
                    : 'SSH access — changes can be made to the system, audit trail may be incomplete.';
                break;
            }
            case ApprovalActionType.DNS_CHANGE: {
                const changeType = (p.changeType ?? '').toString().toLowerCase();
                const domain = (p.domain ?? p.zone ?? '').toString().toLowerCase();
                const environment = (p.environment ?? p.env ?? '').toString().toLowerCase();
                riskLevel = 'high';
                factors.push('DNS change — affects service reachability');
                if (changeType === 'delete' || changeType === 'remove') {
                    riskLevel = 'critical';
                    factors.push('DNS record deletion — service may become unreachable');
                }
                if (domain.includes('production') || environment === 'production') {
                    riskLevel = 'critical';
                    factors.push('DNS change in production — all users affected');
                }
                reversibility = 'partially_reversible';
                impactDescription = 'DNS changes propagate globally with TTL delays — even after reverting, users may experience prolonged outage due to DNS caching.';
                break;
            }
            case ApprovalActionType.DATABASE_MIGRATION: {
                const isDestructive = p.destructive === true || p.irreversible === true;
                const environment = (p.environment ?? p.env ?? '').toString().toLowerCase();
                const affectsData = p.affectsData !== false;
                const hasBackup = p.backupVerified === true;
                riskLevel = 'high';
                factors.push('Database migration — schema/data changes');
                if (isDestructive) {
                    riskLevel = 'critical';
                    factors.push('Destructive migration — data will be lost');
                }
                if (environment === 'production') {
                    riskLevel = riskLevel === 'high' ? 'critical' : riskLevel;
                    factors.push('Migration targets production database');
                }
                if (affectsData && !hasBackup) {
                    riskLevel = 'critical';
                    factors.push('Migration affects data without verified backup');
                }
                reversibility = isDestructive ? 'irreversible' : 'partially_reversible';
                impactDescription = isDestructive
                    ? 'Destructive database migration — data will be permanently altered or removed.'
                    : affectsData
                        ? 'Database migration affecting live data — reversible only if backup exists.'
                        : 'Schema-only migration — data integrity should be preserved but rollback may be complex.';
                break;
            }
            case ApprovalActionType.API_KEY_ROTATION: {
                const environment = (p.environment ?? p.env ?? '').toString().toLowerCase();
                const service = (p.service ?? '').toString().toLowerCase();
                const isEmergency = p.emergency === true;
                riskLevel = 'medium';
                factors.push('API key rotation — credential change');
                if (environment === 'production') {
                    riskLevel = 'high';
                    factors.push('Production API key rotation — active services may be disrupted');
                }
                if (service.includes('payment') || service.includes('auth')) {
                    riskLevel = 'high';
                    factors.push('Rotating key for critical service (payment/auth)');
                }
                if (isEmergency) {
                    riskLevel = 'critical';
                    factors.push('Emergency rotation — possible security breach');
                }
                reversibility = 'reversible';
                impactDescription = 'API key rotation is generally reversible (old key can be restored), but there may be a brief service interruption during propagation.';
                break;
            }
            case ApprovalActionType.CONFIGURATION_CHANGE: {
                const environment = (p.environment ?? p.env ?? '').toString().toLowerCase();
                const configType = (p.configType ?? '').toString().toLowerCase();
                const affectsSecurity = p.affectsSecurity === true || configType.includes('security');
                const affectsNetworking = p.affectsNetworking === true || configType.includes('network');
                riskLevel = 'medium';
                factors.push('Configuration change');
                if (environment === 'production') {
                    riskLevel = 'high';
                    factors.push('Configuration change in production');
                }
                if (affectsSecurity) {
                    riskLevel = 'critical';
                    factors.push('Configuration affects security settings');
                }
                if (affectsNetworking) {
                    riskLevel = 'high';
                    factors.push('Configuration affects networking');
                }
                reversibility = 'reversible';
                impactDescription = affectsSecurity
                    ? 'Security configuration change — may open or close attack surface. Immediate rollback recommended if issues arise.'
                    : 'Configuration change — generally reversible but may cause temporary service disruption.';
                break;
            }
            case ApprovalActionType.USER_DATA_EXPORT: {
                const recordCount = Number(p.recordCount ?? 0);
                const includesSensitive = p.includesSensitive === true || p.includePii === true;
                const destination = (p.destination ?? '').toString().toLowerCase();
                riskLevel = 'high';
                factors.push('User data export — privacy and compliance concern');
                if (recordCount > 100000) {
                    riskLevel = 'critical';
                    factors.push(`Large-scale export: ${recordCount} records — maximum privacy exposure`);
                }
                else if (recordCount > 10000) {
                    factors.push(`Significant export: ${recordCount} records`);
                }
                if (includesSensitive) {
                    riskLevel = 'critical';
                    factors.push('Export includes sensitive/PII data');
                }
                if (destination.includes('external') || destination.includes('third-party')) {
                    riskLevel = 'critical';
                    factors.push('Data export to external/third-party destination');
                }
                reversibility = 'irreversible';
                impactDescription = 'Once user data is exported, it cannot be "un-exported" — the data exists outside the system and may be distributed further.';
                break;
            }
            case ApprovalActionType.SCALE_UP: {
                const scaleFactor = Number(p.scaleFactor ?? p.instances ?? 1);
                const environment = (p.environment ?? p.env ?? '').toString().toLowerCase();
                const costImpact = Number(p.costImpact ?? p.estimatedCost ?? 0);
                riskLevel = 'low';
                factors.push('Scale-up operation');
                if (scaleFactor > 10) {
                    riskLevel = 'high';
                    factors.push(`Aggressive scale-up: ${scaleFactor}x — significant resource increase`);
                }
                else if (scaleFactor > 3) {
                    riskLevel = 'medium';
                    factors.push(`Moderate scale-up: ${scaleFactor}x`);
                }
                if (costImpact > 500) {
                    factors.push(`Significant cost impact: $${costImpact}/month`);
                    riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
                }
                if (environment === 'production') {
                    factors.push('Scale-up in production environment');
                }
                reversibility = 'reversible';
                impactDescription = 'Scaling operations are generally reversible (scale back down), though there may be brief performance impact during the transition.';
                break;
            }
            default: {
                riskLevel = 'medium';
                reversibility = 'partially_reversible';
                factors.push('Unknown action type — defaulting to medium risk');
                impactDescription = 'Action type not recognized — default medium risk assessment applied.';
                break;
            }
        }
        return {
            riskLevel,
            factors,
            impactDescription,
            reversibility,
        };
    }
    getApprovalStats() {
        const allRequests = [...this.requests.values()];
        const byStatus = {
            [ApprovalStatus.PENDING]: 0,
            [ApprovalStatus.APPROVED]: 0,
            [ApprovalStatus.REJECTED]: 0,
            [ApprovalStatus.EXPIRED]: 0,
            [ApprovalStatus.CANCELLED]: 0,
        };
        const byActionType = {};
        let totalApprovalTimeMs = 0;
        let approvalTimeCount = 0;
        let approvedCount = 0;
        let resolvedCount = 0;
        for (const request of allRequests) {
            byStatus[request.status]++;
            const actionKey = request.actionType;
            byActionType[actionKey] = (byActionType[actionKey] ?? 0) + 1;
            if (request.resolvedAt && request.requestedAt) {
                const elapsed = request.resolvedAt.getTime() - request.requestedAt.getTime();
                if (request.status === ApprovalStatus.APPROVED) {
                    totalApprovalTimeMs += elapsed;
                    approvalTimeCount++;
                    approvedCount++;
                }
                resolvedCount++;
            }
        }
        const averageApprovalTimeMs = approvalTimeCount > 0 ? Math.round(totalApprovalTimeMs / approvalTimeCount) : null;
        const approvalRate = resolvedCount > 0 ? approvedCount / resolvedCount : 0;
        return {
            totalRequests: allRequests.length,
            byStatus,
            byActionType,
            averageApprovalTimeMs,
            approvalRate: Math.round(approvalRate * 10000) / 10000,
        };
    }
    updatePolicy(actionType, policy) {
        const existing = this.policies.get(actionType);
        if (!existing) {
            const newPolicy = {
                actionType,
                requiresApproval: policy.requiresApproval ?? true,
                autoApproveBelowRisk: policy.autoApproveBelowRisk,
                expiryMinutes: policy.expiryMinutes ?? 60,
                requiredApprovers: policy.requiredApprovers ?? 1,
            };
            this.policies.set(actionType, newPolicy);
            this.logger.log(`Created new approval policy for ${actionType}: requiresApproval=${newPolicy.requiresApproval} autoApproveBelowRisk=${newPolicy.autoApproveBelowRisk ?? 'none'}`);
            return { ...newPolicy };
        }
        if (policy.requiresApproval !== undefined) {
            existing.requiresApproval = policy.requiresApproval;
        }
        if (policy.autoApproveBelowRisk !== undefined) {
            existing.autoApproveBelowRisk = policy.autoApproveBelowRisk;
        }
        if (policy.expiryMinutes !== undefined) {
            existing.expiryMinutes = policy.expiryMinutes;
        }
        if (policy.requiredApprovers !== undefined) {
            existing.requiredApprovers = policy.requiredApprovers;
        }
        this.logger.log(`Updated approval policy for ${actionType}: requiresApproval=${existing.requiresApproval} autoApproveBelowRisk=${existing.autoApproveBelowRisk ?? 'none'} expiryMinutes=${existing.expiryMinutes} requiredApprovers=${existing.requiredApprovers}`);
        return { ...existing };
    }
    generateRequestId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `apr-${timestamp}-${random}`;
    }
    emitEvent(type, request) {
        const event = {
            type,
            requestId: request.id,
            agentId: request.agentId,
            actionType: request.actionType,
            timestamp: new Date(),
            metadata: {
                action: request.action,
                riskLevel: request.riskAssessment.riskLevel,
                status: request.status,
            },
        };
        this.events.push(event);
        if (this.events.length > MAX_EVENTS) {
            this.events.splice(0, this.events.length - MAX_EVENTS);
        }
    }
    findExistingApproval(agentId, action, actionType, payload) {
        for (const request of this.requests.values()) {
            if (request.agentId === agentId &&
                request.action === action &&
                request.actionType === actionType &&
                request.status === ApprovalStatus.APPROVED &&
                this.payloadMatches(request.payload, payload)) {
                if (request.resolvedAt) {
                    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);
                    if (request.resolvedAt < fiveMinutesAgo) {
                        continue;
                    }
                }
                return request;
            }
        }
        return null;
    }
    payloadMatches(a, b) {
        try {
            return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
        }
        catch {
            return false;
        }
    }
    boundRequests() {
        if (this.requests.size <= MAX_REQUESTS)
            return;
        const entries = [...this.requests.entries()].sort((a, b) => a[1].requestedAt.getTime() - b[1].requestedAt.getTime());
        const excess = this.requests.size - MAX_REQUESTS;
        for (let i = 0; i < excess; i++) {
            this.requests.delete(entries[i][0]);
        }
        this.logger.debug(`Pruned ${excess} oldest approval request(s) to maintain bound of ${MAX_REQUESTS}`);
    }
};
exports.HumanApprovalService = HumanApprovalService;
exports.HumanApprovalService = HumanApprovalService = HumanApprovalService_1 = __decorate([
    (0, common_1.Injectable)()
], HumanApprovalService);
//# sourceMappingURL=human-approval.service.js.map