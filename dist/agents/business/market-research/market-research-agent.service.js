"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketResearchAgentService = exports.MARKET_RESEARCH_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.MARKET_RESEARCH_AGENT_CONFIG = {
    id: 'business-market-research',
    name: 'MarketResearch',
    cluster: agent_interface_1.AgentCluster.BUSINESS,
    version: '1.0.0',
    description: 'Market research agent that handles market analysis, competitive intelligence, trend identification, demand analysis, market reporting, and market size assessment.',
    capabilities: [
        {
            name: 'analyzeMarket',
            description: 'Analyze a specific market including size, growth, segments, and dynamics',
            inputSchema: {
                type: 'object',
                properties: {
                    market: { type: 'string', description: 'Market or industry to analyze' },
                    region: { type: 'string', description: 'Geographic region (e.g., "global", "US", "EU")' },
                    period: { type: 'string', description: 'Analysis period (e.g., "2020-2024")' },
                    segments: { type: 'array', items: { type: 'string' }, description: 'Market segments to analyze' },
                },
                required: ['market'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    marketId: { type: 'string' },
                    market: { type: 'string' },
                    size: { type: 'object' },
                    growth: { type: 'object' },
                    segments: { type: 'array' },
                    dynamics: { type: 'object' },
                    analyzedAt: { type: 'string' },
                },
            },
        },
        {
            name: 'researchCompetitor',
            description: 'Research a specific competitor including profile, market share, strengths, and weaknesses',
            inputSchema: {
                type: 'object',
                properties: {
                    competitorName: { type: 'string', description: 'Name of the competitor' },
                    industry: { type: 'string', description: 'Industry context' },
                    aspects: { type: 'array', items: { type: 'string' }, description: 'Aspects to research (e.g., "products", "pricing", "strategy")' },
                },
                required: ['competitorName'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    competitorId: { type: 'string' },
                    name: { type: 'string' },
                    profile: { type: 'object' },
                    marketShare: { type: 'number' },
                    strengths: { type: 'array' },
                    weaknesses: { type: 'array' },
                    threats: { type: 'array' },
                },
            },
        },
        {
            name: 'identifyTrends',
            description: 'Identify and analyze market trends for a given industry or domain',
            inputSchema: {
                type: 'object',
                properties: {
                    industry: { type: 'string', description: 'Industry to analyze trends for' },
                    timeframe: { type: 'string', enum: ['short-term', 'medium-term', 'long-term'], description: 'Trend timeframe' },
                    category: { type: 'string', description: 'Trend category (e.g., "technology", "consumer", "regulatory")' },
                    region: { type: 'string', description: 'Geographic region' },
                },
                required: ['industry'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    trendId: { type: 'string' },
                    industry: { type: 'string' },
                    trends: { type: 'array' },
                    summary: { type: 'string' },
                    identifiedAt: { type: 'string' },
                },
            },
        },
        {
            name: 'analyzeDemand',
            description: 'Analyze demand patterns for a product, service, or market',
            inputSchema: {
                type: 'object',
                properties: {
                    product: { type: 'string', description: 'Product or service name' },
                    market: { type: 'string', description: 'Target market' },
                    period: { type: 'string', description: 'Analysis period' },
                    demographics: { type: 'array', items: { type: 'string' }, description: 'Target demographics' },
                },
                required: ['product'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    demandId: { type: 'string' },
                    product: { type: 'string' },
                    demandLevel: { type: 'string' },
                    demandScore: { type: 'number' },
                    drivers: { type: 'array' },
                    barriers: { type: 'array' },
                    forecast: { type: 'object' },
                },
            },
        },
        {
            name: 'generateMarketReport',
            description: 'Generate a comprehensive market research report',
            inputSchema: {
                type: 'object',
                properties: {
                    market: { type: 'string', description: 'Market to report on' },
                    reportType: { type: 'string', enum: ['executive', 'detailed', 'competitive', 'trend'], description: 'Type of report' },
                    includeForecasts: { type: 'boolean', description: 'Whether to include forecasts' },
                    region: { type: 'string', description: 'Geographic region' },
                },
                required: ['market', 'reportType'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    reportId: { type: 'string' },
                    market: { type: 'string' },
                    reportType: { type: 'string' },
                    executiveSummary: { type: 'string' },
                    sections: { type: 'array' },
                    generatedAt: { type: 'string' },
                },
            },
        },
        {
            name: 'assessMarketSize',
            description: 'Assess the total addressable market (TAM), serviceable market (SAM), and obtainable market (SOM)',
            inputSchema: {
                type: 'object',
                properties: {
                    market: { type: 'string', description: 'Market to assess' },
                    region: { type: 'string', description: 'Geographic region' },
                    methodology: { type: 'string', enum: ['top-down', 'bottom-up', 'value-chain'], description: 'Sizing methodology' },
                    product: { type: 'string', description: 'Specific product or service' },
                },
                required: ['market'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    assessmentId: { type: 'string' },
                    market: { type: 'string' },
                    tam: { type: 'object' },
                    sam: { type: 'object' },
                    som: { type: 'object' },
                    growthRate: { type: 'number' },
                    methodology: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:business',
        'write:business',
        'read:market',
        'write:market',
    ],
    maxConcurrentTasks: 5,
    timeout: 45000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 1500,
        exponentialBackoff: true,
    },
};
let MarketResearchAgentService = class MarketResearchAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.marketAnalyses = new Map();
        this.competitors = new Map();
        this.trendReports = new Map();
        this.analysisCounter = 0;
    }
    defineConfig() {
        return exports.MARKET_RESEARCH_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'analyzeMarket',
            description: 'Analyze a specific market',
            execute: async (params) => this.analyzeMarket(params),
        });
        this.registerTool({
            name: 'researchCompetitor',
            description: 'Research a specific competitor',
            execute: async (params) => this.researchCompetitor(params),
        });
        this.registerTool({
            name: 'identifyTrends',
            description: 'Identify market trends',
            execute: async (params) => this.identifyTrends(params),
        });
        this.registerTool({
            name: 'analyzeDemand',
            description: 'Analyze demand patterns',
            execute: async (params) => this.analyzeDemand(params),
        });
        this.registerTool({
            name: 'generateMarketReport',
            description: 'Generate a comprehensive market research report',
            execute: async (params) => this.generateMarketReport(params),
        });
        this.registerTool({
            name: 'assessMarketSize',
            description: 'Assess TAM, SAM, and SOM',
            execute: async (params) => this.assessMarketSize(params),
        });
        await this.storeInWorkingMemory('market-research:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('MarketResearch agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'analyzeMarket',
            'researchCompetitor',
            'identifyTrends',
            'analyzeDemand',
            'generateMarketReport',
            'assessMarketSize',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown market research action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`market-research:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`MarketResearch execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.marketAnalyses.clear();
        this.competitors.clear();
        this.trendReports.clear();
        this.analysisCounter = 0;
        this.logger.log('MarketResearch agent destroyed, all data cleared');
    }
    async analyzeMarket(params) {
        const { market, region = 'global', period = '2020-2024', segments = [] } = params;
        if (!market || typeof market !== 'string') {
            throw new Error('A valid market name is required');
        }
        this.analysisCounter++;
        const marketId = `mkt-${Date.now()}-${this.analysisCounter}`;
        const defaultSegments = ['Enterprise', 'SMB', 'Consumer', 'Government'];
        const marketSegments = segments.length > 0 ? segments : defaultSegments;
        const totalSize = +(500 + Math.random() * 9500).toFixed(2);
        const growthRate = +(-5 + Math.random() * 30).toFixed(2);
        const cagr = +(growthRate * 0.8 + Math.random() * 5).toFixed(2);
        const segmentData = marketSegments.map((name) => {
            const share = +(Math.random() * 0.4 + 0.05).toFixed(4);
            return {
                name,
                share: +(share * 100).toFixed(2),
                growth: +(-3 + Math.random() * 20).toFixed(2),
                size: +(totalSize * share).toFixed(2),
            };
        });
        const totalShare = segmentData.reduce((s, seg) => s + seg.share, 0);
        segmentData.forEach((seg) => {
            seg.share = +((seg.share / totalShare) * 100).toFixed(2);
        });
        const analysis = {
            id: marketId,
            market,
            region,
            totalSize,
            growthRate,
            segments: segmentData.map((s) => ({ name: s.name, share: s.share, growth: s.growth })),
            dynamics: {
                drivers: ['Digital transformation', 'Increasing demand for automation', 'Regulatory changes'],
                challenges: ['Market saturation', 'Price competition', 'Supply chain disruptions'],
                opportunities: ['Emerging markets', 'New technology adoption', 'Strategic partnerships'],
            },
            analyzedAt: new Date(),
        };
        this.marketAnalyses.set(marketId, analysis);
        this.logger.log(`Analyzed market: ${market} (${region}), size=${totalSize}B, growth=${growthRate}%`);
        return {
            marketId,
            market,
            region,
            size: { value: totalSize, unit: 'billion', currency: 'USD' },
            growth: {
                rate: growthRate,
                trend: growthRate > 5 ? 'expanding' : growthRate > 0 ? 'stable' : 'contracting',
                cagr,
            },
            segments: segmentData,
            dynamics: analysis.dynamics,
            analyzedAt: analysis.analyzedAt.toISOString(),
        };
    }
    async researchCompetitor(params) {
        const { competitorName, industry = 'Technology', aspects = [] } = params;
        if (!competitorName || typeof competitorName !== 'string') {
            throw new Error('A valid competitor name is required');
        }
        this.analysisCounter++;
        const competitorId = `comp-${Date.now()}-${this.analysisCounter}`;
        const defaultAspects = ['products', 'pricing', 'strategy', 'technology', 'market position'];
        const researchAspects = aspects.length > 0 ? aspects : defaultAspects;
        const marketShare = +(1 + Math.random() * 30).toFixed(2);
        const employeeCount = 100 + Math.floor(Math.random() * 99000);
        const revenue = +(10 + Math.random() * 990).toFixed(2);
        const strengthPool = [
            'Strong brand recognition',
            'Innovative technology',
            'Extensive distribution network',
            'Cost leadership',
            'Customer loyalty',
            'Vertical integration',
            'IP portfolio',
            'Global presence',
            'Strong R&D investment',
            'Agile operations',
        ];
        const weaknessPool = [
            'High debt levels',
            'Aging product line',
            'Limited geographic reach',
            'Talent retention issues',
            'Supply chain vulnerabilities',
            'Slow innovation cycle',
            'Customer service gaps',
            'Over-dependence on single market',
            'Regulatory compliance issues',
            'Limited digital capabilities',
        ];
        const threatPool = [
            'New market entrants',
            'Disruptive technology',
            'Regulatory changes',
            'Price wars',
            'Economic downturns',
            'Supply chain disruptions',
            'Changing consumer preferences',
            'Cybersecurity risks',
        ];
        const strengths = this.pickRandom(strengthPool, 3 + Math.floor(Math.random() * 3));
        const weaknesses = this.pickRandom(weaknessPool, 2 + Math.floor(Math.random() * 3));
        const threats = this.pickRandom(threatPool, 2 + Math.floor(Math.random() * 2));
        const profile = {
            id: competitorId,
            name: competitorName,
            industry,
            marketShare,
            revenue,
            strengths,
            weaknesses,
            threats,
            products: researchAspects.slice(0, 3).map((a) => `${competitorName} ${a} solution`),
        };
        this.competitors.set(competitorId, profile);
        this.logger.log(`Researched competitor: ${competitorName}, marketShare=${marketShare}%, revenue=${revenue}B`);
        return {
            competitorId,
            name: competitorName,
            profile: {
                founded: `${1970 + Math.floor(Math.random() * 50)}`,
                headquarters: this.pickRandom(['San Francisco, CA', 'New York, NY', 'London, UK', 'Berlin, Germany', 'Tokyo, Japan', 'Shanghai, China'], 1)[0],
                employees: employeeCount,
                revenue,
            },
            marketShare,
            strengths,
            weaknesses,
            threats,
        };
    }
    async identifyTrends(params) {
        const { industry, timeframe = 'medium-term', category = 'technology', region = 'global' } = params;
        if (!industry || typeof industry !== 'string') {
            throw new Error('A valid industry name is required');
        }
        const validTimeframes = ['short-term', 'medium-term', 'long-term'];
        if (!validTimeframes.includes(timeframe)) {
            throw new Error(`Invalid timeframe: ${timeframe}. Supported: ${validTimeframes.join(', ')}`);
        }
        this.analysisCounter++;
        const trendId = `trend-${Date.now()}-${this.analysisCounter}`;
        const trendTemplates = {
            technology: [
                { name: 'AI/ML Adoption', impact: 'high', direction: 'rising', description: 'Accelerating adoption of artificial intelligence and machine learning across industry verticals' },
                { name: 'Cloud Migration', impact: 'high', direction: 'rising', description: 'Continued shift from on-premise to cloud-based infrastructure and services' },
                { name: 'Edge Computing', impact: 'medium', direction: 'rising', description: 'Growing demand for edge computing capabilities for real-time processing' },
                { name: 'IoT Integration', impact: 'medium', direction: 'rising', description: 'Increasing integration of Internet of Things devices in business operations' },
                { name: 'Cybersecurity Focus', impact: 'high', direction: 'rising', description: 'Heightened focus on cybersecurity measures and zero-trust architectures' },
            ],
            consumer: [
                { name: 'Personalization Demand', impact: 'high', direction: 'rising', description: 'Consumers increasingly expect personalized experiences and products' },
                { name: 'Sustainability Awareness', impact: 'high', direction: 'rising', description: 'Growing consumer preference for sustainable and eco-friendly products' },
                { name: 'Digital-First Behavior', impact: 'high', direction: 'rising', description: 'Continued shift toward digital-first purchasing and engagement behaviors' },
                { name: 'Health & Wellness Focus', impact: 'medium', direction: 'rising', description: 'Increasing consumer focus on health, wellness, and preventative care' },
                { name: 'Experience Economy', impact: 'medium', direction: 'stable', description: 'Shift from product ownership to experience-based consumption' },
            ],
            regulatory: [
                { name: 'Data Privacy Regulations', impact: 'high', direction: 'rising', description: 'Tightening data privacy regulations globally (GDPR, CCPA, etc.)' },
                { name: 'ESG Reporting Mandates', impact: 'medium', direction: 'rising', description: 'Growing mandates for environmental, social, and governance reporting' },
                { name: 'Antitrust Scrutiny', impact: 'medium', direction: 'stable', description: 'Increased antitrust enforcement on large technology companies' },
                { name: 'AI Regulation', impact: 'high', direction: 'rising', description: 'Emerging regulatory frameworks for AI governance and accountability' },
            ],
        };
        const selectedTemplates = trendTemplates[category] || trendTemplates['technology'];
        const trends = selectedTemplates.map((t) => ({
            ...t,
            confidence: +(0.6 + Math.random() * 0.35).toFixed(2),
        }));
        const impactOrder = { high: 3, medium: 2, low: 1 };
        trends.sort((a, b) => impactOrder[b.impact] - impactOrder[a.impact]);
        this.trendReports.set(trendId, { industry, trends, identifiedAt: new Date() });
        const highImpactCount = trends.filter((t) => t.impact === 'high').length;
        const summary = `Identified ${trends.length} trends in the ${industry} industry (${category} category, ${timeframe}). ${highImpactCount} high-impact trends require strategic attention.`;
        this.logger.log(`Identified trends: industry=${industry}, count=${trends.length}, high-impact=${highImpactCount}`);
        return {
            trendId,
            industry,
            timeframe,
            category,
            trends,
            summary,
            identifiedAt: new Date().toISOString(),
        };
    }
    async analyzeDemand(params) {
        const { product, market = 'global', period = 'current', demographics = [] } = params;
        if (!product || typeof product !== 'string') {
            throw new Error('A valid product name is required');
        }
        this.analysisCounter++;
        const demandId = `demand-${Date.now()}-${this.analysisCounter}`;
        const demandScore = +(20 + Math.random() * 80).toFixed(1);
        let demandLevel;
        if (demandScore >= 70)
            demandLevel = 'high';
        else if (demandScore >= 40)
            demandLevel = 'moderate';
        else
            demandLevel = 'low';
        const driverPool = [
            'Growing market need',
            'Competitive pricing advantage',
            'Strong brand recognition',
            'Technological innovation',
            'Changing consumer behavior',
            'Regulatory tailwinds',
            'Network effects',
            'Digital transformation wave',
        ];
        const barrierPool = [
            'Market saturation',
            'High switching costs for customers',
            'Regulatory hurdles',
            'Price sensitivity',
            'Limited awareness',
            'Substitute products available',
            'Economic uncertainty',
            'Supply chain constraints',
        ];
        const drivers = this.pickRandom(driverPool, 3 + Math.floor(Math.random() * 3));
        const barriers = this.pickRandom(barrierPool, 2 + Math.floor(Math.random() * 2));
        const nextQuarter = +(demandScore + (Math.random() - 0.4) * 15).toFixed(1);
        const nextYear = +(demandScore + (Math.random() - 0.3) * 25).toFixed(1);
        const confidence = +(0.65 + Math.random() * 0.3).toFixed(2);
        this.logger.log(`Analyzed demand: product=${product}, score=${demandScore}, level=${demandLevel}`);
        return {
            demandId,
            product,
            market,
            demandLevel,
            demandScore,
            drivers,
            barriers,
            forecast: {
                nextQuarter: Math.max(0, Math.min(100, nextQuarter)),
                nextYear: Math.max(0, Math.min(100, nextYear)),
                confidence,
            },
        };
    }
    async generateMarketReport(params) {
        const { market, reportType, includeForecasts = false, region = 'global' } = params;
        if (!market || typeof market !== 'string') {
            throw new Error('A valid market name is required');
        }
        const validReportTypes = ['executive', 'detailed', 'competitive', 'trend'];
        if (!validReportTypes.includes(reportType)) {
            throw new Error(`Invalid reportType: ${reportType}. Supported: ${validReportTypes.join(', ')}`);
        }
        this.analysisCounter++;
        const reportId = `mkt-rpt-${Date.now()}-${this.analysisCounter}`;
        const marketSize = +(100 + Math.random() * 9900).toFixed(2);
        const growthRate = +(1 + Math.random() * 20).toFixed(2);
        const executiveSummary = `The ${market} market in ${region} is valued at $${marketSize}B with a CAGR of ${growthRate}%. ` +
            `This report provides a ${reportType} analysis of market dynamics, competitive landscape, and strategic opportunities.`;
        const sections = [];
        switch (reportType) {
            case 'executive':
                sections.push({
                    title: 'Market Overview',
                    content: `The ${market} market demonstrates strong fundamentals with sustained growth trajectory.`,
                    keyFindings: [
                        `Market size: $${marketSize}B`,
                        `Growth rate: ${growthRate}% CAGR`,
                        'Fragmented competitive landscape with top 5 players holding <40% share',
                    ],
                }, {
                    title: 'Strategic Implications',
                    content: 'Key strategic considerations for market entry and expansion.',
                    keyFindings: [
                        'Early mover advantage exists in underserved segments',
                        'Technology differentiation is critical for market share gains',
                        'Partnership ecosystem essential for scaling',
                    ],
                });
                break;
            case 'detailed':
                sections.push({
                    title: 'Market Size & Segmentation',
                    content: `Detailed breakdown of the ${market} market across key segments.`,
                    keyFindings: [
                        `Enterprise segment: $${(marketSize * 0.45).toFixed(2)}B (45%)`,
                        `SMB segment: $${(marketSize * 0.30).toFixed(2)}B (30%)`,
                        `Consumer segment: $${(marketSize * 0.25).toFixed(2)}B (25%)`,
                    ],
                }, {
                    title: 'Competitive Landscape',
                    content: 'Analysis of key competitors and their market positioning.',
                    keyFindings: [
                        'Top 3 competitors control approximately 35% of the market',
                        'Emerging players gaining traction in niche segments',
                        'Consolidation expected through M&A activity',
                    ],
                }, {
                    title: 'Technology Landscape',
                    content: 'Technology trends shaping the market evolution.',
                    keyFindings: [
                        'Cloud-native solutions gaining rapid adoption',
                        'AI/ML capabilities becoming table stakes',
                        'Integration and API-first approaches preferred',
                    ],
                });
                break;
            case 'competitive':
                sections.push({
                    title: 'Competitor Analysis',
                    content: `In-depth competitive analysis of the ${market} market.`,
                    keyFindings: [
                        'Market leader holds approximately 18% market share',
                        'Three main competitive clusters identified',
                        'Differentiation primarily through technology and service quality',
                    ],
                }, {
                    title: 'Competitive Positioning Map',
                    content: 'Strategic positioning analysis of key market players.',
                    keyFindings: [
                        'Leaders quadrant: Strong innovation + broad market reach',
                        'Challengers quadrant: Aggressive pricing + targeted expansion',
                        'Niche players: Deep domain expertise + specialized solutions',
                    ],
                });
                break;
            case 'trend':
                sections.push({
                    title: 'Market Trends',
                    content: `Key trends shaping the future of the ${market} market.`,
                    keyFindings: [
                        'Digital transformation accelerating across all segments',
                        'Sustainability becoming a key differentiator',
                        'Regulatory landscape evolving rapidly',
                    ],
                }, {
                    title: 'Emerging Opportunities',
                    content: 'New opportunities emerging from market trends.',
                    keyFindings: [
                        'AI-powered solutions represent the fastest-growing segment',
                        'Cross-border expansion opportunities in emerging markets',
                        'Platform business models disrupting traditional value chains',
                    ],
                });
                break;
        }
        if (includeForecasts) {
            sections.push({
                title: 'Market Forecast',
                content: `5-year market forecast for ${market} in ${region}.`,
                keyFindings: [
                    `2025: $${(marketSize * (1 + growthRate / 100)).toFixed(2)}B`,
                    `2027: $${(marketSize * Math.pow(1 + growthRate / 100, 3)).toFixed(2)}B`,
                    `2030: $${(marketSize * Math.pow(1 + growthRate / 100, 6)).toFixed(2)}B`,
                ],
            });
        }
        this.logger.log(`Generated market report: ${reportId}, type=${reportType}, market=${market}`);
        return {
            reportId,
            market,
            reportType,
            executiveSummary,
            sections,
            includeForecasts,
            generatedAt: new Date().toISOString(),
        };
    }
    async assessMarketSize(params) {
        const { market, region = 'global', methodology = 'top-down', product } = params;
        if (!market || typeof market !== 'string') {
            throw new Error('A valid market name is required');
        }
        const validMethodologies = ['top-down', 'bottom-up', 'value-chain'];
        if (!validMethodologies.includes(methodology)) {
            throw new Error(`Invalid methodology: ${methodology}. Supported: ${validMethodologies.join(', ')}`);
        }
        this.analysisCounter++;
        const assessmentId = `tam-${Date.now()}-${this.analysisCounter}`;
        const tamValue = +(1000 + Math.random() * 49000).toFixed(2);
        const samRatio = 0.2 + Math.random() * 0.3;
        const somRatio = 0.05 + Math.random() * 0.15;
        const samValue = +(tamValue * samRatio).toFixed(2);
        const somValue = +(samValue * somRatio).toFixed(2);
        const growthRate = +(2 + Math.random() * 18).toFixed(2);
        const assumptions = [
            `${methodology} approach used for market sizing`,
            `Geographic scope: ${region}`,
            product ? `Product focus: ${product}` : 'All products/services included',
            `Market growth projected at ${growthRate}% CAGR`,
            'Currency values in USD, constant 2024 dollars',
            'Competitive landscape assumed stable over projection period',
        ];
        this.logger.log(`Assessed market size: ${market}, TAM=${tamValue}B, SAM=${samValue}B, SOM=${somValue}B`);
        return {
            assessmentId,
            market,
            region,
            tam: { value: tamValue, currency: 'USD', year: 2024 },
            sam: { value: samValue, currency: 'USD', year: 2024 },
            som: { value: somValue, currency: 'USD', year: 2024 },
            growthRate,
            methodology,
            assumptions,
            assessedAt: new Date().toISOString(),
        };
    }
    pickRandom(arr, count) {
        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, arr.length));
    }
};
exports.MarketResearchAgentService = MarketResearchAgentService;
exports.MarketResearchAgentService = MarketResearchAgentService = __decorate([
    (0, common_1.Injectable)()
], MarketResearchAgentService);
//# sourceMappingURL=market-research-agent.service.js.map