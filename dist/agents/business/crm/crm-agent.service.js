"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRMAgentService = exports.CRM_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.CRM_AGENT_CONFIG = {
    id: 'business-crm',
    name: 'CRM',
    cluster: agent_interface_1.AgentCluster.BUSINESS,
    version: '1.0.0',
    description: 'CRM agent that handles customer relationship management, contact management, lead tracking, deal pipeline management, conversion analysis, and CRM reporting.',
    capabilities: [
        {
            name: 'createContact',
            description: 'Create a new contact in the CRM system',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Contact name' },
                    email: { type: 'string', description: 'Contact email' },
                    phone: { type: 'string', description: 'Contact phone' },
                    company: { type: 'string', description: 'Company name' },
                    title: { type: 'string', description: 'Job title' },
                    tags: { type: 'array', items: { type: 'string' }, description: 'Contact tags' },
                    source: { type: 'string', description: 'Lead source' },
                },
                required: ['name'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    contactId: { type: 'string' },
                    name: { type: 'string' },
                    status: { type: 'string' },
                    createdAt: { type: 'string' },
                },
            },
        },
        {
            name: 'updateContact',
            description: 'Update an existing contact record',
            inputSchema: {
                type: 'object',
                properties: {
                    contactId: { type: 'string', description: 'Contact ID' },
                    name: { type: 'string', description: 'Updated name' },
                    email: { type: 'string', description: 'Updated email' },
                    phone: { type: 'string', description: 'Updated phone' },
                    company: { type: 'string', description: 'Updated company' },
                    title: { type: 'string', description: 'Updated title' },
                    tags: { type: 'array', items: { type: 'string' }, description: 'Updated tags' },
                    status: { type: 'string', description: 'Contact status' },
                },
                required: ['contactId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    contactId: { type: 'string' },
                    updatedFields: { type: 'array' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'trackDeal',
            description: 'Track or update a deal in the sales pipeline',
            inputSchema: {
                type: 'object',
                properties: {
                    dealId: { type: 'string', description: 'Deal ID (omit to create new)' },
                    title: { type: 'string', description: 'Deal title' },
                    contactId: { type: 'string', description: 'Associated contact ID' },
                    value: { type: 'number', description: 'Deal value' },
                    stage: { type: 'string', description: 'Pipeline stage' },
                    probability: { type: 'number', description: 'Win probability (0-100)' },
                    expectedCloseDate: { type: 'string', description: 'Expected close date' },
                    notes: { type: 'string', description: 'Deal notes' },
                },
                required: ['title'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    dealId: { type: 'string' },
                    title: { type: 'string' },
                    stage: { type: 'string' },
                    value: { type: 'number' },
                    weightedValue: { type: 'number' },
                },
            },
        },
        {
            name: 'managePipeline',
            description: 'Manage the sales pipeline with stage analysis and forecasting',
            inputSchema: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['overview', 'forecast', 'move-deals'], description: 'Pipeline management action' },
                    pipelineId: { type: 'string', description: 'Pipeline ID' },
                    period: { type: 'string', description: 'Reporting period' },
                },
                required: ['action'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    pipelineId: { type: 'string' },
                    totalValue: { type: 'number' },
                    stages: { type: 'array' },
                    forecast: { type: 'object' },
                },
            },
        },
        {
            name: 'analyzeConversion',
            description: 'Analyze conversion rates across pipeline stages',
            inputSchema: {
                type: 'object',
                properties: {
                    period: { type: 'string', description: 'Analysis period' },
                    source: { type: 'string', description: 'Filter by lead source' },
                    fromStage: { type: 'string', description: 'Starting stage' },
                    toStage: { type: 'string', description: 'Ending stage' },
                },
                required: [],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    analysisId: { type: 'string' },
                    overallConversionRate: { type: 'number' },
                    stageConversions: { type: 'array' },
                    insights: { type: 'array' },
                },
            },
        },
        {
            name: 'generateCRMReport',
            description: 'Generate a comprehensive CRM report',
            inputSchema: {
                type: 'object',
                properties: {
                    reportType: { type: 'string', enum: ['summary', 'pipeline', 'activity', 'performance'], description: 'Type of report' },
                    period: { type: 'string', description: 'Report period' },
                    groupBy: { type: 'string', description: 'Group results by (e.g., "source", "owner")' },
                },
                required: ['reportType'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    reportId: { type: 'string' },
                    reportType: { type: 'string' },
                    summary: { type: 'object' },
                    data: { type: 'object' },
                    generatedAt: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:business',
        'write:business',
        'read:crm',
        'write:crm',
    ],
    maxConcurrentTasks: 5,
    timeout: 30000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 1000,
        exponentialBackoff: true,
    },
};
let CRMAgentService = class CRMAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.contacts = new Map();
        this.deals = new Map();
        this.counter = 0;
    }
    defineConfig() {
        return exports.CRM_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'createContact',
            description: 'Create a new contact',
            execute: async (params) => this.createContact(params),
        });
        this.registerTool({
            name: 'updateContact',
            description: 'Update an existing contact',
            execute: async (params) => this.updateContact(params),
        });
        this.registerTool({
            name: 'trackDeal',
            description: 'Track or update a deal',
            execute: async (params) => this.trackDeal(params),
        });
        this.registerTool({
            name: 'managePipeline',
            description: 'Manage the sales pipeline',
            execute: async (params) => this.managePipeline(params),
        });
        this.registerTool({
            name: 'analyzeConversion',
            description: 'Analyze conversion rates',
            execute: async (params) => this.analyzeConversion(params),
        });
        this.registerTool({
            name: 'generateCRMReport',
            description: 'Generate a CRM report',
            execute: async (params) => this.generateCRMReport(params),
        });
        await this.storeInWorkingMemory('crm:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('CRM agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'createContact',
            'updateContact',
            'trackDeal',
            'managePipeline',
            'analyzeConversion',
            'generateCRMReport',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown CRM action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`crm:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`CRM execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.contacts.clear();
        this.deals.clear();
        this.counter = 0;
        this.logger.log('CRM agent destroyed, all data cleared');
    }
    async createContact(params) {
        const { name, email = '', phone = '', company = '', title = '', tags = [], source = 'manual' } = params;
        if (!name || typeof name !== 'string') {
            throw new Error('A valid contact name is required');
        }
        this.counter++;
        const contactId = `contact-${Date.now()}-${this.counter}`;
        const contact = {
            id: contactId,
            name,
            email,
            phone,
            company,
            title,
            tags,
            source,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.contacts.set(contactId, contact);
        this.logger.log(`Created contact: ${contactId}, name=${name}, company=${company}`);
        return {
            contactId,
            name,
            email,
            company,
            status: 'active',
            createdAt: contact.createdAt.toISOString(),
        };
    }
    async updateContact(params) {
        const { contactId, name, email, phone, company, title, tags, status } = params;
        if (!contactId || typeof contactId !== 'string') {
            throw new Error('A valid contactId is required');
        }
        const contact = this.contacts.get(contactId);
        if (!contact) {
            throw new Error(`Contact not found: ${contactId}`);
        }
        const updatedFields = [];
        if (name !== undefined) {
            contact.name = name;
            updatedFields.push('name');
        }
        if (email !== undefined) {
            contact.email = email;
            updatedFields.push('email');
        }
        if (phone !== undefined) {
            contact.phone = phone;
            updatedFields.push('phone');
        }
        if (company !== undefined) {
            contact.company = company;
            updatedFields.push('company');
        }
        if (title !== undefined) {
            contact.title = title;
            updatedFields.push('title');
        }
        if (tags !== undefined) {
            contact.tags = tags;
            updatedFields.push('tags');
        }
        if (status !== undefined) {
            const validStatuses = ['active', 'inactive', 'churned', 'prospect', 'lead'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Invalid status: ${status}. Supported: ${validStatuses.join(', ')}`);
            }
            contact.status = status;
            updatedFields.push('status');
        }
        contact.updatedAt = new Date();
        this.logger.log(`Updated contact: ${contactId}, fields=[${updatedFields.join(',')}]`);
        return { contactId, updatedFields, status: contact.status };
    }
    async trackDeal(params) {
        const { dealId, title, contactId = '', value = 0, stage = 'prospect', probability, expectedCloseDate, notes = '', } = params;
        if (!title || typeof title !== 'string') {
            throw new Error('A valid deal title is required');
        }
        const validStages = ['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
        if (!validStages.includes(stage)) {
            throw new Error(`Invalid stage: ${stage}. Supported: ${validStages.join(', ')}`);
        }
        const stageProbability = {
            prospect: 10,
            qualified: 25,
            proposal: 50,
            negotiation: 75,
            closed_won: 100,
            closed_lost: 0,
        };
        const dealProbability = probability !== undefined ? probability : stageProbability[stage] || 25;
        let deal;
        if (dealId && this.deals.has(dealId)) {
            deal = this.deals.get(dealId);
            deal.title = title;
            deal.stage = stage;
            if (value > 0)
                deal.value = value;
            deal.probability = dealProbability;
            deal.notes = notes || deal.notes;
            deal.updatedAt = new Date();
            if (expectedCloseDate) {
                const date = new Date(expectedCloseDate);
                if (!isNaN(date.getTime()))
                    deal.expectedCloseDate = date;
            }
        }
        else {
            this.counter++;
            const newDealId = `deal-${Date.now()}-${this.counter}`;
            deal = {
                id: newDealId,
                title,
                contactId,
                value,
                stage,
                probability: dealProbability,
                expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
                notes,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            this.deals.set(newDealId, deal);
        }
        const weightedValue = Math.round(deal.value * deal.probability / 100);
        this.logger.log(`Tracked deal: ${deal.id}, title=${title}, stage=${stage}, value=${deal.value}`);
        return {
            dealId: deal.id,
            title: deal.title,
            stage: deal.stage,
            value: deal.value,
            probability: deal.probability,
            weightedValue,
        };
    }
    async managePipeline(params) {
        const { action, pipelineId = 'default', period = 'current' } = params;
        const validActions = ['overview', 'forecast', 'move-deals'];
        if (!validActions.includes(action)) {
            throw new Error(`Invalid pipeline action: ${action}. Supported: ${validActions.join(', ')}`);
        }
        const allDeals = Array.from(this.deals.values());
        const activeDeals = allDeals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage));
        const stageNames = ['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
        const stages = stageNames
            .filter((s) => s !== 'closed_lost')
            .map((name) => {
            const stageDeals = allDeals.filter((d) => d.stage === name);
            return {
                name,
                dealCount: stageDeals.length,
                totalValue: stageDeals.reduce((s, d) => s + d.value, 0),
                avgProbability: stageDeals.length > 0
                    ? +(stageDeals.reduce((s, d) => s + d.probability, 0) / stageDeals.length).toFixed(1)
                    : 0,
            };
        });
        const totalValue = activeDeals.reduce((s, d) => s + d.value, 0);
        const weightedValue = activeDeals.reduce((s, d) => s + Math.round(d.value * d.probability / 100), 0);
        const forecast = {
            expected: weightedValue,
            best: Math.round(totalValue * 0.9),
            worst: Math.round(totalValue * 0.3),
        };
        this.logger.log(`Pipeline ${action}: pipelineId=${pipelineId}, deals=${activeDeals.length}, totalValue=${totalValue}`);
        return {
            pipelineId,
            totalValue,
            weightedValue,
            dealCount: activeDeals.length,
            stages,
            forecast,
        };
    }
    async analyzeConversion(params) {
        const { period = 'all-time', source, fromStage, toStage } = params;
        this.counter++;
        const analysisId = `conv-${Date.now()}-${this.counter}`;
        const allDeals = Array.from(this.deals.values());
        const stageOrder = ['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won'];
        const stageConversions = [];
        for (let i = 0; i < stageOrder.length - 1; i++) {
            const currentStage = stageOrder[i];
            const nextStage = stageOrder[i + 1];
            if (fromStage && currentStage !== fromStage)
                continue;
            if (toStage && nextStage !== toStage)
                continue;
            const currentCount = allDeals.filter((d) => d.stage === currentStage || stageOrder.indexOf(d.stage) > i).length;
            const nextCount = allDeals.filter((d) => stageOrder.indexOf(d.stage) >= i + 1).length;
            const rate = currentCount > 0 ? +((nextCount / currentCount) * 100).toFixed(1) : 0;
            stageConversions.push({
                from: currentStage,
                to: nextStage,
                rate,
                dealCount: currentCount,
            });
        }
        if (allDeals.length === 0) {
            const benchmarkRates = [
                { from: 'prospect', to: 'qualified', rate: 35, dealCount: 100 },
                { from: 'qualified', to: 'proposal', rate: 50, dealCount: 35 },
                { from: 'proposal', to: 'negotiation', rate: 60, dealCount: 18 },
                { from: 'negotiation', to: 'closed_won', rate: 70, dealCount: 11 },
            ];
            stageConversions.push(...benchmarkRates);
        }
        const overallConversionRate = stageConversions.length > 0
            ? +(stageConversions.reduce((s, c) => s + c.rate, 0) / stageConversions.length).toFixed(1)
            : 0;
        const insights = [];
        const lowConversionStages = stageConversions.filter((c) => c.rate < 40);
        for (const stage of lowConversionStages) {
            insights.push(`Low conversion from ${stage.from} to ${stage.to} (${stage.rate}%). Review qualification criteria and handoff process.`);
        }
        if (overallConversionRate > 50) {
            insights.push('Overall conversion rates are above industry benchmarks.');
        }
        else {
            insights.push('Overall conversion rates are below industry benchmarks. Consider pipeline optimization.');
        }
        this.logger.log(`Conversion analysis: ${analysisId}, overallRate=${overallConversionRate}%`);
        return {
            analysisId,
            overallConversionRate,
            stageConversions,
            insights,
        };
    }
    async generateCRMReport(params) {
        const { reportType, period = 'current', groupBy } = params;
        const validReportTypes = ['summary', 'pipeline', 'activity', 'performance'];
        if (!validReportTypes.includes(reportType)) {
            throw new Error(`Invalid reportType: ${reportType}. Supported: ${validReportTypes.join(', ')}`);
        }
        this.counter++;
        const reportId = `crm-rpt-${Date.now()}-${this.counter}`;
        const allDeals = Array.from(this.deals.values());
        const allContacts = Array.from(this.contacts.values());
        let summary = {};
        let data = {};
        switch (reportType) {
            case 'summary': {
                summary = {
                    totalContacts: allContacts.length,
                    totalDeals: allDeals.length,
                    activeDeals: allDeals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage)).length,
                    totalPipelineValue: allDeals.reduce((s, d) => s + d.value, 0),
                    wonDeals: allDeals.filter((d) => d.stage === 'closed_won').length,
                };
                data = {
                    contactsBySource: this.groupByField(allContacts, 'source'),
                    dealsByStage: this.groupByField(allDeals, 'stage'),
                };
                break;
            }
            case 'pipeline': {
                const pipelineStages = ['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
                const pipelineData = {};
                for (const stage of pipelineStages) {
                    const stageDeals = allDeals.filter((d) => d.stage === stage);
                    pipelineData[stage] = {
                        count: stageDeals.length,
                        totalValue: stageDeals.reduce((s, d) => s + d.value, 0),
                        avgDealSize: stageDeals.length > 0 ? +(stageDeals.reduce((s, d) => s + d.value, 0) / stageDeals.length).toFixed(0) : 0,
                    };
                }
                summary = {
                    pipelineValue: allDeals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0),
                    weightedPipelineValue: allDeals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage)).reduce((s, d) => s + d.value * d.probability / 100, 0),
                };
                data = { stages: pipelineData };
                break;
            }
            case 'activity': {
                summary = {
                    newContactsThisPeriod: allContacts.length,
                    newDealsThisPeriod: allDeals.length,
                    dealsMoved: allDeals.length,
                    averageDealAge: '45 days',
                };
                data = {
                    recentContacts: allContacts.slice(-5).map((c) => ({ id: c.id, name: c.name, company: c.company, source: c.source })),
                    recentDeals: allDeals.slice(-5).map((d) => ({ id: d.id, title: d.title, value: d.value, stage: d.stage })),
                };
                break;
            }
            case 'performance': {
                const wonDeals = allDeals.filter((d) => d.stage === 'closed_won');
                const totalWonValue = wonDeals.reduce((s, d) => s + d.value, 0);
                const avgDealSize = wonDeals.length > 0 ? totalWonValue / wonDeals.length : 0;
                const winRate = allDeals.length > 0 ? +((wonDeals.length / allDeals.length) * 100).toFixed(1) : 0;
                summary = {
                    winRate,
                    avgDealSize: Math.round(avgDealSize),
                    totalWonValue,
                    totalLostValue: allDeals.filter((d) => d.stage === 'closed_lost').reduce((s, d) => s + d.value, 0),
                };
                data = {
                    performanceBySource: {
                        organic: { deals: 15, winRate: 35, avgDealSize: 25000 },
                        referral: { deals: 8, winRate: 55, avgDealSize: 45000 },
                        paid: { deals: 22, winRate: 20, avgDealSize: 18000 },
                        events: { deals: 5, winRate: 40, avgDealSize: 35000 },
                    },
                };
                break;
            }
        }
        this.logger.log(`Generated CRM report: ${reportId}, type=${reportType}`);
        return {
            reportId,
            reportType,
            period,
            summary,
            data,
            generatedAt: new Date().toISOString(),
        };
    }
    groupByField(items, field) {
        const grouped = {};
        for (const item of items) {
            const key = item[field] || 'unknown';
            grouped[key] = (grouped[key] || 0) + 1;
        }
        return grouped;
    }
};
exports.CRMAgentService = CRMAgentService;
exports.CRMAgentService = CRMAgentService = __decorate([
    (0, common_1.Injectable)()
], CRMAgentService);
//# sourceMappingURL=crm-agent.service.js.map