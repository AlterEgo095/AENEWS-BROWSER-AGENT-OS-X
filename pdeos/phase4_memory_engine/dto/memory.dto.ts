/**
 * PDEOS Phase 4 — Memory Engine DTOs
 */
import { IsString, IsEnum, IsOptional, IsObject, IsNumber, Min, Max } from 'class-validator';

export enum MemoryLevel { STM = 'stm', MTM = 'mtm', LTM = 'ltm' }
export enum MemoryType {
  MISSION = 'mission', HABIT = 'habit', PREFERENCE = 'preference',
  FAILURE = 'failure', SUCCESS = 'success', PROJECT = 'project',
  CONTEXT = 'context', KNOWLEDGE = 'knowledge',
}

export class RememberDto {
  @IsEnum(MemoryLevel) level: MemoryLevel;
  @IsString() key: string;
  @IsObject() value: any;
  @IsOptional() @IsEnum(MemoryType) type?: MemoryType;
  @IsOptional() @IsNumber() @Min(1) @Max(86400 * 365) ttlSeconds?: number;
  @IsOptional() @IsString() tenantId?: string;
  @IsOptional() @IsString() userId?: string;
}

export class RecallDto {
  @IsString() query: string;
  @IsOptional() @IsEnum(MemoryLevel) level?: MemoryLevel;
  @IsOptional() @IsNumber() @Min(1) @Max(100) limit?: number = 10;
  @IsOptional() @IsString() tenantId?: string;
  @IsOptional() @IsString() userId?: string;
}

export interface MemoryEntry {
  id: string; level: MemoryLevel; type: MemoryType; key: string; value: any;
  tenantId?: string; userId?: string; createdAt: Date; expiresAt?: Date;
  relevanceScore?: number;
}
export interface RecallResult { entries: MemoryEntry[]; total: number; query: string; level: MemoryLevel; }
