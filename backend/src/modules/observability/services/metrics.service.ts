/**
 * AENEWS Agent OS X — Metrics Service
 *
 * Comprehensive Prometheus metrics collection for agents, pipelines,
 * LLM providers, and system-level telemetry.
 *
 * Uses prom-client directly for full control over metric registration,
 * labels, and output formats.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as promClient from 'prom-client';

// ─── Metric Names ───────────────────────────────────────────────

const METRIC_PREFIX = 'aenews_';

// Agent Metrics
const AGENT_EXECUTIONS_TOTAL = `${METRIC_PREFIX}agent_executions_total`;
const AGENT_EXECUTION_DURATION = `${METRIC_PREFIX}agent_execution_duration_seconds`;
const AGENT_ACTIVE_COUNT = `${METRIC_PREFIX}agent_active_count`;
const AGENT_HEALTH_SCORE = `${METRIC_PREFIX}agent_health_score`;

// Pipeline Metrics
const PIPELINE_STEPS_TOTAL = `${METRIC_PREFIX}pipeline_steps_total`;
const PIPELINE_STEP_DURATION = `${METRIC_PREFIX}pipeline_step_duration_seconds`;
const PIPELINE_MISSIONS_TOTAL = `${METRIC_PREFIX}pipeline_missions_total`;
const PIPELINE_ACTIVE_MISSIONS = `${METRIC_PREFIX}pipeline_active_missions`;

// LLM Metrics
const LLM_REQUESTS_TOTAL = `${METRIC_PREFIX}llm_requests_total`;
const LLM_REQUEST_DURATION = `${METRIC_PREFIX}llm_request_duration_seconds`;
const LLM_TOKENS_TOTAL = `${METRIC_PREFIX}llm_tokens_total`;
const LLM_FALLBACK_TOTAL = `${METRIC_PREFIX}llm_fallback_total`;

// System Metrics
const SYSTEM_CONNECTED_CLIENTS = `${METRIC_PREFIX}system_connected_clients`;
const SYSTEM_EVENT_BUS_EVENTS_TOTAL = `${METRIC_PREFIX}system_event_bus_events_total`;

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly registry: promClient.Registry;
  private readonly metricsEnabled: boolean;

  // ─── Counters ────────────────────────────────────────────────
  private readonly agentExecutionsTotal: promClient.Counter;
  private readonly pipelineStepsTotal: promClient.Counter;
  private readonly pipelineMissionsTotal: promClient.Counter;
  private readonly llmRequestsTotal: promClient.Counter;
  private readonly llmTokensTotal: promClient.Counter;
  private readonly llmFallbackTotal: promClient.Counter;
  private readonly systemEventBusEventsTotal: promClient.Counter;

  // ─── Histograms ──────────────────────────────────────────────
  private readonly agentExecutionDuration: promClient.Histogram;
  private readonly pipelineStepDuration: promClient.Histogram;
  private readonly llmRequestDuration: promClient.Histogram;

  // ─── Gauges ──────────────────────────────────────────────────
  private readonly agentActiveCount: promClient.Gauge;
  private readonly agentHealthScore: promClient.Gauge;
  private readonly pipelineActiveMissions: promClient.Gauge;
  private readonly systemConnectedClients: promClient.Gauge;

  constructor(@Optional() private readonly configService?: ConfigService) {
    this.metricsEnabled =
      this.configService?.get<string>('METRICS_ENABLED') !== 'false';

    if (!this.metricsEnabled) {
      // Create a default registry even when disabled — avoids null checks everywhere
      this.registry = new promClient.Registry();
      this.logger.log('Metrics collection is DISABLED');
    } else {
      this.registry = new promClient.Registry();

      // Add default Node.js metrics (GC, memory, event loop lag, etc.)
      promClient.collectDefaultMetrics({ register: this.registry });

      // ─── Agent Metrics ─────────────────────────────────────────
      this.agentExecutionsTotal = new promClient.Counter({
        name: AGENT_EXECUTIONS_TOTAL,
        help: 'Total number of agent executions',
        labelNames: ['cluster', 'agent', 'status'],
        registers: [this.registry],
      });

      this.agentExecutionDuration = new promClient.Histogram({
        name: AGENT_EXECUTION_DURATION,
        help: 'Duration of agent executions in seconds',
        labelNames: ['cluster', 'agent'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
        registers: [this.registry],
      });

      this.agentActiveCount = new promClient.Gauge({
        name: AGENT_ACTIVE_COUNT,
        help: 'Number of currently active agents',
        labelNames: ['cluster', 'agent'],
        registers: [this.registry],
      });

      this.agentHealthScore = new promClient.Gauge({
        name: AGENT_HEALTH_SCORE,
        help: 'Health score of an agent (0=unhealthy, 1=degraded, 2=healthy)',
        labelNames: ['cluster', 'agent'],
        registers: [this.registry],
      });

      // ─── Pipeline Metrics ──────────────────────────────────────
      this.pipelineStepsTotal = new promClient.Counter({
        name: PIPELINE_STEPS_TOTAL,
        help: 'Total number of pipeline step executions',
        labelNames: ['step', 'status'],
        registers: [this.registry],
      });

      this.pipelineStepDuration = new promClient.Histogram({
        name: PIPELINE_STEP_DURATION,
        help: 'Duration of pipeline steps in seconds',
        labelNames: ['step'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
        registers: [this.registry],
      });

      this.pipelineMissionsTotal = new promClient.Counter({
        name: PIPELINE_MISSIONS_TOTAL,
        help: 'Total number of pipeline missions',
        labelNames: ['status'],
        registers: [this.registry],
      });

      this.pipelineActiveMissions = new promClient.Gauge({
        name: PIPELINE_ACTIVE_MISSIONS,
        help: 'Number of currently active pipeline missions',
        registers: [this.registry],
      });

      // ─── LLM Metrics ──────────────────────────────────────────
      this.llmRequestsTotal = new promClient.Counter({
        name: LLM_REQUESTS_TOTAL,
        help: 'Total number of LLM API requests',
        labelNames: ['provider', 'model', 'status'],
        registers: [this.registry],
      });

      this.llmRequestDuration = new promClient.Histogram({
        name: LLM_REQUEST_DURATION,
        help: 'Duration of LLM API requests in seconds',
        labelNames: ['provider', 'model'],
        buckets: [0.5, 1, 2, 5, 10, 20, 30, 60, 120],
        registers: [this.registry],
      });

      this.llmTokensTotal = new promClient.Counter({
        name: LLM_TOKENS_TOTAL,
        help: 'Total number of LLM tokens used',
        labelNames: ['provider', 'type'], // type: prompt | completion
        registers: [this.registry],
      });

      this.llmFallbackTotal = new promClient.Counter({
        name: LLM_FALLBACK_TOTAL,
        help: 'Total number of LLM provider fallbacks',
        labelNames: ['from_provider', 'to_provider'],
        registers: [this.registry],
      });

      // ─── System Metrics ────────────────────────────────────────
      this.systemConnectedClients = new promClient.Gauge({
        name: SYSTEM_CONNECTED_CLIENTS,
        help: 'Number of currently connected WebSocket clients',
        registers: [this.registry],
      });

      this.systemEventBusEventsTotal = new promClient.Counter({
        name: SYSTEM_EVENT_BUS_EVENTS_TOTAL,
        help: 'Total number of events processed by the event bus',
        labelNames: ['event_type'],
        registers: [this.registry],
      });

      this.logger.log('MetricsService initialized with Prometheus registry');
    }
  }

  // ─── Agent Recording Methods ─────────────────────────────────

  /**
   * Record an agent execution result.
   */
  recordAgentExecution(
    cluster: string,
    agent: string,
    durationMs: number,
    success: boolean,
  ): void {
    if (!this.metricsEnabled) return;

    const status = success ? 'success' : 'failure';
    this.agentExecutionsTotal.labels(cluster, agent, status).inc();
    this.agentExecutionDuration.labels(cluster, agent).observe(durationMs / 1000);
  }

  /**
   * Set the number of currently active agents.
   */
  setAgentActive(cluster: string, agent: string, count: number): void {
    if (!this.metricsEnabled) return;
    this.agentActiveCount.labels(cluster, agent).set(count);
  }

  /**
   * Set agent health score (0=unhealthy, 1=degraded, 2=healthy).
   */
  setAgentHealthScore(cluster: string, agent: string, score: number): void {
    if (!this.metricsEnabled) return;
    this.agentHealthScore.labels(cluster, agent).set(score);
  }

  // ─── Pipeline Recording Methods ──────────────────────────────

  /**
   * Record a pipeline step execution result.
   */
  recordPipelineStep(
    step: string,
    durationMs: number,
    success: boolean,
  ): void {
    if (!this.metricsEnabled) return;

    const status = success ? 'success' : 'failure';
    this.pipelineStepsTotal.labels(step, status).inc();
    this.pipelineStepDuration.labels(step).observe(durationMs / 1000);
  }

  /**
   * Record a pipeline mission completion.
   */
  recordPipelineMission(status: string): void {
    if (!this.metricsEnabled) return;
    this.pipelineMissionsTotal.labels(status).inc();
  }

  /**
   * Set the number of currently active pipeline missions.
   */
  setPipelineActiveMissions(count: number): void {
    if (!this.metricsEnabled) return;
    this.pipelineActiveMissions.set(count);
  }

  // ─── LLM Recording Methods ───────────────────────────────────

  /**
   * Record an LLM API request.
   */
  recordLLMRequest(
    provider: string,
    model: string,
    durationMs: number,
    tokens: { prompt: number; completion: number },
    success: boolean,
  ): void {
    if (!this.metricsEnabled) return;

    const status = success ? 'success' : 'failure';
    this.llmRequestsTotal.labels(provider, model, status).inc();
    this.llmRequestDuration.labels(provider, model).observe(durationMs / 1000);

    if (success) {
      this.llmTokensTotal.labels(provider, 'prompt').inc(tokens.prompt);
      this.llmTokensTotal.labels(provider, 'completion').inc(tokens.completion);
    }
  }

  /**
   * Record an LLM provider fallback event.
   */
  recordLLMFallback(fromProvider: string, toProvider: string): void {
    if (!this.metricsEnabled) return;
    this.llmFallbackTotal.labels(fromProvider, toProvider).inc();
  }

  // ─── System Recording Methods ────────────────────────────────

  /**
   * Set the number of currently connected WebSocket clients.
   */
  setConnectedClients(count: number): void {
    if (!this.metricsEnabled) return;
    this.systemConnectedClients.set(count);
  }

  /**
   * Record an event bus event.
   */
  recordEventBusEvent(eventType: string): void {
    if (!this.metricsEnabled) return;
    this.systemEventBusEventsTotal.labels(eventType).inc();
  }

  // ─── Output Methods ──────────────────────────────────────────

  /**
   * Returns Prometheus text format for the /metrics scrape endpoint.
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Returns the content type for Prometheus text format.
   */
  getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Returns all metrics in JSON format for dashboards.
   */
  async getMetricsJson(): Promise<Record<string, any>> {
    const metrics = await this.registry.getMetricsAsJSON();
    const result: Record<string, any> = {};

    for (const metric of metrics) {
      result[metric.name] = {
        help: metric.help,
        type: metric.type,
        values: metric.values.map((v) => ({
          labels: v.labels,
          value: v.value,
        })),
      };
    }

    return result;
  }

  /**
   * Get the underlying Prometheus registry (for advanced use).
   */
  getRegistry(): promClient.Registry {
    return this.registry;
  }
}
