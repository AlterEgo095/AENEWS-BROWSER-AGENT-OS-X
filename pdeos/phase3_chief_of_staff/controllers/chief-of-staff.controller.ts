/**
 * PDEOS Phase 3 — Controller
 */
import { Controller, Post, Get, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { ChiefOfStaffService } from '../services/chief-of-staff.service';
import { MissionRequestDto } from '../dto/mission-request.dto';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../modules/user/entities/user.entity';

interface AuthReq extends Request { user: { id: string; tenantId: string; email: string; role: string }; }

@Controller('api/v1/cos')
export class ChiefOfStaffController {
  constructor(private svc: ChiefOfStaffService) {}

  @Post('mission')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async submit(@Req() req: AuthReq, @Body() dto: MissionRequestDto) {
    return { success: true, data: await this.svc.executeMission(dto, req.user) };
  }

  @Get('briefing')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async briefing(@Req() req: AuthReq) {
    return { success: true, data: await this.svc.generateDailyBriefing(req.user.id, req.user.tenantId) };
  }

  @Get('health')
  @Public()
  async health() {
    return { success: true, data: { status: 'ok', service: 'chief-of-staff', version: '1.0.0', timestamp: new Date().toISOString() } };
  }
}
