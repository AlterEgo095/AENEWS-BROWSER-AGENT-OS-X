/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 *
 * File: backend/src/modules/content-factory/agents/base-content.agent.ts
 *
 * BaseContentAgent — Abstract class for all 18 Content Factory agents.
 * Factorise : research, outline, draft, review, format, deliver.
 *
 * Pipeline commun :
 *   1. Research (web search + existing knowledge retrieval)
 *   2. Outline (LLM structure generation)
 *   3. Draft (LLM writing per section)
 *   4. Review (LLM critic + revision)
 *   5. Format (markdown → html/pdf/pptx/epub)
 *   6. SEO optimization (if applicable)
 *   7. Deliver (upload to storage + return URL)
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';
import {
  CreateContentDto, ContentArtifact, ContentStatus, ContentType,
  AudienceLevel, Tone,
} from '../dto/content.dto';

export abstract class BaseContentAgent {
  protected readonly logger: Logger;
  protected abstract readonly supportedType: ContentType;

  constructor(
    protected readonly llmService: LLMService,
    @Inject('REDIS_CLIENT') protected readonly redis: Redis,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  // ==========================================================================
  // Public entry point
  // ==========================================================================

  async execute(dto: CreateContentDto): Promise<ContentArtifact> {
    const startedAt = Date.now();
    const artifactId = `content_${uuidv4()}`;
    this.logger.log(`[${artifactId}] Generating ${dto.type}: "${dto.topic}"`);

    const artifact: ContentArtifact = {
      id: artifactId,
      type: dto.type,
      title: dto.title || dto.topic,
      status: ContentStatus.RESEARCHING,
      metadata: {
        wordCount: 0,
        readingTime: 0,
        language: dto.language || 'fr',
        audienceLevel: dto.audienceLevel || AudienceLevel.INTERMEDIATE,
        tone: dto.tone || Tone.PROFESSIONAL,
        keywords: dto.keywords || [],
        references: dto.references,
      },
      deliverables: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      generatedBy: this.constructor.name,
      durationMs: 0,
      costUSD: 0,
    };

    try {
      // STEP 1 — Research
      const research = await this.research(dto, artifact);
      artifact.status = ContentStatus.RESEARCHING;

      // STEP 2 — Outline
      artifact.status = ContentStatus.OUTLINING;
      artifact.outline = await this.outline(dto, research, artifact);

      // STEP 3 — Draft (write content)
      artifact.status = ContentStatus.WRITING;
      artifact.content = await this.draft(dto, artifact.outline, research, artifact);
      artifact.metadata.wordCount = artifact.content.split(/\s+/).length;
      artifact.metadata.readingTime = Math.ceil(artifact.metadata.wordCount / 200);

      // STEP 4 — Review + revise
      artifact.status = ContentStatus.REVIEWING;
      const reviewed = await this.review(dto, artifact);
      if (reviewed.revised) {
        artifact.content = reviewed.content;
        artifact.metadata.wordCount = artifact.content.split(/\s+/).length;
      }
      artifact.quality = reviewed.quality;

      // STEP 5 — Format
      artifact.deliverables = await this.format(dto, artifact);

      // STEP 6 — SEO (if applicable)
      if (this.isSEOOptimizable(dto.type)) {
        artifact.seo = await this.optimizeSEO(dto, artifact);
      }

      // STEP 7 — Done
      artifact.status = ContentStatus.READY;
      artifact.updatedAt = new Date();
      artifact.durationMs = Date.now() - startedAt;
      artifact.costUSD = this.estimateCost(artifact);

      // Persist
      await this.persist(artifact);

      this.logger.log(
        `[${artifactId}] ${dto.type} ready: ${artifact.metadata.wordCount} words, ` +
        `${artifact.metadata.readingTime}min, quality ${artifact.quality?.overallScore ?? 'N/A'}/100`,
      );
      return artifact;

    } catch (err) {
      artifact.status = ContentStatus.FAILED;
      artifact.durationMs = Date.now() - startedAt;
      this.logger.error(`[${artifactId}] Generation failed: ${err.message}`);
      await this.persist(artifact);
      throw err;
    }
  }

  // ==========================================================================
  // Pipeline steps — overridable by concrete agents
  // ==========================================================================

  protected async research(dto: CreateContentDto, _artifact: ContentArtifact): Promise<any> {
    // Default: simple LLM-based research (no web search)
    const prompt = `You are a research assistant. Provide key facts, data points, and recent developments about:
"${dto.topic}"

Audience: ${dto.audienceLevel}
Keywords: ${dto.keywords?.join(', ') || 'N/A'}

Respond in JSON:
{
  "keyFacts": ["fact 1", "fact 2", ...],
  "dataPoints": [{"metric": "X", "value": "Y", "source": "..."}],
  "recentDevelopments": ["..."],
  "controversies": ["..."],
  "recommendedSources": ["url1", "url2"]
}`;

    try {
      const response = await this.llmService.complete({
        prompt, temperature: 0.3, maxTokens: 1500,
      });
      return JSON.parse(response.text);
    } catch {
      return { keyFacts: [], dataPoints: [], recentDevelopments: [] };
    }
  }

  protected async outline(dto: CreateContentDto, research: any, artifact: ContentArtifact): Promise<any> {
    const prompt = `Create a detailed outline for a ${dto.type} about "${dto.topic}".
Audience: ${dto.audienceLevel}
Tone: ${dto.tone}
Target word count: ${dto.wordCount || this.defaultWordCount(dto.type)}
Language: ${artifact.metadata.language}

Research data:
${JSON.stringify(research).substring(0, 2000)}

Respond in JSON:
{
  "title": "Final title",
  "sections": [
    {
      "heading": "Section title",
      "subsections": ["subsection 1", "subsection 2"],
      "estimatedWords": 200,
      "keyPoints": ["point 1", "point 2"]
    }
  ]
}`;

    const response = await this.llmService.complete({
      prompt, temperature: 0.4, maxTokens: 1500,
    });
    try {
      return JSON.parse(response.text);
    } catch {
      return {
        title: dto.title || dto.topic,
        sections: [{ heading: dto.topic, subsections: [], estimatedWords: 500, keyPoints: [] }],
      };
    }
  }

  protected async draft(dto: CreateContentDto, outline: any, research: any, artifact: ContentArtifact): Promise<string> {
    // Write each section in parallel, then concatenate
    const sections = outline.sections || [];
    const sectionContents = await Promise.all(
      sections.map((section: any) => this.writeSection(section, dto, research, artifact)),
    );

    const intro = await this.writeIntroduction(outline, dto, research, artifact);
    const conclusion = await this.writeConclusion(outline, dto, research, artifact);

    return [
      `# ${outline.title || dto.title || dto.topic}\n`,
      intro,
      ...sections.map((s: any, i: number) => `## ${s.heading}\n\n${sectionContents[i]}`),
      conclusion,
    ].join('\n\n');
  }

  protected async review(dto: CreateContentDto, artifact: ContentArtifact): Promise<{
    revised: boolean;
    content?: string;
    quality: ContentArtifact['quality'];
  }> {
    const prompt = `You are a content editor. Review this ${dto.type} and provide:
1. A quality score (0-100)
2. Specific improvement suggestions
3. A revised version if necessary

CONTENT:
${artifact.content?.substring(0, 8000)}

Respond in JSON:
{
  "quality": {
    "readabilityScore": 0-100,
    "seoScore": 0-100,
    "factCheckScore": 0-100,
    "overallScore": 0-100
  },
  "needsRevision": true/false,
  "revisedContent": "..." (only if needsRevision is true)
}`;

    try {
      const response = await this.llmService.complete({
        prompt, temperature: 0.2, maxTokens: 4000,
      });
      const parsed = JSON.parse(response.text);
      return {
        revised: parsed.needsRevision === true,
        content: parsed.revisedContent,
        quality: parsed.quality,
      };
    } catch {
      return {
        revised: false,
        quality: {
          readabilityScore: 70,
          seoScore: 60,
          overallScore: 65,
        },
      };
    }
  }

  protected async format(dto: CreateContentDto, artifact: ContentArtifact): Promise<ContentArtifact['deliverables']> {
    // Default: markdown + HTML
    const deliverables: ContentArtifact['deliverables'] = [
      {
        format: 'markdown',
        content: artifact.content,
        sizeBytes: artifact.content?.length || 0,
      },
    ];

    // Convert to HTML
    const html = this.markdownToHtml(artifact.content || '');
    deliverables.push({
      format: 'html',
      content: html,
      sizeBytes: html.length,
    });

    return deliverables;
  }

  protected async optimizeSEO(dto: CreateContentDto, artifact: ContentArtifact): Promise<ContentArtifact['seo']> {
    const prompt = `Generate SEO metadata for this content.

TITLE: ${artifact.title}
TOPIC: ${dto.topic}
KEYWORDS: ${artifact.metadata.keywords.join(', ')}
FIRST 500 CHARS: ${artifact.content?.substring(0, 500)}

Respond in JSON:
{
  "metaTitle": "60 chars max",
  "metaDescription": "160 chars max",
  "ogTitle": "...",
  "ogDescription": "...",
  "schemaMarkup": {...}
}`;

    try {
      const response = await this.llmService.complete({
        prompt, temperature: 0.3, maxTokens: 600,
      });
      return JSON.parse(response.text);
    } catch {
      return {
        metaTitle: artifact.title.substring(0, 60),
        metaDescription: artifact.content?.substring(0, 160),
      };
    }
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  protected async writeSection(section: any, dto: CreateContentDto, research: any, artifact: ContentArtifact): Promise<string> {
    const prompt = `Write a section for a ${dto.type}.
Topic: ${dto.topic}
Section: ${section.heading}
Subsections: ${JSON.stringify(section.subsections || [])}
Key points: ${JSON.stringify(section.keyPoints || [])}
Target words: ${section.estimatedWords || 300}
Tone: ${artifact.metadata.tone}
Audience: ${artifact.metadata.audienceLevel}
Language: ${artifact.metadata.language}

Research context:
${JSON.stringify(research).substring(0, 1500)}

Write the section content in Markdown. No headers (they will be added). Just paragraphs and lists.`;

    const response = await this.llmService.complete({
      prompt, temperature: 0.6, maxTokens: Math.min(2000, (section.estimatedWords || 300) * 5),
    });
    return response.text;
  }

  protected async writeIntroduction(outline: any, dto: CreateContentDto, _research: any, artifact: ContentArtifact): Promise<string> {
    const prompt = `Write an engaging introduction (150-250 words) for a ${dto.type} titled "${outline.title}".
Topic: ${dto.topic}
Tone: ${artifact.metadata.tone}
Language: ${artifact.metadata.language}

The introduction should hook the reader and present the structure.`;
    const response = await this.llmService.complete({
      prompt, temperature: 0.6, maxTokens: 500,
    });
    return `## Introduction\n\n${response.text}`;
  }

  protected async writeConclusion(outline: any, dto: CreateContentDto, _research: any, artifact: ContentArtifact): Promise<string> {
    const prompt = `Write a conclusion (150-250 words) for a ${dto.type} titled "${outline.title}".
Topic: ${dto.topic}
Tone: ${artifact.metadata.tone}
Language: ${artifact.metadata.language}

Summarize key takeaways and provide a call-to-action.`;
    const response = await this.llmService.complete({
      prompt, temperature: 0.6, maxTokens: 500,
    });
    return `## Conclusion\n\n${response.text}`;
  }

  protected defaultWordCount(type: ContentType): number {
    const defaults: Record<ContentType, number> = {
      [ContentType.ARTICLE]: 1500,
      [ContentType.BLOG_POST]: 1000,
      [ContentType.EBOOK]: 15000,
      [ContentType.COURSE]: 20000,
      [ContentType.SYLLABUS]: 3000,
      [ContentType.EXAM]: 2000,
      [ContentType.CORRECTION]: 3000,
      [ContentType.SLIDES]: 2000,
      [ContentType.INFOGRAPHIC]: 800,
      [ContentType.PDF_REPORT]: 5000,
      [ContentType.WHITE_PAPER]: 10000,
      [ContentType.NEWSLETTER]: 800,
      [ContentType.PRESS_RELEASE]: 600,
      [ContentType.TRANSCRIPT]: 5000,
      [ContentType.SUBTITLES]: 3000,
      [ContentType.TRANSLATION]: 0,  // depends on source
      [ContentType.SEO_META]: 200,
      [ContentType.SOCIAL_POST]: 300,
    };
    return defaults[type] || 1500;
  }

  protected isSEOOptimizable(type: ContentType): boolean {
    return [
      ContentType.ARTICLE, ContentType.BLOG_POST, ContentType.EBOOK,
      ContentType.WHITE_PAPER, ContentType.PRESS_RELEASE, ContentType.SOCIAL_POST,
    ].includes(type);
  }

  protected markdownToHtml(md: string): string {
    // Simplified markdown → HTML conversion
    // Production would use 'marked' library
    let html = md
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.+<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
    return `<!DOCTYPE html><html><body>${html}</body></html>`;
  }

  protected estimateCost(artifact: ContentArtifact): number {
    // Rough LLM cost estimation
    const tokensIn = Math.ceil((artifact.content?.length || 0) / 4);
    const tokensOut = tokensIn; // assume 1:1
    return (tokensIn * 0.00001) + (tokensOut * 0.00003); // GPT-4 pricing approximation
  }

  protected async persist(artifact: ContentArtifact): Promise<void> {
    await this.redis.set(`content:${artifact.id}`, JSON.stringify(artifact), 'EX', 86400 * 90);
    await this.redis.lpush('content:recent', JSON.stringify({
      id: artifact.id, type: artifact.type, title: artifact.title,
      status: artifact.status, wordCount: artifact.metadata.wordCount,
      quality: artifact.quality?.overallScore, createdAt: artifact.createdAt,
    }));
    await this.redis.ltrim('content:recent', 0, 99);
  }

  async getRecent(limit = 20): Promise<any[]> {
    return (await this.redis.lrange('content:recent', 0, limit - 1)).map((e) => JSON.parse(e));
  }
}
