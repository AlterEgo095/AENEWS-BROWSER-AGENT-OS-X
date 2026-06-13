"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresentationAgentService = exports.PRESENTATION_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.PRESENTATION_AGENT_CONFIG = {
    id: 'office-presentation',
    name: 'Presentation',
    cluster: agent_interface_1.AgentCluster.OFFICE,
    version: '1.0.0',
    description: 'Presentation management agent that handles creating presentations, adding slides and content, applying themes, exporting, and adding slide transitions.',
    capabilities: [
        {
            name: 'createPresentation',
            description: 'Create a new presentation with optional title, theme, and initial slides',
            inputSchema: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Presentation title' },
                    author: { type: 'string', description: 'Presentation author' },
                    theme: { type: 'string', description: 'Theme to apply' },
                    slides: { type: 'array', items: { type: 'object' }, description: 'Initial slide definitions' },
                    format: { type: 'string', enum: ['pptx', 'pdf', 'odp'], description: 'Presentation format' },
                },
                required: ['title'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    presentationId: { type: 'string' },
                    title: { type: 'string' },
                    slideCount: { type: 'number' },
                    createdAt: { type: 'string' },
                },
            },
        },
        {
            name: 'addSlide',
            description: 'Add a new slide to an existing presentation',
            inputSchema: {
                type: 'object',
                properties: {
                    presentationId: { type: 'string', description: 'ID of the presentation' },
                    layout: { type: 'string', enum: ['title', 'titleAndContent', 'twoContent', 'blank', 'sectionHeader', 'comparison'], description: 'Slide layout' },
                    position: { type: 'number', description: 'Position to insert slide (1-based index)' },
                    title: { type: 'string', description: 'Slide title' },
                    subtitle: { type: 'string', description: 'Slide subtitle' },
                    notes: { type: 'string', description: 'Speaker notes' },
                },
                required: ['presentationId', 'layout'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    presentationId: { type: 'string' },
                    slideId: { type: 'string' },
                    position: { type: 'number' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'addContent',
            description: 'Add content (text, image, table, chart) to a slide',
            inputSchema: {
                type: 'object',
                properties: {
                    presentationId: { type: 'string', description: 'ID of the presentation' },
                    slideId: { type: 'string', description: 'ID of the slide' },
                    contentType: { type: 'string', enum: ['text', 'image', 'table', 'chart', 'shape', 'bulletList'], description: 'Type of content to add' },
                    content: { type: 'object', description: 'Content data (varies by type)' },
                    position: { type: 'object', description: 'Position and size on the slide' },
                    style: { type: 'object', description: 'Content styling' },
                },
                required: ['presentationId', 'slideId', 'contentType', 'content'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    presentationId: { type: 'string' },
                    slideId: { type: 'string' },
                    contentId: { type: 'string' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'applyTheme',
            description: 'Apply a theme to the presentation or a specific slide',
            inputSchema: {
                type: 'object',
                properties: {
                    presentationId: { type: 'string', description: 'ID of the presentation' },
                    themeId: { type: 'string', description: 'Theme identifier to apply' },
                    slideId: { type: 'string', description: 'Specific slide ID (optional, applies to all if omitted)' },
                    overrideColors: { type: 'object', description: 'Custom color overrides for the theme' },
                },
                required: ['presentationId', 'themeId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    presentationId: { type: 'string' },
                    themeId: { type: 'string' },
                    appliedToSlides: { type: 'number' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'exportPresentation',
            description: 'Export the presentation to a specified format',
            inputSchema: {
                type: 'object',
                properties: {
                    presentationId: { type: 'string', description: 'ID of the presentation' },
                    format: { type: 'string', enum: ['pptx', 'pdf', 'odp', 'images'], description: 'Export format' },
                    slideRange: { type: 'object', description: 'Specific slide range to export' },
                    quality: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Export quality' },
                },
                required: ['presentationId', 'format'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    presentationId: { type: 'string' },
                    format: { type: 'string' },
                    slideCount: { type: 'number' },
                    exportSize: { type: 'string' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'addTransition',
            description: 'Add a transition effect between slides',
            inputSchema: {
                type: 'object',
                properties: {
                    presentationId: { type: 'string', description: 'ID of the presentation' },
                    slideId: { type: 'string', description: 'ID of the slide to add transition to' },
                    type: { type: 'string', enum: ['fade', 'slide', 'push', 'wipe', 'split', 'reveal', 'dissolve', 'none'], description: 'Transition type' },
                    duration: { type: 'number', description: 'Transition duration in milliseconds' },
                    advanceAfter: { type: 'number', description: 'Auto-advance after milliseconds (0 for manual)' },
                },
                required: ['presentationId', 'slideId', 'type'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    presentationId: { type: 'string' },
                    slideId: { type: 'string' },
                    transitionType: { type: 'string' },
                    status: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:presentation',
        'write:presentation',
        'export:presentation',
    ],
    maxConcurrentTasks: 3,
    timeout: 60000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 1500,
        exponentialBackoff: true,
    },
};
let PresentationAgentService = class PresentationAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.presentations = new Map();
        this.themes = new Map();
        this.presentationCounter = 0;
        this.slideCounter = 0;
        this.contentCounter = 0;
    }
    defineConfig() {
        return exports.PRESENTATION_AGENT_CONFIG;
    }
    async onInitialize() {
        this.seedThemes();
        this.registerTool({
            name: 'createPresentation',
            description: 'Create a new presentation',
            execute: async (params) => this.createPresentation(params),
        });
        this.registerTool({
            name: 'addSlide',
            description: 'Add a new slide to a presentation',
            execute: async (params) => this.addSlide(params),
        });
        this.registerTool({
            name: 'addContent',
            description: 'Add content to a slide',
            execute: async (params) => this.addContent(params),
        });
        this.registerTool({
            name: 'applyTheme',
            description: 'Apply a theme to a presentation or slide',
            execute: async (params) => this.applyTheme(params),
        });
        this.registerTool({
            name: 'exportPresentation',
            description: 'Export a presentation to a specified format',
            execute: async (params) => this.exportPresentation(params),
        });
        this.registerTool({
            name: 'addTransition',
            description: 'Add a transition effect between slides',
            execute: async (params) => this.addTransition(params),
        });
        await this.storeInWorkingMemory('presentation:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Presentation agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'createPresentation',
            'addSlide',
            'addContent',
            'applyTheme',
            'exportPresentation',
            'addTransition',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown presentation action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`presentation:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Presentation execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.presentations.clear();
        this.themes.clear();
        this.presentationCounter = 0;
        this.slideCounter = 0;
        this.contentCounter = 0;
        this.logger.log('Presentation agent destroyed, all data cleared');
    }
    async createPresentation(params) {
        const { title, author = 'agent@aenews.system', theme = 'professional', slides = [], format = 'pptx' } = params;
        if (!title || typeof title !== 'string') {
            throw new Error('A valid presentation title is required');
        }
        const validFormats = ['pptx', 'pdf', 'odp'];
        if (!validFormats.includes(format)) {
            throw new Error(`Invalid format: ${format}. Supported: ${validFormats.join(', ')}`);
        }
        const presentationId = this.generatePresentationId();
        const themeDef = this.themes.get(theme) || this.themes.get('professional');
        const presentationSlides = [];
        const titleSlide = this.createSlideObject('title', title, author, '');
        presentationSlides.push(titleSlide);
        for (const slideDef of slides) {
            const slide = this.createSlideObject(slideDef.layout, slideDef.title || '', slideDef.subtitle || '', '');
            presentationSlides.push(slide);
        }
        const presentation = {
            id: presentationId,
            title,
            author,
            format,
            theme: themeDef,
            slides: presentationSlides,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.presentations.set(presentationId, presentation);
        this.logger.log(`Created presentation: ${presentationId}, title="${title}", slides=${presentationSlides.length}`);
        return {
            presentationId,
            title,
            slideCount: presentationSlides.length,
            createdAt: presentation.createdAt.toISOString(),
        };
    }
    async addSlide(params) {
        const { presentationId, layout, position, title = '', subtitle = '', notes = '' } = params;
        if (!presentationId || typeof presentationId !== 'string') {
            throw new Error('A valid presentationId is required');
        }
        const validLayouts = ['title', 'titleAndContent', 'twoContent', 'blank', 'sectionHeader', 'comparison'];
        if (!validLayouts.includes(layout)) {
            throw new Error(`Invalid layout: ${layout}. Supported: ${validLayouts.join(', ')}`);
        }
        const presentation = this.presentations.get(presentationId);
        if (!presentation) {
            throw new Error(`Presentation not found: ${presentationId}`);
        }
        const slide = this.createSlideObject(layout, title, subtitle, notes);
        const insertPosition = position !== undefined ? Math.min(position - 1, presentation.slides.length) : presentation.slides.length;
        presentation.slides.splice(insertPosition, 0, slide);
        presentation.updatedAt = new Date();
        this.logger.log(`Added slide: ${slide.id}, layout=${layout}, position=${insertPosition + 1} to presentation: ${presentationId}`);
        return {
            presentationId,
            slideId: slide.id,
            position: insertPosition + 1,
            status: 'added',
        };
    }
    async addContent(params) {
        const { presentationId, slideId, contentType, content, position = { x: 0, y: 0, width: 800, height: 400 }, style = {}, } = params;
        if (!presentationId || typeof presentationId !== 'string') {
            throw new Error('A valid presentationId is required');
        }
        if (!slideId || typeof slideId !== 'string') {
            throw new Error('A valid slideId is required');
        }
        const validContentTypes = ['text', 'image', 'table', 'chart', 'shape', 'bulletList'];
        if (!validContentTypes.includes(contentType)) {
            throw new Error(`Invalid contentType: ${contentType}. Supported: ${validContentTypes.join(', ')}`);
        }
        if (!content) {
            throw new Error('Content data is required');
        }
        const presentation = this.presentations.get(presentationId);
        if (!presentation) {
            throw new Error(`Presentation not found: ${presentationId}`);
        }
        const slide = presentation.slides.find((s) => s.id === slideId);
        if (!slide) {
            throw new Error(`Slide not found: ${slideId} in presentation ${presentationId}`);
        }
        const contentId = `content-${++this.contentCounter}`;
        const slideContent = {
            id: contentId,
            type: contentType,
            data: this.processContentData(contentType, content),
            position,
            style: {
                fontSize: 18,
                fontColor: presentation.theme.fontColor,
                fontFamily: presentation.theme.fontFamily,
                ...style,
            },
        };
        slide.content.push(slideContent);
        presentation.updatedAt = new Date();
        this.logger.log(`Added ${contentType} content to slide: ${slideId}, contentId=${contentId}`);
        return {
            presentationId,
            slideId,
            contentId,
            status: 'added',
        };
    }
    async applyTheme(params) {
        const { presentationId, themeId, slideId, overrideColors = {} } = params;
        if (!presentationId || typeof presentationId !== 'string') {
            throw new Error('A valid presentationId is required');
        }
        if (!themeId || typeof themeId !== 'string') {
            throw new Error('A valid themeId is required');
        }
        const theme = this.themes.get(themeId);
        if (!theme) {
            const available = Array.from(this.themes.keys()).join(', ');
            throw new Error(`Theme not found: ${themeId}. Available: ${available}`);
        }
        const presentation = this.presentations.get(presentationId);
        if (!presentation) {
            throw new Error(`Presentation not found: ${presentationId}`);
        }
        const appliedTheme = {
            ...theme,
            ...overrideColors,
        };
        presentation.theme = appliedTheme;
        let appliedToSlides = 0;
        if (slideId) {
            const slide = presentation.slides.find((s) => s.id === slideId);
            if (!slide) {
                throw new Error(`Slide not found: ${slideId}`);
            }
            slide.backgroundColor = appliedTheme.backgroundColor;
            for (const content of slide.content) {
                content.style.fontColor = appliedTheme.fontColor;
                content.style.fontFamily = appliedTheme.fontFamily;
            }
            appliedToSlides = 1;
        }
        else {
            for (const slide of presentation.slides) {
                slide.backgroundColor = appliedTheme.backgroundColor;
                for (const content of slide.content) {
                    content.style.fontColor = appliedTheme.fontColor;
                    content.style.fontFamily = appliedTheme.fontFamily;
                }
            }
            appliedToSlides = presentation.slides.length;
        }
        presentation.updatedAt = new Date();
        this.logger.log(`Applied theme: ${themeId} to ${appliedToSlides} slide(s) in presentation: ${presentationId}`);
        return {
            presentationId,
            themeId,
            appliedToSlides,
            status: 'applied',
        };
    }
    async exportPresentation(params) {
        const { presentationId, format, slideRange, quality = 'high' } = params;
        if (!presentationId || typeof presentationId !== 'string') {
            throw new Error('A valid presentationId is required');
        }
        const validFormats = ['pptx', 'pdf', 'odp', 'images'];
        if (!validFormats.includes(format)) {
            throw new Error(`Invalid export format: ${format}. Supported: ${validFormats.join(', ')}`);
        }
        const presentation = this.presentations.get(presentationId);
        if (!presentation) {
            throw new Error(`Presentation not found: ${presentationId}`);
        }
        let slides = presentation.slides;
        if (slideRange) {
            const start = Math.max(0, slideRange.start - 1);
            const end = Math.min(slides.length, slideRange.end);
            slides = slides.slice(start, end);
        }
        const baseSizeKB = quality === 'high' ? 500 : quality === 'medium' ? 250 : 100;
        const estimatedSizeKB = slides.length * baseSizeKB;
        const exportSize = estimatedSizeKB > 1024
            ? `${(estimatedSizeKB / 1024).toFixed(1)} MB`
            : `${estimatedSizeKB} KB`;
        this.logger.log(`Exported presentation: ${presentationId}, format=${format}, slides=${slides.length}, size=${exportSize}`);
        return {
            presentationId,
            format,
            slideCount: slides.length,
            exportSize,
            status: 'exported',
        };
    }
    async addTransition(params) {
        const { presentationId, slideId, type, duration = 1000, advanceAfter = 0 } = params;
        if (!presentationId || typeof presentationId !== 'string') {
            throw new Error('A valid presentationId is required');
        }
        if (!slideId || typeof slideId !== 'string') {
            throw new Error('A valid slideId is required');
        }
        const validTransitionTypes = ['fade', 'slide', 'push', 'wipe', 'split', 'reveal', 'dissolve', 'none'];
        if (!validTransitionTypes.includes(type)) {
            throw new Error(`Invalid transition type: ${type}. Supported: ${validTransitionTypes.join(', ')}`);
        }
        const presentation = this.presentations.get(presentationId);
        if (!presentation) {
            throw new Error(`Presentation not found: ${presentationId}`);
        }
        const slide = presentation.slides.find((s) => s.id === slideId);
        if (!slide) {
            throw new Error(`Slide not found: ${slideId} in presentation ${presentationId}`);
        }
        slide.transition = {
            type,
            duration,
            advanceAfter,
        };
        presentation.updatedAt = new Date();
        this.logger.log(`Added transition: ${type} to slide: ${slideId}, duration=${duration}ms`);
        return {
            presentationId,
            slideId,
            transitionType: type,
            status: 'added',
        };
    }
    seedThemes() {
        const builtInThemes = [
            {
                id: 'professional',
                name: 'Professional',
                primaryColor: '#1B3A5C',
                secondaryColor: '#4A90D9',
                accentColor: '#E8A838',
                backgroundColor: '#FFFFFF',
                fontColor: '#333333',
                fontFamily: 'Calibri',
                headerFontSize: 32,
                bodyFontSize: 18,
            },
            {
                id: 'modern',
                name: 'Modern',
                primaryColor: '#2D2D2D',
                secondaryColor: '#6C63FF',
                accentColor: '#FF6584',
                backgroundColor: '#F8F9FA',
                fontColor: '#2D2D2D',
                fontFamily: 'Segoe UI',
                headerFontSize: 36,
                bodyFontSize: 20,
            },
            {
                id: 'minimal',
                name: 'Minimal',
                primaryColor: '#000000',
                secondaryColor: '#666666',
                accentColor: '#009688',
                backgroundColor: '#FFFFFF',
                fontColor: '#000000',
                fontFamily: 'Helvetica',
                headerFontSize: 34,
                bodyFontSize: 18,
            },
            {
                id: 'creative',
                name: 'Creative',
                primaryColor: '#FF6B35',
                secondaryColor: '#004E89',
                accentColor: '#FCBF49',
                backgroundColor: '#1A1A2E',
                fontColor: '#EAEAEA',
                fontFamily: 'Trebuchet MS',
                headerFontSize: 38,
                bodyFontSize: 20,
            },
            {
                id: 'corporate',
                name: 'Corporate',
                primaryColor: '#003366',
                secondaryColor: '#336699',
                accentColor: '#CC0000',
                backgroundColor: '#FFFFFF',
                fontColor: '#333333',
                fontFamily: 'Arial',
                headerFontSize: 30,
                bodyFontSize: 16,
            },
        ];
        for (const theme of builtInThemes) {
            this.themes.set(theme.id, theme);
        }
    }
    generatePresentationId() {
        this.presentationCounter++;
        return `pres-${Date.now()}-${this.presentationCounter}`;
    }
    createSlideObject(layout, title, subtitle, notes) {
        return {
            id: `slide-${++this.slideCounter}`,
            layout,
            title,
            subtitle,
            notes,
            content: [],
            transition: null,
        };
    }
    processContentData(contentType, content) {
        switch (contentType) {
            case 'text':
                if (typeof content === 'string') {
                    return { text: content };
                }
                return content;
            case 'image':
                return {
                    src: content.src || content.url || '',
                    alt: content.alt || '',
                    width: content.width || 400,
                    height: content.height || 300,
                };
            case 'table':
                return {
                    headers: content.headers || [],
                    rows: content.rows || [],
                    colCount: (content.headers || []).length,
                    rowCount: (content.rows || []).length,
                };
            case 'chart':
                return {
                    chartType: content.chartType || 'bar',
                    title: content.title || '',
                    dataRange: content.dataRange || '',
                    xLabel: content.xLabel || '',
                    yLabel: content.yLabel || '',
                };
            case 'shape':
                return {
                    shapeType: content.shapeType || 'rectangle',
                    fill: content.fill || '#4A90D9',
                    border: content.border || 'none',
                };
            case 'bulletList':
                return {
                    items: Array.isArray(content) ? content : content.items || [],
                    bulletStyle: content.bulletStyle || 'disc',
                };
            default:
                return content;
        }
    }
};
exports.PresentationAgentService = PresentationAgentService;
exports.PresentationAgentService = PresentationAgentService = __decorate([
    (0, common_1.Injectable)()
], PresentationAgentService);
//# sourceMappingURL=presentation-agent.service.js.map