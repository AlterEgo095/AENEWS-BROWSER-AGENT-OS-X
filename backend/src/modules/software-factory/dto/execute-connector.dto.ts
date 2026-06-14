/**
 * AENEWS Software Factory — Execute Connector DTO
 *
 * Validates input for executing an action via a connector.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class ExecuteConnectorDto {
  @ApiProperty({ description: 'Action to execute', example: 'browser.navigation' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiPropertyOptional({
    description: 'Parameters for the action',
    type: 'object',
    additionalProperties: true,
    example: { url: 'https://example.com', missionId: 'mission-abc123' },
  })
  @IsOptional()
  @IsObject()
  params?: Record<string, any>;
}
