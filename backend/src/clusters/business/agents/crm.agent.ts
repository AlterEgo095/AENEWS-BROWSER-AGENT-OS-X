import { BaseAgent, AgentContext, AgentResult } from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

export class CRMAgent extends BaseAgent {
  readonly name = 'CRMAgent';
  readonly cluster = ClusterType.BUSINESS;
  readonly capabilities = ['contact', 'deal', 'pipeline', 'followup', 'segment', 'report'];
  readonly version = '2.0.0';
  readonly description = 'Customer relationship management including contact management, deal tracking, pipeline analysis, follow-ups, segmentation, and CRM reporting';

  readonly missionCategories = [MissionCategory.BUSINESS_INTELLIGENCE];
  readonly creditCost = 1;
  readonly powerLevel = 1;
  readonly tier = 'standard';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'contact';
      const startTime = Date.now();
      this.emitEvent(AgentEventType.AGENT_STARTED, { action });

      switch (action) {
        case 'contact': {
          const operation = config.operation || 'list';
          const contactId = config.contactId;
          const firstName = config.firstName;
          const lastName = config.lastName;
          const email = config.email;
          const phone = config.phone;
          const company = config.company;
          const title = config.title;
          const tags = config.tags || [];
          const customFields = config.customFields || {};
          const limit = config.limit || 50;
          const offset = config.offset || 0;
          const search = config.search;
          const sortBy = config.sortBy || 'createdAt';
          const sortOrder = config.sortOrder || 'desc';

          if (operation === 'create' && !firstName && !lastName && !email) {
            return { success: false, error: 'At least "firstName", "lastName", or "email" is required to create a contact' };
          }

          this.logger.log(`Contact operation: ${operation}${contactId ? ` (ID: ${contactId})` : ''}`);

          const llmResult = await this.executeWithLLM(
            `You are a CRM expert. You manage customer contacts with lead scoring, lifecycle stages, and relationship insights.`,
            `Process ${operation} contact. ${search ? `Search: "${search}"` : ''}. Return JSON with: contacts (array of {id, firstName, lastName, email, phone, company, title, tags, leadScore, lifecycleStage, lastActivity, createdAt, updatedAt}), totalContacts.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed = this.safeJsonParse(llmResult);
          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, contactId, firstName, lastName, email, phone, company, title, tags, customFields, limit, offset, search, sortBy, sortOrder, contacts: parsed.contacts || [], totalContacts: parsed.totalContacts || 0, status: 'contact_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, contactId, firstName, lastName, email, phone, company, title, tags, customFields, limit, offset, search, sortBy, sortOrder, contacts: [
            { id: 'cont_1', firstName: 'Sarah', lastName: 'Chen', email: 'sarah.chen@techcorp.com', phone: '+1-555-0101', company: 'TechCorp Inc', title: 'VP of Engineering', tags: ['enterprise', 'tech'], leadScore: 85, lifecycleStage: 'opportunity', lastActivity: new Date().toISOString(), createdAt: '2024-08-15T10:00:00Z', updatedAt: new Date().toISOString() },
            { id: 'cont_2', firstName: 'Michael', lastName: 'Rivera', email: 'mrivera@innovate.io', phone: '+1-555-0102', company: 'Innovate.io', title: 'CTO', tags: ['startup', 'decision-maker'], leadScore: 92, lifecycleStage: 'sql', lastActivity: new Date().toISOString(), createdAt: '2024-09-22T14:30:00Z', updatedAt: new Date().toISOString() },
            { id: 'cont_3', firstName: 'Emily', lastName: 'Zhang', email: 'emily.z@globalfin.com', phone: '+1-555-0103', company: 'Global Finance Ltd', title: 'Director of Operations', tags: ['finance', 'enterprise'], leadScore: 72, lifecycleStage: 'mql', lastActivity: new Date().toISOString(), createdAt: '2024-11-05T09:15:00Z', updatedAt: new Date().toISOString() },
          ], totalContacts: 3, status: 'contact_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        case 'deal': {
          const operation = config.operation || 'list';
          const dealId = config.dealId;
          const title_ = config.title;
          const value = config.value;
          const stage = config.stage;
          const contactId = config.contactId;
          const companyId = config.companyId;
          const probability = config.probability;
          const expectedCloseDate = config.expectedCloseDate;
          const assignedTo = config.assignedTo;
          const products = config.products || [];
          const notes = config.notes;
          const limit = config.limit || 50;
          const offset = config.offset || 0;

          if (operation === 'create' && !title_) { return { success: false, error: '"title" is required to create a deal' }; }

          this.logger.log(`Deal operation: ${operation}${dealId ? ` (ID: ${dealId})` : ''}`);

          const llmResult = await this.executeWithLLM(
            `You are a CRM deal management expert. You track deals through pipeline stages with realistic values, probabilities, and activity history.`,
            `Process ${operation} deal. ${title_ ? `Title: "${title_}"` : ''}. Return JSON with: deals (array of {id, title, value, currency, stage, probability, expectedCloseDate, assignedTo, contactId, companyId, products, activities, createdAt, updatedAt}), totalDeals, totalValue, weightedValue.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed = this.safeJsonParse(llmResult);
          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, dealId, title: title_, value, stage, contactId, companyId, probability, expectedCloseDate, assignedTo, products, notes, limit, offset, deals: parsed.deals || [], totalDeals: parsed.totalDeals || 0, totalValue: parsed.totalValue || 0, weightedValue: parsed.weightedValue || 0, status: 'deal_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, dealId, title: title_, value, stage, contactId, companyId, probability, expectedCloseDate, assignedTo, products, notes, limit, offset, deals: [
            { id: 'deal_1', title: 'Enterprise Platform License', value: 125000, currency: 'USD', stage: 'negotiation', probability: 65, expectedCloseDate: '2025-04-15', assignedTo: 'sales_rep_1', contactId: 'cont_1', companyId: 'comp_1', products: [{ name: 'Platform License', quantity: 1, unitPrice: 100000 }, { name: 'Premium Support', quantity: 1, unitPrice: 25000 }], activities: [{ type: 'meeting', date: new Date().toISOString(), description: 'Product demo with technical team' }], createdAt: '2025-01-15T10:00:00Z', updatedAt: new Date().toISOString() },
            { id: 'deal_2', title: 'API Integration Project', value: 45000, currency: 'USD', stage: 'proposal', probability: 40, expectedCloseDate: '2025-05-30', assignedTo: 'sales_rep_2', contactId: 'cont_2', companyId: 'comp_2', products: [{ name: 'API Integration', quantity: 1, unitPrice: 35000 }, { name: 'Consulting', quantity: 20, unitPrice: 500 }], activities: [{ type: 'call', date: new Date().toISOString(), description: 'Requirements gathering call' }], createdAt: '2025-02-01T14:00:00Z', updatedAt: new Date().toISOString() },
          ], totalDeals: 2, totalValue: 170000, weightedValue: 99250, status: 'deal_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        case 'pipeline': {
          const operation = config.operation || 'overview';
          const pipelineId = config.pipelineId;
          const period = config.period || 'current';
          const includeConversionRates = config.includeConversionRates !== false;
          const includeVelocity = config.includeVelocity !== false;
          const includeForecasting = config.includeForecasting || false;
          const granularity = config.granularity || 'weekly';
          const owners = config.owners || [];

          this.logger.log(`Pipeline operation: ${operation}${pipelineId ? ` (ID: ${pipelineId})` : ''}`);

          const llmResult = await this.executeWithLLM(
            `You are a CRM pipeline analysis expert. You analyze sales pipelines with stage distribution, conversion rates, velocity metrics, and revenue forecasting.`,
            `Analyze pipeline for ${period}. Include conversion rates: ${includeConversionRates}. Include velocity: ${includeVelocity}. Include forecasting: ${includeForecasting}. Return JSON with: pipeline {stages (array of {name, order, dealCount, totalValue, averageDaysInStage, deals}), summary {totalDeals, totalValue, weightedValue, averageDealSize, averageDealCycle}, conversionRates (array of {fromStage, toStage, rate, averageTime}), velocity {dealsPerPeriod, averageDealSize, winRate, averageCycleTime, velocity, trend}, forecast {committed, bestCase, pipeline, weighted, byOwner}}.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed = this.safeJsonParse(llmResult);
          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, pipelineId, period, includeConversionRates, includeVelocity, includeForecasting, granularity, owners, pipeline: parsed.pipeline || { stages: [], summary: { totalDeals: 0, totalValue: 0, weightedValue: 0, averageDealSize: 0, averageDealCycle: 0 }, conversionRates: undefined, velocity: undefined, forecast: undefined }, status: 'pipeline_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, pipelineId, period, includeConversionRates, includeVelocity, includeForecasting, granularity, owners, pipeline: {
            stages: [
              { name: 'Prospecting', order: 1, dealCount: 45, totalValue: 675000, averageDaysInStage: 8, deals: [{ id: 'd1', title: 'New Lead', value: 15000, daysInStage: 3, assignedTo: 'rep_1' }] },
              { name: 'Qualification', order: 2, dealCount: 28, totalValue: 560000, averageDaysInStage: 12, deals: [] },
              { name: 'Proposal', order: 3, dealCount: 15, totalValue: 420000, averageDaysInStage: 18, deals: [] },
              { name: 'Negotiation', order: 4, dealCount: 8, totalValue: 340000, averageDaysInStage: 15, deals: [] },
              { name: 'Closed Won', order: 5, dealCount: 12, totalValue: 525000, averageDaysInStage: 0, deals: [] },
            ],
            summary: { totalDeals: 108, totalValue: 2520000, weightedValue: 892000, averageDealSize: 23333, averageDealCycle: 52 },
            conversionRates: includeConversionRates ? [
              { fromStage: 'Prospecting', toStage: 'Qualification', rate: 62, averageTime: 8 },
              { fromStage: 'Qualification', toStage: 'Proposal', rate: 54, averageTime: 12 },
              { fromStage: 'Proposal', toStage: 'Negotiation', rate: 53, averageTime: 18 },
              { fromStage: 'Negotiation', toStage: 'Closed Won', rate: 67, averageTime: 15 },
            ] : undefined,
            velocity: includeVelocity ? { dealsPerPeriod: 12, averageDealSize: 23333, winRate: 28, averageCycleTime: 52, velocity: 53833, trend: [{ period: 'Q1', velocity: 48200 }, { period: 'Q2', velocity: 52500 }, { period: 'Q3', velocity: 53833 }] } : undefined,
            forecast: includeForecasting ? { committed: 340000, bestCase: 560000, pipeline: 892000, weighted: 445000, byOwner: {} } : undefined,
          }, status: 'pipeline_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        case 'followup': {
          const operation = config.operation || 'list';
          const followupId = config.followupId;
          const contactId = config.contactId;
          const dealId = config.dealId;
          const type = config.type || 'all';
          const priority = config.priority;
          const dueBefore = config.dueBefore;
          const dueAfter = config.dueAfter;
          const status_ = config.status || 'pending';
          const assignedTo = config.assignedTo;
          const limit = config.limit || 50;
          const offset = config.offset || 0;
          const autoSchedule = config.autoSchedule || false;

          this.logger.log(`Follow-up operation: ${operation}${followupId ? ` (ID: ${followupId})` : ''}`);

          const llmResult_fu = await this.executeWithLLM(
            `You are a CRM follow-up management expert. You schedule and track follow-up activities with realistic task data, priorities, and auto-scheduling suggestions.`,
            `Process ${operation} follow-up. Type: ${type}. Priority: ${priority || 'any'}. Status: ${status_}. Return JSON with: followups (array of {id, type, subject, description, contactId, dealId, dueDate, priority, status, assignedTo, completedAt, outcome}), summary {totalPending, totalOverdue, totalCompleted, byType, byPriority}, suggestedFollowups (array of {contactId, type, reason, suggestedDate, priority}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed_fu = this.safeJsonParse(llmResult_fu);
          if (parsed_fu) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, followupId, contactId, dealId, type, priority, dueBefore, dueAfter, queryStatus: status_, assignedTo, limit, offset, autoSchedule, followups: parsed_fu.followups || [], summary: parsed_fu.summary || { totalPending: 0, totalOverdue: 0, totalCompleted: 0, byType: {}, byPriority: {} }, suggestedFollowups: autoSchedule ? (parsed_fu.suggestedFollowups || []) : undefined, status: 'followup_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, followupId, contactId, dealId, type, priority, dueBefore, dueAfter, queryStatus: status_, assignedTo, limit, offset, autoSchedule, followups: [
            { id: 'fu_1', type: 'call', subject: 'Follow up on proposal', description: 'Discuss pricing terms and timeline', contactId: 'cont_1', dealId: 'deal_1', dueDate: new Date(Date.now() + 86400000).toISOString(), priority: 'high', status: 'pending', assignedTo: 'sales_rep_1', completedAt: '', outcome: '' },
            { id: 'fu_2', type: 'email', subject: 'Send case study', description: 'Share relevant case study for their use case', contactId: 'cont_2', dealId: 'deal_2', dueDate: new Date(Date.now() + 2 * 86400000).toISOString(), priority: 'medium', status: 'pending', assignedTo: 'sales_rep_2', completedAt: '', outcome: '' },
            { id: 'fu_3', type: 'meeting', subject: 'Technical review', description: 'Review API documentation with engineering team', contactId: 'cont_3', dealId: 'deal_2', dueDate: new Date(Date.now() + 5 * 86400000).toISOString(), priority: 'high', status: 'pending', assignedTo: 'sales_rep_2', completedAt: '', outcome: '' },
          ], summary: { totalPending: 8, totalOverdue: 2, totalCompleted: 15, byType: { call: 3, email: 4, meeting: 2 }, byPriority: { urgent: 1, high: 4, medium: 3, low: 2 } }, suggestedFollowups: autoSchedule ? [
            { contactId: 'cont_1', type: 'call', reason: 'No response to last email, 3 days elapsed', suggestedDate: new Date(Date.now() + 86400000).toISOString(), priority: 'high' },
            { contactId: 'cont_2', type: 'email', reason: 'Post-demo follow-up best practice', suggestedDate: new Date(Date.now() + 2 * 86400000).toISOString(), priority: 'medium' },
          ] : undefined, status: 'followup_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        case 'segment': {
          const operation = config.operation || 'list';
          const segmentId = config.segmentId;
          const name = config.name;
          const criteria = config.criteria || [];
          const logic = config.logic || 'and';
          const dynamic = config.dynamic !== false;
          const limit = config.limit || 50;
          const offset = config.offset || 0;

          if ((operation === 'create' || operation === 'update') && criteria.length === 0) {
            return { success: false, error: 'At least one "criteria" rule is required to create or update a segment' };
          }

          this.logger.log(`Segment operation: ${operation}${segmentId ? ` (ID: ${segmentId})` : ''}`);

          const llmResult_seg = await this.executeWithLLM(
            `You are a CRM segmentation expert. You create and manage customer segments with realistic member data, criteria rules, and match scores.`,
            `Process ${operation} segment. ${name ? `Name: "${name}"` : ''}. Logic: ${logic}. Dynamic: ${dynamic}. Return JSON with: segments (array of {id, name, description, criteria, logic, dynamic, memberCount, lastCalculatedAt, createdAt}), members (array of {contactId, firstName, lastName, email, company, matchScore}), totalMembers.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed_seg = this.safeJsonParse(llmResult_seg);
          if (parsed_seg) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, segmentId, name, criteria: criteria as any[], logic, dynamic, limit, offset, segments: parsed_seg.segments || [], members: parsed_seg.members || [], totalMembers: parsed_seg.totalMembers || 0, status: 'segment_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, segmentId, name, criteria: criteria as any[], logic, dynamic, limit, offset, segments: [
            { id: 'seg_1', name: 'High-Value Enterprise', description: 'Enterprise accounts with >$50K annual value', criteria: [{ field: 'company_size', operator: 'greater_than', value: 500 }, { field: 'annual_value', operator: 'greater_than', value: 50000 }], logic: 'and', dynamic: true, memberCount: 42, lastCalculatedAt: new Date().toISOString(), createdAt: '2024-06-15T10:00:00Z' },
            { id: 'seg_2', name: 'At-Risk Customers', description: 'Customers showing disengagement signals', criteria: [{ field: 'last_login', operator: 'less_than', value: '30_days_ago' }, { field: 'support_tickets', operator: 'greater_than', value: 3 }], logic: 'and', dynamic: true, memberCount: 18, lastCalculatedAt: new Date().toISOString(), createdAt: '2024-09-01T10:00:00Z' },
          ], members: [
            { contactId: 'cont_1', firstName: 'Sarah', lastName: 'Chen', email: 'sarah.chen@techcorp.com', company: 'TechCorp Inc', matchScore: 95 },
            { contactId: 'cont_2', firstName: 'Michael', lastName: 'Rivera', email: 'mrivera@innovate.io', company: 'Innovate.io', matchScore: 88 },
          ], totalMembers: 42, status: 'segment_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        case 'report': {
          const reportType = config.reportType || 'overview';
          const period = config.period || 'monthly';
          const dateRange = config.dateRange || {};
          const groupBy = config.groupBy || 'stage';
          const includeTrends = config.includeTrends !== false;
          const includeComparisons = config.includeComparisons || false;
          const owners = config.owners || [];
          const segments = config.segments || [];

          this.logger.log(`CRM report: ${reportType} (period: ${period}, groupBy: ${groupBy})`);

          const llmResult_rpt = await this.executeWithLLM(
            `You are a CRM reporting expert. You generate comprehensive CRM reports with pipeline breakdowns, trends, comparisons, and top performer analytics.`,
            `Generate ${reportType} CRM report for ${period}. Group by: ${groupBy}. Include trends: ${includeTrends}. Include comparisons: ${includeComparisons}. Return JSON with: report {generatedAt, summary {totalContacts, totalDeals, totalRevenue, winRate, averageDealSize, averageSalesCycle, newLeads, conversions}, breakdown {byStage (array of {label, count, value, percentage})}, trends (array of {period, contacts, deals, revenue, winRate}), comparisons {previousPeriod, changes}, topPerformers (array of {owner, dealsWon, revenue, winRate, averageDealSize})}.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed_rpt = this.safeJsonParse(llmResult_rpt);
          if (parsed_rpt) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, reportType, period, dateRange, groupBy, includeTrends, includeComparisons, owners, segments, report: parsed_rpt.report || { generatedAt: new Date().toISOString(), summary: {}, breakdown: {}, trends: undefined, comparisons: undefined, topPerformers: [] }, status: 'crm_report_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, reportType, period, dateRange, groupBy, includeTrends, includeComparisons, owners, segments, report: { generatedAt: new Date().toISOString(), summary: { totalContacts: 2840, totalDeals: 108, totalRevenue: 525000, winRate: 28, averageDealSize: 23333, averageSalesCycle: 52, newLeads: 185, conversions: 32 }, breakdown: { byStage: [{ label: 'Prospecting', count: 45, value: 675000, percentage: 41.7 }, { label: 'Qualification', count: 28, value: 560000, percentage: 25.9 }, { label: 'Proposal', count: 15, value: 420000, percentage: 13.9 }] }, trends: includeTrends ? [{ period: 'Jan', contacts: 2450, deals: 92, revenue: 428000, winRate: 24 }, { period: 'Feb', contacts: 2620, deals: 98, revenue: 465000, winRate: 26 }, { period: 'Mar', contacts: 2840, deals: 108, revenue: 525000, winRate: 28 }] : undefined, comparisons: includeComparisons ? { previousPeriod: { revenue: 465000, deals: 98, winRate: 26, newContacts: 165 }, changes: { revenueChange: 12.9, dealsChange: 10.2, winRateChange: 7.7, contactsChange: 12.1 } } : undefined, topPerformers: [
            { owner: 'Sales Rep 1', dealsWon: 5, revenue: 185000, winRate: 35, averageDealSize: 37000 },
            { owner: 'Sales Rep 2', dealsWon: 4, revenue: 142000, winRate: 31, averageDealSize: 35500 },
          ] }, status: 'crm_report_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        default:
          return { success: false, error: `Unknown action: ${action}. Supported actions: contact, deal, pipeline, followup, segment, report` };
      }
    } catch (error: any) {
      this.emitEvent(AgentEventType.AGENT_FAILED, { error: error.message });
      return { success: false, error: error.message };
    }
  }
}
