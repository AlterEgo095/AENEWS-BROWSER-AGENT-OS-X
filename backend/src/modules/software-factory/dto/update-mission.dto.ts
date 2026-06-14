/**
 * AENEWS Software Factory — Update Mission DTO
 *
 * Validates partial updates to an existing mission.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { MissionPriority, MissionState } from '../entities/mission.entity';

export class UpdateMissionDto {
  @ApiPropertyOptional({ description: 'Mission name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Mission description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Mission state', enum: MissionState })
  @IsOptional()
  @IsEnum(MissionState)
  state?: MissionState;

  @ApiPropertyOptional({ description: 'Mission priority', enum: MissionPriority })
  @IsOptional()
  @IsEnum(MissionPriority)
  priority?: MissionPriority;

  @ApiPropertyOptional({ description: 'Assigned team IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedTeamIds?: string[];

  @ApiPropertyOptional({ description: 'Mission objectives', type: 'array' })
  @IsOptional()
  @IsArray()
  objectives?: Array<{
    id: string;
    description: string;
    successCriteria: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  }>;

  @ApiPropertyOptional({ description: 'Mission constraints', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  constraints?: string[];

  @ApiPropertyOptional({ description: 'Required capabilities', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredCapabilities?: string[];

  @ApiPropertyOptional({ description: 'Mission deadline (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ description: 'Progress percentage (0-100)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
}
