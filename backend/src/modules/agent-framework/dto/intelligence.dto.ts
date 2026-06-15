/**
 * AENEWS Agent OS X — Intelligence Controller DTOs
 *
 * Proper DTOs with class-validator decorators for all intelligence controller endpoints.
 * Replaces the inline class definitions that lacked validation decorators.
 */

import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  IsIn,
  IsNotEmpty,
  MaxLength,
  Min,
  Max,
  ValidateNested,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClusterType } from '../../agent/entities/agent.entity';
import { LearningType } from '../services/agent-learning-engine.service';
import { PatternCategory } from '../services/pattern-mining.service';

// ═══════════════════════════════════════════════════════════
//  Knowledge Graph DTOs
// ═══════════════════════════════════════════════════════════

export class GraphQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  query: string;

  @IsOptional()
  @IsObject()
  params?: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════
//  Learning Engine DTOs
// ═══════════════════════════════════════════════════════════

export class LearningFeedbackDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  agentId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  missionId: string;

  @IsIn(['success', 'failure', 'partial'])
  outcome: 'success' | 'failure' | 'partial';

  @IsNumber()
  @Min(0)
  @Max(86400000)
  durationMs: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  strategyUsed?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  capabilitiesUsed?: string[];

  @IsObject()
  context: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  errorType?: string;
}

export class TransferLearningDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  sourceAgentId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  targetAgentId: string;
}

// ═══════════════════════════════════════════════════════════
//  Pattern Mining DTOs
// ═══════════════════════════════════════════════════════════

export class MinePatternsDto {
  @IsOptional()
  @IsArray()
  @IsIn([
    'success_sequence',
    'failure_sequence',
    'optimization',
    'anti_pattern',
    'collaboration_effective',
    'collaboration_ineffective',
  ], { each: true })
  categories?: PatternCategory[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  minFrequency?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minConfidence?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxPatterns?: number;

  @IsOptional()
  @IsEnum(ClusterType)
  cluster?: ClusterType;
}

export class PredictOutcomeDto {
  @IsEnum(ClusterType)
  cluster: ClusterType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  strategy: string;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  agents: string[];

  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  capabilities: string[];

  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  steps: string[];
}

// ═══════════════════════════════════════════════════════════
//  Adaptive Strategy DTOs
// ═══════════════════════════════════════════════════════════

export class AdaptiveParametersDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  missionId: string;

  @IsOptional()
  @IsEnum(ClusterType)
  cluster?: ClusterType;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  capabilities?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  agentCount?: number;

  @IsOptional()
  @IsIn(['success', 'failure', 'partial'])
  historicalOutcome?: 'success' | 'failure' | 'partial';
}

export class PinParameterDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

// ═══════════════════════════════════════════════════════════
//  Experience Replay DTOs
// ═══════════════════════════════════════════════════════════

export class ExperienceContextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @IsEnum(ClusterType)
  cluster: ClusterType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  priority: string;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  objectives: string[];

  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  requiredCapabilities: string[];

  @IsObject()
  constraints: Record<string, any>;
}

export class AgentAssignmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  agentId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  role: string;
}

export class ExperienceStrategyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name: string;

  @IsObject()
  parameters: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentAssignmentDto)
  agentAssignments: AgentAssignmentDto[];
}

export class ExperienceOutcomeDto {
  @IsBoolean()
  success: boolean;

  @IsNumber()
  @Min(0)
  @Max(86400000)
  durationMs: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  errorType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  errorMessage?: string;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(256, { each: true })
  artifacts: string[];
}

export class ExperienceMetadataDto {
  @IsNumber()
  @Min(0)
  @Max(1000)
  agentCount: number;

  @IsNumber()
  @Min(0)
  @Max(10000)
  stepCount: number;

  @IsNumber()
  @Min(0)
  @Max(1000)
  retryCount: number;

  @IsNumber()
  @Min(0)
  @Max(1000)
  circuitBreakerTrips: number;

  @IsNumber()
  @Min(0)
  @Max(100000)
  llmCalls: number;

  @IsNumber()
  @Min(0)
  @Max(10000)
  estimatedCostUsd: number;
}

export class RecordExperienceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  missionId: string;

  @ValidateNested()
  @Type(() => ExperienceContextDto)
  context: ExperienceContextDto;

  @ValidateNested()
  @Type(() => ExperienceStrategyDto)
  strategy: ExperienceStrategyDto;

  @ValidateNested()
  @Type(() => ExperienceOutcomeDto)
  outcome: ExperienceOutcomeDto;

  @ValidateNested()
  @Type(() => ExperienceMetadataDto)
  metadata: ExperienceMetadataDto;
}

export class WhatIfDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  experienceId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  modifiedStrategy: string;

  @IsObject()
  modifications: Record<string, any>;
}

export class FindSimilarDto {
  @IsOptional()
  @IsEnum(ClusterType)
  cluster?: ClusterType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  capabilities?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(32)
  priority?: string;

  @IsOptional()
  @IsIn(['success', 'failure'])
  outcome?: 'success' | 'failure';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ═══════════════════════════════════════════════════════════
//  Feedback DTOs
// ═══════════════════════════════════════════════════════════

export class SubmitFeedbackDto {
  @IsIn(['user', 'system', 'agent_self', 'peer', 'outcome_verification'])
  source: 'user' | 'system' | 'agent_self' | 'peer' | 'outcome_verification';

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  missionId: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  agentId?: string;

  @IsOptional()
  @IsEnum(ClusterType)
  cluster?: ClusterType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(86400000)
  durationMs?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  tags?: string[];

  @IsObject()
  context: Record<string, any>;
}

export class FeedbackTrendsDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  metric?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  period?: string;
}
