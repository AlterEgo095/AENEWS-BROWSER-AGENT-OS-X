/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 *
 * File: backend/src/modules/content-factory/dto/content.dto.ts
 *
 * DTOs pour Content Factory : Article, Blog, Course, Syllabus, Exam,
 * Slide, PDF, Ebook, Infographic, etc.
 */
import { IsString, IsEnum, IsOptional, IsArray, IsObject, IsNumber } from 'class-validator';

export enum ContentType {
  ARTICLE = 'article',
  BLOG_POST = 'blog_post',
  EBOOK = 'ebook',
  COURSE = 'course',
  SYLLABUS = 'syllabus',
  EXAM = 'exam',
  CORRECTION = 'correction',
  SLIDES = 'slides',
  INFOGRAPHIC = 'infographic',
  PDF_REPORT = 'pdf_report',
  WHITE_PAPER = 'white_paper',
  NEWSLETTER = 'newsletter',
  PRESS_RELEASE = 'press_release',
  TRANSCRIPT = 'transcript',
  SUBTITLES = 'subtitles',
  TRANSLATION = 'translation',
  SEO_META = 'seo_meta',
  SOCIAL_POST = 'social_post',
}

export enum ContentStatus {
  DRAFT = 'draft',
  RESEARCHING = 'researching',
  OUTLINING = 'outlining',
  WRITING = 'writing',
  REVIEWING = 'reviewing',
  READY = 'ready',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

export enum AudienceLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum Tone {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  ACADEMIC = 'academic',
  TECHNICAL = 'technical',
  NARRATIVE = 'narrative',
  PERSUASIVE = 'persuasive',
  EDUCATIONAL = 'educational',
}

export class CreateContentDto {
  @IsEnum(ContentType)
  type: ContentType;

  @IsString()
  topic: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(AudienceLevel)
  audienceLevel?: AudienceLevel;

  @IsOptional()
  @IsEnum(Tone)
  tone?: Tone;

  @IsOptional()
  @IsString()
  language?: string; // ISO code: fr, en, es, etc.

  @IsOptional()
  @IsNumber()
  wordCount?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  references?: string[];

  @IsOptional()
  @IsObject()
  structure?: any; // outline override

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  constraints?: string[];

  @IsOptional()
  @IsString()
  targetRepository?: string; // for SEO content + publish

  @IsOptional()
  @IsString()
  targetUrl?: string; // for blog/article publishing

  @IsOptional()
  @IsString()
  brandVoice?: string;
}

export interface ContentArtifact {
  id: string;
  type: ContentType;
  title: string;
  status: ContentStatus;
  outline?: any;
  content?: string;          // markdown
  html?: string;
  metadata: {
    wordCount: number;
    readingTime: number;     // minutes
    language: string;
    audienceLevel: AudienceLevel;
    tone: Tone;
    keywords: string[];
    references?: string[];
    images?: Array<{ url: string; alt: string; caption?: string }>;
  };
  deliverables: Array<{
    format: 'markdown' | 'html' | 'pdf' | 'pptx' | 'epub' | 'docx' | 'json';
    url?: string;
    content?: string;
    sizeBytes?: number;
  }>;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogTitle?: string;
    ogDescription?: string;
    canonicalUrl?: string;
    schemaMarkup?: any;
  };
  quality?: {
    readabilityScore: number;  // 0-100
    seoScore: number;
    plagiarismScore?: number;
    factCheckScore?: number;
    overallScore: number;
  };
  createdAt: Date;
  updatedAt: Date;
  generatedBy: string;        // agent name
  durationMs: number;
  costUSD: number;
}
