/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 *
 * File: backend/src/modules/content-factory/content-factory.module.ts
 */
import { Module } from '@nestjs/common';
import { LLMModule } from '../llm/llm.module';
import { RedisModule } from '../redis/redis.module';
import { ContentController } from './controllers/content.controller';
// 18 agents
import { ArticleWriterAgent } from './agents/text/article-writer.agent';
import { BlogWriterAgent } from './agents/text/blog-writer.agent';
import { EbookWriterAgent } from './agents/text/ebook-writer.agent';
import { NewsletterWriterAgent } from './agents/text/newsletter-writer.agent';
import { PressReleaseWriterAgent } from './agents/text/press-release-writer.agent';
import { TranscriptWriterAgent } from './agents/text/transcript-writer.agent';
import { TranslationWriterAgent } from './agents/text/translation-writer.agent';
import { CourseWriterAgent } from './agents/education/course-writer.agent';
import { SyllabusBuilderAgent } from './agents/education/syllabus-builder.agent';
import { ExamBuilderAgent } from './agents/education/exam-builder.agent';
import { CorrectionBuilderAgent } from './agents/education/correction-builder.agent';
import { SEOMetaWriterAgent } from './agents/education/seo-meta-writer.agent';
import { SlideBuilderAgent } from './agents/visual/slide-builder.agent';
import { InfographicBuilderAgent } from './agents/visual/infographic-builder.agent';
import { PDFBuilderAgent } from './agents/visual/pdf-builder.agent';
import { WhitePaperWriterAgent } from './agents/visual/white-paper-writer.agent';
import { SubtitleWriterAgent } from './agents/media/subtitle-writer.agent';
import { SocialPostWriterAgent } from './agents/media/social-post-writer.agent';

@Module({
  imports: [LLMModule, RedisModule],
  controllers: [ContentController],
  providers: [
    ArticleWriterAgent, BlogWriterAgent, EbookWriterAgent,
    NewsletterWriterAgent, PressReleaseWriterAgent, TranscriptWriterAgent,
    TranslationWriterAgent, CourseWriterAgent, SyllabusBuilderAgent,
    ExamBuilderAgent, CorrectionBuilderAgent, SEOMetaWriterAgent,
    SlideBuilderAgent, InfographicBuilderAgent, PDFBuilderAgent,
    WhitePaperWriterAgent, SubtitleWriterAgent, SocialPostWriterAgent,
  ],
  exports: [
    ArticleWriterAgent, CourseWriterAgent, SlideBuilderAgent, PDFBuilderAgent,
  ],
})
export class ContentFactoryModule {}
