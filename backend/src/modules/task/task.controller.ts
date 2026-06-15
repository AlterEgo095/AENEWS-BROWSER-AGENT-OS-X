import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { TaskStatus } from './entities/task.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { TenantScoped } from '../tenant/decorators/tenant-scoped.decorator';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsInt,
  IsNotEmpty,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsObject()
  input?: Record<string, any>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR)
@TenantScoped()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new task' })
  async create(@Body() dto: CreateTaskDto, @Req() req: Request & { user?: any; tenantId?: string }) {
    // Enforce tenant: non-SUPER_ADMIN must create tasks in their own tenant
    const tenantId = req.tenantId ?? dto.tenantId;
    return this.taskService.create({
      type: dto.type,
      agentId: dto.agentId,
      tenantId,
      priority: dto.priority,
      input: dto.input,
      maxRetries: dto.maxRetries,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'List all tasks with optional filters' })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('tenantId') tenantIdQueryParam?: string,
    @Query('status') status?: TaskStatus,
    @Req() req?: Request & { user?: any; tenantId?: string },
  ) {
    // Tenant isolation: non-SUPER_ADMIN can only see their own tenant's data
    const tenantId = req?.tenantId ?? tenantIdQueryParam;
    return this.taskService.findAll(
      tenantId,
      status,
      pagination.page,
      pagination.limit,
    );
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get task by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskService.findOne(id);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel a task' })
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskService.cancel(id);
  }
}
