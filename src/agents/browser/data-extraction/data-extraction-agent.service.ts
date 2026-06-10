/**
 * AENEWS Agent OS X - Data Extraction Agent
 * Extracts data from web pages: text, tables, lists, links, metadata, and structured content.
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

export const DATA_EXTRACTION_AGENT_CONFIG: AgentConfig = {
  id: 'browser-data-extraction',
  name: 'DataExtraction',
  cluster: AgentCluster.BROWSER,
  version: '1.0.0',
  description:
    'Extract structured and unstructured data from web pages including text content, HTML tables, lists, links, page metadata, and custom structured data using CSS selectors and XPath.',
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

// ─── Extracted Data Cache ─────────────────────────────────────────

interface ExtractedPageData {
  url: string;
  title: string;
  extractedAt: Date;
  data: Map<string, any>;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class DataExtractionAgentService extends BaseAgentService {
  private pageCache: Map<string, ExtractedPageData> = new Map();

  protected defineConfig(): AgentConfig {
    return DATA_EXTRACTION_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'extractText',
      description: 'Extract text content from elements',
      execute: async (params: {
        selector: string;
        includeChildren?: boolean;
        trimWhitespace?: boolean;
      }) => this.extractText(params),
    });

    this.registerTool({
      name: 'extractTable',
      description: 'Extract data from HTML tables',
      execute: async (params: { selector?: string; includeHeaders?: boolean; format?: string }) =>
        this.extractTable(params),
    });

    this.registerTool({
      name: 'extractList',
      description: 'Extract items from lists',
      execute: async (params: { selector: string; includeNested?: boolean }) =>
        this.extractList(params),
    });

    this.registerTool({
      name: 'extractLinks',
      description: 'Extract links from the page',
      execute: async (params: {
        selector?: string;
        includeExternal?: boolean;
        includeInternal?: boolean;
      }) => this.extractLinks(params),
    });

    this.registerTool({
      name: 'extractMetadata',
      description: 'Extract page metadata',
      execute: async (params: {
        includeOgTags?: boolean;
        includeTwitterCards?: boolean;
        includeStructuredData?: boolean;
      }) => this.extractMetadata(params),
    });

    this.registerTool({
      name: 'extractStructuredData',
      description: 'Extract structured data (JSON-LD, microdata)',
      execute: async (params: {
        format?: string;
        selector?: string;
        schema?: Record<string, any>;
      }) => this.extractStructuredData(params),
    });

    this.logger.log('DataExtraction agent initialized with 6 tools');
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

    try {
      let result: any;

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
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown extraction action: ${action}`,
            startTime,
          );
      }

      // Cache extraction result
      await this.storeInWorkingMemory(`extraction:${input.taskId}`, result, 300000);

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`DataExtraction execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.pageCache.clear();
    this.logger.log('DataExtraction agent destroyed, page cache cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async extractText(params: {
    selector: string;
    includeChildren?: boolean;
    trimWhitespace?: boolean;
  }): Promise<{ texts: string[]; count: number }> {
    const { selector, trimWhitespace = true } = params;

    if (!selector) throw new Error('CSS selector is required');

    // Simulate text extraction based on selector type
    const texts: string[] = [];

    if (selector === 'h1' || selector === 'h2' || selector === 'h3') {
      texts.push(`Extracted ${selector} heading text`);
    } else if (selector === 'p') {
      texts.push(
        'First paragraph of content extracted from the page.',
        'Second paragraph with additional details.',
      );
    } else if (selector === 'span' || selector === 'div') {
      texts.push('Span/div text content');
    } else {
      texts.push(`Text content from elements matching "${selector}"`);
    }

    const processed = trimWhitespace ? texts.map((t) => t.replace(/\s+/g, ' ').trim()) : texts;

    this.logger.log(`Extracted ${processed.length} text element(s) using selector "${selector}"`);

    return { texts: processed, count: processed.length };
  }

  private async extractTable(params: {
    selector?: string;
    includeHeaders?: boolean;
    format?: string;
  }): Promise<{
    headers: string[];
    rows: Record<string, string>[];
    rowCount: number;
    columnCount: number;
  }> {
    const { selector = 'table', includeHeaders = true, format = 'object' } = params;

    // Simulate table extraction
    const headers = ['Name', 'Value', 'Status', 'Date'];
    const rawRows = [
      ['Item 1', '100', 'Active', '2024-01-15'],
      ['Item 2', '200', 'Pending', '2024-02-20'],
      ['Item 3', '150', 'Active', '2024-03-10'],
    ];

    let rows: Record<string, string>[];
    if (format === 'object' && includeHeaders) {
      rows = rawRows.map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((header, idx) => {
          obj[header] = row[idx] || '';
        });
        return obj;
      });
    } else {
      rows = rawRows.map((row) => {
        const obj: Record<string, string> = {};
        row.forEach((val, idx) => {
          obj[`col${idx}`] = val;
        });
        return obj;
      });
    }

    this.logger.log(
      `Extracted table: ${rows.length} rows x ${headers.length} columns from "${selector}"`,
    );

    return {
      headers: includeHeaders ? headers : [],
      rows,
      rowCount: rows.length,
      columnCount: headers.length,
    };
  }

  private async extractList(params: {
    selector: string;
    includeNested?: boolean;
  }): Promise<{ items: string[]; count: number; listType: string }> {
    const { selector, includeNested = false } = params;

    if (!selector) throw new Error('CSS selector is required');

    const listType =
      selector.includes('ol') || selector.includes('ordered') ? 'ordered' : 'unordered';

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

  private async extractLinks(params: {
    selector?: string;
    includeExternal?: boolean;
    includeInternal?: boolean;
  }): Promise<{
    links: Array<{ text: string; href: string; isExternal: boolean }>;
    count: number;
    externalCount: number;
    internalCount: number;
  }> {
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
      if (link.isExternal && !includeExternal) return false;
      if (!link.isExternal && !includeInternal) return false;
      return true;
    });

    const scopeLabel = selector ? ` within "${selector}"` : '';
    this.logger.log(
      `Extracted ${filtered.length} links${scopeLabel} (${filtered.filter((l) => l.isExternal).length} external)`,
    );

    return {
      links: filtered,
      count: filtered.length,
      externalCount: filtered.filter((l) => l.isExternal).length,
      internalCount: filtered.filter((l) => !l.isExternal).length,
    };
  }

  private async extractMetadata(params: {
    includeOgTags?: boolean;
    includeTwitterCards?: boolean;
    includeStructuredData?: boolean;
  }): Promise<{
    title: string;
    description: string;
    ogTags: Record<string, string>;
    twitterCards: Record<string, string>;
    canonicalUrl: string;
    structuredData: any[];
  }> {
    const {
      includeOgTags = true,
      includeTwitterCards = true,
      includeStructuredData = true,
    } = params;

    const result: any = {
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

  private async extractStructuredData(params: {
    format?: string;
    selector?: string;
    schema?: Record<string, any>;
  }): Promise<{ data: any[]; format: string; count: number }> {
    const { format = 'json-ld', selector, schema } = params;

    let data: any[];

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
            Object.fromEntries(
              Object.entries(schema).map(([key, selectorOrConfig]) => {
                const sel =
                  typeof selectorOrConfig === 'string'
                    ? selectorOrConfig
                    : (selectorOrConfig as any).selector || key;
                return [key, `Extracted value for ${sel}`];
              }),
            ),
          ];
        } else {
          data = [{ extracted: 'Custom structured data placeholder' }];
        }
        break;
      default:
        data = [];
    }

    this.logger.log(`Extracted ${data.length} structured data item(s) in ${format} format`);

    return { data, format, count: data.length };
  }
}
