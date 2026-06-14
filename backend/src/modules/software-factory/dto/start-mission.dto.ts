/**
 * AENEWS Software Factory — Start Mission DTO
 *
 * Validates parameters for starting mission execution.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject } from 'class-validator';

export class StartMissionDto {
  @ApiPropertyOptional({ description: 'Requester ID who initiates the start' })
  @IsOptional()
  @IsString()
  requesterId?: string;

  @ApiPropertyOptional({ description: 'Additional configuration for mission execution', type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
