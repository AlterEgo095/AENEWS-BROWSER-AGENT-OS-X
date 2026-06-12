/**
 * AENEWS Agent OS X - Meta Adaptation Agent
 * System adaptation and configuration optimization for the Meta Intelligence cluster.
 * Handles configuration adaptation, parameter optimization, change response,
 * need prediction, auto-tuning, and adaptation reporting.
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

export const META_ADAPTATION_AGENT_CONFIG: AgentConfig = {
  id: 'meta-adaptation',
  name: 'MetaAdaptation',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '1.0.0',
  description:
    'Adaptation agent that adapts configurations, optimizes parameters, responds to changes, predicts needs, auto-tunes systems, and generates adaptation reports across the Meta Intelligence cluster.',
  capabilities: [
    {
      name: 'adaptConfiguration',
      description: 'Adapt system configuration based on current conditions',
      inputSchema: { type: 'object', properties: { currentConfig: { type: 'object' }, conditions: { type: 'object' }, adaptLevel: { type: 'string' } }, required: ['currentConfig', 'conditions'] },
      outputSchema: { type: 'object', properties: { adaptedConfig: { type: 'object' }, changes: { type: 'array', items: { type: 'object' } }, adaptationId: { type: 'string' } } },
    },
    {
      name: 'optimizeParameters',
      description: 'Optimize system parameters for better performance',
      inputSchema: { type: 'object', properties: { parameters: { type: 'object' }, objective: { type: 'string' }, constraints: { type: 'object' } }, required: ['parameters', 'objective'] },
      outputSchema: { type: 'object', properties: { optimizedParameters: { type: 'object' }, improvement: { type: 'number' }, optimizationId: { type: 'string' } } },
    },
    {
      name: 'respondToChange',
      description: 'Respond to changes in the system environment',
      inputSchema: { type: 'object', properties: { change: { type: 'object' }, currentState: { type: 'object' }, urgency: { type: 'string' } }, required: ['change'] },
      outputSchema: { type: 'object', properties: { response: { type: 'object' }, actions: { type: 'array', items: { type: 'string' } }, responseId: { type: 'string' } } },
    },
    {
      name: 'predictNeeds',
      description: 'Predict future system needs based on trends',
      inputSchema: { type: 'object', properties: { timeHorizon: { type: 'string' }, currentMetrics: { type: 'object' }, trends: { type: 'array', items: { type: 'object' } } }, required: [] },
      outputSchema: { type: 'object', properties: { predictions: { type: 'array', items: { type: 'object' } }, confidence: { type: 'number' }, predictionId: { type: 'string' } } },
    },
    {
      name: 'autoTune',
      description: 'Automatically tune system parameters',
      inputSchema: { type: 'object', properties: { target: { type: 'string' }, metric: { type: 'string' }, range: { type: 'object' } }, required: ['target', 'metric'] },
      outputSchema: { type: 'object', properties: { tunedValue: { type: 'number' }, previousValue: { type: 'number' }, improvement: { type: 'number' }, tuneId: { type: 'string' } } },
    },
    {
      name: 'generateAdaptationReport',
      description: 'Generate a report on recent adaptations',
      inputSchema: { type: 'object', properties: { timeRange: { type: 'string' }, includeDetails: { type: 'boolean' } }, required: [] },
      outputSchema: { type: 'object', properties: { report: { type: 'object' }, adaptations: { type: 'number' }, impact: { type: 'string' }, reportId: { type: 'string' } } },
    },
  ],
  permissions: ['execute:task', 'read:config', 'write:config', 'read:metrics', 'write:adaptation'],
  maxConcurrentTasks: 3,
  timeout: 60000,
  retryPolicy: { maxRetries: 2, backoffMs: 2000, exponentialBackoff: true },
};

// ─── Internal Types ───────────────────────────────────────────────

interface AdaptationRecord {
  id: string;
  type: string;
  timestamp: Date;
  changes: Array<{ parameter: string; oldValue: any; newValue: any }>;
  impact: string;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class AdaptationAgentService extends BaseAgentService {
  private adaptationHistory: AdaptationRecord[] = [];
  private currentParameters: Map<string, number> = new Map();

  protected defineConfig(): AgentConfig {
    return META_ADAPTATION_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({ name: 'adaptConfiguration', description: 'Adapt system configuration', execute: async (params: { currentConfig: Record<string, any>; conditions: Record<string, any>; adaptLevel?: string }) => this.adaptConfiguration(params) });
    this.registerTool({ name: 'optimizeParameters', description: 'Optimize system parameters', execute: async (params: { parameters: Record<string, number>; objective: string; constraints?: Record<string, any> }) => this.optimizeParameters(params) });
    this.registerTool({ name: 'respondToChange', description: 'Respond to changes in environment', execute: async (params: { change: Record<string, any>; currentState?: Record<string, any>; urgency?: string }) => this.respondToChange(params) });
    this.registerTool({ name: 'predictNeeds', description: 'Predict future system needs', execute: async (params: { timeHorizon?: string; currentMetrics?: Record<string, number>; trends?: Array<Record<string, any>> }) => this.predictNeeds(params) });
    this.registerTool({ name: 'autoTune', description: 'Auto-tune system parameters', execute: async (params: { target: string; metric: string; range?: Record<string, number> }) => this.autoTune(params) });
    this.registerTool({ name: 'generateAdaptationReport', description: 'Generate adaptation report', execute: async (params: { timeRange?: string; includeDetails?: boolean }) => this.generateAdaptationReport(params) });

    this.seedParameters();
    await this.storeInWorkingMemory('adaptation:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('MetaAdaptation agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { action, ...params } = input.payload;
    if (!action) return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
    const supportedActions = ['adaptConfiguration', 'optimizeParameters', 'respondToChange', 'predictNeeds', 'autoTune', 'generateAdaptationReport'];
    if (!supportedActions.includes(action)) return this.createAgentOutput(input.taskId, false, null, `Unknown adaptation action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
    try {
      const tool = this.getTool(action);
      if (!tool) return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
      const result = await tool.execute(params);
      await this.storeInWorkingMemory(`adaptation:last:${action}`, { params, result, timestamp: new Date() }, 300000);
      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`MetaAdaptation execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.adaptationHistory = [];
    this.currentParameters.clear();
    this.logger.log('MetaAdaptation agent destroyed, history and parameters cleared');
  }

  private async adaptConfiguration(params: { currentConfig: Record<string, any>; conditions: Record<string, any>; adaptLevel?: string }): Promise<{ adaptedConfig: Record<string, any>; changes: Array<{ parameter: string; oldValue: any; newValue: any; reason: string }>; adaptationId: string }> {
    const { currentConfig, conditions, adaptLevel = 'moderate' } = params;
    if (!currentConfig || typeof currentConfig !== 'object') throw new Error('Valid currentConfig object is required');
    if (!conditions || typeof conditions !== 'object') throw new Error('Valid conditions object is required');
    const adaptationId = this.generateId();
    const adaptedConfig = JSON.parse(JSON.stringify(currentConfig));
    const changes: Array<{ parameter: string; oldValue: any; newValue: any; reason: string }> = [];

    const adaptFactor = adaptLevel === 'aggressive' ? 0.5 : adaptLevel === 'conservative' ? 0.15 : 0.3;

    if (conditions.highLoad) {
      if (adaptedConfig.maxConcurrentTasks) {
        const old = adaptedConfig.maxConcurrentTasks;
        adaptedConfig.maxConcurrentTasks = Math.max(1, Math.round(old * (1 - adaptFactor)));
        changes.push({ parameter: 'maxConcurrentTasks', oldValue: old, newValue: adaptedConfig.maxConcurrentTasks, reason: 'Reduced concurrency under high load' });
      }
      if (adaptedConfig.timeout) {
        const old = adaptedConfig.timeout;
        adaptedConfig.timeout = Math.round(old * (1 + adaptFactor * 0.5));
        changes.push({ parameter: 'timeout', oldValue: old, newValue: adaptedConfig.timeout, reason: 'Increased timeout under high load' });
      }
    }

    if (conditions.lowLatencyRequired) {
      if (adaptedConfig.retryPolicy?.maxRetries) {
        const old = adaptedConfig.retryPolicy.maxRetries;
        adaptedConfig.retryPolicy.maxRetries = Math.max(0, old - 1);
        changes.push({ parameter: 'retryPolicy.maxRetries', oldValue: old, newValue: adaptedConfig.retryPolicy.maxRetries, reason: 'Reduced retries for low-latency requirement' });
      }
    }

    if (conditions.errorRateHigh) {
      if (adaptedConfig.retryPolicy?.backoffMs) {
        const old = adaptedConfig.retryPolicy.backoffMs;
        adaptedConfig.retryPolicy.backoffMs = Math.round(old * 1.5);
        changes.push({ parameter: 'retryPolicy.backoffMs', oldValue: old, newValue: adaptedConfig.retryPolicy.backoffMs, reason: 'Increased backoff due to high error rate' });
      }
    }

    adaptedConfig._adaptedAt = new Date().toISOString();
    adaptedConfig._adaptationLevel = adaptLevel;

    const record: AdaptationRecord = { id: adaptationId, type: 'configuration', timestamp: new Date(), changes: changes.map((c) => ({ parameter: c.parameter, oldValue: c.oldValue, newValue: c.newValue })), impact: changes.length > 3 ? 'high' : changes.length > 1 ? 'medium' : 'low' };
    this.adaptationHistory.push(record);

    this.logger.log(`Configuration adapted: id=${adaptationId}, changes=${changes.length}, level=${adaptLevel}`);
    return { adaptedConfig, changes, adaptationId };
  }

  private async optimizeParameters(params: { parameters: Record<string, number>; objective: string; constraints?: Record<string, any> }): Promise<{ optimizedParameters: Record<string, number>; improvement: number; optimizationId: string }> {
    const { parameters, objective, constraints = {} } = params;
    if (!parameters || typeof parameters !== 'object') throw new Error('Valid parameters object is required');
    if (!objective || typeof objective !== 'string') throw new Error('Valid objective string is required');
    const optimizationId = this.generateId();
    const optimizedParameters: Record<string, number> = {};

    for (const [key, value] of Object.entries(parameters)) {
      const min = constraints[`${key}Min`] ?? value * 0.5;
      const max = constraints[`${key}Max`] ?? value * 2;

      let optimized: number;
      switch (objective) {
        case 'speed':
          optimized = Math.max(min, value * 0.8);
          break;
        case 'reliability':
          optimized = Math.min(max, value * 1.3);
          break;
        case 'efficiency':
          optimized = value * 0.9 + (min + max) / 2 * 0.1;
          break;
        case 'throughput':
          optimized = Math.min(max, value * 1.2);
          break;
        default:
          optimized = value;
      }

      optimizedParameters[key] = Math.round(Math.max(min, Math.min(max, optimized)) * 100) / 100;
      this.currentParameters.set(key, optimizedParameters[key]);
    }

    const originalSum = Object.values(parameters).reduce((s, v) => s + Math.abs(v), 0);
    const optimizedSum = Object.values(optimizedParameters).reduce((s, v) => s + Math.abs(v), 0);
    const improvement = originalSum > 0 ? Math.round(Math.abs(optimizedSum - originalSum) / originalSum * 100) : 0;

    this.logger.log(`Parameters optimized: objective=${objective}, improvement=${improvement}%, params=${Object.keys(parameters).length}`);
    return { optimizedParameters, improvement, optimizationId };
  }

  private async respondToChange(params: { change: Record<string, any>; currentState?: Record<string, any>; urgency?: string }): Promise<{ response: Record<string, any>; actions: string[]; responseId: string }> {
    const { change, currentState = {}, urgency = 'normal' } = params;
    if (!change || typeof change !== 'object') throw new Error('Valid change object is required');
    const responseId = this.generateId();
    const actions: string[] = [];
    const response: Record<string, any> = { changeType: change.type || 'unknown', timestamp: new Date().toISOString() };

    if (change.type === 'load-increase') {
      actions.push('Scale up agent capacity');
      actions.push('Enable task queue overflow handling');
      response.scalingAction = 'up';
    } else if (change.type === 'load-decrease') {
      actions.push('Scale down idle agents');
      actions.push('Reduce resource allocation');
      response.scalingAction = 'down';
    } else if (change.type === 'error-spike') {
      actions.push('Enable circuit breaker for affected agents');
      actions.push('Increase retry backoff intervals');
      actions.push('Alert monitoring system');
      response.circuitBreaker = 'enabled';
    } else if (change.type === 'new-agent') {
      actions.push('Register agent in routing table');
      actions.push('Update load balancer configuration');
      actions.push('Run capability assessment');
      response.registrationStatus = 'pending';
    } else {
      actions.push('Monitor change for impact assessment');
      actions.push('Log change for future analysis');
    }

    if (urgency === 'critical') {
      actions.unshift('Immediately apply protective measures');
      response.emergencyMode = true;
    }

    const record: AdaptationRecord = { id: responseId, type: 'change-response', timestamp: new Date(), changes: actions.map((a) => ({ parameter: 'action', oldValue: null, newValue: a })), impact: urgency === 'critical' ? 'high' : 'medium' };
    this.adaptationHistory.push(record);

    this.logger.log(`Change responded: type=${change.type}, urgency=${urgency}, actions=${actions.length}`);
    return { response, actions, responseId };
  }

  private async predictNeeds(params: { timeHorizon?: string; currentMetrics?: Record<string, number>; trends?: Array<Record<string, any>> }): Promise<{ predictions: Array<{ area: string; predictedNeed: string; confidence: number; timeFrame: string }>; confidence: number; predictionId: string }> {
    const { timeHorizon = '1h', currentMetrics = {}, trends = [] } = params;
    const predictionId = this.generateId();
    const predictions: Array<{ area: string; predictedNeed: string; confidence: number; timeFrame: string }> = [];

    const loadFactor = currentMetrics.load ?? 0.5;
    if (loadFactor > 0.7) {
      predictions.push({ area: 'capacity', predictedNeed: 'Additional agent capacity required', confidence: 0.75 + Math.random() * 0.15, timeFrame: timeHorizon });
    }
    if (loadFactor < 0.3) {
      predictions.push({ area: 'efficiency', predictedNeed: 'Consider reducing idle agent count', confidence: 0.6 + Math.random() * 0.2, timeFrame: timeHorizon });
    }
    predictions.push({ area: 'memory', predictedNeed: 'Memory consolidation may be needed', confidence: 0.5 + Math.random() * 0.2, timeFrame: timeHorizon });

    if (trends.some((t) => t.direction === 'increasing' && t.metric === 'errors')) {
      predictions.push({ area: 'reliability', predictedNeed: 'Proactive error handling capacity increase', confidence: 0.7 + Math.random() * 0.15, timeFrame: timeHorizon });
    }

    const avgConfidence = predictions.length > 0 ? predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length : 0.5;
    this.logger.log(`Needs predicted: count=${predictions.length}, horizon=${timeHorizon}, avgConfidence=${avgConfidence.toFixed(2)}`);
    return { predictions, confidence: Math.round(avgConfidence * 100) / 100, predictionId };
  }

  private async autoTune(params: { target: string; metric: string; range?: Record<string, number> }): Promise<{ tunedValue: number; previousValue: number; improvement: number; tuneId: string }> {
    const { target, metric, range = {} } = params;
    if (!target || typeof target !== 'string') throw new Error('Valid target string is required');
    if (!metric || typeof metric !== 'string') throw new Error('Valid metric string is required');
    const tuneId = this.generateId();
    const previousValue = this.currentParameters.get(target) ?? 50;
    const min = range.min ?? previousValue * 0.5;
    const max = range.max ?? previousValue * 2;

    // Simulated auto-tuning using gradient-free optimization
    let tunedValue = previousValue;
    switch (metric) {
      case 'latency':
        tunedValue = Math.max(min, previousValue * 0.85);
        break;
      case 'throughput':
        tunedValue = Math.min(max, previousValue * 1.15);
        break;
      case 'reliability':
        tunedValue = Math.min(max, previousValue * 1.1);
        break;
      case 'efficiency':
        tunedValue = (min + max) / 2;
        break;
      default:
        tunedValue = previousValue * (0.95 + Math.random() * 0.1);
    }

    tunedValue = Math.round(Math.max(min, Math.min(max, tunedValue)) * 100) / 100;
    this.currentParameters.set(target, tunedValue);

    const improvement = previousValue !== 0 ? Math.round(Math.abs(tunedValue - previousValue) / Math.abs(previousValue) * 100) : 0;

    const record: AdaptationRecord = { id: tuneId, type: 'auto-tune', timestamp: new Date(), changes: [{ parameter: target, oldValue: previousValue, newValue: tunedValue }], impact: improvement > 10 ? 'high' : improvement > 5 ? 'medium' : 'low' };
    this.adaptationHistory.push(record);

    this.logger.log(`Auto-tuned: target=${target}, ${previousValue} → ${tunedValue}, improvement=${improvement}%`);
    return { tunedValue, previousValue, improvement, tuneId };
  }

  private async generateAdaptationReport(params: { timeRange?: string; includeDetails?: boolean }): Promise<{ report: Record<string, any>; adaptations: number; impact: string; reportId: string }> {
    const { timeRange = '24h', includeDetails = false } = params;
    const reportId = this.generateId();
    const timeRangeMs = timeRange === '1h' ? 3600000 : timeRange === '24h' ? 86400000 : timeRange === '7d' ? 604800000 : 86400000;
    const cutoff = new Date(Date.now() - timeRangeMs);
    const recent = this.adaptationHistory.filter((r) => r.timestamp >= cutoff);
    const adaptations = recent.length;

    const byType: Record<string, number> = {};
    for (const record of recent) {
      byType[record.type] = (byType[record.type] || 0) + 1;
    }

    const highImpact = recent.filter((r) => r.impact === 'high').length;
    const impact = highImpact > 5 ? 'significant' : highImpact > 2 ? 'moderate' : 'minimal';

    const report: Record<string, any> = {
      timeRange,
      totalAdaptations: adaptations,
      byType,
      impact,
      generatedAt: new Date().toISOString(),
    };

    if (includeDetails) {
      report.details = recent.map((r) => ({
        id: r.id,
        type: r.type,
        timestamp: r.timestamp.toISOString(),
        changesCount: r.changes.length,
        impact: r.impact,
      }));
    }

    this.logger.log(`Adaptation report generated: adaptations=${adaptations}, impact=${impact}, range=${timeRange}`);
    return { report, adaptations, impact, reportId };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private seedParameters(): void {
    this.currentParameters.set('maxConcurrentTasks', 5);
    this.currentParameters.set('timeout', 60000);
    this.currentParameters.set('retryBackoffMs', 2000);
    this.currentParameters.set('circuitBreakerThreshold', 5);
    this.currentParameters.set('healthCheckIntervalMs', 30000);
  }
}
