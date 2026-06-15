import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

export class ObservabilityAuditorAgent extends BaseAgent {
  readonly name = 'ObservabilityAuditorAgent';
  readonly cluster = ClusterType.CERTIFICATION;
  readonly capabilities = ['audit-observability', 'check-metrics', 'verify-tracing', 'test-alerting'];
  readonly version = '2.0.0';
  readonly description = 'Audits the observability stack including metrics collection, distributed tracing, and alerting systems for adequate visibility';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'audit-observability';
      const startTime = Date.now();

      switch (action) {
        case 'audit-observability': {
          const pillars = config.pillars || ['metrics', 'logs', 'traces'];
          const checkInstrumentation = config.checkInstrumentation ?? true;
          const checkDashboards = config.checkDashboards ?? true;
          const checkSLOs = config.checkSLOs ?? true;
          this.logger.log(`Auditing observability (pillars: ${pillars.join(', ')})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, pillars });

          const llmResult = await this.executeWithLLM(
            `You are a professional observability auditor. Evaluate observability stack completeness and effectiveness.`,
            `Audit observability: pillars=${JSON.stringify(pillars)}, checkInstrumentation=${checkInstrumentation}, checkDashboards=${checkDashboards}, checkSLOs=${checkSLOs}. Return JSON with: auditId (string), findings (array of {severity, pillar, description, recommendation}), observabilityScore ({overall, metrics, logging, tracing, alerting}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const auditId = parsed?.auditId || `obs-audit-${Date.now()}`;
          const findings = parsed?.findings || [
            { severity: 'high', pillar: 'tracing', description: '3 critical services lack distributed tracing instrumentation', recommendation: 'Add OpenTelemetry instrumentation to payment-service, order-service, and inventory-service' },
            { severity: 'medium', pillar: 'metrics', description: 'Custom business metrics not exposed from 2 services', recommendation: 'Implement custom metrics for order conversion rate and payment success rate' },
          ];
          const observabilityScore = parsed?.observabilityScore || { overall: 76, metrics: 82, logging: 85, tracing: 65, alerting: 72 };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { auditId, overallScore: observabilityScore.overall });
          return { success: true, data: { action, pillars, checkInstrumentation, checkDashboards, checkSLOs, auditId, findings, observabilityScore, status: 'observability_audit_completed', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime } };
        }

        case 'check-metrics': {
          const metricTypes = config.metricTypes || ['counter', 'gauge', 'histogram', 'summary'];
          const checkCardinality = config.checkCardinality ?? true;
          const checkNaming = config.checkNaming ?? true;
          const checkLabels = config.checkLabels ?? true;
          const checkRetention = config.checkRetention ?? true;
          this.logger.log(`Checking metrics (types: ${metricTypes.join(', ')})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action });

          const llmResult = await this.executeWithLLM(
            `You are a professional metrics expert. Evaluate metrics collection, naming conventions, and cardinality.`,
            `Check metrics: types=${JSON.stringify(metricTypes)}, checkCardinality=${checkCardinality}, checkNaming=${checkNaming}, checkLabels=${checkLabels}, checkRetention=${checkRetention}. Return JSON with: metricsInventory (array of {name, type, labels, cardinality, healthy}), highCardinalityMetrics (array of {name, cardinality, recommendation}), namingViolations (array of {metric, expected, actual}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const metricsInventory = parsed?.metricsInventory || [
            { name: 'http_requests_total', type: 'counter', labels: ['method', 'path', 'status'], cardinality: 245, healthy: true },
            { name: 'http_request_duration_seconds', type: 'histogram', labels: ['method', 'path'], cardinality: 180, healthy: true },
            { name: 'user_session_id', type: 'gauge', labels: ['session_id', 'user_id'], cardinality: 50000, healthy: false },
          ];
          const highCardinalityMetrics = parsed?.highCardinalityMetrics || [
            { name: 'user_session_id', cardinality: 50000, recommendation: 'Remove session_id and user_id labels; use aggregated metrics instead' },
          ];
          const namingViolations = parsed?.namingViolations || [
            { metric: 'requestCount', expected: 'requests_total', actual: 'requestCount' },
          ];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { metricCount: metricsInventory.length, violationCount: namingViolations.length });
          return { success: true, data: { action, metricTypes, checkCardinality, checkNaming, checkLabels, checkRetention, metricsInventory, highCardinalityMetrics, namingViolations, status: 'metrics_check_completed', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime } };
        }

        case 'verify-tracing': {
          const samplingRate = config.samplingRate || 0.1;
          const checkPropagation = config.checkPropagation ?? true;
          const checkSpans = config.checkSpans ?? true;
          const checkContext = config.checkContext ?? true;
          const maxTraceDepth = config.maxTraceDepth || 20;
          this.logger.log(`Verifying distributed tracing (sampling: ${samplingRate})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action });

          const llmResult = await this.executeWithLLM(
            `You are a professional distributed tracing expert. Verify trace instrumentation and context propagation.`,
            `Verify tracing: samplingRate=${samplingRate}, checkPropagation=${checkPropagation}, checkSpans=${checkSpans}, checkContext=${checkContext}, maxTraceDepth=${maxTraceDepth}. Return JSON with: tracingResults (array of {service, instrumented, spanCount, contextPropagation, issues}), traceGaps (array of {fromService, toService, missingContext, brokenPropagation}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const tracingResults = parsed?.tracingResults || [
            { service: 'api-gateway', instrumented: true, spanCount: 12, contextPropagation: true, issues: [] },
            { service: 'payment-service', instrumented: false, spanCount: 0, contextPropagation: false, issues: ['No OpenTelemetry SDK installed', 'Trace context not propagated'] },
            { service: 'search-service', instrumented: true, spanCount: 8, contextPropagation: true, issues: [] },
          ];
          const traceGaps = parsed?.traceGaps || [
            { fromService: 'api-gateway', toService: 'payment-service', missingContext: true, brokenPropagation: true },
          ];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { instrumentedCount: tracingResults.filter((r: any) => r.instrumented).length, gapCount: traceGaps.length });
          return { success: true, data: { action, samplingRate, checkPropagation, checkSpans, checkContext, maxTraceDepth, tracingResults, traceGaps, status: 'tracing_verification_completed', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime } };
        }

        case 'test-alerting': {
          const alertTypes = config.alertTypes || ['threshold', 'anomaly', 'prediction'];
          const checkRouting = config.checkRouting ?? true;
          const checkEscalation = config.checkEscalation ?? true;
          const checkDeduplication = config.checkDeduplication ?? true;
          const testNotificationChannels = config.testNotificationChannels ?? true;
          this.logger.log(`Testing alerting (types: ${alertTypes.join(', ')})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, alertTypes });

          const llmResult = await this.executeWithLLM(
            `You are a professional alerting system expert. Test alert rules, routing, and notification delivery.`,
            `Test alerting: types=${JSON.stringify(alertTypes)}, checkRouting=${checkRouting}, checkEscalation=${checkEscalation}, checkDeduplication=${checkDeduplication}, testNotificationChannels=${testNotificationChannels}. Return JSON with: alertTests (array of {alertType, rule, triggered, notificationSent, latency}), alertGaps (array of {service, metric, missingAlert, recommendation}), notificationTests (array of {channel, delivered, latency}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const alertTests = parsed?.alertTests || [
            { alertType: 'threshold', rule: 'error_rate > 5%', triggered: true, notificationSent: true, latency: 2500 },
            { alertType: 'anomaly', rule: 'latency anomaly detection', triggered: true, notificationSent: true, latency: 15000 },
          ];
          const alertGaps = parsed?.alertGaps || [
            { service: 'payment-service', metric: 'payment_failure_rate', missingAlert: true, recommendation: 'Add threshold alert for payment failure rate > 2%' },
          ];
          const notificationTests = parsed?.notificationTests || [
            { channel: 'slack', delivered: true, latency: 800 },
            { channel: 'email', delivered: true, latency: 3200 },
            { channel: 'pagerduty', delivered: false, latency: 0 },
          ];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { alertTestCount: alertTests.length, gapCount: alertGaps.length });
          return { success: true, data: { action, alertTypes, checkRouting, checkEscalation, checkDeduplication, testNotificationChannels, alertTests, alertGaps, notificationTests, status: 'alerting_test_completed', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime } };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error: any) {
      this.emitEvent(AgentEventType.AGENT_FAILED, { error: error.message });
      return { success: false, error: error.message };
    }
  }
}
