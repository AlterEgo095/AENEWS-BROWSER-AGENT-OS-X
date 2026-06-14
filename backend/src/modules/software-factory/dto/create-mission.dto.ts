/**
 * AENEWS Software Factory — Create Mission DTO
 *
 * Validates input for creating a new mission.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsDateString,
} from 'class-validator';
import { MissionPriority } from '../entities/mission.entity';

export class CreateMissionDto {
  @ApiProperty({ description: 'Mission name', example: 'Build SaaS Platform' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Mission description',
    example: 'Build a complete SaaS platform with authentication and billing',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Mission priority',
    enum: MissionPriority,
    default: MissionPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(MissionPriority)
  priority?: MissionPriority;

  @ApiPropertyOptional({
    description: 'Mission objectives (array of objects with id, description, successCriteria, status)',
    type: 'array',
    example: [
      { id: 'obj-1', description: 'Complete build', successCriteria: 'All tests pass', status: 'pending' },
    ],
  })
  @IsOptional()
  @IsArray()
  objectives?: Array<{
    id: string;
    description: string;
    successCriteria: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  }>;

  @ApiPropertyOptional({
    description: 'Mission constraints (array of strings)',
    type: [String],
    example: ['Must use TypeScript', 'Budget under $500'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  constraints?: string[];

  @ApiPropertyOptional({
    description: 'Required capabilities (array of strings)',
    type: [String],
    example: ['dev.frontend', 'dev.backend', 'dev.database'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredCapabilities?: string[];

  @ApiPropertyOptional({
    description: 'Mission deadline (ISO 8601 date string)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  deadline?: string;
}
