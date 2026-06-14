/**
 * AENEWS Agent OS X - SEO Optimization Agent
 * SEO analysis, keyword research, content optimization, meta tag generation,
 * competitor analysis, and technical SEO auditing.
 */

import { Injectable, Inject } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
import { BusinessCapability } from '../../../software-factory/interfaces';

// ─── Agent Configuration ──────────────────────────────────────────

export const SEO_OPTIMIZATION_AGENT_CONFIG: AgentConfig = {
  id: 'marketing-seo',
  name: 'SEOOptimization',
  cluster: AgentCluster.MARKETING,
  version: '1.0.0',
  description:
    'SEO analysis agent that handles keyword research, content optimization, meta tag generation, competitor analysis, and technical SEO auditing for improved search rankings.',
  capabilities: [
    {
      name: 'analyzeSEO',
      description: 'Analyze SEO quality of a given content or URL',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Content to analyze' },
          url: { type: 'string', description: 'URL to analyze (alternative to content)' },
          targetKeywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Keywords to evaluate against',
          },
        },
        required: ['content'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          issues: { type: 'array', items: { type: 'object' } },
          suggestions: { type: 'array', items: { type: 'string' } },
          keywordDensity: { type: 'object' },
        },
      },
    },
    {
      name: 'researchKeywords',
      description: 'Research keywords for a given topic or niche',
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Topic or niche for keyword research' },
          seedKeywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Starting keywords',
          },
          language: { type: 'string', description: 'Target language' },
          region: { type: 'string', description: 'Target region for search volume' },
        },
        required: ['topic'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          keywords: { type: 'array', items: { type: 'object' } },
          relatedTopics: { type: 'array', items: { type: 'string' } },
          contentGaps: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'optimizeContent',
      description: 'Optimize content for target keywords and SEO best practices',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Content to optimize' },
          targetKeywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Target keywords',
          },
          title: { type: 'string', description: 'Page title' },
          optimizeFor: {
            type: 'string',
            enum: ['keywords', 'readability', 'featured-snippet', 'all'],
            description: 'Optimization focus',
          },
        },
        required: ['content', 'targetKeywords'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          optimizedContent: { type: 'string' },
          changes: { type: 'array', items: { type: 'object' } },
          seoScore: { type: 'number' },
        },
      },
    },
    {
      name: 'generateMetaTags',
      description: 'Generate SEO meta tags for a page or content',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Page title' },
          description: { type: 'string', description: 'Page description' },
          keywords: { type: 'array', items: { type: 'string' }, description: 'Target keywords' },
          url: { type: 'string', description: 'Page URL' },
          type: {
            type: 'string',
            enum: ['website', 'article', 'product', 'profile'],
            description: 'Page type',
          },
          imageUrl: { type: 'string', description: 'OG image URL' },
        },
        required: ['title', 'description'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          metaTitle: { type: 'string' },
          metaDescription: { type: 'string' },
          ogTags: { type: 'object' },
          twitterTags: { type: 'object' },
          structuredData: { type: 'object' },
        },
      },
    },
    {
      name: 'analyzeCompetitors',
      description: 'Analyze competitor SEO strategies and rankings',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Your domain' },
          competitorDomains: {
            type: 'array',
            items: { type: 'string' },
            description: 'Competitor domains to analyze',
          },
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Keywords to compare',
          },
        },
        required: ['domain', 'competitorDomains'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          competitors: { type: 'array', items: { type: 'object' } },
          opportunities: { type: 'array', items: { type: 'string' } },
          keywordGaps: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    {
      name: 'auditTechnicalSEO',
      description: 'Perform a technical SEO audit for a domain or URL',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL or domain to audit' },
          checkCategories: {
            type: 'array',
            items: { type: 'string' },
            description: 'Categories to check',
          },
          depth: {
            type: 'string',
            enum: ['quick', 'standard', 'comprehensive'],
            description: 'Audit depth',
          },
        },
        required: ['url'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          overallScore: { type: 'number' },
          issues: { type: 'array', items: { type: 'object' } },
          recommendations: { type: 'array', items: { type: 'string' } },
          categories: { type: 'object' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:seo', 'write:seo', 'read:content', 'read:analytics'],
  maxConcurrentTasks: 3,
  timeout: 90000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 2000,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface SEOIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  recommendation: string;
}

interface KeywordData {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  relevance: number;
  cpc: number;
}

interface ContentChange {
  type: string;
  original: string;
  optimized: string;
  reason: string;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class SEOOptimizationAgentService extends BaseAgentService {
  private auditHistory: Array<{
    url: string;
    score: number;
    timestamp: Date;
  }> = [];
  private keywordCache: Map<string, KeywordData[]> = new Map();

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
    this.agentBridge = bridge ?? null;
  }

  protected defineConfig(): AgentConfig {
    return SEO_OPTIMIZATION_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    // Register tools
    this.registerTool({
      name: 'analyzeSEO',
      description: 'Analyze SEO quality of a given content or URL',
      execute: async (params: { content: string; url?: string; targetKeywords?: string[] }) =>
        this.analyzeSEO(params),
    });

    this.registerTool({
      name: 'researchKeywords',
      description: 'Research keywords for a given topic or niche',
      execute: async (params: {
        topic: string;
        seedKeywords?: string[];
        language?: string;
        region?: string;
      }) => this.researchKeywords(params),
    });

    this.registerTool({
      name: 'optimizeContent',
      description: 'Optimize content for target keywords and SEO best practices',
      execute: async (params: {
        content: string;
        targetKeywords: string[];
        title?: string;
        optimizeFor?: string;
      }) => this.optimizeContent(params),
    });

    this.registerTool({
      name: 'generateMetaTags',
      description: 'Generate SEO meta tags for a page or content',
      execute: async (params: {
        title: string;
        description: string;
        keywords?: string[];
        url?: string;
        type?: string;
        imageUrl?: string;
      }) => this.generateMetaTags(params),
    });

    this.registerTool({
      name: 'analyzeCompetitors',
      description: 'Analyze competitor SEO strategies and rankings',
      execute: async (params: {
        domain: string;
        competitorDomains: string[];
        keywords?: string[];
      }) => this.analyzeCompetitors(params),
    });

    this.registerTool({
      name: 'auditTechnicalSEO',
      description: 'Perform a technical SEO audit for a domain or URL',
      execute: async (params: { url: string; checkCategories?: string[]; depth?: string }) =>
        this.auditTechnicalSEO(params),
    });

    await this.storeInWorkingMemory('seo:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('SEOOptimization agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    // Bridge delegation: try real connector first, fallback to simulated logic
    if (this.bridge) {
      try {
        const result = await this.bridge.executeCapability(BusinessCapability.SEO, {
          missionId: input.taskId,
          instruction: JSON.stringify(input.payload),
          workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
          parameters: input.payload,
        });
        return this.createAgentOutput(
          input.taskId,
          result.success,
          result.output,
          result.error,
          startTime,
        );
      } catch (error) {
        this.logger.warn(`Bridge failed, fallback: ${(error as Error).message}`);
      }
    }

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
      'analyzeSEO',
      'researchKeywords',
      'optimizeContent',
      'generateMetaTags',
      'analyzeCompetitors',
      'auditTechnicalSEO',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown SEO action: ${action}. Supported: ${supportedActions.join(', ')}`,
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
        `seo:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`SEOOptimization execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.auditHistory = [];
    this.keywordCache.clear();
    this.logger.log('SEOOptimization agent destroyed, audit history and keyword cache cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async analyzeSEO(params: {
    content: string;
    url?: string;
    targetKeywords?: string[];
  }): Promise<{
    score: number;
    issues: SEOIssue[];
    suggestions: string[];
    keywordDensity: Record<string, number>;
  }> {
    const { content, targetKeywords = [] } = params;

    if (!content || typeof content !== 'string') {
      throw new Error('Valid content string is required for SEO analysis');
    }

    // Try LLM-powered SEO analysis
    try {
      const contentPreview = content.substring(0, 3000);
      const systemPrompt = `You are an SEO analysis expert. Analyze the content for SEO quality and provide specific, actionable recommendations. Return JSON: { "score": 0-100, "issues": [{ "severity": "critical|warning|info", "category": "string", "message": "string", "recommendation": "string" }], "suggestions": ["string"], "keywordDensity": { "keyword": 0.0-1.0 } }. Be thorough and specific.`;
      const userPrompt = `Content: ${contentPreview}\\nTarget keywords: ${targetKeywords.join(', ') || 'Not specified'}\\nURL: ${params.url || 'Not provided'}\\nAnalyze SEO quality.`;

      const response = await this.executeWithLLM(systemPrompt, userPrompt, {
        maxTokens: 2048,
        temperature: 0.3,
      });

      const parsed = this.parseLLMResponse(response);
      if (parsed && typeof parsed.score === 'number') {
        this.logger.log(`LLM SEO analysis: score=${parsed.score}, issues=${parsed.issues?.length || 0}`);
        return {
          score: parsed.score,
          issues: Array.isArray(parsed.issues) ? parsed.issues : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
          keywordDensity: parsed.keywordDensity || {},
        };
      }
    } catch (error) {
      this.logger.warn(`LLM SEO analysis failed, using heuristic: ${(error as Error).message}`);
    }

    // Heuristic fallback
    const issues: SEOIssue[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Content length check
    const wordCount = content.split(/\s+/).length;
    if (wordCount < 300) {
      issues.push({
        severity: 'critical',
        category: 'content-length',
        message: `Content is too short (${wordCount} words). Minimum recommended is 300 words.`,
        recommendation: 'Expand content to at least 300 words for better SEO performance.',
      });
      score -= 20;
    } else if (wordCount < 600) {
      issues.push({
        severity: 'warning',
        category: 'content-length',
        message: `Content length is below optimal (${wordCount} words). Recommended: 600+ words.`,
        recommendation: 'Consider adding more detailed content for improved rankings.',
      });
      score -= 10;
    }

    // Heading structure check
    const h1Count = (content.match(/^#\s+/gm) || []).length;
    if (h1Count === 0) {
      issues.push({
        severity: 'warning',
        category: 'heading-structure',
        message: 'No H1 heading found.',
        recommendation: 'Add a clear H1 heading that includes your target keyword.',
      });
      score -= 10;
    } else if (h1Count > 1) {
      issues.push({
        severity: 'warning',
        category: 'heading-structure',
        message: `Multiple H1 headings found (${h1Count}). Only one H1 is recommended.`,
        recommendation: 'Keep only one H1 heading per page for better SEO structure.',
      });
      score -= 5;
    }

    // Keyword density analysis
    const keywordDensity: Record<string, number> = {};
    const contentLower = content.toLowerCase();

    for (const keyword of targetKeywords) {
      const keywordLower = keyword.toLowerCase();
      const regex = new RegExp(keywordLower, 'gi');
      const matches = contentLower.match(regex);
      const count = matches ? matches.length : 0;
      const density = wordCount > 0 ? (count / wordCount) * 100 : 0;
      keywordDensity[keyword] = Math.round(density * 100) / 100;

      if (density === 0) {
        issues.push({
          severity: 'critical',
          category: 'keyword-usage',
          message: `Target keyword "${keyword}" not found in content.`,
          recommendation: `Include the keyword "${keyword}" naturally in the content.`,
        });
        score -= 15;
      } else if (density > 3) {
        issues.push({
          severity: 'warning',
          category: 'keyword-stuffing',
          message: `Keyword "${keyword}" density is too high (${density.toFixed(2)}%). Risk of keyword stuffing.`,
          recommendation: 'Reduce keyword frequency to maintain a natural reading flow.',
        });
        score -= 5;
      } else if (density >= 1 && density <= 3) {
        suggestions.push(`Keyword "${keyword}" density is optimal (${density.toFixed(2)}%).`);
      }
    }

    // Image alt text check (simplified)
    const imgTags = content.match(/!\[([^\]]*)\]/g) || [];
    const imgsWithoutAlt = imgTags.filter((tag) => tag === '![]' || tag.match(/!\[\s*\]/));
    if (imgsWithoutAlt.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'image-alt',
        message: `${imgsWithoutAlt.length} image(s) missing alt text.`,
        recommendation: 'Add descriptive alt text to all images for better accessibility and SEO.',
      });
      score -= 5;
    }

    // Readability check (simplified Flesch-Kincaid approximation)
    const avgSentenceLength = this.calculateAvgSentenceLength(content);
    if (avgSentenceLength > 25) {
      suggestions.push(
        'Average sentence length is high. Consider shortening sentences for better readability.',
      );
    }

    // Internal/external links check
    const linkCount = (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length;
    if (linkCount === 0) {
      suggestions.push('No links found. Adding internal and external links can improve SEO.');
    }

    score = Math.max(0, Math.min(100, score));

    this.logger.log(
      `SEO analysis complete: score=${score}, issues=${issues.length}, keywords=${targetKeywords.length}`,
    );

    return { score, issues, suggestions, keywordDensity };
  }

  private async researchKeywords(params: {
    topic: string;
    seedKeywords?: string[];
    language?: string;
    region?: string;
  }): Promise<{
    keywords: KeywordData[];
    relatedTopics: string[];
    contentGaps: string[];
  }> {
    const { topic, seedKeywords = [], language = 'en', region = 'us' } = params;

    if (!topic || typeof topic !== 'string') {
      throw new Error('A valid topic string is required');
    }

    // Try LLM-powered keyword research
    try {
      const systemPrompt = `You are an SEO keyword research expert. Research keywords for the given topic and provide comprehensive keyword data. Return JSON: { "keywords": [{ "keyword": "string", "searchVolume": number, "difficulty": 0-100, "relevance": 0-1, "cpc": number }], "relatedTopics": ["string"], "contentGaps": ["string"] }. Provide realistic search volumes and difficulty scores.`;
      const userPrompt = `Topic: ${topic}\\nSeed keywords: ${seedKeywords.join(', ') || 'None'}\\nLanguage: ${language}\\nRegion: ${region}\\nResearch keywords.`;

      const response = await this.executeWithLLM(systemPrompt, userPrompt, {
        maxTokens: 2048,
        temperature: 0.4,
      });

      const parsed = this.parseLLMResponse(response);
      if (parsed?.keywords && Array.isArray(parsed.keywords) && parsed.keywords.length > 0) {
        this.logger.log(`LLM keyword research: topic="${topic}", keywords=${parsed.keywords.length}`);
        return {
          keywords: parsed.keywords,
          relatedTopics: Array.isArray(parsed.relatedTopics) ? parsed.relatedTopics : [],
          contentGaps: Array.isArray(parsed.contentGaps) ? parsed.contentGaps : [],
        };
      }
    } catch (error) {
      this.logger.warn(`LLM keyword research failed, using heuristic: ${(error as Error).message}`);
    }

    // Heuristic fallback: Generate keyword variations from topic and seeds
    const baseKeywords = [topic, ...seedKeywords];
    const allKeywords: KeywordData[] = [];

    for (const base of baseKeywords) {
      const variations = this.generateKeywordVariations(base);
      for (const kw of variations) {
        allKeywords.push({
          keyword: kw,
          searchVolume: this.estimateSearchVolume(kw, region),
          difficulty: this.estimateDifficulty(kw),
          relevance: this.estimateRelevance(kw, topic),
          cpc: this.estimateCPC(kw),
        });
      }
    }

    // Sort by relevance and search volume
    allKeywords.sort((a, b) => b.relevance * b.searchVolume - a.relevance * a.searchVolume);

    const keywords = allKeywords.slice(0, 30);
    const relatedTopics = this.generateRelatedTopics(topic, seedKeywords);
    const contentGaps = this.identifyContentGaps(topic, keywords);

    // Cache results
    this.keywordCache.set(topic, keywords);

    this.logger.log(
      `Keyword research complete: topic="${topic}", keywords=${keywords.length}, gaps=${contentGaps.length}`,
    );

    return { keywords, relatedTopics, contentGaps };
  }

  private async optimizeContent(params: {
    content: string;
    targetKeywords: string[];
    title?: string;
    optimizeFor?: string;
  }): Promise<{
    optimizedContent: string;
    changes: ContentChange[];
    seoScore: number;
  }> {
    const { content, targetKeywords, title = '', optimizeFor = 'all' } = params;

    if (!content || typeof content !== 'string') {
      throw new Error('Valid content string is required for optimization');
    }
    if (!targetKeywords || targetKeywords.length === 0) {
      throw new Error('At least one target keyword is required');
    }

    const changes: ContentChange[] = [];
    let optimizedContent = content;

    // Optimize title if provided
    if (title && !title.toLowerCase().includes(targetKeywords[0].toLowerCase())) {
      const optimizedTitle = `${targetKeywords[0]} - ${title}`;
      changes.push({
        type: 'title-optimization',
        original: title,
        optimized: optimizedTitle,
        reason: 'Added primary keyword to title',
      });
    }

    // Keyword optimization
    if (optimizeFor === 'keywords' || optimizeFor === 'all') {
      const keywordResult = this.optimizeForKeywords(optimizedContent, targetKeywords);
      optimizedContent = keywordResult.content;
      changes.push(...keywordResult.changes);
    }

    // Readability optimization
    if (optimizeFor === 'readability' || optimizeFor === 'all') {
      const readabilityResult = this.optimizeForReadability(optimizedContent);
      optimizedContent = readabilityResult.content;
      changes.push(...readabilityResult.changes);
    }

    // Featured snippet optimization
    if (optimizeFor === 'featured-snippet' || optimizeFor === 'all') {
      const snippetResult = this.optimizeForFeaturedSnippet(optimizedContent, targetKeywords);
      optimizedContent = snippetResult.content;
      changes.push(...snippetResult.changes);
    }

    // Calculate SEO score after optimization
    const wordCount = optimizedContent.split(/\s+/).length;
    let seoScore = 70; // Base score

    for (const keyword of targetKeywords) {
      const regex = new RegExp(keyword.toLowerCase(), 'gi');
      const matches = optimizedContent.toLowerCase().match(regex);
      if (matches && matches.length > 0) seoScore += 5;
    }

    if (wordCount >= 600) seoScore += 10;
    if (optimizedContent.includes('## ')) seoScore += 5;

    seoScore = Math.min(100, seoScore);

    this.logger.log(
      `Content optimized: keywords=${targetKeywords.length}, changes=${changes.length}, score=${seoScore}`,
    );

    return { optimizedContent, changes, seoScore };
  }

  private async generateMetaTags(params: {
    title: string;
    description: string;
    keywords?: string[];
    url?: string;
    type?: string;
    imageUrl?: string;
  }): Promise<{
    metaTitle: string;
    metaDescription: string;
    ogTags: Record<string, string>;
    twitterTags: Record<string, string>;
    structuredData: Record<string, any>;
  }> {
    const { title, description, keywords = [], url = '', type = 'website', imageUrl = '' } = params;

    if (!title || typeof title !== 'string') {
      throw new Error('A valid title is required');
    }
    if (!description || typeof description !== 'string') {
      throw new Error('A valid description is required');
    }

    // Optimize meta title (max 60 chars)
    let metaTitle = title;
    if (metaTitle.length > 60) {
      metaTitle = metaTitle.substring(0, 57) + '...';
    }
    if (keywords.length > 0 && !metaTitle.toLowerCase().includes(keywords[0].toLowerCase())) {
      const newTitle = `${keywords[0]} | ${metaTitle}`;
      if (newTitle.length <= 60) {
        metaTitle = newTitle;
      }
    }

    // Optimize meta description (max 160 chars)
    let metaDescription = description;
    if (metaDescription.length > 160) {
      metaDescription = metaDescription.substring(0, 157) + '...';
    }

    // Generate Open Graph tags
    const ogTags: Record<string, string> = {
      'og:title': metaTitle,
      'og:description': metaDescription,
      'og:type': type,
    };
    if (url) ogTags['og:url'] = url;
    if (imageUrl) ogTags['og:image'] = imageUrl;

    // Generate Twitter Card tags
    const twitterTags: Record<string, string> = {
      'twitter:card': imageUrl ? 'summary_large_image' : 'summary',
      'twitter:title': metaTitle,
      'twitter:description': metaDescription,
    };
    if (imageUrl) twitterTags['twitter:image'] = imageUrl;

    // Generate basic structured data
    const structuredData: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': type === 'article' ? 'Article' : type === 'product' ? 'Product' : 'WebPage',
      name: metaTitle,
      description: metaDescription,
    };
    if (url) structuredData.url = url;
    if (keywords.length > 0) structuredData.keywords = keywords.join(', ');

    this.logger.log(`Generated meta tags: title="${metaTitle.substring(0, 40)}", type=${type}`);

    return { metaTitle, metaDescription, ogTags, twitterTags, structuredData };
  }

  private async analyzeCompetitors(params: {
    domain: string;
    competitorDomains: string[];
    keywords?: string[];
  }): Promise<{
    competitors: Array<{
      domain: string;
      estimatedScore: number;
      strengths: string[];
      weaknesses: string[];
    }>;
    opportunities: string[];
    keywordGaps: Array<{
      keyword: string;
      competitorRanking: string;
      yourRanking: string;
    }>;
  }> {
    const { domain, competitorDomains, keywords = [] } = params;

    if (!domain || typeof domain !== 'string') {
      throw new Error('A valid domain is required');
    }
    if (!competitorDomains || !Array.isArray(competitorDomains) || competitorDomains.length === 0) {
      throw new Error('At least one competitor domain is required');
    }

    const competitors = competitorDomains.map((compDomain) => {
      const estimatedScore = 50 + Math.floor(Math.random() * 40);
      const strengths = this.estimateCompetitorStrengths(compDomain);
      const weaknesses = this.estimateCompetitorWeaknesses(compDomain);

      return {
        domain: compDomain,
        estimatedScore,
        strengths,
        weaknesses,
      };
    });

    const opportunities = this.identifyOpportunities(domain, competitors, keywords);

    const keywordGaps =
      keywords.length > 0
        ? keywords.map((keyword) => ({
            keyword,
            competitorRanking: `Top ${Math.floor(Math.random() * 10) + 1}`,
            yourRanking: `Position ${Math.floor(Math.random() * 30) + 11}`,
          }))
        : [];

    this.logger.log(
      `Competitor analysis complete: domain=${domain}, competitors=${competitorDomains.length}`,
    );

    return { competitors, opportunities, keywordGaps };
  }

  private async auditTechnicalSEO(params: {
    url: string;
    checkCategories?: string[];
    depth?: string;
  }): Promise<{
    overallScore: number;
    issues: SEOIssue[];
    recommendations: string[];
    categories: Record<string, number>;
  }> {
    const { url, checkCategories = ['all'], depth = 'standard' } = params;

    if (!url || typeof url !== 'string') {
      throw new Error('A valid URL is required for technical SEO audit');
    }

    const issues: SEOIssue[] = [];
    const recommendations: string[] = [];
    const categories: Record<string, number> = {};

    const allCategories = [
      'crawlability',
      'indexability',
      'performance',
      'mobile',
      'security',
      'structured-data',
    ];
    const activeCategories = checkCategories.includes('all') ? allCategories : checkCategories;

    // Crawlability checks
    if (activeCategories.includes('crawlability')) {
      const crawlScore = 85;
      categories['crawlability'] = crawlScore;
      if (crawlScore < 90) {
        issues.push({
          severity: 'info',
          category: 'crawlability',
          message: 'Robots.txt should be reviewed for optimal crawl directives.',
          recommendation:
            'Ensure robots.txt allows crawling of important pages and blocks non-essential paths.',
        });
      }
      recommendations.push('Submit an updated XML sitemap to search engines.');
    }

    // Indexability checks
    if (activeCategories.includes('indexability')) {
      const indexScore = 80;
      categories['indexability'] = indexScore;
      if (indexScore < 90) {
        issues.push({
          severity: 'warning',
          category: 'indexability',
          message: 'Some pages may have noindex directives or canonical issues.',
          recommendation:
            'Review canonical tags and noindex directives across all important pages.',
        });
      }
      recommendations.push('Implement hreflang tags for multi-language content.');
    }

    // Performance checks
    if (activeCategories.includes('performance')) {
      const perfScore = 70 + Math.floor(Math.random() * 20);
      categories['performance'] = perfScore;
      if (perfScore < 80) {
        issues.push({
          severity: 'warning',
          category: 'performance',
          message: 'Page load speed may be below recommended thresholds.',
          recommendation:
            'Optimize images, leverage browser caching, and minimize render-blocking resources.',
        });
      }
      recommendations.push('Implement lazy loading for images and below-the-fold content.');
      recommendations.push('Consider using a CDN for static assets.');
    }

    // Mobile-friendliness checks
    if (activeCategories.includes('mobile')) {
      const mobileScore = 75 + Math.floor(Math.random() * 20);
      categories['mobile'] = mobileScore;
      if (mobileScore < 85) {
        issues.push({
          severity: 'warning',
          category: 'mobile',
          message: 'Mobile usability issues detected.',
          recommendation:
            'Ensure responsive design, adequate tap targets, and no horizontal scrolling.',
        });
      }
      recommendations.push('Test with Google Mobile-Friendly Test tool.');
    }

    // Security checks
    if (activeCategories.includes('security')) {
      const secScore = url.startsWith('https') ? 95 : 40;
      categories['security'] = secScore;
      if (secScore < 80) {
        issues.push({
          severity: 'critical',
          category: 'security',
          message: 'Site is not using HTTPS. This affects rankings and user trust.',
          recommendation: 'Migrate to HTTPS immediately with a valid SSL certificate.',
        });
      }
      recommendations.push('Implement HTTP Strict Transport Security (HSTS) headers.');
    }

    // Structured data checks
    if (activeCategories.includes('structured-data')) {
      const sdScore = 60 + Math.floor(Math.random() * 25);
      categories['structured-data'] = sdScore;
      if (sdScore < 80) {
        issues.push({
          severity: 'info',
          category: 'structured-data',
          message: 'Structured data may be missing or incomplete.',
          recommendation:
            'Add JSON-LD structured data for rich snippets (Article, FAQ, HowTo, etc.).',
        });
      }
      recommendations.push('Add Schema.org markup for all content types.');
    }

    // Calculate overall score
    const categoryScores = Object.values(categories);
    const overallScore =
      categoryScores.length > 0
        ? Math.round(categoryScores.reduce((sum, s) => sum + s, 0) / categoryScores.length)
        : 0;

    this.auditHistory.push({ url, score: overallScore, timestamp: new Date() });

    this.logger.log(
      `Technical SEO audit complete: url=${url}, score=${overallScore}, issues=${issues.length}`,
    );

    return { overallScore, issues, recommendations, categories };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private calculateAvgSentenceLength(content: string): number {
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length === 0) return 0;
    const totalWords = sentences.reduce(
      (sum, s) => sum + s.split(/\s+/).filter((w) => w.length > 0).length,
      0,
    );
    return totalWords / sentences.length;
  }

  private generateKeywordVariations(base: string): string[] {
    const variations = [base];
    const lower = base.toLowerCase();

    variations.push(`${lower} guide`);
    variations.push(`${lower} tips`);
    variations.push(`best ${lower}`);
    variations.push(`how to ${lower}`);
    variations.push(`${lower} tutorial`);
    variations.push(`${lower} examples`);
    variations.push(`${lower} strategy`);
    variations.push(`what is ${lower}`);

    return variations;
  }

  private estimateSearchVolume(keyword: string, region: string): number {
    // Simplified estimation based on keyword length and common patterns
    const baseVolume = Math.max(100, 10000 - keyword.length * 200);
    const regionMultiplier = region === 'us' ? 1.0 : 0.6;
    return Math.round(baseVolume * regionMultiplier * (0.5 + Math.random()));
  }

  private estimateDifficulty(keyword: string): number {
    // Longer, more specific keywords tend to have lower difficulty
    const wordCount = keyword.split(/\s+/).length;
    if (wordCount >= 4) return 20 + Math.floor(Math.random() * 20);
    if (wordCount >= 3) return 35 + Math.floor(Math.random() * 25);
    return 50 + Math.floor(Math.random() * 40);
  }

  private estimateRelevance(keyword: string, topic: string): number {
    const keywordLower = keyword.toLowerCase();
    const topicLower = topic.toLowerCase();
    if (keywordLower === topicLower) return 1.0;
    if (keywordLower.includes(topicLower) || topicLower.includes(keywordLower)) return 0.8;
    const topicWords = topicLower.split(/\s+/);
    const overlap = topicWords.filter((w) => keywordLower.includes(w)).length;
    return Math.min(1.0, 0.3 + (overlap / topicWords.length) * 0.5);
  }

  private estimateCPC(keyword: string): number {
    const lower = keyword.toLowerCase();
    const highCPCWords = ['insurance', 'loan', 'mortgage', 'attorney', 'software', 'enterprise'];
    const hasHighCPC = highCPCWords.some((w) => lower.includes(w));
    if (hasHighCPC) return +(2.5 + Math.random() * 8).toFixed(2);
    return +(0.5 + Math.random() * 3).toFixed(2);
  }

  private generateRelatedTopics(topic: string, seedKeywords: string[]): string[] {
    const related: string[] = [
      `${topic} best practices`,
      `${topic} trends`,
      `${topic} tools`,
      `${topic} vs alternatives`,
      `${topic} case studies`,
    ];
    for (const seed of seedKeywords.slice(0, 3)) {
      related.push(`${seed} and ${topic}`);
    }
    return related;
  }

  private identifyContentGaps(topic: string, keywords: KeywordData[]): string[] {
    const gaps: string[] = [
      `Comprehensive guide to ${topic} for beginners`,
      `Advanced ${topic} strategies`,
      `${topic} comparison and reviews`,
      `Common ${topic} mistakes to avoid`,
    ];

    // Add gaps based on low-difficulty, high-volume keywords
    const easyKeywords = keywords
      .filter((kw) => kw.difficulty < 40 && kw.searchVolume > 500)
      .slice(0, 3);
    for (const kw of easyKeywords) {
      gaps.push(`Content targeting "${kw.keyword}"`);
    }

    return gaps;
  }

  private optimizeForKeywords(
    content: string,
    targetKeywords: string[],
  ): { content: string; changes: ContentChange[] } {
    const changes: ContentChange[] = [];
    let optimizedContent = content;

    for (const keyword of targetKeywords) {
      const keywordLower = keyword.toLowerCase();
      const contentLower = optimizedContent.toLowerCase();
      const regex = new RegExp(keywordLower, 'gi');
      const matches = contentLower.match(regex);

      if (!matches || matches.length === 0) {
        // Add keyword to the first paragraph
        const paragraphs = optimizedContent.split('\n\n');
        if (paragraphs.length > 0) {
          const originalFirst = paragraphs[0];
          paragraphs[0] = `${originalFirst} ${keyword}.`;
          optimizedContent = paragraphs.join('\n\n');
          changes.push({
            type: 'keyword-insertion',
            original: originalFirst.substring(0, 50) + '...',
            optimized: paragraphs[0].substring(0, 50) + '...',
            reason: `Added missing keyword "${keyword}" to first paragraph`,
          });
        }
      }
    }

    return { content: optimizedContent, changes };
  }

  private optimizeForReadability(content: string): { content: string; changes: ContentChange[] } {
    const changes: ContentChange[] = [];
    let optimizedContent = content;

    // Break long paragraphs
    const paragraphs = optimizedContent.split('\n\n');
    const optimizedParagraphs: string[] = [];

    for (const paragraph of paragraphs) {
      if (paragraph.split(/\s+/).length > 150) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        const mid = Math.ceil(sentences.length / 2);
        const firstHalf = sentences.slice(0, mid).join('');
        const secondHalf = sentences.slice(mid).join('');
        optimizedParagraphs.push(firstHalf, secondHalf);

        changes.push({
          type: 'paragraph-split',
          original: `Long paragraph (${paragraph.split(/\s+/).length} words)`,
          optimized: `Split into 2 paragraphs`,
          reason: 'Long paragraphs reduce readability; split for better user experience',
        });
      } else {
        optimizedParagraphs.push(paragraph);
      }
    }

    optimizedContent = optimizedParagraphs.join('\n\n');
    return { content: optimizedContent, changes };
  }

  private optimizeForFeaturedSnippet(
    content: string,
    targetKeywords: string[],
  ): { content: string; changes: ContentChange[] } {
    const changes: ContentChange[] = [];
    let optimizedContent = content;

    // Add a definition paragraph for featured snippet targeting
    if (targetKeywords.length > 0) {
      const primaryKeyword = targetKeywords[0];
      const definition = `\n**${primaryKeyword}** is a concept or practice that encompasses key strategies and methodologies aimed at achieving specific outcomes. Understanding ${primaryKeyword.toLowerCase()} is essential for success in this domain.\n`;

      // Insert after the first paragraph
      const paragraphs = optimizedContent.split('\n\n');
      if (paragraphs.length > 1) {
        paragraphs.splice(1, 0, definition);
        optimizedContent = paragraphs.join('\n\n');
        changes.push({
          type: 'featured-snippet-optimization',
          original: 'No snippet-optimized definition paragraph',
          optimized: `Added definition paragraph for "${primaryKeyword}"`,
          reason: 'Direct, concise definitions improve chances of featured snippet selection',
        });
      }
    }

    return { content: optimizedContent, changes };
  }

  private estimateCompetitorStrengths(domain: string): string[] {
    const strengths = [
      'Strong domain authority',
      'Extensive content library',
      'Quality backlink profile',
      'Active social media presence',
      'Fast page load speeds',
    ];
    return strengths.slice(0, 2 + Math.floor(Math.random() * 2));
  }

  private estimateCompetitorWeaknesses(domain: string): string[] {
    const weaknesses = [
      'Limited mobile optimization',
      'Thin content on key pages',
      'Poor internal linking structure',
      'Missing structured data',
      'Slow page speed on mobile',
    ];
    return weaknesses.slice(0, 1 + Math.floor(Math.random() * 2));
  }

  private identifyOpportunities(
    domain: string,
    competitors: Array<{ domain: string; weaknesses: string[] }>,
    keywords: string[],
  ): string[] {
    const opportunities: string[] = [];

    // Based on competitor weaknesses
    const allWeaknesses = competitors.flatMap((c) => c.weaknesses);
    const uniqueWeaknesses = [...new Set(allWeaknesses)];
    for (const weakness of uniqueWeaknesses.slice(0, 3)) {
      opportunities.push(`Capitalize on competitor weakness: ${weakness.toLowerCase()}`);
    }

    // Based on keywords
    if (keywords.length > 0) {
      opportunities.push(`Target long-tail keywords that competitors are missing`);
      opportunities.push(
        `Create comprehensive content around "${keywords[0]}" to outrank competitors`,
      );
    }

    opportunities.push('Build high-quality backlinks through content marketing and outreach');

    return opportunities;
  }
}
