/**
 * AENEWS Agent OS X — Security Controller
 *
 * REST API for security management:
 *   - Account lockout management
 *   - Refresh token management
 *   - IP access control
 *   - CORS configuration
 *   - Security audit queries
 */

import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, Ip, Headers, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../user/entities/user.entity';
import { AccountLockoutService } from '../services/account-lockout.service';
import { RefreshTokenService } from '../services/refresh-token.service';
import { CorsSecurityMiddleware } from '../middleware/cors-security.middleware';
import { ThreatIntelligenceService } from '../../security-monitoring/services/threat-intelligence.service';
import { SecurityAuditPersistenceService } from '../services/security-audit-persistence.service';

@ApiTags('Security')
@ApiBearerAuth()
@Controller('security')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SecurityController {
  constructor(
    private readonly accountLockout: AccountLockoutService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly corsMiddleware: CorsSecurityMiddleware,
    private readonly threatIntel: ThreatIntelligenceService,
    private readonly auditPersistence: SecurityAuditPersistenceService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  //  ACCOUNT LOCKOUT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  @Get('lockout/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get account lockout statistics' })
  getLockoutStats() {
    return this.accountLockout.getLockoutStats();
  }

  @Get('lockout/check/:email')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Check if an account is locked' })
  checkAccountLockout(@Param('email') email: string) {
    return this.accountLockout.isAccountLocked(email);
  }

  @Post('lockout/unlock/:email')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Unlock a locked account' })
  unlockAccount(@Param('email') email: string, @Req() req: any) {
    return this.accountLockout.unlockAccount(email, req.user?.id);
  }

  // ═══════════════════════════════════════════════════════════════
  //  REFRESH TOKEN ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  @Get('tokens/sessions')
  @ApiOperation({ summary: 'Get active sessions for current user' })
  getActiveSessions(@Req() req: any) {
    return this.refreshTokenService.getActiveSessions(req.user?.id);
  }

  @Delete('tokens/revoke-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke all tokens (logout from all devices)' })
  async revokeAllTokens(@Req() req: any) {
    await this.refreshTokenService.revokeAllUserTokens(req.user?.id);
  }

  @Delete('tokens/revoke/:family')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revoke a token family (admin only)' })
  async revokeTokenFamily(@Param('family') family: string, @Req() req: any) {
    // This would need family-based revocation — simplified here
  }

  // ═══════════════════════════════════════════════════════════════
  //  CORS MANAGEMENT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  @Get('cors/config')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get current CORS configuration' })
  getCorsConfig() {
    return this.corsMiddleware.getConfig();
  }

  @Post('cors/origins')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a CORS origin' })
  addCorsOrigin(@Body() body: { origin: string }) {
    this.corsMiddleware.addOrigin(body.origin);
    return { added: true, origin: body.origin };
  }

  @Delete('cors/origins/:origin')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove a CORS origin' })
  removeCorsOrigin(@Param('origin') origin: string) {
    return { removed: this.corsMiddleware.removeOrigin(origin), origin };
  }

  // ═══════════════════════════════════════════════════════════════
  //  THREAT INTELLIGENCE ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  @Get('threats/alerts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get recent threat alerts' })
  getThreatAlerts(@Query('limit') limit?: number, @Query('severity') severity?: string) {
    return this.threatIntel.getAlerts(limit, severity);
  }

  @Post('threats/alerts/:id/acknowledge')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Acknowledge a threat alert' })
  acknowledgeAlert(@Param('id') id: string) {
    return { acknowledged: this.threatIntel.acknowledgeAlert(id) };
  }

  @Get('threats/ip-reputations')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all IP reputations' })
  getIpReputations() {
    return this.threatIntel.getAllReputations();
  }

  @Get('threats/ip/:ip')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get reputation for a specific IP' })
  getIpReputation(@Param('ip') ip: string) {
    return this.threatIntel.getIpReputation(ip) || { ip, score: 0, flags: [] };
  }

  @Post('threats/ip/:ip/block')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Manually block an IP' })
  blockIp(@Param('ip') ip: string, @Req() req: any) {
    return this.threatIntel.setIpBlocked(ip, true, req.user?.id);
  }

  @Post('threats/ip/:ip/unblock')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Manually unblock an IP' })
  unblockIp(@Param('ip') ip: string, @Req() req: any) {
    return this.threatIntel.setIpBlocked(ip, false, req.user?.id);
  }

  // ═══════════════════════════════════════════════════════════════
  //  SECURITY AUDIT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  @Get('audit')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Query security audit log' })
  async queryAuditLog(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.auditPersistence.queryAuditLog({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      action,
      userId,
      limit: limit ? parseInt(String(limit), 10) : undefined,
      offset: offset ? parseInt(String(offset), 10) : undefined,
    });
  }

  @Get('audit/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get security audit statistics' })
  async getAuditStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.auditPersistence.getAuditStats(
      new Date(startDate),
      new Date(endDate),
      tenantId,
    );
  }
}
