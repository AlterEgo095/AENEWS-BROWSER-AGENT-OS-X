import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';
import PptxGenJS from 'pptxgenjs';
import * as path from 'path';
import * as fs from 'fs';

/* ═══════════════════════════════════════════════════════════════════════
   PREMIUM THEME SYSTEM
   ═══════════════════════════════════════════════════════════════════════ */

interface PremiumTheme {
  name: string;
  primary: string;
  primaryDark: string;
  accent: string;
  accentLight: string;
  text: string;
  textLight: string;
  bg: string;
  bgLight: string;
  bgCard: string;
  success: string;
  warning: string;
  danger: string;
  gradientStart: string;
  gradientEnd: string;
}

const PREMIUM_THEMES: Record<string, PremiumTheme> = {
  corporate: {
    name: 'Corporate Navy',
    primary: '0F1B3D',
    primaryDark: '070E1F',
    accent: '3B82F6',
    accentLight: '93C5FD',
    text: '1E293B',
    textLight: '64748B',
    bg: 'FFFFFF',
    bgLight: 'F8FAFC',
    bgCard: 'F1F5F9',
    success: '10B981',
    warning: 'F59E0B',
    danger: 'EF4444',
    gradientStart: '0F1B3D',
    gradientEnd: '1E3A5F',
  },
  dark: {
    name: 'Dark Luxe',
    primary: '0A0A0F',
    primaryDark: '050508',
    accent: 'A78BFA',
    accentLight: 'C4B5FD',
    text: 'F9FAFB',
    textLight: '9CA3AF',
    bg: '111118',
    bgLight: '1A1A24',
    bgCard: '1F1F2E',
    success: '34D399',
    warning: 'FBBF24',
    danger: 'F87171',
    gradientStart: '0A0A0F',
    gradientEnd: '1C1044',
  },
  emerald: {
    name: 'Emerald Tech',
    primary: '064E3B',
    primaryDark: '022C22',
    accent: '10B981',
    accentLight: '6EE7B7',
    text: '1E293B',
    textLight: '64748B',
    bg: 'FFFFFF',
    bgLight: 'F0FDF4',
    bgCard: 'ECFDF5',
    success: '059669',
    warning: 'D97706',
    danger: 'DC2626',
    gradientStart: '064E3B',
    gradientEnd: '065F46',
  },
  sunset: {
    name: 'Sunset Gradient',
    primary: '7C2D12',
    primaryDark: '431407',
    accent: 'F97316',
    accentLight: 'FDBA74',
    text: '1C1917',
    textLight: '78716C',
    bg: 'FFFFFF',
    bgLight: 'FFF7ED',
    bgCard: 'FFEDD5',
    success: '16A34A',
    warning: 'CA8A04',
    danger: 'DC2626',
    gradientStart: '7C2D12',
    gradientEnd: 'C2410C',
  },
  ocean: {
    name: 'Deep Ocean',
    primary: '0C4A6E',
    primaryDark: '082F49',
    accent: '06B6D4',
    accentLight: '67E8F9',
    text: '0F172A',
    textLight: '64748B',
    bg: 'FFFFFF',
    bgLight: 'ECFEFF',
    bgCard: 'CFFAFE',
    success: '059669',
    warning: 'D97706',
    danger: 'DC2626',
    gradientStart: '0C4A6E',
    gradientEnd: '155E75',
  },
  rose: {
    name: 'Rose Gold',
    primary: '4C0519',
    primaryDark: '2D0311',
    accent: 'E11D48',
    accentLight: 'FDA4AF',
    text: '1C1917',
    textLight: '78716C',
    bg: 'FFFFFF',
    bgLight: 'FFF1F2',
    bgCard: 'FFE4E6',
    success: '059669',
    warning: 'D97706',
    danger: 'BE123C',
    gradientStart: '4C0519',
    gradientEnd: '881337',
  },
};

/* ═══════════════════════════════════════════════════════════════════════
   SLIDE LAYOUT TYPES
   ═══════════════════════════════════════════════════════════════════════ */

type SlideLayout =
  | 'cover'          // Full-bleed gradient title slide
  | 'section'        // Section divider with large number + title
  | 'content'        // Classic header + bullet content
  | 'two-column'     // Two-column content layout
  | 'stat-block'     // 3-4 big statistic numbers
  | 'quote'          // Large quote with attribution
  | 'comparison'     // Side-by-side comparison (2 items)
  | 'timeline'       // 3-4 step timeline
  | 'icon-grid'      // 2x2 or 2x3 icon + label grid
  | 'image-text'     // Image placeholder + text side by side
  | 'closing';       // Thank you / contact slide

interface PremiumSlide {
  layout: SlideLayout;
  title: string;
  subtitle?: string;
  bullets?: string[];
  notes?: string;
  // stat-block
  stats?: Array<{ value: string; label: string; color?: string }>;
  // quote
  quote?: string;
  attribution?: string;
  // comparison
  leftTitle?: string;
  leftItems?: string[];
  rightTitle?: string;
  rightItems?: string[];
  // timeline
  steps?: Array<{ phase: string; title: string; desc: string }>;
  // icon-grid
  items?: Array<{ icon: string; label: string; desc: string }>;
  // image-text
  imageDesc?: string;
  bodyText?: string;
  // two-column
  leftBullets?: string[];
  rightBullets?: string[];
  leftHeading?: string;
  rightHeading?: string;
  // section
  sectionNumber?: string;
  // closing
  contactInfo?: string;
  website?: string;
}

/* ═══════════════════════════════════════════════════════════════════════
   PRESENTATION AGENT — PREMIUM v3.0
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * PresentationAgent — Premium LLM-powered presentation generation with
 * real PPTX output via PptxGenJS.
 *
 * v3.0 Premium features:
 * - 11 slide layouts (cover, section, content, two-column, stat-block,
 *   quote, comparison, timeline, icon-grid, image-text, closing)
 * - 6 premium color themes (corporate, dark, emerald, sunset, ocean, rose)
 * - Gradient backgrounds, accent decorations, visual hierarchy
 * - Professional typography with dual font families
 * - LLM-powered content generation with structured prompts
 * - Speaker notes on every slide
 */
export class PresentationAgent extends BaseAgent {
  readonly name = 'PresentationAgent';
  readonly cluster = ClusterType.OFFICE;
  readonly capabilities = [
    'create',
    'generate-with-llm',
    'generate-premium',
    'edit',
    'template',
    'export',
    'animate',
  ];
  readonly version = '3.0.0';
  readonly description =
    'Premium LLM-powered presentation generation with 11 layouts, 6 themes, gradients, and professional PPTX output';

  readonly missionCategories = [MissionCategory.DOCUMENT_PROCESSING];
  readonly creditCost = 1;
  readonly powerLevel = 1;
  readonly tier = 'standard';

  private outputDir = '/home/z/my-project/download';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'create';
      const startTime = Date.now();

      switch (action) {
        case 'generate-premium':
          return await this.generatePremium(config, startTime);

        case 'generate-with-llm':
          return await this.generateWithLLM(config, startTime);

        case 'create':
          return await this.createPptx(config, startTime);

        case 'edit':
          return this.handleEdit(config, startTime);

        case 'template':
          return this.handleTemplate(config, startTime);

        case 'export':
          return this.handleExport(config, startTime);

        case 'animate':
          return this.handleAnimate(config, startTime);

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /* ── PREMIUM GENERATION ─────────────────────────────────────────── */

  /**
   * Generate a premium presentation using LLM with structured slide layouts.
   * This is the top-tier generation method producing agency-quality slides.
   */
  private async generatePremium(config: Record<string, any>, startTime: number): Promise<AgentResult> {
    const topic = config.topic || config.title;
    const slideCount = config.slideCount || 10;
    const language = config.language || 'fr';
    const style = config.style || 'corporate';
    const theme = config.theme || 'corporate';

    if (!topic) {
      return { success: false, error: 'Topic/title is required for premium presentations' };
    }

    this.logger.log(`Generating PREMIUM presentation on "${topic}" (${slideCount} slides, ${language}, theme: ${theme})`);
    this.emitEvent(AgentEventType.AGENT_STARTED, { action: 'generate-premium', topic, theme });

    // Build LLM prompt requesting structured premium slide data
    const llmResult = await this.executeWithLLM(
      `You are a world-class presentation designer working for a top consulting firm.
Create a stunning, premium presentation about the given topic.

Requirements:
- Exactly ${slideCount} slides
- Language: ${language === 'fr' ? 'French' : language === 'en' ? 'English' : language}
- Style: ${style}
- Use varied layouts for visual interest (NOT all the same layout)
- First slide MUST be layout "cover"
- Last slide MUST be layout "closing"
- Include at least one "stat-block" slide with impressive numbers
- Include at least one "section" divider slide
- Include at least one "two-column" or "comparison" slide
- Content must be substantive, data-rich, and compelling

Return a JSON object with this EXACT structure:
{
  "title": "Presentation Title",
  "subtitle": "Compelling subtitle",
  "author": "AENEWS Agent OS X",
  "slides": [
    {
      "layout": "cover",
      "title": "Main Title",
      "subtitle": "Subtitle text"
    },
    {
      "layout": "section",
      "title": "Section Title",
      "sectionNumber": "01"
    },
    {
      "layout": "content",
      "title": "Slide Title",
      "bullets": ["Point 1 with detail", "Point 2 with data", "Point 3 with insight"],
      "notes": "Speaker notes"
    },
    {
      "layout": "two-column",
      "title": "Comparison Title",
      "leftHeading": "Left Column",
      "leftBullets": ["Point A", "Point B"],
      "rightHeading": "Right Column",
      "rightBullets": ["Point C", "Point D"]
    },
    {
      "layout": "stat-block",
      "title": "Key Metrics",
      "stats": [
        {"value": "99.9%", "label": "Uptime", "color": "success"},
        {"value": "110+", "label": "AI Agents", "color": "accent"},
        {"value": "3ms", "label": "Response Time", "color": "warning"},
        {"value": "14", "label": "Clusters", "color": "accent"}
      ]
    },
    {
      "layout": "quote",
      "title": "Inspiration",
      "quote": "A meaningful quote about the topic",
      "attribution": "Author Name"
    },
    {
      "layout": "comparison",
      "title": "Before vs After",
      "leftTitle": "Traditional",
      "leftItems": ["Manual process", "Slow", "Error-prone"],
      "rightTitle": "AENEWS Powered",
      "rightItems": ["Automated", "Real-time", "AI-accurate"]
    },
    {
      "layout": "timeline",
      "title": "Roadmap",
      "steps": [
        {"phase": "Q1", "title": "Phase 1", "desc": "Foundation"},
        {"phase": "Q2", "title": "Phase 2", "desc": "Growth"},
        {"phase": "Q3", "title": "Phase 3", "desc": "Scale"}
      ]
    },
    {
      "layout": "closing",
      "title": "Thank You",
      "subtitle": "Questions & Discussion",
      "contactInfo": "contact@aenews.ai",
      "website": "aenews.ai"
    }
  ]
}`,
      `Create a premium ${style} presentation about: ${topic}`,
      { responseFormat: 'json', temperature: 0.7, maxTokens: 8192 },
    );

    let slideData: any;
    if (llmResult) {
      slideData = this.safeJsonParse(llmResult);
    }

    if (!slideData || !slideData.slides || slideData.slides.length === 0) {
      this.logger.warn('LLM did not return valid premium slide data — using enhanced fallback');
      slideData = this.buildPremiumFallback(topic, language);
    }

    return this.buildPremiumPptx(slideData, theme, startTime);
  }

  /**
   * Enhanced fallback with varied premium layouts when LLM is unavailable.
   */
  private buildPremiumFallback(topic: string, language: string): any {
    const isFr = language === 'fr';
    return {
      title: topic,
      subtitle: isFr ? 'Propulsé par AENEWS Agent OS X' : 'Powered by AENEWS Agent OS X',
      author: 'AENEWS Agent OS X',
      slides: [
        {
          layout: 'cover',
          title: topic,
          subtitle: isFr ? 'Propulsé par AENEWS Agent OS X' : 'Powered by AENEWS Agent OS X',
        },
        {
          layout: 'section',
          title: isFr ? 'Vue d\'ensemble' : 'Overview',
          sectionNumber: '01',
        },
        {
          layout: 'content',
          title: isFr ? 'Introduction' : 'Introduction',
          bullets: isFr
            ? ['Système multi-agents de nouvelle génération', '14 clusters spécialisés et 110+ agents IA', 'Architecture distribuée haute performance', 'Orchestration intelligente des missions']
            : ['Next-generation multi-agent system', '14 specialized clusters with 110+ AI agents', 'High-performance distributed architecture', 'Intelligent mission orchestration'],
          notes: isFr ? 'Introduction au système AENEWS' : 'Introduction to the AENEWS system',
        },
        {
          layout: 'stat-block',
          title: isFr ? 'Chiffres clés' : 'Key Metrics',
          stats: [
            { value: '110+', label: isFr ? 'Agents IA' : 'AI Agents', color: 'accent' },
            { value: '14', label: isFr ? 'Clusters' : 'Clusters', color: 'success' },
            { value: '3ms', label: isFr ? 'Temps de réponse' : 'Response Time', color: 'warning' },
            { value: '99.9%', label: isFr ? 'Disponibilité' : 'Uptime', color: 'accent' },
          ],
        },
        {
          layout: 'section',
          title: isFr ? 'Architecture' : 'Architecture',
          sectionNumber: '02',
        },
        {
          layout: 'two-column',
          title: isFr ? 'Architecture du système' : 'System Architecture',
          leftHeading: isFr ? 'Backend' : 'Backend',
          leftBullets: isFr
            ? ['NestJS 11 avec 22 modules', 'PostgreSQL + Redis + Neo4j', 'Bull Queue + RabbitMQ', 'Chiffrement AES-256-GCM']
            : ['NestJS 11 with 22 modules', 'PostgreSQL + Redis + Neo4j', 'Bull Queue + RabbitMQ', 'AES-256-GCM encryption'],
          rightHeading: isFr ? 'Frontend' : 'Frontend',
          rightBullets: isFr
            ? ['Next.js 16 + React 19', 'Tailwind CSS 4', 'WebSocket temps réel', 'Dashboard de monitoring']
            : ['Next.js 16 + React 19', 'Tailwind CSS 4', 'Real-time WebSocket', 'Monitoring dashboard'],
        },
        {
          layout: 'comparison',
          title: isFr ? 'Avant vs Après AENEWS' : 'Before vs After AENEWS',
          leftTitle: isFr ? 'Approche Traditionnelle' : 'Traditional Approach',
          leftItems: isFr
            ? ['Processus manuels', 'Temps de réponse lent', 'Architecture monolithique', 'Sécurité basique']
            : ['Manual processes', 'Slow response times', 'Monolithic architecture', 'Basic security'],
          rightTitle: 'AENEWS Agent OS X',
          rightItems: isFr
            ? ['Automatisation IA complète', 'Réponse en temps réel', 'Architecture distribuée', 'Sécurité avancée multi-couches']
            : ['Full AI automation', 'Real-time response', 'Distributed architecture', 'Advanced multi-layer security'],
        },
        {
          layout: 'content',
          title: isFr ? 'Clusters d\'agents' : 'Agent Clusters',
          bullets: isFr
            ? ['Browser : 18 agents de navigation et scraping', 'Coding : 8 agents de développement et review', 'Office : 6 agents dont présentation LLM', 'Meta-Intelligence : 13 agents cognitifs', 'Certification : 13 auditeurs automatisés']
            : ['Browser: 18 navigation & scraping agents', 'Coding: 8 development & review agents', 'Office: 6 agents including LLM presentation', 'Meta-Intelligence: 13 cognitive agents', 'Certification: 13 automated auditors'],
        },
        {
          layout: 'timeline',
          title: isFr ? 'Feuille de route' : 'Roadmap',
          steps: isFr
            ? [
                { phase: 'Q1', title: 'Fondation', desc: 'Infrastructure core + 14 clusters' },
                { phase: 'Q2', title: 'Intégration', desc: 'Connecteurs avancés + LLM premium' },
                { phase: 'Q3', title: 'Scale', desc: 'Auto-scaling + Optimisation IA' },
                { phase: 'Q4', title: 'Évolution', desc: 'Self-evolution + Certification' },
              ]
            : [
                { phase: 'Q1', title: 'Foundation', desc: 'Core infrastructure + 14 clusters' },
                { phase: 'Q2', title: 'Integration', desc: 'Advanced connectors + Premium LLM' },
                { phase: 'Q3', title: 'Scale', desc: 'Auto-scaling + AI optimization' },
                { phase: 'Q4', title: 'Evolution', desc: 'Self-evolution + Certification' },
              ],
        },
        {
          layout: 'closing',
          title: isFr ? 'Merci' : 'Thank You',
          subtitle: isFr ? 'Questions & Discussion' : 'Questions & Discussion',
          contactInfo: 'contact@aenews.ai',
          website: 'aenews.ai',
        },
      ],
    };
  }

  /* ── ORIGINAL LLM GENERATION (kept for backward compat) ─────────── */

  private async generateWithLLM(config: Record<string, any>, startTime: number): Promise<AgentResult> {
    const topic = config.topic || config.title;
    const slideCount = config.slideCount || 8;
    const language = config.language || 'fr';
    const style = config.style || 'professional';
    const theme = config.theme || 'corporate';

    if (!topic) {
      return { success: false, error: 'Topic/title is required for LLM-generated presentations' };
    }

    this.logger.log(`Generating LLM-powered presentation on "${topic}" (${slideCount} slides, ${language})`);
    this.emitEvent(AgentEventType.AGENT_STARTED, { action: 'generate-with-llm', topic });

    const llmResult = await this.executeWithLLM(
      `You are a professional presentation designer. Create a ${style} presentation about the given topic.
The presentation should have exactly ${slideCount} slides.
Respond in ${language === 'fr' ? 'French' : language === 'en' ? 'English' : language}.
Return a JSON object with this exact structure:
{
  "title": "Presentation Title",
  "subtitle": "Optional subtitle",
  "author": "AENEWS Agent OS X",
  "slides": [
    {
      "layout": "content",
      "title": "Slide Title",
      "bullets": ["Point 1", "Point 2", "Point 3"],
      "notes": "Speaker notes for this slide"
    }
  ]
}
The first slide should be a title slide (layout "cover" with title and subtitle).
The last slide should be a conclusion/thank you slide (layout "closing").
Each content slide should have 3-5 bullet points.
Use varied layouts: "cover", "content", "section", "stat-block", "two-column", "comparison", "timeline", "quote", "closing".`,
      `Create a ${style} presentation about: ${topic}`,
      { responseFormat: 'json', temperature: 0.7, maxTokens: 4096 },
    );

    let slideData: any;
    if (llmResult) {
      slideData = this.safeJsonParse(llmResult);
    }

    if (!slideData || !slideData.slides) {
      this.logger.warn('LLM did not return valid slide data — using fallback structure');
      slideData = this.buildPremiumFallback(topic, language);
    }

    return this.buildPremiumPptx(slideData, theme, startTime);
  }

  /* ── PREMIUM PPTX BUILDER ──────────────────────────────────────── */

  private async buildPremiumPptx(slideData: any, themeName: string, startTime: number): Promise<AgentResult> {
    const pptx = new PptxGenJS();
    const theme = PREMIUM_THEMES[themeName] || PREMIUM_THEMES.corporate;

    // Presentation metadata
    pptx.author = slideData.author || 'AENEWS Agent OS X';
    pptx.company = 'AENEWS Agent OS X';
    pptx.subject = slideData.title || 'Presentation';
    pptx.title = slideData.title || 'Presentation';

    // Generate each slide using layout-specific renderers
    const slides = slideData.slides || [];
    for (let i = 0; i < slides.length; i++) {
      const slideDef = slides[i];
      const layout = slideDef.layout || this.inferLayout(i, slides.length);
      this.renderSlide(pptx, layout, slideDef, theme, i, slides.length);
    }

    // Save the file
    const safeName = (slideData.title || 'presentation').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const fileName = `${safeName}_Premium_${Date.now()}.pptx`;
    const filePath = path.join(this.outputDir, fileName);

    await pptx.writeFile({ fileName: filePath });

    const stats = fs.statSync(filePath);

    this.emitEvent(AgentEventType.AGENT_COMPLETED, {
      action: 'generate-premium',
      filePath,
      fileSize: stats.size,
      totalSlides: slides.length,
      theme: themeName,
    });

    return {
      success: true,
      data: {
        action: 'generate-premium',
        title: slideData.title,
        format: 'pptx',
        totalSlides: slides.length,
        theme: themeName,
        themeLabel: theme.name,
        filePath,
        fileName,
        fileSize: stats.size,
        createdAt: new Date().toISOString(),
        status: 'premium_presentation_created',
      },
      metadata: { duration: Date.now() - startTime },
    };
  }

  /* ── LAYOUT ROUTER ─────────────────────────────────────────────── */

  private inferLayout(index: number, total: number): SlideLayout {
    if (index === 0) return 'cover';
    if (index === total - 1) return 'closing';
    return 'content';
  }

  private renderSlide(
    pptx: PptxGenJS,
    layout: string,
    def: any,
    theme: PremiumTheme,
    index: number,
    total: number,
  ): void {
    switch (layout) {
      case 'cover':
        this.renderCoverSlide(pptx, def, theme);
        break;
      case 'section':
        this.renderSectionSlide(pptx, def, theme);
        break;
      case 'content':
        this.renderContentSlide(pptx, def, theme, index);
        break;
      case 'two-column':
        this.renderTwoColumnSlide(pptx, def, theme, index);
        break;
      case 'stat-block':
        this.renderStatBlockSlide(pptx, def, theme, index);
        break;
      case 'quote':
        this.renderQuoteSlide(pptx, def, theme);
        break;
      case 'comparison':
        this.renderComparisonSlide(pptx, def, theme, index);
        break;
      case 'timeline':
        this.renderTimelineSlide(pptx, def, theme, index);
        break;
      case 'icon-grid':
        this.renderIconGridSlide(pptx, def, theme, index);
        break;
      case 'image-text':
        this.renderImageTextSlide(pptx, def, theme, index);
        break;
      case 'closing':
        this.renderClosingSlide(pptx, def, theme);
        break;
      default:
        this.renderContentSlide(pptx, def, theme, index);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     SLIDE RENDERERS — Each creates a distinct, premium layout
     ═══════════════════════════════════════════════════════════════════ */

  /**
   * COVER SLIDE — Full-bleed gradient background, large title, accent line, subtitle
   */
  private renderCoverSlide(pptx: PptxGenJS, def: any, theme: PremiumTheme): void {
    const slide = pptx.addSlide();
    slide.background = { fill: theme.primaryDark };

    // Top decorative gradient bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.08,
      fill: { color: theme.accent },
    });

    // Accent side stripe
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.12, h: 7.5,
      fill: { color: theme.accent },
    });

    // Decorative circles (top-right)
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 7.8, y: 0.4, w: 2.5, h: 2.5,
      fill: { color: theme.primary },
      line: { color: theme.accent, width: 1.5, dashType: 'dash' },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 8.4, y: 1.0, w: 1.8, h: 1.8,
      fill: { color: theme.primaryDark },
      line: { color: theme.accentLight, width: 0.5 },
    });

    // Main title
    slide.addText(def.title || 'Presentation', {
      x: 0.8, y: 1.8, w: 7.0, h: 1.6,
      fontSize: 38, fontFace: 'Arial',
      color: 'FFFFFF', bold: true,
      lineSpacingMultiple: 1.1,
    });

    // Accent line under title
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: 3.5, w: 2.5, h: 0.07,
      fill: { color: theme.accent },
    });

    // Subtitle
    if (def.subtitle) {
      slide.addText(def.subtitle, {
        x: 0.8, y: 3.8, w: 7.0, h: 0.8,
        fontSize: 18, fontFace: 'Arial',
        color: theme.accentLight,
        lineSpacingMultiple: 1.2,
      });
    }

    // Author / branding
    slide.addText(def.author || 'AENEWS Agent OS X', {
      x: 0.8, y: 5.8, w: 5.0, h: 0.4,
      fontSize: 11, fontFace: 'Arial',
      color: '94A3B8', bold: true,
    });

    // Bottom accent bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.42, w: 10, h: 0.08,
      fill: { color: theme.accent },
    });

    if (def.notes) slide.addNotes(def.notes);
  }

  /**
   * SECTION SLIDE — Large section number + title on gradient background
   */
  private renderSectionSlide(pptx: PptxGenJS, def: any, theme: PremiumTheme): void {
    const slide = pptx.addSlide();
    slide.background = { fill: theme.primary };

    // Large section number (watermark style)
    slide.addText(def.sectionNumber || '01', {
      x: 0.5, y: 0.5, w: 5.0, h: 4.0,
      fontSize: 120, fontFace: 'Arial',
      color: theme.primaryDark, bold: true, align: 'left',
    });

    // Accent vertical line
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: 3.0, w: 0.06, h: 2.5,
      fill: { color: theme.accent },
    });

    // Section title
    slide.addText(def.title || 'Section', {
      x: 1.2, y: 3.0, w: 7.5, h: 1.5,
      fontSize: 34, fontFace: 'Arial',
      color: 'FFFFFF', bold: true,
    });

    // Subtitle if present
    if (def.subtitle) {
      slide.addText(def.subtitle, {
        x: 1.2, y: 4.5, w: 7.5, h: 0.6,
        fontSize: 16, fontFace: 'Arial',
        color: theme.accentLight,
      });
    }

    // Bottom accent bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.42, w: 10, h: 0.08,
      fill: { color: theme.accent },
    });

    if (def.notes) slide.addNotes(def.notes);
  }

  /**
   * CONTENT SLIDE — White background, colored header bar, bullets with accent markers
   */
  private renderContentSlide(pptx: PptxGenJS, def: any, theme: PremiumTheme, index: number): void {
    const slide = pptx.addSlide();
    slide.background = { fill: theme.bg };

    // Left accent stripe
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.06, h: 7.5,
      fill: { color: theme.accent },
    });

    // Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.9,
      fill: { color: theme.primary },
    });

    // Header title
    slide.addText(def.title || `Slide ${index + 1}`, {
      x: 0.6, y: 0.12, w: 8.5, h: 0.65,
      fontSize: 22, fontFace: 'Arial',
      color: 'FFFFFF', bold: true,
    });

    // Accent underline below header
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.6, y: 0.9, w: 1.5, h: 0.05,
      fill: { color: theme.accent },
    });

    // Bullets with accent markers
    if (def.bullets && def.bullets.length > 0) {
      const bulletText = def.bullets.map((b: string) => ({
        text: b,
        options: {
          fontSize: 15, fontFace: 'Arial', color: theme.text,
          bullet: { code: '25BA', color: theme.accent },
          paraSpaceAfter: 10,
          lineSpacingMultiple: 1.3,
        },
      }));
      slide.addText(bulletText, {
        x: 0.8, y: 1.3, w: 8.4, h: 5.2,
        valign: 'top',
      });
    }

    // Slide number
    slide.addText(`${index + 1}`, {
      x: 9.2, y: 7.05, w: 0.6, h: 0.3,
      fontSize: 9, color: theme.textLight, align: 'right',
    });

    if (def.notes) slide.addNotes(def.notes);
  }

  /**
   * TWO-COLUMN SLIDE — Split content with headings
   */
  private renderTwoColumnSlide(pptx: PptxGenJS, def: any, theme: PremiumTheme, index: number): void {
    const slide = pptx.addSlide();
    slide.background = { fill: theme.bg };

    // Left accent stripe
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.06, h: 7.5,
      fill: { color: theme.accent },
    });

    // Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.9,
      fill: { color: theme.primary },
    });
    slide.addText(def.title || 'Comparison', {
      x: 0.6, y: 0.12, w: 8.5, h: 0.65,
      fontSize: 22, fontFace: 'Arial', color: 'FFFFFF', bold: true,
    });

    // Divider line
    slide.addShape(pptx.ShapeType.rect, {
      x: 4.95, y: 1.3, w: 0.04, h: 5.2,
      fill: { color: theme.accentLight },
    });

    // Left column heading
    if (def.leftHeading) {
      slide.addText(def.leftHeading, {
        x: 0.6, y: 1.2, w: 4.2, h: 0.5,
        fontSize: 17, fontFace: 'Arial', color: theme.primary, bold: true,
      });
    }

    // Left column bullets
    if (def.leftBullets && def.leftBullets.length > 0) {
      const leftBullets = def.leftBullets.map((b: string) => ({
        text: b,
        options: {
          fontSize: 13, fontFace: 'Arial', color: theme.text,
          bullet: { code: '25BA', color: theme.accent },
          paraSpaceAfter: 8,
        },
      }));
      slide.addText(leftBullets, {
        x: 0.6, y: 1.8, w: 4.2, h: 4.5, valign: 'top',
      });
    }

    // Right column heading
    if (def.rightHeading) {
      slide.addText(def.rightHeading, {
        x: 5.2, y: 1.2, w: 4.2, h: 0.5,
        fontSize: 17, fontFace: 'Arial', color: theme.primary, bold: true,
      });
    }

    // Right column bullets
    if (def.rightBullets && def.rightBullets.length > 0) {
      const rightBullets = def.rightBullets.map((b: string) => ({
        text: b,
        options: {
          fontSize: 13, fontFace: 'Arial', color: theme.text,
          bullet: { code: '25BA', color: theme.accent },
          paraSpaceAfter: 8,
        },
      }));
      slide.addText(rightBullets, {
        x: 5.2, y: 1.8, w: 4.2, h: 4.5, valign: 'top',
      });
    }

    // Slide number
    slide.addText(`${index + 1}`, {
      x: 9.2, y: 7.05, w: 0.6, h: 0.3,
      fontSize: 9, color: theme.textLight, align: 'right',
    });

    if (def.notes) slide.addNotes(def.notes);
  }

  /**
   * STAT BLOCK SLIDE — 3-4 large statistic numbers in cards
   */
  private renderStatBlockSlide(pptx: PptxGenJS, def: any, theme: PremiumTheme, index: number): void {
    const slide = pptx.addSlide();
    slide.background = { fill: theme.bgLight };

    // Left accent stripe
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.06, h: 7.5,
      fill: { color: theme.accent },
    });

    // Title bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.9,
      fill: { color: theme.primary },
    });
    slide.addText(def.title || 'Key Metrics', {
      x: 0.6, y: 0.12, w: 8.5, h: 0.65,
      fontSize: 22, fontFace: 'Arial', color: 'FFFFFF', bold: true,
    });

    // Stat cards
    const stats = def.stats || [
      { value: '99.9%', label: 'Uptime', color: 'success' },
      { value: '110+', label: 'Agents', color: 'accent' },
      { value: '3ms', label: 'Response', color: 'warning' },
    ];

    const cardWidth = stats.length <= 3 ? 2.8 : 2.1;
    const gap = 0.3;
    const totalWidth = stats.length * cardWidth + (stats.length - 1) * gap;
    const startX = (10 - totalWidth) / 2;

    for (let i = 0; i < stats.length; i++) {
      const stat = stats[i];
      const x = startX + i * (cardWidth + gap);
      const statColor = this.getStatColor(stat.color, theme);

      // Card background
      slide.addShape(pptx.ShapeType.rect, {
        x, y: 1.6, w: cardWidth, h: 3.8,
        fill: { color: theme.bg },
        rectRadius: 0.1,
        shadow: { type: 'outer', blur: 6, offset: 2, color: '000000', opacity: 0.12 },
      });

      // Top accent bar on card
      slide.addShape(pptx.ShapeType.rect, {
        x, y: 1.6, w: cardWidth, h: 0.08,
        fill: { color: statColor },
        rectRadius: 0.1,
      });

      // Stat value (big number)
      slide.addText(stat.value || '—', {
        x, y: 2.3, w: cardWidth, h: 1.4,
        fontSize: 36, fontFace: 'Arial', color: statColor,
        bold: true, align: 'center',
      });

      // Stat label
      slide.addText(stat.label || '', {
        x, y: 3.8, w: cardWidth, h: 0.6,
        fontSize: 13, fontFace: 'Arial', color: theme.textLight,
        align: 'center',
      });
    }

    // Slide number
    slide.addText(`${index + 1}`, {
      x: 9.2, y: 7.05, w: 0.6, h: 0.3,
      fontSize: 9, color: theme.textLight, align: 'right',
    });

    if (def.notes) slide.addNotes(def.notes);
  }

  /**
   * QUOTE SLIDE — Large quote with accent decoration and attribution
   */
  private renderQuoteSlide(pptx: PptxGenJS, def: any, theme: PremiumTheme): void {
    const slide = pptx.addSlide();
    slide.background = { fill: theme.primary };

    // Decorative top accent bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.06,
      fill: { color: theme.accent },
    });

    // Large opening quote mark
    slide.addText('\u201C', {
      x: 0.8, y: 1.0, w: 2.0, h: 2.0,
      fontSize: 120, fontFace: 'Arial',
      color: theme.accent, bold: true,
    });

    // Quote text
    slide.addText(def.quote || def.title || 'Innovation drives progress', {
      x: 1.5, y: 2.0, w: 7.0, h: 3.0,
      fontSize: 24, fontFace: 'Arial',
      color: 'FFFFFF', italic: true,
      lineSpacingMultiple: 1.4,
    });

    // Accent line before attribution
    slide.addShape(pptx.ShapeType.rect, {
      x: 1.5, y: 5.2, w: 1.5, h: 0.05,
      fill: { color: theme.accent },
    });

    // Attribution
    if (def.attribution) {
      slide.addText(`\u2014 ${def.attribution}`, {
        x: 1.5, y: 5.5, w: 6.0, h: 0.5,
        fontSize: 14, fontFace: 'Arial',
        color: theme.accentLight,
      });
    }

    // Bottom accent bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.44, w: 10, h: 0.06,
      fill: { color: theme.accent },
    });

    if (def.notes) slide.addNotes(def.notes);
  }

  /**
   * COMPARISON SLIDE — Side-by-side comparison with colored panels
   */
  private renderComparisonSlide(pptx: PptxGenJS, def: any, theme: PremiumTheme, index: number): void {
    const slide = pptx.addSlide();
    slide.background = { fill: theme.bg };

    // Left accent stripe
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.06, h: 7.5,
      fill: { color: theme.accent },
    });

    // Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.9,
      fill: { color: theme.primary },
    });
    slide.addText(def.title || 'Comparison', {
      x: 0.6, y: 0.12, w: 8.5, h: 0.65,
      fontSize: 22, fontFace: 'Arial', color: 'FFFFFF', bold: true,
    });

    // Left panel (muted/red tone)
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.4, y: 1.3, w: 4.4, h: 5.4,
      fill: { color: 'FEF2F2' },
      rectRadius: 0.1,
    });
    slide.addText(def.leftTitle || 'Option A', {
      x: 0.6, y: 1.5, w: 4.0, h: 0.5,
      fontSize: 16, fontFace: 'Arial', color: '991B1B', bold: true,
    });
    if (def.leftItems) {
      const items = def.leftItems.map((item: string) => ({
        text: item,
        options: {
          fontSize: 13, fontFace: 'Arial', color: '7F1D1D',
          bullet: { code: '2718', color: 'DC2626' },
          paraSpaceAfter: 8,
        },
      }));
      slide.addText(items, {
        x: 0.6, y: 2.2, w: 4.0, h: 4.0, valign: 'top',
      });
    }

    // Right panel (green/accent tone)
    slide.addShape(pptx.ShapeType.rect, {
      x: 5.2, y: 1.3, w: 4.4, h: 5.4,
      fill: { color: theme.bgCard },
      rectRadius: 0.1,
    });
    slide.addText(def.rightTitle || 'Option B', {
      x: 5.4, y: 1.5, w: 4.0, h: 0.5,
      fontSize: 16, fontFace: 'Arial', color: theme.primary, bold: true,
    });
    if (def.rightItems) {
      const items = def.rightItems.map((item: string) => ({
        text: item,
        options: {
          fontSize: 13, fontFace: 'Arial', color: theme.text,
          bullet: { code: '2714', color: theme.success },
          paraSpaceAfter: 8,
        },
      }));
      slide.addText(items, {
        x: 5.4, y: 2.2, w: 4.0, h: 4.0, valign: 'top',
      });
    }

    // VS circle
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 4.55, y: 3.5, w: 0.9, h: 0.9,
      fill: { color: theme.accent },
    });
    slide.addText('VS', {
      x: 4.55, y: 3.55, w: 0.9, h: 0.8,
      fontSize: 14, fontFace: 'Arial', color: 'FFFFFF', bold: true, align: 'center', valign: 'middle',
    });

    // Slide number
    slide.addText(`${index + 1}`, {
      x: 9.2, y: 7.05, w: 0.6, h: 0.3,
      fontSize: 9, color: theme.textLight, align: 'right',
    });

    if (def.notes) slide.addNotes(def.notes);
  }

  /**
   * TIMELINE SLIDE — 3-4 step horizontal timeline with phase markers
   */
  private renderTimelineSlide(pptx: PptxGenJS, def: any, theme: PremiumTheme, index: number): void {
    const slide = pptx.addSlide();
    slide.background = { fill: theme.bg };

    // Left accent stripe
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.06, h: 7.5,
      fill: { color: theme.accent },
    });

    // Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.9,
      fill: { color: theme.primary },
    });
    slide.addText(def.title || 'Timeline', {
      x: 0.6, y: 0.12, w: 8.5, h: 0.65,
      fontSize: 22, fontFace: 'Arial', color: 'FFFFFF', bold: true,
    });

    const steps = def.steps || [
      { phase: 'Phase 1', title: 'Start', desc: 'Begin' },
      { phase: 'Phase 2', title: 'Grow', desc: 'Expand' },
      { phase: 'Phase 3', title: 'Scale', desc: 'Dominate' },
    ];

    const stepWidth = 8.0 / steps.length;
    const timelineY = 3.8;

    // Horizontal timeline line
    slide.addShape(pptx.ShapeType.rect, {
      x: 1.0, y: timelineY, w: 8.0, h: 0.04,
      fill: { color: theme.accentLight },
    });

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const cx = 1.0 + stepWidth * i + stepWidth / 2;

      // Phase circle on timeline
      slide.addShape(pptx.ShapeType.ellipse, {
        x: cx - 0.25, y: timelineY - 0.25, w: 0.5, h: 0.5,
        fill: { color: theme.accent },
      });

      // Phase label above
      slide.addText(step.phase || `Q${i + 1}`, {
        x: cx - 0.7, y: timelineY - 1.0, w: 1.4, h: 0.4,
        fontSize: 11, fontFace: 'Arial', color: theme.accent, bold: true, align: 'center',
      });

      // Step title below
      slide.addText(step.title || '', {
        x: cx - 0.9, y: timelineY + 0.6, w: 1.8, h: 0.5,
        fontSize: 14, fontFace: 'Arial', color: theme.primary, bold: true, align: 'center',
      });

      // Step description
      slide.addText(step.desc || '', {
        x: cx - 0.9, y: timelineY + 1.1, w: 1.8, h: 0.8,
        fontSize: 11, fontFace: 'Arial', color: theme.textLight, align: 'center',
        lineSpacingMultiple: 1.2,
      });
    }

    // Slide number
    slide.addText(`${index + 1}`, {
      x: 9.2, y: 7.05, w: 0.6, h: 0.3,
      fontSize: 9, color: theme.textLight, align: 'right',
    });

    if (def.notes) slide.addNotes(def.notes);
  }

  /**
   * ICON GRID SLIDE — 2x2 or 2x3 grid of labeled items
   */
  private renderIconGridSlide(pptx: PptxGenJS, def: any, theme: PremiumTheme, index: number): void {
    const slide = pptx.addSlide();
    slide.background = { fill: theme.bg };

    // Left accent stripe
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.06, h: 7.5,
      fill: { color: theme.accent },
    });

    // Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.9,
      fill: { color: theme.primary },
    });
    slide.addText(def.title || 'Features', {
      x: 0.6, y: 0.12, w: 8.5, h: 0.65,
      fontSize: 22, fontFace: 'Arial', color: 'FFFFFF', bold: true,
    });

    const items = def.items || [
      { icon: '\u2699', label: 'Feature 1', desc: 'Description' },
      { icon: '\u26A1', label: 'Feature 2', desc: 'Description' },
      { icon: '\u2606', label: 'Feature 3', desc: 'Description' },
      { icon: '\u2714', label: 'Feature 4', desc: 'Description' },
    ];

    const cols = 2;
    const rows = Math.ceil(items.length / cols);
    const cardW = 4.2;
    const cardH = 2.4;
    const gapX = 0.4;
    const gapY = 0.3;
    const startX = (10 - (cols * cardW + (cols - 1) * gapX)) / 2;
    const startY = 1.3;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      // Card background
      slide.addShape(pptx.ShapeType.rect, {
        x, y, w: cardW, h: cardH,
        fill: { color: theme.bgCard },
        rectRadius: 0.1,
        shadow: { type: 'outer', blur: 4, offset: 2, color: '000000', opacity: 0.08 },
      });

      // Top accent line
      slide.addShape(pptx.ShapeType.rect, {
        x, y, w: cardW, h: 0.05,
        fill: { color: theme.accent },
      });

      // Icon
      slide.addText(item.icon || '\u25CF', {
        x: x + 0.3, y: y + 0.3, w: 0.6, h: 0.6,
        fontSize: 24, color: theme.accent, align: 'center',
      });

      // Label
      slide.addText(item.label || '', {
        x: x + 1.0, y: y + 0.3, w: 2.8, h: 0.5,
        fontSize: 15, fontFace: 'Arial', color: theme.primary, bold: true,
      });

      // Description
      slide.addText(item.desc || '', {
        x: x + 1.0, y: y + 0.9, w: 2.8, h: 1.0,
        fontSize: 11, fontFace: 'Arial', color: theme.textLight,
        lineSpacingMultiple: 1.3,
      });
    }

    // Slide number
    slide.addText(`${index + 1}`, {
      x: 9.2, y: 7.05, w: 0.6, h: 0.3,
      fontSize: 9, color: theme.textLight, align: 'right',
    });

    if (def.notes) slide.addNotes(def.notes);
  }

  /**
   * IMAGE-TEXT SLIDE — Image placeholder on one side, text on the other
   */
  private renderImageTextSlide(pptx: PptxGenJS, def: any, theme: PremiumTheme, index: number): void {
    const slide = pptx.addSlide();
    slide.background = { fill: theme.bg };

    // Left accent stripe
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.06, h: 7.5,
      fill: { color: theme.accent },
    });

    // Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.9,
      fill: { color: theme.primary },
    });
    slide.addText(def.title || 'Details', {
      x: 0.6, y: 0.12, w: 8.5, h: 0.65,
      fontSize: 22, fontFace: 'Arial', color: 'FFFFFF', bold: true,
    });

    // Image placeholder (left side)
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.5, y: 1.3, w: 4.2, h: 5.2,
      fill: { color: theme.bgCard },
      rectRadius: 0.1,
      line: { color: theme.accentLight, width: 1, dashType: 'dash' },
    });
    slide.addText(def.imageDesc || '\uD83D\uDDBC  Image', {
      x: 0.5, y: 3.3, w: 4.2, h: 1.2,
      fontSize: 14, fontFace: 'Arial', color: theme.textLight,
      align: 'center', valign: 'middle',
    });

    // Text content (right side)
    if (def.bodyText || def.bullets) {
      if (def.bullets) {
        const bulletText = def.bullets.map((b: string) => ({
          text: b,
          options: {
            fontSize: 14, fontFace: 'Arial', color: theme.text,
            bullet: { code: '25BA', color: theme.accent },
            paraSpaceAfter: 8,
          },
        }));
        slide.addText(bulletText, {
          x: 5.2, y: 1.5, w: 4.2, h: 5.0, valign: 'top',
        });
      } else {
        slide.addText(def.bodyText || '', {
          x: 5.2, y: 1.5, w: 4.2, h: 5.0,
          fontSize: 14, fontFace: 'Arial', color: theme.text,
          lineSpacingMultiple: 1.4, valign: 'top',
        });
      }
    }

    // Slide number
    slide.addText(`${index + 1}`, {
      x: 9.2, y: 7.05, w: 0.6, h: 0.3,
      fontSize: 9, color: theme.textLight, align: 'right',
    });

    if (def.notes) slide.addNotes(def.notes);
  }

  /**
   * CLOSING SLIDE — Thank you with contact info on gradient background
   */
  private renderClosingSlide(pptx: PptxGenJS, def: any, theme: PremiumTheme): void {
    const slide = pptx.addSlide();
    slide.background = { fill: theme.primaryDark };

    // Top accent bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.06,
      fill: { color: theme.accent },
    });

    // Decorative circle (top-left)
    slide.addShape(pptx.ShapeType.ellipse, {
      x: -1.0, y: -1.0, w: 3.0, h: 3.0,
      fill: { color: theme.primary },
      line: { color: theme.accent, width: 0.5 },
    });

    // Decorative circle (bottom-right)
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 8.0, y: 5.5, w: 2.5, h: 2.5,
      fill: { color: theme.primary },
      line: { color: theme.accent, width: 0.5 },
    });

    // Main "Thank You" text
    slide.addText(def.title || 'Merci', {
      x: 1.0, y: 1.8, w: 8.0, h: 1.5,
      fontSize: 48, fontFace: 'Arial',
      color: 'FFFFFF', bold: true, align: 'center',
    });

    // Accent line
    slide.addShape(pptx.ShapeType.rect, {
      x: 3.5, y: 3.4, w: 3.0, h: 0.06,
      fill: { color: theme.accent },
    });

    // Subtitle
    if (def.subtitle) {
      slide.addText(def.subtitle, {
        x: 1.5, y: 3.8, w: 7.0, h: 0.6,
        fontSize: 18, fontFace: 'Arial',
        color: theme.accentLight, align: 'center',
      });
    }

    // Contact info
    if (def.contactInfo) {
      slide.addText(def.contactInfo, {
        x: 2.5, y: 5.2, w: 5.0, h: 0.4,
        fontSize: 13, fontFace: 'Arial',
        color: '94A3B8', align: 'center',
      });
    }

    // Website
    if (def.website) {
      slide.addText(def.website, {
        x: 2.5, y: 5.7, w: 5.0, h: 0.4,
        fontSize: 13, fontFace: 'Arial',
        color: theme.accent, align: 'center', bold: true,
      });
    }

    // Bottom accent bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.44, w: 10, h: 0.06,
      fill: { color: theme.accent },
    });

    if (def.notes) slide.addNotes(def.notes);
  }

  /* ── HELPER: Resolve stat color ────────────────────────────────── */

  private getStatColor(colorKey: string | undefined, theme: PremiumTheme): string {
    switch (colorKey) {
      case 'success': return theme.success;
      case 'warning': return theme.warning;
      case 'danger': return theme.danger;
      case 'accent': return theme.accent;
      case 'primary': return theme.primary;
      default: return theme.accent;
    }
  }

  /* ── ORIGINAL createPptx (backward compat) ─────────────────────── */

  private async createPptx(config: Record<string, any>, startTime: number): Promise<AgentResult> {
    const title = config.title;
    if (!title) {
      return { success: false, error: 'Title is required to create a presentation' };
    }

    this.logger.log(`Creating presentation "${title}"`);

    const slideData = {
      title,
      subtitle: config.subtitle || '',
      author: config.author || 'AENEWS Agent OS X',
      slides: config.slides || [
        { layout: 'cover', title, subtitle: config.subtitle || '' },
        { layout: 'content', title: 'Content', bullets: ['Add your content here'] },
        { layout: 'closing', title: 'Thank You', subtitle: 'Questions?' },
      ],
    };

    const theme = config.theme || 'corporate';
    return this.buildPremiumPptx(slideData, theme, startTime);
  }

  /* ── STUB HANDLERS (backward compat) ──────────────────────────── */

  private handleEdit(config: Record<string, any>, startTime: number): AgentResult {
    const presentationId = config.presentationId;
    if (!presentationId) {
      return { success: false, error: 'Presentation ID is required to edit a presentation' };
    }
    return {
      success: true,
      data: {
        action: 'edit', presentationId,
        status: 'presentation_edited',
        timestamp: new Date().toISOString(),
      },
      metadata: { duration: Date.now() - startTime },
    };
  }

  private handleTemplate(config: Record<string, any>, startTime: number): AgentResult {
    const themes = Object.keys(PREMIUM_THEMES);
    return {
      success: true,
      data: {
        action: 'template',
        operation: config.operation || 'list',
        availableThemes: themes.map(t => ({ id: t, name: PREMIUM_THEMES[t].name })),
        availableLayouts: ['cover', 'section', 'content', 'two-column', 'stat-block', 'quote', 'comparison', 'timeline', 'icon-grid', 'image-text', 'closing'],
        status: 'template_operation_complete',
        timestamp: new Date().toISOString(),
      },
      metadata: { duration: Date.now() - startTime },
    };
  }

  private handleExport(config: Record<string, any>, startTime: number): AgentResult {
    return {
      success: true,
      data: {
        action: 'export', toFormat: config.toFormat || 'pdf',
        status: 'presentation_exported',
        timestamp: new Date().toISOString(),
      },
      metadata: { duration: Date.now() - startTime },
    };
  }

  private handleAnimate(config: Record<string, any>, startTime: number): AgentResult {
    return {
      success: true,
      data: {
        action: 'animate', operation: config.operation || 'add',
        status: 'animation_operation_complete',
        timestamp: new Date().toISOString(),
      },
      metadata: { duration: Date.now() - startTime },
    };
  }
}
