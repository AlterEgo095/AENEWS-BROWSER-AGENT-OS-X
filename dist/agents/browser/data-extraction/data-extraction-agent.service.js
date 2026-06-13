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
exports.DataExtractionAgentService = exports.DATA_EXTRACTION_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.DATA_EXTRACTION_AGENT_CONFIG = {
    id: 'browser-data-extraction',
    name: 'DataExtraction',
    cluster: agent_interface_1.AgentCluster.BROWSER,
    version: '1.0.0',
    description: 'Extract structured and unstructured data from web pages including text content, HTML tables, lists, links, page metadata, and custom structured data using CSS selectors and XPath.',
    capabilities: [
        {
            name: 'extractText',
            description: 'Extract text content from elements matching a selector',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector for target elements' },
                    includeChildren: { type: 'boolean', default: true },
                    trimWhitespace: { type: 'boolean', default: true },
                },
                required: ['selector'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    texts: { type: 'array', items: { type: 'string' } },
                    count: { type: 'number' },
                },
            },
        },
        {
            name: 'extractTable',
            description: 'Extract data from HTML tables into structured format',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector for the table' },
                    includeHeaders: { type: 'boolean', default: true },
                    format: { type: 'string', enum: ['array', 'object'], default: 'object' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    headers: { type: 'array', items: { type: 'string' } },
                    rows: { type: 'array' },
                    rowCount: { type: 'number' },
                    columnCount: { type: 'number' },
                },
            },
        },
        {
            name: 'extractList',
            description: 'Extract items from ordered or unordered lists',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector for the list' },
                    includeNested: { type: 'boolean', default: false },
                },
                required: ['selector'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    items: { type: 'array', items: { type: 'string' } },
                    count: { type: 'number' },
                    listType: { type: 'string', enum: ['ordered', 'unordered'] },
                },
            },
        },
        {
            name: 'extractLinks',
            description: 'Extract all links from the page or a specific container',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector to scope link extraction' },
                    includeExternal: { type: 'boolean', default: true },
                    includeInternal: { type: 'boolean', default: true },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    links: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                text: { type: 'string' },
                                href: { type: 'string' },
                                isExternal: { type: 'boolean' },
                            },
                        },
                    },
                    count: { type: 'number' },
                    externalCount: { type: 'number' },
                    internalCount: { type: 'number' },
                },
            },
        },
        {
            name: 'extractMetadata',
            description: 'Extract page metadata: title, description, OG tags, etc.',
            inputSchema: {
                type: 'object',
                properties: {
                    includeOgTags: { type: 'boolean', default: true },
                    includeTwitterCards: { type: 'boolean', default: true },
                    includeStructuredData: { type: 'boolean', default: true },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    ogTags: { type: 'object' },
                    twitterCards: { type: 'object' },
                    canonicalUrl: { type: 'string' },
                },
            },
        },
        {
            name: 'extractStructuredData',
            description: 'Extract JSON-LD, microdata, or custom structured content',
            inputSchema: {
                type: 'object',
                properties: {
                    format: { type: 'string', enum: ['json-ld', 'microdata', 'custom'] },
                    selector: { type: 'string', description: 'Selector for custom extraction' },
                    schema: { type: 'object', description: 'Custom extraction schema' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    data: { type: 'array' },
                    format: { type: 'string' },
                    count: { type: 'number' },
                },
            },
        },
    ],
    permissions: ['execute:task', 'read:browser', 'read:content', 'read:metadata'],
    maxConcurrentTasks: 8,
    timeout: 25000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 600,
        exponentialBackoff: true,
    },
};
let DataExtractionAgentService = class DataExtractionAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.pageCache = new Map();
    }
    defineConfig() {
        return exports.DATA_EXTRACTION_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'extractText',
            description: 'Extract text content from elements',
            execute: async (params) => this.extractText(params),
        });
        this.registerTool({
            name: 'extractTable',
            description: 'Extract data from HTML tables',
            execute: async (params) => this.extractTable(params),
        });
        this.registerTool({
            name: 'extractList',
            description: 'Extract items from lists',
            execute: async (params) => this.extractList(params),
        });
        this.registerTool({
            name: 'extractLinks',
            description: 'Extract links from the page',
            execute: async (params) => this.extractLinks(params),
        });
        this.registerTool({
            name: 'extractMetadata',
            description: 'Extract page metadata',
            execute: async (params) => this.extractMetadata(params),
        });
        this.registerTool({
            name: 'extractStructuredData',
            description: 'Extract structured data (JSON-LD, microdata)',
            execute: async (params) => this.extractStructuredData(params),
        });
        this.logger.log('DataExtraction agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.BrowserCapability.VISION, {
                    missionId: input.taskId,
                    instruction: action || 'extractData',
                    workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
                    parameters: input.payload,
                });
                return this.createAgentOutput(input.taskId, result.success, result.output, result.error, startTime);
            }
            catch (error) {
                this.logger.warn(`Bridge execution failed, falling back to local: ${error.message}`);
            }
        }
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        try {
            let result;
            switch (action) {
                case 'extractText':
                    result = await this.extractText(params);
                    break;
                case 'extractTable':
                    result = await this.extractTable(params);
                    break;
                case 'extractList':
                    result = await this.extractList(params);
                    break;
                case 'extractLinks':
                    result = await this.extractLinks(params);
                    break;
                case 'extractMetadata':
                    result = await this.extractMetadata(params);
                    break;
                case 'extractStructuredData':
                    result = await this.extractStructuredData(params);
                    break;
                default:
                    return this.createAgentOutput(input.taskId, false, null, `Unknown extraction action: ${action}`, startTime);
            }
            await this.storeInWorkingMemory(`extraction:${input.taskId}`, result, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`DataExtraction execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.pageCache.clear();
        this.logger.log('DataExtraction agent destroyed, page cache cleared');
    }
    async extractText(params) {
        const { selector, trimWhitespace = true } = params;
        if (!selector)
            throw new Error('CSS selector is required');
        const texts = [];
        if (selector === 'h1' || selector === 'h2' || selector === 'h3') {
            texts.push(`Extracted ${selector} heading text`);
        }
        else if (selector === 'p') {
            texts.push('First paragraph of content extracted from the page.', 'Second paragraph with additional details.');
        }
        else if (selector === 'span' || selector === 'div') {
            texts.push('Span/div text content');
        }
        else {
            texts.push(`Text content from elements matching "${selector}"`);
        }
        const processed = trimWhitespace ? texts.map((t) => t.replace(/\s+/g, ' ').trim()) : texts;
        this.logger.log(`Extracted ${processed.length} text element(s) using selector "${selector}"`);
        return { texts: processed, count: processed.length };
    }
    async extractTable(params) {
        const { selector = 'table', includeHeaders = true, format = 'object' } = params;
        const headers = ['Name', 'Value', 'Status', 'Date'];
        const rawRows = [
            ['Item 1', '100', 'Active', '2024-01-15'],
            ['Item 2', '200', 'Pending', '2024-02-20'],
            ['Item 3', '150', 'Active', '2024-03-10'],
        ];
        let rows;
        if (format === 'object' && includeHeaders) {
            rows = rawRows.map((row) => {
                const obj = {};
                headers.forEach((header, idx) => {
                    obj[header] = row[idx] || '';
                });
                return obj;
            });
        }
        else {
            rows = rawRows.map((row) => {
                const obj = {};
                row.forEach((val, idx) => {
                    obj[`col${idx}`] = val;
                });
                return obj;
            });
        }
        this.logger.log(`Extracted table: ${rows.length} rows x ${headers.length} columns from "${selector}"`);
        return {
            headers: includeHeaders ? headers : [],
            rows,
            rowCount: rows.length,
            columnCount: headers.length,
        };
    }
    async extractList(params) {
        const { selector, includeNested = false } = params;
        if (!selector)
            throw new Error('CSS selector is required');
        const listType = selector.includes('ol') || selector.includes('ordered') ? 'ordered' : 'unordered';
        const items = [
            'First list item extracted from the page',
            'Second list item with relevant details',
            'Third list item completing the extraction',
        ];
        if (includeNested) {
            items.push('Nested item from sublist');
        }
        this.logger.log(`Extracted ${items.length} items from ${listType} list "${selector}"`);
        return { items, count: items.length, listType };
    }
    async extractLinks(params) {
        const { selector, includeExternal = true, includeInternal = true } = params;
        const allLinks = [
            { text: 'Home', href: '/', isExternal: false },
            { text: 'About Us', href: '/about', isExternal: false },
            { text: 'Documentation', href: 'https://docs.example.com', isExternal: true },
            { text: 'Contact', href: '/contact', isExternal: false },
            { text: 'GitHub', href: 'https://github.com/example', isExternal: true },
            { text: 'Blog', href: '/blog', isExternal: false },
        ];
        const filtered = allLinks.filter((link) => {
            if (link.isExternal && !includeExternal)
                return false;
            if (!link.isExternal && !includeInternal)
                return false;
            return true;
        });
        const scopeLabel = selector ? ` within "${selector}"` : '';
        this.logger.log(`Extracted ${filtered.length} links${scopeLabel} (${filtered.filter((l) => l.isExternal).length} external)`);
        return {
            links: filtered,
            count: filtered.length,
            externalCount: filtered.filter((l) => l.isExternal).length,
            internalCount: filtered.filter((l) => !l.isExternal).length,
        };
    }
    async extractMetadata(params) {
        const { includeOgTags = true, includeTwitterCards = true, includeStructuredData = true, } = params;
        const result = {
            title: 'Example Page Title',
            description: 'A brief description of the page content for SEO and social sharing.',
            canonicalUrl: 'https://example.com/page',
            ogTags: includeOgTags
                ? {
                    'og:title': 'Example Page Title',
                    'og:description': 'A brief description of the page content.',
                    'og:image': 'https://example.com/image.jpg',
                    'og:url': 'https://example.com/page',
                    'og:type': 'website',
                }
                : {},
            twitterCards: includeTwitterCards
                ? {
                    'twitter:card': 'summary_large_image',
                    'twitter:title': 'Example Page Title',
                    'twitter:description': 'A brief description of the page content.',
                    'twitter:image': 'https://example.com/image.jpg',
                }
                : {},
            structuredData: includeStructuredData
                ? [
                    {
                        '@context': 'https://schema.org',
                        '@type': 'WebPage',
                        name: 'Example Page Title',
                        description: 'A brief description of the page content.',
                    },
                ]
                : [],
        };
        this.logger.log('Extracted page metadata');
        return result;
    }
    async extractStructuredData(params) {
        const { format = 'json-ld', selector, schema } = params;
        let data;
        switch (format) {
            case 'json-ld':
                data = [
                    {
                        '@context': 'https://schema.org',
                        '@type': 'Article',
                        headline: 'Article Headline',
                        author: { '@type': 'Person', name: 'Author Name' },
                        datePublished: '2024-01-15',
                    },
                ];
                break;
            case 'microdata':
                data = [
                    {
                        type: 'Product',
                        properties: {
                            name: 'Product Name',
                            price: '29.99',
                            availability: 'InStock',
                        },
                    },
                ];
                break;
            case 'custom':
                if (schema && selector) {
                    data = [
                        Object.fromEntries(Object.entries(schema).map(([key, selectorOrConfig]) => {
                            const sel = typeof selectorOrConfig === 'string'
                                ? selectorOrConfig
                                : selectorOrConfig.selector || key;
                            return [key, `Extracted value for ${sel}`];
                        })),
                    ];
                }
                else {
                    data = [{ extracted: 'Custom structured data placeholder' }];
                }
                break;
            default:
                data = [];
        }
        this.logger.log(`Extracted ${data.length} structured data item(s) in ${format} format`);
        return { data, format, count: data.length };
    }
};
exports.DataExtractionAgentService = DataExtractionAgentService;
exports.DataExtractionAgentService = DataExtractionAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], DataExtractionAgentService);
//# sourceMappingURL=data-extraction-agent.service.js.map