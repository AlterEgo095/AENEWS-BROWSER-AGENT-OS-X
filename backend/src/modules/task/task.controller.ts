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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { TaskStatus } from './entities/task.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
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
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new task' })
  async create(@Body() dto: CreateTaskDto) {
    return this.taskService.create({
      type: dto.type,
      agentId: dto.agentId,
      tenantId: dto.tenantId,
      priority: dto.priority,
      input: dto.input,
      maxRetries: dto.maxRetries,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List all tasks with optional filters' })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: TaskStatus,
  ) {
    return this.taskService.findAll(
      tenantId,
      status,
      pagination.page,
      pagination.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  async findOne(@Param('id') id: string) {
    return this.taskService.findOne(id);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel a task' })
  async cancel(@Param('id') id: string) {
    return this.taskService.cancel(id);
  }
}
