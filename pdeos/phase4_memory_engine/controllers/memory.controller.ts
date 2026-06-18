/**
 * PDEOS Phase 4 — Memory Controller
 */
import { Controller, Post, Delete, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { MemoryCoordinator } from '../services/memory-coordinator.service';
import { RememberDto, RecallDto, MemoryLevel } from '../dto/memory.dto';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../modules/user/entities/user.entity';

@Controller('api/v1/memory')
export class MemoryController {
  constructor(private coord: MemoryCoordinator) {}

  @Post('remember')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async remember(@Body() dto: RememberDto) {
    const id = await this.coord.remember({
      level: dto.level, key: dto.key, value: dto.value, type: dto.type,
      ttlSeconds: dto.ttlSeconds, tenantId: dto.tenantId, userId: dto.userId,
    });
    return { success: true, data: { id } };
  }

  @Post('recall')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async recall(@Body() dto: RecallDto) {
    return { success: true, data: await this.coord.recall({
      query: dto.query, level: dto.level, limit: dto.limit, tenantId: dto.tenantId, userId: dto.userId,
    }) };
  }

  @Delete('forget')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async forget(@Query('level') level: MemoryLevel, @Query('key') key: string, @Query('tenantId') tenantId?: string, @Query('userId') userId?: string) {
    return { success: true, data: { deleted: await this.coord.forget(level, key, tenantId, userId) } };
  }

  @Get('health')
  @Public()
  async health() {
    return { success: true, data: { status: 'ok', service: 'memory-engine', version: '1.0.0', timestamp: new Date().toISOString() } };
  }
}
