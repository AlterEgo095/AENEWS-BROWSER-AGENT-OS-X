/**
 * AENEWS Agent OS X — Swarm Controller DTOs
 *
 * Proper DTOs with class-validator decorators for all swarm controller endpoints.
 * NestJS ValidationPipe only validates class instances, so inline types are
 * replaced with these decorated DTO classes.
 */

import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  MaxLength,
  MinLength,
  Min,
  Max,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClusterType } from '../../agent/entities/agent.entity';

// ═══════════════════════════════════════════════════════════
//  Swarm Endpoints
// ═══════════════════════════════════════════════════════════

export class CreateSwarmDto {
  @ApiProperty({ description: 'Unique swarm identifier', example: 'swarm-1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  id: string;

  @ApiProperty({ description: 'Mission description for the swarm', example: 'Build a REST API' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  mission: string;

  @ApiPropertyOptional({ description: 'List of objectives', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  objectives?: string[];

  @ApiPropertyOptional({ description: 'Required capabilities', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  requiredCapabilities?: string[];

  @ApiPropertyOptional({ description: 'Preferred cluster types', enum: ClusterType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ClusterType, { each: true })
  preferredClusters?: ClusterType[];

  @ApiPropertyOptional({ description: 'Initial swarm size', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  initialSize?: number;

  @ApiPropertyOptional({ description: 'Maximum swarm size', minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxSize?: number;

  @ApiPropertyOptional({ description: 'Minimum swarm size', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  minSize?: number;

  @ApiPropertyOptional({ description: 'Maximum duration in ms', minimum: 1000, maximum: 86400000 })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(86400000)
  maxDurationMs?: number;

  @ApiPropertyOptional({ description: 'Enable dynamic agent spawning' })
  @IsOptional()
  @IsBoolean()
  enableDynamicSpawning?: boolean;

  @ApiPropertyOptional({ description: 'Enable emergent behavior detection' })
  @IsOptional()
  @IsBoolean()
  enableEmergentDetection?: boolean;
}

export class TerminateSwarmDto {
  @ApiPropertyOptional({ description: 'Reason for termination' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

// ═══════════════════════════════════════════════════════════
//  Consensus Endpoints
// ═══════════════════════════════════════════════════════════

export class AgentExpertiseDto {
  @ApiProperty({ description: 'Agent identifier' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  agentId: string;

  @ApiProperty({ description: 'Expertise score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  expertiseScore: number;

  @ApiProperty({ description: 'Reliability score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  reliabilityScore: number;

  @ApiProperty({ description: 'Cluster relevance score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  clusterRelevance: number;

  @ApiProperty({ description: 'Byzantine suspicion score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  byzantineSuspicion: number;
}

export class ConsensusProposalDto {
  @ApiProperty({ description: 'Proposal identifier' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  id: string;

  @ApiPropertyOptional({ description: 'Proposal content' })
  @IsOptional()
  @IsObject()
  content?: any;

  @ApiProperty({ description: 'Agent that proposed this' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  proposedBy: string;
}

export class InitiateConsensusDto {
  @ApiProperty({ description: 'Consensus session identifier' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  id: string;

  @ApiProperty({ description: 'The proposal to reach consensus on', type: ConsensusProposalDto })
  @ValidateNested()
  @Type(() => ConsensusProposalDto)
  proposal: ConsensusProposalDto;

  @ApiPropertyOptional({ description: 'Consensus strategy', enum: ['simple_majority', 'supermajority', 'unanimous', 'bft', 'weighted_quorum'] })
  @IsOptional()
  @IsIn(['simple_majority', 'supermajority', 'unanimous', 'bft', 'weighted_quorum'])
  strategy?: 'simple_majority' | 'supermajority' | 'unanimous' | 'bft' | 'weighted_quorum';

  @ApiPropertyOptional({ description: 'Participants with expertise scores', type: [AgentExpertiseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentExpertiseDto)
  participants?: AgentExpertiseDto[];

  @ApiPropertyOptional({ description: 'Maximum consensus rounds', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxRounds?: number;

  @ApiPropertyOptional({ description: 'Quorum threshold (0-1)', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  quorumThreshold?: number;

  @ApiPropertyOptional({ description: 'Supermajority threshold (0-1)', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  supermajorityThreshold?: number;

  @ApiPropertyOptional({ description: 'Byzantine fault tolerance (0-1)', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  byzantineTolerance?: number;

  @ApiPropertyOptional({ description: 'Enable dissent tracking' })
  @IsOptional()
  @IsBoolean()
  enableDissentTracking?: boolean;

  @ApiPropertyOptional({ description: 'Enable multi-round consensus' })
  @IsOptional()
  @IsBoolean()
  enableMultiRound?: boolean;
}

// ═══════════════════════════════════════════════════════════
//  Persistence Endpoints
// ═══════════════════════════════════════════════════════════

export class CreateCheckpointDto {
  @ApiProperty({ description: 'Collaboration session ID' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  collaborationId: string;

  @ApiProperty({ description: 'Current collaboration phase' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  phase: string;

  @ApiProperty({ description: 'Agent IDs in collaboration', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  agentIds: string[];

  @ApiProperty({ description: 'Agents with assigned tasks', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  assignedAgents: string[];

  @ApiPropertyOptional({ description: 'Results so far', type: [Object] })
  @IsOptional()
  @IsArray()
  results?: any[];

  @ApiPropertyOptional({ description: 'Error messages', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  errors?: string[];

  @ApiProperty({ description: 'Timestamp when collaboration started' })
  @IsNumber()
  startedAt: number;

  @ApiProperty({ description: 'Timestamp of last checkpoint' })
  @IsNumber()
  lastCheckpointAt: number;

  @ApiPropertyOptional({ description: 'Parent mission ID' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  parentMissionId?: string;

  @ApiProperty({ description: 'Collaboration pattern name' })
  @IsString()
  @MaxLength(64)
  pattern: string;
}

// ═══════════════════════════════════════════════════════════
//  Working Memory Endpoints
// ═══════════════════════════════════════════════════════════

export class CreateWorkingMemorySessionDto {
  @ApiProperty({ description: 'Working memory session ID' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  sessionId: string;

  @ApiProperty({ description: 'Agent IDs for this session', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  agentIds: string[];

  @ApiPropertyOptional({ description: 'Associated mission ID' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  missionId?: string;

  @ApiPropertyOptional({ description: 'Memory scope', enum: ['session', 'mission', 'persistent'] })
  @IsOptional()
  @IsIn(['session', 'mission', 'persistent'])
  scope?: 'session' | 'mission' | 'persistent';
}

export class WriteWorkingMemoryDto {
  @ApiProperty({ description: 'Memory key to write' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  key: string;

  @ApiProperty({ description: 'Value to store' })
  @IsNotEmpty()
  value: any;

  @ApiProperty({ description: 'Agent performing the write' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  agentId: string;

  @ApiPropertyOptional({ description: 'Optional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class PostToBlackboardDto {
  @ApiProperty({ description: 'Blackboard key' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  key: string;

  @ApiProperty({ description: 'Value to post' })
  @IsNotEmpty()
  value: any;

  @ApiProperty({ description: 'Agent posting to the blackboard' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  agentId: string;
}

// ═══════════════════════════════════════════════════════════
//  Topology Endpoints
// ═══════════════════════════════════════════════════════════

export class CreateTopologyDto {
  @ApiProperty({ description: 'Topology identifier' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  id: string;

  @ApiProperty({ description: 'Topology type', enum: ['star', 'mesh', 'ring', 'tree', 'custom'] })
  @IsIn(['star', 'mesh', 'ring', 'tree', 'custom'])
  type: 'star' | 'mesh' | 'ring' | 'tree' | 'custom';

  @ApiProperty({ description: 'Agent IDs in the topology', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  agentIds: string[];

  @ApiProperty({ description: 'Cluster types for the topology', enum: ClusterType, isArray: true })
  @IsArray()
  @IsEnum(ClusterType, { each: true })
  clusterTypes: ClusterType[];

  @ApiPropertyOptional({ description: 'Optional topology metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AddTopologyNodeDto {
  @ApiProperty({ description: 'Agent ID to add' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  agentId: string;

  @ApiProperty({ description: 'Cluster type of the agent', enum: ClusterType })
  @IsEnum(ClusterType)
  clusterType: ClusterType;

  @ApiPropertyOptional({ description: 'Reason for adding the node' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RemoveTopologyNodeDto {
  @ApiProperty({ description: 'Agent ID to remove' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  agentId: string;

  @ApiPropertyOptional({ description: 'Reason for removing the node' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class IsolateNodeDto {
  @ApiPropertyOptional({ description: 'Reason for isolation' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RetypeTopologyDto {
  @ApiProperty({ description: 'New topology type', enum: ['star', 'mesh', 'ring', 'tree', 'custom'] })
  @IsIn(['star', 'mesh', 'ring', 'tree', 'custom'])
  type: 'star' | 'mesh' | 'ring' | 'tree' | 'custom';
}
