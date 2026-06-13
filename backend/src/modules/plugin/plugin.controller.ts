import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PluginService } from './plugin.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

class CreatePluginDto {
  name: string;
  version: string;
  description?: string;
  author?: string;
  tenantId?: string;
  config?: Record<string, any>;
  hooks?: string[];
}

@ApiTags('Plugins')
@Controller('plugins')
export class PluginController {
  constructor(private readonly pluginService: PluginService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new plugin' })
  async create(@Body() dto: CreatePluginDto) {
    return this.pluginService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all plugins' })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.pluginService.findAll(tenantId, pagination.page, pagination.limit);
  }

  @Get('loaded')
  @ApiOperation({ summary: 'List loaded plugins in memory' })
  async getLoaded() {
    return { plugins: this.pluginService.getLoadedPlugins() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plugin by ID' })
  async findOne(@Param('id') id: string) {
    return this.pluginService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update plugin' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreatePluginDto>) {
    return this.pluginService.update(id, dto as any);
  }

  @Put(':id/enable')
  @ApiOperation({ summary: 'Enable plugin' })
  async enable(@Param('id') id: string) {
    return this.pluginService.enable(id);
  }

  @Put(':id/disable')
  @ApiOperation({ summary: 'Disable plugin' })
  async disable(@Param('id') id: string) {
    return this.pluginService.disable(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete plugin' })
  async remove(@Param('id') id: string) {
    return this.pluginService.remove(id);
  }
}
