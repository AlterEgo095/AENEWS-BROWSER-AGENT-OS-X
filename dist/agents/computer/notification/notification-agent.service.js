"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationAgentService = exports.NOTIFICATION_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.NOTIFICATION_AGENT_CONFIG = {
    id: 'computer-notification',
    name: 'Notification',
    cluster: agent_interface_1.AgentCluster.COMPUTER,
    version: '1.0.0',
    description: 'Handle system notifications, send alerts, and set reminders. Supports desktop notifications, priority levels, scheduling, and notification history management with auto-expiry.',
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
let NotificationAgentService = class NotificationAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.notifications = new Map();
        this.reminders = new Map();
        this.notificationCounter = 0;
        this.reminderCounter = 0;
        this.reminderCheckInterval = null;
    }
    defineConfig() {
        return exports.NOTIFICATION_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'sendNotification',
            description: 'Send a desktop notification',
            execute: async (params) => this.sendNotification(params.title, params.body, params.priority || 'normal', params.category || 'general', params.icon, params.actions || [], params.silent || false, params.scheduleAt),
        });
        this.registerTool({
            name: 'listNotifications',
            description: 'List notifications with filtering',
            execute: async (params) => this.listNotifications(params.filter, params.priority, params.status || 'all', params.limit || 50, params.offset || 0),
        });
        this.registerTool({
            name: 'clearNotifications',
            description: 'Clear notifications',
            execute: async (params) => this.clearNotifications(params.clearAll || false, params.notificationIds, params.olderThan, params.category),
        });
        this.registerTool({
            name: 'setReminder',
            description: 'Set a timed reminder',
            execute: async (params) => this.setReminder(params.title, params.body || '', params.triggerAt, params.recurrence || 'none', params.priority || 'normal', params.category || 'reminder'),
        });
        this.startReminderCheck();
        await this.storeInWorkingMemory('notif:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Notification agent initialized with 4 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.DeliveryCapability.NOTIFICATION, {
                    missionId: input.taskId,
                    instruction: JSON.stringify(input.payload),
                    workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
                    parameters: input.payload,
                });
                return this.createAgentOutput(input.taskId, result.success, result.output, result.error, startTime);
            }
            catch (error) {
                this.logger.warn(`Bridge failed, fallback: ${error.message}`);
            }
        }
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'sendNotification',
            'listNotifications',
            'clearNotifications',
            'setReminder',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown notification action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Notification execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        if (this.reminderCheckInterval) {
            clearInterval(this.reminderCheckInterval);
            this.reminderCheckInterval = null;
        }
        this.notifications.clear();
        this.reminders.clear();
        this.logger.log('Notification agent destroyed, all notifications and reminders cleared');
    }
    async sendNotification(title, body, priority = 'normal', category = 'general', icon, actions = [], silent = false, scheduleAt) {
        if (!title || typeof title !== 'string') {
            throw new Error('Notification title is required');
        }
        if (!body || typeof body !== 'string') {
            throw new Error('Notification body is required');
        }
        const validPriorities = ['low', 'normal', 'high', 'critical'];
        if (!validPriorities.includes(priority)) {
            throw new Error(`Invalid priority: ${priority}. Must be one of: ${validPriorities.join(', ')}`);
        }
        if (scheduleAt) {
            const scheduledTime = new Date(scheduleAt);
            if (isNaN(scheduledTime.getTime())) {
                throw new Error(`Invalid schedule timestamp: ${scheduleAt}`);
            }
            if (scheduledTime.getTime() <= Date.now()) {
                throw new Error('Schedule time must be in the future');
            }
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
        const expiresAt = new Date(now.getTime() + 86400000);
        const notification = {
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
        await this.storeInWorkingMemory(`notif:${notificationId}`, { title, priority, category, deliveredAt: now.toISOString() }, 300000);
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
    async listNotifications(filter, priority, status = 'all', limit = 50, offset = 0) {
        let entries = Array.from(this.notifications.values());
        if (filter) {
            const filterLower = filter.toLowerCase();
            entries = entries.filter((n) => n.title.toLowerCase().includes(filterLower) ||
                n.category.toLowerCase().includes(filterLower) ||
                n.body.toLowerCase().includes(filterLower));
        }
        if (priority) {
            entries = entries.filter((n) => n.priority === priority);
        }
        if (status !== 'all') {
            entries = entries.filter((n) => n.readStatus === status);
        }
        entries.sort((a, b) => b.deliveredAt.getTime() - a.deliveredAt.getTime());
        const total = entries.length;
        const unreadCount = Array.from(this.notifications.values()).filter((n) => n.readStatus === 'unread').length;
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
    async clearNotifications(clearAll = false, notificationIds, olderThan, category) {
        let clearedCount = 0;
        if (clearAll) {
            clearedCount = this.notifications.size;
            this.notifications.clear();
        }
        else if (notificationIds && notificationIds.length > 0) {
            for (const id of notificationIds) {
                if (this.notifications.has(id)) {
                    this.notifications.delete(id);
                    clearedCount++;
                }
            }
        }
        else if (olderThan) {
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
        }
        else if (category) {
            for (const [id, notification] of this.notifications) {
                if (notification.category === category) {
                    this.notifications.delete(id);
                    clearedCount++;
                }
            }
        }
        else {
            throw new Error('Must specify clearAll, notificationIds, olderThan, or category');
        }
        this.logger.log(`Cleared ${clearedCount} notifications`);
        return {
            cleared: true,
            count: clearedCount,
            clearedAt: new Date().toISOString(),
        };
    }
    async setReminder(title, body = '', triggerAt, recurrence = 'none', priority = 'normal', category = 'reminder') {
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
        const validRecurrences = ['none', 'daily', 'weekly', 'monthly'];
        if (!validRecurrences.includes(recurrence)) {
            throw new Error(`Invalid recurrence: ${recurrence}. Must be one of: ${validRecurrences.join(', ')}`);
        }
        const reminderId = `rem-${++this.reminderCounter}-${Date.now()}`;
        const reminder = {
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
        await this.storeInWorkingMemory(`reminder:${reminderId}`, { title, triggerAt: triggerTime.toISOString(), recurrence, status: 'pending' }, 86400000);
        this.logger.log(`Reminder set: ${reminderId} ("${title}", trigger: ${triggerTime.toISOString()}, recurrence: ${recurrence})`);
        return {
            reminderId,
            title,
            triggerAt: triggerTime.toISOString(),
            recurrence,
            status: 'pending',
        };
    }
    startReminderCheck() {
        this.reminderCheckInterval = setInterval(() => {
            this.checkReminders();
        }, 10000);
        this.logger.log('Reminder check interval started (10s)');
    }
    checkReminders() {
        const now = Date.now();
        for (const [id, reminder] of this.reminders) {
            if (reminder.status !== 'pending')
                continue;
            if (reminder.triggerAt.getTime() <= now) {
                const notificationId = `notif-${++this.notificationCounter}-${Date.now()}`;
                const notification = {
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
                if (reminder.recurrence !== 'none') {
                    reminder.triggerAt = this.calculateNextOccurrence(reminder.triggerAt, reminder.recurrence);
                    this.logger.log(`Recurring reminder triggered: ${id}, next: ${reminder.triggerAt.toISOString()}`);
                }
                else {
                    reminder.status = 'triggered';
                    this.logger.log(`Reminder triggered: ${id} ("${reminder.title}")`);
                }
            }
        }
    }
    calculateNextOccurrence(currentTrigger, recurrence) {
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
        if (next.getTime() <= Date.now()) {
            return this.calculateNextOccurrence(next, recurrence);
        }
        return next;
    }
};
exports.NotificationAgentService = NotificationAgentService;
exports.NotificationAgentService = NotificationAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], NotificationAgentService);
//# sourceMappingURL=notification-agent.service.js.map