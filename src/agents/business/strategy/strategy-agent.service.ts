/**
 * AENEWS Agent OS X - Strategy Agent
 * Strategic planning, SWOT analysis, OKR management,
 * competitive position analysis, opportunity identification, and risk assessment.
 */

import { Injectable, Inject } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
import { BusinessCapability } from '../../../software-factory/interfaces';

// ─── Agent Configuration ──────────────────────────────────────────

export const STRATEGY_AGENT_CONFIG: AgentConfig = {
  id: 'business-strategy',
  name: 'Strategy',
  cluster: AgentCluster.BUSINESS,
  version: '1.0.0',
  description:
    'Strategy agent that handles strategic planning, SWOT analysis, OKR management, competitive position analysis, opportunity identification, and risk assessment.',
  capabilities: [
    {
      name: 'createStrategicPlan',
      description: 'Create a strategic plan with vision, mission, goals, and initiatives',
      inputSchema: {
        type: 'object',
        properties: {
          organization: { type: 'string', description: 'Organization name' },
          timeHorizon: {
            type: 'string',
            enum: ['1-year', '3-year', '5-year'],
            description: 'Planning horizon',
          },
          focusAreas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Strategic focus areas',
          },
          mission: { type: 'string', description: 'Organization mission statement' },
          vision: { type: 'string', description: 'Organization vision statement' },
        },
        required: ['organization'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          planId: { type: 'string' },
          organization: { type: 'string' },
          vision: { type: 'string' },
          mission: { type: 'string' },
          strategicPillars: { type: 'array' },
          initiatives: { type: 'array' },
          createdAt: { type: 'string' },
        },
      },
    },
    {
      name: 'performSWOT',
      description: 'Perform a SWOT analysis for an organization or business unit',
      inputSchema: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Subject of the SWOT analysis' },
          industry: { type: 'string', description: 'Industry context' },
          depth: {
            type: 'string',
            enum: ['high-level', 'detailed', 'comprehensive'],
            description: 'Analysis depth',
          },
        },
        required: ['subject'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          analysisId: { type: 'string' },
          subject: { type: 'string' },
          strengths: { type: 'array' },
          weaknesses: { type: 'array' },
          opportunities: { type: 'array' },
          threats: { type: 'array' },
          strategicImplications: { type: 'array' },
        },
      },
    },
    {
      name: 'defineOKRs',
      description: 'Define Objectives and Key Results for a team or organization',
      inputSchema: {
        type: 'object',
        properties: {
          team: { type: 'string', description: 'Team or department name' },
          period: { type: 'string', description: 'OKR period (e.g., "Q1-2024")' },
          objectives: {
            type: 'array',
            items: { type: 'object' },
            description: 'Objective definitions',
          },
          alignment: { type: 'string', description: 'Parent OKR or strategic alignment reference' },
        },
        required: ['team', 'period'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          okrId: { type: 'string' },
          team: { type: 'string' },
          period: { type: 'string' },
          objectives: { type: 'array' },
          totalKeyResults: { type: 'number' },
          alignmentScore: { type: 'number' },
        },
      },
    },
    {
      name: 'analyzeCompetitivePosition',
      description: 'Analyze the competitive position of an organization in its market',
      inputSchema: {
        type: 'object',
        properties: {
          organization: { type: 'string', description: 'Organization name' },
          market: { type: 'string', description: 'Market or industry' },
          competitors: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key competitors to analyze against',
          },
          dimensions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Competitive dimensions to evaluate',
          },
        },
        required: ['organization', 'market'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          analysisId: { type: 'string' },
          organization: { type: 'string' },
          market: { type: 'string' },
          position: { type: 'string' },
          competitiveScore: { type: 'number' },
          dimensions: { type: 'array' },
          recommendations: { type: 'array' },
        },
      },
    },
    {
      name: 'identifyOpportunities',
      description: 'Identify strategic opportunities based on market and internal analysis',
      inputSchema: {
        type: 'object',
        properties: {
          industry: { type: 'string', description: 'Industry to scan for opportunities' },
          organization: { type: 'string', description: 'Organization context' },
          types: {
            type: 'array',
            items: { type: 'string' },
            description: 'Types of opportunities to look for',
          },
          riskTolerance: {
            type: 'string',
            enum: ['conservative', 'moderate', 'aggressive'],
            description: 'Risk tolerance level',
          },
        },
        required: ['industry'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          scanId: { type: 'string' },
          industry: { type: 'string' },
          opportunities: { type: 'array' },
          prioritizedActions: { type: 'array' },
        },
      },
    },
    {
      name: 'assessRisks',
      description:
        'Assess strategic risks including probability, impact, and mitigation strategies',
      inputSchema: {
        type: 'object',
        properties: {
          organization: { type: 'string', description: 'Organization name' },
          categories: {
            type: 'array',
            items: { type: 'string' },
            description: 'Risk categories to assess',
          },
          timeHorizon: {
            type: 'string',
            enum: ['short-term', 'medium-term', 'long-term'],
            description: 'Assessment time horizon',
          },
        },
        required: ['organization'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          assessmentId: { type: 'string' },
          organization: { type: 'string' },
          risks: { type: 'array' },
          overallRiskScore: { type: 'number' },
          riskMatrix: { type: 'object' },
          mitigations: { type: 'array' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:business',
    'write:business',
    'read:strategy',
    'write:strategy',
  ],
  maxConcurrentTasks: 5,
  timeout: 45000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1500,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface StrategicPlan {
  id: string;
  organization: string;
  timeHorizon: string;
  vision: string;
  mission: string;
  pillars: Array<{ name: string; description: string; priority: string }>;
  initiatives: Array<{ name: string; pillar: string; timeline: string; status: string }>;
  createdAt: Date;
}

interface SWOTAnalysis {
  id: string;
  subject: string;
  strengths: Array<{ item: string; impact: string }>;
  weaknesses: Array<{ item: string; severity: string }>;
  opportunities: Array<{ item: string; potential: string }>;
  threats: Array<{ item: string; likelihood: string }>;
}

interface OKRSet {
  id: string;
  team: string;
  period: string;
  objectives: Array<{
    objective: string;
    keyResults: Array<{ description: string; target: string; current: number; unit: string }>;
  }>;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class StrategyAgentService extends BaseAgentService {
  private strategicPlans: Map<string, StrategicPlan> = new Map();
  private swotAnalyses: Map<string, SWOTAnalysis> = new Map();
  private okrSets: Map<string, OKRSet> = new Map();
  private analysisCounter: number = 0;

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
    this.agentBridge = bridge ?? null;
  }

  protected defineConfig(): AgentConfig {
    return STRATEGY_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'createStrategicPlan',
      description: 'Create a strategic plan',
      execute: async (params: {
        organization: string;
        timeHorizon?: string;
        focusAreas?: string[];
        mission?: string;
        vision?: string;
      }) => this.createStrategicPlan(params),
    });

    this.registerTool({
      name: 'performSWOT',
      description: 'Perform a SWOT analysis',
      execute: async (params: { subject: string; industry?: string; depth?: string }) =>
        this.performSWOT(params),
    });

    this.registerTool({
      name: 'defineOKRs',
      description: 'Define Objectives and Key Results',
      execute: async (params: {
        team: string;
        period: string;
        objectives?: Array<{
          title: string;
          keyResults?: Array<{ description: string; target: string }>;
        }>;
        alignment?: string;
      }) => this.defineOKRs(params),
    });

    this.registerTool({
      name: 'analyzeCompetitivePosition',
      description: 'Analyze competitive position',
      execute: async (params: {
        organization: string;
        market: string;
        competitors?: string[];
        dimensions?: string[];
      }) => this.analyzeCompetitivePosition(params),
    });

    this.registerTool({
      name: 'identifyOpportunities',
      description: 'Identify strategic opportunities',
      execute: async (params: {
        industry: string;
        organization?: string;
        types?: string[];
        riskTolerance?: string;
      }) => this.identifyOpportunities(params),
    });

    this.registerTool({
      name: 'assessRisks',
      description: 'Assess strategic risks',
      execute: async (params: {
        organization: string;
        categories?: string[];
        timeHorizon?: string;
      }) => this.assessRisks(params),
    });

    await this.storeInWorkingMemory('strategy:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('Strategy agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    // Bridge delegation: try real connector first, fallback to simulated logic
    if (this.bridge) {
      try {
        const result = await this.bridge.executeCapability(BusinessCapability.PARTNERSHIP, {
          missionId: input.taskId,
          instruction: JSON.stringify(input.payload),
          workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
          parameters: input.payload,
        });
        return this.createAgentOutput(
          input.taskId,
          result.success,
          result.output,
          result.error,
          startTime,
        );
      } catch (error) {
        this.logger.warn(`Bridge failed, fallback: ${(error as Error).message}`);
      }
    }

    const { action, ...params } = input.payload;

    if (!action) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        'Missing required parameter: action',
        startTime,
      );
    }

    const supportedActions = [
      'createStrategicPlan',
      'performSWOT',
      'defineOKRs',
      'analyzeCompetitivePosition',
      'identifyOpportunities',
      'assessRisks',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown strategy action: ${action}. Supported: ${supportedActions.join(', ')}`,
        startTime,
      );
    }

    try {
      const tool = this.getTool(action);
      if (!tool) {
        return this.createAgentOutput(
          input.taskId,
          false,
          null,
          `Tool not found: ${action}`,
          startTime,
        );
      }

      const result = await tool.execute(params);

      await this.storeInWorkingMemory(
        `strategy:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Strategy execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.strategicPlans.clear();
    this.swotAnalyses.clear();
    this.okrSets.clear();
    this.analysisCounter = 0;
    this.logger.log('Strategy agent destroyed, all data cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async createStrategicPlan(params: {
    organization: string;
    timeHorizon?: string;
    focusAreas?: string[];
    mission?: string;
    vision?: string;
  }): Promise<{
    planId: string;
    organization: string;
    timeHorizon: string;
    vision: string;
    mission: string;
    strategicPillars: Array<{ name: string; description: string; priority: string }>;
    initiatives: Array<{ name: string; pillar: string; timeline: string; status: string }>;
    createdAt: string;
  }> {
    const { organization, timeHorizon = '3-year', focusAreas = [], mission, vision } = params;

    if (!organization || typeof organization !== 'string') {
      throw new Error('A valid organization name is required');
    }

    const validHorizons = ['1-year', '3-year', '5-year'];
    if (!validHorizons.includes(timeHorizon)) {
      throw new Error(
        `Invalid timeHorizon: ${timeHorizon}. Supported: ${validHorizons.join(', ')}`,
      );
    }

    this.analysisCounter++;
    const planId = `strat-plan-${Date.now()}-${this.analysisCounter}`;

    const defaultVision = vision || `To be the leading provider in ${organization}'s core market`;
    const defaultMission =
      mission || `To deliver exceptional value to customers through innovation and excellence`;

    const defaultPillars = [
      'Growth & Expansion',
      'Operational Excellence',
      'Innovation & Technology',
      'People & Culture',
    ];
    const pillarNames = focusAreas.length > 0 ? focusAreas : defaultPillars;

    const strategicPillars = pillarNames.map((name, i) => ({
      name,
      description: `Strategic focus on ${name.toLowerCase()} to drive sustainable competitive advantage`,
      priority: i === 0 ? 'critical' : i < 2 ? 'high' : 'medium',
    }));

    const initiatives = [
      {
        name: 'Market Expansion Initiative',
        pillar: pillarNames[0],
        timeline: `${timeHorizon.split('-')[0]} year(s)`,
        status: 'planned',
      },
      {
        name: 'Digital Transformation Program',
        pillar: pillarNames[Math.min(2, pillarNames.length - 1)],
        timeline: `${timeHorizon.split('-')[0]} year(s)`,
        status: 'planned',
      },
      {
        name: 'Talent Development Plan',
        pillar: pillarNames[Math.min(3, pillarNames.length - 1)],
        timeline: '1 year',
        status: 'planned',
      },
      {
        name: 'Process Optimization Project',
        pillar: pillarNames[Math.min(1, pillarNames.length - 1)],
        timeline: '6 months',
        status: 'planned',
      },
    ];

    const plan: StrategicPlan = {
      id: planId,
      organization,
      timeHorizon,
      vision: defaultVision,
      mission: defaultMission,
      pillars: strategicPillars,
      initiatives,
      createdAt: new Date(),
    };

    this.strategicPlans.set(planId, plan);

    this.logger.log(
      `Created strategic plan: ${planId}, org=${organization}, horizon=${timeHorizon}`,
    );

    return {
      planId,
      organization,
      timeHorizon,
      vision: defaultVision,
      mission: defaultMission,
      strategicPillars,
      initiatives,
      createdAt: plan.createdAt.toISOString(),
    };
  }

  private async performSWOT(params: {
    subject: string;
    industry?: string;
    depth?: string;
  }): Promise<{
    analysisId: string;
    subject: string;
    industry: string;
    strengths: Array<{ item: string; impact: string }>;
    weaknesses: Array<{ item: string; severity: string }>;
    opportunities: Array<{ item: string; potential: string }>;
    threats: Array<{ item: string; likelihood: string }>;
    strategicImplications: string[];
  }> {
    const { subject, industry = 'General', depth = 'detailed' } = params;

    if (!subject || typeof subject !== 'string') {
      throw new Error('A valid subject is required');
    }

    const validDepths = ['high-level', 'detailed', 'comprehensive'];
    if (!validDepths.includes(depth)) {
      throw new Error(`Invalid depth: ${depth}. Supported: ${validDepths.join(', ')}`);
    }

    this.analysisCounter++;
    const analysisId = `swot-${Date.now()}-${this.analysisCounter}`;

    // Try LLM-powered SWOT analysis
    try {
      const systemPrompt = `You are a strategic business analyst. Perform a SWOT analysis for the given subject. Return JSON: { "strengths": [{ "item": "string", "impact": "high|medium|low" }], "weaknesses": [{ "item": "string", "severity": "high|medium|low" }], "opportunities": [{ "item": "string", "potential": "high|medium|low" }], "threats": [{ "item": "string", "likelihood": "high|medium|low" }], "strategicImplications": ["string"] }. Be specific and realistic for the industry.`;
      const userPrompt = `Subject: ${subject}\nIndustry: ${industry}\nDepth: ${depth}\nPerform SWOT analysis.`;

      const response = await this.executeWithLLM(systemPrompt, userPrompt, {
        maxTokens: 2048,
        temperature: 0.4,
      });

      const parsed = this.parseLLMResponse(response);
      if (parsed?.strengths && Array.isArray(parsed.strengths)) {
        const analysis: SWOTAnalysis = {
          id: analysisId,
          subject,
          strengths: parsed.strengths,
          weaknesses: parsed.weaknesses || [],
          opportunities: parsed.opportunities || [],
          threats: parsed.threats || [],
        };
        this.swotAnalyses.set(analysisId, analysis);
        this.logger.log(`LLM SWOT analysis: ${analysisId}, subject=${subject}`);
        return {
          analysisId,
          subject,
          industry,
          strengths: parsed.strengths,
          weaknesses: parsed.weaknesses || [],
          opportunities: parsed.opportunities || [],
          threats: parsed.threats || [],
          strategicImplications: parsed.strategicImplications || [],
        };
      }
    } catch (error) {
      this.logger.warn(`LLM SWOT analysis failed, using heuristic: ${(error as Error).message}`);
    }

    // Heuristic fallback
    const strengths: Array<{ item: string; impact: string }> = [
      { item: 'Strong brand recognition and market presence', impact: 'high' },
      { item: 'Diversified revenue streams', impact: 'high' },
      { item: 'Skilled workforce and leadership team', impact: 'medium' },
      { item: 'Robust technology infrastructure', impact: 'medium' },
      { item: 'Established customer relationships', impact: 'high' },
    ];

    const weaknesses: Array<{ item: string; severity: string }> = [
      { item: 'Legacy systems creating technical debt', severity: 'medium' },
      { item: 'Slow decision-making processes', severity: 'medium' },
      { item: 'Limited geographic diversification', severity: 'high' },
      { item: 'Dependency on key personnel', severity: 'medium' },
      { item: 'High customer acquisition costs', severity: 'low' },
    ];

    const opportunities: Array<{ item: string; potential: string }> = [
      { item: 'Emerging market expansion', potential: 'high' },
      { item: 'AI and automation adoption', potential: 'high' },
      { item: 'Strategic partnership opportunities', potential: 'medium' },
      { item: 'Product line extension', potential: 'medium' },
      { item: 'Sustainability-driven demand', potential: 'high' },
    ];

    const threats: Array<{ item: string; likelihood: string }> = [
      { item: 'Intensifying competitive pressure', likelihood: 'high' },
      { item: 'Regulatory compliance complexity', likelihood: 'medium' },
      { item: 'Economic uncertainty and market volatility', likelihood: 'medium' },
      { item: 'Cybersecurity and data privacy risks', likelihood: 'high' },
      { item: 'Talent war and retention challenges', likelihood: 'medium' },
    ];

    if (depth === 'high-level') {
      strengths.splice(3);
      weaknesses.splice(3);
      opportunities.splice(3);
      threats.splice(3);
    }

    const strategicImplications: string[] = [
      'Leverage brand strength and customer relationships to accelerate market expansion',
      'Address legacy systems and decision-making speed to improve operational agility',
      'Prioritize AI adoption and automation to capitalize on technology opportunities',
      'Develop risk mitigation strategies for regulatory and cybersecurity threats',
      'Invest in talent development and retention to sustain competitive advantage',
    ];

    const analysis: SWOTAnalysis = {
      id: analysisId,
      subject,
      strengths,
      weaknesses,
      opportunities,
      threats,
    };

    this.swotAnalyses.set(analysisId, analysis);

    this.logger.log(`Performed SWOT analysis: ${analysisId}, subject=${subject}, depth=${depth}`);

    return {
      analysisId,
      subject,
      industry,
      strengths,
      weaknesses,
      opportunities,
      threats,
      strategicImplications,
    };
  }

  private async defineOKRs(params: {
    team: string;
    period: string;
    objectives?: Array<{
      title: string;
      keyResults?: Array<{ description: string; target: string }>;
    }>;
    alignment?: string;
  }): Promise<{
    okrId: string;
    team: string;
    period: string;
    objectives: Array<{
      objective: string;
      keyResults: Array<{ description: string; target: string; current: number; unit: string }>;
    }>;
    totalKeyResults: number;
    alignmentScore: number;
    createdAt: string;
  }> {
    const { team, period, objectives = [], alignment } = params;

    if (!team || typeof team !== 'string') {
      throw new Error('A valid team name is required');
    }

    if (!period || typeof period !== 'string') {
      throw new Error('A valid period is required');
    }

    this.analysisCounter++;
    const okrId = `okr-${Date.now()}-${this.analysisCounter}`;

    const defaultObjectives = [
      {
        title: 'Drive revenue growth',
        keyResults: [
          { description: 'Increase MRR', target: '25%' },
          { description: 'Close enterprise deals', target: '10' },
          { description: 'Improve conversion rate', target: '15%' },
        ],
      },
      {
        title: 'Enhance product quality',
        keyResults: [
          { description: 'Reduce bug count', target: '40%' },
          { description: 'Achieve NPS score', target: '70' },
          { description: 'Decrease response time', target: '200ms' },
        ],
      },
      {
        title: 'Strengthen team capabilities',
        keyResults: [
          { description: 'Complete training hours', target: '100' },
          { description: 'Improve employee satisfaction', target: '85%' },
          { description: 'Reduce attrition rate', target: '5%' },
        ],
      },
    ];

    const objectivesInput = objectives.length > 0 ? objectives : defaultObjectives;

    const mappedObjectives = objectivesInput.map((obj) => ({
      objective: obj.title,
      keyResults: (obj.keyResults || []).map((kr) => ({
        description: kr.description,
        target: kr.target,
        current: 0,
        unit: kr.target.replace(/[0-9.%]/g, '').trim() || 'units',
      })),
    }));

    const totalKeyResults = mappedObjectives.reduce((sum, obj) => sum + obj.keyResults.length, 0);
    const alignmentScore = alignment
      ? +(0.7 + Math.random() * 0.25).toFixed(2)
      : +(0.5 + Math.random() * 0.3).toFixed(2);

    const okrSet: OKRSet = {
      id: okrId,
      team,
      period,
      objectives: mappedObjectives,
    };

    this.okrSets.set(okrId, okrSet);

    this.logger.log(
      `Defined OKRs: ${okrId}, team=${team}, period=${period}, objectives=${mappedObjectives.length}`,
    );

    return {
      okrId,
      team,
      period,
      objectives: mappedObjectives,
      totalKeyResults,
      alignmentScore,
      createdAt: new Date().toISOString(),
    };
  }

  private async analyzeCompetitivePosition(params: {
    organization: string;
    market: string;
    competitors?: string[];
    dimensions?: string[];
  }): Promise<{
    analysisId: string;
    organization: string;
    market: string;
    position: string;
    competitiveScore: number;
    dimensions: Array<{ name: string; score: number; benchmark: number; gap: number }>;
    recommendations: string[];
  }> {
    const { organization, market, competitors = [], dimensions = [] } = params;

    if (!organization || typeof organization !== 'string') {
      throw new Error('A valid organization name is required');
    }

    if (!market || typeof market !== 'string') {
      throw new Error('A valid market name is required');
    }

    this.analysisCounter++;
    const analysisId = `comp-pos-${Date.now()}-${this.analysisCounter}`;

    const defaultDimensions = [
      'Market Share',
      'Innovation',
      'Brand Strength',
      'Operational Efficiency',
      'Customer Satisfaction',
      'Financial Health',
    ];
    const evalDimensions = dimensions.length > 0 ? dimensions : defaultDimensions;

    const dimensionScores = evalDimensions.map((name) => {
      const score = +(3 + Math.random() * 7).toFixed(1);
      const benchmark = +(5 + Math.random() * 3).toFixed(1);
      return {
        name,
        score,
        benchmark,
        gap: +(score - benchmark).toFixed(1),
      };
    });

    const competitiveScore = +(
      dimensionScores.reduce((s, d) => s + d.score, 0) / dimensionScores.length
    ).toFixed(1);

    let position: string;
    if (competitiveScore >= 8) position = 'Leader';
    else if (competitiveScore >= 6) position = 'Challenger';
    else if (competitiveScore >= 4) position = 'Follower';
    else position = 'Niche Player';

    const recommendations: string[] = [];
    const weakDimensions = dimensionScores.filter((d) => d.gap < -1);
    for (const dim of weakDimensions) {
      recommendations.push(
        `Improve ${dim.name} (score: ${dim.score}, benchmark: ${dim.benchmark}) to close competitive gap`,
      );
    }

    const strongDimensions = dimensionScores.filter((d) => d.gap > 1);
    for (const dim of strongDimensions) {
      recommendations.push(
        `Capitalize on ${dim.name} strength (score: ${dim.score}) as a competitive differentiator`,
      );
    }

    if (competitors.length > 0) {
      recommendations.push(
        `Develop targeted strategies against key competitors: ${competitors.join(', ')}`,
      );
    }

    this.logger.log(
      `Analyzed competitive position: ${organization}, market=${market}, position=${position}, score=${competitiveScore}`,
    );

    return {
      analysisId,
      organization,
      market,
      position,
      competitiveScore,
      dimensions: dimensionScores,
      recommendations,
    };
  }

  private async identifyOpportunities(params: {
    industry: string;
    organization?: string;
    types?: string[];
    riskTolerance?: string;
  }): Promise<{
    scanId: string;
    industry: string;
    opportunities: Array<{
      name: string;
      type: string;
      potential: string;
      effort: string;
      riskLevel: string;
      expectedImpact: string;
      timeToCapture: string;
    }>;
    prioritizedActions: string[];
  }> {
    const { industry, organization, types = [], riskTolerance = 'moderate' } = params;

    if (!industry || typeof industry !== 'string') {
      throw new Error('A valid industry name is required');
    }

    const validTolerances = ['conservative', 'moderate', 'aggressive'];
    if (!validTolerances.includes(riskTolerance)) {
      throw new Error(
        `Invalid riskTolerance: ${riskTolerance}. Supported: ${validTolerances.join(', ')}`,
      );
    }

    this.analysisCounter++;
    const scanId = `opp-scan-${Date.now()}-${this.analysisCounter}`;

    const opportunityTemplates = [
      {
        name: 'Geographic Market Expansion',
        type: 'market',
        potential: 'high',
        effort: 'high',
        riskLevel: 'medium',
        expectedImpact: '$10M-50M',
        timeToCapture: '12-24 months',
      },
      {
        name: 'Product Line Extension',
        type: 'product',
        potential: 'medium',
        effort: 'medium',
        riskLevel: 'low',
        expectedImpact: '$5M-20M',
        timeToCapture: '6-12 months',
      },
      {
        name: 'Digital Transformation Initiative',
        type: 'technology',
        potential: 'high',
        effort: 'high',
        riskLevel: 'medium',
        expectedImpact: '$15M-60M',
        timeToCapture: '12-36 months',
      },
      {
        name: 'Strategic Partnership/Alliance',
        type: 'partnership',
        potential: 'medium',
        effort: 'low',
        riskLevel: 'low',
        expectedImpact: '$3M-15M',
        timeToCapture: '3-9 months',
      },
      {
        name: 'Customer Segment Penetration',
        type: 'market',
        potential: 'medium',
        effort: 'medium',
        riskLevel: 'low',
        expectedImpact: '$5M-25M',
        timeToCapture: '6-18 months',
      },
      {
        name: 'M&A Opportunity',
        type: 'acquisition',
        potential: 'high',
        effort: 'high',
        riskLevel: 'high',
        expectedImpact: '$20M-100M',
        timeToCapture: '6-18 months',
      },
      {
        name: 'Sustainability/ESG Initiative',
        type: 'sustainability',
        potential: 'medium',
        effort: 'medium',
        riskLevel: 'low',
        expectedImpact: '$2M-10M',
        timeToCapture: '12-24 months',
      },
      {
        name: 'Automation/AI Integration',
        type: 'technology',
        potential: 'high',
        effort: 'medium',
        riskLevel: 'medium',
        expectedImpact: '$8M-30M',
        timeToCapture: '6-18 months',
      },
    ];

    const filteredOpportunities =
      types.length > 0
        ? opportunityTemplates.filter((o) => types.includes(o.type))
        : opportunityTemplates;

    // Filter by risk tolerance
    const opportunities = filteredOpportunities.filter((o) => {
      if (riskTolerance === 'conservative') return o.riskLevel === 'low';
      if (riskTolerance === 'moderate') return o.riskLevel !== 'high';
      return true; // aggressive includes all
    });

    const prioritizedActions = opportunities
      .sort((a, b) => {
        const potentialOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const effortOrder: Record<string, number> = { low: 3, medium: 2, high: 1 };
        return (
          potentialOrder[b.potential] +
          effortOrder[b.effort] -
          (potentialOrder[a.potential] + effortOrder[a.effort])
        );
      })
      .slice(0, 3)
      .map(
        (o) => `Priority: ${o.name} — ${o.expectedImpact} impact, ${o.timeToCapture} to capture`,
      );

    this.logger.log(
      `Identified opportunities: scan=${scanId}, industry=${industry}, count=${opportunities.length}`,
    );

    return {
      scanId,
      industry,
      opportunities,
      prioritizedActions,
    };
  }

  private async assessRisks(params: {
    organization: string;
    categories?: string[];
    timeHorizon?: string;
  }): Promise<{
    assessmentId: string;
    organization: string;
    risks: Array<{
      name: string;
      category: string;
      probability: number;
      impact: number;
      riskScore: number;
      mitigation: string;
    }>;
    overallRiskScore: number;
    riskMatrix: { high: number; medium: number; low: number };
    mitigations: string[];
  }> {
    const { organization, categories = [], timeHorizon = 'medium-term' } = params;

    if (!organization || typeof organization !== 'string') {
      throw new Error('A valid organization name is required');
    }

    this.analysisCounter++;
    const assessmentId = `risk-${Date.now()}-${this.analysisCounter}`;

    const defaultCategories = [
      'financial',
      'operational',
      'strategic',
      'compliance',
      'technology',
      'reputational',
    ];
    const riskCategories = categories.length > 0 ? categories : defaultCategories;

    const riskTemplates: Record<
      string,
      Array<{ name: string; baseProb: number; baseImpact: number; mitigation: string }>
    > = {
      financial: [
        {
          name: 'Revenue concentration risk',
          baseProb: 0.4,
          baseImpact: 8,
          mitigation: 'Diversify revenue streams and customer base',
        },
        {
          name: 'Currency fluctuation exposure',
          baseProb: 0.5,
          baseImpact: 5,
          mitigation: 'Implement hedging strategies and natural hedging',
        },
        {
          name: 'Credit default risk',
          baseProb: 0.2,
          baseImpact: 7,
          mitigation: 'Strengthen credit assessment and monitoring processes',
        },
      ],
      operational: [
        {
          name: 'Supply chain disruption',
          baseProb: 0.3,
          baseImpact: 8,
          mitigation: 'Develop alternative supplier relationships and safety stock',
        },
        {
          name: 'Key person dependency',
          baseProb: 0.5,
          baseImpact: 6,
          mitigation: 'Implement succession planning and knowledge transfer',
        },
        {
          name: 'Process failure risk',
          baseProb: 0.3,
          baseImpact: 5,
          mitigation: 'Strengthen process controls and redundancy measures',
        },
      ],
      strategic: [
        {
          name: 'Market disruption by competitors',
          baseProb: 0.4,
          baseImpact: 9,
          mitigation: 'Invest in innovation and maintain market intelligence',
        },
        {
          name: 'Failed strategic initiative',
          baseProb: 0.35,
          baseImpact: 7,
          mitigation: 'Apply rigorous evaluation and staged investment approach',
        },
        {
          name: 'Regulatory change impact',
          baseProb: 0.45,
          baseImpact: 6,
          mitigation: 'Maintain regulatory monitoring and adaptive compliance',
        },
      ],
      compliance: [
        {
          name: 'Data privacy non-compliance',
          baseProb: 0.3,
          baseImpact: 8,
          mitigation: 'Implement comprehensive data governance framework',
        },
        {
          name: 'Industry regulation violation',
          baseProb: 0.25,
          baseImpact: 9,
          mitigation: 'Establish proactive compliance monitoring and audits',
        },
      ],
      technology: [
        {
          name: 'Cybersecurity breach',
          baseProb: 0.35,
          baseImpact: 9,
          mitigation: 'Implement zero-trust architecture and regular penetration testing',
        },
        {
          name: 'Technology obsolescence',
          baseProb: 0.4,
          baseImpact: 6,
          mitigation: 'Maintain technology roadmap and continuous modernization',
        },
        {
          name: 'System availability risk',
          baseProb: 0.25,
          baseImpact: 7,
          mitigation: 'Implement high-availability architecture and disaster recovery',
        },
      ],
      reputational: [
        {
          name: 'Brand reputation damage',
          baseProb: 0.2,
          baseImpact: 8,
          mitigation: 'Develop crisis communication plan and brand monitoring',
        },
        {
          name: 'Customer trust erosion',
          baseProb: 0.3,
          baseImpact: 7,
          mitigation: 'Enhance transparency and customer communication',
        },
      ],
    };

    const risks: Array<{
      name: string;
      category: string;
      probability: number;
      impact: number;
      riskScore: number;
      mitigation: string;
    }> = [];

    for (const category of riskCategories) {
      const templates = riskTemplates[category] || [];
      for (const template of templates) {
        const probability = +(template.baseProb + (Math.random() - 0.5) * 0.2).toFixed(2);
        const impact = +(template.baseImpact + (Math.random() - 0.5) * 2).toFixed(1);
        const riskScore = +(probability * impact).toFixed(2);

        risks.push({
          name: template.name,
          category,
          probability: Math.max(0, Math.min(1, probability)),
          impact: Math.max(1, Math.min(10, impact)),
          riskScore,
          mitigation: template.mitigation,
        });
      }
    }

    risks.sort((a, b) => b.riskScore - a.riskScore);

    const overallRiskScore =
      risks.length > 0
        ? +(risks.reduce((s, r) => s + r.riskScore, 0) / risks.length).toFixed(2)
        : 0;

    const riskMatrix = {
      high: risks.filter((r) => r.riskScore >= 3).length,
      medium: risks.filter((r) => r.riskScore >= 1.5 && r.riskScore < 3).length,
      low: risks.filter((r) => r.riskScore < 1.5).length,
    };

    const mitigations = risks
      .slice(0, 5)
      .map((r) => `Mitigate "${r.name}" (${r.category}): ${r.mitigation}`);

    this.logger.log(
      `Risk assessment: ${organization}, total=${risks.length}, high=${riskMatrix.high}, medium=${riskMatrix.medium}, low=${riskMatrix.low}`,
    );

    return {
      assessmentId,
      organization,
      risks,
      overallRiskScore,
      riskMatrix,
      mitigations,
    };
  }
}
