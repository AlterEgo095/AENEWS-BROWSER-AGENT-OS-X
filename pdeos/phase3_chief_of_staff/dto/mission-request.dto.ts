/**
 * PDEOS Phase 3 — Chief Of Staff AI
 * File: backend/src/modules/chief-of-staff/dto/mission-request.dto.ts
 */
import { IsString, IsOptional, IsEnum, IsNumber, IsArray, Min, Max } from 'class-validator';

export enum MissionPriority { LOW = 'low', NORMAL = 'normal', HIGH = 'high', CRITICAL = 'critical' }
export enum MissionDepth { SIMPLE = 'simple', STANDARD = 'standard', DEEP = 'deep', VERY_DEEP = 'very_deep' }

export class MissionRequestDto {
  @IsString() prompt: string;
  @IsOptional() @IsEnum(MissionPriority) priority?: MissionPriority;
  @IsOptional() @IsEnum(MissionDepth) depth?: MissionDepth;
  @IsOptional() @IsNumber() @Min(60) @Max(86400) timeoutSeconds?: number;
  @IsOptional() @IsNumber() @Min(0.1) @Max(100) budgetUSD?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) constraints?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) objectives?: string[];
}

export interface MissionResult {
  missionId: string;
  status: 'success' | 'partial' | 'failed' | 'timeout';
  summary: string;
  deliverables: Array<{ type: string; name: string; location?: string; content?: string }>;
  metrics: {
    durationMs: number; costUSD: number; agentsInvolved: string[];
    subtasksExecuted: number; retries: number; fallbacks: number;
  };
  learningFeedback?: { qualityScore: number; improvementSuggestions: string[] };
  correlationId: string;
  timestamp: string;
}
