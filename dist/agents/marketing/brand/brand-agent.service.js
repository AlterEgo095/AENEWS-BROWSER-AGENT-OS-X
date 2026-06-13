"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandAgentService = exports.BRAND_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.BRAND_AGENT_CONFIG = {
    id: 'marketing-brand',
    name: 'Brand',
    cluster: agent_interface_1.AgentCluster.MARKETING,
    version: '1.0.0',
    description: 'Brand management agent that handles consistency checking, asset management, brand guide generation, sentiment analysis, and brand voice updates.',
    capabilities: [
        {
            name: 'checkBrandConsistency',
            description: 'Check content and assets for brand consistency',
            inputSchema: {
                type: 'object',
                properties: {
                    content: { type: 'string', description: 'Content to check for consistency' },
                    contentType: { type: 'string', enum: ['text', 'visual', 'social', 'email', 'website'], description: 'Type of content' },
                    checkCategories: { type: 'array', items: { type: 'string' }, description: 'Categories to check' },
                },
                required: ['content'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    score: { type: 'number' },
                    violations: { type: 'array', items: { type: 'object' } },
                    suggestions: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'manageAssets',
            description: 'Manage brand assets like logos, colors, fonts, and imagery',
            inputSchema: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['add', 'update', 'remove', 'list', 'search'], description: 'Action to perform' },
                    assetType: { type: 'string', enum: ['logo', 'color', 'font', 'icon', 'image', 'template'], description: 'Type of asset' },
                    assetData: { type: 'object', description: 'Asset data' },
                    filters: { type: 'object', description: 'Search filters' },
                },
                required: ['action'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    action: { type: 'string' },
                    affected: { type: 'number' },
                    assets: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'generateBrandGuide',
            description: 'Generate a comprehensive brand guidelines document',
            inputSchema: {
                type: 'object',
                properties: {
                    brandName: { type: 'string', description: 'Brand name' },
                    includeSections: { type: 'array', items: { type: 'string' }, description: 'Sections to include' },
                    format: { type: 'string', enum: ['full', 'summary', 'quick-reference'], description: 'Guide format' },
                },
                required: ['brandName'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    guideId: { type: 'string' },
                    brandName: { type: 'string' },
                    sections: { type: 'array', items: { type: 'object' } },
                    generatedAt: { type: 'string' },
                },
            },
        },
        {
            name: 'analyzeBrandSentiment',
            description: 'Analyze brand sentiment across channels and mentions',
            inputSchema: {
                type: 'object',
                properties: {
                    brandName: { type: 'string', description: 'Brand to analyze' },
                    channels: { type: 'array', items: { type: 'string' }, description: 'Channels to analyze' },
                    dateFrom: { type: 'string', description: 'Start date (ISO string)' },
                    dateTo: { type: 'string', description: 'End date (ISO string)' },
                },
                required: ['brandName'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    overallSentiment: { type: 'number' },
                    mentions: { type: 'number' },
                    byChannel: { type: 'object' },
                    trends: { type: 'array', items: { type: 'object' } },
                    topKeywords: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'updateBrandVoice',
            description: 'Update or modify brand voice guidelines and parameters',
            inputSchema: {
                type: 'object',
                properties: {
                    brandName: { type: 'string', description: 'Brand name' },
                    voiceAttributes: { type: 'object', description: 'Voice attributes to update' },
                    examples: { type: 'array', items: { type: 'object' }, description: 'Voice examples' },
                    doList: { type: 'array', items: { type: 'string' }, description: 'Voice dos' },
                    dontList: { type: 'array', items: { type: 'string' }, description: 'Voice don\'ts' },
                },
                required: ['brandName', 'voiceAttributes'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    brandName: { type: 'string' },
                    updated: { type: 'boolean' },
                    voiceProfile: { type: 'object' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:brand',
        'write:brand',
        'read:assets',
        'write:assets',
        'read:sentiment',
    ],
    maxConcurrentTasks: 3,
    timeout: 60000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 2000,
        exponentialBackoff: true,
    },
};
let BrandAgentService = class BrandAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.assets = new Map();
        this.voiceProfiles = new Map();
        this.assetCounter = 0;
    }
    defineConfig() {
        return exports.BRAND_AGENT_CONFIG;
    }
    async onInitialize() {
        this.seedDefaultAssets();
        this.seedDefaultVoiceProfiles();
        this.registerTool({
            name: 'checkBrandConsistency',
            description: 'Check content and assets for brand consistency',
            execute: async (params) => this.checkBrandConsistency(params),
        });
        this.registerTool({
            name: 'manageAssets',
            description: 'Manage brand assets like logos, colors, fonts, and imagery',
            execute: async (params) => this.manageAssets(params),
        });
        this.registerTool({
            name: 'generateBrandGuide',
            description: 'Generate a comprehensive brand guidelines document',
            execute: async (params) => this.generateBrandGuide(params),
        });
        this.registerTool({
            name: 'analyzeBrandSentiment',
            description: 'Analyze brand sentiment across channels and mentions',
            execute: async (params) => this.analyzeBrandSentiment(params),
        });
        this.registerTool({
            name: 'updateBrandVoice',
            description: 'Update or modify brand voice guidelines and parameters',
            execute: async (params) => this.updateBrandVoice(params),
        });
        await this.storeInWorkingMemory('brand:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Brand agent initialized with 5 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'checkBrandConsistency',
            'manageAssets',
            'generateBrandGuide',
            'analyzeBrandSentiment',
            'updateBrandVoice',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown brand action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`brand:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Brand execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.assets.clear();
        this.voiceProfiles.clear();
        this.assetCounter = 0;
        this.logger.log('Brand agent destroyed, assets and voice profiles cleared');
    }
    async checkBrandConsistency(params) {
        const { content, contentType = 'text', checkCategories = [] } = params;
        if (!content || typeof content !== 'string') {
            throw new Error('Valid content string is required for brand consistency check');
        }
        const violations = [];
        const suggestions = [];
        let score = 100;
        const allCategories = ['tone', 'terminology', 'formatting', 'visual', 'messaging'];
        const activeCategories = checkCategories.length > 0 ? checkCategories : allCategories;
        if (activeCategories.includes('tone')) {
            const toneResult = this.checkToneConsistency(content, contentType);
            violations.push(...toneResult.violations);
            score -= toneResult.penalty;
        }
        if (activeCategories.includes('terminology')) {
            const termResult = this.checkTerminologyConsistency(content);
            violations.push(...termResult.violations);
            score -= termResult.penalty;
        }
        if (activeCategories.includes('formatting')) {
            const formatResult = this.checkFormattingConsistency(content, contentType);
            violations.push(...formatResult.violations);
            score -= formatResult.penalty;
        }
        if (activeCategories.includes('messaging')) {
            const msgResult = this.checkMessagingConsistency(content);
            violations.push(...msgResult.violations);
            score -= msgResult.penalty;
        }
        score = Math.max(0, Math.min(100, score));
        if (violations.length === 0) {
            suggestions.push('Content is consistent with brand guidelines.');
        }
        else {
            suggestions.push(`Found ${violations.length} consistency issue(s). Review and address violations for better brand alignment.`);
        }
        if (score >= 90) {
            suggestions.push('Brand consistency score is excellent.');
        }
        else if (score >= 70) {
            suggestions.push('Brand consistency is acceptable but could be improved.');
        }
        else {
            suggestions.push('Brand consistency score is low. Significant revisions recommended.');
        }
        this.logger.log(`Brand consistency check: score=${score}, violations=${violations.length}`);
        return { score, violations, suggestions };
    }
    async manageAssets(params) {
        const { action, assetType = '', assetData = {}, filters = {} } = params;
        const validActions = ['add', 'update', 'remove', 'list', 'search'];
        if (!validActions.includes(action)) {
            throw new Error(`Invalid asset action: ${action}. Valid: ${validActions.join(', ')}`);
        }
        let affected = 0;
        let resultAssets = [];
        switch (action) {
            case 'add': {
                if (!assetData.name || !assetType) {
                    throw new Error('Asset name and type are required for add action');
                }
                const assetId = `asset-${Date.now()}-${++this.assetCounter}`;
                const newAsset = {
                    id: assetId,
                    type: assetType,
                    name: assetData.name,
                    value: assetData.value || '',
                    metadata: assetData.metadata || {},
                    createdAt: new Date(),
                };
                this.assets.set(assetId, newAsset);
                resultAssets = [newAsset];
                affected = 1;
                break;
            }
            case 'update': {
                const assetId = assetData.id;
                if (!assetId || !this.assets.has(assetId)) {
                    throw new Error(`Asset not found: ${assetId}`);
                }
                const existing = this.assets.get(assetId);
                const updated = {
                    ...existing,
                    ...assetData,
                    id: existing.id,
                    createdAt: existing.createdAt,
                };
                this.assets.set(assetId, updated);
                resultAssets = [updated];
                affected = 1;
                break;
            }
            case 'remove': {
                const assetId = assetData.id;
                if (!assetId) {
                    throw new Error('Asset ID is required for remove action');
                }
                affected = this.assets.delete(assetId) ? 1 : 0;
                break;
            }
            case 'list': {
                let allAssets = Array.from(this.assets.values());
                if (assetType) {
                    allAssets = allAssets.filter((a) => a.type === assetType);
                }
                resultAssets = allAssets;
                affected = allAssets.length;
                break;
            }
            case 'search': {
                let searchResults = Array.from(this.assets.values());
                if (assetType) {
                    searchResults = searchResults.filter((a) => a.type === assetType);
                }
                if (filters.name) {
                    const nameLower = filters.name.toLowerCase();
                    searchResults = searchResults.filter((a) => a.name.toLowerCase().includes(nameLower));
                }
                if (filters.type) {
                    searchResults = searchResults.filter((a) => a.type === filters.type);
                }
                resultAssets = searchResults;
                affected = searchResults.length;
                break;
            }
        }
        this.logger.log(`Asset ${action}: type=${assetType || 'all'}, affected=${affected}`);
        return { action, affected, assets: resultAssets };
    }
    async generateBrandGuide(params) {
        const { brandName, includeSections = [], format = 'full' } = params;
        if (!brandName || typeof brandName !== 'string') {
            throw new Error('A valid brand name is required');
        }
        const guideId = `guide-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const defaultSections = [
            'brand-overview',
            'logo-usage',
            'color-palette',
            'typography',
            'voice-and-tone',
            'imagery',
            'messaging',
            'dos-and-donts',
        ];
        const sections = includeSections.length > 0
            ? includeSections
            : format === 'quick-reference'
                ? ['brand-overview', 'logo-usage', 'color-palette', 'voice-and-tone']
                : defaultSections;
        const guideSections = sections.map((sectionId) => ({
            title: this.formatSectionTitle(sectionId),
            content: this.generateSectionContent(sectionId, brandName, format),
        }));
        this.logger.log(`Generated brand guide: ${guideId}, brand="${brandName}", sections=${sections.length}`);
        return {
            guideId,
            brandName,
            sections: guideSections,
            generatedAt: new Date().toISOString(),
        };
    }
    async analyzeBrandSentiment(params) {
        const { brandName, channels = [], dateFrom, dateTo } = params;
        if (!brandName || typeof brandName !== 'string') {
            throw new Error('A valid brand name is required');
        }
        const defaultChannels = ['twitter', 'facebook', 'instagram', 'linkedin', 'news', 'reviews'];
        const reportChannels = channels.length > 0 ? channels : defaultChannels;
        const overallSentiment = +(0.2 + Math.random() * 0.6).toFixed(2);
        const mentions = 500 + Math.floor(Math.random() * 5000);
        const byChannel = {};
        for (const channel of reportChannels) {
            byChannel[channel] = {
                sentiment: +(0.1 + Math.random() * 0.8).toFixed(2),
                mentions: 50 + Math.floor(Math.random() * 1000),
            };
        }
        const fromDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = dateTo ? new Date(dateTo) : new Date();
        const trends = [];
        let currentSentiment = overallSentiment;
        for (let i = 0; i < 30; i++) {
            const date = new Date(fromDate.getTime() + i * 24 * 60 * 60 * 1000);
            currentSentiment += (Math.random() - 0.45) * 0.1;
            currentSentiment = Math.max(-1, Math.min(1, currentSentiment));
            trends.push({
                date: date.toISOString().split('T')[0],
                sentiment: +currentSentiment.toFixed(2),
            });
        }
        const topKeywords = [
            `${brandName} quality`,
            `${brandName} service`,
            `${brandName} price`,
            `${brandName} support`,
            `${brandName} experience`,
            'recommend',
            'reliable',
            'innovative',
        ];
        this.logger.log(`Brand sentiment: "${brandName}", sentiment=${overallSentiment}, mentions=${mentions}`);
        return {
            overallSentiment,
            mentions,
            byChannel,
            trends,
            topKeywords,
        };
    }
    async updateBrandVoice(params) {
        const { brandName, voiceAttributes, examples = [], doList = [], dontList = [] } = params;
        if (!brandName || typeof brandName !== 'string') {
            throw new Error('A valid brand name is required');
        }
        if (!voiceAttributes || typeof voiceAttributes !== 'object') {
            throw new Error('Voice attributes object is required');
        }
        const existing = this.voiceProfiles.get(brandName);
        const voiceProfile = {
            brandName,
            tone: voiceAttributes.tone || existing?.tone || 'professional',
            formality: voiceAttributes.formality || existing?.formality || 'moderate',
            attributes: voiceAttributes.attributes || existing?.attributes || ['clear', 'confident', 'approachable'],
            doList: doList.length > 0 ? doList : existing?.doList || ['Use active voice', 'Be concise', 'Stay positive'],
            dontList: dontList.length > 0 ? dontList : existing?.dontList || ['Use jargon', 'Be condescending', 'Make unsupported claims'],
            examples: examples.length > 0 ? examples : existing?.examples || [
                { context: 'customer greeting', text: 'Welcome! We\'re here to help you succeed.' },
                { context: 'error message', text: 'Something went wrong. Let\'s try that again.' },
            ],
            updatedAt: new Date(),
        };
        this.voiceProfiles.set(brandName, voiceProfile);
        this.logger.log(`Updated brand voice: "${brandName}", tone=${voiceProfile.tone}, formality=${voiceProfile.formality}`);
        return {
            brandName,
            updated: true,
            voiceProfile,
        };
    }
    seedDefaultAssets() {
        const defaultAssets = [
            { id: 'asset-logo-primary', type: 'logo', name: 'Primary Logo', value: '/assets/logo-primary.svg', metadata: { format: 'svg', backgroundColor: 'transparent' }, createdAt: new Date() },
            { id: 'asset-logo-secondary', type: 'logo', name: 'Secondary Logo', value: '/assets/logo-secondary.svg', metadata: { format: 'svg', backgroundColor: 'white' }, createdAt: new Date() },
            { id: 'asset-color-primary', type: 'color', name: 'Primary Color', value: '#2563EB', metadata: { pantone: 'PMS 2727 C', rgb: '37, 99, 235' }, createdAt: new Date() },
            { id: 'asset-color-secondary', type: 'color', name: 'Secondary Color', value: '#7C3AED', metadata: { pantone: 'PMS 2685 C', rgb: '124, 58, 237' }, createdAt: new Date() },
            { id: 'asset-color-accent', type: 'color', name: 'Accent Color', value: '#F59E0B', metadata: { pantone: 'PMS 1235 C', rgb: '245, 158, 11' }, createdAt: new Date() },
            { id: 'asset-font-heading', type: 'font', name: 'Heading Font', value: 'Inter Bold', metadata: { fallback: 'system-ui, sans-serif', weights: [700, 800] }, createdAt: new Date() },
            { id: 'asset-font-body', type: 'font', name: 'Body Font', value: 'Inter Regular', metadata: { fallback: 'system-ui, sans-serif', weights: [400, 500] }, createdAt: new Date() },
        ];
        for (const asset of defaultAssets) {
            this.assets.set(asset.id, asset);
        }
    }
    seedDefaultVoiceProfiles() {
        this.voiceProfiles.set('default', {
            brandName: 'default',
            tone: 'professional',
            formality: 'moderate',
            attributes: ['clear', 'confident', 'approachable', 'trustworthy'],
            doList: ['Use active voice', 'Be concise', 'Stay positive', 'Be specific'],
            dontList: ['Use jargon', 'Be condescending', 'Make unsupported claims', 'Use passive voice excessively'],
            examples: [
                { context: 'customer greeting', text: 'Welcome! We\'re here to help you succeed.' },
                { context: 'error message', text: 'Something went wrong. Let\'s try that again.' },
            ],
            updatedAt: new Date(),
        });
    }
    checkToneConsistency(content, contentType) {
        const violations = [];
        let penalty = 0;
        const casualPatterns = /\b(hey|gonna|wanna|kinda|sorta|lol|omg|btw)\b/gi;
        const casualMatches = content.match(casualPatterns);
        if (casualMatches && contentType !== 'social') {
            violations.push({
                category: 'tone',
                severity: 'warning',
                message: `Casual language detected: "${casualMatches[0]}". May not align with professional tone guidelines.`,
                suggestion: 'Replace with more formal alternatives unless targeting a casual audience.',
            });
            penalty += 5;
        }
        const exclamationCount = (content.match(/!/g) || []).length;
        if (exclamationCount > 3) {
            violations.push({
                category: 'tone',
                severity: 'info',
                message: `Excessive exclamation marks (${exclamationCount}). Brand tone guidelines suggest restrained use.`,
                suggestion: 'Limit exclamation marks to convey genuine enthusiasm without appearing unprofessional.',
            });
            penalty += 3;
        }
        const capsWords = content.match(/\b[A-Z]{3,}\b/g);
        if (capsWords && capsWords.length > 2) {
            violations.push({
                category: 'tone',
                severity: 'warning',
                message: 'Excessive use of all-caps words detected, which may appear as shouting.',
                suggestion: 'Use emphasis sparingly and consider italics or bold formatting instead.',
            });
            penalty += 5;
        }
        return { violations, penalty };
    }
    checkTerminologyConsistency(content) {
        const violations = [];
        let penalty = 0;
        const termVariations = [
            ['e-mail', 'email'],
            ['web site', 'website'],
            ['log in', 'login'],
            ['set up', 'setup'],
        ];
        for (const [variant1, variant2] of termVariations) {
            const has1 = content.toLowerCase().includes(variant1);
            const has2 = content.toLowerCase().includes(variant2);
            if (has1 && has2) {
                violations.push({
                    category: 'terminology',
                    severity: 'info',
                    message: `Inconsistent terminology: both "${variant1}" and "${variant2}" used.`,
                    suggestion: `Choose one form consistently. Recommended: "${variant2}".`,
                });
                penalty += 3;
            }
        }
        return { violations, penalty };
    }
    checkFormattingConsistency(content, contentType) {
        const violations = [];
        let penalty = 0;
        const headings = content.match(/^#+\s+/gm) || [];
        if (headings.length > 1) {
            const levels = headings.map((h) => h.trim().length - (h.trim().indexOf(' ') || 0));
            for (let i = 1; i < levels.length; i++) {
                if (levels[i] > levels[i - 1] + 1) {
                    violations.push({
                        category: 'formatting',
                        severity: 'warning',
                        message: 'Heading hierarchy skip detected. Headings should not skip levels (e.g., H1 to H3).',
                        suggestion: 'Ensure headings follow a logical hierarchy: H1 > H2 > H3.',
                    });
                    penalty += 5;
                    break;
                }
            }
        }
        const dashBullets = (content.match(/^\s*-\s+/gm) || []).length;
        const asteriskBullets = (content.match(/^\s*\*\s+/gm) || []).length;
        if (dashBullets > 0 && asteriskBullets > 0) {
            violations.push({
                category: 'formatting',
                severity: 'info',
                message: 'Mixed bullet point styles (dash and asterisk). Use consistent bullet formatting.',
                suggestion: 'Standardize on one bullet style throughout the document.',
            });
            penalty += 2;
        }
        return { violations, penalty };
    }
    checkMessagingConsistency(content) {
        const violations = [];
        let penalty = 0;
        const positiveWords = content.match(/\b(excellent|amazing|outstanding|superb|fantastic)\b/gi);
        const negativeWords = content.match(/\b(terrible|awful|worst|horrible|dreadful)\b/gi);
        if (positiveWords && negativeWords) {
            violations.push({
                category: 'messaging',
                severity: 'warning',
                message: 'Mixed positive and negative messaging detected in the same content.',
                suggestion: 'Ensure messaging is consistent and aligned with brand positioning.',
            });
            penalty += 5;
        }
        return { violations, penalty };
    }
    formatSectionTitle(sectionId) {
        return sectionId
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    generateSectionContent(sectionId, brandName, format) {
        const contentMap = {
            'brand-overview': `${brandName} is committed to delivering exceptional value through innovation and quality. Our brand represents trust, reliability, and forward-thinking solutions. Every interaction with ${brandName} should reflect these core values.`,
            'logo-usage': `The ${brandName} logo is our most recognizable brand asset. Always use approved logo versions, maintain minimum clear space equal to the height of the logo mark, and never modify, rotate, or add effects to the logo. Use the primary logo on light backgrounds and the reversed logo on dark backgrounds.`,
            'color-palette': `${brandName}'s color palette consists of primary, secondary, and accent colors. Primary colors should dominate all materials (60%), secondary colors provide depth (30%), and accent colors draw attention (10%). Always use approved color values — never approximate.`,
            'typography': `${brandName} uses a carefully selected type system that ensures readability and brand recognition. Headings use bold weights of the primary font family. Body text uses regular weights. Maintain consistent line heights and spacing as specified in the typography scale.`,
            'voice-and-tone': `${brandName}'s voice is confident, clear, and approachable. We speak with authority without being condescending. Our tone adapts to context — professional in formal communications, warm and helpful in support interactions, and enthusiastic in marketing materials.`,
            'imagery': `${brandName} imagery should be authentic, diverse, and aspirational. Avoid stock-photo clichés. Prefer real people in genuine situations. Images should support the accompanying content and align with our brand values of innovation and inclusivity.`,
            'messaging': `${brandName}'s core messaging framework centers on three pillars: Innovation (we lead with new ideas), Quality (we deliver excellence), and Trust (we build lasting relationships). All communications should reinforce at least one of these pillars.`,
            'dos-and-donts': `DO: Use approved brand assets consistently. Speak with our brand voice. Follow the color and typography guidelines. Maintain clear space around the logo.\n\nDON'T: Modify logo colors or proportions. Use unapproved fonts. Mix different brand styles. Use inconsistent terminology.`,
        };
        const content = contentMap[sectionId] || `${brandName} brand guidelines for ${sectionId}. Follow standard brand principles and maintain consistency across all touchpoints.`;
        return format === 'quick-reference'
            ? content.split('.')[0] + '.'
            : content;
    }
};
exports.BrandAgentService = BrandAgentService;
exports.BrandAgentService = BrandAgentService = __decorate([
    (0, common_1.Injectable)()
], BrandAgentService);
//# sourceMappingURL=brand-agent.service.js.map