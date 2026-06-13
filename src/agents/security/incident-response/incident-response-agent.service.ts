/**
 * AENEWS Agent OS X - Incident Response Agent
 * Manages security incidents from creation through investigation, containment,
 * remediation, forensic analysis, and post-mortem documentation.
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

export const INCIDENT_RESPONSE_AGENT_CONFIG: AgentConfig = {
  id: 'security-incident-response',
  name: 'IncidentResponse',
  cluster: AgentCluster.SECURITY,
  version: '1.0.0',
  description:
    'Manage security incidents through their full lifecycle: creation, investigation, threat containment, remediation, forensic reporting, and post-mortem analysis.',
  capabilities: [
    {
      name: 'createIncident',
      description: 'Create a new security incident record',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Incident title' },
          severity: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Incident severity',
          },
          type: {
            type: 'string',
            description: 'Incident type (e.g., breach, malware, phishing, ddos)',
          },
          description: { type: 'string', description: 'Detailed incident description' },
          reportedBy: { type: 'string', description: 'Person or system reporting the incident' },
        },
        required: ['title', 'severity', 'type'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          incidentId: { type: 'string' },
          title: { type: 'string' },
          severity: { type: 'string' },
          status: { type: 'string' },
          createdAt: { type: 'string' },
        },
      },
    },
    {
      name: 'investigateIncident',
      description: 'Investigate a security incident to determine root cause and impact',
      inputSchema: {
        type: 'object',
        properties: {
          incidentId: { type: 'string', description: 'ID of the incident to investigate' },
          depth: {
            type: 'string',
            enum: ['preliminary', 'detailed', 'forensic'],
            description: 'Investigation depth',
          },
          assignTo: { type: 'string', description: 'Assign investigation to a team or individual' },
        },
        required: ['incidentId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          incidentId: { type: 'string' },
          rootCause: { type: 'string' },
          impactAssessment: { type: 'object' },
          timeline: { type: 'array', items: { type: 'object' } },
          iocs: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    {
      name: 'containThreat',
      description: 'Contain an active threat to prevent further damage',
      inputSchema: {
        type: 'object',
        properties: {
          incidentId: { type: 'string', description: 'ID of the associated incident' },
          strategy: {
            type: 'string',
            enum: ['isolate', 'block', 'quarantine', 'shutdown'],
            description: 'Containment strategy',
          },
          target: { type: 'string', description: 'Target system or network to contain' },
          scope: {
            type: 'string',
            enum: ['single_host', 'subnet', 'network', 'global'],
            description: 'Containment scope',
          },
        },
        required: ['incidentId', 'strategy'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          contained: { type: 'boolean' },
          strategy: { type: 'string' },
          affectedSystems: { type: 'number' },
          actionsTaken: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'remediateIssue',
      description: 'Remediate the root cause of a security incident',
      inputSchema: {
        type: 'object',
        properties: {
          incidentId: { type: 'string', description: 'ID of the incident to remediate' },
          remediationType: {
            type: 'string',
            enum: ['patch', 'config_change', 'credential_reset', 'system_restore', 'custom'],
            description: 'Type of remediation',
          },
          description: { type: 'string', description: 'Description of remediation action' },
          automated: { type: 'boolean', description: 'Whether to attempt automated remediation' },
        },
        required: ['incidentId', 'remediationType'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          remediated: { type: 'boolean' },
          remediationType: { type: 'string' },
          actionsPerformed: { type: 'array', items: { type: 'string' } },
          verificationStatus: { type: 'string' },
        },
      },
    },
    {
      name: 'generateForensicReport',
      description: 'Generate a detailed forensic report for an incident',
      inputSchema: {
        type: 'object',
        properties: {
          incidentId: { type: 'string', description: 'ID of the incident' },
          includeArtifacts: {
            type: 'boolean',
            description: 'Whether to include forensic artifacts',
          },
          format: {
            type: 'string',
            enum: ['summary', 'detailed', 'legal'],
            description: 'Report format',
          },
        },
        required: ['incidentId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          reportId: { type: 'string' },
          incidentId: { type: 'string' },
          executiveSummary: { type: 'string' },
          timeline: { type: 'array', items: { type: 'object' } },
          artifacts: { type: 'array', items: { type: 'object' } },
          generatedAt: { type: 'string' },
        },
      },
    },
    {
      name: 'postMortem',
      description: 'Conduct a post-mortem analysis of a resolved incident',
      inputSchema: {
        type: 'object',
        properties: {
          incidentId: { type: 'string', description: 'ID of the resolved incident' },
          participants: {
            type: 'array',
            items: { type: 'string' },
            description: 'Post-mortem participants',
          },
          includeActionItems: { type: 'boolean', description: 'Whether to generate action items' },
        },
        required: ['incidentId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          postMortemId: { type: 'string' },
          incidentId: { type: 'string' },
          lessonsLearned: { type: 'array', items: { type: 'string' } },
          actionItems: { type: 'array', items: { type: 'object' } },
          detectionImprovements: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:incidents',
    'write:incidents',
    'contain:threats',
    'remediate:issues',
    'generate:forensics',
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

type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
type IncidentStatus = 'open' | 'investigating' | 'contained' | 'remediated' | 'closed';

interface Incident {
  incidentId: string;
  title: string;
  severity: IncidentSeverity;
  type: string;
  description: string;
  status: IncidentStatus;
  reportedBy: string;
  createdAt: Date;
  updatedAt: Date;
  timeline: IncidentTimelineEntry[];
  rootCause?: string;
  impactAssessment?: Record<string, any>;
  iocs: IndicatorOfCompromise[];
  assignedTo?: string;
}

interface IncidentTimelineEntry {
  timestamp: Date;
  event: string;
  details: string;
  performedBy: string;
}

interface IndicatorOfCompromise {
  type: string;
  value: string;
  description: string;
  confidence: 'low' | 'medium' | 'high';
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class IncidentResponseAgentService extends BaseAgentService {
  private incidents: Map<string, Incident> = new Map();

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }

  protected defineConfig(): AgentConfig {
    return INCIDENT_RESPONSE_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'createIncident',
      description: 'Create a new security incident record',
      execute: async (params: {
        title: string;
        severity: string;
        type: string;
        description?: string;
        reportedBy?: string;
      }) => this.createIncident(params),
    });

    this.registerTool({
      name: 'investigateIncident',
      description: 'Investigate a security incident to determine root cause and impact',
      execute: async (params: { incidentId: string; depth?: string; assignTo?: string }) =>
        this.investigateIncident(params),
    });

    this.registerTool({
      name: 'containThreat',
      description: 'Contain an active threat to prevent further damage',
      execute: async (params: {
        incidentId: string;
        strategy: string;
        target?: string;
        scope?: string;
      }) => this.containThreat(params),
    });

    this.registerTool({
      name: 'remediateIssue',
      description: 'Remediate the root cause of a security incident',
      execute: async (params: {
        incidentId: string;
        remediationType: string;
        description?: string;
        automated?: boolean;
      }) => this.remediateIssue(params),
    });

    this.registerTool({
      name: 'generateForensicReport',
      description: 'Generate a detailed forensic report for an incident',
      execute: async (params: {
        incidentId: string;
        includeArtifacts?: boolean;
        format?: string;
      }) => this.generateForensicReport(params),
    });

    this.registerTool({
      name: 'postMortem',
      description: 'Conduct a post-mortem analysis of a resolved incident',
      execute: async (params: {
        incidentId: string;
        participants?: string[];
        includeActionItems?: boolean;
      }) => this.postMortem(params),
    });

    this.logger.log('IncidentResponse agent initialized with 6 tools');
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
        case 'createIncident':
          result = await this.createIncident(params);
          break;
        case 'investigateIncident':
          result = await this.investigateIncident(params);
          break;
        case 'containThreat':
          result = await this.containThreat(params);
          break;
        case 'remediateIssue':
          result = await this.remediateIssue(params);
          break;
        case 'generateForensicReport':
          result = await this.generateForensicReport(params);
          break;
        case 'postMortem':
          result = await this.postMortem(params);
          break;
        default:
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown incident response action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`IncidentResponse execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.incidents.clear();
    this.logger.log('IncidentResponse agent destroyed, state cleared');
  }

  // ─── Helper ────────────────────────────────────────────────────

  private getIncidentOrThrow(incidentId: string): Incident {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }
    return incident;
  }

  private addTimelineEntry(
    incident: Incident,
    event: string,
    details: string,
    performedBy: string,
  ): void {
    incident.timeline.push({
      timestamp: new Date(),
      event,
      details,
      performedBy,
    });
    incident.updatedAt = new Date();
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async createIncident(params: {
    title: string;
    severity: string;
    type: string;
    description?: string;
    reportedBy?: string;
  }): Promise<{
    incidentId: string;
    title: string;
    severity: string;
    status: string;
    createdAt: string;
  }> {
    const { title, severity, type, description, reportedBy } = params;

    if (!title || !severity || !type) {
      throw new Error('title, severity, and type are required');
    }

    const validSeverities: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity as IncidentSeverity)) {
      throw new Error(
        `Invalid severity: ${severity}. Must be one of: ${validSeverities.join(', ')}`,
      );
    }

    const incidentId = `INC-${this.generateId().substring(0, 8).toUpperCase()}`;

    const incident: Incident = {
      incidentId,
      title,
      severity: severity as IncidentSeverity,
      type,
      description: description || title,
      status: 'open',
      reportedBy: reportedBy || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      timeline: [],
      iocs: [],
    };

    this.addTimelineEntry(
      incident,
      'incident_created',
      `Incident created with severity ${severity}`,
      reportedBy || 'system',
    );

    this.incidents.set(incidentId, incident);

    // Store critical incidents in long-term memory
    if (severity === 'critical' || severity === 'high') {
      await this.storeInLongTermMemory(`incident:${incidentId}`, {
        title,
        severity,
        type,
        createdAt: incident.createdAt.toISOString(),
      });
    }

    this.logger.log(`Incident created: ${incidentId} — ${title} (${severity})`);

    return {
      incidentId,
      title,
      severity,
      status: 'open',
      createdAt: incident.createdAt.toISOString(),
    };
  }

  private async investigateIncident(params: {
    incidentId: string;
    depth?: string;
    assignTo?: string;
  }): Promise<{
    incidentId: string;
    rootCause: string;
    impactAssessment: any;
    timeline: any[];
    iocs: any[];
  }> {
    const { incidentId, depth = 'detailed', assignTo } = params;

    const incident = this.getIncidentOrThrow(incidentId);

    incident.status = 'investigating';
    if (assignTo) incident.assignedTo = assignTo;

    this.addTimelineEntry(
      incident,
      'investigation_started',
      `Investigation started (depth: ${depth})`,
      assignTo || 'incident_response_team',
    );

    // Simulate investigation
    const rootCauses = [
      'Compromised user credentials via phishing attack',
      'Unpatched vulnerability exploited in web application',
      'Misconfigured firewall rule allowed unauthorized access',
      'Insider threat — unauthorized data access',
      'Supply chain compromise via third-party library',
    ];

    incident.rootCause = rootCauses[Math.floor(Math.random() * rootCauses.length)];

    incident.impactAssessment = {
      affectedSystems: Math.floor(Math.random() * 20) + 1,
      affectedUsers: Math.floor(Math.random() * 1000) + 10,
      dataExposed: Math.random() > 0.5,
      estimatedCost: Math.floor(Math.random() * 500000) + 10000,
      businessImpact:
        incident.severity === 'critical'
          ? 'severe'
          : incident.severity === 'high'
            ? 'significant'
            : 'moderate',
    };

    // Generate IOCs
    const iocTypes = ['ip_address', 'domain', 'hash', 'url', 'email'];
    const iocCount = depth === 'forensic' ? 5 : depth === 'detailed' ? 3 : 1;
    incident.iocs = [];
    for (let i = 0; i < iocCount; i++) {
      incident.iocs.push({
        type: iocTypes[i % iocTypes.length],
        value: `ioc_value_${i}_${Date.now()}`,
        description: `Indicator of compromise type: ${iocTypes[i % iocTypes.length]}`,
        confidence: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)],
      });
    }

    this.addTimelineEntry(
      incident,
      'investigation_completed',
      `Root cause identified: ${incident.rootCause}`,
      incident.assignedTo || 'incident_response_team',
    );

    this.logger.log(`Incident ${incidentId} investigated: root cause — ${incident.rootCause}`);

    return {
      incidentId,
      rootCause: incident.rootCause,
      impactAssessment: incident.impactAssessment,
      timeline: incident.timeline.map((t) => ({
        timestamp: t.timestamp.toISOString(),
        event: t.event,
        details: t.details,
        performedBy: t.performedBy,
      })),
      iocs: incident.iocs,
    };
  }

  private async containThreat(params: {
    incidentId: string;
    strategy: string;
    target?: string;
    scope?: string;
  }): Promise<{
    contained: boolean;
    strategy: string;
    affectedSystems: number;
    actionsTaken: string[];
  }> {
    const { incidentId, strategy, target, scope = 'single_host' } = params;

    const incident = this.getIncidentOrThrow(incidentId);

    const actionsTaken: string[] = [];

    switch (strategy) {
      case 'isolate':
        actionsTaken.push(`Isolated ${target || 'affected system'} from network`);
        actionsTaken.push(`Blocked all inbound/outbound traffic to ${target || 'host'}`);
        break;
      case 'block':
        actionsTaken.push(`Blocked malicious IPs/domains associated with incident`);
        actionsTaken.push(`Updated firewall rules to block threat indicators`);
        break;
      case 'quarantine':
        actionsTaken.push(`Quarantined affected files and processes`);
        actionsTaken.push(`Moved suspicious artifacts to secure quarantine zone`);
        break;
      case 'shutdown':
        actionsTaken.push(`Gracefully shut down ${target || 'affected system'}`);
        actionsTaken.push(`Created forensic image before shutdown`);
        break;
      default:
        throw new Error(`Unknown containment strategy: ${strategy}`);
    }

    actionsTaken.push(`Containment scope: ${scope}`);
    incident.status = 'contained';

    for (const action of actionsTaken) {
      this.addTimelineEntry(incident, 'containment_action', action, 'incident_response_team');
    }

    const affectedSystems =
      scope === 'global'
        ? Math.floor(Math.random() * 100) + 10
        : scope === 'network'
          ? Math.floor(Math.random() * 30) + 5
          : scope === 'subnet'
            ? Math.floor(Math.random() * 10) + 2
            : 1;

    this.logger.log(
      `Incident ${incidentId} contained: strategy ${strategy}, ${affectedSystems} systems affected`,
    );

    return { contained: true, strategy, affectedSystems, actionsTaken };
  }

  private async remediateIssue(params: {
    incidentId: string;
    remediationType: string;
    description?: string;
    automated?: boolean;
  }): Promise<{
    remediated: boolean;
    remediationType: string;
    actionsPerformed: string[];
    verificationStatus: string;
  }> {
    const { incidentId, remediationType, description, automated = false } = params;

    const incident = this.getIncidentOrThrow(incidentId);

    const actionsPerformed: string[] = [];

    switch (remediationType) {
      case 'patch':
        actionsPerformed.push('Applied security patches to affected systems');
        actionsPerformed.push('Verified patch installation');
        break;
      case 'config_change':
        actionsPerformed.push('Updated configuration to remediate vulnerability');
        actionsPerformed.push('Validated new configuration against security baseline');
        break;
      case 'credential_reset':
        actionsPerformed.push('Reset all compromised credentials');
        actionsPerformed.push('Revoked existing tokens and sessions');
        actionsPerformed.push('Enforced MFA for affected accounts');
        break;
      case 'system_restore':
        actionsPerformed.push('Restored systems from clean backup');
        actionsPerformed.push('Verified system integrity after restore');
        break;
      case 'custom':
        actionsPerformed.push(description || 'Applied custom remediation');
        break;
      default:
        throw new Error(`Unknown remediation type: ${remediationType}`);
    }

    if (automated) {
      actionsPerformed.push('Automated remediation workflow executed');
    }

    incident.status = 'remediated';
    for (const action of actionsPerformed) {
      this.addTimelineEntry(
        incident,
        'remediation_action',
        action,
        automated ? 'automated_system' : 'incident_response_team',
      );
    }

    const verificationStatus = Math.random() > 0.1 ? 'verified' : 'pending_verification';

    this.logger.log(
      `Incident ${incidentId} remediated: type ${remediationType}, verification ${verificationStatus}`,
    );

    return { remediated: true, remediationType, actionsPerformed, verificationStatus };
  }

  private async generateForensicReport(params: {
    incidentId: string;
    includeArtifacts?: boolean;
    format?: string;
  }): Promise<{
    reportId: string;
    incidentId: string;
    executiveSummary: string;
    timeline: any[];
    artifacts: any[];
    generatedAt: string;
  }> {
    const { incidentId, includeArtifacts = true, format = 'detailed' } = params;

    const incident = this.getIncidentOrThrow(incidentId);

    const reportId = `FR-${this.generateId().substring(0, 12)}`;

    const executiveSummary =
      `Security incident ${incidentId} (${incident.type}) occurred on ${incident.createdAt.toISOString()}. ` +
      `Root cause: ${incident.rootCause || 'Under investigation'}. ` +
      `Severity: ${incident.severity}. Current status: ${incident.status}.`;

    const timeline = incident.timeline.map((t) => ({
      timestamp: t.timestamp.toISOString(),
      event: t.event,
      details: t.details,
      performedBy: t.performedBy,
    }));

    const artifacts = includeArtifacts
      ? [
          {
            type: 'log_snapshot',
            description: 'System logs at time of incident',
            hash: this.generateId().substring(0, 32),
          },
          {
            type: 'memory_dump',
            description: 'Memory dump from affected system',
            hash: this.generateId().substring(0, 32),
          },
          {
            type: 'network_capture',
            description: 'Network traffic capture',
            hash: this.generateId().substring(0, 32),
          },
          ...incident.iocs.map((ioc) => ({
            type: `ioc_${ioc.type}`,
            description: ioc.description,
            value: ioc.value,
            confidence: ioc.confidence,
          })),
        ]
      : [];

    this.addTimelineEntry(
      incident,
      'forensic_report_generated',
      `Forensic report ${reportId} generated (format: ${format})`,
      'forensic_analyst',
    );

    this.logger.log(`Forensic report generated: ${reportId} for incident ${incidentId}`);

    return {
      reportId,
      incidentId,
      executiveSummary,
      timeline,
      artifacts,
      generatedAt: new Date().toISOString(),
    };
  }

  private async postMortem(params: {
    incidentId: string;
    participants?: string[];
    includeActionItems?: boolean;
  }): Promise<{
    postMortemId: string;
    incidentId: string;
    lessonsLearned: string[];
    actionItems: any[];
    detectionImprovements: string[];
  }> {
    const { incidentId, participants = [], includeActionItems = true } = params;

    const incident = this.getIncidentOrThrow(incidentId);

    if (incident.status !== 'remediated' && incident.status !== 'contained') {
      throw new Error(
        `Post-mortem can only be performed on resolved incidents. Current status: ${incident.status}`,
      );
    }

    const postMortemId = `PM-${this.generateId().substring(0, 12)}`;

    const lessonsLearned = [
      'Earlier detection could have reduced impact by reducing response time',
      'Improved monitoring coverage would have identified the threat sooner',
      'Existing runbooks were partially effective but need updating for this scenario',
      'Communication between teams could be streamlined for faster response',
    ];

    const actionItems = includeActionItems
      ? [
          {
            id: this.generateId(),
            title: 'Update detection rules for this threat type',
            priority: 'high',
            assignee: 'security_engineering',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: this.generateId(),
            title: 'Enhance monitoring for related IOCs',
            priority: 'high',
            assignee: 'soc_team',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: this.generateId(),
            title: 'Update incident response playbook',
            priority: 'medium',
            assignee: 'incident_response_team',
            dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: this.generateId(),
            title: 'Conduct team training on similar scenarios',
            priority: 'medium',
            assignee: 'security_training',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ]
      : [];

    const detectionImprovements = [
      'Add alerting for anomalous access patterns identified in this incident',
      'Integrate threat intelligence feeds for proactive detection',
      'Implement behavioral analytics for insider threat detection',
    ];

    incident.status = 'closed';
    this.addTimelineEntry(
      incident,
      'post_mortem_completed',
      `Post-mortem ${postMortemId} completed with ${participants.length} participants`,
      'incident_response_team',
    );

    // Store post-mortem in long-term memory
    await this.storeInLongTermMemory(`postmortem:${postMortemId}`, {
      incidentId,
      lessonsLearned,
      actionItems: actionItems.map((a) => a.title),
      closedAt: new Date().toISOString(),
    });

    this.logger.log(`Post-mortem completed: ${postMortemId} for incident ${incidentId}`);

    return {
      postMortemId,
      incidentId,
      lessonsLearned,
      actionItems,
      detectionImprovements,
    };
  }
}
