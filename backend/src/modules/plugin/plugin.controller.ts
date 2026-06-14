import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PluginService } from './plugin.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { IsString, IsOptional, IsObject, IsArray, IsNotEmpty } from 'class-validator';

class CreatePluginDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  version: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hooks?: string[];
}

@ApiTags('Plugins')
@ApiBearerAuth()
@Controller('plugins')
@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
export class PluginController {
  constructor(private readonly pluginService: PluginService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new plugin' })
  async create(@Body() dto: CreatePluginDto) {
    return this.pluginService.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'List all plugins' })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.pluginService.findAll(tenantId, pagination.page, pagination.limit);
  }

  @Get('loaded')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'List loaded plugins in memory' })
  async getLoaded() {
    return { plugins: this.pluginService.getLoadedPlugins() };
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get plugin by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.pluginService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update plugin' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreatePluginDto>) {
    return this.pluginService.update(id, dto as any);
  }

  @Put(':id/enable')
  @ApiOperation({ summary: 'Enable plugin' })
  async enable(@Param('id', ParseUUIDPipe) id: string) {
    return this.pluginService.enable(id);
  }

  @Put(':id/disable')
  @ApiOperation({ summary: 'Disable plugin' })
  async disable(@Param('id', ParseUUIDPipe) id: string) {
    return this.pluginService.disable(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete plugin' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.pluginService.remove(id);
  }
}
