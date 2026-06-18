/**
 * PDEOS Phase 2 — Security Fix
 * File: backend/src/modules/credit/credit.controller.ts
 *
 * Fixes: C4 (no @Roles), C5 (adminId hardcoded), H1 (IDOR)
 */
import {
  Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../user/entities/user.entity';
import { CreditService } from './credit.service';

interface JwtUser { id: string; email: string; role: UserRole; tenantId: string; }

@Controller('api/v1/credits')
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  // FIX H1: userId forced from JWT — never from body/query
  @Get('balance')
  async getBalance(@Req() req: Request & { user: JwtUser }) {
    return this.creditService.getBalance(req.user.id);
  }

  @Get('transactions')
  async getTransactions(@Req() req: Request & { user: JwtUser }, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.creditService.getTransactions(req.user.id, +page, +limit);
  }

  @Post('deduct')
  @HttpCode(HttpStatus.OK)
  async deductCredits(@Req() req: Request & { user: JwtUser }, @Body() dto: { amount: number; agentId?: string; missionId?: string; description?: string }) {
    return this.creditService.deductCredits(req.user.id, dto.amount, {
      agentId: dto.agentId, missionId: dto.missionId, description: dto.description,
    });
  }

  // FIX C4: @Roles(SUPER_ADMIN) on admin endpoints
  @Get('admin/accounts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async adminGetAllAccounts() { return this.creditService.adminGetAllAccounts(); }

  @Post('admin/add')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async adminAddCredits(@Req() req: Request & { user: JwtUser }, @Body() dto: { userId: string; amount: number; description?: string }) {
    // FIX C5: adminId from JWT, not hardcoded
    return this.creditService.adminAddCredits(dto.userId, dto.amount, {
      adminId: req.user.id, description: dto.description,
    });
  }

  @Post('admin/deduct')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async adminDeductCredits(@Req() req: Request & { user: JwtUser }, @Body() dto: { userId: string; amount: number; description?: string }) {
    return this.creditService.adminDeductCredits(dto.userId, dto.amount, {
      adminId: req.user.id, description: dto.description,
    });
  }

  @Get('admin/settings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async adminGetSettings() { return this.creditService.adminGetSettings(); }

  @Put('admin/settings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async adminUpdateSetting(@Req() req: Request & { user: JwtUser }, @Body() dto: { key: string; value: string }) {
    return this.creditService.adminUpdateSetting(dto.key, dto.value, { adminId: req.user.id });
  }
}
