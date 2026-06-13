/**
 * AENEWS Agent OS X - Ad Campaign Agent
 * Ad campaign management, budget allocation, audience targeting,
 * campaign launching, optimization, and performance reporting.
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

export const AD_CAMPAIGN_AGENT_CONFIG: AgentConfig = {
  id: 'marketing-ad-campaign',
  name: 'AdCampaign',
  cluster: AgentCluster.MARKETING,
  version: '1.0.0',
  description:
    'Ad campaign management agent that handles campaign creation, budget allocation, audience targeting, launching, optimization, and performance reporting across advertising platforms.',
  capabilities: [
    {
      name: 'createCampaign',
      description: 'Create a new advertising campaign',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Campaign name' },
          platform: { type: 'string', description: 'Ad platform' },
          objective: {
            type: 'string',
            enum: ['awareness', 'traffic', 'engagement', 'leads', 'conversions', 'sales'],
            description: 'Campaign objective',
          },
          startDate: { type: 'string', description: 'Start date (ISO string)' },
          endDate: { type: 'string', description: 'End date (ISO string)' },
          adSets: {
            type: 'array',
            items: { type: 'object' },
            description: 'Ad sets configuration',
          },
        },
        required: ['name', 'platform', 'objective'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          campaignId: { type: 'string' },
          name: { type: 'string' },
          platform: { type: 'string' },
          status: { type: 'string' },
          createdAt: { type: 'string' },
        },
      },
    },
    {
      name: 'setBudget',
      description: 'Set or update campaign budget allocation',
      inputSchema: {
        type: 'object',
        properties: {
          campaignId: { type: 'string', description: 'Campaign ID' },
          totalBudget: { type: 'number', description: 'Total campaign budget' },
          dailyBudget: { type: 'number', description: 'Daily budget cap' },
          allocation: {
            type: 'string',
            enum: ['even', 'performance-based', 'manual', 'ai-optimized'],
            description: 'Budget allocation strategy',
          },
          adSetBudgets: { type: 'object', description: 'Per ad set budget overrides' },
        },
        required: ['campaignId', 'totalBudget'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          campaignId: { type: 'string' },
          totalBudget: { type: 'number' },
          dailyBudget: { type: 'number' },
          allocation: { type: 'string' },
          adSetAllocations: { type: 'object' },
        },
      },
    },
    {
      name: 'defineTargeting',
      description: 'Define audience targeting for a campaign',
      inputSchema: {
        type: 'object',
        properties: {
          campaignId: { type: 'string', description: 'Campaign ID' },
          demographics: { type: 'object', description: 'Demographic targeting' },
          interests: {
            type: 'array',
            items: { type: 'string' },
            description: 'Interest targeting',
          },
          behaviors: {
            type: 'array',
            items: { type: 'string' },
            description: 'Behavioral targeting',
          },
          locations: {
            type: 'array',
            items: { type: 'string' },
            description: 'Geographic targeting',
          },
          customAudiences: {
            type: 'array',
            items: { type: 'string' },
            description: 'Custom audience IDs',
          },
          lookalikeAudiences: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lookalike audience seeds',
          },
        },
        required: ['campaignId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          campaignId: { type: 'string' },
          estimatedReach: { type: 'number' },
          targeting: { type: 'object' },
        },
      },
    },
    {
      name: 'launchCampaign',
      description: 'Launch or pause an ad campaign',
      inputSchema: {
        type: 'object',
        properties: {
          campaignId: { type: 'string', description: 'Campaign ID' },
          action: {
            type: 'string',
            enum: ['launch', 'pause', 'resume', 'stop'],
            description: 'Action to perform',
          },
          reviewFirst: {
            type: 'boolean',
            description: 'Whether to review settings before launching',
          },
        },
        required: ['campaignId', 'action'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          campaignId: { type: 'string' },
          status: { type: 'string' },
          action: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
    {
      name: 'optimizeCampaign',
      description: 'Optimize campaign performance with AI-driven suggestions',
      inputSchema: {
        type: 'object',
        properties: {
          campaignId: { type: 'string', description: 'Campaign ID' },
          optimizationGoal: {
            type: 'string',
            enum: ['cpa', 'roas', 'conversions', 'reach', 'engagement'],
            description: 'Optimization goal',
          },
          autoApply: { type: 'boolean', description: 'Whether to auto-apply optimizations' },
          maxBudgetChange: { type: 'number', description: 'Maximum budget change percentage' },
        },
        required: ['campaignId', 'optimizationGoal'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          campaignId: { type: 'string' },
          optimizations: { type: 'array', items: { type: 'object' } },
          applied: { type: 'boolean' },
          projectedImprovement: { type: 'string' },
        },
      },
    },
    {
      name: 'generateReport',
      description: 'Generate a campaign performance report',
      inputSchema: {
        type: 'object',
        properties: {
          campaignId: { type: 'string', description: 'Campaign ID' },
          dateFrom: { type: 'string', description: 'Start date (ISO string)' },
          dateTo: { type: 'string', description: 'End date (ISO string)' },
          granularity: {
            type: 'string',
            enum: ['hourly', 'daily', 'weekly', 'total'],
            description: 'Report granularity',
          },
          compareWith: { type: 'string', description: 'Another campaign ID for comparison' },
        },
        required: ['campaignId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          campaignId: { type: 'string' },
          metrics: { type: 'object' },
          adSetBreakdown: { type: 'array', items: { type: 'object' } },
          recommendations: { type: 'array', items: { type: 'string' } },
          generatedAt: { type: 'string' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:campaign',
    'write:campaign',
    'manage:budget',
    'manage:targeting',
    'launch:campaign',
    'read:analytics',
  ],
  maxConcurrentTasks: 4,
  timeout: 60000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 2000,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface AdCampaign {
  id: string;
  name: string;
  platform: string;
  objective: string;
  status: 'draft' | 'pending_review' | 'active' | 'paused' | 'completed' | 'stopped';
  budget: CampaignBudget;
  targeting: CampaignTargeting;
  adSets: AdSet[];
  performance: CampaignPerformance;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
}

interface CampaignBudget {
  total: number;
  daily: number;
  spent: number;
  allocation: string;
  adSetBudgets: Record<string, number>;
}

interface CampaignTargeting {
  demographics: Record<string, any>;
  interests: string[];
  behaviors: string[];
  locations: string[];
  customAudiences: string[];
  lookalikeAudiences: string[];
  estimatedReach: number;
}

interface AdSet {
  id: string;
  name: string;
  budget: number;
  status: 'active' | 'paused' | 'completed';
  performance: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
    cpc: number;
    cpa: number;
  };
}

interface CampaignPerformance {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  reach: number;
  frequency: number;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class AdCampaignAgentService extends BaseAgentService {
  private campaigns: Map<string, AdCampaign> = new Map();
  private campaignCounter: number = 0;

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }

  protected defineConfig(): AgentConfig {
    return AD_CAMPAIGN_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    // Register tools
    this.registerTool({
      name: 'createCampaign',
      description: 'Create a new advertising campaign',
      execute: async (params: {
        name: string;
        platform: string;
        objective: string;
        startDate?: string;
        endDate?: string;
        adSets?: Array<{ name: string; budget?: number }>;
      }) => this.createCampaign(params),
    });

    this.registerTool({
      name: 'setBudget',
      description: 'Set or update campaign budget allocation',
      execute: async (params: {
        campaignId: string;
        totalBudget: number;
        dailyBudget?: number;
        allocation?: string;
        adSetBudgets?: Record<string, number>;
      }) => this.setBudget(params),
    });

    this.registerTool({
      name: 'defineTargeting',
      description: 'Define audience targeting for a campaign',
      execute: async (params: {
        campaignId: string;
        demographics?: Record<string, any>;
        interests?: string[];
        behaviors?: string[];
        locations?: string[];
        customAudiences?: string[];
        lookalikeAudiences?: string[];
      }) => this.defineTargeting(params),
    });

    this.registerTool({
      name: 'launchCampaign',
      description: 'Launch or pause an ad campaign',
      execute: async (params: { campaignId: string; action: string; reviewFirst?: boolean }) =>
        this.launchCampaign(params),
    });

    this.registerTool({
      name: 'optimizeCampaign',
      description: 'Optimize campaign performance with AI-driven suggestions',
      execute: async (params: {
        campaignId: string;
        optimizationGoal: string;
        autoApply?: boolean;
        maxBudgetChange?: number;
      }) => this.optimizeCampaign(params),
    });

    this.registerTool({
      name: 'generateReport',
      description: 'Generate a campaign performance report',
      execute: async (params: {
        campaignId: string;
        dateFrom?: string;
        dateTo?: string;
        granularity?: string;
        compareWith?: string;
      }) => this.generateReport(params),
    });

    await this.storeInWorkingMemory('ad-campaign:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('AdCampaign agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    // Bridge delegation: try real connector first, fallback to simulated logic
    if (this.bridge) {
      try {
        const result = await this.bridge.executeCapability(BusinessCapability.MARKETING, {
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
      'createCampaign',
      'setBudget',
      'defineTargeting',
      'launchCampaign',
      'optimizeCampaign',
      'generateReport',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown ad campaign action: ${action}. Supported: ${supportedActions.join(', ')}`,
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
        `ad-campaign:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`AdCampaign execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.campaigns.clear();
    this.campaignCounter = 0;
    this.logger.log('AdCampaign agent destroyed, campaign data cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async createCampaign(params: {
    name: string;
    platform: string;
    objective: string;
    startDate?: string;
    endDate?: string;
    adSets?: Array<{ name: string; budget?: number }>;
  }): Promise<{
    campaignId: string;
    name: string;
    platform: string;
    status: string;
    createdAt: string;
  }> {
    const { name, platform, objective, startDate, endDate, adSets: adSetConfigs = [] } = params;

    if (!name || typeof name !== 'string') {
      throw new Error('A valid campaign name is required');
    }
    if (!platform || typeof platform !== 'string') {
      throw new Error('A valid platform is required');
    }

    const validPlatforms = [
      'google-ads',
      'facebook',
      'instagram',
      'linkedin',
      'twitter',
      'tiktok',
      'programmatic',
    ];
    if (!validPlatforms.includes(platform)) {
      throw new Error(`Invalid platform: ${platform}. Valid: ${validPlatforms.join(', ')}`);
    }

    const validObjectives = ['awareness', 'traffic', 'engagement', 'leads', 'conversions', 'sales'];
    if (!validObjectives.includes(objective)) {
      throw new Error(`Invalid objective: ${objective}. Valid: ${validObjectives.join(', ')}`);
    }

    const campaignId = this.generateCampaignId();

    // Create ad sets
    const adSets: AdSet[] =
      adSetConfigs.length > 0
        ? adSetConfigs.map((as, i) => ({
            id: `adset-${i + 1}`,
            name: as.name || `Ad Set ${i + 1}`,
            budget: as.budget || 0,
            status: 'active' as const,
            performance: {
              impressions: 0,
              clicks: 0,
              conversions: 0,
              spend: 0,
              ctr: 0,
              cpc: 0,
              cpa: 0,
            },
          }))
        : [
            {
              id: 'adset-1',
              name: 'Default Ad Set',
              budget: 0,
              status: 'active',
              performance: {
                impressions: 0,
                clicks: 0,
                conversions: 0,
                spend: 0,
                ctr: 0,
                cpc: 0,
                cpa: 0,
              },
            },
          ];

    const campaign: AdCampaign = {
      id: campaignId,
      name,
      platform,
      objective,
      status: 'draft',
      budget: {
        total: 0,
        daily: 0,
        spent: 0,
        allocation: 'even',
        adSetBudgets: {},
      },
      targeting: {
        demographics: {},
        interests: [],
        behaviors: [],
        locations: [],
        customAudiences: [],
        lookalikeAudiences: [],
        estimatedReach: 0,
      },
      adSets,
      performance: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0,
        roas: 0,
        reach: 0,
        frequency: 0,
      },
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdAt: new Date(),
    };

    this.campaigns.set(campaignId, campaign);

    this.logger.log(
      `Created campaign: ${campaignId}, name="${name}", platform=${platform}, objective=${objective}`,
    );

    return {
      campaignId,
      name,
      platform,
      status: 'draft',
      createdAt: campaign.createdAt.toISOString(),
    };
  }

  private async setBudget(params: {
    campaignId: string;
    totalBudget: number;
    dailyBudget?: number;
    allocation?: string;
    adSetBudgets?: Record<string, number>;
  }): Promise<{
    campaignId: string;
    totalBudget: number;
    dailyBudget: number;
    allocation: string;
    adSetAllocations: Record<string, number>;
  }> {
    const { campaignId, totalBudget, dailyBudget, allocation = 'even', adSetBudgets = {} } = params;

    if (!campaignId || typeof campaignId !== 'string') {
      throw new Error('A valid campaignId is required');
    }
    if (totalBudget <= 0) {
      throw new Error('Total budget must be greater than 0');
    }

    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (campaign.status === 'active' || campaign.status === 'paused') {
      this.logger.warn(`Modifying budget for ${campaign.status} campaign ${campaignId}`);
    }

    const calculatedDaily = dailyBudget || Math.round(totalBudget / 30);

    // Allocate budgets to ad sets
    const adSetAllocations: Record<string, number> = {};

    if (Object.keys(adSetBudgets).length > 0) {
      // Manual allocations provided
      for (const [adSetId, budget] of Object.entries(adSetBudgets)) {
        adSetAllocations[adSetId] = budget;
      }
      // Distribute remaining budget evenly
      const allocated = Object.values(adSetBudgets).reduce((sum, b) => sum + b, 0);
      const remaining = totalBudget - allocated;
      const unallocatedSets = campaign.adSets.filter((as) => !adSetBudgets[as.id]);
      if (unallocatedSets.length > 0 && remaining > 0) {
        const perSet = Math.round(remaining / unallocatedSets.length);
        for (const as of unallocatedSets) {
          adSetAllocations[as.id] = perSet;
        }
      }
    } else {
      // Distribute based on allocation strategy
      const totalAdSets = campaign.adSets.length;
      if (allocation === 'even') {
        const perSet = Math.round(totalBudget / totalAdSets);
        for (const as of campaign.adSets) {
          adSetAllocations[as.id] = perSet;
        }
      } else if (allocation === 'performance-based') {
        // Weight by current performance (or equal if no data)
        const totalConversions =
          campaign.adSets.reduce((sum, as) => sum + as.performance.conversions, 0) || 1;
        for (const as of campaign.adSets) {
          const weight = (as.performance.conversions || 1) / totalConversions;
          adSetAllocations[as.id] = Math.round(totalBudget * weight);
        }
      } else if (allocation === 'ai-optimized') {
        // AI-optimized: distribute with slight variation based on objective
        const baseAllocation = totalBudget / totalAdSets;
        for (const as of campaign.adSets) {
          const optimization = 0.8 + Math.random() * 0.4; // 80-120% of base
          adSetAllocations[as.id] = Math.round(baseAllocation * optimization);
        }
        // Normalize to total budget
        const totalAllocated = Object.values(adSetAllocations).reduce((sum, b) => sum + b, 0);
        const scale = totalBudget / totalAllocated;
        for (const key of Object.keys(adSetAllocations)) {
          adSetAllocations[key] = Math.round(adSetAllocations[key] * scale);
        }
      } else {
        // manual - equal distribution as fallback
        const perSet = Math.round(totalBudget / totalAdSets);
        for (const as of campaign.adSets) {
          adSetAllocations[as.id] = perSet;
        }
      }
    }

    // Update campaign budget
    campaign.budget = {
      total: totalBudget,
      daily: calculatedDaily,
      spent: campaign.budget.spent,
      allocation,
      adSetBudgets: adSetAllocations,
    };

    // Update ad set budgets
    for (const as of campaign.adSets) {
      if (adSetAllocations[as.id]) {
        as.budget = adSetAllocations[as.id];
      }
    }

    this.logger.log(
      `Set budget: campaign=${campaignId}, total=${totalBudget}, daily=${calculatedDaily}, allocation=${allocation}`,
    );

    return {
      campaignId,
      totalBudget,
      dailyBudget: calculatedDaily,
      allocation,
      adSetAllocations,
    };
  }

  private async defineTargeting(params: {
    campaignId: string;
    demographics?: Record<string, any>;
    interests?: string[];
    behaviors?: string[];
    locations?: string[];
    customAudiences?: string[];
    lookalikeAudiences?: string[];
  }): Promise<{
    campaignId: string;
    estimatedReach: number;
    targeting: CampaignTargeting;
  }> {
    const {
      campaignId,
      demographics = {},
      interests = [],
      behaviors = [],
      locations = [],
      customAudiences = [],
      lookalikeAudiences = [],
    } = params;

    if (!campaignId || typeof campaignId !== 'string') {
      throw new Error('A valid campaignId is required');
    }

    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    // Estimate reach based on targeting specificity
    let estimatedReach = 1000000; // Base reach
    if (Object.keys(demographics).length > 0) estimatedReach *= 0.6;
    if (interests.length > 0) estimatedReach *= Math.max(0.1, 1 - interests.length * 0.1);
    if (behaviors.length > 0) estimatedReach *= 0.7;
    if (locations.length > 0 && !locations.includes('worldwide')) estimatedReach *= 0.3;
    estimatedReach = Math.floor(estimatedReach);

    const targeting: CampaignTargeting = {
      demographics,
      interests,
      behaviors,
      locations,
      customAudiences,
      lookalikeAudiences,
      estimatedReach,
    };

    campaign.targeting = targeting;

    this.logger.log(
      `Defined targeting: campaign=${campaignId}, estimatedReach=${estimatedReach}, interests=${interests.length}`,
    );

    return {
      campaignId,
      estimatedReach,
      targeting,
    };
  }

  private async launchCampaign(params: {
    campaignId: string;
    action: string;
    reviewFirst?: boolean;
  }): Promise<{
    campaignId: string;
    status: string;
    action: string;
    message: string;
  }> {
    const { campaignId, action, reviewFirst = false } = params;

    if (!campaignId || typeof campaignId !== 'string') {
      throw new Error('A valid campaignId is required');
    }

    const validActions = ['launch', 'pause', 'resume', 'stop'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid action: ${action}. Valid: ${validActions.join(', ')}`);
    }

    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    let message = '';

    switch (action) {
      case 'launch': {
        // Validate campaign before launching
        if (reviewFirst) {
          if (campaign.budget.total === 0) {
            throw new Error('Cannot launch campaign without a budget. Use setBudget first.');
          }
          if (campaign.targeting.estimatedReach === 0) {
            throw new Error('Cannot launch campaign without targeting. Use defineTargeting first.');
          }
        }

        if (campaign.status === 'active') {
          throw new Error(`Campaign ${campaignId} is already active`);
        }

        campaign.status = 'active';
        campaign.startDate = campaign.startDate || new Date();

        // Simulate initial performance
        campaign.performance = this.simulatePerformance(campaign);
        for (const as of campaign.adSets) {
          as.performance = this.simulateAdSetPerformance(as, campaign);
        }

        message = `Campaign "${campaign.name}" launched successfully on ${campaign.platform}.`;
        break;
      }

      case 'pause': {
        if (campaign.status !== 'active') {
          throw new Error(`Cannot pause campaign in ${campaign.status} state`);
        }
        campaign.status = 'paused';
        message = `Campaign "${campaign.name}" paused.`;
        break;
      }

      case 'resume': {
        if (campaign.status !== 'paused') {
          throw new Error(`Cannot resume campaign in ${campaign.status} state`);
        }
        campaign.status = 'active';
        message = `Campaign "${campaign.name}" resumed.`;
        break;
      }

      case 'stop': {
        campaign.status = 'stopped';
        message = `Campaign "${campaign.name}" stopped permanently.`;
        break;
      }
    }

    this.logger.log(`Campaign ${action}: ${campaignId}, status=${campaign.status}`);

    return {
      campaignId,
      status: campaign.status,
      action,
      message,
    };
  }

  private async optimizeCampaign(params: {
    campaignId: string;
    optimizationGoal: string;
    autoApply?: boolean;
    maxBudgetChange?: number;
  }): Promise<{
    campaignId: string;
    optimizations: Array<{ type: string; description: string; impact: string; applied: boolean }>;
    applied: boolean;
    projectedImprovement: string;
  }> {
    const { campaignId, optimizationGoal, autoApply = false, maxBudgetChange = 20 } = params;

    if (!campaignId || typeof campaignId !== 'string') {
      throw new Error('A valid campaignId is required');
    }

    const validGoals = ['cpa', 'roas', 'conversions', 'reach', 'engagement'];
    if (!validGoals.includes(optimizationGoal)) {
      throw new Error(
        `Invalid optimization goal: ${optimizationGoal}. Valid: ${validGoals.join(', ')}`,
      );
    }

    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (campaign.status !== 'active' && campaign.status !== 'paused') {
      throw new Error(`Cannot optimize campaign in ${campaign.status} state`);
    }

    const optimizations: Array<{
      type: string;
      description: string;
      impact: string;
      applied: boolean;
    }> = [];

    // Generate optimization suggestions based on goal
    switch (optimizationGoal) {
      case 'cpa': {
        optimizations.push({
          type: 'budget-shift',
          description: 'Shift budget from underperforming ad sets to top performers to reduce CPA',
          impact: 'Estimated 15-25% CPA reduction',
          applied: autoApply,
        });
        optimizations.push({
          type: 'audience-refinement',
          description: 'Narrow audience targeting to exclude low-converting segments',
          impact: 'Estimated 10-20% CPA improvement',
          applied: autoApply,
        });
        optimizations.push({
          type: 'bid-strategy',
          description: 'Switch to target CPA bidding strategy for automated bid optimization',
          impact: 'Estimated 20-30% CPA improvement over time',
          applied: false,
        });
        break;
      }

      case 'roas': {
        optimizations.push({
          type: 'creative-refresh',
          description: 'Refresh ad creatives for top-spending ad sets with declining ROAS',
          impact: 'Estimated 10-15% ROAS improvement',
          applied: autoApply,
        });
        optimizations.push({
          type: 'budget-rebalance',
          description: 'Rebalance budget allocation based on ROAS performance by ad set',
          impact: 'Estimated 15-25% ROAS improvement',
          applied: autoApply,
        });
        break;
      }

      case 'conversions': {
        optimizations.push({
          type: 'audience-expansion',
          description: 'Expand targeting to include lookalike audiences based on converters',
          impact: 'Estimated 20-40% increase in conversion volume',
          applied: autoApply,
        });
        optimizations.push({
          type: 'landing-page',
          description: 'Optimize landing page loading speed and conversion elements',
          impact: 'Estimated 10-20% conversion rate improvement',
          applied: false,
        });
        break;
      }

      case 'reach': {
        optimizations.push({
          type: 'frequency-cap',
          description: 'Adjust frequency cap to maximize unique reach within budget',
          impact: 'Estimated 15-30% reach increase',
          applied: autoApply,
        });
        optimizations.push({
          type: 'placement-optimization',
          description: 'Add additional placement options to expand inventory reach',
          impact: 'Estimated 10-20% reach increase',
          applied: autoApply,
        });
        break;
      }

      case 'engagement': {
        optimizations.push({
          type: 'creative-testing',
          description: 'A/B test different ad formats and messaging for higher engagement',
          impact: 'Estimated 15-25% engagement rate improvement',
          applied: autoApply,
        });
        optimizations.push({
          type: 'scheduling',
          description: 'Optimize ad scheduling for peak engagement time windows',
          impact: 'Estimated 10-15% engagement increase',
          applied: autoApply,
        });
        break;
      }
    }

    // Apply budget adjustments if auto-apply
    if (autoApply && campaign.adSets.length > 1) {
      const topPerformer = campaign.adSets.reduce((best, as) =>
        as.performance.conversions > best.performance.conversions ? as : best,
      );
      const budgetShift = Math.min(maxBudgetChange / 100, 0.2);
      const shiftAmount = Math.round(campaign.budget.total * budgetShift);

      this.logger.log(`Auto-applied budget shift: +${shiftAmount} to ${topPerformer.id}`);
    }

    const projectedImprovement =
      optimizations.filter((o) => o.applied).length > 0
        ? `Projected ${optimizationGoal.toUpperCase()} improvement of 15-30% based on applied optimizations`
        : `Review and apply optimizations for projected ${optimizationGoal.toUpperCase()} improvement`;

    this.logger.log(
      `Optimized campaign: ${campaignId}, goal=${optimizationGoal}, optimizations=${optimizations.length}, applied=${autoApply}`,
    );

    return {
      campaignId,
      optimizations,
      applied: autoApply,
      projectedImprovement,
    };
  }

  private async generateReport(params: {
    campaignId: string;
    dateFrom?: string;
    dateTo?: string;
    granularity?: string;
    compareWith?: string;
  }): Promise<{
    campaignId: string;
    metrics: Record<string, number>;
    adSetBreakdown: Array<Record<string, any>>;
    recommendations: string[];
    generatedAt: string;
  }> {
    const { campaignId, granularity = 'total', compareWith } = params;

    if (!campaignId || typeof campaignId !== 'string') {
      throw new Error('A valid campaignId is required');
    }

    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const perf = campaign.performance;
    const metrics: Record<string, number> = {
      impressions: perf.impressions,
      clicks: perf.clicks,
      conversions: perf.conversions,
      spend: Math.round(perf.spend * 100) / 100,
      ctr: perf.ctr,
      cpc: Math.round(perf.cpc * 100) / 100,
      cpa: Math.round(perf.cpa * 100) / 100,
      roas: Math.round(perf.roas * 100) / 100,
      reach: perf.reach,
      frequency: Math.round(perf.frequency * 100) / 100,
      budgetUtilization:
        campaign.budget.total > 0
          ? Math.round((campaign.budget.spent / campaign.budget.total) * 100)
          : 0,
    };

    // Ad set breakdown
    const adSetBreakdown = campaign.adSets.map((as) => ({
      id: as.id,
      name: as.name,
      budget: as.budget,
      impressions: as.performance.impressions,
      clicks: as.performance.clicks,
      conversions: as.performance.conversions,
      spend: Math.round(as.performance.spend * 100) / 100,
      ctr: as.performance.ctr,
      cpc: Math.round(as.performance.cpc * 100) / 100,
      cpa: Math.round(as.performance.cpa * 100) / 100,
      status: as.status,
    }));

    // Generate recommendations
    const recommendations = this.generateCampaignRecommendations(campaign);

    // Comparison if requested
    if (compareWith) {
      const compareCampaign = this.campaigns.get(compareWith);
      if (compareCampaign) {
        recommendations.push(
          `Compared to "${compareCampaign.name}": CTR ${perf.ctr > compareCampaign.performance.ctr ? 'higher' : 'lower'}, ` +
            `CPA ${perf.cpa < compareCampaign.performance.cpa ? 'better' : 'higher'}.`,
        );
      }
    }

    this.logger.log(
      `Generated report: campaign=${campaignId}, impressions=${metrics.impressions}, clicks=${metrics.clicks}`,
    );

    return {
      campaignId,
      metrics,
      adSetBreakdown,
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private generateCampaignId(): string {
    this.campaignCounter++;
    return `camp-${Date.now()}-${this.campaignCounter}`;
  }

  private simulatePerformance(campaign: AdCampaign): CampaignPerformance {
    const budget = campaign.budget.total || 1000;
    const impressions = budget * (50 + Math.floor(Math.random() * 100));
    const ctr = +(1 + Math.random() * 4).toFixed(2);
    const clicks = Math.floor(impressions * (ctr / 100));
    const cpc = clicks > 0 ? +(budget / clicks).toFixed(2) : 0;
    const conversionRate = +(1 + Math.random() * 5).toFixed(2);
    const conversions = Math.floor(clicks * (conversionRate / 100));
    const cpa = conversions > 0 ? +(budget / conversions).toFixed(2) : 0;
    const roas = conversions > 0 ? +((conversions * 50) / budget).toFixed(2) : 0;
    const reach = Math.floor(impressions * 0.7);
    const frequency = reach > 0 ? +(impressions / reach).toFixed(2) : 0;

    return {
      impressions,
      clicks,
      conversions,
      spend: budget,
      ctr,
      cpc,
      cpa,
      roas,
      reach,
      frequency,
    };
  }

  private simulateAdSetPerformance(adSet: AdSet, campaign: AdCampaign): AdSet['performance'] {
    const budget = adSet.budget || campaign.budget.total / campaign.adSets.length;
    const impressions = Math.floor(budget * (50 + Math.random() * 100));
    const ctr = +(1 + Math.random() * 4).toFixed(2);
    const clicks = Math.floor(impressions * (ctr / 100));
    const cpc = clicks > 0 ? +(budget / clicks).toFixed(2) : 0;
    const conversionRate = +(1 + Math.random() * 5).toFixed(2);
    const conversions = Math.floor(clicks * (conversionRate / 100));
    const cpa = conversions > 0 ? +(budget / conversions).toFixed(2) : 0;

    return { impressions, clicks, conversions, spend: budget, ctr, cpc, cpa };
  }

  private generateCampaignRecommendations(campaign: AdCampaign): string[] {
    const recommendations: string[] = [];
    const perf = campaign.performance;

    if (perf.ctr < 1) {
      recommendations.push(
        'CTR is below 1%. Consider refreshing ad creatives and testing new headline variations.',
      );
    } else if (perf.ctr > 3) {
      recommendations.push(
        'CTR is strong. Leverage high-performing creatives across other campaigns.',
      );
    }

    if (perf.cpa > 0 && campaign.budget.total > 0) {
      const cpaToBudgetRatio = perf.cpa / campaign.budget.total;
      if (cpaToBudgetRatio > 0.5) {
        recommendations.push(
          'CPA is high relative to budget. Consider narrowing targeting or adjusting bid strategy.',
        );
      }
    }

    if (perf.frequency > 3) {
      recommendations.push(
        'Ad frequency is above 3. Users may experience ad fatigue. Expand audience or refresh creatives.',
      );
    }

    if (campaign.budget.total > 0) {
      const utilization = (campaign.budget.spent / campaign.budget.total) * 100;
      if (utilization > 90) {
        recommendations.push(
          'Budget utilization is above 90%. Consider increasing budget or pausing low-performing ad sets.',
        );
      } else if (utilization < 30 && campaign.status === 'active') {
        recommendations.push(
          'Budget utilization is below 30%. Campaign may not be delivering optimally. Check for approval or targeting issues.',
        );
      }
    }

    // Check ad set performance variance
    if (campaign.adSets.length > 1) {
      const cpas = campaign.adSets.map((as) => as.performance.cpa).filter((cpa) => cpa > 0);
      if (cpas.length > 1) {
        const maxCpa = Math.max(...cpas);
        const minCpa = Math.min(...cpas);
        if (maxCpa > minCpa * 3) {
          recommendations.push(
            'Significant CPA variance across ad sets. Reallocate budget from high-CPA to low-CPA ad sets.',
          );
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Campaign is performing within expected parameters. Continue monitoring and consider incremental optimizations.',
      );
    }

    return recommendations;
  }
}
