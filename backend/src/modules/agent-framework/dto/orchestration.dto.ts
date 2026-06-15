/**
 * AENEWS Agent OS X — Orchestration Controller DTOs
 *
 * Proper DTOs with class-validator decorators for all orchestration controller endpoints.
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

// ═══════════════════════════════════════════════════════════
//  Collaboration DTOs
// ═══════════════════════════════════════════════════════════

export class CollaborateDto {
  @IsIn(['delegation', 'handoff', 'parallel', 'pipeline', 'consensus'])
  pattern: 'delegation' | 'handoff' | 'parallel' | 'pipeline' | 'consensus';

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  objectives: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  requiredCapabilities?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(ClusterType, { each: true })
  preferredClusters?: ClusterType[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxAgents?: number;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(86400000)
  maxDurationMs?: number;

  @IsOptional()
  @IsBoolean()
  allowPartialResults?: boolean;
}

// ═══════════════════════════════════════════════════════════
//  Decomposition DTOs
// ═══════════════════════════════════════════════════════════

export class DecomposeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  missionId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  objectives?: string[];

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxSubtasks?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  requiredCapabilities?: string[];
}

// ═══════════════════════════════════════════════════════════
//  Cross-Cluster Coordination DTOs
// ═══════════════════════════════════════════════════════════

export class CoordinateTaskDto {
  @IsEnum(ClusterType)
  cluster: ClusterType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  requiredCapabilities: string[];

  @IsNumber()
  @Min(0)
  @Max(100)
  priority: number;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(600000)
  timeoutMs?: number;
}

export class CoordinateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinateTaskDto)
  tasks: CoordinateTaskDto[];
}

// ═══════════════════════════════════════════════════════════
//  Connector Execution DTOs
// ═══════════════════════════════════════════════════════════

export class ExecuteConnectorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  connectorName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  action: string;

  @IsOptional()
  @IsObject()
  params?: Record<string, any>;
}
