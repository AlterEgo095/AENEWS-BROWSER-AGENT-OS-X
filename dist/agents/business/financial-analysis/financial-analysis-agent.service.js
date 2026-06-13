"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialAnalysisAgentService = exports.FINANCIAL_ANALYSIS_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.FINANCIAL_ANALYSIS_AGENT_CONFIG = {
    id: 'business-financial-analysis',
    name: 'FinancialAnalysis',
    cluster: agent_interface_1.AgentCluster.BUSINESS,
    version: '1.0.0',
    description: 'Financial analysis agent that handles financial modeling, P&L analysis, revenue forecasting, valuation calculations, cash flow analysis, and financial report generation.',
    capabilities: [
        {
            name: 'buildFinancialModel',
            description: 'Build a financial model with revenue, costs, and profitability projections',
            inputSchema: {
                type: 'object',
                properties: {
                    modelName: { type: 'string', description: 'Name of the financial model' },
                    modelType: {
                        type: 'string',
                        enum: ['dcf', 'comparable', 'precedent', 'lbo'],
                        description: 'Type of financial model',
                    },
                    projectionYears: { type: 'number', description: 'Number of years to project' },
                    assumptions: { type: 'object', description: 'Key financial assumptions' },
                },
                required: ['modelName'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    modelId: { type: 'string' },
                    modelName: { type: 'string' },
                    modelType: { type: 'string' },
                    projections: { type: 'array' },
                    summary: { type: 'object' },
                    builtAt: { type: 'string' },
                },
            },
        },
        {
            name: 'analyzePnL',
            description: 'Analyze profit and loss statement with margin and variance analysis',
            inputSchema: {
                type: 'object',
                properties: {
                    period: { type: 'string', description: 'Reporting period (e.g., "Q1-2024", "FY2024")' },
                    revenue: { type: 'number', description: 'Total revenue' },
                    costOfGoods: { type: 'number', description: 'Cost of goods sold' },
                    operatingExpenses: { type: 'number', description: 'Operating expenses' },
                    otherIncome: { type: 'number', description: 'Other income' },
                    taxRate: { type: 'number', description: 'Tax rate (percentage)' },
                },
                required: ['period', 'revenue'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    analysisId: { type: 'string' },
                    period: { type: 'string' },
                    revenue: { type: 'number' },
                    grossProfit: { type: 'number' },
                    operatingIncome: { type: 'number' },
                    netIncome: { type: 'number' },
                    margins: { type: 'object' },
                    insights: { type: 'array' },
                },
            },
        },
        {
            name: 'forecastRevenue',
            description: 'Forecast future revenue based on historical data and growth assumptions',
            inputSchema: {
                type: 'object',
                properties: {
                    currentRevenue: { type: 'number', description: 'Current annual revenue' },
                    growthRate: { type: 'number', description: 'Expected annual growth rate (percentage)' },
                    projectionYears: { type: 'number', description: 'Number of years to project' },
                    method: {
                        type: 'string',
                        enum: ['linear', 'exponential', 'logarithmic'],
                        description: 'Forecast method',
                    },
                    seasonality: { type: 'boolean', description: 'Whether to include seasonality' },
                },
                required: ['currentRevenue', 'growthRate'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    forecastId: { type: 'string' },
                    projections: { type: 'array' },
                    totalProjectedRevenue: { type: 'number' },
                    compoundGrowthRate: { type: 'number' },
                    confidence: { type: 'number' },
                },
            },
        },
        {
            name: 'calculateValuation',
            description: 'Calculate business valuation using various methodologies',
            inputSchema: {
                type: 'object',
                properties: {
                    revenue: { type: 'number', description: 'Annual revenue' },
                    ebitda: { type: 'number', description: 'Annual EBITDA' },
                    netIncome: { type: 'number', description: 'Annual net income' },
                    method: {
                        type: 'string',
                        enum: ['dcf', 'comparable', 'asset-based', 'multiple'],
                        description: 'Valuation method',
                    },
                    discountRate: { type: 'number', description: 'Discount rate for DCF (percentage)' },
                    growthRate: { type: 'number', description: 'Expected growth rate (percentage)' },
                },
                required: ['revenue'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    valuationId: { type: 'string' },
                    method: { type: 'string' },
                    valuation: { type: 'number' },
                    range: { type: 'object' },
                    multiples: { type: 'object' },
                    assumptions: { type: 'array' },
                },
            },
        },
        {
            name: 'analyzeCashFlow',
            description: 'Analyze cash flow patterns including operating, investing, and financing activities',
            inputSchema: {
                type: 'object',
                properties: {
                    period: { type: 'string', description: 'Reporting period' },
                    operatingCashFlow: { type: 'number', description: 'Cash from operations' },
                    investingCashFlow: { type: 'number', description: 'Cash from investing activities' },
                    financingCashFlow: { type: 'number', description: 'Cash from financing activities' },
                    beginningCash: { type: 'number', description: 'Cash balance at period start' },
                },
                required: ['period', 'operatingCashFlow'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    analysisId: { type: 'string' },
                    period: { type: 'string' },
                    operatingCashFlow: { type: 'number' },
                    investingCashFlow: { type: 'number' },
                    financingCashFlow: { type: 'number' },
                    netCashFlow: { type: 'number' },
                    endingCash: { type: 'number' },
                    burnRate: { type: 'number' },
                    runwayMonths: { type: 'number' },
                    healthAssessment: { type: 'string' },
                },
            },
        },
        {
            name: 'generateFinancialReport',
            description: 'Generate a comprehensive financial report',
            inputSchema: {
                type: 'object',
                properties: {
                    reportType: {
                        type: 'string',
                        enum: ['summary', 'detailed', 'board', 'investor'],
                        description: 'Type of financial report',
                    },
                    period: { type: 'string', description: 'Reporting period' },
                    includeCharts: { type: 'boolean', description: 'Whether to include chart data' },
                    compareToPrior: {
                        type: 'boolean',
                        description: 'Whether to include prior period comparison',
                    },
                },
                required: ['reportType', 'period'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    reportId: { type: 'string' },
                    reportType: { type: 'string' },
                    period: { type: 'string' },
                    executiveSummary: { type: 'string' },
                    sections: { type: 'array' },
                    generatedAt: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:business',
        'write:business',
        'read:financial',
        'write:financial',
    ],
    maxConcurrentTasks: 5,
    timeout: 45000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 1500,
        exponentialBackoff: true,
    },
};
let FinancialAnalysisAgentService = class FinancialAnalysisAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.models = new Map();
        this.pnlAnalyses = new Map();
        this.analysisCounter = 0;
    }
    defineConfig() {
        return exports.FINANCIAL_ANALYSIS_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'buildFinancialModel',
            description: 'Build a financial model with projections',
            execute: async (params) => this.buildFinancialModel(params),
        });
        this.registerTool({
            name: 'analyzePnL',
            description: 'Analyze profit and loss statement',
            execute: async (params) => this.analyzePnL(params),
        });
        this.registerTool({
            name: 'forecastRevenue',
            description: 'Forecast future revenue',
            execute: async (params) => this.forecastRevenue(params),
        });
        this.registerTool({
            name: 'calculateValuation',
            description: 'Calculate business valuation',
            execute: async (params) => this.calculateValuation(params),
        });
        this.registerTool({
            name: 'analyzeCashFlow',
            description: 'Analyze cash flow patterns',
            execute: async (params) => this.analyzeCashFlow(params),
        });
        this.registerTool({
            name: 'generateFinancialReport',
            description: 'Generate a comprehensive financial report',
            execute: async (params) => this.generateFinancialReport(params),
        });
        await this.storeInWorkingMemory('financial-analysis:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('FinancialAnalysis agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.BusinessCapability.FINANCE, {
                    missionId: input.taskId,
                    instruction: JSON.stringify(input.payload),
                    workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
                    parameters: input.payload,
                });
                return this.createAgentOutput(input.taskId, result.success, result.output, result.error, startTime);
            }
            catch (error) {
                this.logger.warn(`Bridge failed, fallback: ${error.message}`);
            }
        }
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'buildFinancialModel',
            'analyzePnL',
            'forecastRevenue',
            'calculateValuation',
            'analyzeCashFlow',
            'generateFinancialReport',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown financial analysis action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`financial-analysis:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`FinancialAnalysis execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.models.clear();
        this.pnlAnalyses.clear();
        this.analysisCounter = 0;
        this.logger.log('FinancialAnalysis agent destroyed, all data cleared');
    }
    async buildFinancialModel(params) {
        const { modelName, modelType = 'dcf', projectionYears = 5, assumptions = {} } = params;
        if (!modelName || typeof modelName !== 'string') {
            throw new Error('A valid model name is required');
        }
        const validModelTypes = ['dcf', 'comparable', 'precedent', 'lbo'];
        if (!validModelTypes.includes(modelType)) {
            throw new Error(`Invalid model type: ${modelType}. Supported: ${validModelTypes.join(', ')}`);
        }
        if (projectionYears < 1 || projectionYears > 20) {
            throw new Error('Projection years must be between 1 and 20');
        }
        this.analysisCounter++;
        const modelId = `model-${Date.now()}-${this.analysisCounter}`;
        const baseRevenue = assumptions.baseRevenue || 10000000;
        const revenueGrowth = assumptions.revenueGrowth || 15;
        const cogsPercent = assumptions.cogsPercent || 45;
        const opexPercent = assumptions.opexPercent || 30;
        const taxRate = assumptions.taxRate || 25;
        const capexPercent = assumptions.capexPercent || 8;
        const depreciationPercent = assumptions.depreciationPercent || 5;
        const projections = [];
        let currentRevenue = baseRevenue;
        for (let i = 1; i <= projectionYears; i++) {
            currentRevenue = currentRevenue * (1 + revenueGrowth / 100);
            const costs = currentRevenue * (cogsPercent / 100);
            const grossProfit = currentRevenue - costs;
            const opex = currentRevenue * (opexPercent / 100);
            const ebitda = grossProfit - opex;
            const depreciation = currentRevenue * (depreciationPercent / 100);
            const ebit = ebitda - depreciation;
            const taxes = ebit > 0 ? ebit * (taxRate / 100) : 0;
            const netIncome = ebit - taxes;
            const capex = currentRevenue * (capexPercent / 100);
            const freeCashFlow = netIncome + depreciation - capex;
            projections.push({
                year: new Date().getFullYear() + i,
                revenue: Math.round(currentRevenue),
                costs: Math.round(costs),
                ebitda: Math.round(ebitda),
                netIncome: Math.round(netIncome),
                freeCashFlow: Math.round(freeCashFlow),
            });
        }
        const model = {
            id: modelId,
            name: modelName,
            type: modelType,
            projections,
            createdAt: new Date(),
        };
        this.models.set(modelId, model);
        const totalRevenue = projections.reduce((s, p) => s + p.revenue, 0);
        const totalEBITDA = projections.reduce((s, p) => s + p.ebitda, 0);
        const totalFreeCashFlow = projections.reduce((s, p) => s + p.freeCashFlow, 0);
        this.logger.log(`Built financial model: ${modelName}, type=${modelType}, years=${projectionYears}, totalRevenue=${totalRevenue}`);
        return {
            modelId,
            modelName,
            modelType,
            projections,
            summary: {
                totalRevenue: Math.round(totalRevenue),
                totalEBITDA: Math.round(totalEBITDA),
                totalFreeCashFlow: Math.round(totalFreeCashFlow),
                avgGrowthRate: revenueGrowth,
            },
            builtAt: model.createdAt.toISOString(),
        };
    }
    async analyzePnL(params) {
        const { period, revenue, costOfGoods, operatingExpenses, otherIncome = 0, taxRate = 25, } = params;
        if (!period || typeof period !== 'string') {
            throw new Error('A valid period is required');
        }
        if (revenue === undefined || revenue === null || typeof revenue !== 'number') {
            throw new Error('Revenue must be a valid number');
        }
        this.analysisCounter++;
        const analysisId = `pnl-${Date.now()}-${this.analysisCounter}`;
        const cogs = costOfGoods !== undefined ? costOfGoods : revenue * 0.45;
        const opex = operatingExpenses !== undefined ? operatingExpenses : revenue * 0.3;
        const grossProfit = revenue - cogs;
        const operatingIncome = grossProfit - opex;
        const preTaxIncome = operatingIncome + otherIncome;
        const taxes = preTaxIncome > 0 ? preTaxIncome * (taxRate / 100) : 0;
        const netIncome = preTaxIncome - taxes;
        const grossMargin = revenue > 0 ? +((grossProfit / revenue) * 100).toFixed(2) : 0;
        const operatingMargin = revenue > 0 ? +((operatingIncome / revenue) * 100).toFixed(2) : 0;
        const netMargin = revenue > 0 ? +((netIncome / revenue) * 100).toFixed(2) : 0;
        const insights = [];
        if (grossMargin > 60)
            insights.push('Strong gross margins indicate healthy pricing power and cost control');
        else if (grossMargin < 30)
            insights.push('Low gross margins suggest pricing pressure or high input costs');
        if (operatingMargin > 20)
            insights.push('Excellent operating efficiency with above-industry margins');
        else if (operatingMargin < 5)
            insights.push('Operating margins are thin; consider cost optimization initiatives');
        if (netMargin > 15)
            insights.push('Strong bottom-line performance with effective tax management');
        else if (netMargin < 0)
            insights.push('Net loss detected; review cost structure and revenue strategy');
        const opexRatio = revenue > 0 ? +((opex / revenue) * 100).toFixed(2) : 0;
        if (opexRatio > 40)
            insights.push(`Operating expenses at ${opexRatio}% of revenue may require optimization`);
        const analysis = {
            id: analysisId,
            period,
            revenue,
            costOfGoods: cogs,
            grossProfit,
            operatingExpenses: opex,
            operatingIncome,
            netIncome,
            margins: { gross: grossMargin, operating: operatingMargin, net: netMargin },
        };
        this.pnlAnalyses.set(analysisId, analysis);
        this.logger.log(`P&L analysis: period=${period}, revenue=${revenue}, netIncome=${Math.round(netIncome)}, netMargin=${netMargin}%`);
        return {
            analysisId,
            period,
            revenue,
            grossProfit: Math.round(grossProfit),
            operatingIncome: Math.round(operatingIncome),
            netIncome: Math.round(netIncome),
            margins: { gross: grossMargin, operating: operatingMargin, net: netMargin },
            insights,
        };
    }
    async forecastRevenue(params) {
        const { currentRevenue, growthRate, projectionYears = 5, method = 'exponential', seasonality = false, } = params;
        if (currentRevenue === undefined ||
            currentRevenue === null ||
            typeof currentRevenue !== 'number') {
            throw new Error('Current revenue must be a valid number');
        }
        if (growthRate === undefined || growthRate === null || typeof growthRate !== 'number') {
            throw new Error('Growth rate must be a valid number');
        }
        if (projectionYears < 1 || projectionYears > 10) {
            throw new Error('Projection years must be between 1 and 10');
        }
        this.analysisCounter++;
        const forecastId = `forecast-${Date.now()}-${this.analysisCounter}`;
        const projections = [];
        let prevRevenue = currentRevenue;
        for (let i = 1; i <= projectionYears; i++) {
            let projectedRevenue;
            switch (method) {
                case 'linear':
                    projectedRevenue = currentRevenue + currentRevenue * (growthRate / 100) * i;
                    break;
                case 'logarithmic':
                    projectedRevenue = currentRevenue * (1 + (growthRate / 100) * Math.log(i + 1));
                    break;
                case 'exponential':
                default:
                    projectedRevenue = prevRevenue * (1 + growthRate / 100);
                    break;
            }
            const growth = prevRevenue > 0 ? +(((projectedRevenue - prevRevenue) / prevRevenue) * 100).toFixed(2) : 0;
            const seasonalFactors = seasonality
                ? [0.22, 0.26, 0.24, 0.28]
                : [0.25, 0.25, 0.25, 0.25];
            projections.push({
                year: new Date().getFullYear() + i,
                revenue: Math.round(projectedRevenue),
                growth,
                q1: Math.round(projectedRevenue * seasonalFactors[0]),
                q2: Math.round(projectedRevenue * seasonalFactors[1]),
                q3: Math.round(projectedRevenue * seasonalFactors[2]),
                q4: Math.round(projectedRevenue * seasonalFactors[3]),
            });
            prevRevenue = projectedRevenue;
        }
        const totalProjectedRevenue = projections.reduce((s, p) => s + p.revenue, 0);
        const finalRevenue = projections[projections.length - 1].revenue;
        const compoundGrowthRate = projectionYears > 0
            ? +((Math.pow(finalRevenue / currentRevenue, 1 / projectionYears) - 1) * 100).toFixed(2)
            : 0;
        const confidence = +Math.max(0.4, 0.9 - projectionYears * 0.06).toFixed(2);
        this.logger.log(`Revenue forecast: current=${currentRevenue}, growthRate=${growthRate}%, years=${projectionYears}, CAGR=${compoundGrowthRate}%`);
        return {
            forecastId,
            method,
            projections,
            totalProjectedRevenue,
            compoundGrowthRate,
            confidence,
        };
    }
    async calculateValuation(params) {
        const { revenue, ebitda, netIncome, method = 'dcf', discountRate = 12, growthRate = 8, } = params;
        if (revenue === undefined || revenue === null || typeof revenue !== 'number') {
            throw new Error('Revenue must be a valid number');
        }
        const validMethods = ['dcf', 'comparable', 'asset-based', 'multiple'];
        if (!validMethods.includes(method)) {
            throw new Error(`Invalid valuation method: ${method}. Supported: ${validMethods.join(', ')}`);
        }
        this.analysisCounter++;
        const valuationId = `val-${Date.now()}-${this.analysisCounter}`;
        const derivedEbitda = ebitda !== undefined ? ebitda : revenue * 0.2;
        const derivedNetIncome = netIncome !== undefined ? netIncome : revenue * 0.12;
        let valuation = 0;
        const assumptions = [];
        switch (method) {
            case 'dcf': {
                const projectionYears = 5;
                const terminalGrowthRate = 3;
                let pvCashFlows = 0;
                let lastCashFlow = derivedEbitda * 0.7;
                for (let i = 1; i <= projectionYears; i++) {
                    lastCashFlow = lastCashFlow * (1 + growthRate / 100);
                    const discountFactor = Math.pow(1 + discountRate / 100, i);
                    pvCashFlows += lastCashFlow / discountFactor;
                }
                const terminalValue = (lastCashFlow * (1 + terminalGrowthRate / 100)) /
                    ((discountRate - terminalGrowthRate) / 100);
                const pvTerminalValue = terminalValue / Math.pow(1 + discountRate / 100, projectionYears);
                valuation = pvCashFlows + pvTerminalValue;
                assumptions.push(`Discount rate: ${discountRate}%`);
                assumptions.push(`Terminal growth rate: ${terminalGrowthRate}%`);
                assumptions.push(`Projection period: ${projectionYears} years`);
                break;
            }
            case 'comparable': {
                const revenueMultiple = 3 + Math.random() * 7;
                const ebitdaMultiple = 10 + Math.random() * 10;
                valuation = (revenue * revenueMultiple + derivedEbitda * ebitdaMultiple) / 2;
                assumptions.push(`Revenue multiple applied: ${revenueMultiple.toFixed(1)}x`);
                assumptions.push(`EBITDA multiple applied: ${ebitdaMultiple.toFixed(1)}x`);
                break;
            }
            case 'asset-based': {
                valuation = revenue * 0.8 + derivedEbitda * 2;
                assumptions.push('Asset-based approach using revenue and EBITDA as proxies');
                assumptions.push('Assumed asset-to-revenue ratio of 0.8');
                break;
            }
            case 'multiple': {
                const peRatio = 15 + Math.random() * 20;
                valuation = derivedNetIncome * peRatio;
                assumptions.push(`P/E ratio applied: ${peRatio.toFixed(1)}x`);
                assumptions.push(`Net income used: ${Math.round(derivedNetIncome)}`);
                break;
            }
        }
        const lowValuation = Math.round(valuation * 0.8);
        const midValuation = Math.round(valuation);
        const highValuation = Math.round(valuation * 1.2);
        const multiples = {
            revenueMultiple: revenue > 0 ? +(valuation / revenue).toFixed(2) : 0,
            ebitdaMultiple: derivedEbitda > 0 ? +(valuation / derivedEbitda).toFixed(2) : 0,
            earningsMultiple: derivedNetIncome > 0 ? +(valuation / derivedNetIncome).toFixed(2) : 0,
        };
        this.logger.log(`Valuation: method=${method}, value=${midValuation}, range=[${lowValuation}-${highValuation}]`);
        return {
            valuationId,
            method,
            valuation: midValuation,
            range: { low: lowValuation, mid: midValuation, high: highValuation },
            multiples,
            assumptions,
            calculatedAt: new Date().toISOString(),
        };
    }
    async analyzeCashFlow(params) {
        const { period, operatingCashFlow, investingCashFlow = -operatingCashFlow * 0.15, financingCashFlow = 0, beginningCash = operatingCashFlow * 3, } = params;
        if (!period || typeof period !== 'string') {
            throw new Error('A valid period is required');
        }
        if (operatingCashFlow === undefined ||
            operatingCashFlow === null ||
            typeof operatingCashFlow !== 'number') {
            throw new Error('Operating cash flow must be a valid number');
        }
        this.analysisCounter++;
        const analysisId = `cf-${Date.now()}-${this.analysisCounter}`;
        const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
        const endingCash = beginningCash + netCashFlow;
        const monthlyBurnRate = netCashFlow < 0 ? Math.abs(netCashFlow) / 3 : 0;
        const runwayMonths = monthlyBurnRate > 0 ? Math.round(endingCash / monthlyBurnRate) : Infinity;
        let healthAssessment;
        if (operatingCashFlow > 0 && netCashFlow > 0) {
            healthAssessment = 'Healthy — positive operating cash flow and net cash generation';
        }
        else if (operatingCashFlow > 0 && netCashFlow < 0) {
            healthAssessment =
                'Moderate — positive operations but negative overall cash flow due to investing/financing';
        }
        else if (operatingCashFlow < 0 && endingCash > 0) {
            healthAssessment = 'Caution — negative operating cash flow but cash reserves available';
        }
        else {
            healthAssessment = 'Critical — negative operating cash flow with limited reserves';
        }
        this.logger.log(`Cash flow analysis: period=${period}, OCF=${operatingCashFlow}, net=${netCashFlow}, ending=${endingCash}`);
        return {
            analysisId,
            period,
            operatingCashFlow: Math.round(operatingCashFlow),
            investingCashFlow: Math.round(investingCashFlow),
            financingCashFlow: Math.round(financingCashFlow),
            netCashFlow: Math.round(netCashFlow),
            endingCash: Math.round(endingCash),
            burnRate: Math.round(monthlyBurnRate),
            runwayMonths,
            healthAssessment,
        };
    }
    async generateFinancialReport(params) {
        const { reportType, period, includeCharts = false, compareToPrior = false } = params;
        if (!reportType || typeof reportType !== 'string') {
            throw new Error('A valid report type is required');
        }
        const validReportTypes = ['summary', 'detailed', 'board', 'investor'];
        if (!validReportTypes.includes(reportType)) {
            throw new Error(`Invalid reportType: ${reportType}. Supported: ${validReportTypes.join(', ')}`);
        }
        if (!period || typeof period !== 'string') {
            throw new Error('A valid period is required');
        }
        this.analysisCounter++;
        const reportId = `fin-rpt-${Date.now()}-${this.analysisCounter}`;
        const revenue = +(5000000 + Math.random() * 50000000).toFixed(2);
        const grossMargin = 40 + Math.random() * 30;
        const operatingMargin = 10 + Math.random() * 25;
        const netMargin = 5 + Math.random() * 20;
        const executiveSummary = `Financial performance for ${period}: Revenue of $${(revenue / 1000000).toFixed(1)}M ` +
            `with gross margin of ${grossMargin.toFixed(1)}%, operating margin of ${operatingMargin.toFixed(1)}%, ` +
            `and net margin of ${netMargin.toFixed(1)}%. ` +
            `${netMargin > 15 ? 'Strong profitability with room for strategic reinvestment.' : 'Focus on margin improvement opportunities.'}`;
        const sections = [];
        switch (reportType) {
            case 'summary':
                sections.push({
                    title: 'Revenue & Profitability',
                    content: 'Overview of revenue and profitability metrics for the reporting period.',
                    metrics: {
                        revenue: Math.round(revenue),
                        grossProfit: Math.round((revenue * grossMargin) / 100),
                        operatingIncome: Math.round((revenue * operatingMargin) / 100),
                        netIncome: Math.round((revenue * netMargin) / 100),
                    },
                }, {
                    title: 'Key Ratios',
                    content: 'Financial ratios and performance indicators.',
                    metrics: {
                        grossMargin: +grossMargin.toFixed(2),
                        operatingMargin: +operatingMargin.toFixed(2),
                        netMargin: +netMargin.toFixed(2),
                        roe: +(netMargin * (1 + Math.random())).toFixed(2),
                        roa: +(netMargin * 0.5).toFixed(2),
                    },
                });
                break;
            case 'detailed':
                sections.push({
                    title: 'Income Statement Summary',
                    content: 'Detailed income statement with line-item breakdown.',
                    metrics: {
                        revenue: Math.round(revenue),
                        costOfGoods: Math.round(revenue * (1 - grossMargin / 100)),
                        grossProfit: Math.round((revenue * grossMargin) / 100),
                        operatingExpenses: Math.round((revenue * (grossMargin - operatingMargin)) / 100),
                        operatingIncome: Math.round((revenue * operatingMargin) / 100),
                        netIncome: Math.round((revenue * netMargin) / 100),
                    },
                }, {
                    title: 'Balance Sheet Highlights',
                    content: 'Key balance sheet metrics and financial position indicators.',
                    metrics: {
                        totalAssets: Math.round(revenue * (1.5 + Math.random())),
                        totalLiabilities: Math.round(revenue * (0.6 + Math.random() * 0.4)),
                        shareholdersEquity: Math.round(revenue * (0.5 + Math.random() * 0.5)),
                        currentRatio: +(1.2 + Math.random() * 1.5).toFixed(2),
                        debtToEquity: +(0.3 + Math.random() * 0.7).toFixed(2),
                    },
                }, {
                    title: 'Cash Flow Overview',
                    content: 'Cash flow analysis across operating, investing, and financing activities.',
                    metrics: {
                        operatingCashFlow: Math.round(((revenue * netMargin) / 100) * 1.2),
                        investingCashFlow: Math.round(-revenue * 0.08),
                        financingCashFlow: Math.round(-revenue * 0.03),
                        freeCashFlow: Math.round(revenue * ((netMargin / 100) * 1.2 - 0.08)),
                    },
                });
                break;
            case 'board':
                sections.push({
                    title: 'Executive Dashboard',
                    content: 'High-level financial dashboard for board review.',
                    metrics: {
                        revenue: Math.round(revenue),
                        revenueGrowth: +(5 + Math.random() * 20).toFixed(2),
                        ebitda: Math.round((revenue * (operatingMargin + 5)) / 100),
                        ebitdaMargin: +(operatingMargin + 5).toFixed(2),
                        netIncome: Math.round((revenue * netMargin) / 100),
                        cashPosition: Math.round(revenue * (0.5 + Math.random() * 0.5)),
                    },
                }, {
                    title: 'Strategic Financial Highlights',
                    content: 'Key financial developments and strategic implications.',
                    metrics: {
                        customerAcquisitionCost: Math.round(100 + Math.random() * 400),
                        lifetimeValue: Math.round(500 + Math.random() * 3000),
                        ltvToCacRatio: +(2 + Math.random() * 5).toFixed(2),
                        monthlyRecurringRevenue: Math.round((revenue * (0.6 + Math.random() * 0.3)) / 12),
                        churnRate: +(1 + Math.random() * 5).toFixed(2),
                    },
                });
                break;
            case 'investor':
                sections.push({
                    title: 'Investment Summary',
                    content: 'Financial overview for current and prospective investors.',
                    metrics: {
                        revenue: Math.round(revenue),
                        revenueGrowth: +(5 + Math.random() * 25).toFixed(2),
                        grossMargin: +grossMargin.toFixed(2),
                        operatingMargin: +operatingMargin.toFixed(2),
                        netMargin: +netMargin.toFixed(2),
                        freeCashFlow: Math.round(revenue * ((netMargin / 100) * 1.1 - 0.06)),
                    },
                }, {
                    title: 'Valuation Metrics',
                    content: 'Key valuation metrics and market comparisons.',
                    metrics: {
                        revenueMultiple: +(3 + Math.random() * 7).toFixed(2),
                        ebitdaMultiple: +(10 + Math.random() * 10).toFixed(2),
                        earningsMultiple: +(15 + Math.random() * 20).toFixed(2),
                        priceToBook: +(2 + Math.random() * 8).toFixed(2),
                    },
                });
                break;
        }
        if (compareToPrior) {
            sections.push({
                title: 'Period-over-Period Comparison',
                content: `Comparison with prior period metrics showing growth and margin trends.`,
                metrics: {
                    revenueChangePercent: +(-5 + Math.random() * 30).toFixed(2),
                    grossMarginChange: +(-3 + Math.random() * 8).toFixed(2),
                    operatingMarginChange: +(-2 + Math.random() * 6).toFixed(2),
                    netIncomeChangePercent: +(-10 + Math.random() * 40).toFixed(2),
                },
            });
        }
        if (includeCharts) {
            sections.push({
                title: 'Chart Data',
                content: 'Data points for financial visualization charts.',
                metrics: {
                    revenueByMonth: Math.round(revenue),
                    expensesByMonth: Math.round(revenue * (1 - netMargin / 100)),
                    profitByMonth: Math.round((revenue * netMargin) / 100),
                },
            });
        }
        this.logger.log(`Generated financial report: ${reportId}, type=${reportType}, period=${period}`);
        return {
            reportId,
            reportType,
            period,
            executiveSummary,
            sections,
            generatedAt: new Date().toISOString(),
        };
    }
};
exports.FinancialAnalysisAgentService = FinancialAnalysisAgentService;
exports.FinancialAnalysisAgentService = FinancialAnalysisAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], FinancialAnalysisAgentService);
//# sourceMappingURL=financial-analysis-agent.service.js.map