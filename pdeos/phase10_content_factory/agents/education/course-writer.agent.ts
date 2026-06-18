/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 * File: backend/src/modules/content-factory/agents/education/course-writer.agent.ts
 *
 * Génération cours complets : syllabus, lessons, quizzes, exercises
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';
import { BaseContentAgent, ContentType } from '../base-content.agent';

@Injectable()
export class CourseWriterAgent extends BaseContentAgent {
  protected readonly supportedType = ContentType.COURSE;

  constructor(llmService: LLMService, @Inject('REDIS_CLIENT') redis: Redis) {
    super(llmService, redis);
  }

protected defaultWordCount(): number { return 20000; }
  protected async draft(dto: any, outline: any, research: any, artifact: any): Promise<string> {
    let content = `# ${outline.title}\n\n## Course Overview\n\n${dto.topic}\n\n`;
    for (let i = 0; i < (outline.sections || []).length; i++) {
      const lesson = outline.sections[i];
      content += `\n---\n\n## Lesson ${i + 1}: ${lesson.heading}\n\n`;
      const lessonContent = await this.writeSection(lesson, dto, research, artifact);
      content += `### Content\n\n${lessonContent}\n\n`;
    }
    return content;
  }
}
