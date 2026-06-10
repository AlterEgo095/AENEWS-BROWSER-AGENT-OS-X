/**
 * AENEWS Agent OS X - Document Agent
 * Manages document creation, editing, conversion, text extraction,
 * merging, and template application for office documents.
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

export const DOCUMENT_AGENT_CONFIG: AgentConfig = {
  id: 'office-document',
  name: 'Document',
  cluster: AgentCluster.OFFICE,
  version: '1.0.0',
  description:
    'Document management agent that handles creating, editing, converting, extracting text, merging documents, and applying templates to office documents.',
  capabilities: [
    {
      name: 'createDocument',
      description: 'Create a new document with specified format, content, and metadata',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Document title' },
          format: { type: 'string', enum: ['docx', 'pdf', 'html', 'md', 'txt', 'rtf'], description: 'Document format' },
          content: { type: 'string', description: 'Initial document content' },
          author: { type: 'string', description: 'Document author' },
          template: { type: 'string', description: 'Template to apply' },
          metadata: { type: 'object', description: 'Additional metadata key-value pairs' },
        },
        required: ['title', 'format'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          documentId: { type: 'string' },
          format: { type: 'string' },
          createdAt: { type: 'string' },
        },
      },
    },
    {
      name: 'editDocument',
      description: 'Edit an existing document by applying insert, replace, delete, or append operations',
      inputSchema: {
        type: 'object',
        properties: {
          documentId: { type: 'string', description: 'ID of the document to edit' },
          operations: { type: 'array', items: { type: 'object' }, description: 'List of edit operations to apply' },
        },
        required: ['documentId', 'operations'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          documentId: { type: 'string' },
          appliedOperations: { type: 'number' },
          status: { type: 'string' },
        },
      },
    },
    {
      name: 'convertFormat',
      description: 'Convert a document from one format to another',
      inputSchema: {
        type: 'object',
        properties: {
          documentId: { type: 'string', description: 'ID of the document to convert' },
          targetFormat: { type: 'string', enum: ['docx', 'pdf', 'html', 'md', 'txt', 'rtf'], description: 'Target format' },
          options: { type: 'object', description: 'Conversion options' },
        },
        required: ['documentId', 'targetFormat'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          documentId: { type: 'string' },
          convertedDocumentId: { type: 'string' },
          sourceFormat: { type: 'string' },
          targetFormat: { type: 'string' },
          status: { type: 'string' },
        },
      },
    },
    {
      name: 'extractText',
      description: 'Extract plain text content from a document',
      inputSchema: {
        type: 'object',
        properties: {
          documentId: { type: 'string', description: 'ID of the document to extract text from' },
          includeMetadata: { type: 'boolean', default: false, description: 'Include document metadata in extraction' },
          pageRange: { type: 'object', description: 'Specific page range to extract from' },
        },
        required: ['documentId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          documentId: { type: 'string' },
          text: { type: 'string' },
          pageCount: { type: 'number' },
          wordCount: { type: 'number' },
        },
      },
    },
    {
      name: 'mergeDocuments',
      description: 'Merge multiple documents into a single document',
      inputSchema: {
        type: 'object',
        properties: {
          documentIds: { type: 'array', items: { type: 'string' }, description: 'IDs of documents to merge' },
          outputTitle: { type: 'string', description: 'Title for the merged document' },
          outputFormat: { type: 'string', description: 'Format for the merged document' },
          separator: { type: 'string', description: 'Separator between merged sections' },
        },
        required: ['documentIds'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          mergedDocumentId: { type: 'string' },
          sourceDocumentCount: { type: 'number' },
          status: { type: 'string' },
        },
      },
    },
    {
      name: 'applyTemplate',
      description: 'Apply a template to an existing document or create from template',
      inputSchema: {
        type: 'object',
        properties: {
          documentId: { type: 'string', description: 'ID of the document to apply template to (optional for new)' },
          templateId: { type: 'string', description: 'Template identifier to apply' },
          variables: { type: 'object', description: 'Key-value pairs for template variable substitution' },
        },
        required: ['templateId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          documentId: { type: 'string' },
          templateId: { type: 'string' },
          substitutedVars: { type: 'array', items: { type: 'string' } },
          status: { type: 'string' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:document',
    'write:document',
    'convert:document',
    'merge:document',
  ],
  maxConcurrentTasks: 4,
  timeout: 45000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1500,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface Document {
  id: string;
  title: string;
  format: string;
  content: string;
  author: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  pageCount: number;
}

interface DocumentTemplate {
  id: string;
  name: string;
  format: string;
  content: string;
  variables: string[];
  description: string;
}

interface EditOperation {
  type: 'insert' | 'replace' | 'delete' | 'append';
  position?: number;
  text?: string;
  search?: string;
  replacement?: string;
  start?: number;
  end?: number;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class DocumentAgentService extends BaseAgentService {
  private documents: Map<string, Document> = new Map();
  private templates: Map<string, DocumentTemplate> = new Map();
  private documentCounter: number = 0;

  protected defineConfig(): AgentConfig {
    return DOCUMENT_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    // Seed built-in templates
    this.seedTemplates();

    // Register tools
    this.registerTool({
      name: 'createDocument',
      description: 'Create a new document with specified format, content, and metadata',
      execute: async (params: {
        title: string;
        format: string;
        content?: string;
        author?: string;
        template?: string;
        metadata?: Record<string, any>;
      }) => this.createDocument(params),
    });

    this.registerTool({
      name: 'editDocument',
      description: 'Edit an existing document by applying operations',
      execute: async (params: {
        documentId: string;
        operations: EditOperation[];
      }) => this.editDocument(params),
    });

    this.registerTool({
      name: 'convertFormat',
      description: 'Convert a document from one format to another',
      execute: async (params: {
        documentId: string;
        targetFormat: string;
        options?: Record<string, any>;
      }) => this.convertFormat(params),
    });

    this.registerTool({
      name: 'extractText',
      description: 'Extract plain text content from a document',
      execute: async (params: {
        documentId: string;
        includeMetadata?: boolean;
        pageRange?: { start: number; end: number };
      }) => this.extractText(params),
    });

    this.registerTool({
      name: 'mergeDocuments',
      description: 'Merge multiple documents into a single document',
      execute: async (params: {
        documentIds: string[];
        outputTitle?: string;
        outputFormat?: string;
        separator?: string;
      }) => this.mergeDocuments(params),
    });

    this.registerTool({
      name: 'applyTemplate',
      description: 'Apply a template to a document',
      execute: async (params: {
        documentId?: string;
        templateId: string;
        variables?: Record<string, string>;
      }) => this.applyTemplate(params),
    });

    await this.storeInWorkingMemory('document:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('Document agent initialized with 6 tools');
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
      'createDocument',
      'editDocument',
      'convertFormat',
      'extractText',
      'mergeDocuments',
      'applyTemplate',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown document action: ${action}. Supported: ${supportedActions.join(', ')}`,
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
        `document:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Document execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.documents.clear();
    this.templates.clear();
    this.documentCounter = 0;
    this.logger.log('Document agent destroyed, documents and templates cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async createDocument(params: {
    title: string;
    format: string;
    content?: string;
    author?: string;
    template?: string;
    metadata?: Record<string, any>;
  }): Promise<{
    documentId: string;
    format: string;
    createdAt: string;
  }> {
    const {
      title,
      format,
      content = '',
      author = 'agent@aenews.system',
      template,
      metadata = {},
    } = params;

    if (!title || typeof title !== 'string') {
      throw new Error('A valid document title is required');
    }

    const validFormats = ['docx', 'pdf', 'html', 'md', 'txt', 'rtf'];
    if (!validFormats.includes(format)) {
      throw new Error(`Invalid format: ${format}. Supported: ${validFormats.join(', ')}`);
    }

    let documentContent = content;

    // Apply template if specified
    if (template) {
      const tmpl = this.templates.get(template);
      if (tmpl) {
        documentContent = tmpl.content;
        if (metadata.variables) {
          for (const [key, value] of Object.entries(metadata.variables)) {
            documentContent = documentContent.replaceAll(`{{${key}}}`, String(value));
          }
        }
      }
    }

    const documentId = this.generateDocumentId();
    const document: Document = {
      id: documentId,
      title,
      format,
      content: documentContent,
      author,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      pageCount: this.estimatePageCount(documentContent),
    };

    this.documents.set(documentId, document);

    this.logger.log(
      `Created document: ${documentId}, title="${title}", format=${format}`,
    );

    return {
      documentId,
      format,
      createdAt: document.createdAt.toISOString(),
    };
  }

  private async editDocument(params: {
    documentId: string;
    operations: EditOperation[];
  }): Promise<{
    documentId: string;
    appliedOperations: number;
    status: string;
  }> {
    const { documentId, operations } = params;

    if (!documentId || typeof documentId !== 'string') {
      throw new Error('A valid documentId is required');
    }
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      throw new Error('At least one edit operation is required');
    }

    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    let content = document.content;
    let appliedOperations = 0;

    for (const op of operations) {
      try {
        switch (op.type) {
          case 'insert': {
            if (op.position === undefined || op.text === undefined) {
              throw new Error('Insert operation requires position and text');
            }
            const pos = Math.min(op.position, content.length);
            content = content.slice(0, pos) + op.text + content.slice(pos);
            appliedOperations++;
            break;
          }
          case 'replace': {
            if (op.search === undefined || op.replacement === undefined) {
              throw new Error('Replace operation requires search and replacement');
            }
            const occurrences = (content.match(new RegExp(this.escapeRegex(op.search), 'g')) || []).length;
            content = content.replaceAll(op.search, op.replacement);
            if (occurrences > 0) appliedOperations++;
            break;
          }
          case 'delete': {
            if (op.start === undefined || op.end === undefined) {
              throw new Error('Delete operation requires start and end positions');
            }
            content = content.slice(0, op.start) + content.slice(op.end);
            appliedOperations++;
            break;
          }
          case 'append': {
            if (op.text === undefined) {
              throw new Error('Append operation requires text');
            }
            content += op.text;
            appliedOperations++;
            break;
          }
          default:
            this.logger.warn(`Unknown edit operation type: ${op.type}`);
        }
      } catch (opError) {
        this.logger.warn(
          `Edit operation failed: ${(opError as Error).message}, skipping`,
        );
      }
    }

    document.content = content;
    document.updatedAt = new Date();
    document.version++;
    document.pageCount = this.estimatePageCount(content);

    this.logger.log(
      `Edited document: ${documentId}, applied=${appliedOperations}/${operations.length}`,
    );

    return {
      documentId,
      appliedOperations,
      status: 'updated',
    };
  }

  private async convertFormat(params: {
    documentId: string;
    targetFormat: string;
    options?: Record<string, any>;
  }): Promise<{
    documentId: string;
    convertedDocumentId: string;
    sourceFormat: string;
    targetFormat: string;
    status: string;
  }> {
    const { documentId, targetFormat, options = {} } = params;

    if (!documentId || typeof documentId !== 'string') {
      throw new Error('A valid documentId is required');
    }

    const validFormats = ['docx', 'pdf', 'html', 'md', 'txt', 'rtf'];
    if (!validFormats.includes(targetFormat)) {
      throw new Error(`Invalid target format: ${targetFormat}. Supported: ${validFormats.join(', ')}`);
    }

    const sourceDocument = this.documents.get(documentId);
    if (!sourceDocument) {
      throw new Error(`Document not found: ${documentId}`);
    }

    if (sourceDocument.format === targetFormat) {
      throw new Error(`Document is already in ${targetFormat} format`);
    }

    // Convert content based on source and target format
    const convertedContent = this.performConversion(
      sourceDocument.content,
      sourceDocument.format,
      targetFormat,
      options,
    );

    const convertedDocumentId = this.generateDocumentId();
    const convertedDocument: Document = {
      id: convertedDocumentId,
      title: sourceDocument.title,
      format: targetFormat,
      content: convertedContent,
      author: sourceDocument.author,
      metadata: {
        ...sourceDocument.metadata,
        convertedFrom: documentId,
        sourceFormat: sourceDocument.format,
        convertedAt: new Date().toISOString(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      pageCount: this.estimatePageCount(convertedContent),
    };

    this.documents.set(convertedDocumentId, convertedDocument);

    this.logger.log(
      `Converted document: ${documentId} (${sourceDocument.format}) -> ${convertedDocumentId} (${targetFormat})`,
    );

    return {
      documentId,
      convertedDocumentId,
      sourceFormat: sourceDocument.format,
      targetFormat,
      status: 'converted',
    };
  }

  private async extractText(params: {
    documentId: string;
    includeMetadata?: boolean;
    pageRange?: { start: number; end: number };
  }): Promise<{
    documentId: string;
    text: string;
    pageCount: number;
    wordCount: number;
  }> {
    const { documentId, includeMetadata = false, pageRange } = params;

    if (!documentId || typeof documentId !== 'string') {
      throw new Error('A valid documentId is required');
    }

    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Strip format-specific markup to get plain text
    let text = this.stripMarkup(document.content, document.format);

    // Apply page range if specified
    if (pageRange) {
      const lines = text.split('\n');
      const linesPerPage = 50; // Approximate lines per page
      const startLine = pageRange.start * linesPerPage;
      const endLine = pageRange.end * linesPerPage;
      text = lines.slice(startLine, endLine).join('\n');
    }

    const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

    let result: any = {
      documentId,
      text,
      pageCount: document.pageCount,
      wordCount,
    };

    if (includeMetadata) {
      result.metadata = {
        title: document.title,
        author: document.author,
        format: document.format,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        version: document.version,
      };
    }

    this.logger.log(
      `Extracted text from document: ${documentId}, words=${wordCount}`,
    );

    return result;
  }

  private async mergeDocuments(params: {
    documentIds: string[];
    outputTitle?: string;
    outputFormat?: string;
    separator?: string;
  }): Promise<{
    mergedDocumentId: string;
    sourceDocumentCount: number;
    status: string;
  }> {
    const { documentIds, outputTitle, outputFormat, separator = '\n\n---\n\n' } = params;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length < 2) {
      throw new Error('At least two document IDs are required for merging');
    }

    const sourceDocs: Document[] = [];
    for (const id of documentIds) {
      const doc = this.documents.get(id);
      if (!doc) {
        throw new Error(`Document not found: ${id}`);
      }
      sourceDocs.push(doc);
    }

    // Determine output format (use first document's format if not specified)
    const format = outputFormat || sourceDocs[0].format;
    const validFormats = ['docx', 'pdf', 'html', 'md', 'txt', 'rtf'];
    if (!validFormats.includes(format)) {
      throw new Error(`Invalid output format: ${format}`);
    }

    // Merge contents
    const mergedContent = sourceDocs
      .map((doc) => this.stripMarkup(doc.content, doc.format))
      .join(separator);

    const title = outputTitle || `Merged: ${sourceDocs.map((d) => d.title).join(' + ')}`;

    const mergedDocumentId = this.generateDocumentId();
    const mergedDocument: Document = {
      id: mergedDocumentId,
      title,
      format,
      content: this.applyFormatMarkup(mergedContent, format),
      author: 'agent@aenews.system',
      metadata: {
        mergedFrom: documentIds,
        mergedAt: new Date().toISOString(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      pageCount: this.estimatePageCount(mergedContent),
    };

    this.documents.set(mergedDocumentId, mergedDocument);

    this.logger.log(
      `Merged ${documentIds.length} documents into: ${mergedDocumentId}`,
    );

    return {
      mergedDocumentId,
      sourceDocumentCount: documentIds.length,
      status: 'merged',
    };
  }

  private async applyTemplate(params: {
    documentId?: string;
    templateId: string;
    variables?: Record<string, string>;
  }): Promise<{
    documentId: string;
    templateId: string;
    substitutedVars: string[];
    status: string;
  }> {
    const { documentId, templateId, variables = {} } = params;

    if (!templateId || typeof templateId !== 'string') {
      throw new Error('A valid templateId is required');
    }

    const template = this.templates.get(templateId);
    if (!template) {
      const available = Array.from(this.templates.keys()).join(', ');
      throw new Error(`Template not found: ${templateId}. Available: ${available}`);
    }

    let content = template.content;
    const substitutedVars: string[] = [];

    // Substitute variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      if (content.includes(placeholder)) {
        content = content.replaceAll(placeholder, value);
        substitutedVars.push(key);
      }
    }

    // Check for unsubstituted variables
    const remainingPlaceholders = content.match(/\{\{(\w+)\}\}/g);
    if (remainingPlaceholders) {
      const missingVars = remainingPlaceholders.map((p) => p.replace(/[{}]/g, ''));
      this.logger.warn(
        `Unsubstituted template variables: ${missingVars.join(', ')}`,
      );
    }

    let targetDocumentId = documentId;

    if (targetDocumentId) {
      // Apply to existing document
      const document = this.documents.get(targetDocumentId);
      if (!document) {
        throw new Error(`Document not found: ${targetDocumentId}`);
      }
      document.content = content;
      document.updatedAt = new Date();
      document.version++;
      document.pageCount = this.estimatePageCount(content);
    } else {
      // Create new document from template
      targetDocumentId = this.generateDocumentId();
      const newDoc: Document = {
        id: targetDocumentId,
        title: `Document from template: ${template.name}`,
        format: template.format,
        content,
        author: 'agent@aenews.system',
        metadata: {
          templateId,
          substitutedVars,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        pageCount: this.estimatePageCount(content),
      };
      this.documents.set(targetDocumentId, newDoc);
    }

    this.logger.log(
      `Applied template: ${templateId}, doc=${targetDocumentId}, substituted=${substitutedVars.length} var(s)`,
    );

    return {
      documentId: targetDocumentId,
      templateId,
      substitutedVars,
      status: 'applied',
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private seedTemplates(): void {
    const builtInTemplates: DocumentTemplate[] = [
      {
        id: 'business-letter',
        name: 'Business Letter',
        format: 'docx',
        content: `{{senderName}}\n{{senderAddress}}\n{{date}}\n\n{{recipientName}}\n{{recipientAddress}}\n\nDear {{recipientName}},\n\n{{body}}\n\nSincerely,\n{{senderName}}`,
        variables: ['senderName', 'senderAddress', 'date', 'recipientName', 'recipientAddress', 'body'],
        description: 'Standard business letter format',
      },
      {
        id: 'meeting-notes',
        name: 'Meeting Notes',
        format: 'md',
        content: `# Meeting Notes: {{meetingTitle}}\n\n**Date:** {{date}}\n**Attendees:** {{attendees}}\n**Location:** {{location}}\n\n## Agenda\n\n{{agenda}}\n\n## Discussion\n\n{{discussion}}\n\n## Action Items\n\n{{actionItems}}\n\n## Next Meeting\n\n{{nextMeeting}}`,
        variables: ['meetingTitle', 'date', 'attendees', 'location', 'agenda', 'discussion', 'actionItems', 'nextMeeting'],
        description: 'Meeting notes template with structured sections',
      },
      {
        id: 'report',
        name: 'Report',
        format: 'docx',
        content: `# {{reportTitle}}\n\n**Author:** {{author}}\n**Date:** {{date}}\n**Version:** {{version}}\n\n## Executive Summary\n\n{{summary}}\n\n## Introduction\n\n{{introduction}}\n\n## Findings\n\n{{findings}}\n\n## Conclusions\n\n{{conclusions}}\n\n## Recommendations\n\n{{recommendations}}`,
        variables: ['reportTitle', 'author', 'date', 'version', 'summary', 'introduction', 'findings', 'conclusions', 'recommendations'],
        description: 'Structured report template',
      },
      {
        id: 'memo',
        name: 'Memo',
        format: 'docx',
        content: `MEMORANDUM\n\n**TO:** {{to}}\n**FROM:** {{from}}\n**DATE:** {{date}}\n**SUBJECT:** {{subject}}\n\n{{body}}`,
        variables: ['to', 'from', 'date', 'subject', 'body'],
        description: 'Internal memo template',
      },
    ];

    for (const template of builtInTemplates) {
      this.templates.set(template.id, template);
    }
  }

  private generateDocumentId(): string {
    this.documentCounter++;
    return `doc-${Date.now()}-${this.documentCounter}`;
  }

  private estimatePageCount(content: string): number {
    if (!content) return 0;
    const words = content.split(/\s+/).filter((w) => w.length > 0).length;
    return Math.max(1, Math.ceil(words / 250)); // ~250 words per page
  }

  private stripMarkup(content: string, format: string): string {
    switch (format) {
      case 'html': {
        // Remove HTML tags
        return content
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
      }
      case 'md': {
        // Remove markdown formatting
        return content
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
          .replace(/^[-*]\s+/gm, '- ')
          .trim();
      }
      case 'rtf': {
        // Remove RTF control words
        return content
          .replace(/\\[a-z]+\d*\s?/gi, '')
          .replace(/[{}]/g, '')
          .trim();
      }
      case 'docx':
      case 'pdf':
      case 'txt':
      default:
        return content;
    }
  }

  private applyFormatMarkup(text: string, format: string): string {
    switch (format) {
      case 'html':
        return text
          .split('\n')
          .map((line) => (line.trim() ? `<p>${line}</p>` : ''))
          .join('\n');
      case 'md':
        return text;
      case 'txt':
        return text;
      default:
        return text;
    }
  }

  private performConversion(
    content: string,
    sourceFormat: string,
    targetFormat: string,
    options: Record<string, any>,
  ): string {
    // First, strip source format markup to plain text
    const plainText = this.stripMarkup(content, sourceFormat);
    // Then, apply target format markup
    return this.applyFormatMarkup(plainText, targetFormat);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
