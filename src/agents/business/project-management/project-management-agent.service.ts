/**
 * AENEWS Agent OS X - Project Management Agent
 * Project planning, sprint management, resource allocation,
 * milestone tracking, risk management, and project reporting.
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

export const PROJECT_MANAGEMENT_AGENT_CONFIG: AgentConfig = {
  id: 'business-project-management',
  name: 'ProjectManagement',
  cluster: AgentCluster.BUSINESS,
  version: '1.0.0',
  description:
    'Project management agent that handles project planning, sprint management, resource allocation, milestone tracking, risk management, and project reporting.',
  capabilities: [
    {
      name: 'createProject',
      description: 'Create a new project with scope, timeline, and team',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name' },
          description: { type: 'string', description: 'Project description' },
          startDate: { type: 'string', description: 'Project start date (ISO string)' },
          endDate: { type: 'string', description: 'Target end date (ISO string)' },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Project priority',
          },
          team: { type: 'array', items: { type: 'object' }, description: 'Team members' },
          budget: { type: 'number', description: 'Project budget' },
        },
        required: ['name'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          name: { type: 'string' },
          status: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          budget: { type: 'number' },
          createdAt: { type: 'string' },
        },
      },
    },
    {
      name: 'planSprint',
      description: 'Plan a project sprint with goals, tasks, and capacity',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          sprintName: { type: 'string', description: 'Sprint name' },
          duration: { type: 'number', description: 'Sprint duration in days' },
          goals: { type: 'array', items: { type: 'string' }, description: 'Sprint goals' },
          tasks: { type: 'array', items: { type: 'object' }, description: 'Sprint tasks' },
        },
        required: ['projectId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          sprintId: { type: 'string' },
          projectId: { type: 'string' },
          name: { type: 'string' },
          goals: { type: 'array' },
          taskCount: { type: 'number' },
          storyPoints: { type: 'number' },
          status: { type: 'string' },
        },
      },
    },
    {
      name: 'allocateResources',
      description: 'Allocate resources to project tasks and sprints',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          resources: {
            type: 'array',
            items: { type: 'object' },
            description: 'Resource allocations',
          },
          optimize: {
            type: 'boolean',
            description: 'Whether to optimize allocation automatically',
          },
        },
        required: ['projectId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          allocationId: { type: 'string' },
          projectId: { type: 'string' },
          allocations: { type: 'array' },
          utilizationRate: { type: 'number' },
          conflicts: { type: 'array' },
        },
      },
    },
    {
      name: 'trackMilestones',
      description: 'Track project milestones and delivery progress',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          action: {
            type: 'string',
            enum: ['list', 'update', 'add'],
            description: 'Milestone action',
          },
          milestoneId: { type: 'string', description: 'Milestone ID (for update)' },
          name: { type: 'string', description: 'Milestone name (for add)' },
          targetDate: { type: 'string', description: 'Target date (for add)' },
          status: { type: 'string', description: 'New status (for update)' },
        },
        required: ['projectId', 'action'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          milestones: { type: 'array' },
          onTrackCount: { type: 'number' },
          atRiskCount: { type: 'number' },
          overdueCount: { type: 'number' },
        },
      },
    },
    {
      name: 'manageRisks',
      description: 'Manage project risks with identification, assessment, and mitigation',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          action: {
            type: 'string',
            enum: ['identify', 'assess', 'mitigate', 'list'],
            description: 'Risk management action',
          },
          riskId: { type: 'string', description: 'Risk ID' },
          description: { type: 'string', description: 'Risk description' },
          category: { type: 'string', description: 'Risk category' },
        },
        required: ['projectId', 'action'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          risks: { type: 'array' },
          riskScore: { type: 'number' },
          mitigations: { type: 'array' },
        },
      },
    },
    {
      name: 'generateProjectReport',
      description: 'Generate a project status or progress report',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          reportType: {
            type: 'string',
            enum: ['status', 'progress', 'burndown', 'risks', 'resources'],
            description: 'Type of report',
          },
          period: { type: 'string', description: 'Report period' },
        },
        required: ['projectId', 'reportType'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          reportId: { type: 'string' },
          projectId: { type: 'string' },
          reportType: { type: 'string' },
          summary: { type: 'object' },
          data: { type: 'object' },
          generatedAt: { type: 'string' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:business',
    'write:business',
    'read:project',
    'write:project',
    'allocate:resources',
  ],
  maxConcurrentTasks: 5,
  timeout: 30000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1000,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  priority: string;
  budget: number;
  spentBudget: number;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  progress: number;
  team: Array<{ name: string; role: string; allocation: number }>;
  sprints: Sprint[];
  milestones: Milestone[];
  risks: ProjectRisk[];
  createdAt: Date;
  updatedAt: Date;
}

interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goals: string[];
  tasks: Array<{ name: string; storyPoints: number; assignee: string; status: string }>;
  storyPoints: number;
  status: 'planned' | 'active' | 'completed';
  startDate: Date;
  endDate: Date;
}

interface Milestone {
  id: string;
  name: string;
  targetDate: Date;
  status: 'on_track' | 'at_risk' | 'overdue' | 'completed';
  completedAt: Date | null;
}

interface ProjectRisk {
  id: string;
  description: string;
  category: string;
  probability: number;
  impact: number;
  riskScore: number;
  mitigation: string;
  status: 'open' | 'mitigating' | 'closed';
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class ProjectManagementAgentService extends BaseAgentService {
  private projects: Map<string, Project> = new Map();
  private counter: number = 0;

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }

  protected defineConfig(): AgentConfig {
    return PROJECT_MANAGEMENT_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'createProject',
      description: 'Create a new project',
      execute: async (params: {
        name: string;
        description?: string;
        startDate?: string;
        endDate?: string;
        priority?: string;
        team?: Array<{ name: string; role: string; allocation: number }>;
        budget?: number;
      }) => this.createProject(params),
    });

    this.registerTool({
      name: 'planSprint',
      description: 'Plan a project sprint',
      execute: async (params: {
        projectId: string;
        sprintName?: string;
        duration?: number;
        goals?: string[];
        tasks?: Array<{ name: string; storyPoints: number; assignee: string }>;
      }) => this.planSprint(params),
    });

    this.registerTool({
      name: 'allocateResources',
      description: 'Allocate project resources',
      execute: async (params: {
        projectId: string;
        resources?: Array<{ name: string; role: string; allocation: number; task: string }>;
        optimize?: boolean;
      }) => this.allocateResources(params),
    });

    this.registerTool({
      name: 'trackMilestones',
      description: 'Track project milestones',
      execute: async (params: {
        projectId: string;
        action: string;
        milestoneId?: string;
        name?: string;
        targetDate?: string;
        status?: string;
      }) => this.trackMilestones(params),
    });

    this.registerTool({
      name: 'manageRisks',
      description: 'Manage project risks',
      execute: async (params: {
        projectId: string;
        action: string;
        riskId?: string;
        description?: string;
        category?: string;
      }) => this.manageRisks(params),
    });

    this.registerTool({
      name: 'generateProjectReport',
      description: 'Generate a project report',
      execute: async (params: { projectId: string; reportType: string; period?: string }) =>
        this.generateProjectReport(params),
    });

    await this.storeInWorkingMemory('project-mgmt:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('ProjectManagement agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    // Bridge delegation: try real connector first, fallback to simulated logic
    if (this.bridge) {
      try {
        const result = await this.bridge.executeCapability(BusinessCapability.SALES, {
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
      'createProject',
      'planSprint',
      'allocateResources',
      'trackMilestones',
      'manageRisks',
      'generateProjectReport',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown project management action: ${action}. Supported: ${supportedActions.join(', ')}`,
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
        `project-mgmt:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`ProjectManagement execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.projects.clear();
    this.counter = 0;
    this.logger.log('ProjectManagement agent destroyed, all data cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async createProject(params: {
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    priority?: string;
    team?: Array<{ name: string; role: string; allocation: number }>;
    budget?: number;
  }): Promise<{
    projectId: string;
    name: string;
    description: string;
    status: string;
    priority: string;
    startDate: string;
    endDate: string;
    budget: number;
    teamSize: number;
    createdAt: string;
  }> {
    const {
      name,
      description = '',
      startDate,
      endDate,
      priority = 'medium',
      team = [],
      budget = 0,
    } = params;

    if (!name || typeof name !== 'string') {
      throw new Error('A valid project name is required');
    }

    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(priority)) {
      throw new Error(`Invalid priority: ${priority}. Supported: ${validPriorities.join(', ')}`);
    }

    this.counter++;
    const projectId = `proj-${Date.now()}-${this.counter}`;

    const startDateObj = startDate ? new Date(startDate) : new Date();
    const endDateObj = endDate
      ? new Date(endDate)
      : new Date(startDateObj.getTime() + 90 * 24 * 60 * 60 * 1000);

    if (endDateObj <= startDateObj) {
      throw new Error('End date must be after start date');
    }

    const defaultTeam =
      team.length > 0
        ? team
        : [
            { name: 'Project Lead', role: 'lead', allocation: 100 },
            { name: 'Developer 1', role: 'developer', allocation: 100 },
            { name: 'Developer 2', role: 'developer', allocation: 80 },
            { name: 'Designer', role: 'designer', allocation: 60 },
          ];

    // Add default milestones
    const durationMs = endDateObj.getTime() - startDateObj.getTime();
    const defaultMilestones: Milestone[] = [
      {
        id: `ms-${projectId}-1`,
        name: 'Project Kickoff',
        targetDate: startDateObj,
        status: 'on_track',
        completedAt: null,
      },
      {
        id: `ms-${projectId}-2`,
        name: 'Requirements Complete',
        targetDate: new Date(startDateObj.getTime() + durationMs * 0.2),
        status: 'on_track',
        completedAt: null,
      },
      {
        id: `ms-${projectId}-3`,
        name: 'Design Approved',
        targetDate: new Date(startDateObj.getTime() + durationMs * 0.35),
        status: 'on_track',
        completedAt: null,
      },
      {
        id: `ms-${projectId}-4`,
        name: 'Development Complete',
        targetDate: new Date(startDateObj.getTime() + durationMs * 0.75),
        status: 'on_track',
        completedAt: null,
      },
      {
        id: `ms-${projectId}-5`,
        name: 'Testing Complete',
        targetDate: new Date(startDateObj.getTime() + durationMs * 0.9),
        status: 'on_track',
        completedAt: null,
      },
      {
        id: `ms-${projectId}-6`,
        name: 'Project Launch',
        targetDate: endDateObj,
        status: 'on_track',
        completedAt: null,
      },
    ];

    const project: Project = {
      id: projectId,
      name,
      description: description || `Project: ${name}`,
      startDate: startDateObj,
      endDate: endDateObj,
      priority,
      budget,
      spentBudget: 0,
      status: 'planning',
      progress: 0,
      team: defaultTeam,
      sprints: [],
      milestones: defaultMilestones,
      risks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.projects.set(projectId, project);

    this.logger.log(`Created project: ${projectId}, name=${name}, priority=${priority}`);

    return {
      projectId,
      name,
      description: project.description,
      status: 'planning',
      priority,
      startDate: startDateObj.toISOString(),
      endDate: endDateObj.toISOString(),
      budget,
      teamSize: defaultTeam.length,
      createdAt: project.createdAt.toISOString(),
    };
  }

  private async planSprint(params: {
    projectId: string;
    sprintName?: string;
    duration?: number;
    goals?: string[];
    tasks?: Array<{ name: string; storyPoints: number; assignee: string }>;
  }): Promise<{
    sprintId: string;
    projectId: string;
    name: string;
    goals: string[];
    taskCount: number;
    storyPoints: number;
    duration: number;
    status: string;
  }> {
    const { projectId, sprintName, duration = 14, goals = [], tasks = [] } = params;

    if (!projectId || typeof projectId !== 'string') {
      throw new Error('A valid projectId is required');
    }

    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    this.counter++;
    const sprintNumber = project.sprints.length + 1;
    const sprintId = `sprint-${Date.now()}-${this.counter}`;
    const name = sprintName || `Sprint ${sprintNumber}`;

    const defaultGoals =
      goals.length > 0
        ? goals
        : [
            `Deliver sprint ${sprintNumber} features`,
            'Maintain code quality standards',
            'Complete assigned user stories',
          ];

    const sprintTasks =
      tasks.length > 0
        ? tasks
        : [
            { name: 'Setup and planning', storyPoints: 2, assignee: 'Project Lead' },
            { name: 'Core feature development', storyPoints: 8, assignee: 'Developer 1' },
            { name: 'Secondary features', storyPoints: 5, assignee: 'Developer 2' },
            { name: 'UI/UX implementation', storyPoints: 3, assignee: 'Designer' },
            { name: 'Testing and QA', storyPoints: 3, assignee: 'Developer 1' },
          ];

    const totalStoryPoints = sprintTasks.reduce((s, t) => s + (t.storyPoints || 0), 0);

    const sprintStartDate =
      project.sprints.length > 0
        ? new Date(
            project.sprints[project.sprints.length - 1].endDate.getTime() + 1 * 24 * 60 * 60 * 1000,
          )
        : new Date(project.startDate);

    const sprint: Sprint = {
      id: sprintId,
      projectId,
      name,
      goals: defaultGoals,
      tasks: sprintTasks.map((t) => ({ ...t, status: 'todo' })),
      storyPoints: totalStoryPoints,
      status: 'planned',
      startDate: sprintStartDate,
      endDate: new Date(sprintStartDate.getTime() + duration * 24 * 60 * 60 * 1000),
    };

    project.sprints.push(sprint);
    project.updatedAt = new Date();

    if (project.status === 'planning') {
      project.status = 'active';
    }

    this.logger.log(
      `Planned sprint: ${sprintId}, project=${projectId}, name=${name}, points=${totalStoryPoints}`,
    );

    return {
      sprintId,
      projectId,
      name,
      goals: defaultGoals,
      taskCount: sprintTasks.length,
      storyPoints: totalStoryPoints,
      duration,
      status: 'planned',
    };
  }

  private async allocateResources(params: {
    projectId: string;
    resources?: Array<{ name: string; role: string; allocation: number; task: string }>;
    optimize?: boolean;
  }): Promise<{
    allocationId: string;
    projectId: string;
    allocations: Array<{
      name: string;
      role: string;
      allocation: number;
      tasks: string[];
      availability: number;
    }>;
    utilizationRate: number;
    conflicts: string[];
  }> {
    const { projectId, resources = [], optimize = false } = params;

    if (!projectId || typeof projectId !== 'string') {
      throw new Error('A valid projectId is required');
    }

    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    this.counter++;
    const allocationId = `alloc-${Date.now()}-${this.counter}`;

    // Use provided resources or existing team
    const resourceList =
      resources.length > 0
        ? resources
        : project.team.map((t) => ({
            name: t.name,
            role: t.role,
            allocation: t.allocation,
            task: 'General',
          }));

    const allocations: Array<{
      name: string;
      role: string;
      allocation: number;
      tasks: string[];
      availability: number;
    }> = [];
    const conflicts: string[] = [];

    // Group tasks by resource
    const tasksByResource: Record<string, string[]> = {};
    for (const resource of resourceList) {
      if (!tasksByResource[resource.name]) tasksByResource[resource.name] = [];
      tasksByResource[resource.name].push(resource.task);
    }

    for (const resource of resourceList) {
      const allocation = Math.min(100, Math.max(0, resource.allocation));
      const availability = 100 - allocation;

      if (allocation > 100) {
        conflicts.push(`${resource.name} is over-allocated at ${allocation}%`);
      }

      allocations.push({
        name: resource.name,
        role: resource.role,
        allocation,
        tasks: tasksByResource[resource.name] || [resource.task],
        availability,
      });
    }

    if (optimize) {
      // Simulate optimization: balance allocations
      const totalAllocation = allocations.reduce((s, a) => s + a.allocation, 0);
      const avgAllocation =
        allocations.length > 0 ? Math.round(totalAllocation / allocations.length) : 0;

      for (const alloc of allocations) {
        if (alloc.allocation > 90) {
          alloc.allocation = Math.max(alloc.allocation - 10, avgAllocation);
          alloc.availability = 100 - alloc.allocation;
        }
      }

      this.logger.log('Resource allocation optimized for balance');
    }

    const totalAllocated = allocations.reduce((s, a) => s + a.allocation, 0);
    const utilizationRate =
      allocations.length > 0 ? +(totalAllocated / allocations.length).toFixed(1) : 0;

    // Update project team
    for (const alloc of allocations) {
      const existingMember = project.team.find((t) => t.name === alloc.name);
      if (existingMember) {
        existingMember.allocation = alloc.allocation;
      } else {
        project.team.push({ name: alloc.name, role: alloc.role, allocation: alloc.allocation });
      }
    }

    this.logger.log(
      `Allocated resources: ${allocationId}, project=${projectId}, utilization=${utilizationRate}%`,
    );

    return {
      allocationId,
      projectId,
      allocations,
      utilizationRate,
      conflicts,
    };
  }

  private async trackMilestones(params: {
    projectId: string;
    action: string;
    milestoneId?: string;
    name?: string;
    targetDate?: string;
    status?: string;
  }): Promise<{
    projectId: string;
    milestones: Array<{
      id: string;
      name: string;
      targetDate: string;
      status: string;
      completedAt: string | null;
    }>;
    onTrackCount: number;
    atRiskCount: number;
    overdueCount: number;
    completedCount: number;
  }> {
    const { projectId, action, milestoneId, name, targetDate, status } = params;

    if (!projectId || typeof projectId !== 'string') {
      throw new Error('A valid projectId is required');
    }

    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const validActions = ['list', 'update', 'add'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid milestone action: ${action}. Supported: ${validActions.join(', ')}`);
    }

    switch (action) {
      case 'add': {
        if (!name) throw new Error('Milestone name is required for add');

        const msId = `ms-${Date.now()}-${++this.counter}`;
        const msDate = targetDate
          ? new Date(targetDate)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        project.milestones.push({
          id: msId,
          name,
          targetDate: msDate,
          status: 'on_track',
          completedAt: null,
        });

        this.logger.log(`Added milestone: ${msId}, project=${projectId}, name=${name}`);
        break;
      }
      case 'update': {
        if (!milestoneId) throw new Error('milestoneId is required for update');

        const milestone = project.milestones.find((m) => m.id === milestoneId);
        if (!milestone) throw new Error(`Milestone not found: ${milestoneId}`);

        const validStatuses = ['on_track', 'at_risk', 'overdue', 'completed'];
        if (status) {
          if (!validStatuses.includes(status)) {
            throw new Error(
              `Invalid milestone status: ${status}. Supported: ${validStatuses.join(', ')}`,
            );
          }
          milestone.status = status as Milestone['status'];
          if (status === 'completed') {
            milestone.completedAt = new Date();
          }
        }

        if (name) milestone.name = name;
        if (targetDate) milestone.targetDate = new Date(targetDate);

        this.logger.log(`Updated milestone: ${milestoneId}, status=${milestone.status}`);
        break;
      }
      case 'list':
        // No action needed, just return current milestones
        break;
    }

    // Auto-check for overdue milestones
    const now = new Date();
    for (const ms of project.milestones) {
      if (ms.status !== 'completed' && ms.targetDate < now) {
        ms.status = 'overdue';
      }
    }

    const onTrackCount = project.milestones.filter((m) => m.status === 'on_track').length;
    const atRiskCount = project.milestones.filter((m) => m.status === 'at_risk').length;
    const overdueCount = project.milestones.filter((m) => m.status === 'overdue').length;
    const completedCount = project.milestones.filter((m) => m.status === 'completed').length;

    this.logger.log(
      `Milestones tracked: project=${projectId}, on_track=${onTrackCount}, at_risk=${atRiskCount}, overdue=${overdueCount}`,
    );

    return {
      projectId,
      milestones: project.milestones.map((m) => ({
        id: m.id,
        name: m.name,
        targetDate: m.targetDate.toISOString(),
        status: m.status,
        completedAt: m.completedAt?.toISOString() || null,
      })),
      onTrackCount,
      atRiskCount,
      overdueCount,
      completedCount,
    };
  }

  private async manageRisks(params: {
    projectId: string;
    action: string;
    riskId?: string;
    description?: string;
    category?: string;
  }): Promise<{
    projectId: string;
    risks: Array<{
      id: string;
      description: string;
      category: string;
      probability: number;
      impact: number;
      riskScore: number;
      mitigation: string;
      status: string;
    }>;
    overallRiskScore: number;
    openRisks: number;
    mitigatedRisks: number;
  }> {
    const { projectId, action, riskId, description, category = 'general' } = params;

    if (!projectId || typeof projectId !== 'string') {
      throw new Error('A valid projectId is required');
    }

    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const validActions = ['identify', 'assess', 'mitigate', 'list'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid risk action: ${action}. Supported: ${validActions.join(', ')}`);
    }

    switch (action) {
      case 'identify': {
        if (!description) throw new Error('Risk description is required for identification');

        this.counter++;
        const riskIdNew = `risk-${Date.now()}-${this.counter}`;

        const riskCategories = [
          'technical',
          'schedule',
          'budget',
          'resource',
          'scope',
          'external',
          'quality',
        ];
        const riskCategory = riskCategories.includes(category) ? category : 'general';

        const probability = +(0.2 + Math.random() * 0.6).toFixed(2);
        const impact = +(3 + Math.random() * 7).toFixed(1);
        const riskScore = +(probability * impact).toFixed(2);

        const mitigations: Record<string, string> = {
          technical: 'Implement proof-of-concept and architecture reviews',
          schedule: 'Build buffer into timeline and establish early warning indicators',
          budget: 'Maintain contingency reserve and track burn rate weekly',
          resource: 'Cross-train team members and maintain backup resource pool',
          scope: 'Implement change control process and regular scope reviews',
          external: 'Establish communication protocols and dependency monitoring',
          quality: 'Implement automated testing and code review processes',
          general: 'Monitor risk indicators and establish escalation procedures',
        };

        project.risks.push({
          id: riskIdNew,
          description,
          category: riskCategory,
          probability,
          impact,
          riskScore,
          mitigation: mitigations[riskCategory] || mitigations['general'],
          status: 'open',
        });

        this.logger.log(
          `Identified risk: ${riskIdNew}, project=${projectId}, category=${riskCategory}`,
        );
        break;
      }
      case 'assess': {
        if (project.risks.length === 0) {
          // Auto-identify common risks
          const commonRisks = [
            { description: 'Scope creep from changing requirements', category: 'scope' },
            { description: 'Key team member unavailability', category: 'resource' },
            { description: 'Technical complexity underestimation', category: 'technical' },
            { description: 'Budget overrun due to unforeseen costs', category: 'budget' },
            { description: 'Schedule delay from dependency bottlenecks', category: 'schedule' },
          ];

          for (const risk of commonRisks) {
            this.counter++;
            const riskIdAuto = `risk-auto-${Date.now()}-${this.counter}`;
            const probability = +(0.2 + Math.random() * 0.5).toFixed(2);
            const impact = +(4 + Math.random() * 6).toFixed(1);

            project.risks.push({
              id: riskIdAuto,
              description: risk.description,
              category: risk.category,
              probability,
              impact,
              riskScore: +(probability * impact).toFixed(2),
              mitigation: `Implement controls for ${risk.category} risk`,
              status: 'open',
            });
          }

          this.logger.log(`Auto-identified ${commonRisks.length} risks for project: ${projectId}`);
        }

        // Re-assess all risks
        for (const risk of project.risks) {
          risk.probability = +Math.max(
            0,
            Math.min(1, risk.probability + (Math.random() - 0.5) * 0.1),
          ).toFixed(2);
          risk.impact = +Math.max(
            1,
            Math.min(10, risk.impact + (Math.random() - 0.5) * 0.5),
          ).toFixed(1);
          risk.riskScore = +(risk.probability * risk.impact).toFixed(2);
        }
        break;
      }
      case 'mitigate': {
        if (!riskId) throw new Error('riskId is required for mitigation');

        const risk = project.risks.find((r) => r.id === riskId);
        if (!risk) throw new Error(`Risk not found: ${riskId}`);

        risk.status = 'mitigating';
        risk.probability = +Math.max(0.05, risk.probability * 0.6).toFixed(2);
        risk.impact = +Math.max(1, risk.impact * 0.7).toFixed(1);
        risk.riskScore = +(risk.probability * risk.impact).toFixed(2);

        this.logger.log(`Mitigating risk: ${riskId}, new score=${risk.riskScore}`);
        break;
      }
      case 'list':
        // Just return current risks
        break;
    }

    const overallRiskScore =
      project.risks.length > 0
        ? +(project.risks.reduce((s, r) => s + r.riskScore, 0) / project.risks.length).toFixed(2)
        : 0;

    const openRisks = project.risks.filter((r) => r.status === 'open').length;
    const mitigatedRisks = project.risks.filter(
      (r) => r.status === 'mitigating' || r.status === 'closed',
    ).length;

    this.logger.log(
      `Risk management: project=${projectId}, total=${project.risks.length}, open=${openRisks}, score=${overallRiskScore}`,
    );

    return {
      projectId,
      risks: project.risks.map((r) => ({
        id: r.id,
        description: r.description,
        category: r.category,
        probability: r.probability,
        impact: r.impact,
        riskScore: r.riskScore,
        mitigation: r.mitigation,
        status: r.status,
      })),
      overallRiskScore,
      openRisks,
      mitigatedRisks,
    };
  }

  private async generateProjectReport(params: {
    projectId: string;
    reportType: string;
    period?: string;
  }): Promise<{
    reportId: string;
    projectId: string;
    reportType: string;
    period: string;
    summary: Record<string, any>;
    data: Record<string, any>;
    generatedAt: string;
  }> {
    const { projectId, reportType, period = 'current' } = params;

    if (!projectId || typeof projectId !== 'string') {
      throw new Error('A valid projectId is required');
    }

    const validReportTypes = ['status', 'progress', 'burndown', 'risks', 'resources'];
    if (!validReportTypes.includes(reportType)) {
      throw new Error(
        `Invalid reportType: ${reportType}. Supported: ${validReportTypes.join(', ')}`,
      );
    }

    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    this.counter++;
    const reportId = `proj-rpt-${Date.now()}-${this.counter}`;

    // Update progress based on milestones
    const completedMilestones = project.milestones.filter((m) => m.status === 'completed').length;
    project.progress =
      project.milestones.length > 0
        ? Math.round((completedMilestones / project.milestones.length) * 100)
        : 0;

    let summary: Record<string, any> = {};
    let data: Record<string, any> = {};

    switch (reportType) {
      case 'status': {
        const daysRemaining = Math.max(
          0,
          Math.ceil((project.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        );
        summary = {
          name: project.name,
          status: project.status,
          progress: project.progress,
          priority: project.priority,
          startDate: project.startDate.toISOString(),
          endDate: project.endDate.toISOString(),
          daysRemaining,
          budgetUtilization:
            project.budget > 0 ? +((project.spentBudget / project.budget) * 100).toFixed(1) : 0,
        };
        data = {
          milestones: {
            total: project.milestones.length,
            completed: completedMilestones,
            onTrack: project.milestones.filter((m) => m.status === 'on_track').length,
            atRisk: project.milestones.filter((m) => m.status === 'at_risk').length,
            overdue: project.milestones.filter((m) => m.status === 'overdue').length,
          },
          sprints: {
            total: project.sprints.length,
            completed: project.sprints.filter((s) => s.status === 'completed').length,
            active: project.sprints.filter((s) => s.status === 'active').length,
          },
        };
        break;
      }
      case 'progress': {
        const sprintProgress = project.sprints.map((s) => {
          const completedTasks = s.tasks.filter((t) => t.status === 'done').length;
          return {
            name: s.name,
            totalTasks: s.tasks.length,
            completedTasks,
            progress: s.tasks.length > 0 ? Math.round((completedTasks / s.tasks.length) * 100) : 0,
            storyPoints: s.storyPoints,
          };
        });

        summary = {
          overallProgress: project.progress,
          sprintCount: project.sprints.length,
          totalStoryPoints: project.sprints.reduce((s, sp) => s + sp.storyPoints, 0),
        };
        data = {
          sprintProgress,
          milestoneProgress: project.milestones.map((m) => ({
            name: m.name,
            targetDate: m.targetDate.toISOString(),
            status: m.status,
          })),
        };
        break;
      }
      case 'burndown': {
        const totalPoints = project.sprints.reduce((s, sp) => s + sp.storyPoints, 0) || 100;
        const completedPoints = Math.round((totalPoints * project.progress) / 100);
        const remainingPoints = totalPoints - completedPoints;

        summary = {
          totalStoryPoints: totalPoints,
          completedStoryPoints: completedPoints,
          remainingStoryPoints: remainingPoints,
          idealBurnRate: +(totalPoints / Math.max(1, project.sprints.length)).toFixed(1),
        };
        data = {
          burndownData: project.sprints.map((s, i) => {
            const completed = Math.round(s.storyPoints * (0.5 + Math.random() * 0.5));
            return {
              sprint: s.name,
              planned: s.storyPoints,
              completed,
              remaining: totalPoints - completedPoints * ((i + 1) / project.sprints.length),
            };
          }),
          projectedCompletion: project.endDate.toISOString(),
        };
        break;
      }
      case 'risks': {
        const openRisks = project.risks.filter((r) => r.status === 'open');
        const riskByCategory: Record<string, number> = {};
        for (const risk of project.risks) {
          riskByCategory[risk.category] = (riskByCategory[risk.category] || 0) + 1;
        }

        summary = {
          totalRisks: project.risks.length,
          openRisks: openRisks.length,
          mitigatedRisks: project.risks.filter((r) => r.status === 'mitigating').length,
          highRisks: project.risks.filter((r) => r.riskScore >= 3).length,
        };
        data = {
          riskByCategory,
          topRisks: openRisks
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 5)
            .map((r) => ({
              description: r.description,
              category: r.category,
              riskScore: r.riskScore,
              mitigation: r.mitigation,
            })),
        };
        break;
      }
      case 'resources': {
        const totalAllocation = project.team.reduce((s, t) => s + t.allocation, 0);
        const avgUtilization =
          project.team.length > 0 ? Math.round(totalAllocation / project.team.length) : 0;

        summary = {
          teamSize: project.team.length,
          avgUtilization,
          fullyAllocated: project.team.filter((t) => t.allocation >= 90).length,
          partiallyAllocated: project.team.filter((t) => t.allocation >= 30 && t.allocation < 90)
            .length,
          underAllocated: project.team.filter((t) => t.allocation < 30).length,
          budget: project.budget,
          spentBudget: project.spentBudget,
          remainingBudget: project.budget - project.spentBudget,
        };
        data = {
          teamAllocation: project.team.map((t) => ({
            name: t.name,
            role: t.role,
            allocation: t.allocation,
            status:
              t.allocation >= 90
                ? 'fully_allocated'
                : t.allocation >= 30
                  ? 'partially_allocated'
                  : 'available',
          })),
        };
        break;
      }
    }

    this.logger.log(
      `Generated project report: ${reportId}, type=${reportType}, project=${projectId}`,
    );

    return {
      reportId,
      projectId,
      reportType,
      period,
      summary,
      data,
      generatedAt: new Date().toISOString(),
    };
  }
}
