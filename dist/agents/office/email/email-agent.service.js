"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailAgentService = exports.EMAIL_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.EMAIL_AGENT_CONFIG = {
    id: 'office-email',
    name: 'Email',
    cluster: agent_interface_1.AgentCluster.OFFICE,
    version: '1.0.0',
    description: 'Email management agent that handles composing, sending, reading, replying, forwarding, searching, and organizing emails with folder-based organization.',
    capabilities: [
        {
            name: 'compose',
            description: 'Compose a new email with recipients, subject, body, and optional attachments',
            inputSchema: {
                type: 'object',
                properties: {
                    to: { type: 'array', items: { type: 'string' }, description: 'List of recipient email addresses' },
                    cc: { type: 'array', items: { type: 'string' }, description: 'CC recipients' },
                    bcc: { type: 'array', items: { type: 'string' }, description: 'BCC recipients' },
                    subject: { type: 'string', description: 'Email subject line' },
                    body: { type: 'string', description: 'Email body content (plain text or HTML)' },
                    attachments: { type: 'array', items: { type: 'object' }, description: 'List of attachments' },
                    priority: { type: 'string', enum: ['low', 'normal', 'high'], description: 'Email priority' },
                },
                required: ['to', 'subject', 'body'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    emailId: { type: 'string' },
                    status: { type: 'string' },
                    composedAt: { type: 'string' },
                },
            },
        },
        {
            name: 'send',
            description: 'Send a composed or draft email',
            inputSchema: {
                type: 'object',
                properties: {
                    emailId: { type: 'string', description: 'ID of the email to send' },
                    scheduleAt: { type: 'string', description: 'ISO timestamp for scheduled sending' },
                },
                required: ['emailId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    emailId: { type: 'string' },
                    sentAt: { type: 'string' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'read',
            description: 'Read an email by ID, marking it as read',
            inputSchema: {
                type: 'object',
                properties: {
                    emailId: { type: 'string', description: 'ID of the email to read' },
                    markAsRead: { type: 'boolean', default: true, description: 'Whether to mark the email as read' },
                },
                required: ['emailId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    email: { type: 'object' },
                    readAt: { type: 'string' },
                },
            },
        },
        {
            name: 'reply',
            description: 'Reply to an existing email',
            inputSchema: {
                type: 'object',
                properties: {
                    emailId: { type: 'string', description: 'ID of the email to reply to' },
                    body: { type: 'string', description: 'Reply body content' },
                    replyAll: { type: 'boolean', default: false, description: 'Whether to reply to all recipients' },
                    attachments: { type: 'array', items: { type: 'object' }, description: 'Attachments for the reply' },
                },
                required: ['emailId', 'body'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    replyId: { type: 'string' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'forward',
            description: 'Forward an email to other recipients',
            inputSchema: {
                type: 'object',
                properties: {
                    emailId: { type: 'string', description: 'ID of the email to forward' },
                    to: { type: 'array', items: { type: 'string' }, description: 'Recipients to forward to' },
                    message: { type: 'string', description: 'Additional message for the forwarded email' },
                },
                required: ['emailId', 'to'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    forwardedId: { type: 'string' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'search',
            description: 'Search emails by query, sender, date range, or folder',
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search query string' },
                    from: { type: 'string', description: 'Filter by sender' },
                    to: { type: 'string', description: 'Filter by recipient' },
                    subject: { type: 'string', description: 'Filter by subject' },
                    folder: { type: 'string', description: 'Filter by folder' },
                    dateFrom: { type: 'string', description: 'Start date for search (ISO string)' },
                    dateTo: { type: 'string', description: 'End date for search (ISO string)' },
                    limit: { type: 'number', description: 'Maximum number of results' },
                    offset: { type: 'number', description: 'Offset for pagination' },
                },
                required: ['query'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    results: { type: 'array', items: { type: 'object' } },
                    total: { type: 'number' },
                    hasMore: { type: 'boolean' },
                },
            },
        },
        {
            name: 'deleteEmail',
            description: 'Delete or trash an email',
            inputSchema: {
                type: 'object',
                properties: {
                    emailId: { type: 'string', description: 'ID of the email to delete' },
                    permanent: { type: 'boolean', default: false, description: 'Whether to permanently delete (bypass trash)' },
                },
                required: ['emailId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    emailId: { type: 'string' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'organizeInFolder',
            description: 'Move an email to a specified folder or apply labels',
            inputSchema: {
                type: 'object',
                properties: {
                    emailId: { type: 'string', description: 'ID of the email to organize' },
                    folder: { type: 'string', description: 'Target folder name' },
                    labels: { type: 'array', items: { type: 'string' }, description: 'Labels to apply' },
                    markAsRead: { type: 'boolean', description: 'Mark as read when organizing' },
                    markAsImportant: { type: 'boolean', description: 'Mark as important' },
                },
                required: ['emailId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    emailId: { type: 'string' },
                    folder: { type: 'string' },
                    labels: { type: 'array', items: { type: 'string' } },
                    status: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:email',
        'write:email',
        'send:email',
        'delete:email',
        'organize:email',
    ],
    maxConcurrentTasks: 5,
    timeout: 30000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 1000,
        exponentialBackoff: true,
    },
};
let EmailAgentService = class EmailAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.emails = new Map();
        this.folders = new Map();
        this.emailCounter = 0;
    }
    defineConfig() {
        return exports.EMAIL_AGENT_CONFIG;
    }
    async onInitialize() {
        this.seedDefaultFolders();
        this.registerTool({
            name: 'compose',
            description: 'Compose a new email with recipients, subject, body, and optional attachments',
            execute: async (params) => this.compose(params),
        });
        this.registerTool({
            name: 'send',
            description: 'Send a composed or draft email',
            execute: async (params) => this.send(params),
        });
        this.registerTool({
            name: 'read',
            description: 'Read an email by ID, marking it as read',
            execute: async (params) => this.read(params),
        });
        this.registerTool({
            name: 'reply',
            description: 'Reply to an existing email',
            execute: async (params) => this.reply(params),
        });
        this.registerTool({
            name: 'forward',
            description: 'Forward an email to other recipients',
            execute: async (params) => this.forward(params),
        });
        this.registerTool({
            name: 'search',
            description: 'Search emails by query, sender, date range, or folder',
            execute: async (params) => this.search(params),
        });
        this.registerTool({
            name: 'deleteEmail',
            description: 'Delete or trash an email',
            execute: async (params) => this.deleteEmail(params),
        });
        this.registerTool({
            name: 'organizeInFolder',
            description: 'Move an email to a specified folder or apply labels',
            execute: async (params) => this.organizeInFolder(params),
        });
        await this.storeInWorkingMemory('email:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Email agent initialized with 8 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'compose',
            'send',
            'read',
            'reply',
            'forward',
            'search',
            'deleteEmail',
            'organizeInFolder',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown email action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`email:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Email execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.emails.clear();
        this.folders.clear();
        this.emailCounter = 0;
        this.logger.log('Email agent destroyed, emails and folders cleared');
    }
    async compose(params) {
        const { to, cc = [], bcc = [], subject, body, attachments = [], priority = 'normal' } = params;
        if (!to || !Array.isArray(to) || to.length === 0) {
            throw new Error('At least one recipient is required');
        }
        if (!subject || typeof subject !== 'string') {
            throw new Error('A valid subject is required');
        }
        if (!body || typeof body !== 'string') {
            throw new Error('A valid body is required');
        }
        for (const addr of [...to, ...cc, ...bcc]) {
            if (!this.isValidEmail(addr)) {
                throw new Error(`Invalid email address: ${addr}`);
            }
        }
        const emailId = this.generateEmailId();
        const email = {
            id: emailId,
            from: 'agent@aenews.system',
            to,
            cc,
            bcc,
            subject,
            body,
            attachments,
            folder: 'drafts',
            labels: [],
            isRead: true,
            isImportant: false,
            priority,
            status: 'draft',
            createdAt: new Date(),
        };
        this.emails.set(emailId, email);
        this.addEmailToFolder(emailId, 'drafts');
        this.logger.log(`Composed email: ${emailId}, to=${to.join(',')}, subject="${subject.substring(0, 50)}"`);
        return {
            emailId,
            status: 'draft',
            composedAt: new Date().toISOString(),
        };
    }
    async send(params) {
        const { emailId, scheduleAt } = params;
        if (!emailId || typeof emailId !== 'string') {
            throw new Error('A valid emailId is required');
        }
        const email = this.emails.get(emailId);
        if (!email) {
            throw new Error(`Email not found: ${emailId}`);
        }
        if (email.status === 'sent') {
            throw new Error(`Email ${emailId} has already been sent`);
        }
        if (email.status === 'trashed' || email.status === 'deleted') {
            throw new Error(`Cannot send email in ${email.status} status`);
        }
        if (scheduleAt) {
            const scheduledTime = new Date(scheduleAt);
            if (isNaN(scheduledTime.getTime())) {
                throw new Error('Invalid scheduleAt timestamp');
            }
            this.logger.log(`Email ${emailId} scheduled for ${scheduleAt}`);
        }
        email.status = 'sent';
        email.sentAt = new Date();
        this.removeEmailFromFolder(emailId, 'drafts');
        this.addEmailToFolder(emailId, 'sent');
        this.logger.log(`Sent email: ${emailId}, to=${email.to.join(',')}`);
        return {
            emailId,
            sentAt: email.sentAt.toISOString(),
            status: 'sent',
        };
    }
    async read(params) {
        const { emailId, markAsRead = true } = params;
        if (!emailId || typeof emailId !== 'string') {
            throw new Error('A valid emailId is required');
        }
        const email = this.emails.get(emailId);
        if (!email) {
            throw new Error(`Email not found: ${emailId}`);
        }
        if (email.status === 'deleted') {
            throw new Error(`Email ${emailId} has been permanently deleted`);
        }
        const readAt = new Date().toISOString();
        if (markAsRead && !email.isRead) {
            email.isRead = true;
            email.readAt = new Date();
        }
        this.logger.log(`Read email: ${emailId}, markAsRead=${markAsRead}`);
        return {
            email: { ...email },
            readAt,
        };
    }
    async reply(params) {
        const { emailId, body, replyAll = false, attachments = [] } = params;
        if (!emailId || typeof emailId !== 'string') {
            throw new Error('A valid emailId is required');
        }
        if (!body || typeof body !== 'string') {
            throw new Error('A valid body is required for the reply');
        }
        const originalEmail = this.emails.get(emailId);
        if (!originalEmail) {
            throw new Error(`Email not found: ${emailId}`);
        }
        const to = replyAll
            ? [originalEmail.from, ...originalEmail.to.filter((addr) => addr !== 'agent@aenews.system')]
            : [originalEmail.from];
        const cc = replyAll ? originalEmail.cc : [];
        const subject = originalEmail.subject.startsWith('Re:')
            ? originalEmail.subject
            : `Re: ${originalEmail.subject}`;
        const replyId = this.generateEmailId();
        const reply = {
            id: replyId,
            from: 'agent@aenews.system',
            to,
            cc,
            bcc: [],
            subject,
            body,
            attachments,
            folder: 'sent',
            labels: [],
            isRead: true,
            isImportant: false,
            priority: originalEmail.priority,
            status: 'sent',
            replyToId: emailId,
            threadId: originalEmail.threadId || emailId,
            createdAt: new Date(),
            sentAt: new Date(),
        };
        this.emails.set(replyId, reply);
        this.addEmailToFolder(replyId, 'sent');
        this.logger.log(`Replied to email: ${emailId}, replyId=${replyId}, replyAll=${replyAll}`);
        return {
            replyId,
            status: 'sent',
        };
    }
    async forward(params) {
        const { emailId, to, message = '' } = params;
        if (!emailId || typeof emailId !== 'string') {
            throw new Error('A valid emailId is required');
        }
        if (!to || !Array.isArray(to) || to.length === 0) {
            throw new Error('At least one recipient is required for forwarding');
        }
        for (const addr of to) {
            if (!this.isValidEmail(addr)) {
                throw new Error(`Invalid email address: ${addr}`);
            }
        }
        const originalEmail = this.emails.get(emailId);
        if (!originalEmail) {
            throw new Error(`Email not found: ${emailId}`);
        }
        const subject = originalEmail.subject.startsWith('Fwd:')
            ? originalEmail.subject
            : `Fwd: ${originalEmail.subject}`;
        const forwardedBody = message
            ? `${message}\n\n---------- Forwarded message ----------\nFrom: ${originalEmail.from}\nDate: ${originalEmail.createdAt.toISOString()}\nSubject: ${originalEmail.subject}\n\n${originalEmail.body}`
            : `---------- Forwarded message ----------\nFrom: ${originalEmail.from}\nDate: ${originalEmail.createdAt.toISOString()}\nSubject: ${originalEmail.subject}\n\n${originalEmail.body}`;
        const forwardedId = this.generateEmailId();
        const forwarded = {
            id: forwardedId,
            from: 'agent@aenews.system',
            to,
            cc: [],
            bcc: [],
            subject,
            body: forwardedBody,
            attachments: [...originalEmail.attachments],
            folder: 'sent',
            labels: [],
            isRead: true,
            isImportant: false,
            priority: originalEmail.priority,
            status: 'sent',
            forwardedFromId: emailId,
            threadId: originalEmail.threadId || emailId,
            createdAt: new Date(),
            sentAt: new Date(),
        };
        this.emails.set(forwardedId, forwarded);
        this.addEmailToFolder(forwardedId, 'sent');
        this.logger.log(`Forwarded email: ${emailId}, forwardedId=${forwardedId}, to=${to.join(',')}`);
        return {
            forwardedId,
            status: 'sent',
        };
    }
    async search(params) {
        const { query, from, to, subject, folder, dateFrom, dateTo, limit = 20, offset = 0, } = params;
        if (!query || typeof query !== 'string') {
            throw new Error('A valid search query is required');
        }
        const queryLower = query.toLowerCase();
        let results = Array.from(this.emails.values()).filter((email) => {
            if (email.status === 'deleted')
                return false;
            const matchesQuery = email.subject.toLowerCase().includes(queryLower) ||
                email.body.toLowerCase().includes(queryLower) ||
                email.from.toLowerCase().includes(queryLower);
            const matchesFrom = !from || email.from.toLowerCase().includes(from.toLowerCase());
            const matchesTo = !to || email.to.some((r) => r.toLowerCase().includes(to.toLowerCase()));
            const matchesSubject = !subject || email.subject.toLowerCase().includes(subject.toLowerCase());
            const matchesFolder = !folder || email.folder === folder;
            let matchesDate = true;
            if (dateFrom) {
                const fromDate = new Date(dateFrom);
                if (!isNaN(fromDate.getTime())) {
                    matchesDate = matchesDate && email.createdAt >= fromDate;
                }
            }
            if (dateTo) {
                const toDate = new Date(dateTo);
                if (!isNaN(toDate.getTime())) {
                    matchesDate = matchesDate && email.createdAt <= toDate;
                }
            }
            return matchesQuery && matchesFrom && matchesTo && matchesSubject && matchesFolder && matchesDate;
        });
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const total = results.length;
        const hasMore = offset + limit < total;
        results = results.slice(offset, offset + limit);
        this.logger.log(`Email search: query="${query}", results=${total}, returned=${results.length}`);
        return { results, total, hasMore };
    }
    async deleteEmail(params) {
        const { emailId, permanent = false } = params;
        if (!emailId || typeof emailId !== 'string') {
            throw new Error('A valid emailId is required');
        }
        const email = this.emails.get(emailId);
        if (!email) {
            throw new Error(`Email not found: ${emailId}`);
        }
        if (permanent) {
            this.removeEmailFromFolder(emailId, email.folder);
            email.status = 'deleted';
            email.folder = 'deleted';
            this.emails.delete(emailId);
            this.logger.log(`Permanently deleted email: ${emailId}`);
            return { emailId, status: 'deleted' };
        }
        this.removeEmailFromFolder(emailId, email.folder);
        email.status = 'trashed';
        email.folder = 'trash';
        this.addEmailToFolder(emailId, 'trash');
        this.logger.log(`Moved email to trash: ${emailId}`);
        return { emailId, status: 'trashed' };
    }
    async organizeInFolder(params) {
        const { emailId, folder, labels = [], markAsRead, markAsImportant } = params;
        if (!emailId || typeof emailId !== 'string') {
            throw new Error('A valid emailId is required');
        }
        const email = this.emails.get(emailId);
        if (!email) {
            throw new Error(`Email not found: ${emailId}`);
        }
        if (folder) {
            this.removeEmailFromFolder(emailId, email.folder);
            email.folder = folder;
            this.addEmailToFolder(emailId, folder);
            if (!this.folders.has(folder)) {
                this.folders.set(folder, {
                    name: folder,
                    emailIds: [emailId],
                    isSystem: false,
                });
            }
        }
        for (const label of labels) {
            if (!email.labels.includes(label)) {
                email.labels.push(label);
            }
        }
        if (markAsRead !== undefined) {
            email.isRead = markAsRead;
            if (markAsRead) {
                email.readAt = new Date();
            }
        }
        if (markAsImportant !== undefined) {
            email.isImportant = markAsImportant;
        }
        this.logger.log(`Organized email: ${emailId}, folder=${folder || email.folder}, labels=[${labels.join(',')}]`);
        return {
            emailId,
            folder: email.folder,
            labels: [...email.labels],
            status: 'organized',
        };
    }
    seedDefaultFolders() {
        const defaultFolders = [
            { name: 'inbox', emailIds: [], isSystem: true },
            { name: 'drafts', emailIds: [], isSystem: true },
            { name: 'sent', emailIds: [], isSystem: true },
            { name: 'trash', emailIds: [], isSystem: true },
            { name: 'spam', emailIds: [], isSystem: true },
            { name: 'archive', emailIds: [], isSystem: true },
        ];
        for (const folder of defaultFolders) {
            this.folders.set(folder.name, folder);
        }
    }
    generateEmailId() {
        this.emailCounter++;
        return `email-${Date.now()}-${this.emailCounter}`;
    }
    addEmailToFolder(emailId, folderName) {
        const folder = this.folders.get(folderName);
        if (folder && !folder.emailIds.includes(emailId)) {
            folder.emailIds.push(emailId);
        }
    }
    removeEmailFromFolder(emailId, folderName) {
        const folder = this.folders.get(folderName);
        if (folder) {
            folder.emailIds = folder.emailIds.filter((id) => id !== emailId);
        }
    }
    isValidEmail(address) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(address);
    }
};
exports.EmailAgentService = EmailAgentService;
exports.EmailAgentService = EmailAgentService = __decorate([
    (0, common_1.Injectable)()
], EmailAgentService);
//# sourceMappingURL=email-agent.service.js.map