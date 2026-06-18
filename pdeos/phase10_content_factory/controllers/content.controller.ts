/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 *
 * File: backend/src/modules/content-factory/controllers/content.controller.ts
 */
import {
  Controller, Post, Get, Body, Param, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { ArticleWriterAgent } from '../agents/text/article-writer.agent';
import { BlogWriterAgent } from '../agents/text/blog-writer.agent';
import { EbookWriterAgent } from '../agents/text/ebook-writer.agent';
import { NewsletterWriterAgent } from '../agents/text/newsletter-writer.agent';
import { PressReleaseWriterAgent } from '../agents/text/press-release-writer.agent';
import { TranscriptWriterAgent } from '../agents/text/transcript-writer.agent';
import { TranslationWriterAgent } from '../agents/text/translation-writer.agent';
import { CourseWriterAgent } from '../agents/education/course-writer.agent';
import { SyllabusBuilderAgent } from '../agents/education/syllabus-builder.agent';
import { ExamBuilderAgent } from '../agents/education/exam-builder.agent';
import { CorrectionBuilderAgent } from '../agents/education/correction-builder.agent';
import { SEOMetaWriterAgent } from '../agents/education/seo-meta-writer.agent';
import { SlideBuilderAgent } from '../agents/visual/slide-builder.agent';
import { InfographicBuilderAgent } from '../agents/visual/infographic-builder.agent';
import { PDFBuilderAgent } from '../agents/visual/pdf-builder.agent';
import { WhitePaperWriterAgent } from '../agents/visual/white-paper-writer.agent';
import { SubtitleWriterAgent } from '../agents/media/subtitle-writer.agent';
import { SocialPostWriterAgent } from '../agents/media/social-post-writer.agent';
import { BaseContentAgent } from '../agents/base-content.agent';
import { CreateContentDto, ContentType } from '../dto/content.dto';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../modules/user/entities/user.entity';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Controller('api/v1/content')
export class ContentController {
  private readonly agentMap: Map<ContentType, BaseContentAgent>;

  constructor(
    private readonly article: ArticleWriterAgent,
    private readonly blog: BlogWriterAgent,
    private readonly ebook: EbookWriterAgent,
    private readonly newsletter: NewsletterWriterAgent,
    private readonly press: PressReleaseWriterAgent,
    private readonly transcript: TranscriptWriterAgent,
    private readonly translation: TranslationWriterAgent,
    private readonly course: CourseWriterAgent,
    private readonly syllabus: SyllabusBuilderAgent,
    private readonly exam: ExamBuilderAgent,
    private readonly correction: CorrectionBuilderAgent,
    private readonly seo: SEOMetaWriterAgent,
    private readonly slides: SlideBuilderAgent,
    private readonly infographic: InfographicBuilderAgent,
    private readonly pdf: PDFBuilderAgent,
    private readonly whitePaper: WhitePaperWriterAgent,
    private readonly subtitles: SubtitleWriterAgent,
    private readonly social: SocialPostWriterAgent,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {
    this.agentMap = new Map([
      [ContentType.ARTICLE, this.article],
      [ContentType.BLOG_POST, this.blog],
      [ContentType.EBOOK, this.ebook],
      [ContentType.NEWSLETTER, this.newsletter],
      [ContentType.PRESS_RELEASE, this.press],
      [ContentType.TRANSCRIPT, this.transcript],
      [ContentType.TRANSLATION, this.translation],
      [ContentType.COURSE, this.course],
      [ContentType.SYLLABUS, this.syllabus],
      [ContentType.EXAM, this.exam],
      [ContentType.CORRECTION, this.correction],
      [ContentType.SEO_META, this.seo],
      [ContentType.SLIDES, this.slides],
      [ContentType.INFOGRAPHIC, this.infographic],
      [ContentType.PDF_REPORT, this.pdf],
      [ContentType.WHITE_PAPER, this.whitePaper],
      [ContentType.SUBTITLES, this.subtitles],
      [ContentType.SOCIAL_POST, this.social],
    ]);
  }

  @Post('generate')
  @Roles(UserRole.OPERATOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async generate(@Body() dto: CreateContentDto) {
    const agent = this.agentMap.get(dto.type);
    if (!agent) {
      return { success: false, error: `Unknown content type: ${dto.type}` };
    }
    const artifact = await agent.execute(dto);
    return { success: true, data: artifact };
  }

  @Get('recent')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async recent(@Query('limit') limit = 20) {
    const entries = await this.redis.lrange('content:recent', 0, +limit - 1);
    return { success: true, data: entries.map((e) => JSON.parse(e)) };
  }

  @Get(':id')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async get(@Param('id') id: string) {
    const raw = await this.redis.get(`content:${id}`);
    return { success: true, data: raw ? JSON.parse(raw) : null };
  }

  @Get('health')
  @Public()
  @HttpCode(HttpStatus.OK)
  async health() {
    return {
      success: true,
      data: {
        status: 'ok',
        service: 'content-factory',
        version: '1.0.0',
        agentsCount: this.agentMap.size,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
