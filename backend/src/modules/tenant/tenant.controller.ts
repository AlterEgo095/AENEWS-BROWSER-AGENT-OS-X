import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { IsString, IsOptional, IsObject, IsInt, Min, Max, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

class UpdateQuotasDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxAgents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxTasks?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxStorage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxConcurrentExecutions?: number;
}

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
@Roles(UserRole.SUPER_ADMIN)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  async create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tenants' })
  async findAll(@Query() pagination: PaginationDto) {
    return this.tenantService.findAll(pagination.page, pagination.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  async findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tenant' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateTenantDto>) {
    return this.tenantService.update(id, dto);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Activate tenant' })
  async activate(@Param('id') id: string) {
    return this.tenantService.activate(id);
  }

  @Put(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate tenant' })
  async deactivate(@Param('id') id: string) {
    return this.tenantService.deactivate(id);
  }

  @Put(':id/quotas')
  @ApiOperation({ summary: 'Update tenant quotas' })
  async updateQuotas(@Param('id') id: string, @Body() dto: UpdateQuotasDto) {
    return this.tenantService.updateQuotas(id, dto);
  }
}
