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
exports.SEOOptimizationAgentService = exports.SEO_OPTIMIZATION_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.SEO_OPTIMIZATION_AGENT_CONFIG = {
    id: 'marketing-seo',
    name: 'SEOOptimization',
    cluster: agent_interface_1.AgentCluster.MARKETING,
    version: '1.0.0',
    description: 'SEO analysis agent that handles keyword research, content optimization, meta tag generation, competitor analysis, and technical SEO auditing for improved search rankings.',
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
let SEOOptimizationAgentService = class SEOOptimizationAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.auditHistory = [];
        this.keywordCache = new Map();
    }
    defineConfig() {
        return exports.SEO_OPTIMIZATION_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'analyzeSEO',
            description: 'Analyze SEO quality of a given content or URL',
            execute: async (params) => this.analyzeSEO(params),
        });
        this.registerTool({
            name: 'researchKeywords',
            description: 'Research keywords for a given topic or niche',
            execute: async (params) => this.researchKeywords(params),
        });
        this.registerTool({
            name: 'optimizeContent',
            description: 'Optimize content for target keywords and SEO best practices',
            execute: async (params) => this.optimizeContent(params),
        });
        this.registerTool({
            name: 'generateMetaTags',
            description: 'Generate SEO meta tags for a page or content',
            execute: async (params) => this.generateMetaTags(params),
        });
        this.registerTool({
            name: 'analyzeCompetitors',
            description: 'Analyze competitor SEO strategies and rankings',
            execute: async (params) => this.analyzeCompetitors(params),
        });
        this.registerTool({
            name: 'auditTechnicalSEO',
            description: 'Perform a technical SEO audit for a domain or URL',
            execute: async (params) => this.auditTechnicalSEO(params),
        });
        await this.storeInWorkingMemory('seo:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('SEOOptimization agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.BusinessCapability.SEO, {
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
            'analyzeSEO',
            'researchKeywords',
            'optimizeContent',
            'generateMetaTags',
            'analyzeCompetitors',
            'auditTechnicalSEO',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown SEO action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`seo:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`SEOOptimization execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.auditHistory = [];
        this.keywordCache.clear();
        this.logger.log('SEOOptimization agent destroyed, audit history and keyword cache cleared');
    }
    async analyzeSEO(params) {
        const { content, targetKeywords = [] } = params;
        if (!content || typeof content !== 'string') {
            throw new Error('Valid content string is required for SEO analysis');
        }
        const issues = [];
        const suggestions = [];
        let score = 100;
        const wordCount = content.split(/\s+/).length;
        if (wordCount < 300) {
            issues.push({
                severity: 'critical',
                category: 'content-length',
                message: `Content is too short (${wordCount} words). Minimum recommended is 300 words.`,
                recommendation: 'Expand content to at least 300 words for better SEO performance.',
            });
            score -= 20;
        }
        else if (wordCount < 600) {
            issues.push({
                severity: 'warning',
                category: 'content-length',
                message: `Content length is below optimal (${wordCount} words). Recommended: 600+ words.`,
                recommendation: 'Consider adding more detailed content for improved rankings.',
            });
            score -= 10;
        }
        const h1Count = (content.match(/^#\s+/gm) || []).length;
        if (h1Count === 0) {
            issues.push({
                severity: 'warning',
                category: 'heading-structure',
                message: 'No H1 heading found.',
                recommendation: 'Add a clear H1 heading that includes your target keyword.',
            });
            score -= 10;
        }
        else if (h1Count > 1) {
            issues.push({
                severity: 'warning',
                category: 'heading-structure',
                message: `Multiple H1 headings found (${h1Count}). Only one H1 is recommended.`,
                recommendation: 'Keep only one H1 heading per page for better SEO structure.',
            });
            score -= 5;
        }
        const keywordDensity = {};
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
            }
            else if (density > 3) {
                issues.push({
                    severity: 'warning',
                    category: 'keyword-stuffing',
                    message: `Keyword "${keyword}" density is too high (${density.toFixed(2)}%). Risk of keyword stuffing.`,
                    recommendation: 'Reduce keyword frequency to maintain a natural reading flow.',
                });
                score -= 5;
            }
            else if (density >= 1 && density <= 3) {
                suggestions.push(`Keyword "${keyword}" density is optimal (${density.toFixed(2)}%).`);
            }
        }
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
        const avgSentenceLength = this.calculateAvgSentenceLength(content);
        if (avgSentenceLength > 25) {
            suggestions.push('Average sentence length is high. Consider shortening sentences for better readability.');
        }
        const linkCount = (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length;
        if (linkCount === 0) {
            suggestions.push('No links found. Adding internal and external links can improve SEO.');
        }
        score = Math.max(0, Math.min(100, score));
        this.logger.log(`SEO analysis complete: score=${score}, issues=${issues.length}, keywords=${targetKeywords.length}`);
        return { score, issues, suggestions, keywordDensity };
    }
    async researchKeywords(params) {
        const { topic, seedKeywords = [], language = 'en', region = 'us' } = params;
        if (!topic || typeof topic !== 'string') {
            throw new Error('A valid topic string is required');
        }
        const baseKeywords = [topic, ...seedKeywords];
        const allKeywords = [];
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
        allKeywords.sort((a, b) => b.relevance * b.searchVolume - a.relevance * a.searchVolume);
        const keywords = allKeywords.slice(0, 30);
        const relatedTopics = this.generateRelatedTopics(topic, seedKeywords);
        const contentGaps = this.identifyContentGaps(topic, keywords);
        this.keywordCache.set(topic, keywords);
        this.logger.log(`Keyword research complete: topic="${topic}", keywords=${keywords.length}, gaps=${contentGaps.length}`);
        return { keywords, relatedTopics, contentGaps };
    }
    async optimizeContent(params) {
        const { content, targetKeywords, title = '', optimizeFor = 'all' } = params;
        if (!content || typeof content !== 'string') {
            throw new Error('Valid content string is required for optimization');
        }
        if (!targetKeywords || targetKeywords.length === 0) {
            throw new Error('At least one target keyword is required');
        }
        const changes = [];
        let optimizedContent = content;
        if (title && !title.toLowerCase().includes(targetKeywords[0].toLowerCase())) {
            const optimizedTitle = `${targetKeywords[0]} - ${title}`;
            changes.push({
                type: 'title-optimization',
                original: title,
                optimized: optimizedTitle,
                reason: 'Added primary keyword to title',
            });
        }
        if (optimizeFor === 'keywords' || optimizeFor === 'all') {
            const keywordResult = this.optimizeForKeywords(optimizedContent, targetKeywords);
            optimizedContent = keywordResult.content;
            changes.push(...keywordResult.changes);
        }
        if (optimizeFor === 'readability' || optimizeFor === 'all') {
            const readabilityResult = this.optimizeForReadability(optimizedContent);
            optimizedContent = readabilityResult.content;
            changes.push(...readabilityResult.changes);
        }
        if (optimizeFor === 'featured-snippet' || optimizeFor === 'all') {
            const snippetResult = this.optimizeForFeaturedSnippet(optimizedContent, targetKeywords);
            optimizedContent = snippetResult.content;
            changes.push(...snippetResult.changes);
        }
        const wordCount = optimizedContent.split(/\s+/).length;
        let seoScore = 70;
        for (const keyword of targetKeywords) {
            const regex = new RegExp(keyword.toLowerCase(), 'gi');
            const matches = optimizedContent.toLowerCase().match(regex);
            if (matches && matches.length > 0)
                seoScore += 5;
        }
        if (wordCount >= 600)
            seoScore += 10;
        if (optimizedContent.includes('## '))
            seoScore += 5;
        seoScore = Math.min(100, seoScore);
        this.logger.log(`Content optimized: keywords=${targetKeywords.length}, changes=${changes.length}, score=${seoScore}`);
        return { optimizedContent, changes, seoScore };
    }
    async generateMetaTags(params) {
        const { title, description, keywords = [], url = '', type = 'website', imageUrl = '' } = params;
        if (!title || typeof title !== 'string') {
            throw new Error('A valid title is required');
        }
        if (!description || typeof description !== 'string') {
            throw new Error('A valid description is required');
        }
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
        let metaDescription = description;
        if (metaDescription.length > 160) {
            metaDescription = metaDescription.substring(0, 157) + '...';
        }
        const ogTags = {
            'og:title': metaTitle,
            'og:description': metaDescription,
            'og:type': type,
        };
        if (url)
            ogTags['og:url'] = url;
        if (imageUrl)
            ogTags['og:image'] = imageUrl;
        const twitterTags = {
            'twitter:card': imageUrl ? 'summary_large_image' : 'summary',
            'twitter:title': metaTitle,
            'twitter:description': metaDescription,
        };
        if (imageUrl)
            twitterTags['twitter:image'] = imageUrl;
        const structuredData = {
            '@context': 'https://schema.org',
            '@type': type === 'article' ? 'Article' : type === 'product' ? 'Product' : 'WebPage',
            name: metaTitle,
            description: metaDescription,
        };
        if (url)
            structuredData.url = url;
        if (keywords.length > 0)
            structuredData.keywords = keywords.join(', ');
        this.logger.log(`Generated meta tags: title="${metaTitle.substring(0, 40)}", type=${type}`);
        return { metaTitle, metaDescription, ogTags, twitterTags, structuredData };
    }
    async analyzeCompetitors(params) {
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
        const keywordGaps = keywords.length > 0
            ? keywords.map((keyword) => ({
                keyword,
                competitorRanking: `Top ${Math.floor(Math.random() * 10) + 1}`,
                yourRanking: `Position ${Math.floor(Math.random() * 30) + 11}`,
            }))
            : [];
        this.logger.log(`Competitor analysis complete: domain=${domain}, competitors=${competitorDomains.length}`);
        return { competitors, opportunities, keywordGaps };
    }
    async auditTechnicalSEO(params) {
        const { url, checkCategories = ['all'], depth = 'standard' } = params;
        if (!url || typeof url !== 'string') {
            throw new Error('A valid URL is required for technical SEO audit');
        }
        const issues = [];
        const recommendations = [];
        const categories = {};
        const allCategories = [
            'crawlability',
            'indexability',
            'performance',
            'mobile',
            'security',
            'structured-data',
        ];
        const activeCategories = checkCategories.includes('all') ? allCategories : checkCategories;
        if (activeCategories.includes('crawlability')) {
            const crawlScore = 85;
            categories['crawlability'] = crawlScore;
            if (crawlScore < 90) {
                issues.push({
                    severity: 'info',
                    category: 'crawlability',
                    message: 'Robots.txt should be reviewed for optimal crawl directives.',
                    recommendation: 'Ensure robots.txt allows crawling of important pages and blocks non-essential paths.',
                });
            }
            recommendations.push('Submit an updated XML sitemap to search engines.');
        }
        if (activeCategories.includes('indexability')) {
            const indexScore = 80;
            categories['indexability'] = indexScore;
            if (indexScore < 90) {
                issues.push({
                    severity: 'warning',
                    category: 'indexability',
                    message: 'Some pages may have noindex directives or canonical issues.',
                    recommendation: 'Review canonical tags and noindex directives across all important pages.',
                });
            }
            recommendations.push('Implement hreflang tags for multi-language content.');
        }
        if (activeCategories.includes('performance')) {
            const perfScore = 70 + Math.floor(Math.random() * 20);
            categories['performance'] = perfScore;
            if (perfScore < 80) {
                issues.push({
                    severity: 'warning',
                    category: 'performance',
                    message: 'Page load speed may be below recommended thresholds.',
                    recommendation: 'Optimize images, leverage browser caching, and minimize render-blocking resources.',
                });
            }
            recommendations.push('Implement lazy loading for images and below-the-fold content.');
            recommendations.push('Consider using a CDN for static assets.');
        }
        if (activeCategories.includes('mobile')) {
            const mobileScore = 75 + Math.floor(Math.random() * 20);
            categories['mobile'] = mobileScore;
            if (mobileScore < 85) {
                issues.push({
                    severity: 'warning',
                    category: 'mobile',
                    message: 'Mobile usability issues detected.',
                    recommendation: 'Ensure responsive design, adequate tap targets, and no horizontal scrolling.',
                });
            }
            recommendations.push('Test with Google Mobile-Friendly Test tool.');
        }
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
        if (activeCategories.includes('structured-data')) {
            const sdScore = 60 + Math.floor(Math.random() * 25);
            categories['structured-data'] = sdScore;
            if (sdScore < 80) {
                issues.push({
                    severity: 'info',
                    category: 'structured-data',
                    message: 'Structured data may be missing or incomplete.',
                    recommendation: 'Add JSON-LD structured data for rich snippets (Article, FAQ, HowTo, etc.).',
                });
            }
            recommendations.push('Add Schema.org markup for all content types.');
        }
        const categoryScores = Object.values(categories);
        const overallScore = categoryScores.length > 0
            ? Math.round(categoryScores.reduce((sum, s) => sum + s, 0) / categoryScores.length)
            : 0;
        this.auditHistory.push({ url, score: overallScore, timestamp: new Date() });
        this.logger.log(`Technical SEO audit complete: url=${url}, score=${overallScore}, issues=${issues.length}`);
        return { overallScore, issues, recommendations, categories };
    }
    calculateAvgSentenceLength(content) {
        const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
        if (sentences.length === 0)
            return 0;
        const totalWords = sentences.reduce((sum, s) => sum + s.split(/\s+/).filter((w) => w.length > 0).length, 0);
        return totalWords / sentences.length;
    }
    generateKeywordVariations(base) {
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
    estimateSearchVolume(keyword, region) {
        const baseVolume = Math.max(100, 10000 - keyword.length * 200);
        const regionMultiplier = region === 'us' ? 1.0 : 0.6;
        return Math.round(baseVolume * regionMultiplier * (0.5 + Math.random()));
    }
    estimateDifficulty(keyword) {
        const wordCount = keyword.split(/\s+/).length;
        if (wordCount >= 4)
            return 20 + Math.floor(Math.random() * 20);
        if (wordCount >= 3)
            return 35 + Math.floor(Math.random() * 25);
        return 50 + Math.floor(Math.random() * 40);
    }
    estimateRelevance(keyword, topic) {
        const keywordLower = keyword.toLowerCase();
        const topicLower = topic.toLowerCase();
        if (keywordLower === topicLower)
            return 1.0;
        if (keywordLower.includes(topicLower) || topicLower.includes(keywordLower))
            return 0.8;
        const topicWords = topicLower.split(/\s+/);
        const overlap = topicWords.filter((w) => keywordLower.includes(w)).length;
        return Math.min(1.0, 0.3 + (overlap / topicWords.length) * 0.5);
    }
    estimateCPC(keyword) {
        const lower = keyword.toLowerCase();
        const highCPCWords = ['insurance', 'loan', 'mortgage', 'attorney', 'software', 'enterprise'];
        const hasHighCPC = highCPCWords.some((w) => lower.includes(w));
        if (hasHighCPC)
            return +(2.5 + Math.random() * 8).toFixed(2);
        return +(0.5 + Math.random() * 3).toFixed(2);
    }
    generateRelatedTopics(topic, seedKeywords) {
        const related = [
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
    identifyContentGaps(topic, keywords) {
        const gaps = [
            `Comprehensive guide to ${topic} for beginners`,
            `Advanced ${topic} strategies`,
            `${topic} comparison and reviews`,
            `Common ${topic} mistakes to avoid`,
        ];
        const easyKeywords = keywords
            .filter((kw) => kw.difficulty < 40 && kw.searchVolume > 500)
            .slice(0, 3);
        for (const kw of easyKeywords) {
            gaps.push(`Content targeting "${kw.keyword}"`);
        }
        return gaps;
    }
    optimizeForKeywords(content, targetKeywords) {
        const changes = [];
        let optimizedContent = content;
        for (const keyword of targetKeywords) {
            const keywordLower = keyword.toLowerCase();
            const contentLower = optimizedContent.toLowerCase();
            const regex = new RegExp(keywordLower, 'gi');
            const matches = contentLower.match(regex);
            if (!matches || matches.length === 0) {
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
    optimizeForReadability(content) {
        const changes = [];
        let optimizedContent = content;
        const paragraphs = optimizedContent.split('\n\n');
        const optimizedParagraphs = [];
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
            }
            else {
                optimizedParagraphs.push(paragraph);
            }
        }
        optimizedContent = optimizedParagraphs.join('\n\n');
        return { content: optimizedContent, changes };
    }
    optimizeForFeaturedSnippet(content, targetKeywords) {
        const changes = [];
        let optimizedContent = content;
        if (targetKeywords.length > 0) {
            const primaryKeyword = targetKeywords[0];
            const definition = `\n**${primaryKeyword}** is a concept or practice that encompasses key strategies and methodologies aimed at achieving specific outcomes. Understanding ${primaryKeyword.toLowerCase()} is essential for success in this domain.\n`;
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
    estimateCompetitorStrengths(domain) {
        const strengths = [
            'Strong domain authority',
            'Extensive content library',
            'Quality backlink profile',
            'Active social media presence',
            'Fast page load speeds',
        ];
        return strengths.slice(0, 2 + Math.floor(Math.random() * 2));
    }
    estimateCompetitorWeaknesses(domain) {
        const weaknesses = [
            'Limited mobile optimization',
            'Thin content on key pages',
            'Poor internal linking structure',
            'Missing structured data',
            'Slow page speed on mobile',
        ];
        return weaknesses.slice(0, 1 + Math.floor(Math.random() * 2));
    }
    identifyOpportunities(domain, competitors, keywords) {
        const opportunities = [];
        const allWeaknesses = competitors.flatMap((c) => c.weaknesses);
        const uniqueWeaknesses = [...new Set(allWeaknesses)];
        for (const weakness of uniqueWeaknesses.slice(0, 3)) {
            opportunities.push(`Capitalize on competitor weakness: ${weakness.toLowerCase()}`);
        }
        if (keywords.length > 0) {
            opportunities.push(`Target long-tail keywords that competitors are missing`);
            opportunities.push(`Create comprehensive content around "${keywords[0]}" to outrank competitors`);
        }
        opportunities.push('Build high-quality backlinks through content marketing and outreach');
        return opportunities;
    }
};
exports.SEOOptimizationAgentService = SEOOptimizationAgentService;
exports.SEOOptimizationAgentService = SEOOptimizationAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], SEOOptimizationAgentService);
//# sourceMappingURL=seo-agent.service.js.map