/**
 * AENEWS Agent OS X — Auth Flow Integration Tests
 *
 * Integration tests that exercise the AuthService with all its dependencies
 * mocked, verifying complete authentication flows:
 *
 *   1. Full registration flow
 *   2. Login returns access token
 *   3. Login with 2FA enabled returns { requires2FA: true, tempToken }
 *   4. 2FA step 2 verification
 *   5. Refresh token rotation
 *   6. Logout clears tokens
 *   7. Account lockout after failed attempts
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as OTPAuth from 'otpauth';
import { AuthService, LoginResult, Login2faRequired } from './auth.service';
import { AccountLockoutService } from '../security/services/account-lockout.service';
import { RefreshTokenService, TokenPair } from '../security/services/refresh-token.service';
import { SecurityMetricsService } from '../security-monitoring/services/security-metrics.service';
import { ThreatIntelligenceService } from '../security-monitoring/services/threat-intelligence.service';
import { TotpService } from '../security/services/totp.service';
import { EncryptionService } from '../security/services/encryption.service';
import { EventService } from '../event/event.service';
import { User, UserRole } from '../user/entities/user.entity';
import { Tenant } from '../tenant/entities/tenant.entity';

// ─── Mock Factories ────────────────────────────────────────────

function createMockUser(overrides: Partial<User> = {}): User {
  const user = new User();
  user.id = overrides.id ?? 'user-123';
  user.email = overrides.email ?? 'test@example.com';
  user.passwordHash = overrides.passwordHash ?? '$2b$10$abcdefghijklmnopqrstuvwxABCDEFGHIJ'; // placeholder
  user.firstName = overrides.firstName ?? 'Test';
  user.lastName = overrides.lastName ?? 'User';
  user.role = overrides.role ?? UserRole.TENANT_ADMIN;
  user.tenantId = overrides.tenantId ?? 'tenant-123';
  user.isActive = overrides.isActive ?? true;
  user.totpEnabled = overrides.totpEnabled ?? false;
  user.totpSecret = overrides.totpSecret ?? null;
  user.totpBackupCodes = overrides.totpBackupCodes ?? null;
  user.totpUsedBackupCodes = overrides.totpUsedBackupCodes ?? '[]';
  return user;
}

function createMockRepo(users: User[] = []) {
  return {
    findOne: jest.fn(async ({ where }: any) => {
      const key = Object.keys(where)[0];
      const val = where[key];
      return users.find((u) => (u as any)[key] === val) ?? null;
    }),
    create: jest.fn((data: any) => data),
    save: jest.fn(async (entity: any) => ({
      ...entity,
      id: entity.id ?? 'new-user-id',
    })),
    update: jest.fn(async () => ({ affected: 1 })),
  };
}

function createMockAccountLockout() {
  return {
    isAccountLocked: jest.fn(async () => ({ locked: false, lockedUntil: null, remainingAttempts: 5 })),
    getProgressiveDelay: jest.fn(async () => 0),
    recordFailedAttempt: jest.fn(async () => ({ locked: false, lockedUntil: null, remainingAttempts: 4 })),
    recordSuccessfulLogin: jest.fn(async () => undefined),
    unlockAccount: jest.fn(async () => true),
    getLockoutStats: jest.fn(async () => ({ totalLockedAccounts: 0, lockedAccounts: [] })),
  };
}

function createMockRefreshTokenService(): RefreshTokenService {
  return {
    generateTokenPair: jest.fn(async (userId: string, tenantId: string, role: string, _meta?: any) => ({
      accessToken: 'access-token-' + userId,
      refreshToken: 'refresh-token-' + userId,
      family: 'family-' + userId,
    })),
    rotateRefreshToken: jest.fn(async (token: string, _meta?: any) => ({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      family: 'new-family',
    })),
    revokeToken: jest.fn(async () => true),
    revokeAllUserTokens: jest.fn(async () => 1),
  } as any;
}

function createMockSecurityMetrics() {
  return {
    recordAuthSuccess: jest.fn(),
    recordAuthFailure: jest.fn(),
    recordTokenRotation: jest.fn(),
  };
}

function createMockThreatIntel() {
  return {
    recordIpEvent: jest.fn(async () => undefined),
    getAlerts: jest.fn(async () => []),
    acknowledgeAlert: jest.fn(() => true),
    getAllReputations: jest.fn(async () => []),
    getIpReputation: jest.fn(async () => null),
    setIpBlocked: jest.fn(async () => undefined),
  };
}

function createMockTotpService(): TotpService {
  return {
    generateSecret: jest.fn(async (userId: string, email: string) => ({
      qrCode: 'base64-qr-code',
      otpauthUri: 'otpauth://totp/AENEWS%20Agent%20OS%20X:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=AENEWS+Agent+OS+X',
      backupCodes: ['ABCD1234', 'EFGH5678', 'IJKL9012', 'MNOP3456'],
      encryptedSecret: 'encrypted-secret-base64',
    })),
    verifyToken: jest.fn(() => true),
    decryptSecret: jest.fn(() => 'JBSWY3DPEHPK3PXP'),
    hashBackupCodes: jest.fn(async (codes: string[]) => codes.map((c) => `$2b$10$hash_${c}`)),
    validateBackupCode: jest.fn(async () => ({ valid: true, usedBackupCodes: ['hashed-code'], backupCodeUsed: true })),
    generateBackupCodes: jest.fn(() => ['ABCD1234', 'EFGH5678']),
  } as any;
}

function createMockEncryptionService(): EncryptionService {
  return {
    encrypt: jest.fn((plaintext: string) => Buffer.from(plaintext).toString('base64')),
    decrypt: jest.fn((encrypted: string) => Buffer.from(encrypted, 'base64').toString('utf-8')),
  } as any;
}

function createMockEventService() {
  return {
    emit: jest.fn(async () => undefined),
  };
}

// ─── Test Suite ────────────────────────────────────────────────

describe('AuthService (Integration)', () => {
  let service: AuthService;
  let userRepository: any;
  let tenantRepository: any;
  let accountLockout: ReturnType<typeof createMockAccountLockout>;
  let refreshTokenService: ReturnType<typeof createMockRefreshTokenService>;
  let securityMetrics: ReturnType<typeof createMockSecurityMetrics>;
  let threatIntel: ReturnType<typeof createMockThreatIntel>;
  let totpService: ReturnType<typeof createMockTotpService>;
  let encryptionService: ReturnType<typeof createMockEncryptionService>;
  let jwtService: JwtService;

  // Prepare a known password hash
  const TEST_PASSWORD = 'SecurePass123!';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  });

  beforeEach(async () => {
    const testUser = createMockUser({ passwordHash });

    userRepository = createMockRepo([testUser]);
    tenantRepository = createMockRepo([]);
    accountLockout = createMockAccountLockout();
    refreshTokenService = createMockRefreshTokenService();
    securityMetrics = createMockSecurityMetrics();
    threatIntel = createMockThreatIntel();
    totpService = createMockTotpService();
    encryptionService = createMockEncryptionService();

    const mockEventService = createMockEventService();

    jwtService = new JwtService({ secret: 'test-jwt-secret' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'UserRepository', useValue: userRepository },
        { provide: 'TenantRepository', useValue: tenantRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: EventService, useValue: mockEventService },
        { provide: AccountLockoutService, useValue: accountLockout },
        { provide: RefreshTokenService, useValue: refreshTokenService },
        { provide: SecurityMetricsService, useValue: securityMetrics },
        { provide: ThreatIntelligenceService, useValue: threatIntel },
        { provide: TotpService, useValue: totpService },
        { provide: EncryptionService, useValue: encryptionService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ═══════════════════════════════════════════════════════════
  //  1. Full Registration Flow
  // ═══════════════════════════════════════════════════════════

  describe('registration flow', () => {
    it('should register a new user and return tokens', async () => {
      // Make sure the user doesn't already exist
      userRepository.findOne.mockResolvedValueOnce(null);
      // Tenant creation
      tenantRepository.create.mockReturnValue({ id: 'new-tenant-id', name: "Test's Organization", slug: 'test-1234567890', plan: 'free' });
      tenantRepository.save.mockResolvedValue({ id: 'new-tenant-id', name: "Test's Organization", slug: 'test-1234567890', plan: 'free' });

      const result = await service.register({
        email: 'newuser@example.com',
        password: 'NewUserPass123!',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('family');
      expect(result).toHaveProperty('user');
      expect(refreshTokenService.generateTokenPair).toHaveBeenCalled();
    });

    it('should reject duplicate email registration', async () => {
      await expect(
        service.register({
          email: 'test@example.com', // already exists
          password: 'Password123!',
          firstName: 'Dupe',
          lastName: 'User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should accept a valid tenant slug during registration', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);
      tenantRepository.findOne.mockResolvedValueOnce({ id: 'existing-tenant', slug: 'my-org', name: 'My Org' });

      const result = await service.register({
        email: 'newuser2@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        tenantSlug: 'my-org',
      });

      expect(result).toHaveProperty('accessToken');
    });

    it('should reject an invalid tenant slug during registration', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);
      tenantRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.register({
          email: 'newuser3@example.com',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'User',
          tenantSlug: 'nonexistent',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  2. Login Returns Access Token
  // ═══════════════════════════════════════════════════════════

  describe('login flow (no 2FA)', () => {
    it('should return access token and refresh token on successful login', async () => {
      const result = await service.login({
        email: 'test@example.com',
        password: TEST_PASSWORD,
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('family');

      const loginResult = result as LoginResult;
      expect(loginResult.accessToken).toBeTruthy();
      expect(loginResult.refreshToken).toBeTruthy();
    });

    it('should record a successful login', async () => {
      await service.login({
        email: 'test@example.com',
        password: TEST_PASSWORD,
      });

      expect(accountLockout.recordSuccessfulLogin).toHaveBeenCalledWith('test@example.com', 'unknown');
    });

    it('should reject login with wrong password', async () => {
      await expect(
        service.login({
          email: 'test@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login for non-existent user', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'SomePassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login for disabled account', async () => {
      const disabledUser = createMockUser({ isActive: false, passwordHash });
      userRepository.findOne.mockResolvedValueOnce(disabledUser);

      await expect(
        service.login({
          email: 'test@example.com',
          password: TEST_PASSWORD,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  3. Login with 2FA Enabled Returns { requires2FA: true, tempToken }
  // ═══════════════════════════════════════════════════════════

  describe('login flow (with 2FA)', () => {
    it('should return requires2FA and tempToken when TOTP is enabled', async () => {
      const totpUser = createMockUser({
        passwordHash,
        totpEnabled: true,
        totpSecret: 'encrypted-totp-secret',
      });
      userRepository.findOne.mockResolvedValue(totpUser);

      const result = await service.login({
        email: 'test@example.com',
        password: TEST_PASSWORD,
      });

      expect(result).toHaveProperty('requires2FA', true);
      expect(result).toHaveProperty('tempToken');
      expect(result).toHaveProperty('message');

      const login2fa = result as Login2faRequired;
      expect(login2fa.tempToken).toBeTruthy();
      // The tempToken should be a JWT
      const decoded = jwtService.decode(login2fa.tempToken) as any;
      expect(decoded.step).toBe('2fa');
      expect(decoded.sub).toBe('user-123');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  4. 2FA Step 2 Verification
  // ═══════════════════════════════════════════════════════════

  describe('2FA step 2 verification', () => {
    it('should complete 2FA login with a valid TOTP code', async () => {
      const totpUser = createMockUser({
        passwordHash,
        totpEnabled: true,
        totpSecret: 'encrypted-totp-secret',
      });
      userRepository.findOne.mockResolvedValue(totpUser);

      // Create a valid tempToken
      const tempToken = jwtService.sign(
        { sub: 'user-123', step: '2fa', tenantId: 'tenant-123', role: 'tenant_admin' },
        { expiresIn: '5m' },
      );

      totpService.verifyToken.mockReturnValue(true);

      const result = await service.loginStep2(tempToken, '123456');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(totpService.verifyToken).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP', '123456');
    });

    it('should fall back to backup code when TOTP code is invalid', async () => {
      const totpUser = createMockUser({
        passwordHash,
        totpEnabled: true,
        totpSecret: 'encrypted-totp-secret',
        totpBackupCodes: JSON.stringify(['$2b$10$hash_ABCD1234']),
        totpUsedBackupCodes: '[]',
      });
      userRepository.findOne.mockResolvedValue(totpUser);

      const tempToken = jwtService.sign(
        { sub: 'user-123', step: '2fa', tenantId: 'tenant-123', role: 'tenant_admin' },
        { expiresIn: '5m' },
      );

      // TOTP code is invalid
      totpService.verifyToken.mockReturnValue(false);
      // But backup code is valid
      totpService.validateBackupCode.mockResolvedValue({
        valid: true,
        usedBackupCodes: ['$2b$10$hash_ABCD1234'],
        backupCodeUsed: true,
      });

      const result = await service.loginStep2(tempToken, 'ABCD1234');

      expect(result).toHaveProperty('accessToken');
      expect(totpService.validateBackupCode).toHaveBeenCalled();
    });

    it('should reject 2FA with invalid TOTP code and invalid backup code', async () => {
      const totpUser = createMockUser({
        passwordHash,
        totpEnabled: true,
        totpSecret: 'encrypted-totp-secret',
        totpBackupCodes: JSON.stringify(['$2b$10$hash_ABCD1234']),
        totpUsedBackupCodes: '[]',
      });
      userRepository.findOne.mockResolvedValue(totpUser);

      const tempToken = jwtService.sign(
        { sub: 'user-123', step: '2fa', tenantId: 'tenant-123', role: 'tenant_admin' },
        { expiresIn: '5m' },
      );

      totpService.verifyToken.mockReturnValue(false);
      totpService.validateBackupCode.mockResolvedValue({ valid: false });

      await expect(
        service.loginStep2(tempToken, '000000'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject an expired or invalid tempToken', async () => {
      await expect(
        service.loginStep2('invalid-token', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject a token that is not a 2FA step token', async () => {
      // This is a regular JWT without step: '2fa'
      const regularToken = jwtService.sign({ sub: 'user-123' });

      await expect(
        service.loginStep2(regularToken, '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  5. Refresh Token Rotation
  // ═══════════════════════════════════════════════════════════

  describe('refresh token rotation', () => {
    it('should rotate a refresh token and return a new pair', async () => {
      const result = await service.refreshAccessToken('old-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(refreshTokenService.rotateRefreshToken).toHaveBeenCalledWith('old-refresh-token', undefined);
    });

    it('should record successful token rotation in metrics', async () => {
      await service.refreshAccessToken('valid-refresh-token');

      expect(securityMetrics.recordTokenRotation).toHaveBeenCalledWith('success');
    });

    it('should record token reuse detection in metrics', async () => {
      refreshTokenService.rotateRefreshToken.mockRejectedValueOnce(new Error('reuse detected'));

      await expect(
        service.refreshAccessToken('reused-token'),
      ).rejects.toThrow();

      expect(securityMetrics.recordTokenRotation).toHaveBeenCalledWith('reuse_detected');
    });

    it('should record token expiration in metrics', async () => {
      refreshTokenService.rotateRefreshToken.mockRejectedValueOnce(new Error('expired'));

      await expect(
        service.refreshAccessToken('expired-token'),
      ).rejects.toThrow();

      expect(securityMetrics.recordTokenRotation).toHaveBeenCalledWith('expired');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  6. Logout Clears Tokens
  // ═══════════════════════════════════════════════════════════

  describe('logout', () => {
    it('should revoke a specific refresh token', async () => {
      const result = await service.logout('my-refresh-token');

      expect(refreshTokenService.revokeToken).toHaveBeenCalledWith('my-refresh-token');
      expect(result).toBe(true);
    });

    it('should revoke all user tokens on logoutAll', async () => {
      const result = await service.logoutAll('user-123');

      expect(refreshTokenService.revokeAllUserTokens).toHaveBeenCalledWith('user-123');
      expect(result).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  7. Account Lockout After Failed Attempts
  // ═══════════════════════════════════════════════════════════

  describe('account lockout', () => {
    it('should reject login when account is locked', async () => {
      accountLockout.isAccountLocked.mockResolvedValueOnce({
        locked: true,
        lockedUntil: Date.now() + 15 * 60 * 1000,
        remainingAttempts: 0,
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: TEST_PASSWORD,
        }),
      ).rejects.toThrow(/locked/i);
    });

    it('should record failed attempts on wrong password', async () => {
      await expect(
        service.login({
          email: 'test@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow();

      expect(accountLockout.recordFailedAttempt).toHaveBeenCalledWith('test@example.com', 'unknown');
    });

    it('should trigger lockout when max attempts are exceeded', async () => {
      accountLockout.recordFailedAttempt.mockResolvedValueOnce({
        locked: true,
        lockedUntil: Date.now() + 15 * 60 * 1000,
        remainingAttempts: 0,
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(/locked/i);
    });

    it('should record IP events on failed login', async () => {
      userRepository.findOne.mockResolvedValueOnce(null); // non-existent user

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'Whatever!',
        }),
      ).rejects.toThrow();

      expect(threatIntel.recordIpEvent).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  validateUser
  // ═══════════════════════════════════════════════════════════

  describe('validateUser', () => {
    it('should return the user for a valid payload', async () => {
      const user = await service.validateUser({ sub: 'user-123' });
      expect(user).toBeTruthy();
      expect(user?.id).toBe('user-123');
    });

    it('should return null for a non-existent user', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);

      const user = await service.validateUser({ sub: 'nonexistent' });
      expect(user).toBeNull();
    });

    it('should return null for a disabled user', async () => {
      const disabledUser = createMockUser({ isActive: false });
      userRepository.findOne.mockResolvedValueOnce(disabledUser);

      const user = await service.validateUser({ sub: 'user-123' });
      expect(user).toBeNull();
    });
  });
});
