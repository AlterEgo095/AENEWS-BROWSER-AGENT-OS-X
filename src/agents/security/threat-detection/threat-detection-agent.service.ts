/**
 * AENEWS Agent OS X - Threat Detection Agent
 * Detects security threats, anomalies, intrusions, and monitors network traffic
 * for suspicious patterns. Performs vulnerability assessments and generates threat reports.
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
import { CertCapability } from '../../../software-factory/interfaces';

// ─── Agent Configuration ──────────────────────────────────────────

export const THREAT_DETECTION_AGENT_CONFIG: AgentConfig = {
  id: 'security-threat-detection',
  name: 'ThreatDetection',
  cluster: AgentCluster.SECURITY,
  version: '1.0.0',
  description:
    'Detect security threats, anomalies, and intrusions. Monitor network traffic for suspicious patterns, assess vulnerabilities, and generate comprehensive threat reports.',
  capabilities: [
    {
      name: 'scanForThreats',
      description: 'Scan systems and network for known and emerging threats',
      inputSchema: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Target system or network to scan' },
          scanType: {
            type: 'string',
            enum: ['quick', 'full', 'targeted'],
            description: 'Type of scan to perform',
          },
          includeFalsePositives: {
            type: 'boolean',
            description: 'Whether to include potential false positives',
          },
        },
        required: ['target'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          threats: { type: 'array', items: { type: 'object' } },
          totalFound: { type: 'number' },
          scanDurationMs: { type: 'number' },
          riskLevel: { type: 'string' },
        },
      },
    },
    {
      name: 'analyzeAnomaly',
      description: 'Analyze behavioral anomalies in system or user activity',
      inputSchema: {
        type: 'object',
        properties: {
          entity: { type: 'string', description: 'Entity to analyze (user, host, service)' },
          timeRange: { type: 'string', description: 'Time range for analysis (e.g., last 24h)' },
          baselinePeriod: { type: 'string', description: 'Baseline comparison period' },
        },
        required: ['entity'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          anomalies: { type: 'array', items: { type: 'object' } },
          anomalyScore: { type: 'number' },
          recommendation: { type: 'string' },
        },
      },
    },
    {
      name: 'detectIntrusion',
      description: 'Detect active or past intrusion attempts',
      inputSchema: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            description: 'Scope of intrusion detection (network, host, application)',
          },
          depth: {
            type: 'string',
            enum: ['surface', 'deep', 'forensic'],
            description: 'Depth of detection analysis',
          },
          timeframe: { type: 'string', description: 'Time window to analyze' },
        },
        required: ['scope'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          intrusions: { type: 'array', items: { type: 'object' } },
          severity: { type: 'string' },
          affectedSystems: { type: 'number' },
        },
      },
    },
    {
      name: 'monitorTraffic',
      description: 'Monitor network traffic for suspicious patterns',
      inputSchema: {
        type: 'object',
        properties: {
          interface: { type: 'string', description: 'Network interface to monitor' },
          filter: { type: 'string', description: 'Traffic filter expression' },
          duration: { type: 'number', description: 'Monitoring duration in seconds' },
        },
        required: ['interface'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          packetsAnalyzed: { type: 'number' },
          suspiciousFlows: { type: 'array', items: { type: 'object' } },
          topTalkers: { type: 'array', items: { type: 'object' } },
          bandwidthUsage: { type: 'object' },
        },
      },
    },
    {
      name: 'assessVulnerability',
      description: 'Assess system vulnerability posture and exposure',
      inputSchema: {
        type: 'object',
        properties: {
          asset: { type: 'string', description: 'Asset to assess' },
          framework: { type: 'string', description: 'Assessment framework (CVSS, NIST, CIS)' },
          includeRemediation: {
            type: 'boolean',
            description: 'Whether to include remediation steps',
          },
        },
        required: ['asset'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          vulnerabilities: { type: 'array', items: { type: 'object' } },
          riskScore: { type: 'number' },
          remediations: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    {
      name: 'generateThreatReport',
      description: 'Generate a comprehensive threat intelligence report',
      inputSchema: {
        type: 'object',
        properties: {
          reportType: {
            type: 'string',
            enum: ['executive', 'technical', 'compliance'],
            description: 'Type of report',
          },
          period: { type: 'string', description: 'Reporting period' },
          includeRecommendations: {
            type: 'boolean',
            description: 'Whether to include recommendations',
          },
        },
        required: ['reportType'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          report: { type: 'object' },
          threatLevel: { type: 'string' },
          trends: { type: 'array', items: { type: 'object' } },
          generatedAt: { type: 'string' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:security',
    'write:security',
    'scan:network',
    'access:threat-intel',
  ],
  maxConcurrentTasks: 5,
  timeout: 60000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 2000,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface ThreatEntry {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  detectedAt: Date;
  status: 'detected' | 'investigating' | 'resolved' | 'false_positive';
}

interface AnomalyRecord {
  id: string;
  entity: string;
  score: number;
  description: string;
  baselineValue: any;
  observedValue: any;
  detectedAt: Date;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class ThreatDetectionAgentService extends BaseAgentService {
  private threatLog: ThreatEntry[] = [];

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }
  private anomalyLog: AnomalyRecord[] = [];
  private lastScanTime: Date | null = null;

  protected defineConfig(): AgentConfig {
    return THREAT_DETECTION_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'scanForThreats',
      description: 'Scan systems and network for known and emerging threats',
      execute: async (params: {
        target: string;
        scanType?: string;
        includeFalsePositives?: boolean;
      }) => this.scanForThreats(params),
    });

    this.registerTool({
      name: 'analyzeAnomaly',
      description: 'Analyze behavioral anomalies in system or user activity',
      execute: async (params: { entity: string; timeRange?: string; baselinePeriod?: string }) =>
        this.analyzeAnomaly(params),
    });

    this.registerTool({
      name: 'detectIntrusion',
      description: 'Detect active or past intrusion attempts',
      execute: async (params: { scope: string; depth?: string; timeframe?: string }) =>
        this.detectIntrusion(params),
    });

    this.registerTool({
      name: 'monitorTraffic',
      description: 'Monitor network traffic for suspicious patterns',
      execute: async (params: { interface: string; filter?: string; duration?: number }) =>
        this.monitorTraffic(params),
    });

    this.registerTool({
      name: 'assessVulnerability',
      description: 'Assess system vulnerability posture and exposure',
      execute: async (params: {
        asset: string;
        framework?: string;
        includeRemediation?: boolean;
      }) => this.assessVulnerability(params),
    });

    this.registerTool({
      name: 'generateThreatReport',
      description: 'Generate a comprehensive threat intelligence report',
      execute: async (params: {
        reportType: string;
        period?: string;
        includeRecommendations?: boolean;
      }) => this.generateThreatReport(params),
    });

    this.logger.log('ThreatDetection agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    // Bridge delegation — use real connector if available
    if (this.bridge) {
      try {
        const result = await this.bridge.executeCapability(CertCapability.SECURITY_AUDIT, {
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

    try {
      let result: any;

      switch (action) {
        case 'scanForThreats':
          result = await this.scanForThreats(params);
          break;
        case 'analyzeAnomaly':
          result = await this.analyzeAnomaly(params);
          break;
        case 'detectIntrusion':
          result = await this.detectIntrusion(params);
          break;
        case 'monitorTraffic':
          result = await this.monitorTraffic(params);
          break;
        case 'assessVulnerability':
          result = await this.assessVulnerability(params);
          break;
        case 'generateThreatReport':
          result = await this.generateThreatReport(params);
          break;
        default:
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown threat detection action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`ThreatDetection execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.threatLog = [];
    this.anomalyLog = [];
    this.lastScanTime = null;
    this.logger.log('ThreatDetection agent destroyed, state cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async scanForThreats(params: {
    target: string;
    scanType?: string;
    includeFalsePositives?: boolean;
  }): Promise<{ threats: any[]; totalFound: number; scanDurationMs: number; riskLevel: string }> {
    const { target, scanType = 'quick', includeFalsePositives = false } = params;

    const scanStart = Date.now();

    if (!target || typeof target !== 'string') {
      throw new Error('A valid target string is required');
    }

    // Simulate threat scanning
    const threats: ThreatEntry[] = [];
    const scanDepth = scanType === 'full' ? 10 : scanType === 'targeted' ? 5 : 3;

    for (let i = 0; i < scanDepth; i++) {
      const severity = (['low', 'medium', 'high', 'critical'] as const)[
        Math.floor(Math.random() * 4)
      ];
      const threat: ThreatEntry = {
        id: this.generateId(),
        type: [
          'malware',
          'phishing',
          'ddos',
          'unauthorized_access',
          'data_exfiltration',
          'privilege_escalation',
        ][i % 6],
        severity,
        description: `Detected ${severity} severity threat on ${target}`,
        source: target,
        detectedAt: new Date(),
        status: 'detected',
      };

      if (severity !== 'low' || includeFalsePositives) {
        threats.push(threat);
        this.threatLog.push(threat);
      }
    }

    const scanDurationMs = Date.now() - scanStart;
    this.lastScanTime = new Date();

    const riskLevel = threats.some((t) => t.severity === 'critical')
      ? 'critical'
      : threats.some((t) => t.severity === 'high')
        ? 'high'
        : threats.some((t) => t.severity === 'medium')
          ? 'medium'
          : 'low';

    this.logger.log(
      `Threat scan completed on ${target}: ${threats.length} threats found (risk: ${riskLevel})`,
    );

    await this.storeInWorkingMemory(
      'lastScanResult',
      { target, threatCount: threats.length, riskLevel },
      300000,
    );

    return {
      threats,
      totalFound: threats.length,
      scanDurationMs,
      riskLevel,
    };
  }

  private async analyzeAnomaly(params: {
    entity: string;
    timeRange?: string;
    baselinePeriod?: string;
  }): Promise<{ anomalies: any[]; anomalyScore: number; recommendation: string }> {
    const { entity, timeRange = 'last 24h', baselinePeriod = 'last 30d' } = params;

    if (!entity) {
      throw new Error('Entity is required for anomaly analysis');
    }

    // Simulate anomaly detection
    const anomalies: AnomalyRecord[] = [];
    const anomalyCount = Math.floor(Math.random() * 5);

    for (let i = 0; i < anomalyCount; i++) {
      const anomaly: AnomalyRecord = {
        id: this.generateId(),
        entity,
        score: Math.round((Math.random() * 0.8 + 0.2) * 100) / 100,
        description: `Unusual activity detected for ${entity}: ${['spike in API calls', 'off-hours access', 'unusual data transfer volume', 'new geographic location', 'failed authentication spike'][i % 5]}`,
        baselineValue: `${Math.floor(Math.random() * 100)} ops/min`,
        observedValue: `${Math.floor(Math.random() * 500 + 100)} ops/min`,
        detectedAt: new Date(),
      };
      anomalies.push(anomaly);
      this.anomalyLog.push(anomaly);
    }

    const anomalyScore =
      anomalies.length > 0
        ? Math.round((anomalies.reduce((sum, a) => sum + a.score, 0) / anomalies.length) * 100) /
          100
        : 0;

    const recommendation =
      anomalyScore > 0.8
        ? 'Immediate investigation required — anomaly score exceeds critical threshold'
        : anomalyScore > 0.5
          ? 'Review anomalies and consider escalating to incident response'
          : 'Monitor situation — anomalies within acceptable range';

    this.logger.log(
      `Anomaly analysis for ${entity}: score ${anomalyScore}, ${anomalies.length} anomalies`,
    );

    return { anomalies, anomalyScore, recommendation };
  }

  private async detectIntrusion(params: {
    scope: string;
    depth?: string;
    timeframe?: string;
  }): Promise<{ intrusions: any[]; severity: string; affectedSystems: number }> {
    const { scope, depth = 'surface', timeframe = 'last 7d' } = params;

    if (!scope) {
      throw new Error('Scope is required for intrusion detection');
    }

    // Simulate intrusion detection
    const intrusionTypes = [
      'brute_force',
      'sql_injection',
      'xss_attempt',
      'lateral_movement',
      'c2_communication',
    ];
    const intrusions = [];

    const maxIntrusions = depth === 'forensic' ? 5 : depth === 'deep' ? 3 : 1;
    const count = Math.floor(Math.random() * (maxIntrusions + 1));

    for (let i = 0; i < count; i++) {
      intrusions.push({
        id: this.generateId(),
        type: intrusionTypes[i % intrusionTypes.length],
        source: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        target: scope,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        blocked: Math.random() > 0.3,
        indicators: [`suspicious_payload_${i}`, `unusual_pattern_${i}`],
      });
    }

    const severity = intrusions.some((i) => !i.blocked)
      ? 'high'
      : intrusions.length > 2
        ? 'medium'
        : 'low';
    const affectedSystems = intrusions.filter((i) => !i.blocked).length;

    this.logger.log(
      `Intrusion detection for scope "${scope}": ${intrusions.length} intrusions, severity ${severity}`,
    );

    return { intrusions, severity, affectedSystems };
  }

  private async monitorTraffic(params: {
    interface: string;
    filter?: string;
    duration?: number;
  }): Promise<{
    packetsAnalyzed: number;
    suspiciousFlows: any[];
    topTalkers: any[];
    bandwidthUsage: any;
  }> {
    const { interface: iface, filter, duration = 60 } = params;

    if (!iface) {
      throw new Error('Network interface is required for traffic monitoring');
    }

    // Simulate traffic monitoring
    const packetsAnalyzed = Math.floor(Math.random() * 100000 + 10000);

    const suspiciousFlows = [];
    const suspiciousCount = Math.floor(Math.random() * 4);
    for (let i = 0; i < suspiciousCount; i++) {
      suspiciousFlows.push({
        srcIp: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        dstIp: `203.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        dstPort: [4444, 8888, 9999, 31337][i % 4],
        protocol: 'TCP',
        reason: ['unusual port', 'high frequency', 'known C2 pattern', 'data exfiltration pattern'][
          i % 4
        ],
        packetCount: Math.floor(Math.random() * 5000 + 100),
      });
    }

    const topTalkers = [
      {
        ip: '10.0.1.100',
        bytes: Math.floor(Math.random() * 1000000000),
        packets: Math.floor(Math.random() * 1000000),
      },
      {
        ip: '10.0.1.101',
        bytes: Math.floor(Math.random() * 500000000),
        packets: Math.floor(Math.random() * 500000),
      },
      {
        ip: '10.0.1.102',
        bytes: Math.floor(Math.random() * 200000000),
        packets: Math.floor(Math.random() * 200000),
      },
    ];

    const bandwidthUsage = {
      totalBytes: Math.floor(Math.random() * 10000000000),
      inboundBytes: Math.floor(Math.random() * 5000000000),
      outboundBytes: Math.floor(Math.random() * 5000000000),
      peakMbps: Math.round(Math.random() * 10000) / 100,
    };

    this.logger.log(
      `Traffic monitoring on ${iface}: ${packetsAnalyzed} packets, ${suspiciousFlows.length} suspicious flows`,
    );

    return { packetsAnalyzed, suspiciousFlows, topTalkers, bandwidthUsage };
  }

  private async assessVulnerability(params: {
    asset: string;
    framework?: string;
    includeRemediation?: boolean;
  }): Promise<{ vulnerabilities: any[]; riskScore: number; remediations: any[] }> {
    const { asset, framework = 'CVSS', includeRemediation = true } = params;

    if (!asset) {
      throw new Error('Asset is required for vulnerability assessment');
    }

    // Simulate vulnerability assessment
    const vulnerabilityTypes = [
      'CVE-2024-0001: Outdated SSL/TLS configuration',
      'CVE-2024-0002: Unpatched software version',
      'CVE-2024-0003: Weak authentication mechanism',
      'CVE-2024-0004: Exposed management interface',
      'CVE-2024-0005: Insufficient input validation',
    ];

    const vulnerabilities = [];
    const count = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < count; i++) {
      vulnerabilities.push({
        id: this.generateId(),
        cve: vulnerabilityTypes[i % vulnerabilityTypes.length],
        cvssScore: Math.round((Math.random() * 8 + 2) * 10) / 10,
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        affectedComponent: asset,
        exploitAvailable: Math.random() > 0.7,
      });
    }

    const riskScore =
      Math.round(
        (vulnerabilities.reduce((sum, v) => sum + v.cvssScore, 0) / vulnerabilities.length) * 10,
      ) / 10;

    const remediations = includeRemediation
      ? vulnerabilities.map((v) => ({
          vulnerabilityId: v.id,
          recommendation: `Apply security patch for ${v.cve.split(':')[0]}`,
          priority: v.cvssScore > 7 ? 'critical' : v.cvssScore > 4 ? 'high' : 'medium',
          estimatedEffort: v.cvssScore > 7 ? '1-2 hours' : '2-4 hours',
        }))
      : [];

    this.logger.log(
      `Vulnerability assessment for ${asset}: ${vulnerabilities.length} vulnerabilities, risk score ${riskScore}`,
    );

    return { vulnerabilities, riskScore, remediations };
  }

  private async generateThreatReport(params: {
    reportType: string;
    period?: string;
    includeRecommendations?: boolean;
  }): Promise<{ report: any; threatLevel: string; trends: any[]; generatedAt: string }> {
    const { reportType, period = 'last 30d', includeRecommendations = true } = params;

    // Aggregate from internal logs
    const threatLevel = this.threatLog.some((t) => t.severity === 'critical')
      ? 'critical'
      : this.threatLog.some((t) => t.severity === 'high')
        ? 'high'
        : this.threatLog.some((t) => t.severity === 'medium')
          ? 'medium'
          : 'low';

    const report = {
      title: `Threat Intelligence Report — ${reportType}`,
      period,
      summary: {
        totalThreats: this.threatLog.length,
        totalAnomalies: this.anomalyLog.length,
        criticalThreats: this.threatLog.filter((t) => t.severity === 'critical').length,
        highThreats: this.threatLog.filter((t) => t.severity === 'high').length,
        mediumThreats: this.threatLog.filter((t) => t.severity === 'medium').length,
        lowThreats: this.threatLog.filter((t) => t.severity === 'low').length,
      },
      recommendations: includeRecommendations
        ? [
            'Update all systems with latest security patches',
            'Review and strengthen firewall rules',
            'Enable multi-factor authentication across all systems',
            'Conduct regular penetration testing',
          ]
        : [],
    };

    const trends = [
      { metric: 'threat_volume', direction: 'increasing', change: '+15%' },
      { metric: 'anomaly_rate', direction: 'stable', change: '+2%' },
      { metric: 'intrusion_attempts', direction: 'decreasing', change: '-8%' },
    ];

    const generatedAt = new Date().toISOString();

    this.logger.log(`Threat report generated: ${reportType} for ${period}`);

    return { report, threatLevel, trends, generatedAt };
  }
}
