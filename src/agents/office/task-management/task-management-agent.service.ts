/**
 * AENEWS Agent OS X - Task Management Agent
 * Manages tasks and projects: create, update, assign, track progress,
 * generate reports, set deadlines, and prioritize tasks.
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

export const TASK_MANAGEMENT_AGENT_CONFIG: AgentConfig = {
  id: 'office-task-management',
  name: 'TaskManagement',
  cluster: AgentCluster.OFFICE,
  version: '1.0.0',
  description:
    'Task and project management agent that handles creating, updating, assigning, tracking progress, reporting, setting deadlines, and prioritizing tasks.',
  capabilities: [
    {
      name: 'createTask',
      description: 'Create a new task with title, description, priority, and optional assignee',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Task description' },
          projectId: { type: 'string', description: 'Parent project ID' },
          assignee: { type: 'string', description: 'Assignee user ID or email' },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Task priority',
          },
          deadline: { type: 'string', description: 'Task deadline (ISO string)' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Task tags' },
          subtasks: {
            type: 'array',
            items: { type: 'object' },
            description: 'Initial subtask definitions',
          },
          estimatedHours: { type: 'number', description: 'Estimated hours to complete' },
        },
        required: ['title'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          status: { type: 'string' },
          createdAt: { type: 'string' },
        },
      },
    },
    {
      name: 'updateTask',
      description: 'Update an existing task with new values',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the task to update' },
          title: { type: 'string', description: 'New title' },
          description: { type: 'string', description: 'New description' },
          status: {
            type: 'string',
            enum: ['todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled'],
            description: 'New status',
          },
          assignee: { type: 'string', description: 'New assignee' },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'New priority',
          },
          progress: { type: 'number', description: 'Progress percentage (0-100)' },
          tags: { type: 'array', items: { type: 'string' }, description: 'New tags' },
          actualHours: { type: 'number', description: 'Actual hours spent' },
        },
        required: ['taskId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          updatedFields: { type: 'array', items: { type: 'string' } },
          status: { type: 'string' },
        },
      },
    },
    {
      name: 'assignTask',
      description: 'Assign a task to a user or reassign to a different user',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the task' },
          assignee: { type: 'string', description: 'User ID or email to assign to' },
          message: { type: 'string', description: 'Assignment message or note' },
          dueDate: { type: 'string', description: 'Reassignment due date (ISO string)' },
        },
        required: ['taskId', 'assignee'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          assignee: { type: 'string' },
          previousAssignee: { type: 'string' },
          status: { type: 'string' },
        },
      },
    },
    {
      name: 'trackProgress',
      description: 'Track progress of tasks, projects, or by assignee',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID to track' },
          assignee: { type: 'string', description: 'Assignee to track tasks for' },
          status: { type: 'string', description: 'Filter by task status' },
          dateFrom: { type: 'string', description: 'Start date filter (ISO string)' },
          dateTo: { type: 'string', description: 'End date filter (ISO string)' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          totalTasks: { type: 'number' },
          completedTasks: { type: 'number' },
          inProgressTasks: { type: 'number' },
          overdueTasks: { type: 'number' },
          averageProgress: { type: 'number' },
          tasks: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    {
      name: 'generateReport',
      description: 'Generate a summary or detailed report on tasks and projects',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID for report' },
          reportType: {
            type: 'string',
            enum: ['summary', 'detailed', 'burndown', 'velocity'],
            description: 'Type of report',
          },
          assignee: { type: 'string', description: 'Filter by assignee' },
          dateFrom: { type: 'string', description: 'Report start date (ISO string)' },
          dateTo: { type: 'string', description: 'Report end date (ISO string)' },
        },
        required: ['reportType'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          reportType: { type: 'string' },
          generatedAt: { type: 'string' },
          data: { type: 'object' },
        },
      },
    },
    {
      name: 'setDeadline',
      description: 'Set or update the deadline for a task',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the task' },
          deadline: { type: 'string', description: 'New deadline (ISO string)' },
          notifyAssignee: {
            type: 'boolean',
            default: true,
            description: 'Whether to notify the assignee',
          },
          reason: { type: 'string', description: 'Reason for deadline change' },
        },
        required: ['taskId', 'deadline'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          previousDeadline: { type: 'string' },
          newDeadline: { type: 'string' },
          status: { type: 'string' },
        },
      },
    },
    {
      name: 'prioritizeTask',
      description: 'Set or update the priority of a task with optional reason',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the task' },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'New priority level',
          },
          reason: { type: 'string', description: 'Reason for priority change' },
        },
        required: ['taskId', 'priority'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          previousPriority: { type: 'string' },
          newPriority: { type: 'string' },
          status: { type: 'string' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:task', 'write:task', 'assign:task', 'report:task'],
  maxConcurrentTasks: 5,
  timeout: 30000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1000,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked' | 'cancelled';

interface TaskItem {
  id: string;
  title: string;
  description: string;
  projectId: string;
  assignee: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  deadline: Date | null;
  tags: string[];
  subtasks: Subtask[];
  estimatedHours: number;
  actualHours: number;
  comments: TaskComment[];
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskComment {
  id: string;
  author: string;
  text: string;
  createdAt: Date;
}

interface Project {
  id: string;
  name: string;
  description: string;
  taskIds: string[];
  createdAt: Date;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class TaskManagementAgentService extends BaseAgentService {
  private tasks: Map<string, TaskItem> = new Map();
  private projects: Map<string, Project> = new Map();
  private taskCounter: number = 0;

  protected defineConfig(): AgentConfig {
    return TASK_MANAGEMENT_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    // Register tools
    this.registerTool({
      name: 'createTask',
      description: 'Create a new task',
      execute: async (params: {
        title: string;
        description?: string;
        projectId?: string;
        assignee?: string;
        priority?: string;
        deadline?: string;
        tags?: string[];
        subtasks?: Array<{ title: string }>;
        estimatedHours?: number;
      }) => this.createTask(params),
    });

    this.registerTool({
      name: 'updateTask',
      description: 'Update an existing task',
      execute: async (params: {
        taskId: string;
        title?: string;
        description?: string;
        status?: string;
        assignee?: string;
        priority?: string;
        progress?: number;
        tags?: string[];
        actualHours?: number;
      }) => this.updateTask(params),
    });

    this.registerTool({
      name: 'assignTask',
      description: 'Assign a task to a user',
      execute: async (params: {
        taskId: string;
        assignee: string;
        message?: string;
        dueDate?: string;
      }) => this.assignTask(params),
    });

    this.registerTool({
      name: 'trackProgress',
      description: 'Track progress of tasks',
      execute: async (params: {
        projectId?: string;
        assignee?: string;
        status?: string;
        dateFrom?: string;
        dateTo?: string;
      }) => this.trackProgress(params),
    });

    this.registerTool({
      name: 'generateReport',
      description: 'Generate a report on tasks and projects',
      execute: async (params: {
        projectId?: string;
        reportType: string;
        assignee?: string;
        dateFrom?: string;
        dateTo?: string;
      }) => this.generateReport(params),
    });

    this.registerTool({
      name: 'setDeadline',
      description: 'Set or update the deadline for a task',
      execute: async (params: {
        taskId: string;
        deadline: string;
        notifyAssignee?: boolean;
        reason?: string;
      }) => this.setDeadline(params),
    });

    this.registerTool({
      name: 'prioritizeTask',
      description: 'Set or update the priority of a task',
      execute: async (params: { taskId: string; priority: string; reason?: string }) =>
        this.prioritizeTask(params),
    });

    await this.storeInWorkingMemory('task-mgmt:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('TaskManagement agent initialized with 7 tools');
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
      'createTask',
      'updateTask',
      'assignTask',
      'trackProgress',
      'generateReport',
      'setDeadline',
      'prioritizeTask',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown task management action: ${action}. Supported: ${supportedActions.join(', ')}`,
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
        `task-mgmt:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`TaskManagement execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.tasks.clear();
    this.projects.clear();
    this.taskCounter = 0;
    this.logger.log('TaskManagement agent destroyed, all data cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async createTask(params: {
    title: string;
    description?: string;
    projectId?: string;
    assignee?: string;
    priority?: string;
    deadline?: string;
    tags?: string[];
    subtasks?: Array<{ title: string }>;
    estimatedHours?: number;
  }): Promise<{
    taskId: string;
    status: string;
    createdAt: string;
  }> {
    const {
      title,
      description = '',
      projectId = '',
      assignee = '',
      priority = 'medium',
      deadline,
      tags = [],
      subtasks = [],
      estimatedHours = 0,
    } = params;

    if (!title || typeof title !== 'string') {
      throw new Error('A valid task title is required');
    }

    const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(priority as TaskPriority)) {
      throw new Error(`Invalid priority: ${priority}. Supported: ${validPriorities.join(', ')}`);
    }

    let deadlineDate: Date | null = null;
    if (deadline) {
      deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        throw new Error('Invalid deadline: must be a valid ISO date string');
      }
    }

    const taskId = this.generateTaskId();
    const taskSubtasks: Subtask[] = subtasks.map((st, i) => ({
      id: `${taskId}-sub-${i + 1}`,
      title: st.title,
      completed: false,
    }));

    const task: TaskItem = {
      id: taskId,
      title,
      description,
      projectId,
      assignee,
      priority: priority as TaskPriority,
      status: 'todo',
      progress: 0,
      deadline: deadlineDate,
      tags,
      subtasks: taskSubtasks,
      estimatedHours,
      actualHours: 0,
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    };

    this.tasks.set(taskId, task);

    // Add to project if specified
    if (projectId) {
      const project = this.projects.get(projectId);
      if (project) {
        project.taskIds.push(taskId);
      } else {
        // Auto-create project
        this.projects.set(projectId, {
          id: projectId,
          name: projectId,
          description: `Project ${projectId}`,
          taskIds: [taskId],
          createdAt: new Date(),
        });
      }
    }

    this.logger.log(`Created task: ${taskId}, title="${title}", priority=${priority}`);

    return {
      taskId,
      status: 'todo',
      createdAt: task.createdAt.toISOString(),
    };
  }

  private async updateTask(params: {
    taskId: string;
    title?: string;
    description?: string;
    status?: string;
    assignee?: string;
    priority?: string;
    progress?: number;
    tags?: string[];
    actualHours?: number;
  }): Promise<{
    taskId: string;
    updatedFields: string[];
    status: string;
  }> {
    const { taskId, title, description, status, assignee, priority, progress, tags, actualHours } =
      params;

    if (!taskId || typeof taskId !== 'string') {
      throw new Error('A valid taskId is required');
    }

    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const updatedFields: string[] = [];

    if (title !== undefined) {
      task.title = title;
      updatedFields.push('title');
    }
    if (description !== undefined) {
      task.description = description;
      updatedFields.push('description');
    }
    if (status !== undefined) {
      const validStatuses: TaskStatus[] = [
        'todo',
        'in_progress',
        'review',
        'done',
        'blocked',
        'cancelled',
      ];
      if (!validStatuses.includes(status as TaskStatus)) {
        throw new Error(`Invalid status: ${status}. Supported: ${validStatuses.join(', ')}`);
      }
      task.status = status as TaskStatus;
      updatedFields.push('status');

      // Auto-set progress and completion
      if (status === 'done') {
        task.progress = 100;
        task.completedAt = new Date();
      } else if (status === 'in_progress' && task.progress === 0) {
        task.progress = 10;
      }
    }
    if (assignee !== undefined) {
      task.assignee = assignee;
      updatedFields.push('assignee');
    }
    if (priority !== undefined) {
      const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
      if (!validPriorities.includes(priority as TaskPriority)) {
        throw new Error(`Invalid priority: ${priority}. Supported: ${validPriorities.join(', ')}`);
      }
      task.priority = priority as TaskPriority;
      updatedFields.push('priority');
    }
    if (progress !== undefined) {
      if (progress < 0 || progress > 100) {
        throw new Error('Progress must be between 0 and 100');
      }
      task.progress = progress;
      updatedFields.push('progress');

      // Auto-update status based on progress
      if (progress === 100 && task.status !== 'done') {
        task.status = 'done';
        task.completedAt = new Date();
      } else if (progress > 0 && task.status === 'todo') {
        task.status = 'in_progress';
      }
    }
    if (tags !== undefined) {
      task.tags = tags;
      updatedFields.push('tags');
    }
    if (actualHours !== undefined) {
      task.actualHours = actualHours;
      updatedFields.push('actualHours');
    }

    task.updatedAt = new Date();

    this.logger.log(`Updated task: ${taskId}, fields=[${updatedFields.join(',')}]`);

    return {
      taskId,
      updatedFields,
      status: task.status,
    };
  }

  private async assignTask(params: {
    taskId: string;
    assignee: string;
    message?: string;
    dueDate?: string;
  }): Promise<{
    taskId: string;
    assignee: string;
    previousAssignee: string;
    status: string;
  }> {
    const { taskId, assignee, message, dueDate } = params;

    if (!taskId || typeof taskId !== 'string') {
      throw new Error('A valid taskId is required');
    }
    if (!assignee || typeof assignee !== 'string') {
      throw new Error('A valid assignee is required');
    }

    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const previousAssignee = task.assignee;
    task.assignee = assignee;
    task.updatedAt = new Date();

    // Update deadline if specified
    if (dueDate) {
      const deadline = new Date(dueDate);
      if (!isNaN(deadline.getTime())) {
        task.deadline = deadline;
      }
    }

    // Add assignment comment
    if (message) {
      task.comments.push({
        id: `comment-${task.comments.length + 1}`,
        author: 'system',
        text: message,
        createdAt: new Date(),
      });
    }

    this.logger.log(`Assigned task: ${taskId}, from=${previousAssignee || 'none'} to=${assignee}`);

    return {
      taskId,
      assignee,
      previousAssignee,
      status: 'assigned',
    };
  }

  private async trackProgress(params: {
    projectId?: string;
    assignee?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    averageProgress: number;
    tasks: TaskItem[];
  }> {
    const { projectId, assignee, status, dateFrom, dateTo } = params;

    let filteredTasks = Array.from(this.tasks.values());

    // Filter by project
    if (projectId) {
      const project = this.projects.get(projectId);
      if (project) {
        const projectTaskIds = new Set(project.taskIds);
        filteredTasks = filteredTasks.filter((t) => projectTaskIds.has(t.id));
      }
    }

    // Filter by assignee
    if (assignee) {
      filteredTasks = filteredTasks.filter((t) => t.assignee === assignee);
    }

    // Filter by status
    if (status) {
      filteredTasks = filteredTasks.filter((t) => t.status === status);
    }

    // Filter by date range
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!isNaN(from.getTime())) {
        filteredTasks = filteredTasks.filter((t) => t.createdAt >= from);
      }
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (!isNaN(to.getTime())) {
        filteredTasks = filteredTasks.filter((t) => t.createdAt <= to);
      }
    }

    // Calculate metrics
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter((t) => t.status === 'done').length;
    const inProgressTasks = filteredTasks.filter(
      (t) => t.status === 'in_progress' || t.status === 'review',
    ).length;

    const now = new Date();
    const overdueTasks = filteredTasks.filter(
      (t) => t.deadline && t.deadline < now && t.status !== 'done' && t.status !== 'cancelled',
    ).length;

    const averageProgress =
      totalTasks > 0
        ? Math.round(filteredTasks.reduce((sum, t) => sum + t.progress, 0) / totalTasks)
        : 0;

    this.logger.log(
      `Tracked progress: total=${totalTasks}, done=${completedTasks}, in-progress=${inProgressTasks}, overdue=${overdueTasks}`,
    );

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      averageProgress,
      tasks: filteredTasks,
    };
  }

  private async generateReport(params: {
    projectId?: string;
    reportType: string;
    assignee?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    reportType: string;
    generatedAt: string;
    data: any;
  }> {
    const { projectId, reportType, assignee, dateFrom, dateTo } = params;

    if (!reportType || typeof reportType !== 'string') {
      throw new Error('A valid reportType is required');
    }

    const validReportTypes = ['summary', 'detailed', 'burndown', 'velocity'];
    if (!validReportTypes.includes(reportType)) {
      throw new Error(
        `Invalid reportType: ${reportType}. Supported: ${validReportTypes.join(', ')}`,
      );
    }

    // Get filtered tasks
    let filteredTasks = Array.from(this.tasks.values());

    if (projectId) {
      const project = this.projects.get(projectId);
      if (project) {
        const projectTaskIds = new Set(project.taskIds);
        filteredTasks = filteredTasks.filter((t) => projectTaskIds.has(t.id));
      }
    }

    if (assignee) {
      filteredTasks = filteredTasks.filter((t) => t.assignee === assignee);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!isNaN(from.getTime())) {
        filteredTasks = filteredTasks.filter((t) => t.createdAt >= from);
      }
    }

    if (dateTo) {
      const to = new Date(dateTo);
      if (!isNaN(to.getTime())) {
        filteredTasks = filteredTasks.filter((t) => t.createdAt <= to);
      }
    }

    const now = new Date();
    const generatedAt = now.toISOString();

    let data: any;

    switch (reportType) {
      case 'summary': {
        const byStatus: Record<string, number> = {};
        const byPriority: Record<string, number> = {};
        const byAssignee: Record<string, number> = {};

        for (const task of filteredTasks) {
          byStatus[task.status] = (byStatus[task.status] || 0) + 1;
          byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
          if (task.assignee) {
            byAssignee[task.assignee] = (byAssignee[task.assignee] || 0) + 1;
          }
        }

        const totalEstimated = filteredTasks.reduce((s, t) => s + t.estimatedHours, 0);
        const totalActual = filteredTasks.reduce((s, t) => s + t.actualHours, 0);
        const overdue = filteredTasks.filter(
          (t) => t.deadline && t.deadline < now && t.status !== 'done' && t.status !== 'cancelled',
        ).length;

        data = {
          totalTasks: filteredTasks.length,
          byStatus,
          byPriority,
          byAssignee,
          totalEstimatedHours: totalEstimated,
          totalActualHours: totalActual,
          varianceHours: totalActual - totalEstimated,
          overdueTasks: overdue,
          completionRate:
            filteredTasks.length > 0
              ? Math.round(((byStatus['done'] || 0) / filteredTasks.length) * 100)
              : 0,
        };
        break;
      }
      case 'detailed': {
        data = {
          tasks: filteredTasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            assignee: t.assignee,
            progress: t.progress,
            deadline: t.deadline?.toISOString() || null,
            isOverdue: t.deadline
              ? t.deadline < now && t.status !== 'done' && t.status !== 'cancelled'
              : false,
            estimatedHours: t.estimatedHours,
            actualHours: t.actualHours,
            subtaskCompletion:
              t.subtasks.length > 0
                ? `${t.subtasks.filter((s) => s.completed).length}/${t.subtasks.length}`
                : 'N/A',
            createdAt: t.createdAt.toISOString(),
            completedAt: t.completedAt?.toISOString() || null,
          })),
        };
        break;
      }
      case 'burndown': {
        // Generate daily burndown data
        const completedTasksByDay: Record<string, number> = {};
        const createdTasksByDay: Record<string, number> = {};

        for (const task of filteredTasks) {
          const createdDay = task.createdAt.toISOString().split('T')[0];
          createdTasksByDay[createdDay] = (createdTasksByDay[createdDay] || 0) + 1;

          if (task.completedAt) {
            const completedDay = task.completedAt.toISOString().split('T')[0];
            completedTasksByDay[completedDay] = (completedTasksByDay[completedDay] || 0) + 1;
          }
        }

        data = {
          totalTasks: filteredTasks.length,
          completedTasks: filteredTasks.filter((t) => t.status === 'done').length,
          remainingTasks: filteredTasks.filter(
            (t) => t.status !== 'done' && t.status !== 'cancelled',
          ).length,
          createdTasksByDay,
          completedTasksByDay,
          idealBurndownRate:
            filteredTasks.length > 0
              ? filteredTasks.length /
                Math.max(
                  1,
                  Math.ceil(
                    (now.getTime() - Math.min(...filteredTasks.map((t) => t.createdAt.getTime()))) /
                      86400000,
                  ),
                )
              : 0,
        };
        break;
      }
      case 'velocity': {
        // Calculate weekly velocity
        const weeklyCompleted: Record<string, number> = {};

        for (const task of filteredTasks) {
          if (task.completedAt) {
            const weekStart = this.getWeekStart(task.completedAt);
            const weekKey = weekStart.toISOString().split('T')[0];
            weeklyCompleted[weekKey] = (weeklyCompleted[weekKey] || 0) + 1;
          }
        }

        const completedCounts = Object.values(weeklyCompleted);
        const avgVelocity =
          completedCounts.length > 0
            ? completedCounts.reduce((a, b) => a + b, 0) / completedCounts.length
            : 0;

        const totalRemaining = filteredTasks.filter(
          (t) => t.status !== 'done' && t.status !== 'cancelled',
        ).length;

        data = {
          weeklyCompleted,
          averageWeeklyVelocity: Math.round(avgVelocity * 10) / 10,
          totalRemaining,
          estimatedWeeksToComplete:
            avgVelocity > 0 ? Math.ceil(totalRemaining / avgVelocity) : Infinity,
        };
        break;
      }
    }

    this.logger.log(`Generated ${reportType} report: ${filteredTasks.length} task(s) analyzed`);

    return {
      reportType,
      generatedAt,
      data,
    };
  }

  private async setDeadline(params: {
    taskId: string;
    deadline: string;
    notifyAssignee?: boolean;
    reason?: string;
  }): Promise<{
    taskId: string;
    previousDeadline: string | null;
    newDeadline: string;
    status: string;
  }> {
    const { taskId, deadline, notifyAssignee = true, reason } = params;

    if (!taskId || typeof taskId !== 'string') {
      throw new Error('A valid taskId is required');
    }
    if (!deadline || typeof deadline !== 'string') {
      throw new Error('A valid deadline is required');
    }

    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      throw new Error('Invalid deadline: must be a valid ISO date string');
    }

    const previousDeadline = task.deadline?.toISOString() || null;
    task.deadline = deadlineDate;
    task.updatedAt = new Date();

    // Add comment about deadline change
    if (reason) {
      task.comments.push({
        id: `comment-${task.comments.length + 1}`,
        author: 'system',
        text: `Deadline changed to ${deadlineDate.toISOString()}. Reason: ${reason}`,
        createdAt: new Date(),
      });
    }

    this.logger.log(
      `Set deadline for task: ${taskId}, from=${previousDeadline || 'none'} to=${deadlineDate.toISOString()}`,
    );

    return {
      taskId,
      previousDeadline,
      newDeadline: deadlineDate.toISOString(),
      status: 'updated',
    };
  }

  private async prioritizeTask(params: {
    taskId: string;
    priority: string;
    reason?: string;
  }): Promise<{
    taskId: string;
    previousPriority: string;
    newPriority: string;
    status: string;
  }> {
    const { taskId, priority, reason } = params;

    if (!taskId || typeof taskId !== 'string') {
      throw new Error('A valid taskId is required');
    }

    const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(priority as TaskPriority)) {
      throw new Error(`Invalid priority: ${priority}. Supported: ${validPriorities.join(', ')}`);
    }

    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const previousPriority = task.priority;
    task.priority = priority as TaskPriority;
    task.updatedAt = new Date();

    // Add comment about priority change
    if (reason) {
      task.comments.push({
        id: `comment-${task.comments.length + 1}`,
        author: 'system',
        text: `Priority changed from ${previousPriority} to ${priority}. Reason: ${reason}`,
        createdAt: new Date(),
      });
    }

    this.logger.log(`Prioritized task: ${taskId}, from=${previousPriority} to=${priority}`);

    return {
      taskId,
      previousPriority,
      newPriority: priority,
      status: 'updated',
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private generateTaskId(): string {
    this.taskCounter++;
    return `task-${Date.now()}-${this.taskCounter}`;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
