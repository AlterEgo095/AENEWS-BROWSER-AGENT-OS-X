/**
 * AENEWS Agent OS X - Content Creation Agent
 * Creates marketing content: blog posts, ad copy, social media posts, headlines, slogans.
 * Supports content rewriting and multi-format content generation.
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

export const CONTENT_CREATION_AGENT_CONFIG: AgentConfig = {
  id: 'marketing-content-creation',
  name: 'ContentCreation',
  cluster: AgentCluster.MARKETING,
  version: '1.0.0',
  description:
    'Creates marketing content including blog posts, ad copy, social media posts, headlines, slogans, and content rewriting with multi-format support.',
  capabilities: [
    {
      name: 'generateBlogPost',
      description: 'Generate a blog post from a topic, outline, or keywords',
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Blog post topic or title' },
          outline: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional section outline',
          },
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'SEO keywords to include',
          },
          tone: {
            type: 'string',
            enum: ['professional', 'casual', 'informative', 'persuasive'],
            description: 'Writing tone',
          },
          wordCount: { type: 'number', description: 'Target word count' },
        },
        required: ['topic'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          wordCount: { type: 'number' },
          metaDescription: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'generateAdCopy',
      description: 'Generate advertising copy for various platforms and formats',
      inputSchema: {
        type: 'object',
        properties: {
          product: { type: 'string', description: 'Product or service name' },
          platform: {
            type: 'string',
            enum: ['google', 'facebook', 'instagram', 'linkedin', 'twitter', 'tiktok'],
            description: 'Ad platform',
          },
          objective: {
            type: 'string',
            enum: ['awareness', 'conversion', 'engagement', 'traffic'],
            description: 'Campaign objective',
          },
          audience: { type: 'string', description: 'Target audience description' },
          cta: { type: 'string', description: 'Call-to-action text' },
          headlineCount: { type: 'number', description: 'Number of headline variations' },
        },
        required: ['product', 'platform', 'objective'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          headlines: { type: 'array', items: { type: 'string' } },
          descriptions: { type: 'array', items: { type: 'string' } },
          cta: { type: 'string' },
          platform: { type: 'string' },
        },
      },
    },
    {
      name: 'generateSocialPost',
      description: 'Generate social media posts for various platforms',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Core message or topic' },
          platform: {
            type: 'string',
            enum: ['twitter', 'facebook', 'instagram', 'linkedin', 'tiktok', 'threads'],
            description: 'Social media platform',
          },
          tone: {
            type: 'string',
            enum: ['professional', 'casual', 'witty', 'inspirational', 'urgent'],
            description: 'Post tone',
          },
          includeHashtags: { type: 'boolean', description: 'Whether to include hashtags' },
          includeEmoji: { type: 'boolean', description: 'Whether to include emojis' },
        },
        required: ['message', 'platform'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          post: { type: 'string' },
          hashtags: { type: 'array', items: { type: 'string' } },
          characterCount: { type: 'number' },
          platform: { type: 'string' },
        },
      },
    },
    {
      name: 'generateHeadline',
      description: 'Generate headline variations for articles, ads, or landing pages',
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Subject of the headline' },
          style: {
            type: 'string',
            enum: [
              'how-to',
              'listicle',
              'question',
              'statistical',
              'provocative',
              'benefit-driven',
            ],
            description: 'Headline style',
          },
          count: { type: 'number', description: 'Number of variations to generate' },
          maxLength: { type: 'number', description: 'Maximum character length' },
        },
        required: ['topic'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          headlines: { type: 'array', items: { type: 'string' } },
          style: { type: 'string' },
        },
      },
    },
    {
      name: 'generateSlogan',
      description: 'Generate brand slogans and taglines',
      inputSchema: {
        type: 'object',
        properties: {
          brand: { type: 'string', description: 'Brand name' },
          industry: { type: 'string', description: 'Industry or niche' },
          values: {
            type: 'array',
            items: { type: 'string' },
            description: 'Brand values to convey',
          },
          tone: {
            type: 'string',
            enum: ['bold', 'friendly', 'luxurious', 'playful', 'trustworthy'],
            description: 'Slogan tone',
          },
          count: { type: 'number', description: 'Number of variations' },
        },
        required: ['brand', 'industry'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          slogans: { type: 'array', items: { type: 'string' } },
          brand: { type: 'string' },
        },
      },
    },
    {
      name: 'rewriteContent',
      description: 'Rewrite existing content with a different tone, length, or style',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Original content to rewrite' },
          tone: {
            type: 'string',
            enum: ['professional', 'casual', 'formal', 'persuasive', 'simplified'],
            description: 'Desired tone',
          },
          length: {
            type: 'string',
            enum: ['shorter', 'same', 'longer'],
            description: 'Target length relative to original',
          },
          focus: { type: 'string', description: 'Specific focus or angle for the rewrite' },
        },
        required: ['content', 'tone'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          rewritten: { type: 'string' },
          originalLength: { type: 'number' },
          newLength: { type: 'number' },
          tone: { type: 'string' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:content',
    'write:content',
    'read:templates',
    'write:generated',
  ],
  maxConcurrentTasks: 4,
  timeout: 60000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1500,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface ContentTemplate {
  id: string;
  type: string;
  structure: string[];
  placeholder: string;
}

interface ContentRecord {
  id: string;
  type: string;
  createdAt: Date;
  wordCount: number;
  tone: string;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class ContentCreationAgentService extends BaseAgentService {
  private templates: Map<string, ContentTemplate> = new Map();
  private contentHistory: ContentRecord[] = [];
  private contentCounter: number = 0;

  protected defineConfig(): AgentConfig {
    return CONTENT_CREATION_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.seedTemplates();

    // Register tools
    this.registerTool({
      name: 'generateBlogPost',
      description: 'Generate a blog post from a topic, outline, or keywords',
      execute: async (params: {
        topic: string;
        outline?: string[];
        keywords?: string[];
        tone?: string;
        wordCount?: number;
      }) => this.generateBlogPost(params),
    });

    this.registerTool({
      name: 'generateAdCopy',
      description: 'Generate advertising copy for various platforms and formats',
      execute: async (params: {
        product: string;
        platform: string;
        objective: string;
        audience?: string;
        cta?: string;
        headlineCount?: number;
      }) => this.generateAdCopy(params),
    });

    this.registerTool({
      name: 'generateSocialPost',
      description: 'Generate social media posts for various platforms',
      execute: async (params: {
        message: string;
        platform: string;
        tone?: string;
        includeHashtags?: boolean;
        includeEmoji?: boolean;
      }) => this.generateSocialPost(params),
    });

    this.registerTool({
      name: 'generateHeadline',
      description: 'Generate headline variations for articles, ads, or landing pages',
      execute: async (params: {
        topic: string;
        style?: string;
        count?: number;
        maxLength?: number;
      }) => this.generateHeadline(params),
    });

    this.registerTool({
      name: 'generateSlogan',
      description: 'Generate brand slogans and taglines',
      execute: async (params: {
        brand: string;
        industry: string;
        values?: string[];
        tone?: string;
        count?: number;
      }) => this.generateSlogan(params),
    });

    this.registerTool({
      name: 'rewriteContent',
      description: 'Rewrite existing content with a different tone, length, or style',
      execute: async (params: { content: string; tone: string; length?: string; focus?: string }) =>
        this.rewriteContent(params),
    });

    await this.storeInWorkingMemory(
      'content-creation:initializedAt',
      new Date().toISOString(),
      600000,
    );
    this.logger.log('ContentCreation agent initialized with 6 tools');
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
      'generateBlogPost',
      'generateAdCopy',
      'generateSocialPost',
      'generateHeadline',
      'generateSlogan',
      'rewriteContent',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown content creation action: ${action}. Supported: ${supportedActions.join(', ')}`,
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

      this.contentHistory.push({
        id: `content-${++this.contentCounter}`,
        type: action,
        createdAt: new Date(),
        wordCount: typeof result === 'object' && result.wordCount ? result.wordCount : 0,
        tone: params.tone || 'professional',
      });

      await this.storeInWorkingMemory(
        `content-creation:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`ContentCreation execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.templates.clear();
    this.contentHistory = [];
    this.contentCounter = 0;
    this.logger.log('ContentCreation agent destroyed, templates and history cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async generateBlogPost(params: {
    topic: string;
    outline?: string[];
    keywords?: string[];
    tone?: string;
    wordCount?: number;
  }): Promise<{
    title: string;
    content: string;
    wordCount: number;
    metaDescription: string;
    tags: string[];
  }> {
    const { topic, outline = [], keywords = [], tone = 'professional', wordCount = 800 } = params;

    if (!topic || typeof topic !== 'string') {
      throw new Error('A valid topic string is required');
    }

    const sections =
      outline.length > 0
        ? outline
        : [
            'Introduction',
            `Understanding ${topic}`,
            'Key Benefits',
            'Best Practices',
            'Conclusion',
          ];

    const contentParts: string[] = [];
    contentParts.push(`# ${topic}\n`);

    for (const section of sections) {
      contentParts.push(`\n## ${section}\n`);
      contentParts.push(this.generateSectionContent(section, topic, tone, keywords));
    }

    const content = contentParts.join('\n');
    const actualWordCount = content.split(/\s+/).length;
    const metaDescription = this.generateMetaDescription(topic, keywords);
    const tags = this.extractTags(topic, keywords);

    this.logger.log(
      `Generated blog post: topic="${topic.substring(0, 50)}", words=${actualWordCount}, tone=${tone}`,
    );

    return {
      title: topic,
      content,
      wordCount: actualWordCount,
      metaDescription,
      tags,
    };
  }

  private async generateAdCopy(params: {
    product: string;
    platform: string;
    objective: string;
    audience?: string;
    cta?: string;
    headlineCount?: number;
  }): Promise<{
    headlines: string[];
    descriptions: string[];
    cta: string;
    platform: string;
  }> {
    const {
      product,
      platform,
      objective,
      audience = 'general audience',
      cta = 'Learn More',
      headlineCount = 3,
    } = params;

    if (!product || typeof product !== 'string') {
      throw new Error('A valid product name is required');
    }

    const validPlatforms = ['google', 'facebook', 'instagram', 'linkedin', 'twitter', 'tiktok'];
    if (!validPlatforms.includes(platform)) {
      throw new Error(`Invalid platform: ${platform}. Valid: ${validPlatforms.join(', ')}`);
    }

    const validObjectives = ['awareness', 'conversion', 'engagement', 'traffic'];
    if (!validObjectives.includes(objective)) {
      throw new Error(`Invalid objective: ${objective}. Valid: ${validObjectives.join(', ')}`);
    }

    const headlines = this.synthesizeHeadlines(product, objective, audience, headlineCount);
    const descriptions = this.synthesizeAdDescriptions(product, objective, audience, platform);

    this.logger.log(
      `Generated ad copy: product="${product}", platform=${platform}, objective=${objective}`,
    );

    return {
      headlines,
      descriptions,
      cta,
      platform,
    };
  }

  private async generateSocialPost(params: {
    message: string;
    platform: string;
    tone?: string;
    includeHashtags?: boolean;
    includeEmoji?: boolean;
  }): Promise<{
    post: string;
    hashtags: string[];
    characterCount: number;
    platform: string;
  }> {
    const {
      message,
      platform,
      tone = 'casual',
      includeHashtags = true,
      includeEmoji = false,
    } = params;

    if (!message || typeof message !== 'string') {
      throw new Error('A valid message string is required');
    }

    const validPlatforms = ['twitter', 'facebook', 'instagram', 'linkedin', 'tiktok', 'threads'];
    if (!validPlatforms.includes(platform)) {
      throw new Error(`Invalid platform: ${platform}. Valid: ${validPlatforms.join(', ')}`);
    }

    const maxChars = this.getPlatformMaxChars(platform);
    const hashtags = includeHashtags ? this.generateHashtags(message) : [];
    const emojiPrefix = includeEmoji ? this.getEmojiForTone(tone) + ' ' : '';

    let post = this.formatSocialPost(message, platform, tone, hashtags, emojiPrefix);

    // Truncate if exceeds platform limit
    if (post.length > maxChars) {
      post = post.substring(0, maxChars - 3) + '...';
    }

    this.logger.log(
      `Generated social post: platform=${platform}, chars=${post.length}, tone=${tone}`,
    );

    return {
      post,
      hashtags,
      characterCount: post.length,
      platform,
    };
  }

  private async generateHeadline(params: {
    topic: string;
    style?: string;
    count?: number;
    maxLength?: number;
  }): Promise<{
    headlines: string[];
    style: string;
  }> {
    const { topic, style = 'benefit-driven', count = 5, maxLength = 70 } = params;

    if (!topic || typeof topic !== 'string') {
      throw new Error('A valid topic string is required');
    }

    const validStyles = [
      'how-to',
      'listicle',
      'question',
      'statistical',
      'provocative',
      'benefit-driven',
    ];
    if (!validStyles.includes(style)) {
      throw new Error(`Invalid style: ${style}. Valid: ${validStyles.join(', ')}`);
    }

    const headlines = this.synthesizeHeadlinesByStyle(topic, style, count, maxLength);

    this.logger.log(
      `Generated headlines: topic="${topic.substring(0, 40)}", style=${style}, count=${headlines.length}`,
    );

    return { headlines, style };
  }

  private async generateSlogan(params: {
    brand: string;
    industry: string;
    values?: string[];
    tone?: string;
    count?: number;
  }): Promise<{
    slogans: string[];
    brand: string;
  }> {
    const { brand, industry, values = [], tone = 'bold', count = 5 } = params;

    if (!brand || typeof brand !== 'string') {
      throw new Error('A valid brand name is required');
    }
    if (!industry || typeof industry !== 'string') {
      throw new Error('A valid industry is required');
    }

    const slogans = this.synthesizeSlogans(brand, industry, values, tone, count);

    this.logger.log(
      `Generated slogans: brand="${brand}", industry=${industry}, count=${slogans.length}`,
    );

    return { slogans, brand };
  }

  private async rewriteContent(params: {
    content: string;
    tone: string;
    length?: string;
    focus?: string;
  }): Promise<{
    rewritten: string;
    originalLength: number;
    newLength: number;
    tone: string;
  }> {
    const { content, tone, length = 'same', focus } = params;

    if (!content || typeof content !== 'string') {
      throw new Error('Valid content string is required for rewriting');
    }

    const validTones = ['professional', 'casual', 'formal', 'persuasive', 'simplified'];
    if (!validTones.includes(tone)) {
      throw new Error(`Invalid tone: ${tone}. Valid: ${validTones.join(', ')}`);
    }

    const originalWordCount = content.split(/\s+/).length;
    let rewritten = this.applyToneRewrite(content, tone);

    if (focus) {
      rewritten = this.refocusContent(rewritten, focus);
    }

    // Adjust length
    rewritten = this.adjustContentLength(rewritten, length, originalWordCount);

    const newWordCount = rewritten.split(/\s+/).length;

    this.logger.log(
      `Rewrote content: tone=${tone}, length=${length}, original=${originalWordCount} words, new=${newWordCount} words`,
    );

    return {
      rewritten,
      originalLength: originalWordCount,
      newLength: newWordCount,
      tone,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private seedTemplates(): void {
    const builtInTemplates: ContentTemplate[] = [
      {
        id: 'blog-how-to',
        type: 'blog',
        structure: [
          'Introduction',
          'Prerequisites',
          'Step-by-Step Guide',
          'Tips & Tricks',
          'Conclusion',
        ],
        placeholder: 'A comprehensive how-to guide on {{topic}}',
      },
      {
        id: 'blog-listicle',
        type: 'blog',
        structure: ['Introduction', 'Numbered Items', 'Summary & Takeaways'],
        placeholder: 'Top reasons and facts about {{topic}}',
      },
      {
        id: 'ad-search',
        type: 'ad',
        structure: ['Headline', 'Description Line 1', 'Description Line 2'],
        placeholder: 'Discover {{product}} - {{benefit}}',
      },
      {
        id: 'social-promo',
        type: 'social',
        structure: ['Hook', 'Value Proposition', 'Call-to-Action'],
        placeholder: 'Introducing {{product}} for {{audience}}',
      },
    ];

    for (const template of builtInTemplates) {
      this.templates.set(template.id, template);
    }
  }

  private generateSectionContent(
    section: string,
    topic: string,
    tone: string,
    keywords: string[],
  ): string {
    const keywordPhrase =
      keywords.length > 0 ? ` Incorporating ${keywords.slice(0, 3).join(', ')}.` : '';

    const toneModifiers: Record<string, string> = {
      professional: 'In the professional landscape,',
      casual: "Here's the thing about",
      informative: 'It is important to understand that',
      persuasive: 'You need to know that',
    };

    const modifier = toneModifiers[tone] || 'Regarding';

    return `${modifier} ${section.toLowerCase()} in the context of ${topic}, there are several key considerations to explore. This section provides an in-depth analysis of the most important aspects related to ${section.toLowerCase()}.${keywordPhrase}\n\nThe fundamental principles of ${section.toLowerCase()} revolve around understanding core concepts and applying them effectively. By focusing on practical implementation and real-world applications, organizations can achieve meaningful results in their ${topic.toLowerCase()} initiatives.`;
  }

  private generateMetaDescription(topic: string, keywords: string[]): string {
    const keywordPart =
      keywords.length > 0 ? ` | Keywords: ${keywords.slice(0, 3).join(', ')}` : '';
    const desc = `Discover everything you need to know about ${topic}. This comprehensive guide covers key insights and best practices.${keywordPart}`;
    return desc.length > 160 ? desc.substring(0, 157) + '...' : desc;
  }

  private extractTags(topic: string, keywords: string[]): string[] {
    const topicWords = topic
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const allTags = [...new Set([...topicWords, ...keywords.map((k) => k.toLowerCase())])];
    return allTags.slice(0, 10);
  }

  private synthesizeHeadlines(
    product: string,
    objective: string,
    audience: string,
    count: number,
  ): string[] {
    const templates: Record<string, string[]> = {
      awareness: [
        `Discover ${product}: The Solution ${audience} Trusts`,
        `${product} - Redefining What's Possible`,
        `Meet ${product}: Built for ${audience}`,
        `Introducing ${product} for a New Era`,
        `${product}: Your Next Step Forward`,
      ],
      conversion: [
        `Get ${product} Now - Limited Time Offer`,
        `Transform Your Results with ${product}`,
        `${product}: Start Your Free Trial Today`,
        `Unlock Your Potential with ${product}`,
        `Why ${audience} Choose ${product}`,
      ],
      engagement: [
        `What Makes ${product} Stand Out?`,
        `Join ${audience} Who Love ${product}`,
        `${product}: Share Your Experience`,
        `Tell Us How ${product} Helped You`,
        `${product} Community: Join the Conversation`,
      ],
      traffic: [
        `Learn More About ${product} Today`,
        `${product}: The Complete Guide for ${audience}`,
        `Everything You Need to Know About ${product}`,
        `${product} Resources & Insights`,
        `Explore ${product} - See What's New`,
      ],
    };

    return (templates[objective] || templates['awareness']).slice(0, count);
  }

  private synthesizeAdDescriptions(
    product: string,
    objective: string,
    audience: string,
    platform: string,
  ): string[] {
    const descriptions: string[] = [
      `${product} helps ${audience} achieve their goals faster with innovative solutions designed for modern challenges.`,
      `Join thousands of satisfied customers who trust ${product} for their ${objective} needs. Start today.`,
      `Experience the difference with ${product}. Optimized for ${platform}, built for ${audience}.`,
    ];

    return descriptions;
  }

  private getPlatformMaxChars(platform: string): number {
    const limits: Record<string, number> = {
      twitter: 280,
      facebook: 63206,
      instagram: 2200,
      linkedin: 3000,
      tiktok: 2200,
      threads: 500,
    };
    return limits[platform] || 2200;
  }

  private generateHashtags(message: string): string[] {
    const words = message
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const hashtags = words.slice(0, 3).map((w) => `#${w.replace(/[^a-z0-9]/g, '')}`);
    hashtags.push('#marketing', '#content');
    return [...new Set(hashtags)];
  }

  private getEmojiForTone(tone: string): string {
    const emojis: Record<string, string> = {
      professional: '💼',
      casual: '😊',
      witty: '😏',
      inspirational: '✨',
      urgent: '🚨',
    };
    return emojis[tone] || '📢';
  }

  private formatSocialPost(
    message: string,
    platform: string,
    tone: string,
    hashtags: string[],
    emojiPrefix: string,
  ): string {
    const hashtagStr = hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '';
    const platformHook: Record<string, string> = {
      twitter: '',
      facebook: '',
      instagram: '',
      linkedin: '',
      tiktok: '',
      threads: '',
    };

    const hook = platformHook[platform] || '';
    return `${emojiPrefix}${hook}${message}${hashtagStr}`;
  }

  private synthesizeHeadlinesByStyle(
    topic: string,
    style: string,
    count: number,
    maxLength: number,
  ): string[] {
    const generators: Record<string, () => string[]> = {
      'how-to': () => [
        `How to Master ${topic} in 7 Simple Steps`,
        `The Complete Guide to ${topic}: How to Get Started`,
        `How ${topic} Can Transform Your Workflow`,
        `How to Achieve Success with ${topic}`,
        `How Experts Approach ${topic} Differently`,
        `How to Leverage ${topic} for Maximum Impact`,
        `How to Avoid Common ${topic} Mistakes`,
      ],
      listicle: () => [
        `10 ${topic} Strategies You Need to Try`,
        `5 Ways ${topic} Will Change Your Perspective`,
        `7 ${topic} Tips the Pros Don't Share`,
        `Top 8 ${topic} Trends This Year`,
        `15 ${topic} Facts That Will Surprise You`,
        `3 ${topic} Secrets Revealed`,
        `20 ${topic} Best Practices for Beginners`,
      ],
      question: () => [
        `Is ${topic} Right for You?`,
        `What Makes ${topic} So Effective?`,
        `Why Are People Talking About ${topic}?`,
        `Can ${topic} Really Deliver Results?`,
        `Are You Making These ${topic} Mistakes?`,
        `What's the Real Cost of Ignoring ${topic}?`,
        `How Will ${topic} Evolve in the Coming Years?`,
      ],
      statistical: () => [
        `87% of Professionals Rely on ${topic} - Here's Why`,
        `${topic}: The 3 Metrics That Matter Most`,
        `Why 9 Out of 10 Companies Invest in ${topic}`,
        `${topic} ROI: What the Numbers Reveal`,
        `The Surprising Statistics Behind ${topic}`,
        `${topic} by the Numbers: 2024 Edition`,
        `Data-Driven: ${topic} Impact Quantified`,
      ],
      provocative: () => [
        `Stop Everything You're Doing with ${topic} - Read This`,
        `${topic} Is Dead. Here's What Replaced It.`,
        `The Ugly Truth About ${topic} Nobody Tells You`,
        `Why Most ${topic} Strategies Fail Miserably`,
        `${topic}: The Biggest Waste of Budget?`,
        `Everything You Know About ${topic} Is Wrong`,
        `The ${topic} Myth That's Costing You Money`,
      ],
      'benefit-driven': () => [
        `Unlock Your Potential with ${topic}`,
        `${topic}: The Key to Faster Growth`,
        `Achieve More with Less Using ${topic}`,
        `${topic} - Your Competitive Advantage`,
        `Drive Real Results with ${topic}`,
        `${topic}: Save Time, Boost Productivity`,
        `Experience the Power of ${topic} Today`,
      ],
    };

    const generator = generators[style] || generators['benefit-driven'];
    const allHeadlines = generator();

    return allHeadlines
      .slice(0, count)
      .map((h) => (h.length > maxLength ? h.substring(0, maxLength - 3) + '...' : h));
  }

  private synthesizeSlogans(
    brand: string,
    industry: string,
    values: string[],
    tone: string,
    count: number,
  ): string[] {
    const valuePhrase = values.length > 0 ? ` through ${values.join(' and ')}` : '';

    const templates: Record<string, string[]> = {
      bold: [
        `${brand}: Redefining ${industry}`,
        `${brand}. No Limits.`,
        `${brand}: Own the Future of ${industry}`,
        `${brand} - Where Bold Meets ${industry}`,
        `${brand}: Break Through`,
      ],
      friendly: [
        `${brand}: Your Partner in ${industry}`,
        `${brand} - Making ${industry} Better Together`,
        `${brand}: Here for You, Always`,
        `${brand} - ${industry} Made Simple`,
        `${brand}: Friendly Faces, Powerful Results`,
      ],
      luxurious: [
        `${brand}: The Art of ${industry}`,
        `${brand}: Elevate Your ${industry} Experience`,
        `${brand} - Exceptional by Design`,
        `${brand}: Where Excellence Meets ${industry}`,
        `${brand}: Uncompromising Quality${valuePhrase}`,
      ],
      playful: [
        `${brand}: ${industry} Just Got Fun`,
        `${brand} - Play Smarter, Not Harder`,
        `${brand}: Serious ${industry}, Seriously Fun`,
        `${brand}: Spice Up Your ${industry}`,
        `${brand} - ${industry} with a Twist`,
      ],
      trustworthy: [
        `${brand}: Trusted in ${industry}${valuePhrase}`,
        `${brand}: Building Trust in ${industry}`,
        `${brand} - Your Reliable ${industry} Partner`,
        `${brand}: Integrity in Every ${industry} Solution`,
        `${brand}: Trust the Experts in ${industry}`,
      ],
    };

    return (templates[tone] || templates['bold']).slice(0, count);
  }

  private applyToneRewrite(content: string, tone: string): string {
    const toneTransforms: Record<string, (text: string) => string> = {
      professional: (text) =>
        text
          .replace(/\bget\b/gi, 'obtain')
          .replace(/\buse\b/gi, 'utilize')
          .replace(/\bbig\b/gi, 'significant'),
      casual: (text) =>
        text
          .replace(/\bobtain\b/gi, 'get')
          .replace(/\butilize\b/gi, 'use')
          .replace(/\bsignificant\b/gi, 'big'),
      formal: (text) =>
        text
          .replace(/\bcan't\b/gi, 'cannot')
          .replace(/\bdon't\b/gi, 'do not')
          .replace(/\bwon't\b/gi, 'will not'),
      persuasive: (text) =>
        text
          .replace(/\byou can\b/gi, 'you will')
          .replace(/\bconsider\b/gi, 'choose')
          .replace(/\bmaybe\b/gi, 'definitely'),
      simplified: (text) =>
        text
          .replace(/\butilize\b/gi, 'use')
          .replace(/\bimplement\b/gi, 'do')
          .replace(/\bfacilitate\b/gi, 'help'),
    };

    const transform = toneTransforms[tone];
    return transform ? transform(content) : content;
  }

  private refocusContent(content: string, focus: string): string {
    // Prepend a focus-oriented paragraph
    const focusParagraph = `\nFocusing on ${focus}, it is essential to consider how this perspective shapes our understanding. `;
    return focusParagraph + content;
  }

  private adjustContentLength(content: string, length: string, originalWordCount: number): string {
    const words = content.split(/\s+/);

    if (length === 'shorter') {
      const targetCount = Math.floor(originalWordCount * 0.7);
      return words.slice(0, targetCount).join(' ');
    }

    if (length === 'longer') {
      const targetCount = Math.floor(originalWordCount * 1.3);
      let expanded = content;
      while (expanded.split(/\s+/).length < targetCount) {
        expanded +=
          '\n\nFurthermore, this topic warrants additional exploration and consideration of the broader implications involved.';
      }
      return expanded.split(/\s+/).slice(0, targetCount).join(' ');
    }

    return content;
  }
}
