import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

class CreateTenantDto {
  name: string;
  slug: string;
  plan?: string;
  config?: Record<string, any>;
}

class UpdateQuotasDto {
  maxAgents?: number;
  maxTasks?: number;
  maxStorage?: number;
  maxConcurrentExecutions?: number;
}

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
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
