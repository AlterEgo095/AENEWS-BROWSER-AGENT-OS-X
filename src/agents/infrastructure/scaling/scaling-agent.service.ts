/**
 * AENEWS Agent OS X - Scaling Agent
 * Auto-scaling, resource optimization, and capacity planning.
 * Scales resources up/down, configures auto-scaling policies, analyzes capacity, optimizes resources, and plans capacity.
 */

import { Injectable } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';

// ─── Agent Configuration ──────────────────────────────────────────

export const SCALING_AGENT_CONFIG: AgentConfig = {
  id: 'infrastructure-scaling',
  name: 'Scaling',
  cluster: AgentCluster.INFRASTRUCTURE,
  version: '1.0.0',
  description:
    'Auto-scaling, resource optimization, and capacity planning. Scales resources up and down, configures auto-scaling policies, analyzes current capacity, optimizes resource utilization, and generates capacity plans.',
  capabilities: [
    {
      name: 'scaleUp',
      description: 'Scale up resources for a service',
      inputSchema: {
        type: 'object',
        properties: {
          service: { type: 'string' },
          resource: {
            type: 'string',
            enum: ['cpu', 'memory', 'instances', 'storage'],
            default: 'instances',
          },
          amount: { type: 'number', description: 'Amount to scale up by' },
          reason: { type: 'string' },
        },
        required: ['service', 'resource', 'amount'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          previousValue: { type: 'number' },
          newValue: { type: 'number' },
          success: { type: 'boolean' },
        },
      },
    },
    {
      name: 'scaleDown',
      description: 'Scale down resources for a service',
      inputSchema: {
        type: 'object',
        properties: {
          service: { type: 'string' },
          resource: {
            type: 'string',
            enum: ['cpu', 'memory', 'instances', 'storage'],
            default: 'instances',
          },
          amount: { type: 'number', description: 'Amount to scale down by' },
          reason: { type: 'string' },
          force: { type: 'boolean', default: false },
        },
        required: ['service', 'resource', 'amount'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          previousValue: { type: 'number' },
          newValue: { type: 'number' },
          success: { type: 'boolean' },
        },
      },
    },
    {
      name: 'setAutoScaling',
      description: 'Configure auto-scaling policy for a service',
      inputSchema: {
        type: 'object',
        properties: {
          service: { type: 'string' },
          resource: { type: 'string', enum: ['cpu', 'memory', 'instances'], default: 'instances' },
          minSize: { type: 'number' },
          maxSize: { type: 'number' },
          targetCpuPercent: { type: 'number' },
          targetMemoryPercent: { type: 'number' },
          scaleUpCooldown: { type: 'number', description: 'Cooldown in seconds after scale-up' },
          scaleDownCooldown: {
            type: 'number',
            description: 'Cooldown in seconds after scale-down',
          },
        },
        required: ['service', 'minSize', 'maxSize'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          policyId: { type: 'string' },
          created: { type: 'boolean' },
        },
      },
    },
    {
      name: 'analyzeCapacity',
      description: 'Analyze current capacity and utilization',
      inputSchema: {
        type: 'object',
        properties: {
          service: { type: 'string' },
          timeRange: { type: 'string', enum: ['1h', '6h', '24h', '7d', '30d'], default: '24h' },
          includeRecommendations: { type: 'boolean', default: true },
        },
        required: ['service'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          currentCapacity: { type: 'object' },
          utilization: { type: 'object' },
          recommendations: { type: 'array' },
        },
      },
    },
    {
      name: 'optimizeResources',
      description: 'Optimize resource allocation for a service',
      inputSchema: {
        type: 'object',
        properties: {
          service: { type: 'string' },
          strategy: {
            type: 'string',
            enum: ['cost', 'performance', 'balanced'],
            default: 'balanced',
          },
          dryRun: { type: 'boolean', default: true },
        },
        required: ['service'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          currentAllocation: { type: 'object' },
          optimizedAllocation: { type: 'object' },
          savingsEstimate: { type: 'object' },
        },
      },
    },
    {
      name: 'planCapacity',
      description: 'Generate a capacity plan based on growth projections',
      inputSchema: {
        type: 'object',
        properties: {
          services: { type: 'array', items: { type: 'string' } },
          growthRate: { type: 'number', description: 'Expected monthly growth rate (percent)' },
          planningHorizonDays: { type: 'number', default: 90 },
          includeCostEstimate: { type: 'boolean', default: true },
        },
        required: ['services'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          planId: { type: 'string' },
          currentCapacity: { type: 'object' },
          projectedCapacity: { type: 'object' },
          milestones: { type: 'array' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'scale:up',
    'scale:down',
    'manage:auto-scaling',
    'read:capacity',
    'optimize:resources',
    'plan:capacity',
  ],
  maxConcurrentTasks: 3,
  timeout: 120000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 2000,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface ServiceResources {
  service: string;
  instances: number;
  cpuCores: number;
  memoryMb: number;
  storageGb: number;
}

interface AutoScalingPolicy {
  id: string;
  service: string;
  resource: string;
  minSize: number;
  maxSize: number;
  targetCpuPercent?: number;
  targetMemoryPercent?: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
  enabled: boolean;
  createdAt: Date;
}

interface CapacityPlan {
  id: string;
  services: string[];
  growthRate: number;
  planningHorizonDays: number;
  currentCapacity: Record<string, ServiceResources>;
  projectedCapacity: Record<string, ServiceResources>;
  milestones: Array<{
    date: string;
    description: string;
    estimatedCost: number;
  }>;
  totalEstimatedCost: number;
  createdAt: Date;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class ScalingAgentService extends BaseAgentService {
  private serviceResources: Map<string, ServiceResources> = new Map();
  private autoScalingPolicies: Map<string, AutoScalingPolicy> = new Map();
  private capacityPlans: Map<string, CapacityPlan> = new Map();
  private policyCounter = 0;
  private planCounter = 0;

  protected defineConfig(): AgentConfig {
    return SCALING_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'scaleUp',
      description: 'Scale up resources for a service',
      execute: async (params: {
        service: string;
        resource?: string;
        amount: number;
        reason?: string;
      }) => this.scaleUp(params),
    });

    this.registerTool({
      name: 'scaleDown',
      description: 'Scale down resources for a service',
      execute: async (params: {
        service: string;
        resource?: string;
        amount: number;
        reason?: string;
        force?: boolean;
      }) => this.scaleDown(params),
    });

    this.registerTool({
      name: 'setAutoScaling',
      description: 'Configure auto-scaling policy',
      execute: async (params: {
        service: string;
        resource?: string;
        minSize: number;
        maxSize: number;
        targetCpuPercent?: number;
        targetMemoryPercent?: number;
        scaleUpCooldown?: number;
        scaleDownCooldown?: number;
      }) => this.setAutoScaling(params),
    });

    this.registerTool({
      name: 'analyzeCapacity',
      description: 'Analyze current capacity and utilization',
      execute: async (params: {
        service: string;
        timeRange?: string;
        includeRecommendations?: boolean;
      }) => this.analyzeCapacity(params),
    });

    this.registerTool({
      name: 'optimizeResources',
      description: 'Optimize resource allocation',
      execute: async (params: { service: string; strategy?: string; dryRun?: boolean }) =>
        this.optimizeResources(params),
    });

    this.registerTool({
      name: 'planCapacity',
      description: 'Generate a capacity plan',
      execute: async (params: {
        services: string[];
        growthRate?: number;
        planningHorizonDays?: number;
        includeCostEstimate?: boolean;
      }) => this.planCapacity(params),
    });

    // Seed initial service resources
    this.seedInitialResources();

    await this.storeInWorkingMemory('scaling:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('Scaling agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
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
      'scaleUp',
      'scaleDown',
      'setAutoScaling',
      'analyzeCapacity',
      'optimizeResources',
      'planCapacity',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown scaling action: ${action}. Supported: ${supportedActions.join(', ')}`,
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
        `scaling:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Scaling execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.serviceResources.clear();
    this.autoScalingPolicies.clear();
    this.capacityPlans.clear();
    this.logger.log('Scaling agent destroyed, state cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async scaleUp(params: {
    service: string;
    resource?: string;
    amount: number;
    reason?: string;
  }): Promise<{
    service: string;
    resource: string;
    previousValue: number;
    newValue: number;
    amount: number;
    success: boolean;
    reason?: string;
  }> {
    const { service, resource = 'instances', amount, reason } = params;

    if (!service || typeof service !== 'string') {
      throw new Error('Service name is required');
    }
    if (amount < 1) {
      throw new Error('Scale-up amount must be at least 1');
    }

    const validResources = ['cpu', 'memory', 'instances', 'storage'];
    if (!validResources.includes(resource)) {
      throw new Error(`Invalid resource: ${resource}. Valid: ${validResources.join(', ')}`);
    }

    const resources = this.getOrCreateServiceResources(service);
    let previousValue: number = 0;
    let newValue: number = 0;

    switch (resource) {
      case 'cpu':
        previousValue = resources.cpuCores;
        newValue = previousValue + amount;
        resources.cpuCores = newValue;
        break;
      case 'memory':
        previousValue = resources.memoryMb;
        newValue = previousValue + amount * 1024;
        resources.memoryMb = newValue;
        break;
      case 'instances':
        previousValue = resources.instances;
        newValue = previousValue + amount;
        resources.instances = newValue;
        break;
      case 'storage':
        previousValue = resources.storageGb;
        newValue = previousValue + amount * 100;
        resources.storageGb = newValue;
        break;
    }

    this.logger.log(
      `Scaled up ${service}.${resource}: ${previousValue} → ${newValue}, reason: ${reason || 'N/A'}`,
    );

    return { service, resource, previousValue, newValue, amount, success: true, reason };
  }

  private async scaleDown(params: {
    service: string;
    resource?: string;
    amount: number;
    reason?: string;
    force?: boolean;
  }): Promise<{
    service: string;
    resource: string;
    previousValue: number;
    newValue: number;
    amount: number;
    success: boolean;
    reason?: string;
    warning?: string;
  }> {
    const { service, resource = 'instances', amount, reason, force = false } = params;

    if (!service || typeof service !== 'string') {
      throw new Error('Service name is required');
    }
    if (amount < 1) {
      throw new Error('Scale-down amount must be at least 1');
    }

    const validResources = ['cpu', 'memory', 'instances', 'storage'];
    if (!validResources.includes(resource)) {
      throw new Error(`Invalid resource: ${resource}. Valid: ${validResources.join(', ')}`);
    }

    const resources = this.getOrCreateServiceResources(service);
    let previousValue: number = 0;
    let newValue: number = 0;
    let warning: string | undefined;

    switch (resource) {
      case 'cpu':
        previousValue = resources.cpuCores;
        newValue = Math.max(1, previousValue - amount);
        if (newValue < 2 && !force) {
          warning = `Scaling down to ${newValue} CPU cores may impact performance. Use force: true to proceed.`;
        }
        resources.cpuCores = newValue;
        break;
      case 'memory':
        previousValue = resources.memoryMb;
        newValue = Math.max(1024, previousValue - amount * 1024);
        resources.memoryMb = newValue;
        break;
      case 'instances':
        previousValue = resources.instances;
        newValue = Math.max(1, previousValue - amount);
        if (newValue < 2 && !force) {
          warning = `Scaling down to ${newValue} instance(s) removes redundancy. Use force: true to proceed.`;
        }
        resources.instances = newValue;
        break;
      case 'storage':
        previousValue = resources.storageGb;
        newValue = Math.max(50, previousValue - amount * 100);
        resources.storageGb = newValue;
        break;
    }

    if (warning && !force) {
      // Revert the change
      switch (resource) {
        case 'cpu':
          resources.cpuCores = previousValue;
          break;
        case 'memory':
          resources.memoryMb = previousValue;
          break;
        case 'instances':
          resources.instances = previousValue;
          break;
        case 'storage':
          resources.storageGb = previousValue;
          break;
      }
      newValue = previousValue;
    }

    this.logger.log(
      `Scaled down ${service}.${resource}: ${previousValue} → ${newValue}, reason: ${reason || 'N/A'}`,
    );

    return { service, resource, previousValue, newValue, amount, success: true, reason, warning };
  }

  private async setAutoScaling(params: {
    service: string;
    resource?: string;
    minSize: number;
    maxSize: number;
    targetCpuPercent?: number;
    targetMemoryPercent?: number;
    scaleUpCooldown?: number;
    scaleDownCooldown?: number;
  }): Promise<{
    policyId: string;
    service: string;
    resource: string;
    minSize: number;
    maxSize: number;
    enabled: boolean;
    created: boolean;
  }> {
    const {
      service,
      resource = 'instances',
      minSize,
      maxSize,
      targetCpuPercent,
      targetMemoryPercent,
      scaleUpCooldown = 300,
      scaleDownCooldown = 600,
    } = params;

    if (!service || typeof service !== 'string') {
      throw new Error('Service name is required');
    }
    if (minSize < 1) {
      throw new Error('Minimum size must be at least 1');
    }
    if (maxSize < minSize) {
      throw new Error('Maximum size must be greater than or equal to minimum size');
    }
    if (maxSize > 1000) {
      throw new Error('Maximum size cannot exceed 1000');
    }
    if (targetCpuPercent !== undefined && (targetCpuPercent < 1 || targetCpuPercent > 99)) {
      throw new Error('Target CPU percent must be between 1 and 99');
    }

    this.policyCounter++;
    const policyId = `autoscale-${this.policyCounter}-${Date.now()}`;

    this.autoScalingPolicies.set(policyId, {
      id: policyId,
      service,
      resource,
      minSize,
      maxSize,
      targetCpuPercent,
      targetMemoryPercent,
      scaleUpCooldown,
      scaleDownCooldown,
      enabled: true,
      createdAt: new Date(),
    });

    this.logger.log(
      `Set auto-scaling for ${service}.${resource}: min=${minSize}, max=${maxSize}, targetCPU=${targetCpuPercent || 'N/A'}%`,
    );

    return {
      policyId,
      service,
      resource,
      minSize,
      maxSize,
      enabled: true,
      created: true,
    };
  }

  private async analyzeCapacity(params: {
    service: string;
    timeRange?: string;
    includeRecommendations?: boolean;
  }): Promise<{
    service: string;
    timeRange: string;
    currentCapacity: ServiceResources;
    utilization: {
      cpuPercent: number;
      memoryPercent: number;
      storagePercent: number;
      instanceLoad: number;
    };
    peakUsage: {
      cpuPercent: number;
      memoryPercent: number;
      timestamp: string;
    };
    recommendations: string[];
    analyzedAt: string;
  }> {
    const { service, timeRange = '24h', includeRecommendations = true } = params;

    if (!service || typeof service !== 'string') {
      throw new Error('Service name is required');
    }

    const resources = this.getOrCreateServiceResources(service);

    const cpuPercent = Math.round((20 + Math.random() * 70) * 100) / 100;
    const memoryPercent = Math.round((30 + Math.random() * 60) * 100) / 100;
    const storagePercent = Math.round((10 + Math.random() * 70) * 100) / 100;
    const instanceLoad = Math.round((cpuPercent / 100) * resources.instances * 100) / 100;

    const peakCpu = Math.min(99, cpuPercent + Math.random() * 20);
    const peakMemory = Math.min(99, memoryPercent + Math.random() * 15);

    const recommendations: string[] = [];
    if (includeRecommendations) {
      if (cpuPercent > 75) {
        recommendations.push(
          `CPU utilization is high (${cpuPercent}%). Consider scaling up CPU or adding instances.`,
        );
      }
      if (memoryPercent > 80) {
        recommendations.push(
          `Memory utilization is high (${memoryPercent}%). Consider increasing memory allocation.`,
        );
      }
      if (storagePercent > 70) {
        recommendations.push(
          `Storage utilization is ${storagePercent}%. Plan for storage expansion within 30 days.`,
        );
      }
      if (instanceLoad < 0.5 && resources.instances > 2) {
        recommendations.push(
          `Instance load is low (${instanceLoad}). Consider scaling down to save costs.`,
        );
      }
      if (recommendations.length === 0) {
        recommendations.push(
          'Resource utilization is within healthy ranges. No immediate action required.',
        );
      }
    }

    this.logger.log(
      `analyzeCapacity: ${service}, CPU=${cpuPercent}%, Mem=${memoryPercent}%, Storage=${storagePercent}%`,
    );

    return {
      service,
      timeRange,
      currentCapacity: { ...resources },
      utilization: { cpuPercent, memoryPercent, storagePercent, instanceLoad },
      peakUsage: {
        cpuPercent: Math.round(peakCpu * 100) / 100,
        memoryPercent: Math.round(peakMemory * 100) / 100,
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      },
      recommendations,
      analyzedAt: new Date().toISOString(),
    };
  }

  private async optimizeResources(params: {
    service: string;
    strategy?: string;
    dryRun?: boolean;
  }): Promise<{
    service: string;
    strategy: string;
    dryRun: boolean;
    currentAllocation: ServiceResources;
    optimizedAllocation: ServiceResources;
    savingsEstimate: {
      cpuCoresSaved: number;
      memoryMbSaved: number;
      storageGbSaved: number;
      instancesReduced: number;
      monthlyCostSavings: number;
    };
    changes: string[];
    applied: boolean;
  }> {
    const { service, strategy = 'balanced', dryRun = true } = params;

    if (!service || typeof service !== 'string') {
      throw new Error('Service name is required');
    }

    const validStrategies = ['cost', 'performance', 'balanced'];
    if (!validStrategies.includes(strategy)) {
      throw new Error(`Invalid strategy: ${strategy}. Valid: ${validStrategies.join(', ')}`);
    }

    const current = this.getOrCreateServiceResources(service);
    const currentCopy = { ...current };

    // Calculate optimized allocation based on strategy
    const optimized: ServiceResources = { ...currentCopy, service };

    const changes: string[] = [];

    if (strategy === 'cost' || strategy === 'balanced') {
      // Right-size: reduce over-provisioned resources
      if (current.cpuCores > 4) {
        const reduction = Math.floor(current.cpuCores * 0.25);
        optimized.cpuCores = current.cpuCores - reduction;
        changes.push(
          `Reduced CPU from ${current.cpuCores} to ${optimized.cpuCores} cores (over-provisioned)`,
        );
      }
      if (current.memoryMb > 8192) {
        const reduction = Math.floor(current.memoryMb * 0.2);
        optimized.memoryMb = current.memoryMb - reduction;
        changes.push(
          `Reduced memory from ${current.memoryMb}MB to ${optimized.memoryMb}MB (over-provisioned)`,
        );
      }
    }

    if (strategy === 'performance') {
      if (current.instances < 5) {
        optimized.instances = current.instances + 2;
        changes.push(
          `Increased instances from ${current.instances} to ${optimized.instances} for better performance`,
        );
      }
      optimized.cpuCores = current.cpuCores + Math.max(2, Math.floor(current.cpuCores * 0.3));
      changes.push(
        `Increased CPU from ${current.cpuCores} to ${optimized.cpuCores} cores for headroom`,
      );
    }

    if (changes.length === 0) {
      changes.push('Current allocation is already optimal for the selected strategy.');
    }

    const savings = {
      cpuCoresSaved: current.cpuCores - optimized.cpuCores,
      memoryMbSaved: current.memoryMb - optimized.memoryMb,
      storageGbSaved: current.storageGb - optimized.storageGb,
      instancesReduced: current.instances - optimized.instances,
      monthlyCostSavings: 0,
    };

    // Estimate cost: $50/instance, $10/CPU core, $0.05/GB storage, $0.02/MB memory
    savings.monthlyCostSavings = Math.max(
      0,
      Math.round(
        savings.instancesReduced * 50 +
          savings.cpuCoresSaved * 10 +
          savings.storageGbSaved * 0.05 +
          savings.memoryMbSaved * 0.02,
      ),
    );

    // Apply if not dry run
    if (!dryRun) {
      this.serviceResources.set(service, optimized);
    }

    this.logger.log(
      `optimizeResources: ${service}, strategy=${strategy}, dryRun=${dryRun}, savings=$$${savings.monthlyCostSavings}/mo`,
    );

    return {
      service,
      strategy,
      dryRun,
      currentAllocation: currentCopy,
      optimizedAllocation: optimized,
      savingsEstimate: savings,
      changes,
      applied: !dryRun,
    };
  }

  private async planCapacity(params: {
    services: string[];
    growthRate?: number;
    planningHorizonDays?: number;
    includeCostEstimate?: boolean;
  }): Promise<{
    planId: string;
    services: string[];
    growthRate: number;
    planningHorizonDays: number;
    currentCapacity: Record<string, ServiceResources>;
    projectedCapacity: Record<string, ServiceResources>;
    milestones: Array<{
      date: string;
      description: string;
      estimatedCost: number;
    }>;
    totalEstimatedCost: number;
    createdAt: string;
  }> {
    const {
      services,
      growthRate = 10,
      planningHorizonDays = 90,
      includeCostEstimate = true,
    } = params;

    if (!services || !Array.isArray(services) || services.length === 0) {
      throw new Error('At least one service is required');
    }
    if (growthRate < 0 || growthRate > 100) {
      throw new Error('Growth rate must be between 0 and 100 percent');
    }
    if (planningHorizonDays < 7 || planningHorizonDays > 365) {
      throw new Error('Planning horizon must be between 7 and 365 days');
    }

    this.planCounter++;
    const planId = `capacity-plan-${this.planCounter}-${Date.now()}`;

    const currentCapacity: Record<string, ServiceResources> = {};
    const projectedCapacity: Record<string, ServiceResources> = {};

    for (const service of services) {
      const current = this.getOrCreateServiceResources(service);
      currentCapacity[service] = { ...current };

      const growthFactor = 1 + (growthRate / 100) * (planningHorizonDays / 30);
      projectedCapacity[service] = {
        service,
        instances: Math.ceil(current.instances * growthFactor),
        cpuCores: Math.ceil(current.cpuCores * growthFactor),
        memoryMb: Math.ceil(current.memoryMb * growthFactor),
        storageGb: Math.ceil(current.storageGb * growthFactor * 1.2), // Storage grows faster
      };
    }

    // Generate milestones
    const milestoneCount = Math.min(Math.ceil(planningHorizonDays / 30), 6);
    const milestones: Array<{ date: string; description: string; estimatedCost: number }> = [];

    for (let i = 1; i <= milestoneCount; i++) {
      const milestoneDate = new Date(Date.now() + i * 30 * 86400000);
      const periodGrowth = 1 + (growthRate / 100) * i;
      const estimatedCost = Math.round(services.length * periodGrowth * (50 + 20 * periodGrowth));

      milestones.push({
        date: milestoneDate.toISOString().split('T')[0],
        description: `Month ${i}: Scale to accommodate ${Math.round(periodGrowth * 100 - 100)}% growth`,
        estimatedCost,
      });
    }

    const totalEstimatedCost = includeCostEstimate
      ? milestones.reduce((sum, m) => sum + m.estimatedCost, 0)
      : 0;

    this.logger.log(
      `planCapacity: ${services.length} services, ${growthRate}% growth, ${planningHorizonDays} days, total cost: $${totalEstimatedCost}`,
    );

    return {
      planId,
      services,
      growthRate,
      planningHorizonDays,
      currentCapacity,
      projectedCapacity,
      milestones,
      totalEstimatedCost,
      createdAt: new Date().toISOString(),
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private getOrCreateServiceResources(service: string): ServiceResources {
    if (!this.serviceResources.has(service)) {
      this.serviceResources.set(service, {
        service,
        instances: 3 + Math.floor(Math.random() * 5),
        cpuCores: 2 + Math.floor(Math.random() * 8),
        memoryMb: 2048 + Math.floor(Math.random() * 8192),
        storageGb: 100 + Math.floor(Math.random() * 500),
      });
    }
    return this.serviceResources.get(service)!;
  }

  private seedInitialResources(): void {
    const services = [
      'api-gateway',
      'auth-service',
      'user-service',
      'payment-service',
      'notification-service',
      'search-service',
      'worker-service',
    ];

    for (const service of services) {
      this.serviceResources.set(service, {
        service,
        instances: 2 + Math.floor(Math.random() * 6),
        cpuCores: 2 + Math.floor(Math.random() * 8),
        memoryMb: 4096 + Math.floor(Math.random() * 8192),
        storageGb: 100 + Math.floor(Math.random() * 500),
      });
    }
  }
}
