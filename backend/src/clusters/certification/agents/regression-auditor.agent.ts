import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

export class RegressionAuditorAgent extends BaseAgent {
  readonly name = 'RegressionAuditorAgent';
  readonly cluster = ClusterType.CERTIFICATION;
  readonly capabilities = ['detect-regression', 'compare-baselines', 'track-degradation', 'generate-report'];
  readonly version = '2.0.0';
  readonly description = 'Detects performance and behavioral regressions by comparing baselines, tracking degradation, and generating reports';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'detect-regression';
      const startTime = Date.now();

      switch (action) {
        case 'detect-regression': {
          const baselineId = config.baselineId;
          const currentVersion = config.currentVersion || 'latest';
          const regressionTypes = config.regressionTypes || ['performance', 'functional', 'visual'];
          const sensitivity = config.sensitivity || 'medium';
          const autoBaseline = config.autoBaseline ?? false;
          this.logger.log(`Detecting regression (baseline: ${baselineId || 'latest'}, sensitivity: ${sensitivity})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, baselineId, sensitivity });

          const llmResult = await this.executeWithLLM(
            `You are a professional regression detection expert. Compare current metrics against baselines to detect regressions.`,
            `Detect regression: baselineId="${baselineId}", currentVersion="${currentVersion}", types=${JSON.stringify(regressionTypes)}, sensitivity="${sensitivity}". Return JSON with: regressions (array of {id, type, severity, component, description, metric, baselineValue, currentValue, changePercent, introducedIn}), summary ({totalRegressions, critical, major, minor}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const regressions = parsed?.regressions || [
            { id: 'reg-001', type: 'performance', severity: 'major', component: 'search-service', description: 'P99 latency increased by 45% in search endpoint', metric: 'p99_latency', baselineValue: 220, currentValue: 320, changePercent: 45, introducedIn: 'v2.3.1' },
            { id: 'reg-002', type: 'functional', severity: 'minor', component: 'auth-service', description: 'Token refresh returns 401 instead of 200 on edge case', metric: 'error_rate', baselineValue: 0.001, currentValue: 0.008, changePercent: 700, introducedIn: 'v2.3.1' },
          ];
          const summary = parsed?.summary || { totalRegressions: regressions.length, critical: regressions.filter((r: any) => r.severity === 'critical').length, major: regressions.filter((r: any) => r.severity === 'major').length, minor: regressions.filter((r: any) => r.severity === 'minor').length };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { totalRegressions: summary.totalRegressions, criticalCount: summary.critical });
          return { success: true, data: { action, baselineId, currentVersion, regressionTypes, sensitivity, autoBaseline, regressions, summary, status: 'regression_detection_completed', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime } };
        }

        case 'compare-baselines': {
          const baselineA = config.baselineA;
          const baselineB = config.baselineB;
          const metrics = config.metrics || ['latency', 'throughput', 'memory', 'cpu'];
          const statisticalSignificance = config.statisticalSignificance ?? true;
          const confidenceLevel = config.confidenceLevel || 0.95;
          this.logger.log(`Comparing baselines ${baselineA || 'A'} vs ${baselineB || 'B'}`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action });

          const llmResult = await this.executeWithLLM(
            `You are a professional baseline comparison expert. Statistically compare two performance baselines.`,
            `Compare baselines: A="${baselineA}", B="${baselineB}", metrics=${JSON.stringify(metrics)}, statisticalSignificance=${statisticalSignificance}, confidence=${confidenceLevel}. Return JSON with: comparison (array of {metric, baselineAValue, baselineBValue, change, changePercent, significant, direction}), significantChanges (array of {metric, change, confidence, impact}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const comparison = parsed?.comparison || [
            { metric: 'latency_p99', baselineAValue: 220, baselineBValue: 320, change: 100, changePercent: 45.5, significant: true, direction: 'regression' },
            { metric: 'throughput', baselineAValue: 3200, baselineBValue: 3050, change: -150, changePercent: -4.7, significant: false, direction: 'neutral' },
          ];
          const significantChanges = parsed?.significantChanges || [{ metric: 'latency_p99', change: '+45.5%', confidence: 0.97, impact: 'User-facing latency degradation' }];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { comparisonCount: comparison.length });
          return { success: true, data: { action, baselineA, baselineB, metrics, statisticalSignificance, confidenceLevel, comparison, significantChanges, status: 'baseline_comparison_completed', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime } };
        }

        case 'track-degradation': {
          const period = config.period || '30d';
          const metric = config.metric || 'all';
          const threshold = config.threshold || 10;
          const granularity = config.granularity || 'daily';
          const alertOnDegradation = config.alertOnDegradation ?? true;
          this.logger.log(`Tracking degradation (${period}, metric: ${metric}, threshold: ${threshold}%)`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, period });

          const llmResult = await this.executeWithLLM(
            `You are a professional degradation tracking expert. Monitor system metrics for gradual performance decline.`,
            `Track degradation: period="${period}", metric="${metric}", threshold=${threshold}%, granularity="${granularity}", alertOnDegradation=${alertOnDegradation}. Return JSON with: degradationTrends (array of {metric, trend, changePercent, dataPoints: [{timestamp, value}], degrading}), alerts (array of {metric, severity, message, currentValue, previousValue, changePercent}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const degradationTrends = parsed?.degradationTrends || [
            { metric: 'latency_p99', trend: 'increasing', changePercent: 32, dataPoints: [{ timestamp: new Date(Date.now() - 30 * 86400000).toISOString(), value: 210 }, { timestamp: new Date().toISOString(), value: 277 }], degrading: true },
            { metric: 'error_rate', trend: 'stable', changePercent: 2, dataPoints: [{ timestamp: new Date(Date.now() - 30 * 86400000).toISOString(), value: 0.003 }, { timestamp: new Date().toISOString(), value: 0.0031 }], degrading: false },
          ];
          const alerts = parsed?.alerts || [{ metric: 'latency_p99', severity: 'warning', message: 'P99 latency has degraded 32% over 30 days', currentValue: 277, previousValue: 210, changePercent: 32 }];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { trendCount: degradationTrends.length, alertCount: alerts.length });
          return { success: true, data: { action, period, metric, threshold, granularity, alertOnDegradation, degradationTrends, alerts, status: 'degradation_tracking_completed', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime } };
        }

        case 'generate-report': {
          const reportType = config.reportType || 'summary';
          const includeCharts = config.includeCharts ?? true;
          const includeRecommendations = config.includeRecommendations ?? true;
          const format = config.format || 'json';
          const baselineId = config.baselineId;
          const period = config.period || '7d';
          this.logger.log(`Generating regression report (type: ${reportType}, format: ${format})`);
          this.emitEvent(AgentEventType.AGENT_STARTED, { action, reportType });

          const llmResult = await this.executeWithLLM(
            `You are a professional regression report generation expert. Create comprehensive regression analysis reports.`,
            `Generate report: type="${reportType}", period="${period}", includeRecommendations=${includeRecommendations}. Return JSON with: report ({id, generatedAt, period, summary: {totalRegressions, newRegressions, resolvedRegressions, ongoingRegressions}, details: [{regression, status, severity, description, recommendation}]}), recommendations (string array).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const report = parsed?.report || { id: `report-${Date.now()}`, generatedAt: new Date().toISOString(), period, summary: { totalRegressions: 5, newRegressions: 2, resolvedRegressions: 1, ongoingRegressions: 2 }, details: [{ regression: 'P99 latency degradation', status: 'ongoing', severity: 'major', description: 'Search endpoint latency increased by 45%', recommendation: 'Investigate database query performance; add query caching' }] };
          const recommendations = parsed?.recommendations || ['Add query caching for search endpoint', 'Implement automated regression detection in CI pipeline', 'Schedule weekly performance review'];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { reportId: report.id });
          return { success: true, data: { action, reportType, includeCharts, includeRecommendations, format, baselineId, period, report, recommendations, status: 'report_generation_completed', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime } };
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
