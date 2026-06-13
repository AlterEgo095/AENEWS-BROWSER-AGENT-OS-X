/**
 * AENEWS Agent OS X - Human Approval Service
 * The Human Approval Layer ensures that certain high-risk actions require
 * explicit human validation before execution. Actions like deletion, payment,
 * production deployment, email dispatch, social media posting, SSH access,
 * DNS changes, and more are gated behind an approval workflow.
 *
 * This service acts as the gateway — no critical agent action proceeds
 * without either an explicit human approval or an auto-approval that
 * meets the configured policy's risk threshold.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

// ─── Type Definitions ──────────────────────────────────────────────

export enum ApprovalActionType {
  DELETE = 'delete',
  DEPLOY_PRODUCTION = 'deploy_production',
  PAYMENT = 'payment',
  EMAIL_SEND = 'email_send',
  SOCIAL_MEDIA_POST = 'social_media_post',
  SSH_ACCESS = 'ssh_access',
  DNS_CHANGE = 'dns_change',
  DATABASE_MIGRATION = 'database_migration',
  API_KEY_ROTATION = 'api_key_rotation',
  CONFIGURATION_CHANGE = 'configuration_change',
  USER_DATA_EXPORT = 'user_data_export',
  SCALE_UP = 'scale_up',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
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

// ─── Event Types ───────────────────────────────────────────────────

export enum ApprovalEventType {
  APPROVAL_REQUESTED = 'APPROVAL_REQUESTED',
  APPROVAL_GRANTED = 'APPROVAL_GRANTED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  APPROVAL_EXPIRED = 'APPROVAL_EXPIRED',
  APPROVAL_CANCELLED = 'APPROVAL_CANCELLED',
  APPROVAL_AUTO_APPROVED = 'APPROVAL_AUTO_APPROVED',
}

export interface ApprovalEvent {
  type: ApprovalEventType;
  requestId: string;
  agentId: string;
  actionType: ApprovalActionType;
  timestamp: Date;
  metadata: Record<string, any>;
}

// ─── Enforce Result ────────────────────────────────────────────────

export interface EnforceResult {
  allowed: boolean;
  requestId: string | null;
  reason: string;
}

// ─── Approval Stats ────────────────────────────────────────────────

export interface ApprovalStats {
  totalRequests: number;
  byStatus: Record<ApprovalStatus, number>;
  byActionType: Record<string, number>;
  averageApprovalTimeMs: number | null;
  approvalRate: number;
}

// ─── Constants ─────────────────────────────────────────────────────

const MAX_REQUESTS = 50_000;
const MAX_EVENTS = 100_000;
const RISK_LEVEL_ORDER: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

// ─── Service ────────────────────────────────────────────────────────

@Injectable()
export class HumanApprovalService implements OnModuleInit {
  private readonly logger = new Logger(HumanApprovalService.name);

  /** request id → ApprovalRequest */
  private readonly requests: Map<string, ApprovalRequest> = new Map();

  /** action type → ApprovalPolicy */
  private readonly policies: Map<ApprovalActionType, ApprovalPolicy> = new Map();

  /** Event log (bounded) */
  private readonly events: ApprovalEvent[] = [];

  // ─── Lifecycle ────────────────────────────────────────────────────

  onModuleInit(): void {
    this.initialize();
    this.logger.log('HumanApprovalService initialised');
  }

  // ─── 1. initialize ────────────────────────────────────────────────

  /**
   * Load the default approval policies for every action type.
   * Most actions require explicit human approval. Some can be
   * auto-approved when the assessed risk falls below a threshold.
   */
  initialize(): void {
    this.logger.log('Loading default approval policies...');

    const defaultPolicies: ApprovalPolicy[] = [
      {
        actionType: ApprovalActionType.DELETE,
        requiresApproval: true,
        autoApproveBelowRisk: undefined, // Never auto-approve deletions
        expiryMinutes: 60,
        requiredApprovers: 1,
      },
      {
        actionType: ApprovalActionType.DEPLOY_PRODUCTION,
        requiresApproval: true,
        autoApproveBelowRisk: undefined, // Never auto-approve production deploys
        expiryMinutes: 120,
        requiredApprovers: 2,
      },
      {
        actionType: ApprovalActionType.PAYMENT,
        requiresApproval: true,
        autoApproveBelowRisk: 'low', // Auto-approve low-risk (small) payments
        expiryMinutes: 30,
        requiredApprovers: 1,
      },
      {
        actionType: ApprovalActionType.EMAIL_SEND,
        requiresApproval: true,
        autoApproveBelowRisk: 'low', // Auto-approve low-risk emails (internal, small audience)
        expiryMinutes: 30,
        requiredApprovers: 1,
      },
      {
        actionType: ApprovalActionType.SOCIAL_MEDIA_POST,
        requiresApproval: true,
        autoApproveBelowRisk: undefined, // Never auto-approve — brand risk
        expiryMinutes: 60,
        requiredApprovers: 1,
      },
      {
        actionType: ApprovalActionType.SSH_ACCESS,
        requiresApproval: true,
        autoApproveBelowRisk: undefined, // Never auto-approve shell access
        expiryMinutes: 30,
        requiredApprovers: 1,
      },
      {
        actionType: ApprovalActionType.DNS_CHANGE,
        requiresApproval: true,
        autoApproveBelowRisk: undefined, // Never auto-approve DNS changes
        expiryMinutes: 60,
        requiredApprovers: 2,
      },
      {
        actionType: ApprovalActionType.DATABASE_MIGRATION,
        requiresApproval: true,
        autoApproveBelowRisk: undefined, // Never auto-approve DB migrations
        expiryMinutes: 120,
        requiredApprovers: 2,
      },
      {
        actionType: ApprovalActionType.API_KEY_ROTATION,
        requiresApproval: true,
        autoApproveBelowRisk: 'low', // Auto-approve low-risk key rotations (non-prod)
        expiryMinutes: 60,
        requiredApprovers: 1,
      },
      {
        actionType: ApprovalActionType.CONFIGURATION_CHANGE,
        requiresApproval: true,
        autoApproveBelowRisk: 'low', // Auto-approve low-risk config changes
        expiryMinutes: 45,
        requiredApprovers: 1,
      },
      {
        actionType: ApprovalActionType.USER_DATA_EXPORT,
        requiresApproval: true,
        autoApproveBelowRisk: undefined, // Never auto-approve — privacy concern
        expiryMinutes: 60,
        requiredApprovers: 2,
      },
      {
        actionType: ApprovalActionType.SCALE_UP,
        requiresApproval: true,
        autoApproveBelowRisk: 'medium', // Auto-approve low/medium risk scale-ups
        expiryMinutes: 30,
        requiredApprovers: 1,
      },
    ];

    for (const policy of defaultPolicies) {
      this.policies.set(policy.actionType, { ...policy });
    }

    this.logger.log(`Loaded ${defaultPolicies.length} default approval policies`);
  }

  // ─── 2. requestApproval ───────────────────────────────────────────

  /**
   * Create an approval request. The system auto-assesses risk based on
   * action type and payload content, then determines whether the request
   * can be auto-approved or must wait for human review.
   *
   * Returns the created ApprovalRequest (which may already be APPROVED
   * if auto-approved).
   */
  requestApproval(
    agentId: string,
    action: string,
    actionType: ApprovalActionType,
    payload: any,
    justification: string,
  ): ApprovalRequest {
    const id = this.generateRequestId();
    const riskAssessment = this.assessRisk(actionType, payload);
    const policy = this.policies.get(actionType);

    if (!policy) {
      this.logger.warn(
        `No approval policy found for action type "${actionType}" — defaulting to requiring approval`,
      );
    }

    const effectivePolicy = policy ?? {
      actionType,
      requiresApproval: true,
      expiryMinutes: 60,
      requiredApprovers: 1,
    };

    const now = new Date();
    const expiresAt = new Date(now.getTime() + effectivePolicy.expiryMinutes * 60_000);

    // Determine initial status: auto-approve if policy allows it and risk is low enough
    let status = ApprovalStatus.PENDING;
    let approvedBy: string | null = null;
    let resolvedAt: Date | null = null;

    if (effectivePolicy.requiresApproval && effectivePolicy.autoApproveBelowRisk) {
      const autoApproveThreshold = RISK_LEVEL_ORDER[effectivePolicy.autoApproveBelowRisk] ?? -1;
      const assessedLevel = RISK_LEVEL_ORDER[riskAssessment.riskLevel] ?? 99;

      if (assessedLevel <= autoApproveThreshold) {
        status = ApprovalStatus.APPROVED;
        approvedBy = 'system:auto-approve';
        resolvedAt = new Date();
        this.logger.log(
          `Auto-approved request ${id}: action="${action}" type=${actionType} risk=${riskAssessment.riskLevel}`,
        );
      }
    }

    if (!effectivePolicy.requiresApproval) {
      // Policy says this action type doesn't require approval at all
      status = ApprovalStatus.APPROVED;
      approvedBy = 'system:no-approval-required';
      resolvedAt = new Date();
    }

    const request: ApprovalRequest = {
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

    // Emit event
    if (status === ApprovalStatus.APPROVED) {
      this.emitEvent(ApprovalEventType.APPROVAL_AUTO_APPROVED, request);
    } else {
      this.emitEvent(ApprovalEventType.APPROVAL_REQUESTED, request);
    }

    this.logger.log(
      `Approval request created: ${id} agent=${agentId} action="${action}" type=${actionType} risk=${riskAssessment.riskLevel} status=${status}`,
    );

    return { ...request };
  }

  // ─── 3. approve ───────────────────────────────────────────────────

  /**
   * Approve a pending approval request. Validates that the request
   * exists, is still PENDING, and has not expired.
   */
  approve(requestId: string, approvedBy: string): ApprovalRequest {
    const request = this.requests.get(requestId);

    if (!request) {
      throw new Error(`Approval request "${requestId}" not found`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(
        `Cannot approve request "${requestId}" — current status is "${request.status}", expected "${ApprovalStatus.PENDING}"`,
      );
    }

    // Check if the request has expired
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

    this.logger.log(
      `Approval granted: ${requestId} approvedBy="${approvedBy}" action="${request.action}" type=${request.actionType}`,
    );

    return { ...request };
  }

  // ─── 4. reject ────────────────────────────────────────────────────

  /**
   * Reject a pending approval request with a reason.
   */
  reject(requestId: string, rejectedBy: string, reason: string): ApprovalRequest {
    const request = this.requests.get(requestId);

    if (!request) {
      throw new Error(`Approval request "${requestId}" not found`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(
        `Cannot reject request "${requestId}" — current status is "${request.status}", expected "${ApprovalStatus.PENDING}"`,
      );
    }

    request.status = ApprovalStatus.REJECTED;
    request.approvedBy = rejectedBy;
    request.rejectionReason = reason;
    request.resolvedAt = new Date();

    this.emitEvent(ApprovalEventType.APPROVAL_REJECTED, request);

    this.logger.warn(
      `Approval rejected: ${requestId} rejectedBy="${rejectedBy}" reason="${reason}" action="${request.action}" type=${request.actionType}`,
    );

    return { ...request };
  }

  // ─── 5. cancel ────────────────────────────────────────────────────

  /**
   * Cancel a pending approval request. Only PENDING requests can be
   * cancelled. Useful when an agent abandons the intended action.
   */
  cancel(requestId: string): ApprovalRequest {
    const request = this.requests.get(requestId);

    if (!request) {
      throw new Error(`Approval request "${requestId}" not found`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(
        `Cannot cancel request "${requestId}" — current status is "${request.status}", expected "${ApprovalStatus.PENDING}"`,
      );
    }

    request.status = ApprovalStatus.CANCELLED;
    request.resolvedAt = new Date();
    request.metadata.cancelledAt = new Date().toISOString();

    this.emitEvent(ApprovalEventType.APPROVAL_CANCELLED, request);

    this.logger.log(
      `Approval cancelled: ${requestId} action="${request.action}" type=${request.actionType}`,
    );

    return { ...request };
  }

  // ─── 6. checkApprovalRequired ─────────────────────────────────────

  /**
   * Check if a given action type requires human approval at the
   * specified risk level. Takes into account auto-approve thresholds.
   */
  checkApprovalRequired(
    actionType: ApprovalActionType,
    riskLevel?: 'low' | 'medium' | 'high' | 'critical',
  ): boolean {
    const policy = this.policies.get(actionType);

    if (!policy) {
      // No policy found — default to requiring approval for safety
      return true;
    }

    if (!policy.requiresApproval) {
      return false;
    }

    // If a risk level is provided, check against auto-approve threshold
    if (riskLevel && policy.autoApproveBelowRisk) {
      const threshold = RISK_LEVEL_ORDER[policy.autoApproveBelowRisk] ?? -1;
      const assessed = RISK_LEVEL_ORDER[riskLevel] ?? 99;
      if (assessed <= threshold) {
        return false; // Would be auto-approved
      }
    }

    return true;
  }

  // ─── 7. getRequest ────────────────────────────────────────────────

  /**
   * Retrieve a single approval request by ID. Returns a copy.
   */
  getRequest(requestId: string): ApprovalRequest | null {
    const request = this.requests.get(requestId);
    return request ? { ...request } : null;
  }

  // ─── 8. getPendingRequests ────────────────────────────────────────

  /**
   * Get all pending approval requests, optionally filtered by agent ID.
   */
  getPendingRequests(agentId?: string): ApprovalRequest[] {
    const results: ApprovalRequest[] = [];

    for (const request of this.requests.values()) {
      if (request.status === ApprovalStatus.PENDING) {
        if (!agentId || request.agentId === agentId) {
          results.push(request);
        }
      }
    }

    // Sort by requestedAt ascending (oldest first — most urgent)
    results.sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());

    return results.map((r) => ({ ...r }));
  }

  // ─── 9. getRequestsByActionType ───────────────────────────────────

  /**
   * Get all approval requests for a given action type, regardless of status.
   */
  getRequestsByActionType(actionType: ApprovalActionType): ApprovalRequest[] {
    const results: ApprovalRequest[] = [];

    for (const request of this.requests.values()) {
      if (request.actionType === actionType) {
        results.push(request);
      }
    }

    // Sort by requestedAt descending (most recent first)
    results.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

    return results.map((r) => ({ ...r }));
  }

  // ─── 10. enforceApproval ──────────────────────────────────────────

  /**
   * THE GATEWAY METHOD. Called before any critical action to ensure
   * that human approval has been obtained (or can be auto-approved).
   *
   * If approval is required and not yet obtained, the action is blocked
   * and an approval request is created. If auto-approve conditions are
   * met, the action is allowed immediately.
   *
   * Returns { allowed, requestId, reason }.
   */
  enforceApproval(
    agentId: string,
    action: string,
    actionType: ApprovalActionType,
    payload: any,
  ): EnforceResult {
    const riskAssessment = this.assessRisk(actionType, payload);
    const approvalRequired = this.checkApprovalRequired(actionType, riskAssessment.riskLevel);

    // If no approval is required (or would be auto-approved), allow immediately
    if (!approvalRequired) {
      // Create a record but auto-approve
      const request = this.requestApproval(
        agentId,
        action,
        actionType,
        payload,
        `Auto-approved via enforceApproval: risk=${riskAssessment.riskLevel}`,
      );

      return {
        allowed: true,
        requestId: request.id,
        reason: `Action auto-approved: risk level "${riskAssessment.riskLevel}" is within auto-approve threshold for ${actionType}`,
      };
    }

    // Approval is required — check if there's already a pending approved request
    // for this exact agent + action + type combination
    const existingApproved = this.findExistingApproval(agentId, action, actionType, payload);
    if (existingApproved) {
      return {
        allowed: true,
        requestId: existingApproved.id,
        reason: `Action already approved via request ${existingApproved.id}`,
      };
    }

    // Block the action and create a pending approval request
    const request = this.requestApproval(
      agentId,
      action,
      actionType,
      payload,
      `Approval required via enforceApproval: risk=${riskAssessment.riskLevel}`,
    );

    return {
      allowed: false,
      requestId: request.id,
      reason:
        `Action requires human approval. Risk level: "${riskAssessment.riskLevel}". ` +
        `Request ${request.id} is pending. Expires at ${request.expiresAt.toISOString()}.`,
    };
  }

  // ─── 11. processExpiredRequests ───────────────────────────────────

  /**
   * Scan all PENDING requests and mark any that have passed their
   * expiry time as EXPIRED. Should be called periodically (e.g., via
   * a cron job or interval).
   *
   * Returns the number of requests that were expired.
   */
  processExpiredRequests(): number {
    const now = new Date();
    let expiredCount = 0;

    for (const request of this.requests.values()) {
      if (request.status !== ApprovalStatus.PENDING) continue;
      if (request.expiresAt && now > request.expiresAt) {
        request.status = ApprovalStatus.EXPIRED;
        request.resolvedAt = now;
        request.metadata.expiredAt = now.toISOString();

        this.emitEvent(ApprovalEventType.APPROVAL_EXPIRED, request);
        expiredCount++;

        this.logger.warn(
          `Approval request expired: ${request.id} action="${request.action}" type=${request.actionType} agent=${request.agentId}`,
        );
      }
    }

    if (expiredCount > 0) {
      this.logger.log(`Processed ${expiredCount} expired approval request(s)`);
    }

    return expiredCount;
  }

  // ─── 12. assessRisk ───────────────────────────────────────────────

  /**
   * Auto-assess risk level based on action type and payload content.
   * This is a heuristic risk engine that considers factors like:
   *  - The inherent risk of the action type
   *  - Payload content (amounts, environments, scope, targets)
   *  - Reversibility of the action
   *
   * Returns a RiskAssessment with level, factors, impact description,
   * and reversibility classification.
   */
  assessRisk(actionType: ApprovalActionType, payload: any): RiskAssessment {
    const factors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let reversibility: 'reversible' | 'partially_reversible' | 'irreversible' =
      'partially_reversible';
    let impactDescription = '';

    const p = payload ?? {};

    switch (actionType) {
      case ApprovalActionType.DELETE: {
        // Deletion risk depends on what's being deleted and where
        const target = (p.target ?? p.resource ?? p.path ?? '').toString().toLowerCase();
        const environment = (p.environment ?? p.env ?? '').toString().toLowerCase();

        if (target.includes('production') || environment === 'production') {
          riskLevel = 'critical';
          reversibility = 'irreversible';
          factors.push('Deletion targets production environment');
          factors.push('Production data loss is irreversible');
          impactDescription =
            'Irreversible deletion in production — data will be permanently lost with no recovery path.';
        } else if (target.includes('database') || target.includes('db')) {
          riskLevel = 'critical';
          reversibility = 'irreversible';
          factors.push('Database deletion is irreversible without backup');
          impactDescription =
            'Database deletion — data will be permanently lost unless a backup exists.';
        } else if (target.includes('user') || target.includes('account')) {
          riskLevel = 'high';
          reversibility = 'partially_reversible';
          factors.push('User/account deletion may affect real people');
          impactDescription = 'User data deletion — may impact real users and their stored data.';
        } else if (environment === 'staging' || environment === 'test') {
          riskLevel = 'low';
          reversibility = 'reversible';
          factors.push('Deletion in non-production environment');
          impactDescription =
            'Deletion in test/staging — limited blast radius, usually recoverable.';
        } else {
          riskLevel = 'medium';
          reversibility = 'partially_reversible';
          factors.push('Generic deletion operation');
          impactDescription =
            'Deletion of a resource — may be partially recoverable depending on backup state.';
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
        impactDescription =
          hasTests && hasReview && rollbackPlan
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
        } else if (amount > 1000) {
          riskLevel = 'high';
          reversibility = 'partially_reversible';
          factors.push(`Payment amount is significant: ${amount} ${currency.toUpperCase()}`);
          impactDescription = `Significant payment of ${amount} ${currency.toUpperCase()} — may be partially recoverable.`;
        } else if (amount > 100) {
          riskLevel = 'medium';
          reversibility = 'partially_reversible';
          factors.push(`Moderate payment: ${amount} ${currency.toUpperCase()}`);
          impactDescription = `Moderate payment of ${amount} ${currency.toUpperCase()}.`;
        } else {
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
        } else if (recipientCount > 1000) {
          riskLevel = 'high';
          factors.push(`Large audience email: ${recipientCount} recipients`);
        } else if (recipientCount > 100) {
          riskLevel = 'medium';
          factors.push(`Medium audience email: ${recipientCount} recipients`);
        } else {
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
        impactDescription =
          'Social media post is public-facing and may be screenshotted or shared before deletion is possible.';
        break;
      }

      case ApprovalActionType.SSH_ACCESS: {
        const target = (p.target ?? p.host ?? '').toString().toLowerCase();
        const environment = (p.environment ?? p.env ?? '').toString().toLowerCase();
        const isRoot = p.user === 'root' || p.root === true;
        const isInteractive = p.interactive !== false; // default to interactive

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
        impactDescription =
          'DNS changes propagate globally with TTL delays — even after reverting, users may experience prolonged outage due to DNS caching.';
        break;
      }

      case ApprovalActionType.DATABASE_MIGRATION: {
        const isDestructive = p.destructive === true || p.irreversible === true;
        const environment = (p.environment ?? p.env ?? '').toString().toLowerCase();
        const affectsData = p.affectsData !== false; // default true
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
        impactDescription =
          'API key rotation is generally reversible (old key can be restored), but there may be a brief service interruption during propagation.';
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
        } else if (recordCount > 10000) {
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
        impactDescription =
          'Once user data is exported, it cannot be "un-exported" — the data exists outside the system and may be distributed further.';
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
        } else if (scaleFactor > 3) {
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
        impactDescription =
          'Scaling operations are generally reversible (scale back down), though there may be brief performance impact during the transition.';
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

  // ─── 13. getApprovalStats ─────────────────────────────────────────

  /**
   * Compute statistics about the approval system:
   * total requests, by status, by action type, average approval time,
   * and overall approval rate.
   */
  getApprovalStats(): ApprovalStats {
    const allRequests = [...this.requests.values()];

    const byStatus: Record<ApprovalStatus, number> = {
      [ApprovalStatus.PENDING]: 0,
      [ApprovalStatus.APPROVED]: 0,
      [ApprovalStatus.REJECTED]: 0,
      [ApprovalStatus.EXPIRED]: 0,
      [ApprovalStatus.CANCELLED]: 0,
    };

    const byActionType: Record<string, number> = {};

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

    const averageApprovalTimeMs =
      approvalTimeCount > 0 ? Math.round(totalApprovalTimeMs / approvalTimeCount) : null;

    const approvalRate = resolvedCount > 0 ? approvedCount / resolvedCount : 0;

    return {
      totalRequests: allRequests.length,
      byStatus,
      byActionType,
      averageApprovalTimeMs,
      approvalRate: Math.round(approvalRate * 10000) / 10000, // 4 decimal places
    };
  }

  // ─── 14. updatePolicy ─────────────────────────────────────────────

  /**
   * Update the approval policy for a given action type.
   * Merges the provided partial policy with the existing one.
   */
  updatePolicy(
    actionType: ApprovalActionType,
    policy: Partial<Omit<ApprovalPolicy, 'actionType'>>,
  ): ApprovalPolicy {
    const existing = this.policies.get(actionType);

    if (!existing) {
      // Create a new policy if one doesn't exist
      const newPolicy: ApprovalPolicy = {
        actionType,
        requiresApproval: policy.requiresApproval ?? true,
        autoApproveBelowRisk: policy.autoApproveBelowRisk,
        expiryMinutes: policy.expiryMinutes ?? 60,
        requiredApprovers: policy.requiredApprovers ?? 1,
      };
      this.policies.set(actionType, newPolicy);
      this.logger.log(
        `Created new approval policy for ${actionType}: requiresApproval=${newPolicy.requiresApproval} autoApproveBelowRisk=${newPolicy.autoApproveBelowRisk ?? 'none'}`,
      );
      return { ...newPolicy };
    }

    // Merge updates
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

    this.logger.log(
      `Updated approval policy for ${actionType}: requiresApproval=${existing.requiresApproval} autoApproveBelowRisk=${existing.autoApproveBelowRisk ?? 'none'} expiryMinutes=${existing.expiryMinutes} requiredApprovers=${existing.requiredApprovers}`,
    );

    return { ...existing };
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Generate a unique request ID with a readable prefix.
   */
  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `apr-${timestamp}-${random}`;
  }

  /**
   * Emit an approval event to the bounded event log.
   */
  private emitEvent(type: ApprovalEventType, request: ApprovalRequest): void {
    const event: ApprovalEvent = {
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

    // Bound the event log
    if (this.events.length > MAX_EVENTS) {
      this.events.splice(0, this.events.length - MAX_EVENTS);
    }
  }

  /**
   * Find an existing APPROVED request for the same agent, action,
   * action type, and payload. Used by enforceApproval to avoid
   * duplicate approval requests.
   */
  private findExistingApproval(
    agentId: string,
    action: string,
    actionType: ApprovalActionType,
    payload: any,
  ): ApprovalRequest | null {
    for (const request of this.requests.values()) {
      if (
        request.agentId === agentId &&
        request.action === action &&
        request.actionType === actionType &&
        request.status === ApprovalStatus.APPROVED &&
        this.payloadMatches(request.payload, payload)
      ) {
        // Verify the approval hasn't "stale expired" — keep a generous window
        // of 5 minutes after approval for enforcement
        if (request.resolvedAt) {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);
          if (request.resolvedAt < fiveMinutesAgo) {
            continue; // Approval is too old
          }
        }
        return request;
      }
    }
    return null;
  }

  /**
   * Shallow-compare two payloads for matching purposes.
   * Uses JSON serialization for deep comparison.
   */
  private payloadMatches(a: any, b: any): boolean {
    try {
      return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
    } catch {
      return false;
    }
  }

  /**
   * Bound the requests map to prevent unbounded memory growth.
   * When the map exceeds MAX_REQUESTS, the oldest requests are removed.
   */
  private boundRequests(): void {
    if (this.requests.size <= MAX_REQUESTS) return;

    // Sort by requestedAt and remove the oldest entries
    const entries = [...this.requests.entries()].sort(
      (a, b) => a[1].requestedAt.getTime() - b[1].requestedAt.getTime(),
    );

    const excess = this.requests.size - MAX_REQUESTS;
    for (let i = 0; i < excess; i++) {
      this.requests.delete(entries[i][0]);
    }

    this.logger.debug(
      `Pruned ${excess} oldest approval request(s) to maintain bound of ${MAX_REQUESTS}`,
    );
  }
}
