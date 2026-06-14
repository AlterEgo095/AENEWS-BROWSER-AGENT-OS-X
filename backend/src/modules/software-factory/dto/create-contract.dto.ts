/**
 * AENEWS Software Factory — Create Contract DTO
 *
 * Validates input for creating a mission contract.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsArray,
  Min,
} from 'class-validator';

export class CreateContractDto {
  @ApiProperty({ description: 'Contract type', example: 'standard' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({
    description: 'Contract terms and conditions',
    type: 'object',
    additionalProperties: true,
    example: { maxApiCostUsd: 20, maxComputeHours: 24 },
  })
  @IsOptional()
  terms?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Budget allocation in USD', example: 100, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({
    description: 'Expected deliverables',
    type: 'array',
    additionalProperties: true,
    example: [{ type: 'source_code', description: 'Application source code', required: true }],
  })
  @IsOptional()
  @IsArray()
  deliverables?: Record<string, any>[];
}
