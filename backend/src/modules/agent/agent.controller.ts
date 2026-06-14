import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { ClusterType } from './entities/agent.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AgentContext } from './agent.abstract';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { TenantScoped } from '../tenant/decorators/tenant-scoped.decorator';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
  IsNotEmpty,
} from 'class-validator';

class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ClusterType)
  cluster: ClusterType;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];
}

class UpdateAgentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ClusterType)
  cluster?: ClusterType;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];

  @IsOptional()
  @IsString()
  version?: string;
}

class ExecuteAgentDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsObject()
  config: Record<string, any>;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

@ApiTags('Agents')
@ApiBearerAuth()
@Controller('agents')
@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR)
@TenantScoped()
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new agent' })
  async create(@Body() dto: CreateAgentDto, @Req() req: Request & { user?: any; tenantId?: string }) {
    // Enforce tenant: non-SUPER_ADMIN must create agents in their own tenant
    const tenantId = req.tenantId ?? dto.tenantId;
    return this.agentService.create({ ...dto, tenantId });
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'List all agents with optional filters' })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('tenantId') tenantIdQueryParam?: string,
    @Query('cluster') cluster?: ClusterType,
    @Req() req?: Request & { user?: any; tenantId?: string },
  ) {
    // Tenant isolation: non-SUPER_ADMIN can only see their own tenant's data
    // SUPER_ADMIN (tenantId=null) can optionally filter by tenantId query param
    const tenantId = req.tenantId ?? tenantIdQueryParam;
    return this.agentService.findAll(
      tenantId,
      cluster,
      pagination.page,
      pagination.limit,
    );
  }

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get cluster statistics' })
  async getStats() {
    return this.agentService.getClusterStats();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get agent by ID' })
  async findOne(@Param('id') id: string) {
    return this.agentService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update agent' })
  async update(@Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.agentService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete agent' })
  async remove(@Param('id') id: string) {
    return this.agentService.remove(id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute an agent with the given context' })
  async execute(
    @Param('id') id: string,
    @Body() dto: ExecuteAgentDto,
    @Req() req: Request & { user?: any; tenantId?: string },
  ) {
    // Enforce tenant: non-SUPER_ADMIN must execute agents in their own tenant
    const tenantId = req.tenantId ?? dto.tenantId;
    const context: AgentContext = {
      agentId: id,
      tenantId,
      taskId: dto.taskId,
      config: dto.config,
      metadata: dto.metadata,
    };
    return this.agentService.executeAgent(id, context);
  }

  @Get(':id/executions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get agent execution history' })
  async getExecutions(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.agentService.getAgentExecutions(
      id,
      pagination.page,
      pagination.limit,
    );
  }
}
