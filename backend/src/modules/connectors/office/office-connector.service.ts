/**
 * AENEWS Agent OS X — Office Connector Service
 *
 * Comprehensive office automation connector providing:
 *   Document Generation: Markdown, HTML, PDF, DOCX
 *   Email (SMTP): send email, templated email
 *   Calendar: create/list events (iCal format)
 *   Spreadsheets: CSV, XLSX generation and parsing
 *   Tasks: create, list, update tasks
 *
 * Integration:
 *   - Circuit breaker key: connector:office
 *   - Emits events via AgentEventBusService
 *   - Records metrics via MetricsService
 *   - Graceful simulation mode when SMTP/backend not available
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentEventBusService, AgentEventType } from '../../agent-framework/services/agent-event-bus.service';
import { CircuitBreakerService, CIRCUIT_KEY_PREFIX } from '../../agent-framework/services/circuit-breaker.service';
import { MetricsService } from '../../observability/services/metrics.service';

// ─── Types ────────────────────────────────────────────────────────────

export interface OfficeResult {
  success: boolean;
  data?: any;
  error?: string;
  mode: 'live' | 'simulation';
  duration: number;
}

export interface MarkdownOptions {
  title?: string;
  headingLevel?: number;
}

export interface HtmlOptions {
  title?: string;
  stylesheet?: string;
  lang?: string;
}

export interface PdfOptions {
  format?: 'A4' | 'Letter';
  landscape?: boolean;
  margin?: { top: string; bottom: string; left: string; right: string };
}

export interface DocxOptions {
  title?: string;
  creator?: string;
  description?: string;
}

export interface EmailOptions {
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{ filename: string; content: string | Buffer; contentType?: string }>;
  html?: boolean;
}

export interface TemplateData {
  [key: string]: string | number | boolean;
}

export interface CalendarEventOptions {
  location?: string;
  description?: string;
  attendees?: string[];
  reminder?: number; // minutes before
  recurrence?: string; // RRULE string
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  ics?: string;
}

export interface CsvOptions {
  delimiter?: string;
  header?: boolean;
  quoting?: boolean;
}

export interface XlsxOptions {
  sheetName?: string;
  headers?: string[];
  columnWidths?: number[];
}

export interface TaskOptions {
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  assignee?: string;
  tags?: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  assignee?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskFilter {
  status?: string;
  priority?: string;
  assignee?: string;
  tags?: string[];
}

// ─── Service ──────────────────────────────────────────────────────────

@Injectable()
export class OfficeConnectorService {
  private readonly logger = new Logger(OfficeConnectorService.name);
  private readonly enabled: boolean;
  private readonly isLive: boolean;

  /** In-memory task store (simulation mode) */
  private readonly tasks = new Map<string, Task>();
  private taskCounter = 0;

  /** In-memory calendar event store (simulation mode) */
  private readonly events = new Map<string, CalendarEvent>();
  private eventCounter = 0;

  /** In-memory email templates */
  private readonly emailTemplates = new Map<string, string>();

  /** SMTP transporter (lazy-initialized) */
  private smtpTransporter: any = null;
  private smtpInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly eventBus?: AgentEventBusService,
    @Optional() private readonly circuitBreaker?: CircuitBreakerService,
    @Optional() private readonly metrics?: MetricsService,
  ) {
    this.enabled = this.configService.get<string>('OFFICE_ENABLED') !== 'false';

    // Determine if we have real SMTP credentials
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    this.isLive = this.enabled && !!smtpHost;

    // Register default email templates
    this.registerDefaultTemplates();

    this.logger.log(
      `Office Connector initialized — enabled: ${this.enabled}, mode: ${this.isLive ? 'LIVE' : 'SIMULATION'}`,
    );
  }

  // ─── Document Generation ────────────────────────────────────────

  /**
   * Convert structured content to Markdown.
   */
  async generateMarkdown(content: any, options?: MarkdownOptions): Promise<OfficeResult> {
    return this.executeWithBreaker('generateMarkdown', async () => {
      const start = Date.now();

      let markdown = '';
      if (options?.title) {
        const level = options.headingLevel ?? 1;
        markdown += `${'#'.repeat(level)} ${options.title}\n\n`;
      }

      if (typeof content === 'string') {
        markdown += content;
      } else if (Array.isArray(content)) {
        for (const item of content) {
          if (typeof item === 'string') {
            markdown += `${item}\n\n`;
          } else if (item.type === 'heading') {
            const level = item.level ?? 2;
            markdown += `${'#'.repeat(level)} ${item.text}\n\n`;
          } else if (item.type === 'list') {
            for (const li of item.items) {
              markdown += `- ${li}\n`;
            }
            markdown += '\n';
          } else if (item.type === 'code') {
            markdown += `\`\`\`${item.language ?? ''}\n${item.code}\n\`\`\`\n\n`;
          } else if (item.type === 'table') {
            if (item.headers?.length) {
              markdown += `| ${item.headers.join(' | ')} |\n`;
              markdown += `| ${item.headers.map(() => '---').join(' | ')} |\n`;
            }
            for (const row of item.rows ?? []) {
              markdown += `| ${row.join(' | ')} |\n`;
            }
            markdown += '\n';
          } else {
            markdown += `${JSON.stringify(item)}\n\n`;
          }
        }
      } else {
        markdown += JSON.stringify(content, null, 2);
      }

      return {
        success: true,
        data: { markdown, length: markdown.length },
        mode: this.isLive ? 'live' as const : 'simulation' as const,
        duration: Date.now() - start,
      };
    });
  }

  /**
   * Convert structured content to HTML.
   */
  async generateHtml(content: any, options?: HtmlOptions): Promise<OfficeResult> {
    return this.executeWithBreaker('generateHtml', async () => {
      const start = Date.now();

      const title = options?.title ?? 'Document';
      const lang = options?.lang ?? 'en';

      let body = '';
      if (typeof content === 'string') {
        body = `<p>${content.replace(/\n/g, '</p><p>')}</p>`;
      } else if (Array.isArray(content)) {
        for (const item of content) {
          if (typeof item === 'string') {
            body += `<p>${item}</p>`;
          } else if (item.type === 'heading') {
            const level = item.level ?? 2;
            body += `<h${level}>${item.text}</h${level}>`;
          } else if (item.type === 'list') {
            body += '<ul>';
            for (const li of item.items) {
              body += `<li>${li}</li>`;
            }
            body += '</ul>';
          } else if (item.type === 'code') {
            body += `<pre><code class="language-${item.language ?? ''}">${item.code}</code></pre>`;
          } else if (item.type === 'table') {
            body += '<table>';
            if (item.headers?.length) {
              body += '<thead><tr>';
              for (const h of item.headers) {
                body += `<th>${h}</th>`;
              }
              body += '</tr></thead>';
            }
            body += '<tbody>';
            for (const row of item.rows ?? []) {
              body += '<tr>';
              for (const cell of row) {
                body += `<td>${cell}</td>`;
              }
              body += '</tr>';
            }
            body += '</tbody></table>';
          } else {
            body += `<pre>${JSON.stringify(item, null, 2)}</pre>`;
          }
        }
      } else {
        body = `<pre>${JSON.stringify(content, null, 2)}</pre>`;
      }

      const stylesheet = options?.stylesheet
        ? `<link rel="stylesheet" href="${options.stylesheet}">`
        : '<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f5f5f5}code{background:#f4f4f4;padding:2px 4px;border-radius:3px}pre{background:#f4f4f4;padding:16px;border-radius:6px;overflow-x:auto}</style>';

      const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${stylesheet}
</head>
<body>
  <h1>${title}</h1>
  ${body}
</body>
</html>`;

      return {
        success: true,
        data: { html, length: html.length },
        mode: this.isLive ? 'live' as const : 'simulation' as const,
        duration: Date.now() - start,
      };
    });
  }

  /**
   * Generate PDF from HTML content.
   * In simulation mode, returns the HTML with a note that PDF generation requires a live backend.
   */
  async generatePdf(html: string, options?: PdfOptions): Promise<OfficeResult> {
    return this.executeWithBreaker('generatePdf', async () => {
      const start = Date.now();

      // In a real implementation, this would use puppeteer or a similar library
      // to render HTML to PDF. For now, we provide a simulation response
      // and structure the code so puppeteer can be plugged in later.
      if (!this.isLive) {
        this.logger.debug('PDF generation in simulation mode — returning HTML wrapper');
        return {
          success: true,
          data: {
            message: 'PDF generated (simulation — use live mode with Puppeteer for actual PDF)',
            htmlLength: html.length,
            options,
            base64: Buffer.from(`SIMULATION_PDF:${html.substring(0, 100)}`).toString('base64'),
          },
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }

      // Live mode: attempt to use a PDF generation library
      try {
        // Dynamic import to avoid hard dependency
        const { default: puppeteer } = await import('puppeteer' as any).catch(() => ({ default: null }));
        if (puppeteer) {
          const browser = await puppeteer.launch({ headless: true });
          const page = await browser.newPage();
          await page.setContent(html, { waitUntil: 'networkidle0' });
          const pdfBuffer = await page.pdf({
            format: options?.format ?? 'A4',
            landscape: options?.landscape ?? false,
            margin: options?.margin ?? { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
          });
          await browser.close();

          return {
            success: true,
            data: {
              base64: pdfBuffer.toString('base64'),
              size: pdfBuffer.length,
            },
            mode: 'live' as const,
            duration: Date.now() - start,
          };
        }
      } catch {
        this.logger.warn('Puppeteer not available, falling back to simulation PDF');
      }

      return {
        success: true,
        data: {
          message: 'PDF generation (fallback — Puppeteer not installed)',
          htmlLength: html.length,
          base64: Buffer.from(html).toString('base64'),
        },
        mode: 'simulation' as const,
        duration: Date.now() - start,
      };
    });
  }

  /**
   * Generate DOCX document using the docx npm package.
   */
  async generateDocx(content: any, options?: DocxOptions): Promise<OfficeResult> {
    return this.executeWithBreaker('generateDocx', async () => {
      const start = Date.now();

      try {
        const docx = await import('docx');
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = docx;

        const children: any[] = [];

        if (options?.title) {
          children.push(
            new Paragraph({
              text: options.title,
              heading: HeadingLevel.HEADING_1,
            }),
          );
        }

        if (typeof content === 'string') {
          children.push(
            new Paragraph({
              children: [new TextRun(content)],
            }),
          );
        } else if (Array.isArray(content)) {
          for (const item of content) {
            if (typeof item === 'string') {
              children.push(new Paragraph({ children: [new TextRun(item)] }));
            } else if (item.type === 'heading') {
              const level = item.level ?? 2;
              const headingMap: Record<number, any> = {
                1: HeadingLevel.HEADING_1,
                2: HeadingLevel.HEADING_2,
                3: HeadingLevel.HEADING_3,
                4: HeadingLevel.HEADING_4,
              };
              children.push(
                new Paragraph({
                  text: item.text,
                  heading: headingMap[level] ?? HeadingLevel.HEADING_2,
                }),
              );
            } else if (item.type === 'list') {
              for (const li of item.items) {
                children.push(
                  new Paragraph({
                    children: [new TextRun(`• ${li}`)],
                  }),
                );
              }
            } else if (item.type === 'code') {
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: item.code, font: 'Courier New' })],
                }),
              );
            } else if (item.type === 'table' && item.headers?.length) {
              const headerRow = new TableRow({
                children: item.headers.map((h: string) =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
                    width: { size: 100 / item.headers.length, type: WidthType.PERCENTAGE },
                  }),
                ),
              });
              const dataRows = (item.rows ?? []).map((row: string[]) =>
                new TableRow({
                  children: row.map((cell: string) =>
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun(cell)] })],
                    }),
                  ),
                }),
              );
              children.push(new Table({ rows: [headerRow, ...dataRows] }));
            }
          }
        }

        const doc = new Document({
          creator: options?.creator ?? 'AENEWS Agent OS X',
          title: options?.title ?? 'Document',
          description: options?.description,
          sections: [{ children }],
        });

        const buffer = await Packer.toBuffer(doc);
        const base64 = buffer.toString('base64');

        return {
          success: true,
          data: { base64, size: buffer.length, filename: `${options?.title ?? 'document'}.docx` },
          mode: this.isLive ? 'live' as const : 'simulation' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        this.logger.warn(`DOCX generation failed: ${error.message}, falling back to simulation`);
        return {
          success: true,
          data: {
            message: 'DOCX generation (simulation — docx package error)',
            content: typeof content === 'string' ? content : JSON.stringify(content),
          },
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  // ─── Email (SMTP) ───────────────────────────────────────────────

  /**
   * Send email via SMTP.
   */
  async sendEmail(
    to: string,
    subject: string,
    body: string,
    options?: EmailOptions,
  ): Promise<OfficeResult> {
    return this.executeWithBreaker('sendEmail', async () => {
      const start = Date.now();

      if (!this.isLive || !this.smtpTransporter) {
        this.logger.debug(`Email simulation: to=${to}, subject=${subject}`);
        return {
          success: true,
          data: {
            message: 'Email sent (simulation — no SMTP configured)',
            to,
            subject,
            bodyPreview: body.substring(0, 100),
            options: options ? { cc: options.cc, bcc: options.bcc } : undefined,
          },
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }

      try {
        const from = this.configService.get<string>('SMTP_FROM') ?? 'noreply@aenews.io';
        const result = await this.smtpTransporter.sendMail({
          from,
          to,
          subject,
          [options?.html ? 'html' : 'text']: body,
          cc: options?.cc,
          bcc: options?.bcc,
          attachments: options?.attachments,
        });

        return {
          success: true,
          data: { messageId: result.messageId, response: result.response },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `SMTP error: ${error.message}`,
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Send a templated email.
   */
  async sendTemplateEmail(
    to: string,
    templateId: string,
    data: TemplateData,
  ): Promise<OfficeResult> {
    return this.executeWithBreaker('sendTemplateEmail', async () => {
      const start = Date.now();

      const template = this.emailTemplates.get(templateId);
      if (!template) {
        return {
          success: false,
          error: `Template not found: ${templateId}`,
          mode: this.isLive ? 'live' as const : 'simulation' as const,
          duration: Date.now() - start,
        };
      }

      // Simple template substitution: {{key}} → value
      let body = template;
      for (const [key, value] of Object.entries(data)) {
        body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
      }

      // Extract subject from first line if it starts with "Subject:"
      let subject = `Template: ${templateId}`;
      const subjectMatch = body.match(/^Subject:\s*(.+)\n/);
      if (subjectMatch) {
        subject = subjectMatch[1];
        body = body.replace(subjectMatch[0], '');
      }

      return this.sendEmail(to, subject, body, { html: true });
    });
  }

  // ─── Calendar ───────────────────────────────────────────────────

  /**
   * Create a calendar event (iCal format).
   */
  async createEvent(
    summary: string,
    start: Date,
    end: Date,
    options?: CalendarEventOptions,
  ): Promise<OfficeResult> {
    return this.executeWithBreaker('createEvent', async () => {
      const startTs = Date.now();

      const id = `evt-${++this.eventCounter}-${Date.now()}`;
      const ics = this.generateIcs(id, summary, start, end, options);

      const event: CalendarEvent = {
        id,
        summary,
        start,
        end,
        location: options?.location,
        description: options?.description,
        ics,
      };

      this.events.set(id, event);

      return {
        success: true,
        data: { event, icsLength: ics.length },
        mode: this.isLive ? 'live' as const : 'simulation' as const,
        duration: Date.now() - startTs,
      };
    });
  }

  /**
   * List calendar events within a date range.
   */
  async listEvents(start: Date, end: Date): Promise<OfficeResult> {
    return this.executeWithBreaker('listEvents', async () => {
      const startTs = Date.now();

      const matchingEvents = Array.from(this.events.values()).filter(
        (e) => e.start >= start && e.start <= end,
      );

      return {
        success: true,
        data: { events: matchingEvents, count: matchingEvents.length },
        mode: this.isLive ? 'live' as const : 'simulation' as const,
        duration: Date.now() - startTs,
      };
    });
  }

  // ─── Spreadsheets ───────────────────────────────────────────────

  /**
   * Generate CSV from data.
   */
  async generateCsv(data: any[][], options?: CsvOptions): Promise<OfficeResult> {
    return this.executeWithBreaker('generateCsv', async () => {
      const start = Date.now();

      const delimiter = options?.delimiter ?? ',';
      const includeHeader = options?.header !== false;
      const quoting = options?.quoting !== false;

      const rows: string[] = [];
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const cells = row.map((cell) => {
          const str = String(cell ?? '');
          if (quoting && (str.includes(delimiter) || str.includes('"') || str.includes('\n'))) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        rows.push(cells.join(delimiter));
      }

      const csv = rows.join('\n');

      return {
        success: true,
        data: { csv, length: csv.length, rows: data.length },
        mode: this.isLive ? 'live' as const : 'simulation' as const,
        duration: Date.now() - start,
      };
    });
  }

  /**
   * Parse CSV content.
   */
  async parseCsv(content: string): Promise<OfficeResult> {
    return this.executeWithBreaker('parseCsv', async () => {
      const start = Date.now();

      const lines = content.split('\n').filter((l) => l.trim());
      const data: string[][] = [];

      for (const line of lines) {
        const row: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            row.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        row.push(current.trim());
        data.push(row);
      }

      return {
        success: true,
        data: { data, rows: data.length, columns: data[0]?.length ?? 0 },
        mode: this.isLive ? 'live' as const : 'simulation' as const,
        duration: Date.now() - start,
      };
    });
  }

  /**
   * Generate XLSX from data using the xlsx npm package.
   */
  async generateXlsx(data: any[][], options?: XlsxOptions): Promise<OfficeResult> {
    return this.executeWithBreaker('generateXlsx', async () => {
      const start = Date.now();

      try {
        const XLSX = await import('xlsx');
        const sheetName = options?.sheetName ?? 'Sheet1';

        const ws = XLSX.utils.aoa_to_sheet(data);

        if (options?.columnWidths) {
          ws['!cols'] = options.columnWidths.map((w) => ({ wch: w }));
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const base64 = buffer.toString('base64');

        return {
          success: true,
          data: { base64, size: buffer.length, sheetName, rows: data.length },
          mode: this.isLive ? 'live' as const : 'simulation' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        this.logger.warn(`XLSX generation failed: ${error.message}, falling back to CSV`);
        const csvResult = await this.generateCsv(data);
        return {
          success: true,
          data: {
            message: 'XLSX generation (fallback to CSV — xlsx package error)',
            ...csvResult.data,
          },
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  // ─── Tasks ──────────────────────────────────────────────────────

  /**
   * Create a task.
   */
  async createTask(title: string, description: string, options?: TaskOptions): Promise<OfficeResult> {
    return this.executeWithBreaker('createTask', async () => {
      const start = Date.now();

      const id = `task-${++this.taskCounter}-${Date.now()}`;
      const now = new Date();

      const task: Task = {
        id,
        title,
        description,
        status: 'todo',
        priority: options?.priority ?? 'medium',
        dueDate: options?.dueDate,
        assignee: options?.assignee,
        tags: options?.tags,
        createdAt: now,
        updatedAt: now,
      };

      this.tasks.set(id, task);

      return {
        success: true,
        data: { task },
        mode: this.isLive ? 'live' as const : 'simulation' as const,
        duration: Date.now() - start,
      };
    });
  }

  /**
   * List tasks with optional filter.
   */
  async listTasks(filter?: TaskFilter): Promise<OfficeResult> {
    return this.executeWithBreaker('listTasks', async () => {
      const start = Date.now();

      let result = Array.from(this.tasks.values());

      if (filter?.status) {
        result = result.filter((t) => t.status === filter.status);
      }
      if (filter?.priority) {
        result = result.filter((t) => t.priority === filter.priority);
      }
      if (filter?.assignee) {
        result = result.filter((t) => t.assignee === filter.assignee);
      }
      if (filter?.tags?.length) {
        result = result.filter((t) => t.tags?.some((tag) => filter.tags!.includes(tag)));
      }

      return {
        success: true,
        data: { tasks: result, count: result.length },
        mode: this.isLive ? 'live' as const : 'simulation' as const,
        duration: Date.now() - start,
      };
    });
  }

  /**
   * Update a task.
   */
  async updateTask(id: string, updates: Partial<Task>): Promise<OfficeResult> {
    return this.executeWithBreaker('updateTask', async () => {
      const start = Date.now();

      const task = this.tasks.get(id);
      if (!task) {
        return {
          success: false,
          error: `Task not found: ${id}`,
          mode: this.isLive ? 'live' as const : 'simulation' as const,
          duration: Date.now() - start,
        };
      }

      const updated: Task = {
        ...task,
        ...updates,
        id: task.id, // prevent ID overwrite
        createdAt: task.createdAt, // prevent createdAt overwrite
        updatedAt: new Date(),
      };

      this.tasks.set(id, updated);

      return {
        success: true,
        data: { task: updated },
        mode: this.isLive ? 'live' as const : 'simulation' as const,
        duration: Date.now() - start,
      };
    });
  }

  // ─── SMTP Initialization ────────────────────────────────────────

  /**
   * Initialize SMTP transporter (lazy).
   */
  async ensureSmtpTransporter(): Promise<boolean> {
    if (this.smtpInitialized) return !!this.smtpTransporter;

    this.smtpInitialized = true;

    const host = this.configService.get<string>('SMTP_HOST');
    if (!host) return false;

    try {
      const nodemailer = await import('nodemailer');
      const port = this.configService.get<number>('SMTP_PORT') ?? 587;
      const user = this.configService.get<string>('SMTP_USER');
      const password = this.configService.get<string>('SMTP_PASSWORD');

      this.smtpTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user ? { user, pass: password } : undefined,
      });

      // Verify connection
      await this.smtpTransporter.verify();
      this.logger.log('SMTP connection verified');
      return true;
    } catch (error: any) {
      this.logger.warn(`SMTP initialization failed: ${error.message}`);
      this.smtpTransporter = null;
      return false;
    }
  }

  /**
   * Check if SMTP is available.
   */
  async checkSmtpHealth(): Promise<boolean> {
    if (!this.isLive) return false;

    try {
      await this.ensureSmtpTransporter();
      if (!this.smtpTransporter) return false;
      await this.smtpTransporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  // ─── Utility ────────────────────────────────────────────────────

  /**
   * Get the list of supported actions.
   */
  getSupportedActions(): string[] {
    return [
      'generateMarkdown', 'generateHtml', 'generatePdf', 'generateDocx',
      'sendEmail', 'sendTemplateEmail',
      'createEvent', 'listEvents',
      'generateCsv', 'parseCsv', 'generateXlsx',
      'createTask', 'listTasks', 'updateTask',
    ];
  }

  /**
   * Execute an action by name.
   */
  async executeAction(action: string, params: Record<string, any>): Promise<OfficeResult> {
    switch (action) {
      case 'generateMarkdown':
        return this.generateMarkdown(params.content, params.options);
      case 'generateHtml':
        return this.generateHtml(params.content, params.options);
      case 'generatePdf':
        return this.generatePdf(params.html, params.options);
      case 'generateDocx':
        return this.generateDocx(params.content, params.options);
      case 'sendEmail':
        return this.sendEmail(params.to, params.subject, params.body, params.options);
      case 'sendTemplateEmail':
        return this.sendTemplateEmail(params.to, params.templateId, params.data);
      case 'createEvent':
        return this.createEvent(params.summary, new Date(params.start), new Date(params.end), params.options);
      case 'listEvents':
        return this.listEvents(new Date(params.start), new Date(params.end));
      case 'generateCsv':
        return this.generateCsv(params.data, params.options);
      case 'parseCsv':
        return this.parseCsv(params.content);
      case 'generateXlsx':
        return this.generateXlsx(params.data, params.options);
      case 'createTask':
        return this.createTask(params.title, params.description, params.options);
      case 'listTasks':
        return this.listTasks(params.filter);
      case 'updateTask':
        return this.updateTask(params.id, params.updates);
      default:
        throw new Error(`Office connector: unsupported action "${action}"`);
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────

  private registerDefaultTemplates(): void {
    this.emailTemplates.set('welcome', `Subject: Welcome to AENEWS
<h1>Welcome, {{name}}!</h1>
<p>Your account has been created successfully.</p>
<p>Get started by visiting your <a href="{{dashboardUrl}}">dashboard</a>.</p>`);

    this.emailTemplates.set('notification', `Subject: {{subject}}
<h2>{{title}}</h2>
<p>{{message}}</p>
<p><small>Sent at {{timestamp}}</small></p>`);

    this.emailTemplates.set('report', `Subject: Report: {{reportName}}
<h1>{{reportName}}</h1>
<p>Generated on: {{date}}</p>
<div>{{content}}</div>`);
  }

  private generateIcs(
    id: string,
    summary: string,
    start: Date,
    end: Date,
    options?: CalendarEventOptions,
  ): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatDate = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AENEWS Agent OS X//EN',
      'BEGIN:VEVENT',
      `UID:${id}@aenews.io`,
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:${summary}`,
    ];

    if (options?.location) ics.push(`LOCATION:${options.location}`);
    if (options?.description) ics.push(`DESCRIPTION:${options.description}`);
    if (options?.recurrence) ics.push(`RRULE:${options.recurrence}`);

    ics.push('END:VEVENT', 'END:VCALENDAR');

    return ics.join('\r\n');
  }

  private async executeWithBreaker<T>(
    action: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    if (this.circuitBreaker) {
      const circuitKey = `${CIRCUIT_KEY_PREFIX.CONNECTOR}:office`;
      return this.circuitBreaker.execute(circuitKey, fn, async () => {
        // Fallback when circuit is open
        return {
          success: false,
          error: 'Circuit breaker is OPEN for office connector',
          mode: 'simulation' as const,
          duration: 0,
        } as any;
      });
    }

    const startTime = Date.now();
    try {
      const result = await fn();
      this.emitEvent(action, true, Date.now() - startTime);
      return result;
    } catch (error: any) {
      this.emitEvent(action, false, Date.now() - startTime);
      throw error;
    }
  }

  private emitEvent(action: string, success: boolean, durationMs: number): void {
    if (this.eventBus) {
      this.eventBus.emit(AgentEventType.TOOL_EXECUTED, 'office', {
        action,
        success,
        duration: durationMs,
      });
    }

    if (this.metrics) {
      this.metrics.recordPipelineStep(`office.${action}`, durationMs, success);
    }
  }
}
