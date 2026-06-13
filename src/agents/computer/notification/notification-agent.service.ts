/**
 * AENEWS Agent OS X - Notification Agent
 * Handle system notifications, send alerts, set reminders.
 * Simulates notification management for environments without direct OS notification access.
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
import { DeliveryCapability } from '../../../software-factory/interfaces';

// ─── Agent Configuration ──────────────────────────────────────────

export const NOTIFICATION_AGENT_CONFIG: AgentConfig = {
  id: 'computer-notification',
  name: 'Notification',
  cluster: AgentCluster.COMPUTER,
  version: '1.0.0',
  description:
    'Handle system notifications, send alerts, and set reminders. Supports desktop notifications, priority levels, scheduling, and notification history management with auto-expiry.',
  capabilities: [
    {
      name: 'sendNotification',
      description: 'Send a desktop notification with title, body, and optional actions',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Notification title' },
          body: { type: 'string', description: 'Notification body text' },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high', 'critical'],
            default: 'normal',
          },
          category: {
            type: 'string',
            description: 'Notification category (e.g., system, task, alert)',
          },
          icon: { type: 'string', description: 'Icon path or name' },
          actions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Action button labels',
          },
          silent: { type: 'boolean', default: false, description: 'Suppress sound' },
          scheduleAt: { type: 'string', description: 'ISO timestamp for scheduled delivery' },
        },
        required: ['title', 'body'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          notificationId: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
          deliveredAt: { type: 'string' },
        },
      },
    },
    {
      name: 'listNotifications',
      description: 'List notifications with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          filter: { type: 'string', description: 'Filter by title or category' },
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'critical'] },
          status: { type: 'string', enum: ['unread', 'read', 'all'], default: 'all' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          notifications: { type: 'array' },
          total: { type: 'number' },
          unreadCount: { type: 'number' },
        },
      },
    },
    {
      name: 'clearNotifications',
      description: 'Clear notifications, optionally filtered by criteria',
      inputSchema: {
        type: 'object',
        properties: {
          clearAll: { type: 'boolean', default: false, description: 'Clear all notifications' },
          notificationIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific IDs to clear',
          },
          olderThan: { type: 'string', description: 'ISO timestamp - clear older than this' },
          category: { type: 'string', description: 'Clear by category' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          cleared: { type: 'boolean' },
          count: { type: 'number' },
          clearedAt: { type: 'string' },
        },
      },
    },
    {
      name: 'setReminder',
      description: 'Set a reminder that will trigger a notification at the specified time',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Reminder title' },
          body: { type: 'string', description: 'Reminder body text' },
          triggerAt: { type: 'string', description: 'ISO timestamp when to trigger' },
          recurrence: {
            type: 'string',
            enum: ['none', 'daily', 'weekly', 'monthly'],
            default: 'none',
            description: 'Recurrence pattern',
          },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high', 'critical'],
            default: 'normal',
          },
          category: { type: 'string', default: 'reminder' },
        },
        required: ['title', 'triggerAt'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          reminderId: { type: 'string' },
          title: { type: 'string' },
          triggerAt: { type: 'string' },
          recurrence: { type: 'string' },
          status: { type: 'string' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'send:notification',
    'read:notification',
    'clear:notification',
    'set:reminder',
  ],
  maxConcurrentTasks: 10,
  timeout: 10000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 500,
    exponentialBackoff: true,
  },
};

// ─── Notification Types ───────────────────────────────────────────

type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';
type NotificationReadStatus = 'unread' | 'read';
type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly';

interface NotificationEntry {
  id: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  category: string;
  icon?: string;
  actions: string[];
  silent: boolean;
  readStatus: NotificationReadStatus;
  deliveredAt: Date;
  expiresAt?: Date;
}

interface ReminderEntry {
  id: string;
  title: string;
  body: string;
  triggerAt: Date;
  recurrence: RecurrencePattern;
  priority: NotificationPriority;
  category: string;
  status: 'pending' | 'triggered' | 'dismissed';
  createdAt: Date;
  lastTriggeredAt?: Date;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class NotificationAgentService extends BaseAgentService {
  private notifications: Map<string, NotificationEntry> = new Map();

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }
  private reminders: Map<string, ReminderEntry> = new Map();
  private notificationCounter = 0;
  private reminderCounter = 0;
  private reminderCheckInterval: NodeJS.Timer | null = null;

  protected defineConfig(): AgentConfig {
    return NOTIFICATION_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    // Register tools
    this.registerTool({
      name: 'sendNotification',
      description: 'Send a desktop notification',
      execute: async (params: {
        title: string;
        body: string;
        priority?: NotificationPriority;
        category?: string;
        icon?: string;
        actions?: string[];
        silent?: boolean;
        scheduleAt?: string;
      }) =>
        this.sendNotification(
          params.title,
          params.body,
          params.priority || 'normal',
          params.category || 'general',
          params.icon,
          params.actions || [],
          params.silent || false,
          params.scheduleAt,
        ),
    });

    this.registerTool({
      name: 'listNotifications',
      description: 'List notifications with filtering',
      execute: async (params: {
        filter?: string;
        priority?: NotificationPriority;
        status?: 'unread' | 'read' | 'all';
        limit?: number;
        offset?: number;
      }) =>
        this.listNotifications(
          params.filter,
          params.priority,
          params.status || 'all',
          params.limit || 50,
          params.offset || 0,
        ),
    });

    this.registerTool({
      name: 'clearNotifications',
      description: 'Clear notifications',
      execute: async (params: {
        clearAll?: boolean;
        notificationIds?: string[];
        olderThan?: string;
        category?: string;
      }) =>
        this.clearNotifications(
          params.clearAll || false,
          params.notificationIds,
          params.olderThan,
          params.category,
        ),
    });

    this.registerTool({
      name: 'setReminder',
      description: 'Set a timed reminder',
      execute: async (params: {
        title: string;
        body?: string;
        triggerAt: string;
        recurrence?: RecurrencePattern;
        priority?: NotificationPriority;
        category?: string;
      }) =>
        this.setReminder(
          params.title,
          params.body || '',
          params.triggerAt,
          params.recurrence || 'none',
          params.priority || 'normal',
          params.category || 'reminder',
        ),
    });

    // Start reminder check interval
    this.startReminderCheck();

    await this.storeInWorkingMemory('notif:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('Notification agent initialized with 4 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    // Bridge delegation — use real connector if available
    if (this.bridge) {
      try {
        const result = await this.bridge.executeCapability(DeliveryCapability.NOTIFICATION, {
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
      'sendNotification',
      'listNotifications',
      'clearNotifications',
      'setReminder',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown notification action: ${action}. Supported: ${supportedActions.join(', ')}`,
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
      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Notification execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    if (this.reminderCheckInterval) {
      clearInterval(this.reminderCheckInterval as any);
      this.reminderCheckInterval = null;
    }

    this.notifications.clear();
    this.reminders.clear();
    this.logger.log('Notification agent destroyed, all notifications and reminders cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async sendNotification(
    title: string,
    body: string,
    priority: NotificationPriority = 'normal',
    category: string = 'general',
    icon?: string,
    actions: string[] = [],
    silent: boolean = false,
    scheduleAt?: string,
  ): Promise<{
    notificationId: string;
    title: string;
    status: string;
    deliveredAt: string;
  }> {
    if (!title || typeof title !== 'string') {
      throw new Error('Notification title is required');
    }
    if (!body || typeof body !== 'string') {
      throw new Error('Notification body is required');
    }

    // Validate priority
    const validPriorities: NotificationPriority[] = ['low', 'normal', 'high', 'critical'];
    if (!validPriorities.includes(priority)) {
      throw new Error(
        `Invalid priority: ${priority}. Must be one of: ${validPriorities.join(', ')}`,
      );
    }

    // Handle scheduling
    if (scheduleAt) {
      const scheduledTime = new Date(scheduleAt);
      if (isNaN(scheduledTime.getTime())) {
        throw new Error(`Invalid schedule timestamp: ${scheduleAt}`);
      }
      if (scheduledTime.getTime() <= Date.now()) {
        throw new Error('Schedule time must be in the future');
      }

      // Store as a reminder that will trigger a notification
      const reminder = await this.setReminder(title, body, scheduleAt, 'none', priority, category);

      this.logger.log(`Notification scheduled as reminder: ${reminder.reminderId}`);
      return {
        notificationId: reminder.reminderId,
        title,
        status: 'scheduled',
        deliveredAt: scheduledTime.toISOString(),
      };
    }

    const notificationId = `notif-${++this.notificationCounter}-${Date.now()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 86400000); // 24 hour expiry

    const notification: NotificationEntry = {
      id: notificationId,
      title,
      body,
      priority,
      category,
      icon,
      actions,
      silent,
      readStatus: 'unread',
      deliveredAt: now,
      expiresAt,
    };

    this.notifications.set(notificationId, notification);

    await this.storeInWorkingMemory(
      `notif:${notificationId}`,
      { title, priority, category, deliveredAt: now.toISOString() },
      300000,
    );

    // Emit event for high/critical notifications
    if (priority === 'high' || priority === 'critical') {
      this.logger.warn(`High-priority notification sent: [${priority}] ${title}`);
    }

    this.logger.log(`Notification sent: ${notificationId} ("${title}", priority: ${priority})`);
    return {
      notificationId,
      title,
      status: 'delivered',
      deliveredAt: now.toISOString(),
    };
  }

  private async listNotifications(
    filter?: string,
    priority?: NotificationPriority,
    status: 'unread' | 'read' | 'all' = 'all',
    limit: number = 50,
    offset: number = 0,
  ): Promise<{
    notifications: Array<{
      id: string;
      title: string;
      body: string;
      priority: NotificationPriority;
      category: string;
      readStatus: NotificationReadStatus;
      deliveredAt: string;
    }>;
    total: number;
    unreadCount: number;
  }> {
    let entries = Array.from(this.notifications.values());

    // Apply filters
    if (filter) {
      const filterLower = filter.toLowerCase();
      entries = entries.filter(
        (n) =>
          n.title.toLowerCase().includes(filterLower) ||
          n.category.toLowerCase().includes(filterLower) ||
          n.body.toLowerCase().includes(filterLower),
      );
    }

    if (priority) {
      entries = entries.filter((n) => n.priority === priority);
    }

    if (status !== 'all') {
      entries = entries.filter((n) => n.readStatus === status);
    }

    // Sort by delivery time (newest first)
    entries.sort((a, b) => b.deliveredAt.getTime() - a.deliveredAt.getTime());

    const total = entries.length;
    const unreadCount = Array.from(this.notifications.values()).filter(
      (n) => n.readStatus === 'unread',
    ).length;

    const paginated = entries.slice(offset, offset + limit).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body.substring(0, 200),
      priority: n.priority,
      category: n.category,
      readStatus: n.readStatus,
      deliveredAt: n.deliveredAt.toISOString(),
    }));

    this.logger.log(`Listed notifications: ${paginated.length}/${total} (unread: ${unreadCount})`);
    return { notifications: paginated, total, unreadCount };
  }

  private async clearNotifications(
    clearAll: boolean = false,
    notificationIds?: string[],
    olderThan?: string,
    category?: string,
  ): Promise<{
    cleared: boolean;
    count: number;
    clearedAt: string;
  }> {
    let clearedCount = 0;

    if (clearAll) {
      clearedCount = this.notifications.size;
      this.notifications.clear();
    } else if (notificationIds && notificationIds.length > 0) {
      for (const id of notificationIds) {
        if (this.notifications.has(id)) {
          this.notifications.delete(id);
          clearedCount++;
        }
      }
    } else if (olderThan) {
      const cutoffTime = new Date(olderThan);
      if (isNaN(cutoffTime.getTime())) {
        throw new Error(`Invalid olderThan timestamp: ${olderThan}`);
      }
      for (const [id, notification] of this.notifications) {
        if (notification.deliveredAt < cutoffTime) {
          this.notifications.delete(id);
          clearedCount++;
        }
      }
    } else if (category) {
      for (const [id, notification] of this.notifications) {
        if (notification.category === category) {
          this.notifications.delete(id);
          clearedCount++;
        }
      }
    } else {
      throw new Error('Must specify clearAll, notificationIds, olderThan, or category');
    }

    this.logger.log(`Cleared ${clearedCount} notifications`);
    return {
      cleared: true,
      count: clearedCount,
      clearedAt: new Date().toISOString(),
    };
  }

  private async setReminder(
    title: string,
    body: string = '',
    triggerAt: string,
    recurrence: RecurrencePattern = 'none',
    priority: NotificationPriority = 'normal',
    category: string = 'reminder',
  ): Promise<{
    reminderId: string;
    title: string;
    triggerAt: string;
    recurrence: RecurrencePattern;
    status: string;
  }> {
    if (!title || typeof title !== 'string') {
      throw new Error('Reminder title is required');
    }

    const triggerTime = new Date(triggerAt);
    if (isNaN(triggerTime.getTime())) {
      throw new Error(`Invalid trigger timestamp: ${triggerAt}`);
    }

    if (triggerTime.getTime() <= Date.now() && recurrence === 'none') {
      throw new Error('Trigger time must be in the future for non-recurring reminders');
    }

    const validRecurrences: RecurrencePattern[] = ['none', 'daily', 'weekly', 'monthly'];
    if (!validRecurrences.includes(recurrence)) {
      throw new Error(
        `Invalid recurrence: ${recurrence}. Must be one of: ${validRecurrences.join(', ')}`,
      );
    }

    const reminderId = `rem-${++this.reminderCounter}-${Date.now()}`;
    const reminder: ReminderEntry = {
      id: reminderId,
      title,
      body,
      triggerAt: triggerTime,
      recurrence,
      priority,
      category,
      status: 'pending',
      createdAt: new Date(),
    };

    this.reminders.set(reminderId, reminder);

    await this.storeInWorkingMemory(
      `reminder:${reminderId}`,
      { title, triggerAt: triggerTime.toISOString(), recurrence, status: 'pending' },
      86400000, // 24h TTL
    );

    this.logger.log(
      `Reminder set: ${reminderId} ("${title}", trigger: ${triggerTime.toISOString()}, recurrence: ${recurrence})`,
    );
    return {
      reminderId,
      title,
      triggerAt: triggerTime.toISOString(),
      recurrence,
      status: 'pending',
    };
  }

  // ─── Reminder Check ─────────────────────────────────────────────

  private startReminderCheck(): void {
    this.reminderCheckInterval = setInterval(() => {
      this.checkReminders();
    }, 10000); // Check every 10 seconds

    this.logger.log('Reminder check interval started (10s)');
  }

  private checkReminders(): void {
    const now = Date.now();

    for (const [id, reminder] of this.reminders) {
      if (reminder.status !== 'pending') continue;

      if (reminder.triggerAt.getTime() <= now) {
        // Trigger the reminder as a notification
        const notificationId = `notif-${++this.notificationCounter}-${Date.now()}`;
        const notification: NotificationEntry = {
          id: notificationId,
          title: `⏰ ${reminder.title}`,
          body: reminder.body || `Reminder: ${reminder.title}`,
          priority: reminder.priority,
          category: reminder.category,
          icon: 'alarm',
          actions: ['Dismiss', 'Snooze'],
          silent: false,
          readStatus: 'unread',
          deliveredAt: new Date(),
          expiresAt: new Date(now + 86400000),
        };

        this.notifications.set(notificationId, notification);
        reminder.lastTriggeredAt = new Date();

        // Handle recurrence
        if (reminder.recurrence !== 'none') {
          reminder.triggerAt = this.calculateNextOccurrence(
            reminder.triggerAt,
            reminder.recurrence,
          );
          this.logger.log(
            `Recurring reminder triggered: ${id}, next: ${reminder.triggerAt.toISOString()}`,
          );
        } else {
          reminder.status = 'triggered';
          this.logger.log(`Reminder triggered: ${id} ("${reminder.title}")`);
        }
      }
    }
  }

  private calculateNextOccurrence(currentTrigger: Date, recurrence: RecurrencePattern): Date {
    const next = new Date(currentTrigger);

    switch (recurrence) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        break;
    }

    // Ensure next occurrence is in the future
    if (next.getTime() <= Date.now()) {
      return this.calculateNextOccurrence(next, recurrence);
    }

    return next;
  }
}
