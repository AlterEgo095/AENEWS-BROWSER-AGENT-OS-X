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
exports.DocumentAgentService = exports.DOCUMENT_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.DOCUMENT_AGENT_CONFIG = {
    id: 'office-document',
    name: 'Document',
    cluster: agent_interface_1.AgentCluster.OFFICE,
    version: '1.0.0',
    description: 'Document management agent that handles creating, editing, converting, extracting text, merging documents, and applying templates to office documents.',
    capabilities: [
        {
            name: 'createDocument',
            description: 'Create a new document with specified format, content, and metadata',
            inputSchema: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Document title' },
                    format: {
                        type: 'string',
                        enum: ['docx', 'pdf', 'html', 'md', 'txt', 'rtf'],
                        description: 'Document format',
                    },
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
                    operations: {
                        type: 'array',
                        items: { type: 'object' },
                        description: 'List of edit operations to apply',
                    },
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
                    targetFormat: {
                        type: 'string',
                        enum: ['docx', 'pdf', 'html', 'md', 'txt', 'rtf'],
                        description: 'Target format',
                    },
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
                    includeMetadata: {
                        type: 'boolean',
                        default: false,
                        description: 'Include document metadata in extraction',
                    },
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
                    documentIds: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'IDs of documents to merge',
                    },
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
                    documentId: {
                        type: 'string',
                        description: 'ID of the document to apply template to (optional for new)',
                    },
                    templateId: { type: 'string', description: 'Template identifier to apply' },
                    variables: {
                        type: 'object',
                        description: 'Key-value pairs for template variable substitution',
                    },
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
let DocumentAgentService = class DocumentAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.documents = new Map();
        this.templates = new Map();
        this.documentCounter = 0;
    }
    defineConfig() {
        return exports.DOCUMENT_AGENT_CONFIG;
    }
    async onInitialize() {
        this.seedTemplates();
        this.registerTool({
            name: 'createDocument',
            description: 'Create a new document with specified format, content, and metadata',
            execute: async (params) => this.createDocument(params),
        });
        this.registerTool({
            name: 'editDocument',
            description: 'Edit an existing document by applying operations',
            execute: async (params) => this.editDocument(params),
        });
        this.registerTool({
            name: 'convertFormat',
            description: 'Convert a document from one format to another',
            execute: async (params) => this.convertFormat(params),
        });
        this.registerTool({
            name: 'extractText',
            description: 'Extract plain text content from a document',
            execute: async (params) => this.extractText(params),
        });
        this.registerTool({
            name: 'mergeDocuments',
            description: 'Merge multiple documents into a single document',
            execute: async (params) => this.mergeDocuments(params),
        });
        this.registerTool({
            name: 'applyTemplate',
            description: 'Apply a template to a document',
            execute: async (params) => this.applyTemplate(params),
        });
        await this.storeInWorkingMemory('document:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Document agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.OfficeCapability.DOCX, {
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
            'createDocument',
            'editDocument',
            'convertFormat',
            'extractText',
            'mergeDocuments',
            'applyTemplate',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown document action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`document:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Document execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.documents.clear();
        this.templates.clear();
        this.documentCounter = 0;
        this.logger.log('Document agent destroyed, documents and templates cleared');
    }
    async createDocument(params) {
        const { title, format, content = '', author = 'agent@aenews.system', template, metadata = {}, } = params;
        if (!title || typeof title !== 'string') {
            throw new Error('A valid document title is required');
        }
        const validFormats = ['docx', 'pdf', 'html', 'md', 'txt', 'rtf'];
        if (!validFormats.includes(format)) {
            throw new Error(`Invalid format: ${format}. Supported: ${validFormats.join(', ')}`);
        }
        let documentContent = content;
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
        const document = {
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
        this.logger.log(`Created document: ${documentId}, title="${title}", format=${format}`);
        return {
            documentId,
            format,
            createdAt: document.createdAt.toISOString(),
        };
    }
    async editDocument(params) {
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
                        const occurrences = (content.match(new RegExp(this.escapeRegex(op.search), 'g')) || [])
                            .length;
                        content = content.replaceAll(op.search, op.replacement);
                        if (occurrences > 0)
                            appliedOperations++;
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
            }
            catch (opError) {
                this.logger.warn(`Edit operation failed: ${opError.message}, skipping`);
            }
        }
        document.content = content;
        document.updatedAt = new Date();
        document.version++;
        document.pageCount = this.estimatePageCount(content);
        this.logger.log(`Edited document: ${documentId}, applied=${appliedOperations}/${operations.length}`);
        return {
            documentId,
            appliedOperations,
            status: 'updated',
        };
    }
    async convertFormat(params) {
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
        const convertedContent = this.performConversion(sourceDocument.content, sourceDocument.format, targetFormat, options);
        const convertedDocumentId = this.generateDocumentId();
        const convertedDocument = {
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
        this.logger.log(`Converted document: ${documentId} (${sourceDocument.format}) -> ${convertedDocumentId} (${targetFormat})`);
        return {
            documentId,
            convertedDocumentId,
            sourceFormat: sourceDocument.format,
            targetFormat,
            status: 'converted',
        };
    }
    async extractText(params) {
        const { documentId, includeMetadata = false, pageRange } = params;
        if (!documentId || typeof documentId !== 'string') {
            throw new Error('A valid documentId is required');
        }
        const document = this.documents.get(documentId);
        if (!document) {
            throw new Error(`Document not found: ${documentId}`);
        }
        let text = this.stripMarkup(document.content, document.format);
        if (pageRange) {
            const lines = text.split('\n');
            const linesPerPage = 50;
            const startLine = pageRange.start * linesPerPage;
            const endLine = pageRange.end * linesPerPage;
            text = lines.slice(startLine, endLine).join('\n');
        }
        const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
        const result = {
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
        this.logger.log(`Extracted text from document: ${documentId}, words=${wordCount}`);
        return result;
    }
    async mergeDocuments(params) {
        const { documentIds, outputTitle, outputFormat, separator = '\n\n---\n\n' } = params;
        if (!documentIds || !Array.isArray(documentIds) || documentIds.length < 2) {
            throw new Error('At least two document IDs are required for merging');
        }
        const sourceDocs = [];
        for (const id of documentIds) {
            const doc = this.documents.get(id);
            if (!doc) {
                throw new Error(`Document not found: ${id}`);
            }
            sourceDocs.push(doc);
        }
        const format = outputFormat || sourceDocs[0].format;
        const validFormats = ['docx', 'pdf', 'html', 'md', 'txt', 'rtf'];
        if (!validFormats.includes(format)) {
            throw new Error(`Invalid output format: ${format}`);
        }
        const mergedContent = sourceDocs
            .map((doc) => this.stripMarkup(doc.content, doc.format))
            .join(separator);
        const title = outputTitle || `Merged: ${sourceDocs.map((d) => d.title).join(' + ')}`;
        const mergedDocumentId = this.generateDocumentId();
        const mergedDocument = {
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
        this.logger.log(`Merged ${documentIds.length} documents into: ${mergedDocumentId}`);
        return {
            mergedDocumentId,
            sourceDocumentCount: documentIds.length,
            status: 'merged',
        };
    }
    async applyTemplate(params) {
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
        const substitutedVars = [];
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            if (content.includes(placeholder)) {
                content = content.replaceAll(placeholder, value);
                substitutedVars.push(key);
            }
        }
        const remainingPlaceholders = content.match(/\{\{(\w+)\}\}/g);
        if (remainingPlaceholders) {
            const missingVars = remainingPlaceholders.map((p) => p.replace(/[{}]/g, ''));
            this.logger.warn(`Unsubstituted template variables: ${missingVars.join(', ')}`);
        }
        let targetDocumentId = documentId;
        if (targetDocumentId) {
            const document = this.documents.get(targetDocumentId);
            if (!document) {
                throw new Error(`Document not found: ${targetDocumentId}`);
            }
            document.content = content;
            document.updatedAt = new Date();
            document.version++;
            document.pageCount = this.estimatePageCount(content);
        }
        else {
            targetDocumentId = this.generateDocumentId();
            const newDoc = {
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
        this.logger.log(`Applied template: ${templateId}, doc=${targetDocumentId}, substituted=${substitutedVars.length} var(s)`);
        return {
            documentId: targetDocumentId,
            templateId,
            substitutedVars,
            status: 'applied',
        };
    }
    seedTemplates() {
        const builtInTemplates = [
            {
                id: 'business-letter',
                name: 'Business Letter',
                format: 'docx',
                content: `{{senderName}}\n{{senderAddress}}\n{{date}}\n\n{{recipientName}}\n{{recipientAddress}}\n\nDear {{recipientName}},\n\n{{body}}\n\nSincerely,\n{{senderName}}`,
                variables: [
                    'senderName',
                    'senderAddress',
                    'date',
                    'recipientName',
                    'recipientAddress',
                    'body',
                ],
                description: 'Standard business letter format',
            },
            {
                id: 'meeting-notes',
                name: 'Meeting Notes',
                format: 'md',
                content: `# Meeting Notes: {{meetingTitle}}\n\n**Date:** {{date}}\n**Attendees:** {{attendees}}\n**Location:** {{location}}\n\n## Agenda\n\n{{agenda}}\n\n## Discussion\n\n{{discussion}}\n\n## Action Items\n\n{{actionItems}}\n\n## Next Meeting\n\n{{nextMeeting}}`,
                variables: [
                    'meetingTitle',
                    'date',
                    'attendees',
                    'location',
                    'agenda',
                    'discussion',
                    'actionItems',
                    'nextMeeting',
                ],
                description: 'Meeting notes template with structured sections',
            },
            {
                id: 'report',
                name: 'Report',
                format: 'docx',
                content: `# {{reportTitle}}\n\n**Author:** {{author}}\n**Date:** {{date}}\n**Version:** {{version}}\n\n## Executive Summary\n\n{{summary}}\n\n## Introduction\n\n{{introduction}}\n\n## Findings\n\n{{findings}}\n\n## Conclusions\n\n{{conclusions}}\n\n## Recommendations\n\n{{recommendations}}`,
                variables: [
                    'reportTitle',
                    'author',
                    'date',
                    'version',
                    'summary',
                    'introduction',
                    'findings',
                    'conclusions',
                    'recommendations',
                ],
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
    generateDocumentId() {
        this.documentCounter++;
        return `doc-${Date.now()}-${this.documentCounter}`;
    }
    estimatePageCount(content) {
        if (!content)
            return 0;
        const words = content.split(/\s+/).filter((w) => w.length > 0).length;
        return Math.max(1, Math.ceil(words / 250));
    }
    stripMarkup(content, format) {
        switch (format) {
            case 'html': {
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
                return content
                    .replace(/^#{1,6}\s+/gm, '')
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    .replace(/\*(.*?)\*/g, '$1')
                    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
                    .replace(/^[-*]\s+/gm, '- ')
                    .trim();
            }
            case 'rtf': {
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
    applyFormatMarkup(text, format) {
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
    performConversion(content, sourceFormat, targetFormat, options) {
        const plainText = this.stripMarkup(content, sourceFormat);
        return this.applyFormatMarkup(plainText, targetFormat);
    }
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
};
exports.DocumentAgentService = DocumentAgentService;
exports.DocumentAgentService = DocumentAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], DocumentAgentService);
//# sourceMappingURL=document-agent.service.js.map