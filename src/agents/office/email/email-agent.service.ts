/**
 * AENEWS Agent OS X - Email Agent
 * Manages email operations: compose, send, read, reply, forward, search, organize.
 * Provides full email lifecycle management with folder organization and search capabilities.
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

export const EMAIL_AGENT_CONFIG: AgentConfig = {
  id: 'office-email',
  name: 'Email',
  cluster: AgentCluster.OFFICE,
  version: '1.0.0',
  description:
    'Email management agent that handles composing, sending, reading, replying, forwarding, searching, and organizing emails with folder-based organization.',
  capabilities: [
    {
      name: 'compose',
      description: 'Compose a new email with recipients, subject, body, and optional attachments',
      inputSchema: {
        type: 'object',
        properties: {
          to: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of recipient email addresses',
          },
          cc: { type: 'array', items: { type: 'string' }, description: 'CC recipients' },
          bcc: { type: 'array', items: { type: 'string' }, description: 'BCC recipients' },
          subject: { type: 'string', description: 'Email subject line' },
          body: { type: 'string', description: 'Email body content (plain text or HTML)' },
          attachments: {
            type: 'array',
            items: { type: 'object' },
            description: 'List of attachments',
          },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high'],
            description: 'Email priority',
          },
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
          markAsRead: {
            type: 'boolean',
            default: true,
            description: 'Whether to mark the email as read',
          },
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
          replyAll: {
            type: 'boolean',
            default: false,
            description: 'Whether to reply to all recipients',
          },
          attachments: {
            type: 'array',
            items: { type: 'object' },
            description: 'Attachments for the reply',
          },
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
          permanent: {
            type: 'boolean',
            default: false,
            description: 'Whether to permanently delete (bypass trash)',
          },
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

// ─── Internal Types ───────────────────────────────────────────────

interface EmailMessage {
  id: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  attachments: EmailAttachment[];
  folder: string;
  labels: string[];
  isRead: boolean;
  isImportant: boolean;
  priority: 'low' | 'normal' | 'high';
  status: 'draft' | 'sent' | 'received' | 'trashed' | 'deleted';
  replyToId?: string;
  forwardedFromId?: string;
  threadId?: string;
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
}

interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  content?: string;
}

interface EmailFolder {
  name: string;
  emailIds: string[];
  isSystem: boolean;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class EmailAgentService extends BaseAgentService {
  private emails: Map<string, EmailMessage> = new Map();
  private folders: Map<string, EmailFolder> = new Map();
  private emailCounter: number = 0;

  protected defineConfig(): AgentConfig {
    return EMAIL_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    // Seed default folders
    this.seedDefaultFolders();

    // Register tools
    this.registerTool({
      name: 'compose',
      description: 'Compose a new email with recipients, subject, body, and optional attachments',
      execute: async (params: {
        to: string[];
        cc?: string[];
        bcc?: string[];
        subject: string;
        body: string;
        attachments?: EmailAttachment[];
        priority?: 'low' | 'normal' | 'high';
      }) => this.compose(params),
    });

    this.registerTool({
      name: 'send',
      description: 'Send a composed or draft email',
      execute: async (params: { emailId: string; scheduleAt?: string }) => this.send(params),
    });

    this.registerTool({
      name: 'read',
      description: 'Read an email by ID, marking it as read',
      execute: async (params: { emailId: string; markAsRead?: boolean }) => this.read(params),
    });

    this.registerTool({
      name: 'reply',
      description: 'Reply to an existing email',
      execute: async (params: {
        emailId: string;
        body: string;
        replyAll?: boolean;
        attachments?: EmailAttachment[];
      }) => this.reply(params),
    });

    this.registerTool({
      name: 'forward',
      description: 'Forward an email to other recipients',
      execute: async (params: { emailId: string; to: string[]; message?: string }) =>
        this.forward(params),
    });

    this.registerTool({
      name: 'search',
      description: 'Search emails by query, sender, date range, or folder',
      execute: async (params: {
        query: string;
        from?: string;
        to?: string;
        subject?: string;
        folder?: string;
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
        offset?: number;
      }) => this.search(params),
    });

    this.registerTool({
      name: 'deleteEmail',
      description: 'Delete or trash an email',
      execute: async (params: { emailId: string; permanent?: boolean }) => this.deleteEmail(params),
    });

    this.registerTool({
      name: 'organizeInFolder',
      description: 'Move an email to a specified folder or apply labels',
      execute: async (params: {
        emailId: string;
        folder?: string;
        labels?: string[];
        markAsRead?: boolean;
        markAsImportant?: boolean;
      }) => this.organizeInFolder(params),
    });

    await this.storeInWorkingMemory('email:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('Email agent initialized with 8 tools');
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
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown email action: ${action}. Supported: ${supportedActions.join(', ')}`,
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

      // Store result in working memory for quick access
      await this.storeInWorkingMemory(
        `email:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Email execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.emails.clear();
    this.folders.clear();
    this.emailCounter = 0;
    this.logger.log('Email agent destroyed, emails and folders cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async compose(params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    attachments?: EmailAttachment[];
    priority?: 'low' | 'normal' | 'high';
  }): Promise<{
    emailId: string;
    status: string;
    composedAt: string;
  }> {
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

    // Validate email addresses
    for (const addr of [...to, ...cc, ...bcc]) {
      if (!this.isValidEmail(addr)) {
        throw new Error(`Invalid email address: ${addr}`);
      }
    }

    const emailId = this.generateEmailId();
    const email: EmailMessage = {
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

    // Add to drafts folder
    this.addEmailToFolder(emailId, 'drafts');

    this.logger.log(
      `Composed email: ${emailId}, to=${to.join(',')}, subject="${subject.substring(0, 50)}"`,
    );

    return {
      emailId,
      status: 'draft',
      composedAt: new Date().toISOString(),
    };
  }

  private async send(params: { emailId: string; scheduleAt?: string }): Promise<{
    emailId: string;
    sentAt: string;
    status: string;
  }> {
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

    // If scheduled, store the schedule but don't send now
    if (scheduleAt) {
      const scheduledTime = new Date(scheduleAt);
      if (isNaN(scheduledTime.getTime())) {
        throw new Error('Invalid scheduleAt timestamp');
      }
      this.logger.log(`Email ${emailId} scheduled for ${scheduleAt}`);
    }

    // Update email status
    email.status = 'sent';
    email.sentAt = new Date();

    // Move from drafts to sent
    this.removeEmailFromFolder(emailId, 'drafts');
    this.addEmailToFolder(emailId, 'sent');

    this.logger.log(`Sent email: ${emailId}, to=${email.to.join(',')}`);

    return {
      emailId,
      sentAt: email.sentAt.toISOString(),
      status: 'sent',
    };
  }

  private async read(params: { emailId: string; markAsRead?: boolean }): Promise<{
    email: EmailMessage;
    readAt: string;
  }> {
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

  private async reply(params: {
    emailId: string;
    body: string;
    replyAll?: boolean;
    attachments?: EmailAttachment[];
  }): Promise<{
    replyId: string;
    status: string;
  }> {
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

    // Build recipient list
    const to = replyAll
      ? [originalEmail.from, ...originalEmail.to.filter((addr) => addr !== 'agent@aenews.system')]
      : [originalEmail.from];

    const cc = replyAll ? originalEmail.cc : [];
    const subject = originalEmail.subject.startsWith('Re:')
      ? originalEmail.subject
      : `Re: ${originalEmail.subject}`;

    const replyId = this.generateEmailId();
    const reply: EmailMessage = {
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

  private async forward(params: { emailId: string; to: string[]; message?: string }): Promise<{
    forwardedId: string;
    status: string;
  }> {
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
    const forwarded: EmailMessage = {
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

  private async search(params: {
    query: string;
    from?: string;
    to?: string;
    subject?: string;
    folder?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    results: EmailMessage[];
    total: number;
    hasMore: boolean;
  }> {
    const { query, from, to, subject, folder, dateFrom, dateTo, limit = 20, offset = 0 } = params;

    if (!query || typeof query !== 'string') {
      throw new Error('A valid search query is required');
    }

    const queryLower = query.toLowerCase();

    let results = Array.from(this.emails.values()).filter((email) => {
      // Skip deleted emails
      if (email.status === 'deleted') return false;

      // Text matching on subject and body
      const matchesQuery =
        email.subject.toLowerCase().includes(queryLower) ||
        email.body.toLowerCase().includes(queryLower) ||
        email.from.toLowerCase().includes(queryLower);

      // Filter by sender
      const matchesFrom = !from || email.from.toLowerCase().includes(from.toLowerCase());

      // Filter by recipient
      const matchesTo = !to || email.to.some((r) => r.toLowerCase().includes(to!.toLowerCase()));

      // Filter by subject
      const matchesSubject =
        !subject || email.subject.toLowerCase().includes(subject.toLowerCase());

      // Filter by folder
      const matchesFolder = !folder || email.folder === folder;

      // Filter by date range
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

      return (
        matchesQuery && matchesFrom && matchesTo && matchesSubject && matchesFolder && matchesDate
      );
    });

    // Sort by date, newest first
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = results.length;
    const hasMore = offset + limit < total;
    results = results.slice(offset, offset + limit);

    this.logger.log(`Email search: query="${query}", results=${total}, returned=${results.length}`);

    return { results, total, hasMore };
  }

  private async deleteEmail(params: { emailId: string; permanent?: boolean }): Promise<{
    emailId: string;
    status: string;
  }> {
    const { emailId, permanent = false } = params;

    if (!emailId || typeof emailId !== 'string') {
      throw new Error('A valid emailId is required');
    }

    const email = this.emails.get(emailId);
    if (!email) {
      throw new Error(`Email not found: ${emailId}`);
    }

    if (permanent) {
      // Permanently delete
      this.removeEmailFromFolder(emailId, email.folder);
      email.status = 'deleted';
      email.folder = 'deleted';
      this.emails.delete(emailId);

      this.logger.log(`Permanently deleted email: ${emailId}`);
      return { emailId, status: 'deleted' };
    }

    // Move to trash
    this.removeEmailFromFolder(emailId, email.folder);
    email.status = 'trashed';
    email.folder = 'trash';
    this.addEmailToFolder(emailId, 'trash');

    this.logger.log(`Moved email to trash: ${emailId}`);
    return { emailId, status: 'trashed' };
  }

  private async organizeInFolder(params: {
    emailId: string;
    folder?: string;
    labels?: string[];
    markAsRead?: boolean;
    markAsImportant?: boolean;
  }): Promise<{
    emailId: string;
    folder: string;
    labels: string[];
    status: string;
  }> {
    const { emailId, folder, labels = [], markAsRead, markAsImportant } = params;

    if (!emailId || typeof emailId !== 'string') {
      throw new Error('A valid emailId is required');
    }

    const email = this.emails.get(emailId);
    if (!email) {
      throw new Error(`Email not found: ${emailId}`);
    }

    // Move to folder if specified
    if (folder) {
      this.removeEmailFromFolder(emailId, email.folder);
      email.folder = folder;
      this.addEmailToFolder(emailId, folder);

      // Create folder if it doesn't exist
      if (!this.folders.has(folder)) {
        this.folders.set(folder, {
          name: folder,
          emailIds: [emailId],
          isSystem: false,
        });
      }
    }

    // Apply labels
    for (const label of labels) {
      if (!email.labels.includes(label)) {
        email.labels.push(label);
      }
    }

    // Mark as read
    if (markAsRead !== undefined) {
      email.isRead = markAsRead;
      if (markAsRead) {
        email.readAt = new Date();
      }
    }

    // Mark as important
    if (markAsImportant !== undefined) {
      email.isImportant = markAsImportant;
    }

    this.logger.log(
      `Organized email: ${emailId}, folder=${folder || email.folder}, labels=[${labels.join(',')}]`,
    );

    return {
      emailId,
      folder: email.folder,
      labels: [...email.labels],
      status: 'organized',
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private seedDefaultFolders(): void {
    const defaultFolders: EmailFolder[] = [
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

  private generateEmailId(): string {
    this.emailCounter++;
    return `email-${Date.now()}-${this.emailCounter}`;
  }

  private addEmailToFolder(emailId: string, folderName: string): void {
    const folder = this.folders.get(folderName);
    if (folder && !folder.emailIds.includes(emailId)) {
      folder.emailIds.push(emailId);
    }
  }

  private removeEmailFromFolder(emailId: string, folderName: string): void {
    const folder = this.folders.get(folderName);
    if (folder) {
      folder.emailIds = folder.emailIds.filter((id) => id !== emailId);
    }
  }

  private isValidEmail(address: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(address);
  }
}
