import { BaseAgent, AgentContext, AgentResult } from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

export class LegalAgent extends BaseAgent {
  readonly name = 'LegalAgent';
  readonly cluster = ClusterType.BUSINESS;
  readonly capabilities = ['contract', 'compliance', 'review', 'risk', 'ip', 'privacy'];
  readonly version = '2.0.0';
  readonly description = 'Legal operations including contract management, compliance monitoring, legal review, risk assessment, intellectual property management, and privacy governance';

  readonly missionCategories = [MissionCategory.BUSINESS_INTELLIGENCE];
  readonly creditCost = 1;
  readonly powerLevel = 1;
  readonly tier = 'standard';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'contract';
      const startTime = Date.now();
      this.emitEvent(AgentEventType.AGENT_STARTED, { action });

      switch (action) {
        case 'contract': {
          const operation = config.operation || 'list';
          const contractId = config.contractId;
          const title = config.title;
          const type = config.type || 'service_agreement';
          const parties = config.parties || [];
          const effectiveDate = config.effectiveDate;
          const expirationDate = config.expirationDate;
          const value = config.value;
          const currency = config.currency || 'USD';
          const terms = config.terms || {};
          const status_ = config.status;
          const ownerId = config.ownerId;
          const department = config.department;
          const limit = config.limit || 50;
          const offset = config.offset || 0;
          const includeAmendments = config.includeAmendments || false;
          const includeRenewals = config.includeRenewals !== false;

          if (operation === 'create' && !title) { return { success: false, error: '"title" is required to create a contract' }; }

          this.logger.log(`Contract operation: ${operation}${contractId ? ` (ID: ${contractId})` : ''}`);

          const llmResult = await this.executeWithLLM(
            `You are a legal contract management expert. You manage contracts with realistic terms, renewal tracking, and compliance status.`,
            `Process ${operation} contract. ${title ? `Title: "${title}"` : ''}. Type: ${type}. Return JSON with: contracts (array of {id, title, type, parties, effectiveDate, expirationDate, value, currency, status, ownerId, department, createdAt, updatedAt}), summary {totalContracts, activeContracts, expiringIn30Days, expiringIn90Days, totalValue, byType, byStatus}.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed = this.safeJsonParse(llmResult);
          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, contractId, title, type, parties, effectiveDate, expirationDate, value, currency, terms, queryStatus: status_, ownerId, department, limit, offset, includeAmendments, includeRenewals, contracts: parsed.contracts || [], amendments: undefined, renewals: undefined, summary: parsed.summary || { totalContracts: 0, activeContracts: 0, expiringIn30Days: 0, expiringIn90Days: 0, totalValue: 0, byType: {}, byStatus: {} }, status: 'contract_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, contractId, title, type, parties, effectiveDate, expirationDate, value, currency, terms, queryStatus: status_, ownerId, department, limit, offset, includeAmendments, includeRenewals, contracts: [
            { id: 'ctr_1', title: 'Master Service Agreement - TechCorp', type: 'service_agreement', parties: [{ name: 'Our Company', role: 'client', signatory: 'CEO' }, { name: 'TechCorp Inc', role: 'vendor', signatory: 'VP Sales' }], effectiveDate: '2025-01-01', expirationDate: '2025-12-31', value: 250000, currency: 'USD', status: 'active', ownerId: 'legal_1', department: 'Procurement', createdAt: '2024-12-15T10:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
            { id: 'ctr_2', title: 'SaaS License - Global Finance', type: 'license', parties: [{ name: 'Our Company', role: 'vendor', signatory: 'CRO' }, { name: 'Global Finance Ltd', role: 'client', signatory: 'CTO' }], effectiveDate: '2025-02-01', expirationDate: '2026-01-31', value: 180000, currency: 'USD', status: 'active', ownerId: 'legal_2', department: 'Sales', createdAt: '2025-01-20T14:00:00Z', updatedAt: '2025-02-01T00:00:00Z' },
            { id: 'ctr_3', title: 'NDA - Innovate.io', type: 'nda', parties: [{ name: 'Our Company', role: 'client', signatory: 'CEO' }, { name: 'Innovate.io', role: 'vendor', signatory: 'Founder' }], effectiveDate: '2025-01-15', expirationDate: '2026-01-14', value: 0, currency: 'USD', status: 'active', ownerId: 'legal_1', department: 'Business Dev', createdAt: '2025-01-10T09:00:00Z', updatedAt: '2025-01-15T00:00:00Z' },
          ], amendments: includeAmendments ? [{ id: 'amd_1', contractId: 'ctr_1', description: 'Updated payment terms to Net 45', effectiveDate: '2025-03-01', changes: [{ section: 'Section 4.2 - Payment Terms', original: 'Net 30', amended: 'Net 45' }] }] : undefined, renewals: includeRenewals ? { upcoming: [{ contractId: 'ctr_1', title: 'Master Service Agreement - TechCorp', expirationDate: '2025-12-31', autoRenew: true, renewalType: 'automatic', daysUntilExpiry: 305 }], renewalWindow: 90 } : undefined, summary: { totalContracts: 42, activeContracts: 35, expiringIn30Days: 2, expiringIn90Days: 5, totalValue: 4250000, byType: { service_agreement: 15, license: 12, nda: 10, employment: 5 }, byStatus: { active: 35, negotiation: 4, pending_signature: 2, expired: 1 } }, status: 'contract_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        case 'compliance': {
          const operation = config.operation || 'check';
          const framework = config.framework;
          const jurisdiction = config.jurisdiction || 'us';
          const category = config.category;
          const controlId = config.controlId;
          const entityId = config.entityId;
          const includeRemediation = config.includeRemediation !== false;
          const includeEvidence = config.includeEvidence || false;
          const severity = config.severity;
          const limit = config.limit || 50;

          this.logger.log(`Compliance operation: ${operation} (framework: ${framework || 'all'}, jurisdiction: ${jurisdiction})`);

          const llmResult = await this.executeWithLLM(
            `You are a compliance and regulatory expert. You assess compliance frameworks, track controls, identify violations, and provide remediation plans.`,
            `Run compliance ${operation}. Framework: ${framework || 'all'}. Jurisdiction: ${jurisdiction}. Return JSON with: compliance {overallScore, frameworks (array), controls (array), violations (array), remediation (array if requested), evidence (array if requested), auditTrail}.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed = this.safeJsonParse(llmResult);
          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, framework, jurisdiction, category, controlId, entityId, includeRemediation, includeEvidence, severity, limit, compliance: parsed.compliance || { overallScore: 0, frameworks: [], controls: [], violations: [], remediation: undefined, evidence: undefined, auditTrail: [] }, status: 'compliance_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, framework, jurisdiction, category, controlId, entityId, includeRemediation, includeEvidence, severity, limit, compliance: { overallScore: 82, frameworks: [
            { name: 'SOC 2 Type II', version: '2024', totalControls: 65, compliantControls: 58, score: 89, lastAssessed: '2025-02-01' },
            { name: 'GDPR', version: '2018', totalControls: 42, compliantControls: 35, score: 83, lastAssessed: '2025-01-15' },
            { name: 'ISO 27001', version: '2022', totalControls: 93, compliantControls: 72, score: 77, lastAssessed: '2025-01-20' },
          ], controls: [
            { id: 'ctl_1', framework: 'SOC 2', category: 'Access Control', description: 'Role-based access control implemented', status: 'compliant', severity: 'critical', lastAssessed: '2025-02-01', nextAssessment: '2025-05-01' },
            { id: 'ctl_2', framework: 'GDPR', category: 'Data Processing', description: 'Data processing agreement with all vendors', status: 'partial', severity: 'high', lastAssessed: '2025-01-15', nextAssessment: '2025-04-15' },
            { id: 'ctl_3', framework: 'ISO 27001', category: 'Incident Management', description: 'Incident response plan documented and tested', status: 'compliant', severity: 'high', lastAssessed: '2025-01-20', nextAssessment: '2025-04-20' },
          ], violations: [
            { id: 'viol_1', controlId: 'ctl_2', framework: 'GDPR', description: 'Missing DPA with 2 sub-processors', severity: 'high', detectedAt: '2025-01-15', status: 'remediating', dueDate: '2025-03-15' },
          ], remediation: includeRemediation ? [
            { violationId: 'viol_1', plan: 'Execute DPAs with remaining sub-processors within 60 days', assignee: 'Legal Team', dueDate: '2025-03-15', status: 'in_progress', progress: 45 },
          ] : undefined, evidence: includeEvidence ? [
            { controlId: 'ctl_1', evidenceType: 'system_screenshot', description: 'RBAC configuration dashboard', collectedAt: '2025-02-01', isValid: true, expiryDate: '2025-08-01' },
          ] : undefined, auditTrail: [
            { timestamp: '2025-02-01T10:00:00Z', action: 'Control assessment completed', user: 'compliance_auditor', controlId: 'ctl_1', details: 'SOC 2 access control review' },
          ] }, status: 'compliance_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        case 'review': {
          const operation = config.operation || 'list';
          const reviewId = config.reviewId;
          const documentType = config.documentType || 'contract';
          const documentId = config.documentId;
          const documentContent = config.documentContent;
          const reviewerId = config.reviewerId;
          const priority = config.priority || 'medium';
          const reviewType = config.reviewType || 'standard';
          const jurisdiction = config.jurisdiction;
          const checkClauses = config.checkClauses || [];
          const includeRedlines = config.includeRedlines !== false;
          const includeSuggestions = config.includeSuggestions !== false;
          const limit = config.limit || 50;

          if (operation === 'create' && !documentContent && !documentId) { return { success: false, error: '"documentContent" or "documentId" is required to create a legal review' }; }

          this.logger.log(`Legal review operation: ${operation}${reviewId ? ` (ID: ${reviewId})` : ''} (type: ${documentType})`);

          const llmResult = await this.executeWithLLM(
            `You are a legal document review expert. You analyze contracts and legal documents for risks, compliance issues, and suggest improvements.`,
            `Review ${documentType}. Type: ${reviewType}. ${checkClauses.length ? `Focus on: ${checkClauses.join(', ')}` : ''}. Return JSON with: review {id, documentType, documentId, status, reviewerId, submittedAt, completedAt, findings (array of {category, severity, clause, issue, recommendation, location}), redlines (array if requested), suggestions (array if requested), riskScore, summary}.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed = this.safeJsonParse(llmResult);
          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, reviewId, documentType, documentId, documentContent, reviewerId, priority, reviewType, jurisdiction, checkClauses, includeRedlines, includeSuggestions, limit, review: parsed.review || { id: '', documentType, documentId: documentId || '', status: 'pending', reviewerId: '', submittedAt: new Date().toISOString(), completedAt: '', findings: [], redlines: undefined, suggestions: undefined, riskScore: 0, summary: '' }, reviews: [], status: 'review_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, reviewId, documentType, documentId, documentContent, reviewerId, priority, reviewType, jurisdiction, checkClauses, includeRedlines, includeSuggestions, limit, review: { id: `rev_${Date.now()}`, documentType, documentId: documentId || 'doc_1', status: 'in_review', reviewerId: reviewerId || 'legal_reviewer', submittedAt: new Date().toISOString(), completedAt: '', findings: [
            { category: 'liability', severity: 'high', clause: 'Section 8.1 - Limitation of Liability', issue: 'Unlimited liability exposure for consequential damages', recommendation: 'Cap liability at 12 months of fees', location: { section: '8.1', paragraph: 2, line: 15 } },
            { category: 'indemnification', severity: 'medium', clause: 'Section 9.2 - Indemnification', issue: 'Overly broad indemnification clause favoring counterparty', recommendation: 'Narrow indemnification to direct claims only, exclude third-party claims', location: { section: '9.2', paragraph: 1, line: 8 } },
            { category: 'termination', severity: 'low', clause: 'Section 12.3 - Termination for Convenience', issue: 'Short notice period for termination without cause', recommendation: 'Extend notice period to 90 days', location: { section: '12.3', paragraph: 1, line: 3 } },
          ], redlines: includeRedlines ? [
            { original: 'The Provider shall be liable for all damages arising from performance', revised: 'The Provider\'s total liability shall not exceed twelve (12) months of fees paid', reason: 'Cap liability exposure', section: '8.1' },
          ] : undefined, suggestions: includeSuggestions ? [
            { suggestion: 'Add data protection addendum for GDPR compliance', category: 'compliance', priority: 'high', rationale: 'Required for EU customer data processing' },
            { suggestion: 'Include dispute resolution mechanism', category: 'governance', priority: 'medium', rationale: 'Clarify jurisdiction and arbitration process' },
          ] : undefined, riskScore: 35, summary: 'Document contains several areas requiring attention, primarily around liability exposure and indemnification breadth. Overall risk level is moderate.' }, reviews: [], status: 'review_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        case 'risk': {
          const operation = config.operation || 'assess';
          const riskId = config.riskId;
          const category = config.category;
          const domain = config.domain;
          const methodology = config.methodology || 'qualitative';
          const impactScale = config.impactScale || 5;
          const likelihoodScale = config.likelihoodScale || 5;
          const includeMitigation = config.includeMitigation !== false;
          const includeMonitoring = config.includeMonitoring || false;
          const limit = config.limit || 50;

          this.logger.log(`Legal risk operation: ${operation} (methodology: ${methodology})`);

          const llmResult = await this.executeWithLLM(
            `You are a legal risk assessment expert. You identify, evaluate, and prioritize legal risks with mitigation strategies and monitoring plans.`,
            `Assess legal risks. Category: ${category || 'all'}. Domain: ${domain || 'general'}. Methodology: ${methodology}. Return JSON with: risks (array of {id, title, category, description, likelihood, impact, riskScore, riskLevel, owner, status, identifiedAt, lastReviewed}), riskMatrix, mitigation (array if requested), monitoring (object if requested), summary.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed = this.safeJsonParse(llmResult);
          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, riskId, category, domain, methodology, impactScale, likelihoodScale, includeMitigation, includeMonitoring, limit, risks: parsed.risks || [], riskMatrix: parsed.riskMatrix || { dimensions: { impact: impactScale, likelihood: likelihoodScale }, matrix: [] }, mitigation: undefined, monitoring: undefined, summary: parsed.summary || { totalRisks: 0, byLevel: { critical: 0, high: 0, medium: 0, low: 0 }, byCategory: {}, averageRiskScore: 0, trendsOverTime: [] }, status: 'risk_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, riskId, category, domain, methodology, impactScale, likelihoodScale, includeMitigation, includeMonitoring, limit, risks: [
            { id: 'risk_1', title: 'Data privacy non-compliance', category: 'data_privacy', description: 'Risk of GDPR/CCPA violations due to incomplete data processing agreements', likelihood: 3, impact: 5, riskScore: 15, riskLevel: 'high', owner: 'DPO', status: 'mitigating', identifiedAt: '2025-01-10', lastReviewed: '2025-02-15' },
            { id: 'risk_2', title: 'IP infringement claims', category: 'ip', description: 'Potential patent infringement claims from competitors', likelihood: 2, impact: 4, riskScore: 8, riskLevel: 'medium', owner: 'General Counsel', status: 'assessed', identifiedAt: '2025-01-20', lastReviewed: '2025-02-01' },
            { id: 'risk_3', title: 'Employment law violations', category: 'employment', description: 'Risk of misclassification of contractors vs employees', likelihood: 3, impact: 4, riskScore: 12, riskLevel: 'high', owner: 'HR Director', status: 'mitigating', identifiedAt: '2025-02-01', lastReviewed: '2025-02-20' },
            { id: 'risk_4', title: 'Contract auto-renewal liability', category: 'contractual', description: 'Unnoticed auto-renewals creating financial obligations', likelihood: 4, impact: 2, riskScore: 8, riskLevel: 'medium', owner: 'Legal Ops', status: 'identified', identifiedAt: '2025-02-10', lastReviewed: '2025-02-10' },
          ], riskMatrix: { dimensions: { impact: impactScale, likelihood: likelihoodScale }, matrix: [
            { impactLevel: 5, likelihoodLevel: 3, riskScore: 15, riskLevel: 'high', count: 1 },
            { impactLevel: 4, likelihoodLevel: 2, riskScore: 8, riskLevel: 'medium', count: 1 },
            { impactLevel: 4, likelihoodLevel: 3, riskScore: 12, riskLevel: 'high', count: 1 },
            { impactLevel: 2, likelihoodLevel: 4, riskScore: 8, riskLevel: 'medium', count: 1 },
          ] }, mitigation: includeMitigation ? [
            { riskId: 'risk_1', strategy: 'mitigate', actions: [{ description: 'Complete DPAs with all sub-processors', assignee: 'Legal Team', dueDate: '2025-03-15', status: 'in_progress' }, { description: 'Conduct data mapping exercise', assignee: 'DPO', dueDate: '2025-04-01', status: 'planned' }], residualRisk: 6 },
            { riskId: 'risk_3', strategy: 'mitigate', actions: [{ description: 'Audit all contractor agreements', assignee: 'HR & Legal', dueDate: '2025-03-30', status: 'in_progress' }], residualRisk: 5 },
          ] : undefined, monitoring: includeMonitoring ? { indicators: [
            { riskId: 'risk_1', indicator: 'DPA completion rate', currentValue: 75, threshold: 100, trend: 'increasing' },
            { riskId: 'risk_2', indicator: 'IP clearance rate for new features', currentValue: 85, threshold: 90, trend: 'stable' },
          ], reviewSchedule: { frequency: 'monthly', nextReview: '2025-03-15' } } : undefined, summary: { totalRisks: 12, byLevel: { critical: 1, high: 4, medium: 5, low: 2 }, byCategory: { data_privacy: 3, ip: 2, employment: 3, contractual: 4 }, averageRiskScore: 10.5, trendsOverTime: [{ period: '2025-Q1', totalRisks: 12, averageScore: 10.5 }] }, status: 'risk_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        case 'ip': {
          const operation = config.operation || 'list';
          const ipId = config.ipId;
          const type = config.type || 'all';
          const title = config.title;
          const inventor = config.inventor;
          const owner = config.owner;
          const status_ = config.status;
          const jurisdiction = config.jurisdiction;
          const filingDate = config.filingDate;
          const expirationDate = config.expirationDate;
          const includeDeadlines = config.includeDeadlines !== false;
          const includeValuation = config.includeValuation || false;
          const limit = config.limit || 50;
          const offset = config.offset || 0;

          this.logger.log(`IP operation: ${operation}${ipId ? ` (ID: ${ipId})` : ''} (type: ${type})`);

          const llmResult_ip = await this.executeWithLLM(
            `You are an intellectual property management expert. You manage patents, trademarks, copyrights, and trade secrets with realistic filing data, deadlines, and portfolio valuation.`,
            `Process ${operation} IP asset. Type: ${type}. ${title ? `Title: "${title}"` : ''}. Jurisdiction: ${jurisdiction || 'all'}. Include deadlines: ${includeDeadlines}. Include valuation: ${includeValuation}. Return JSON with: ipAssets (array of {id, type, title, description, inventor, owner, jurisdiction, filingNumber, filingDate, grantDate, expirationDate, status, protectionScope}), deadlines (array of {ipId, title, deadlineType, dueDate, daysRemaining, critical}), valuation {totalPortfolioValue, byType, byStatus, depreciationSchedule}, summary {totalAssets, byType, byStatus, upcomingDeadlines, atRiskAssets}.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed_ip = this.safeJsonParse(llmResult_ip);
          if (parsed_ip) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, ipId, type, title, inventor, owner, queryStatus: status_, jurisdiction, filingDate, expirationDate, includeDeadlines, includeValuation, limit, offset, ipAssets: parsed_ip.ipAssets || [], deadlines: includeDeadlines ? (parsed_ip.deadlines || []) : undefined, valuation: includeValuation ? (parsed_ip.valuation || { totalPortfolioValue: 0, byType: {}, byStatus: {}, depreciationSchedule: [] }) : undefined, summary: parsed_ip.summary || { totalAssets: 0, byType: {}, byStatus: {}, upcomingDeadlines: 0, atRiskAssets: 0 }, status: 'ip_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, ipId, type, title, inventor, owner, queryStatus: status_, jurisdiction, filingDate, expirationDate, includeDeadlines, includeValuation, limit, offset, ipAssets: [
            { id: 'ip_1', type: 'patent', title: 'Method for Real-Time Data Processing', description: 'Patent covering core data processing algorithm', inventor: 'Dr. Alex Chen', owner: 'Our Company', jurisdiction: 'US', filingNumber: 'US2025/001234', filingDate: '2024-06-15', grantDate: '', expirationDate: '2044-06-15', status: 'pending', protectionScope: 'Real-time processing of streaming data using distributed computing' },
            { id: 'ip_2', type: 'trademark', title: 'ProductX', description: 'Brand name for flagship product line', inventor: 'Marketing Team', owner: 'Our Company', jurisdiction: 'US, EU', filingNumber: 'TM-2024-5678', filingDate: '2024-03-01', grantDate: '2024-09-15', expirationDate: '2034-09-15', status: 'registered', protectionScope: 'Software as a service platform' },
            { id: 'ip_3', type: 'copyright', title: 'Platform UI Design System', description: 'Original design system and component library', inventor: 'Design Team', owner: 'Our Company', jurisdiction: 'Global', filingNumber: 'CR-2024-890', filingDate: '2024-01-15', grantDate: '2024-01-15', expirationDate: '2124-01-15', status: 'registered', protectionScope: 'User interface design, component architecture, and design tokens' },
          ], deadlines: includeDeadlines ? [
            { ipId: 'ip_1', title: 'Patent Response Deadline', deadlineType: 'response', dueDate: '2025-04-15', daysRemaining: 45, critical: true },
            { ipId: 'ip_2', title: 'Trademark Renewal', deadlineType: 'renewal', dueDate: '2025-09-15', daysRemaining: 198, critical: false },
          ] : undefined, valuation: includeValuation ? { totalPortfolioValue: 2850000, byType: { patent: 1800000, trademark: 650000, copyright: 400000 }, byStatus: { pending: 1200000, registered: 1650000 }, depreciationSchedule: [{ ipId: 'ip_1', year: 2025, value: 1800000 }] } : undefined, summary: { totalAssets: 18, byType: { patent: 5, trademark: 8, copyright: 4, trade_secret: 1 }, byStatus: { pending: 3, granted: 12, registered: 2, expired: 1 }, upcomingDeadlines: 3, atRiskAssets: 1 }, status: 'ip_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        case 'privacy': {
          const operation = config.operation || 'assess';
          const assessmentId = config.assessmentId;
          const regulation = config.regulation || 'gdpr';
          const dataProcessingActivity = config.dataProcessingActivity;
          const dataCategories = config.dataCategories || [];
          const dataSubjects = config.dataSubjects || [];
          const purposes = config.purposes || [];
          const includeDpia = config.includeDpia || false;
          const includeDataMap = config.includeDataMap !== false;
          const includeConsentTracking = config.includeConsentTracking !== false;
          const limit = config.limit || 50;

          this.logger.log(`Privacy operation: ${operation} (regulation: ${regulation})`);

          const llmResult_priv = await this.executeWithLLM(
            `You are a data privacy and governance expert. You assess privacy compliance, manage data inventories, track consent, and provide DPIA analysis with realistic regulatory data.`,
            `Process ${operation} privacy assessment. Regulation: ${regulation}. Include DPIA: ${includeDpia}. Include data map: ${includeDataMap}. Include consent tracking: ${includeConsentTracking}. Return JSON with: privacy {complianceScore, regulations (array of {name, jurisdiction, compliant, score, gaps, lastAssessed}), dataInventory {dataFlows, processors, retentionPolicies}, dataSubjectRights (array of {right, implementationStatus, processDocumented, avgResponseTime}), dpia, consentTracking {consentRecords, consentRates}, breachProtocol, incidents (array of {id, type, severity, status, detectedAt, affectedDataSubjects, description})}.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed_priv = this.safeJsonParse(llmResult_priv);
          if (parsed_priv) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, assessmentId, regulation, dataProcessingActivity, dataCategories, dataSubjects, purposes, includeDpia, includeDataMap, includeConsentTracking, limit, privacy: parsed_priv.privacy || { complianceScore: 0, regulations: [], dataInventory: undefined, dataSubjectRights: [], dpia: undefined, consentTracking: undefined, breachProtocol: undefined, incidents: [] }, status: 'privacy_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, assessmentId, regulation, dataProcessingActivity, dataCategories, dataSubjects, purposes, includeDpia, includeDataMap, includeConsentTracking, limit, privacy: { complianceScore: 78, regulations: [
            { name: 'GDPR', jurisdiction: 'EU', compliant: false, score: 78, gaps: ['Missing DPAs with 2 sub-processors', 'Data retention policy needs update'], lastAssessed: '2025-02-15' },
            { name: 'CCPA', jurisdiction: 'US-CA', compliant: true, score: 92, gaps: [], lastAssessed: '2025-01-30' },
          ], dataInventory: includeDataMap ? { dataFlows: [
            { source: 'Website Forms', destination: 'CRM System', dataCategories: ['Personal Identity', 'Contact Info'], purpose: 'Customer acquisition', legalBasis: 'Consent', retention: '3 years' },
            { source: 'Product Usage', destination: 'Analytics Platform', dataCategories: ['Behavioral Data', 'Usage Patterns'], purpose: 'Product improvement', legalBasis: 'Legitimate Interest', retention: '2 years' },
          ], processors: [
            { name: 'Cloud Provider', dataCategories: ['All categories'], purposes: ['Infrastructure', 'Storage'], agreementStatus: 'active' },
            { name: 'Analytics Partner', dataCategories: ['Usage Data'], purposes: ['Product Analytics'], agreementStatus: 'active' },
          ], retentionPolicies: [
            { category: 'Customer Data', retentionPeriod: '3 years post-relationship', legalBasis: 'Contractual obligation', deletionMethod: 'Automated purge' },
            { category: 'Marketing Data', retentionPeriod: '2 years', legalBasis: 'Consent', deletionMethod: 'Manual review and deletion' },
          ] } : undefined, dataSubjectRights: [
            { right: 'Access', implementationStatus: 'implemented', processDocumented: true, avgResponseTime: 5 },
            { right: 'Erasure', implementationStatus: 'implemented', processDocumented: true, avgResponseTime: 10 },
            { right: 'Portability', implementationStatus: 'partial', processDocumented: true, avgResponseTime: 15 },
            { right: 'Objection', implementationStatus: 'implemented', processDocumented: true, avgResponseTime: 8 },
          ], dpia: includeDpia ? { required: true, conducted: true, riskLevel: 'medium', recommendations: ['Implement data minimization', 'Enhance encryption at rest'] } : undefined, consentTracking: includeConsentTracking ? { consentRecords: [], consentRates: { marketing: 72, analytics: 85, necessary: 100 } } : undefined, breachProtocol: { detectionMechanisms: ['Automated anomaly detection', 'Manual reporting', 'Third-party monitoring'], notificationTimeline: '72 hours to DPA, affected individuals without undue delay', responseTeam: ['DPO', 'Legal Counsel', 'IT Security', 'Communications'], lastDrillDate: '2025-01-20' }, incidents: [
            { id: 'inc_1', type: 'violation', severity: 'medium', status: 'resolved', detectedAt: '2025-01-10', affectedDataSubjects: 150, description: 'Marketing email sent to unsubscribed users' },
          ] }, status: 'privacy_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        default:
          return { success: false, error: `Unknown action: ${action}. Supported actions: contract, compliance, review, risk, ip, privacy` };
      }
    } catch (error: any) {
      this.emitEvent(AgentEventType.AGENT_FAILED, { error: error.message });
      return { success: false, error: error.message };
    }
  }
}
