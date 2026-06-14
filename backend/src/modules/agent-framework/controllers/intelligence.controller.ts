/**
 * AENEWS Agent OS X — Intelligence Controller
 *
 * Phase 9 — REST API endpoints for the Adaptive Intelligence & Knowledge System.
 *
 * SECURITY: All @Body() params use proper DTOs with class-validator decorators.
 * NestJS ValidationPipe only validates class instances, not inline types.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../user/entities/user.entity';
import { TenantScoped } from '../../tenant/decorators/tenant-scoped.decorator';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { RateLimit, RateLimitDomain } from '../decorators/rate-limit.decorator';
import { KnowledgeGraphService, ClusterType } from '../services/knowledge-graph.service';
import { AgentLearningEngine, LearningType } from '../services/agent-learning-engine.service';
import { PatternMiningService, PatternCategory } from '../services/pattern-mining.service';
import { AdaptiveStrategyService, AdaptationContext } from '../services/adaptive-strategy.service';
import { ExperienceReplayService } from '../services/experience-replay.service';
import { FeedbackAggregationService } from '../services/feedback-aggregation.service';
import {
  GraphQueryDto,
  LearningFeedbackDto,
  TransferLearningDto,
  MinePatternsDto,
  PredictOutcomeDto,
  AdaptiveParametersDto,
  PinParameterDto,
  RecordExperienceDto,
  WhatIfDto,
  FindSimilarDto,
  SubmitFeedbackDto,
  FeedbackTrendsDto,
} from '../dto/intelligence.dto';

// ─── Controller ───────────────────────────────────────────────────

@Controller('intelligence')
@ApiTags('Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR)
@TenantScoped()
export class IntelligenceController {
  constructor(
    private readonly knowledgeGraph: KnowledgeGraphService,
    private readonly learningEngine: AgentLearningEngine,
    private readonly patternMining: PatternMiningService,
    private readonly adaptiveStrategy: AdaptiveStrategyService,
    private readonly experienceReplay: ExperienceReplayService,
    private readonly feedbackAggregation: FeedbackAggregationService,
  ) {}

  // ─── Knowledge Graph ──────────────────────────────────────────

  @Get('graph/stats')
  async getGraphStats() {
    return {
      success: true,
      data: await this.knowledgeGraph.getGraphStatistics(),
    };
  }

  @Get('graph/agents/:id')
  async getAgentKnowledge(@Param('id') id: string) {
    const knowledge = await this.knowledgeGraph.getAgentKnowledge(id);
    return {
      success: !!knowledge,
      data: knowledge,
    };
  }

  @Get('graph/expertise')
  async getExpertiseRanking(
    @Query('cluster') cluster?: ClusterType,
    @Query('limit') limit?: string,
  ) {
    return {
      success: true,
      data: await this.knowledgeGraph.getExpertiseRanking(
        cluster,
        limit ? parseInt(limit, 10) : 20,
      ),
    };
  }

  @Get('graph/recommendations')
  async getStrategyRecommendations(
    @Query('cluster') cluster?: ClusterType,
    @Query('capabilities') capabilities?: string,
  ) {
    return {
      success: true,
      data: await this.knowledgeGraph.getStrategyRecommendations({
        cluster,
        capabilities: capabilities ? capabilities.split(',') : undefined,
      }),
    };
  }

  @Post('graph/query')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN)
  @RateLimitDomain('llm')
  @RateLimit({ points: 5, duration: 60, blockDuration: 120 })
  async executeGraphQuery(@Body() dto: GraphQueryDto) {
    // SECURITY: Validate the Cypher query to prevent injection attacks
    this.validateCypherQuery(dto.query);

    return {
      success: true,
      data: await this.knowledgeGraph.executeQuery(dto.query, dto.params),
    };
  }

  /**
   * Validates a Cypher query against a dangerous-operation allowlist.
   * Only read-only queries (MATCH, RETURN, WHERE, ORDER BY, LIMIT, SKIP, WITH, DISTINCT, OPTIONAL MATCH)
   * are permitted. Any write or destructive operation is blocked.
   */
  private validateCypherQuery(query: string): void {
    const upperQuery = query.toUpperCase().trim();

    // Block dangerous Cypher operations
    const dangerousPatterns = [
      /\bDELETE\b/i,
      /\bDETACH\s+DELETE\b/i,
      /\bCREATE\b/i,
      /\bMERGE\b/i,
      /\bSET\b/i,
      /\bREMOVE\b/i,
      /\bDROP\b/i,
      /\bCALL\b/i,
      /\bFOREACH\b/i,
      /\bLOAD\s+CSV\b/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new ForbiddenException(
          `Cypher query contains forbidden operation: ${pattern.source}. Only read-only queries (MATCH, RETURN, WHERE, LIMIT) are allowed.`,
        );
      }
    }

    // Ensure the query starts with a safe keyword
    const safeStartPatterns = [/^\s*MATCH\b/i, /^\s*OPTIONAL\s+MATCH\b/i, /^\s*WITH\b/i, /^\s*RETURN\b/i];
    const startsSafely = safeStartPatterns.some((p) => p.test(query));
    if (!startsSafely) {
      throw new ForbiddenException(
        'Cypher query must start with a read-only keyword (MATCH, OPTIONAL MATCH, WITH, RETURN).',
      );
    }

    // Enforce a maximum query length to prevent abuse
    const MAX_QUERY_LENGTH = 2000;
    if (query.length > MAX_QUERY_LENGTH) {
      throw new ForbiddenException(
        `Cypher query exceeds maximum allowed length of ${MAX_QUERY_LENGTH} characters.`,
      );
    }
  }

  // ─── Learning Engine ──────────────────────────────────────────

  @Post('learning/feedback')
  @HttpCode(HttpStatus.OK)
  async submitLearningFeedback(@Body() dto: LearningFeedbackDto) {
    const insights = await this.learningEngine.processFeedback({
      agentId: dto.agentId,
      missionId: dto.missionId,
      outcome: dto.outcome,
      durationMs: dto.durationMs,
      score: dto.score,
      strategyUsed: dto.strategyUsed,
      capabilitiesUsed: dto.capabilitiesUsed,
      context: dto.context,
      errorType: dto.errorType,
    });

    return {
      success: true,
      data: {
        insightsGenerated: insights.length,
        insights: insights.map((i) => ({
          id: i.id,
          type: i.type,
          description: i.description,
          confidence: i.confidence,
          suggestedActions: i.suggestedActions,
        })),
      },
    };
  }

  @Get('learning/strategy/:agentId')
  getBestStrategy(@Param('agentId') agentId: string, @Query('context') contextStr?: string) {
    const context = contextStr ? JSON.parse(contextStr) : {};
    const result = this.learningEngine.getBestStrategy(agentId, context);
    return { success: true, data: result };
  }

  @Get('learning/predict/:agentId')
  predictFailure(@Param('agentId') agentId: string, @Query('context') contextStr?: string) {
    const context = contextStr ? JSON.parse(contextStr) : {};
    return {
      success: true,
      data: this.learningEngine.predictFailure(agentId, context),
    };
  }

  @Post('learning/transfer')
  @HttpCode(HttpStatus.OK)
  async transferLearning(@Body() dto: TransferLearningDto) {
    const result = await this.learningEngine.transferLearning(
      dto.sourceAgentId,
      dto.targetAgentId,
    );
    return { success: true, data: result };
  }

  @Get('learning/insights')
  getLearningInsights(
    @Query('type') type?: LearningType,
    @Query('minConfidence') minConfidence?: string,
  ) {
    return {
      success: true,
      data: this.learningEngine.getInsights(
        type,
        minConfidence ? parseFloat(minConfidence) : 0.3,
      ),
    };
  }

  @Get('learning/profile/:agentId')
  getLearningProfile(@Param('agentId') agentId: string) {
    const profile = this.learningEngine.getProfile(agentId);
    return { success: !!profile, data: profile };
  }

  @Get('learning/stats')
  getLearningStats() {
    return {
      success: true,
      data: this.learningEngine.getStatistics(),
    };
  }

  // ─── Pattern Mining ───────────────────────────────────────────

  @Post('patterns/mine')
  @HttpCode(HttpStatus.OK)
  async minePatterns(@Body() dto: MinePatternsDto) {
    const patterns = await this.patternMining.minePatterns({
      categories: dto.categories,
      minFrequency: dto.minFrequency,
      minConfidence: dto.minConfidence,
      maxPatterns: dto.maxPatterns,
      cluster: dto.cluster,
    });

    return {
      success: true,
      data: {
        patternCount: patterns.length,
        patterns: patterns.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          frequency: p.frequency,
          confidence: p.confidence,
          impact: p.impact,
          impactScore: p.impactScore,
          suggestedActions: p.suggestedActions,
        })),
      },
    };
  }

  @Get('patterns')
  getPatterns(
    @Query('category') category?: PatternCategory,
    @Query('minConfidence') minConfidence?: string,
  ) {
    return {
      success: true,
      data: this.patternMining.getPatterns(
        category,
        minConfidence ? parseFloat(minConfidence) : 0.3,
      ),
    };
  }

  @Post('patterns/predict')
  @HttpCode(HttpStatus.OK)
  predictOutcome(@Body() dto: PredictOutcomeDto) {
    return {
      success: true,
      data: this.patternMining.predictOutcome(dto),
    };
  }

  @Get('patterns/correlations')
  getCorrelations() {
    return {
      success: true,
      data: this.patternMining.analyzeCorrelations(),
    };
  }

  @Get('patterns/stats')
  getPatternStats() {
    return {
      success: true,
      data: this.patternMining.getStatistics(),
    };
  }

  // ─── Adaptive Strategy ────────────────────────────────────────

  @Get('adaptive/config')
  getAdaptiveConfig() {
    const config = this.adaptiveStrategy.getConfiguration();
    // Convert Map to plain object for JSON serialization
    return {
      success: true,
      data: {
        ...config,
        strategyPreferences: Object.fromEntries(config.strategyPreferences),
        pinned: [...config.pinned],
      },
    };
  }

  @Post('adaptive/parameters')
  @HttpCode(HttpStatus.OK)
  async getAdaptiveParameters(@Body() dto: AdaptiveParametersDto) {
    return {
      success: true,
      data: await this.adaptiveStrategy.getAdaptiveParameters(dto),
    };
  }

  @Post('adaptive/adapt')
  @HttpCode(HttpStatus.OK)
  async runAdaptation() {
    const adaptations = await this.adaptiveStrategy.adapt();
    return {
      success: true,
      data: {
        adaptationCount: adaptations.length,
        applied: adaptations.filter((a) => a.applied).length,
        adaptations: adaptations.map((a) => ({
          id: a.id,
          parameterName: a.parameterName,
          previousValue: a.previousValue,
          newValue: a.newValue,
          reason: a.reason,
          confidence: a.confidence,
          source: a.source,
          applied: a.applied,
        })),
      },
    };
  }

  @Post('adaptive/pin/:param')
  @HttpCode(HttpStatus.OK)
  pinParameter(@Param('param') param: string, @Body() _dto: PinParameterDto) {
    this.adaptiveStrategy.pinParameter(param);
    return { success: true, data: { parameter: param, pinned: true } };
  }

  @Delete('adaptive/pin/:param')
  unpinParameter(@Param('param') param: string) {
    this.adaptiveStrategy.unpinParameter(param);
    return { success: true, data: { parameter: param, pinned: false } };
  }

  @Post('adaptive/reset')
  @HttpCode(HttpStatus.OK)
  emergencyReset() {
    this.adaptiveStrategy.emergencyReset();
    return { success: true, data: { message: 'All adaptations reset to defaults' } };
  }

  @Get('adaptive/history')
  getAdaptationHistory(@Query('limit') limit?: string) {
    return {
      success: true,
      data: this.adaptiveStrategy.getAdaptationHistory(
        limit ? parseInt(limit, 10) : 20,
      ),
    };
  }

  @Get('adaptive/stats')
  getAdaptiveStats() {
    return {
      success: true,
      data: this.adaptiveStrategy.getStatistics(),
    };
  }

  // ─── Experience Replay ────────────────────────────────────────

  @Post('experience/record')
  @HttpCode(HttpStatus.OK)
  async recordExperience(@Body() dto: RecordExperienceDto) {
    const experience = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      missionId: dto.missionId,
      recordedAt: Date.now(),
      context: dto.context,
      trace: [], // Steps would be added separately or derived
      strategy: dto.strategy,
      outcome: dto.outcome,
      metadata: dto.metadata,
    };

    await this.experienceReplay.recordExperience(experience as any);
    return { success: true, data: { experienceId: experience.id } };
  }

  @Post('experience/replay/:id')
  @HttpCode(HttpStatus.OK)
  async replayExperience(@Param('id') id: string) {
    const analysis = await this.experienceReplay.replayExperience(id);
    return { success: !!analysis, data: analysis };
  }

  @Post('experience/what-if')
  @HttpCode(HttpStatus.OK)
  async whatIf(@Body() dto: WhatIfDto) {
    const result = await this.experienceReplay.whatIf(
      dto.experienceId,
      dto.modifiedStrategy,
      dto.modifications,
    );
    return { success: !!result, data: result };
  }

  @Get('experience/similar')
  findSimilarExperiences(@Query() query: FindSimilarDto) {
    const experiences = this.experienceReplay.findSimilarExperiences({
      cluster: query.cluster,
      capabilities: query.capabilities,
      priority: query.priority,
      outcome: query.outcome,
    }, query.limit);

    return {
      success: true,
      data: {
        count: experiences.length,
        experiences: experiences.map((e) => ({
          id: e.id,
          missionId: e.missionId,
          cluster: e.context.cluster,
          strategy: e.strategy.name,
          success: e.outcome.success,
          durationMs: e.outcome.durationMs,
          score: e.outcome.score,
        })),
      },
    };
  }

  @Get('experience/stats')
  getExperienceStats() {
    return {
      success: true,
      data: this.experienceReplay.getStatistics(),
    };
  }

  // ─── Feedback ──────────────────────────────────────────────────

  @Post('feedback')
  @HttpCode(HttpStatus.OK)
  async submitFeedback(@Body() dto: SubmitFeedbackDto) {
    await this.feedbackAggregation.submitFeedback({
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      source: dto.source,
      missionId: dto.missionId,
      agentId: dto.agentId,
      cluster: dto.cluster,
      timestamp: Date.now(),
      rating: dto.rating,
      score: dto.score,
      success: dto.success,
      durationMs: dto.durationMs,
      comment: dto.comment,
      tags: dto.tags,
      context: dto.context,
    });

    return { success: true, data: { message: 'Feedback recorded' } };
  }

  @Post('feedback/bulk')
  @HttpCode(HttpStatus.OK)
  async submitBulkFeedback(@Body() dtos: SubmitFeedbackDto[]) {
    const entries = dtos.map((dto) => ({
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      source: dto.source,
      missionId: dto.missionId,
      agentId: dto.agentId,
      cluster: dto.cluster,
      timestamp: Date.now(),
      rating: dto.rating,
      score: dto.score,
      success: dto.success,
      durationMs: dto.durationMs,
      comment: dto.comment,
      tags: dto.tags,
      context: dto.context,
    }));

    await this.feedbackAggregation.submitBulk(entries);
    return { success: true, data: { count: entries.length } };
  }

  @Get('feedback/mission/:id')
  getMissionFeedback(@Param('id') id: string) {
    const feedback = this.feedbackAggregation.getAggregatedFeedback(id);
    return { success: !!feedback, data: feedback };
  }

  @Get('feedback/summary')
  getFeedbackSummary(@Query('cluster') cluster?: ClusterType) {
    return {
      success: true,
      data: this.feedbackAggregation.getSummary(cluster),
    };
  }

  @Get('feedback/trends')
  getFeedbackTrends(@Query() dto: FeedbackTrendsDto) {
    return {
      success: true,
      data: this.feedbackAggregation.getTrends(dto.metric || 'overall', dto.period || '24h'),
    };
  }

  @Get('feedback/actions')
  getFeedbackActions(
    @Query('priority') priority?: 'low' | 'medium' | 'high' | 'critical',
    @Query('limit') limit?: string,
  ) {
    return {
      success: true,
      data: this.feedbackAggregation.getActionItems(
        priority,
        limit ? parseInt(limit, 10) : 20,
      ),
    };
  }

  @Get('feedback/stats')
  getFeedbackStats() {
    return {
      success: true,
      data: this.feedbackAggregation.getStatistics(),
    };
  }
}
