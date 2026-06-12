/**
 * AENEWS Agent OS X - Logging Agent
 * Log aggregation, search, analysis, and retention management.
 * Provides log searching, aggregation, alerting, export, pattern analysis, and retention policies.
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

export const LOGGING_AGENT_CONFIG: AgentConfig = {
  id: 'infrastructure-logging',
  name: 'Logging',
  cluster: AgentCluster.INFRASTRUCTURE,
  version: '1.0.0',
  description:
    'Log aggregation, search, analysis, and retention management. Searches and aggregates logs, creates log-based alerts, exports logs, analyzes patterns, and manages retention policies.',
  capabilities: [
    {
      name: 'searchLogs',
      description: 'Search logs with query filters',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (supports Lucene syntax)' },
          service: { type: 'string', description: 'Filter by service name' },
          level: { type: 'string', enum: ['debug', 'info', 'warn', 'error', 'fatal'], description: 'Filter by log level' },
          timeRange: { type: 'string', enum: ['5m', '15m', '1h', '6h', '24h', '7d'], default: '1h' },
          limit: { type: 'number', default: 100, maximum: 1000 },
          offset: { type: 'number', default: 0 },
        },
        required: ['query'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          total: { type: 'number' },
          logs: { type: 'array' },
          hasMore: { type: 'boolean' },
        },
      },
    },
    {
      name: 'aggregateLogs',
      description: 'Aggregate logs by field with statistical analysis',
      inputSchema: {
        type: 'object',
        properties: {
          service: { type: 'string' },
          field: { type: 'string', description: 'Field to aggregate by (e.g., "level", "service", "host")' },
          aggregation: { type: 'string', enum: ['count', 'sum', 'avg', 'percentile', 'terms'], default: 'terms' },
          timeRange: { type: 'string', enum: ['1h', '6h', '24h', '7d', '30d'], default: '24h' },
          interval: { type: 'string', enum: ['1m', '5m', '15m', '1h', '1d'], default: '1h' },
        },
        required: ['field'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          buckets: { type: 'array' },
          totalDocuments: { type: 'number' },
        },
      },
    },
    {
      name: 'createLogAlert',
      description: 'Create an alert triggered by log patterns',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          query: { type: 'string', description: 'Log query that triggers the alert' },
          threshold: { type: 'number', description: 'Number of matching logs to trigger' },
          timeWindow: { type: 'string', description: 'Time window for threshold (e.g., "5m")' },
          severity: { type: 'string', enum: ['info', 'warning', 'critical'], default: 'warning' },
          channels: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'query', 'threshold'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          alertId: { type: 'string' },
          created: { type: 'boolean' },
        },
      },
    },
    {
      name: 'exportLogs',
      description: 'Export logs to a downloadable format',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          service: { type: 'string' },
          timeRange: { type: 'string', enum: ['1h', '6h', '24h', '7d', '30d'], default: '24h' },
          format: { type: 'string', enum: ['json', 'csv', 'ndjson'], default: 'json' },
          maxRecords: { type: 'number', default: 10000 },
        },
        required: ['query'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          exportId: { type: 'string' },
          format: { type: 'string' },
          recordCount: { type: 'number' },
          downloadUrl: { type: 'string' },
        },
      },
    },
    {
      name: 'analyzePatterns',
      description: 'Analyze log data for patterns, anomalies, and trends',
      inputSchema: {
        type: 'object',
        properties: {
          service: { type: 'string' },
          timeRange: { type: 'string', enum: ['1h', '6h', '24h', '7d'], default: '24h' },
          analysisType: { type: 'string', enum: ['anomaly', 'frequency', 'correlation', 'trend'], default: 'anomaly' },
        },
        required: ['service'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          patterns: { type: 'array' },
          anomalies: { type: 'array' },
          insights: { type: 'array' },
        },
      },
    },
    {
      name: 'setRetentionPolicy',
      description: 'Set or update a log retention policy',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          service: { type: 'string', description: 'Service to apply policy to (or "*" for all)' },
          retentionDays: { type: 'number', description: 'Number of days to retain logs' },
          maxStorageGb: { type: 'number', description: 'Maximum storage in GB' },
          compressionEnabled: { type: 'boolean', default: true },
          archiveAfterDays: { type: 'number', description: 'Archive logs after this many days' },
        },
        required: ['name', 'service', 'retentionDays'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          policyId: { type: 'string' },
          created: { type: 'boolean' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:logs',
    'write:log-alerts',
    'export:logs',
    'manage:retention',
  ],
  maxConcurrentTasks: 5,
  timeout: 60000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1500,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface LogEntry {
  id: string;
  timestamp: string;
  service: string;
  level: string;
  message: string;
  host: string;
  traceId?: string;
  metadata?: Record<string, any>;
}

interface LogAlert {
  id: string;
  name: string;
  query: string;
  threshold: number;
  timeWindow: string;
  severity: string;
  channels: string[];
  enabled: boolean;
  createdAt: Date;
}

interface RetentionPolicy {
  id: string;
  name: string;
  service: string;
  retentionDays: number;
  maxStorageGb?: number;
  compressionEnabled: boolean;
  archiveAfterDays?: number;
  createdAt: Date;
}

interface PatternResult {
  type: string;
  description: string;
  confidence: number;
  affectedService: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class LoggingAgentService extends BaseAgentService {
  private logAlerts: Map<string, LogAlert> = new Map();
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();
  private logAlertCounter = 0;
  private retentionCounter = 0;
  private exportCounter = 0;

  // Simulated log pool
  private readonly simulatedServices = [
    'api-gateway', 'auth-service', 'user-service', 'payment-service',
    'notification-service', 'search-service', 'worker-service', 'scheduler-service',
  ];
  private readonly simulatedLevels = ['debug', 'info', 'info', 'info', 'warn', 'warn', 'error', 'fatal'];
  private readonly simulatedMessages = [
    'Request processed successfully',
    'Connection established to database',
    'Cache miss for key: user:12345',
    'Rate limit exceeded for client IP 192.168.1.50',
    'Database query timeout after 5000ms',
    'Failed to connect to Redis cluster',
    'Authentication token expired',
    'Out of memory: heap allocation failed',
    'Unexpected null reference in UserService.getProfile',
    'Scheduled job completed: daily-report',
    'HTTP 502 Bad Gateway from upstream service',
    'SSL certificate validation failed',
    'Message published to queue: order.created',
    'Circuit breaker opened for payment-service',
    'Health check passed',
  ];

  protected defineConfig(): AgentConfig {
    return LOGGING_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'searchLogs',
      description: 'Search logs with query filters',
      execute: async (params: {
        query: string;
        service?: string;
        level?: string;
        timeRange?: string;
        limit?: number;
        offset?: number;
      }) => this.searchLogs(params),
    });

    this.registerTool({
      name: 'aggregateLogs',
      description: 'Aggregate logs by field',
      execute: async (params: {
        service?: string;
        field: string;
        aggregation?: string;
        timeRange?: string;
        interval?: string;
      }) => this.aggregateLogs(params),
    });

    this.registerTool({
      name: 'createLogAlert',
      description: 'Create a log-based alert',
      execute: async (params: {
        name: string;
        query: string;
        threshold: number;
        timeWindow?: string;
        severity?: string;
        channels?: string[];
      }) => this.createLogAlert(params),
    });

    this.registerTool({
      name: 'exportLogs',
      description: 'Export logs to a downloadable format',
      execute: async (params: {
        query: string;
        service?: string;
        timeRange?: string;
        format?: string;
        maxRecords?: number;
      }) => this.exportLogs(params),
    });

    this.registerTool({
      name: 'analyzePatterns',
      description: 'Analyze logs for patterns and anomalies',
      execute: async (params: {
        service: string;
        timeRange?: string;
        analysisType?: string;
      }) => this.analyzePatterns(params),
    });

    this.registerTool({
      name: 'setRetentionPolicy',
      description: 'Set a log retention policy',
      execute: async (params: {
        name: string;
        service: string;
        retentionDays: number;
        maxStorageGb?: number;
        compressionEnabled?: boolean;
        archiveAfterDays?: number;
      }) => this.setRetentionPolicy(params),
    });

    await this.storeInWorkingMemory('logging:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('Logging agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { action, ...params } = input.payload;

    if (!action) {
      return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
    }

    const supportedActions = [
      'searchLogs', 'aggregateLogs', 'createLogAlert',
      'exportLogs', 'analyzePatterns', 'setRetentionPolicy',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown logging action: ${action}. Supported: ${supportedActions.join(', ')}`,
        startTime,
      );
    }

    try {
      const tool = this.getTool(action);
      if (!tool) {
        return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
      }

      const result = await tool.execute(params);

      await this.storeInWorkingMemory(
        `logging:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Logging execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.logAlerts.clear();
    this.retentionPolicies.clear();
    this.logger.log('Logging agent destroyed, state cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async searchLogs(params: {
    query: string;
    service?: string;
    level?: string;
    timeRange?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    query: string;
    total: number;
    logs: LogEntry[];
    hasMore: boolean;
    searchTimeMs: number;
  }> {
    const { query, service, level, timeRange = '1h', limit = 100, offset = 0 } = params;

    if (!query || typeof query !== 'string') {
      throw new Error('Search query is required');
    }
    if (limit < 1 || limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }

    const searchStart = Date.now();

    // Generate simulated log entries matching the query
    const totalCount = Math.floor(Math.random() * 5000) + 50;
    const logs: LogEntry[] = [];

    const effectiveLimit = Math.min(limit, totalCount - offset);
    for (let i = 0; i < effectiveLimit; i++) {
      const logService = service || this.simulatedServices[Math.floor(Math.random() * this.simulatedServices.length)];
      const logLevel = level || this.simulatedLevels[Math.floor(Math.random() * this.simulatedLevels.length)];
      const message = this.simulatedMessages[Math.floor(Math.random() * this.simulatedMessages.length)];

      logs.push({
        id: `log-${offset + i + 1}`,
        timestamp: new Date(Date.now() - Math.random() * this.timeRangeToMs(timeRange)).toISOString(),
        service: logService,
        level: logLevel,
        message: query === '*' ? message : `${message} [matched: "${query}"]`,
        host: `host-${Math.floor(Math.random() * 10) + 1}.dc1`,
        traceId: Math.random() > 0.5 ? this.generateTraceId() : undefined,
        metadata: Math.random() > 0.7 ? { requestId: this.generateTraceId(), userId: `user-${Math.floor(Math.random() * 1000)}` } : undefined,
      });
    }

    const searchTimeMs = Date.now() - searchStart;
    const hasMore = offset + effectiveLimit < totalCount;

    this.logger.log(`searchLogs: "${query}", ${totalCount} total, ${logs.length} returned, ${searchTimeMs}ms`);

    return { query, total: totalCount, logs, hasMore, searchTimeMs };
  }

  private async aggregateLogs(params: {
    service?: string;
    field: string;
    aggregation?: string;
    timeRange?: string;
    interval?: string;
  }): Promise<{
    field: string;
    aggregation: string;
    buckets: Array<{ key: string; docCount: number; percentage?: number }>;
    totalDocuments: number;
    timeRange: string;
  }> {
    const { service, field, aggregation = 'terms', timeRange = '24h', interval = '1h' } = params;

    if (!field || typeof field !== 'string') {
      throw new Error('Aggregation field is required');
    }

    // Generate aggregated data based on field type
    const buckets: Array<{ key: string; docCount: number; percentage?: number }> = [];
    const totalDocuments = Math.floor(Math.random() * 500000) + 10000;

    if (field === 'level') {
      const levels = [
        { key: 'info', weight: 0.55 },
        { key: 'debug', weight: 0.2 },
        { key: 'warn', weight: 0.15 },
        { key: 'error', weight: 0.08 },
        { key: 'fatal', weight: 0.02 },
      ];
      for (const l of levels) {
        const docCount = Math.round(totalDocuments * l.weight * (0.9 + Math.random() * 0.2));
        buckets.push({ key: l.key, docCount, percentage: Math.round(l.weight * 10000) / 100 });
      }
    } else if (field === 'service') {
      for (const svc of this.simulatedServices) {
        const docCount = Math.round((totalDocuments / this.simulatedServices.length) * (0.8 + Math.random() * 0.4));
        buckets.push({ key: svc, docCount });
      }
    } else if (field === 'host') {
      for (let i = 1; i <= 10; i++) {
        buckets.push({ key: `host-${i}.dc1`, docCount: Math.round(totalDocuments / 10 * (0.7 + Math.random() * 0.6)) });
      }
    } else {
      // Time-based buckets
      const intervals = interval === '1m' ? 60 : interval === '5m' ? 288 : interval === '15m' ? 96 : interval === '1h' ? 24 : 30;
      for (let i = 0; i < intervals; i++) {
        const bucketTime = new Date(Date.now() - (intervals - i) * this.intervalToMs(interval));
        buckets.push({
          key: bucketTime.toISOString(),
          docCount: Math.round(totalDocuments / intervals * (0.5 + Math.random())),
        });
      }
    }

    this.logger.log(`aggregateLogs: ${field} by ${aggregation}, ${buckets.length} buckets, ${totalDocuments} docs`);

    return { field, aggregation, buckets, totalDocuments, timeRange };
  }

  private async createLogAlert(params: {
    name: string;
    query: string;
    threshold: number;
    timeWindow?: string;
    severity?: string;
    channels?: string[];
  }): Promise<{
    alertId: string;
    name: string;
    query: string;
    threshold: number;
    created: boolean;
  }> {
    const {
      name,
      query,
      threshold,
      timeWindow = '5m',
      severity = 'warning',
      channels = ['email', 'slack'],
    } = params;

    if (!name || typeof name !== 'string') {
      throw new Error('Alert name is required');
    }
    if (!query || typeof query !== 'string') {
      throw new Error('Query is required');
    }
    if (threshold < 1) {
      throw new Error('Threshold must be at least 1');
    }

    this.logAlertCounter++;
    const alertId = `log-alert-${this.logAlertCounter}-${Date.now()}`;

    this.logAlerts.set(alertId, {
      id: alertId,
      name,
      query,
      threshold,
      timeWindow,
      severity,
      channels,
      enabled: true,
      createdAt: new Date(),
    });

    this.logger.log(`Created log alert: ${name} [${alertId}], threshold: ${threshold} in ${timeWindow}`);

    return { alertId, name, query, threshold, created: true };
  }

  private async exportLogs(params: {
    query: string;
    service?: string;
    timeRange?: string;
    format?: string;
    maxRecords?: number;
  }): Promise<{
    exportId: string;
    format: string;
    recordCount: number;
    downloadUrl: string;
    fileSizeEstimate: string;
    expiresAt: string;
  }> {
    const { query, service, timeRange = '24h', format = 'json', maxRecords = 10000 } = params;

    if (!query || typeof query !== 'string') {
      throw new Error('Query is required');
    }

    const validFormats = ['json', 'csv', 'ndjson'];
    if (!validFormats.includes(format)) {
      throw new Error(`Invalid format: ${format}. Valid: ${validFormats.join(', ')}`);
    }

    this.exportCounter++;
    const exportId = `export-${this.exportCounter}-${Date.now()}`;
    const recordCount = Math.min(maxRecords, Math.floor(Math.random() * 50000) + 1000);
    const sizePerRecord = format === 'csv' ? 200 : 500;
    const fileSizeBytes = recordCount * sizePerRecord;
    const fileSizeEstimate = fileSizeBytes > 1073741824
      ? `${(fileSizeBytes / 1073741824).toFixed(1)} GB`
      : fileSizeBytes > 1048576
        ? `${(fileSizeBytes / 1048576).toFixed(1)} MB`
        : `${(fileSizeBytes / 1024).toFixed(1)} KB`;

    const servicePath = service ? `/${service}` : '/all';
    const downloadUrl = `https://logs.example.com/exports${servicePath}/${exportId}.${format}`;

    this.logger.log(`Export logs: ${exportId}, ${format}, ${recordCount} records, ~${fileSizeEstimate}`);

    return {
      exportId,
      format,
      recordCount,
      downloadUrl,
      fileSizeEstimate,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
  }

  private async analyzePatterns(params: {
    service: string;
    timeRange?: string;
    analysisType?: string;
  }): Promise<{
    service: string;
    analysisType: string;
    patterns: PatternResult[];
    anomalies: PatternResult[];
    insights: string[];
    analyzedAt: string;
  }> {
    const { service, timeRange = '24h', analysisType = 'anomaly' } = params;

    if (!service || typeof service !== 'string') {
      throw new Error('Service name is required');
    }

    const validTypes = ['anomaly', 'frequency', 'correlation', 'trend'];
    if (!validTypes.includes(analysisType)) {
      throw new Error(`Invalid analysis type: ${analysisType}. Valid: ${validTypes.join(', ')}`);
    }

    // Generate simulated patterns
    const patterns: PatternResult[] = [
      {
        type: 'frequency',
        description: `Recurring "Connection timeout" errors in ${service} every ~15 minutes`,
        confidence: 0.92,
        affectedService: service,
        occurrences: Math.floor(Math.random() * 50) + 10,
        firstSeen: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        lastSeen: new Date().toISOString(),
      },
      {
        type: 'correlation',
        description: `High memory usage in ${service} correlates with increased error rate`,
        confidence: 0.78,
        affectedService: service,
        occurrences: Math.floor(Math.random() * 20) + 5,
        firstSeen: new Date(Date.now() - Math.random() * 172800000).toISOString(),
        lastSeen: new Date().toISOString(),
      },
    ];

    const anomalies: PatternResult[] = [
      {
        type: 'spike',
        description: `Unexpected spike in ERROR logs from ${service} at ${new Date(Date.now() - 3600000).toISOString()}`,
        confidence: 0.95,
        affectedService: service,
        occurrences: 1,
        firstSeen: new Date(Date.now() - 7200000).toISOString(),
        lastSeen: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    if (analysisType === 'trend') {
      patterns.push({
        type: 'trend',
        description: `Gradual increase in WARN logs for ${service} over the past 7 days`,
        confidence: 0.85,
        affectedService: service,
        occurrences: Math.floor(Math.random() * 200) + 50,
        firstSeen: new Date(Date.now() - 604800000).toISOString(),
        lastSeen: new Date().toISOString(),
      });
    }

    const insights: string[] = [
      `${service} generates an average of ${Math.floor(Math.random() * 5000) + 500} log entries per hour`,
      `Error rate for ${service} is ${(Math.random() * 5).toFixed(2)}%, which is ${Math.random() > 0.5 ? 'within' : 'above'} acceptable threshold`,
      `Peak log volume occurs between 09:00-11:00 UTC for ${service}`,
      `Consider increasing log sampling rate for ${service} during peak hours to reduce storage costs`,
    ];

    this.logger.log(`analyzePatterns: ${service}, ${analysisType}, ${patterns.length} patterns, ${anomalies.length} anomalies`);

    return {
      service,
      analysisType,
      patterns,
      anomalies,
      insights,
      analyzedAt: new Date().toISOString(),
    };
  }

  private async setRetentionPolicy(params: {
    name: string;
    service: string;
    retentionDays: number;
    maxStorageGb?: number;
    compressionEnabled?: boolean;
    archiveAfterDays?: number;
  }): Promise<{
    policyId: string;
    name: string;
    service: string;
    retentionDays: number;
    created: boolean;
    message: string;
  }> {
    const {
      name,
      service,
      retentionDays,
      maxStorageGb,
      compressionEnabled = true,
      archiveAfterDays,
    } = params;

    if (!name || typeof name !== 'string') {
      throw new Error('Policy name is required');
    }
    if (!service || typeof service !== 'string') {
      throw new Error('Service name is required (use "*" for all services)');
    }
    if (retentionDays < 1 || retentionDays > 3650) {
      throw new Error('Retention days must be between 1 and 3650 (10 years)');
    }
    if (archiveAfterDays !== undefined && archiveAfterDays >= retentionDays) {
      throw new Error('Archive days must be less than retention days');
    }

    this.retentionCounter++;
    const policyId = `retention-${this.retentionCounter}-${Date.now()}`;

    this.retentionPolicies.set(policyId, {
      id: policyId,
      name,
      service,
      retentionDays,
      maxStorageGb,
      compressionEnabled,
      archiveAfterDays,
      createdAt: new Date(),
    });

    this.logger.log(
      `Set retention policy: ${name} [${policyId}], service=${service}, retention=${retentionDays} days`,
    );

    return {
      policyId,
      name,
      service,
      retentionDays,
      created: true,
      message: `Retention policy "${name}" created for ${service === '*' ? 'all services' : service}: ${retentionDays} days retention${archiveAfterDays ? `, archive after ${archiveAfterDays} days` : ''}`,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private timeRangeToMs(timeRange: string): number {
    const map: Record<string, number> = {
      '5m': 300000, '15m': 900000, '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000, '30d': 2592000000,
    };
    return map[timeRange] || 3600000;
  }

  private intervalToMs(interval: string): number {
    const map: Record<string, number> = {
      '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000, '1d': 86400000,
    };
    return map[interval] || 3600000;
  }

  private generateTraceId(): string {
    const chars = '0123456789abcdef';
    let id = '';
    for (let i = 0; i < 32; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
      if (i === 7 || i === 11 || i === 15 || i === 19) id += '-';
    }
    return id;
  }
}
