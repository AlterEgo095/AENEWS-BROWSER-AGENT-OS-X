/**
 * AENEWS Agent OS X — Security Controller
 *
 * REST API for security management:
 *   - Account lockout management
 *   - Refresh token management
 *   - IP access control
 *   - CORS configuration
 *   - Security audit queries
 *   - TOTP two-factor authentication setup, enable, disable, verify
 */

import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, Ip, Headers, HttpCode, HttpStatus, BadRequestException, UnauthorizedException, Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../user/entities/user.entity';
import { AccountLockoutService } from '../services/account-lockout.service';
import { RefreshTokenService } from '../services/refresh-token.service';
import { CorsSecurityMiddleware } from '../middleware/cors-security.middleware';
import { ThreatIntelligenceService } from '../../security-monitoring/services/threat-intelligence.service';
import { SecurityAuditPersistenceService } from '../services/security-audit-persistence.service';
import { PromptInjectionGuardService } from '../services/prompt-injection-guard.service';
import { SsrfProtectionService } from '../services/ssrf-protection.service';
import { ScanPromptDto, ValidateUrlDto, EncryptDto, DecryptDto } from '../dto/security.dto';
import { SetupTotpDto, VerifyTotpDto, EnableTotpDto, DisableTotpDto } from '../dto/totp.dto';
import { EncryptionService } from '../services/encryption.service';
import { TotpService } from '../services/totp.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import * as bcrypt from 'bcrypt';

@ApiTags('Security')
@ApiBearerAuth()
@Controller('security')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SecurityController {
  private readonly logger = new Logger(SecurityController.name);

  constructor(
    private readonly accountLockout: AccountLockoutService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly corsMiddleware: CorsSecurityMiddleware,
    private readonly threatIntel: ThreatIntelligenceService,
    private readonly auditPersistence: SecurityAuditPersistenceService,
    private readonly promptGuard: PromptInjectionGuardService,
    private readonly ssrfProtection: SsrfProtectionService,
    private readonly encryptionService: EncryptionService,
    private readonly totpService: TotpService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  //  TOTP TWO-FACTOR AUTHENTICATION ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Setup TOTP for the authenticated user.
   *
   * Generates a new TOTP secret, QR code, and backup codes.
   * The secret and backup codes are shown ONLY during this response —
   * they cannot be retrieved later. The user must then call the
   * enable endpoint with a valid TOTP code to activate 2FA.
   *
   * If TOTP is already enabled, returns an error (must disable first).
   */
  @Post('totp/setup')
  @ApiOperation({ summary: 'Generate TOTP secret and QR code for 2FA setup' })
  async setupTotp(@Req() req: any, @Body() _dto: SetupTotpDto) {
    const userId = req.user?.id;
    const email = req.user?.email;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.totpEnabled) {
      throw new BadRequestException('TOTP is already enabled. Disable it first to reconfigure.');
    }

    // Generate TOTP secret, QR code, and backup codes
    const setup = await this.totpService.generateSecret(userId, email);

    // Hash backup codes for secure storage
    const hashedBackupCodes = await this.totpService.hashBackupCodes(setup.backupCodes);

    // Store the encrypted secret and hashed backup codes (but don't enable yet)
    await this.userRepository.update(userId, {
      totpSecret: setup.encryptedSecret,
      totpBackupCodes: JSON.stringify(hashedBackupCodes),
      totpUsedBackupCodes: '[]',
    });

    this.logger.log(`TOTP setup initiated for user ${userId}`);

    return {
      qrCode: setup.qrCode,
      otpauthUri: setup.otpauthUri,
      backupCodes: setup.backupCodes,
      // Security notice: backup codes can only be viewed this once
      message: 'Store your backup codes securely. They will not be shown again.',
    };
  }

  /**
   * Enable TOTP two-factor authentication after verifying the user
   * can generate valid codes.
   *
   * Requires a valid TOTP code to prove the authenticator app is
   * correctly configured.
   */
  @Post('totp/enable')
  @ApiOperation({ summary: 'Enable 2FA after verifying TOTP code' })
  async enableTotp(@Req() req: any, @Body() dto: EnableTotpDto) {
    const userId = req.user?.id;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.totpEnabled) {
      throw new BadRequestException('TOTP is already enabled');
    }

    if (!user.totpSecret) {
      throw new BadRequestException('TOTP not set up. Call /totp/setup first.');
    }

    // Decrypt and verify the TOTP code (totpSecret is guaranteed non-null after check above)
    const decryptedSecret = this.totpService.decryptSecret(user.totpSecret!);
    const isValid = this.totpService.verifyToken(decryptedSecret, dto.code);

    if (!isValid) {
      throw new UnauthorizedException('Invalid TOTP code. Please try again.');
    }

    // Enable TOTP
    await this.userRepository.update(userId, { totpEnabled: true });

    this.logger.log(`TOTP enabled for user ${userId}`);

    return {
      enabled: true,
      message: 'Two-factor authentication has been enabled successfully.',
    };
  }

  /**
   * Disable TOTP two-factor authentication.
   *
   * Requires both a valid TOTP code (or backup code) and the user's
   * current password as an additional security measure.
   */
  @Post('totp/disable')
  @ApiOperation({ summary: 'Disable 2FA with password confirmation' })
  async disableTotp(@Req() req: any, @Body() dto: DisableTotpDto) {
    const userId = req.user?.id;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.totpEnabled) {
      throw new BadRequestException('TOTP is not enabled');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify TOTP code or backup code
    const decryptedSecret = this.totpService.decryptSecret(user.totpSecret!);
    const isTotpValid = this.totpService.verifyToken(decryptedSecret, dto.code);

    let backupCodeUsed = false;
    let updatedUsedCodes: string[] | undefined;

    if (!isTotpValid) {
      // Try backup code
      const allBackupCodeHashes: string[] = user.totpBackupCodes
        ? JSON.parse(user.totpBackupCodes)
        : [];
      const usedBackupCodeHashes: string[] = user.totpUsedBackupCodes
        ? JSON.parse(user.totpUsedBackupCodes)
        : [];

      const backupResult = await this.totpService.validateBackupCode(
        usedBackupCodeHashes,
        allBackupCodeHashes,
        dto.code,
      );

      if (!backupResult.valid) {
        throw new UnauthorizedException('Invalid TOTP code or backup code');
      }

      backupCodeUsed = backupResult.backupCodeUsed ?? false;
      updatedUsedCodes = backupResult.usedBackupCodes;
    }

    // Disable TOTP and clear stored data
    await this.userRepository.update(userId, {
      totpEnabled: false,
      totpSecret: null,
      totpBackupCodes: null,
      totpUsedBackupCodes: '[]',
    });

    this.logger.log(`TOTP disabled for user ${userId}`);

    return {
      disabled: true,
      message: 'Two-factor authentication has been disabled.',
    };
  }

  /**
   * Verify a TOTP code for the authenticated user.
   *
   * Used for testing TOTP codes during an active session (e.g., when
   * performing sensitive operations that require re-authentication).
   */
  @Post('totp/verify')
  @ApiOperation({ summary: 'Verify a TOTP code for the current user' })
  async verifyTotp(@Req() req: any, @Body() dto: VerifyTotpDto) {
    const userId = req.user?.id;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.totpEnabled || !user.totpSecret) {
      throw new BadRequestException('TOTP is not enabled for this account');
    }

    // Decrypt and verify the TOTP code (totpSecret is guaranteed non-null after check above)
    const decryptedSecret = this.totpService.decryptSecret(user.totpSecret!);
    const isTotpValid = this.totpService.verifyToken(decryptedSecret, dto.code);

    if (isTotpValid) {
      return { valid: true, method: 'totp' };
    }

    // Try backup code
    const allBackupCodeHashes: string[] = user.totpBackupCodes
      ? JSON.parse(user.totpBackupCodes)
      : [];
    const usedBackupCodeHashes: string[] = user.totpUsedBackupCodes
      ? JSON.parse(user.totpUsedBackupCodes)
      : [];

    const backupResult = await this.totpService.validateBackupCode(
      usedBackupCodeHashes,
      allBackupCodeHashes,
      dto.code,
    );

    if (backupResult.valid) {
      // Update used backup codes in database
      if (backupResult.usedBackupCodes) {
        await this.userRepository.update(userId, {
          totpUsedBackupCodes: JSON.stringify(backupResult.usedBackupCodes),
        });
      }

      const remainingCodes =
        allBackupCodeHashes.length - (backupResult.usedBackupCodes?.length ?? usedBackupCodeHashes.length);

      return {
        valid: true,
        method: 'backup_code',
        remainingCodes,
      };
    }

    return { valid: false };
  }

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
    // SECURITY: Validate email format to prevent injection
    if (!this.isValidEmail(email)) {
      throw new BadRequestException('Invalid email format');
    }
    return this.accountLockout.isAccountLocked(email);
  }

  @Post('lockout/unlock/:email')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Unlock a locked account' })
  unlockAccount(@Param('email') email: string, @Req() req: any) {
    // SECURITY: Validate email format to prevent injection
    if (!this.isValidEmail(email)) {
      throw new BadRequestException('Invalid email format');
    }
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
    const result = await this.refreshTokenService.revokeTokenFamily(family, req.user?.id);
    // Return void for 204, but log the result
    return;
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
    // SECURITY: Validate IP format to prevent injection
    if (!this.isValidIp(ip)) {
      throw new BadRequestException('Invalid IP address format');
    }
    return this.threatIntel.setIpBlocked(ip, true, req.user?.id);
  }

  @Post('threats/ip/:ip/unblock')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Manually unblock an IP' })
  unblockIp(@Param('ip') ip: string, @Req() req: any) {
    // SECURITY: Validate IP format to prevent injection
    if (!this.isValidIp(ip)) {
      throw new BadRequestException('Invalid IP address format');
    }
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

  // ═══════════════════════════════════════════════════════════════
  //  PROMPT INJECTION GUARD ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  @Post('scan-prompt')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Scan a prompt input for injection attacks' })
  @ApiBody({ type: ScanPromptDto })
  scanPrompt(@Body() dto: ScanPromptDto) {
    return this.promptGuard.guardInput(dto.input, dto.context);
  }

  // ═══════════════════════════════════════════════════════════════
  //  SSRF PROTECTION ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  @Post('validate-url')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Validate a URL for SSRF risks' })
  @ApiBody({ type: ValidateUrlDto })
  async validateUrl(@Body() dto: ValidateUrlDto) {
    return this.ssrfProtection.validateUrl(dto.url);
  }

  // ═══════════════════════════════════════════════════════════════
  //  ENCRYPTION AT REST ENDPOINTS (SUPER_ADMIN only)
  // ═══════════════════════════════════════════════════════════════

  @Post('encrypt')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Encrypt a plaintext string using AES-256-GCM' })
  @ApiBody({ type: EncryptDto })
  encrypt(@Body() dto: EncryptDto) {
    const encrypted = this.encryptionService.encrypt(dto.plaintext);
    return { encrypted };
  }

  @Post('decrypt')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Decrypt an AES-256-GCM encrypted string' })
  @ApiBody({ type: DecryptDto })
  decrypt(@Body() dto: DecryptDto) {
    const decrypted = this.encryptionService.decrypt(dto.encrypted);
    return { decrypted };
  }

  @Post('generate-api-key')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate a new secure random API key' })
  generateApiKey() {
    const apiKey = this.encryptionService.generateApiKey();
    return { apiKey };
  }

  // ═══════════════════════════════════════════════════════════════
  //  INPUT VALIDATION HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validates an email address format to prevent injection attacks.
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  /**
   * Validates an IP address format (IPv4 or IPv6) to prevent injection attacks.
   */
  private isValidIp(ip: string): boolean {
    // IPv4 regex
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 regex (simplified but catches most valid forms)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

    if (ipv4Regex.test(ip)) {
      // Validate each octet is 0-255
      const octets = ip.split('.').map(Number);
      return octets.every((o) => o >= 0 && o <= 255);
    }

    return ipv6Regex.test(ip);
  }
}
