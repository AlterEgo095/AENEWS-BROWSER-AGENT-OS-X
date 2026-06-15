import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * ObservabilityAgent — Elite observability agent for the INFRASTRUCTURE cluster.
 *
 * Provides comprehensive observability operations including distributed tracing
 * setup, log aggregation, metric collection, Grafana dashboard construction,
 * Prometheus rule generation, alert design, and SLI/SLO definition.
 * Uses LLM for generating context-aware observability configurations and
 * falls back to realistic monitoring profiles when LLM is unavailable.
 */
export class ObservabilityAgent extends BaseAgent {
  readonly name = 'ObservabilityAgent';
  readonly cluster = ClusterType.INFRASTRUCTURE;
  readonly capabilities = [
    'distributed-tracing',
    'log-aggregation',
    'metric-collection',
    'grafana-dashboards',
    'prometheus-rules',
    'alerting-design',
    'sli-slo-definition',
  ];
  readonly version = '3.0.0';
  readonly description =
    'Elite observability agent providing distributed tracing, log aggregation, metric collection, Grafana dashboards, Prometheus rules, alert design, and SLI/SLO definition for production infrastructure';

  readonly missionCategories = [MissionCategory.INFRASTRUCTURE_MGMT, MissionCategory.SECURITY_OPS];
  readonly creditCost = 5;
  readonly powerLevel = 3;
  readonly tier = 'elite';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'setup-tracing';
      const startTime = Date.now();

      this.emitEvent(AgentEventType.AGENT_STARTED, { action, agent: this.name });

      switch (action) {
        case 'setup-tracing': {
          const serviceName = config.serviceName;
          const tracingBackend = config.tracingBackend || 'jaeger';
          const samplingRate = config.samplingRate || 0.1;
          const propagationFormat = config.propagationFormat || 'w3c';
          const namespace = config.namespace || 'default';
          const instrumentations = config.instrumentations || ['http', 'grpc', 'database'];
          const retentionPeriod = config.retentionPeriod || '7d';
          const spanLimits = config.spanLimits || { maxAttributes: 128, maxEvents: 128, maxLinks: 128 };
          const exportProtocol = config.exportProtocol || 'otlp';
          const endpoint = config.endpoint || `http://${tracingBackend}-collector.${namespace}:4317`;
          const enableAutoInstrumentation = config.enableAutoInstrumentation ?? true;

          this.logger.log(
            `Setting up distributed tracing for ${serviceName || 'service'} (backend: ${tracingBackend}, sampling: ${samplingRate})`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'distributed-tracing',
            serviceName,
            tracingBackend,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite distributed tracing architect. Design a comprehensive tracing setup with proper instrumentation, sampling strategies, and performance considerations.`,
            `Design distributed tracing for: serviceName="${serviceName}", tracingBackend="${tracingBackend}", samplingRate=${samplingRate}, propagationFormat="${propagationFormat}", instrumentations=${JSON.stringify(instrumentations)}, retentionPeriod="${retentionPeriod}", spanLimits=${JSON.stringify(spanLimits)}, exportProtocol="${exportProtocol}". Return JSON with: collectorConfig (object - OpenTelemetry Collector config), instrumentationConfig (object), samplingConfig ({strategy, rules: [{name, samplingRate, spanMatch}]}), deploymentManifest (object - Kubernetes manifests for tracing infrastructure).`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const collectorConfig = parsed?.collectorConfig || {
            receivers: {
              otlp: { protocols: { grpc: { endpoint: '0.0.0.0:4317' }, http: { endpoint: '0.0.0.0:4318' } } },
            },
            processors: {
              batch: { send_batch_size: 1024, timeout: '5s' },
              memory_limiter: { check_interval: '1s', limit_mib: 512 },
              attributes: { actions: [{ key: 'service.environment', value: 'production', action: 'upsert' }] },
            },
            exporters: {
              jaeger: { endpoint: `${tracingBackend}-agent.${namespace}:14250`, tls: { insecure: false } },
              prometheus: { endpoint: '0.0.0.0:8889' },
            },
            service: {
              pipelines: {
                traces: { receivers: ['otlp'], processors: ['memory_limiter', 'batch', 'attributes'], exporters: ['jaeger'] },
                metrics: { receivers: ['otlp'], processors: ['memory_limiter', 'batch'], exporters: ['prometheus'] },
              },
            },
          };
          const instrumentationConfig = parsed?.instrumentationConfig || {
            serviceName: serviceName || 'app',
            exportProtocol,
            endpoint,
            samplingRate,
            propagation: [propagationFormat],
            instrumentations: instrumentations.reduce((acc: any, inst: string) => {
              acc[inst] = { enabled: true };
              return acc;
            }, {}),
          };
          const samplingConfig = parsed?.samplingConfig || {
            strategy: 'probabilistic',
            rules: [
              { name: 'errors', samplingRate: 1.0, spanMatch: { status: 'ERROR' } },
              { name: 'slow-requests', samplingRate: 1.0, spanMatch: { duration: '>2s' } },
              { name: 'default', samplingRate, spanMatch: {} },
            ],
          };
          const deploymentManifest = parsed?.deploymentManifest || {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: { name: `otel-collector-${serviceName || 'app'}`, namespace },
            spec: { replicas: 2, selector: { matchLabels: { app: 'otel-collector' } } },
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            serviceName: serviceName || 'unknown',
            tracingBackend,
            samplingRate,
          });

          return {
            success: true,
            data: {
              action,
              serviceName: serviceName || null,
              tracingBackend,
              samplingRate,
              propagationFormat,
              namespace,
              instrumentations,
              retentionPeriod,
              spanLimits,
              exportProtocol,
              endpoint,
              enableAutoInstrumentation,
              collectorConfig,
              instrumentationConfig,
              samplingConfig,
              deploymentManifest,
              status: 'tracing_setup_completed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'aggregate-logs': {
          const serviceName = config.serviceName;
          const logAggregator = config.logAggregator || 'loki';
          const namespace = config.namespace || 'default';
          const logLevels = config.logLevels || ['ERROR', 'WARN', 'INFO'];
          const retentionDays = config.retentionDays || 30;
          const structuredLogging = config.structuredLogging ?? true;
          const logFormat = config.logFormat || 'json';
          const pipelineStages = config.pipelineStages || [];
          const labels = config.labels || { app: serviceName || 'unknown', environment: 'production' };
          const enableAlerting = config.enableAlerting ?? true;
          const deduplication = config.deduplication ?? true;
          const indexFields = config.indexFields || ['level', 'service', 'trace_id', 'span_id'];

          this.logger.log(
            `Setting up log aggregation for ${serviceName || 'service'} (aggregator: ${logAggregator}, retention: ${retentionDays}d)`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'log-aggregation',
            serviceName,
            logAggregator,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite log management architect. Design a comprehensive log aggregation pipeline with proper parsing, enrichment, retention, and querying capabilities.`,
            `Design log aggregation for: serviceName="${serviceName}", logAggregator="${logAggregator}", namespace="${namespace}", logLevels=${JSON.stringify(logLevels)}, retentionDays=${retentionDays}, structuredLogging=${structuredLogging}, logFormat="${logFormat}", pipelineStages=${JSON.stringify(pipelineStages)}, labels=${JSON.stringify(labels)}, indexFields=${JSON.stringify(indexFields)}. Return JSON with: pipelineConfig (object - Promtail/Fluentd config), retentionPolicy (object), queryTemplates (array of {name, query, description}), alertRules (array of {name, condition, severity}).`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const pipelineConfig = parsed?.pipelineConfig || {
            clients: [{ url: `http://${logAggregator}.${namespace}:3100/loki/api/v1/push` }],
            scrape_configs: [{
              job_name: `${serviceName || 'app'}-logs`,
              kubernetes_sd_configs: [{ role: 'pod' }],
              relabel_configs: [{ source_labels: ['__meta_kubernetes_pod_label_app'], target_label: 'app' }],
              pipeline_stages: pipelineStages.length > 0 ? pipelineStages : [
                { json: { expressions: { level: 'level', timestamp: 'timestamp', message: 'message' } } },
                { labels: { level: '', service: serviceName || 'app' } },
                { timestamp: { source: 'timestamp', format: 'RFC3339' } },
              ],
            }],
          };
          const retentionPolicy = parsed?.retentionPolicy || {
            retentionPeriod: `${retentionDays}d`,
            compactionInterval: '1h',
            deletionMode: 'filter',
            indexPeriod: `${Math.min(retentionDays, 14)}d`,
          };
          const queryTemplates = parsed?.queryTemplates || [
            { name: 'error-logs', query: `{app="${serviceName || 'app'}"} |= "ERROR"`, description: 'Query error logs for the service' },
            { name: 'slow-requests', query: `{app="${serviceName || 'app'}"} | json | duration > 5000`, description: 'Query slow request logs (>5s)' },
            { name: 'trace-correlation', query: `{app="${serviceName || 'app'}"} | json | trace_id != ""`, description: 'Query logs with trace correlation' },
          ];
          const alertRules = parsed?.alertRules || [
            { name: 'high-error-rate', condition: `rate({app="${serviceName || 'app'}"} |= "ERROR"[5m]) > 0.1`, severity: 'critical' },
            { name: 'log-volume-spike', condition: `rate({app="${serviceName || 'app'}"}[5m]) > 1000`, severity: 'warning' },
          ];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            serviceName: serviceName || 'unknown',
            logAggregator,
            retentionDays,
          });

          return {
            success: true,
            data: {
              action,
              serviceName: serviceName || null,
              logAggregator,
              namespace,
              logLevels,
              retentionDays,
              structuredLogging,
              logFormat,
              pipelineStages,
              labels,
              enableAlerting,
              deduplication,
              indexFields,
              pipelineConfig,
              retentionPolicy,
              queryTemplates,
              alertRules,
              status: 'log_aggregation_configured',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'collect-metrics': {
          const serviceName = config.serviceName;
          const metricSystem = config.metricSystem || 'prometheus';
          const namespace = config.namespace || 'default';
          const scrapeInterval = config.scrapeInterval || '15s';
          const evaluationInterval = config.evaluationInterval || '30s';
          const customMetrics = config.customMetrics || [];
          const metricTypes = config.metricTypes || ['counter', 'gauge', 'histogram', 'summary'];
          const labels = config.labels || { app: serviceName || 'unknown', environment: 'production' };
          const remoteWrite = config.remoteWrite || [];
          const retentionTime = config.retentionTime || '15d';
          const retentionSize = config.retentionSize || '50GB';
          const enableExemplars = config.enableExemplars ?? true;
          const enableNativeHistograms = config.enableNativeHistograms ?? true;

          this.logger.log(
            `Setting up metric collection for ${serviceName || 'service'} (system: ${metricSystem}, interval: ${scrapeInterval})`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'metric-collection',
            serviceName,
            metricSystem,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite metrics and monitoring architect. Design a comprehensive metric collection strategy with proper instrumentation, aggregation, and long-term storage.`,
            `Design metric collection for: serviceName="${serviceName}", metricSystem="${metricSystem}", namespace="${namespace}", scrapeInterval="${scrapeInterval}", customMetrics=${JSON.stringify(customMetrics)}, metricTypes=${JSON.stringify(metricTypes)}, labels=${JSON.stringify(labels)}, retentionTime="${retentionTime}", enableExemplars=${enableExemplars}, enableNativeHistograms=${enableNativeHistograms}. Return JSON with: prometheusConfig (object with global, scrape_configs, remote_write), metricDefinitions (array of {name, type, help, labels}), recordingRules (array of {name, expr, labels}), storageConfig (object).`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const prometheusConfig = parsed?.prometheusConfig || {
            global: { scrape_interval: scrapeInterval, evaluation_interval: evaluationInterval, scrape_timeout: '10s' },
            scrape_configs: [{
              job_name: `${serviceName || 'app'}`,
              kubernetes_sd_configs: [{ role: 'pod' }],
              relabel_configs: [{ source_labels: ['__meta_kubernetes_pod_label_app'], action: 'keep', regex: serviceName || 'app' }],
              metrics_path: '/metrics',
            }],
            remote_write: remoteWrite.length > 0 ? remoteWrite : [],
          };
          const metricDefinitions = parsed?.metricDefinitions || [
            { name: `${serviceName || 'app'}_http_requests_total`, type: 'counter', help: 'Total HTTP requests', labels: ['method', 'path', 'status'] },
            { name: `${serviceName || 'app'}_http_request_duration_seconds`, type: 'histogram', help: 'HTTP request duration', labels: ['method', 'path'] },
            { name: `${serviceName || 'app'}_active_connections`, type: 'gauge', help: 'Active connections', labels: ['protocol'] },
            ...customMetrics,
          ];
          const recordingRules = parsed?.recordingRules || [
            { name: `${serviceName || 'app'}:http_request_rate:5m`, expr: `rate(${serviceName || 'app'}_http_requests_total[5m])`, labels: {} },
            { name: `${serviceName || 'app'}:http_request_duration:p99:5m`, expr: `histogram_quantile(0.99, rate(${serviceName || 'app'}_http_request_duration_seconds_bucket[5m]))`, labels: {} },
            { name: `${serviceName || 'app'}:error_rate:5m`, expr: `sum(rate(${serviceName || 'app'}_http_requests_total{status=~"5.."}[5m])) / sum(rate(${serviceName || 'app'}_http_requests_total[5m]))`, labels: {} },
          ];
          const storageConfig = parsed?.storageConfig || {
            retentionTime,
            retentionSize,
            tsdb: { compaction_interval: '30m', max_block_duration: '2h' },
            wal: { compression: true },
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            serviceName: serviceName || 'unknown',
            metricSystem,
            metricCount: metricDefinitions.length,
          });

          return {
            success: true,
            data: {
              action,
              serviceName: serviceName || null,
              metricSystem,
              namespace,
              scrapeInterval,
              evaluationInterval,
              customMetrics,
              metricTypes,
              labels,
              remoteWrite,
              retentionTime,
              retentionSize,
              enableExemplars,
              enableNativeHistograms,
              prometheusConfig,
              metricDefinitions,
              recordingRules,
              storageConfig,
              status: 'metrics_collection_configured',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'build-dashboard': {
          const dashboardName = config.dashboardName;
          const serviceName = config.serviceName;
          const dashboardType = config.dashboardType || 'service-overview';
          const datasource = config.datasource || 'prometheus';
          const refreshInterval = config.refreshInterval || '30s';
          const timeRange = config.timeRange || 'last 1h';
          const variables = config.variables || [];
          const panels = config.panels || [];
          const annotations = config.annotations || [];
          const templating = config.templating || [];
          const tags = config.tags || ['observability', serviceName || 'app'];
          const folder = config.folder || 'Infrastructure';
          const editable = config.editable ?? false;

          this.logger.log(
            `Building Grafana dashboard ${dashboardName || 'unnamed'} for ${serviceName || 'service'} (type: ${dashboardType})`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'grafana-dashboards',
            dashboardName,
            dashboardType,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite Grafana dashboard architect. Design a comprehensive, visually optimized dashboard that provides actionable insights at a glance.`,
            `Design Grafana dashboard for: dashboardName="${dashboardName}", serviceName="${serviceName}", dashboardType="${dashboardType}", datasource="${datasource}", refreshInterval="${refreshInterval}", variables=${JSON.stringify(variables)}, panels=${JSON.stringify(panels)}. Return JSON with: dashboardJson (object - complete Grafana dashboard JSON model), layoutDescription (string), recommendedAlerts (array of {name, metric, threshold, severity}).`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const dashboardJson = parsed?.dashboardJson || {
            id: null,
            uid: `dash-${Date.now()}`,
            title: dashboardName || `${serviceName || 'Service'} Dashboard`,
            tags,
            timezone: 'browser',
            schemaVersion: 38,
            version: 1,
            refresh: refreshInterval,
            time: { from: timeRange.replace('last ', 'now-'), to: 'now' },
            templating: {
              list: templating.length > 0 ? templating : [
                { name: 'datasource', type: 'datasource', query: 'prometheus', current: { text: 'Prometheus', value: 'Prometheus' } },
                { name: 'namespace', type: 'query', query: 'label_values(kube_pod_info, namespace)', current: { text: 'default', value: 'default' } },
              ],
            },
            panels: panels.length > 0 ? panels : [
              { id: 1, title: 'Request Rate', type: 'timeseries', gridPos: { h: 8, w: 12, x: 0, y: 0 }, targets: [{ expr: `rate(${serviceName || 'app'}_http_requests_total[5m])`, legendFormat: '{{method}} {{path}}' }] },
              { id: 2, title: 'Error Rate', type: 'stat', gridPos: { h: 8, w: 6, x: 12, y: 0 }, targets: [{ expr: `sum(rate(${serviceName || 'app'}_http_requests_total{status=~"5.."}[5m])) / sum(rate(${serviceName || 'app'}_http_requests_total[5m]))`, legendFormat: 'Error Rate' }] },
              { id: 3, title: 'Latency P99', type: 'timeseries', gridPos: { h: 8, w: 6, x: 18, y: 0 }, targets: [{ expr: `histogram_quantile(0.99, rate(${serviceName || 'app'}_http_request_duration_seconds_bucket[5m]))`, legendFormat: 'P99' }] },
              { id: 4, title: 'CPU Usage', type: 'gauge', gridPos: { h: 4, w: 6, x: 0, y: 8 }, targets: [{ expr: `rate(container_cpu_usage_seconds_total{pod=~"${serviceName || 'app'}.*"}[5m])`, legendFormat: 'CPU' }] },
              { id: 5, title: 'Memory Usage', type: 'gauge', gridPos: { h: 4, w: 6, x: 6, y: 8 }, targets: [{ expr: `container_memory_working_set_bytes{pod=~"${serviceName || 'app'}.*"}`, legendFormat: 'Memory' }] },
            ],
          };
          const layoutDescription = parsed?.layoutDescription || `Dashboard layout: Top row shows request rate timeseries (full width), error rate stat (1/4 width), and latency P99 timeseries (1/4 width). Bottom row shows CPU and memory gauges.`;
          const recommendedAlerts = parsed?.recommendedAlerts || [
            { name: 'High Error Rate', metric: `${serviceName || 'app'}:error_rate:5m`, threshold: 0.05, severity: 'critical' },
            { name: 'High Latency P99', metric: `${serviceName || 'app'}:http_request_duration:p99:5m`, threshold: 2.0, severity: 'warning' },
            { name: 'High CPU Usage', metric: `rate(container_cpu_usage_seconds_total{pod=~"${serviceName || 'app'}.*"}[5m])`, threshold: 0.8, severity: 'warning' },
          ];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            dashboardName: dashboardName || 'unnamed',
            panelCount: dashboardJson.panels?.length || 0,
          });

          return {
            success: true,
            data: {
              action,
              dashboardName: dashboardName || null,
              serviceName: serviceName || null,
              dashboardType,
              datasource,
              refreshInterval,
              timeRange,
              variables,
              panels,
              annotations,
              templating,
              tags,
              folder,
              editable,
              dashboardJson,
              layoutDescription,
              recommendedAlerts,
              status: 'dashboard_built',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'define-slo': {
          const serviceName = config.serviceName;
          const sloName = config.sloName;
          const sloTarget = config.sloTarget || 99.9;
          const sloWindow = config.sloWindow || '30d';
          const sloType = config.sloType || 'availability';
          const sliSpecification = config.sliSpecification || {};
          const errorBudgetPolicy = config.errorBudgetPolicy || 'standard';
          const alertingChannels = config.alertingChannels || [];
          const burnRateWindows = config.burnRateWindows || ['1h', '6h', '3d'];
          const description = config.description || `SLO for ${serviceName || 'service'}: ${sloType} >= ${sloTarget}%`;

          this.logger.log(
            `Defining SLO ${sloName || 'unnamed'} for ${serviceName || 'service'} (target: ${sloTarget}%, window: ${sloWindow})`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'sli-slo-definition',
            serviceName,
            sloName,
            sloTarget,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite SRE specialist. Design comprehensive SLI/SLO definitions with error budget policies, burn rate alerts, and implementation guidance.`,
            `Design SLI/SLO for: serviceName="${serviceName}", sloName="${sloName}", sloTarget=${sloTarget}, sloWindow="${sloWindow}", sloType="${sloType}", sliSpecification=${JSON.stringify(sliSpecification)}, errorBudgetPolicy="${errorBudgetPolicy}", burnRateWindows=${JSON.stringify(burnRateWindows)}. Return JSON with: sliDefinition ({name, description, type, query, metricSource}), sloDefinition ({name, target, window, sliRef}), errorBudget ({totalBudget, consumedBudget, remainingBudget, burnRate}), prometheusRules (array of rule objects), alertPolicy ({channels, escalation: [{level, condition, responseTime}]}).`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const sliDefinition = parsed?.sliDefinition || {
            name: `${serviceName || 'app'}_${sloType}_sli`,
            description: `Measures the ${sloType} of ${serviceName || 'service'} based on successful requests`,
            type: sloType,
            query: sloType === 'availability'
              ? `sum(rate(${serviceName || 'app'}_http_requests_total{status!~"5.."}[${sloWindow}])) / sum(rate(${serviceName || 'app'}_http_requests_total[${sloWindow}]))`
              : `1 - (sum(rate(${serviceName || 'app'}_http_request_duration_seconds_bucket{le="2"}[${sloWindow}])) / sum(rate(${serviceName || 'app'}_http_request_duration_seconds_count[${sloWindow}])))`,
            metricSource: 'prometheus',
          };
          const sloDefinition = parsed?.sloDefinition || {
            name: sloName || `${serviceName || 'app'}_${sloType}_slo`,
            target: sloTarget / 100,
            window: sloWindow,
            sliRef: sliDefinition.name,
          };
          const errorBudget = parsed?.errorBudget || {
            totalBudget: 1 - sloTarget / 100,
            consumedBudget: 0.0005,
            remainingBudget: 1 - sloTarget / 100 - 0.0005,
            burnRate: 1.0,
          };
          const prometheusRules = parsed?.prometheusRules || [
            { alert: `${sloName || 'slo'}_burn_rate_fast`, expr: `rate(${serviceName || 'app'}_http_requests_total{status=~"5.."}[1h]) / rate(${serviceName || 'app'}_http_requests_total[1h]) > (1 - ${sloTarget / 100}) * 14.4`, for: '5m', labels: { severity: 'critical' } },
            { alert: `${sloName || 'slo'}_burn_rate_slow`, expr: `rate(${serviceName || 'app'}_http_requests_total{status=~"5.."}[6h]) / rate(${serviceName || 'app'}_http_requests_total[6h]) > (1 - ${sloTarget / 100}) * 6`, for: '30m', labels: { severity: 'warning' } },
          ];
          const alertPolicy = parsed?.alertPolicy || {
            channels: alertingChannels.length > 0 ? alertingChannels : ['pagerduty', 'slack'],
            escalation: [
              { level: 1, condition: 'error budget burn rate > 2x', responseTime: '30m' },
              { level: 2, condition: 'error budget burn rate > 6x', responseTime: '15m' },
              { level: 3, condition: 'error budget consumed > 50%', responseTime: '5m' },
            ],
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            serviceName: serviceName || 'unknown',
            sloName: sloName || 'unnamed',
            sloTarget,
          });

          return {
            success: true,
            data: {
              action,
              serviceName: serviceName || null,
              sloName: sloName || null,
              sloTarget,
              sloWindow,
              sloType,
              sliSpecification,
              errorBudgetPolicy,
              alertingChannels,
              burnRateWindows,
              description,
              sliDefinition,
              sloDefinition,
              errorBudget,
              prometheusRules,
              alertPolicy,
              status: 'slo_defined',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'design-alerts': {
          const serviceName = config.serviceName;
          const alertSystem = config.alertSystem || 'prometheus';
          const namespace = config.namespace || 'default';
          const alertCategories = config.alertCategories || ['availability', 'performance', 'resource', 'error'];
          const notificationChannels = config.notificationChannels || ['slack', 'pagerduty'];
          const severityLevels = config.severityLevels || ['critical', 'warning', 'info'];
          const groupingStrategy = config.groupingStrategy || 'service';
          const inhibitRules = config.inhibitRules || [];
          const silences = config.silences || [];
          const timePeriods = config.timePeriods || [];
          const annotationTemplates = config.annotationTemplates || {};

          this.logger.log(
            `Designing alert system for ${serviceName || 'service'} (system: ${alertSystem}, categories: ${alertCategories.join(', ')})`,
          );

          this.emitEvent(AgentEventType.TOOL_EXECUTED, {
            tool: 'alerting-design',
            serviceName,
            alertSystem,
          });

          const llmResult = await this.executeWithLLM(
            `You are an elite alert design specialist. Create a comprehensive alerting strategy with proper severity levels, notification routing, escalation policies, and noise reduction.`,
            `Design alert system for: serviceName="${serviceName}", alertSystem="${alertSystem}", namespace="${namespace}", alertCategories=${JSON.stringify(alertCategories)}, notificationChannels=${JSON.stringify(notificationChannels)}, severityLevels=${JSON.stringify(severityLevels)}, groupingStrategy="${groupingStrategy}". Return JSON with: alertRules (array of {name, expr, for, severity, summary, description, runbookUrl}), alertmanagerConfig (object), escalationPolicy ({levels: [{level, channels, responseTime, autoActions}]}), noiseReduction ({grouping, inhibition, silencing}).`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 4096 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const alertRules = parsed?.alertRules || [
            { name: `${serviceName || 'App'}HighErrorRate`, expr: `sum(rate(${serviceName || 'app'}_http_requests_total{status=~"5.."}[5m])) / sum(rate(${serviceName || 'app'}_http_requests_total[5m])) > 0.05`, for: '5m', severity: 'critical', summary: 'High error rate detected', description: `Error rate for ${serviceName || 'app'} exceeds 5%`, runbookUrl: `https://runbook.internal/${serviceName || 'app'}/high-error-rate` },
            { name: `${serviceName || 'App'}HighLatencyP99`, expr: `histogram_quantile(0.99, rate(${serviceName || 'app'}_http_request_duration_seconds_bucket[5m])) > 2`, for: '10m', severity: 'warning', summary: 'High latency P99 detected', description: `P99 latency for ${serviceName || 'app'} exceeds 2s`, runbookUrl: `https://runbook.internal/${serviceName || 'app'}/high-latency` },
            { name: `${serviceName || 'App'}HighCPU`, expr: `rate(container_cpu_usage_seconds_total{pod=~"${serviceName || 'app'}.*"}[5m]) > 0.8`, for: '15m', severity: 'warning', summary: 'High CPU usage', description: `CPU usage for ${serviceName || 'app'} exceeds 80%`, runbookUrl: `https://runbook.internal/${serviceName || 'app'}/high-cpu` },
            { name: `${serviceName || 'App'}PodCrashLooping`, expr: `rate(kube_pod_container_status_restarts_total{pod=~"${serviceName || 'app'}.*"}[15m]) > 0`, for: '5m', severity: 'critical', summary: 'Pod is crash looping', description: `Pod ${serviceName || 'app'} is restarting repeatedly`, runbookUrl: `https://runbook.internal/${serviceName || 'app'}/crash-loop` },
            { name: `${serviceName || 'App'}OOMKilled`, expr: `kube_pod_container_status_last_terminated_reason{reason="OOMKilled", pod=~"${serviceName || 'app'}.*"} == 1`, for: '1m', severity: 'critical', summary: 'Container OOMKilled', description: `Container in ${serviceName || 'app'} was OOMKilled`, runbookUrl: `https://runbook.internal/${serviceName || 'app'}/oom-killed` },
          ];
          const alertmanagerConfig = parsed?.alertmanagerConfig || {
            global: { resolve_timeout: '5m' },
            route: {
              group_by: [groupingStrategy, 'alertname'],
              group_wait: '30s',
              group_interval: '5m',
              repeat_interval: '4h',
              receiver: 'default',
              routes: [
                { match: { severity: 'critical' }, receiver: 'critical', group_wait: '10s', repeat_interval: '1h' },
                { match: { severity: 'warning' }, receiver: 'warning', group_wait: '30s', repeat_interval: '4h' },
              ],
            },
            receivers: [
              { name: 'default', slack_configs: [{ channel: '#alerts', send_resolved: true }] },
              { name: 'critical', pagerduty_configs: [{ service_key: 'CRITICAL_KEY' }], slack_configs: [{ channel: '#critical-alerts', send_resolved: true }] },
              { name: 'warning', slack_configs: [{ channel: '#warnings', send_resolved: true }] },
            ],
            inhibit_rules: inhibitRules.length > 0 ? inhibitRules : [
              { source_match: { severity: 'critical' }, target_match: { severity: 'warning' }, equal: ['alertname', 'service'] },
            ],
          };
          const escalationPolicy = parsed?.escalationPolicy || {
            levels: [
              { level: 1, channels: ['slack'], responseTime: '15m', autoActions: ['create-incident', 'notify-oncall'] },
              { level: 2, channels: ['slack', 'pagerduty'], responseTime: '5m', autoActions: ['page-oncall', 'create-war-room'] },
              { level: 3, channels: ['pagerduty', 'sms', 'phone'], responseTime: '2m', autoActions: ['page-management', 'trigger-incident-commander'] },
            ],
          };
          const noiseReduction = parsed?.noiseReduction || {
            grouping: { by: [groupingStrategy, 'alertname'], wait: '30s', interval: '5m' },
            inhibition: [{ source: 'critical', target: 'warning', equal: ['alertname'] }],
            silencing: { defaultDuration: '4h', requireReason: true, autoExpire: true },
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, {
            serviceName: serviceName || 'unknown',
            alertCount: alertRules.length,
          });

          return {
            success: true,
            data: {
              action,
              serviceName: serviceName || null,
              alertSystem,
              namespace,
              alertCategories,
              notificationChannels,
              severityLevels,
              groupingStrategy,
              inhibitRules,
              silences,
              timePeriods,
              annotationTemplates,
              alertRules,
              alertmanagerConfig,
              escalationPolicy,
              noiseReduction,
              status: 'alerts_designed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
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
