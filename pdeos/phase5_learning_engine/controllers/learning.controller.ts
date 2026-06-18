/**
 * AENEWS Agent OS X → PDEOS — Phase 5
 *
 * File: backend/src/modules/learning-engine/controllers/learning.controller.ts
 */
import {
  Controller, Get, Post, Param, HttpCode, HttpStatus, Query, Body,
} from '@nestjs/common';
import { LearningEngine } from '../services/learning-engine.service';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../modules/user/entities/user.entity';

@Controller('api/v1/learning')
export class LearningController {
  constructor(private readonly engine: LearningEngine) {}

  @Get('stats')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async stats() {
    return { success: true, data: await this.engine.getStats() };
  }

  @Get('patterns')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async patterns(@Query('limit') limit = 20) {
    return { success: true, data: await this.engine.getRecentPatterns(+limit) };
  }

  @Get('suggestions')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async suggestions(@Query('limit') limit = 20) {
    return { success: true, data: await this.engine.getRecentSuggestions(+limit) };
  }

  @Post('suggestions/:id/approve')
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async approveSuggestion(@Param('id') id: string) {
    const approved = await this.engine.approveSuggestion(id);
    return { success: approved, data: { approved } };
  }

  @Post('feedback')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async recordFeedback(@Body() body: {
    userId: string;
    targetType: 'mission' | 'agent' | 'content' | 'system';
    targetId: string;
    feedback: 'positive' | 'negative' | 'neutral';
    rating: number;
    comment?: string;
  }) {
    await this.engine.recordFeedback({ ...body, implicit: false });
    return { success: true };
  }

  @Post('optimize-prompt/:agentName')
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async optimizePrompt(@Param('agentName') agentName: string) {
    const result = await this.engine.suggestPromptOptimization(agentName);
    return { success: true, data: result };
  }

  @Get('strategy/:agentName')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async getStrategy(@Param('agentName') agentName: string) {
    return { success: true, data: await this.engine.getAdaptiveStrategy(agentName) };
  }

  @Post('experiences/similar')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async findSimilar(@Body() body: { agentName?: string; inputDescription: string; limit?: number }) {
    return { success: true, data: await this.engine.findSimilarExperiences(body) };
  }

  @Get('health')
  @Public()
  @HttpCode(HttpStatus.OK)
  async health() {
    return {
      success: true,
      data: { status: 'ok', service: 'learning-engine', version: '1.0.0' },
    };
  }
}
