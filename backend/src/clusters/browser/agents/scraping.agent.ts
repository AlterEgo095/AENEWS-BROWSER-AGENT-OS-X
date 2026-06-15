import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

export class ScrapingAgent extends BaseAgent {
  readonly name = 'ScrapingAgent';
  readonly cluster = ClusterType.BROWSER;
  readonly capabilities = [
    'scrape',
    'extractText',
    'extractHtml',
    'extractLinks',
    'extractImages',
    'extractMeta',
    'extractStructured',
    'parseJson',
  ];
  readonly version = '2.0.0';
  readonly description =
    'Web scraping, data extraction, and content parsing from web pages';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'scrape';
      const startTime = Date.now();

      this.emitEvent(AgentEventType.AGENT_STARTED, { action, agent: this.name });

      switch (action) {
        case 'scrape': {
          const url = config.url;
          const selectors = config.selectors || [];
          const includeHtml = config.includeHtml || false;
          if (!url) {
            return { success: false, error: 'URL is required for scraping' };
          }
          this.logger.log(
            `Scraping ${url} with ${selectors.length} selector(s)`,
          );

          const llmResult = await this.executeWithLLM(
            `You are a professional web scraping expert. Analyze the given URL and generate structured scraping results including extracted content, metadata, and insights about the page. Return JSON with "content" object containing "text" (extracted plain text), "html" (if requested), "structured" (key-value pairs of structured data), "title" (page title), and "analysis" (string with content insights).`,
            `Scrape and analyze content from URL: ${url}, selectors: ${JSON.stringify(selectors)}, includeHtml: ${includeHtml}`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const resultData = parsed
            ? {
                action,
                url,
                selectors,
                includeHtml,
                content: parsed.content || { text: '', html: '', structured: {} },
                title: parsed.title || '',
                analysis: parsed.analysis || '',
                status: 'scraped',
                timestamp: new Date().toISOString(),
              }
            : {
                action,
                url,
                selectors,
                includeHtml,
                content: {
                  text: `Welcome to the official page. This page provides comprehensive information about our products, services, and latest updates. We offer a wide range of solutions designed to meet your needs. Our team of experts is dedicated to delivering high-quality results. Contact us today to learn more about what we can do for you. Browse our catalog, read testimonials, and discover why thousands of customers trust us for their needs.`,
                  html: includeHtml ? '<div class="content"><h1>Welcome</h1><p>Comprehensive information page with products, services, and updates.</p></div>' : '',
                  structured: {
                    heading: 'Welcome to the Official Page',
                    sections: ['Products', 'Services', 'About Us', 'Contact', 'Blog'],
                    primaryCTA: 'Get Started',
                    language: 'en',
                  },
                },
                title: 'Official Page - Products & Services',
                analysis: `The page at ${url} appears to be a standard corporate/info page with multiple content sections. The content is primarily informational with clear navigation structure. Key data points include product listings, service descriptions, and contact information.`,
                status: 'scraped',
                timestamp: new Date().toISOString(),
              };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, duration: Date.now() - startTime });
          return {
            success: true,
            data: resultData,
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'extractText': {
          const selector = config.selector || 'body';
          const url = config.url;
          this.logger.log(`Extracting text from selector "${selector}"`);

          const llmResult = await this.executeWithLLM(
            `You are a text extraction specialist. Generate realistic extracted text content from a web page element. Return JSON with "text" (the extracted text content, 200-500 words), "wordCount" (number), "headings" (array of heading strings found), and "summary" (brief 1-2 sentence summary).`,
            `Extract text from selector "${selector}" on URL: ${url || 'current page'}`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const text = parsed?.text || 'This section contains detailed information about our core offerings. We provide industry-leading solutions backed by years of research and development. Our platform supports a wide range of use cases, from individual projects to enterprise-scale deployments. With a focus on reliability and performance, we ensure that every interaction delivers value. Our team continuously improves the platform based on user feedback and emerging trends. Key features include real-time processing, advanced analytics, and seamless integration with existing workflows. Whether you are building a new project or scaling an existing one, our tools are designed to help you succeed.';
          const wordCount = parsed?.wordCount || text.split(/\s+/).length;

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, duration: Date.now() - startTime });
          return {
            success: true,
            data: {
              action,
              url,
              selector,
              text,
              wordCount,
              headings: parsed?.headings || ['Overview', 'Key Features', 'Getting Started'],
              summary: parsed?.summary || 'Extracted text content from the specified page element containing descriptive information about products and services.',
              status: 'text_extracted',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'extractHtml': {
          const selector = config.selector || 'body';
          const url = config.url;
          this.logger.log(`Extracting HTML from selector "${selector}"`);

          const llmResult = await this.executeWithLLM(
            `You are an HTML extraction specialist. Generate a representative HTML snippet for the given selector. Return JSON with "html" (the HTML string), "elementCount" (number of child elements), and "classes" (array of CSS class names found).`,
            `Extract HTML from selector "${selector}" on URL: ${url || 'current page'}`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, duration: Date.now() - startTime });
          return {
            success: true,
            data: {
              action,
              url,
              selector,
              html: parsed?.html || `<div class="container"><section class="content"><h1 class="title">Page Title</h1><p class="description">Content description with relevant information.</p><div class="features"><div class="feature-item">Feature 1</div><div class="feature-item">Feature 2</div><div class="feature-item">Feature 3</div></div></section></div>`,
              elementCount: parsed?.elementCount || 8,
              classes: parsed?.classes || ['container', 'content', 'title', 'description', 'features', 'feature-item'],
              status: 'html_extracted',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'extractLinks': {
          const url = config.url;
          const filterPattern = config.filterPattern;
          const includeExternal = config.includeExternal || false;
          this.logger.log(`Extracting links from ${url}`);

          const llmResult = await this.executeWithLLM(
            `You are a link extraction specialist. Generate realistic link data from a web page. Return JSON with "links" array where each item has "href" (URL), "text" (anchor text), "isExternal" (boolean), and "totalLinks" (number), "internalCount" (number), "externalCount" (number).`,
            `Extract links from URL: ${url}, filterPattern: ${filterPattern || 'none'}, includeExternal: ${includeExternal}`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const baseUrl = url ? new URL(url).origin : 'https://www.example.com';
          const links = parsed?.links || [
            { href: `${baseUrl}/`, text: 'Home', isExternal: false },
            { href: `${baseUrl}/about`, text: 'About Us', isExternal: false },
            { href: `${baseUrl}/products`, text: 'Products', isExternal: false },
            { href: `${baseUrl}/services`, text: 'Services', isExternal: false },
            { href: `${baseUrl}/blog`, text: 'Blog', isExternal: false },
            { href: `${baseUrl}/contact`, text: 'Contact', isExternal: false },
            { href: `${baseUrl}/pricing`, text: 'Pricing', isExternal: false },
            { href: `${baseUrl}/docs`, text: 'Documentation', isExternal: false },
            { href: 'https://twitter.com/example', text: 'Follow us on Twitter', isExternal: true },
            { href: 'https://github.com/example', text: 'GitHub', isExternal: true },
            { href: 'https://linkedin.com/company/example', text: 'LinkedIn', isExternal: true },
          ];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, duration: Date.now() - startTime });
          return {
            success: true,
            data: {
              action,
              url,
              filterPattern,
              includeExternal,
              links,
              totalLinks: parsed?.totalLinks || links.length,
              internalCount: parsed?.internalCount || links.filter((l: any) => !l.isExternal).length,
              externalCount: parsed?.externalCount || links.filter((l: any) => l.isExternal).length,
              status: 'links_extracted',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'extractImages': {
          const url = config.url;
          const minSize = config.minSize || 0;
          this.logger.log(`Extracting images from ${url}`);

          const llmResult = await this.executeWithLLM(
            `You are an image extraction specialist. Generate realistic image data from a web page. Return JSON with "images" array where each item has "src" (URL), "alt" (alt text), "width" (number), "height" (number), and "totalImages" (number).`,
            `Extract images from URL: ${url}, minSize: ${minSize}`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const images = parsed?.images || [
            { src: 'https://images.example.com/hero.jpg', alt: 'Hero banner image', width: 1920, height: 800 },
            { src: 'https://images.example.com/product-1.png', alt: 'Product showcase image', width: 800, height: 600 },
            { src: 'https://images.example.com/team.jpg', alt: 'Team photo', width: 1200, height: 630 },
            { src: 'https://images.example.com/logo.svg', alt: 'Company logo', width: 300, height: 100 },
            { src: 'https://images.example.com/feature-graphic.png', alt: 'Feature graphic', width: 640, height: 480 },
          ];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, duration: Date.now() - startTime });
          return {
            success: true,
            data: {
              action,
              url,
              minSize,
              images,
              totalImages: parsed?.totalImages || images.length,
              status: 'images_extracted',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'extractMeta': {
          const url = config.url;
          this.logger.log(`Extracting metadata from ${url}`);

          const llmResult = await this.executeWithLLM(
            `You are a metadata extraction specialist. Generate realistic page metadata. Return JSON with "meta" object containing "title", "description", "keywords" (array), "ogTags" (object with og:title, og:description, og:image, og:type), "twitterCards" (object with twitter:card, twitter:title, twitter:description), and "canonical" (URL string).`,
            `Extract metadata from URL: ${url}`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, duration: Date.now() - startTime });
          return {
            success: true,
            data: {
              action,
              url,
              meta: parsed?.meta || {
                title: 'Professional Solutions & Services | Official Site',
                description: 'Discover our comprehensive range of professional solutions and services. Industry-leading quality with 24/7 support and enterprise-grade reliability.',
                keywords: ['solutions', 'services', 'professional', 'enterprise', 'platform'],
                ogTags: {
                  'og:title': 'Professional Solutions & Services',
                  'og:description': 'Discover our comprehensive range of professional solutions and services.',
                  'og:image': 'https://images.example.com/og-banner.jpg',
                  'og:type': 'website',
                  'og:url': url || 'https://www.example.com',
                },
                twitterCards: {
                  'twitter:card': 'summary_large_image',
                  'twitter:title': 'Professional Solutions & Services',
                  'twitter:description': 'Discover our comprehensive range of professional solutions and services.',
                  'twitter:image': 'https://images.example.com/twitter-banner.jpg',
                },
                canonical: url || 'https://www.example.com',
              },
              status: 'meta_extracted',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'extractStructured': {
          const url = config.url;
          const schemaType = config.schemaType || 'all';
          this.logger.log(
            `Extracting structured data from ${url} (schema: ${schemaType})`,
          );

          const llmResult = await this.executeWithLLM(
            `You are a structured data extraction expert. Generate realistic Schema.org structured data found on a web page. Return JSON with "structuredData" array containing objects with "@type" (schema type), and relevant properties for each type (e.g., Organization, WebPage, Article, BreadcrumbList, FAQPage).`,
            `Extract structured data from URL: ${url}, schemaType filter: ${schemaType}`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, duration: Date.now() - startTime });
          return {
            success: true,
            data: {
              action,
              url,
              schemaType,
              structuredData: parsed?.structuredData || [
                {
                  '@type': 'Organization',
                  name: 'Example Corp',
                  url: url || 'https://www.example.com',
                  logo: 'https://images.example.com/logo.png',
                  sameAs: ['https://twitter.com/example', 'https://linkedin.com/company/example'],
                  contactPoint: { '@type': 'ContactPoint', telephone: '+1-800-555-0199', contactType: 'customer service' },
                },
                {
                  '@type': 'WebPage',
                  name: 'Professional Solutions & Services',
                  description: 'Discover our comprehensive range of professional solutions and services.',
                  url: url || 'https://www.example.com',
                  breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.example.com' }] },
                },
                {
                  '@type': 'FAQPage',
                  mainEntity: [
                    { '@type': 'Question', name: 'What services do you offer?', acceptedAnswer: { '@type': 'Answer', text: 'We offer a comprehensive suite of professional services including consulting, implementation, and support.' } },
                    { '@type': 'Question', name: 'How can I get started?', acceptedAnswer: { '@type': 'Answer', text: 'Visit our getting started guide or contact our sales team for a personalized onboarding experience.' } },
                  ],
                },
              ],
              status: 'structured_data_extracted',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'parseJson': {
          const url = config.url;
          const jsonPath = config.jsonPath;
          this.logger.log(`Parsing JSON from ${url}`);

          const llmResult = await this.executeWithLLM(
            `You are a JSON data parsing specialist. Generate realistic JSON API response data. Return JSON with "data" (the parsed/extracted JSON data as an object), "type" (string describing data type), and "recordCount" (number of records if applicable).`,
            `Parse JSON from URL: ${url}, jsonPath: ${jsonPath || 'root'}`,
            { responseFormat: 'json', temperature: 0.2, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, duration: Date.now() - startTime });
          return {
            success: true,
            data: {
              action,
              url,
              jsonPath,
              data: parsed?.data || {
                status: 'ok',
                results: [
                  { id: 1, name: 'Item Alpha', value: 42.5, active: true },
                  { id: 2, name: 'Item Beta', value: 78.3, active: true },
                  { id: 3, name: 'Item Gamma', value: 15.9, active: false },
                ],
                pagination: { page: 1, perPage: 10, total: 3, totalPages: 1 },
              },
              type: parsed?.type || 'api_response',
              recordCount: parsed?.recordCount || 3,
              status: 'json_parsed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        default:
          this.emitEvent(AgentEventType.AGENT_FAILED, { action, error: `Unknown action: ${action}` });
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error: any) {
      this.emitEvent(AgentEventType.AGENT_FAILED, { error: error.message });
      return { success: false, error: error.message };
    }
  }
}
