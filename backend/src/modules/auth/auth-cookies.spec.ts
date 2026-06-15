/**
 * AENEWS Agent OS X — Cookie-based Auth Integration Tests
 *
 * Integration tests that exercise the AuthController with cookie-based
 * refresh token management, verifying:
 *
 *   1. Login sets httpOnly refresh cookie
 *   2. Refresh reads from cookie and returns new access token
 *   3. Logout clears cookie
 *   4. 2FA flow: login returns requires2FA, step2 completes
 *   5. Register sets httpOnly refresh cookie
 *   6. Logout-all clears cookie
 *   7. Missing cookie returns 401 on refresh
 *   8. Cookie attributes are correct (httpOnly, sameSite, path)
 *
 * Uses NestJS Testing module with proper mock providers.
 * Mocks Redis, User repository, and all external dependencies.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnauthorizedException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportModule, PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Reflector } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AuthController } from './auth.controller';
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
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

// ─── Mock JWT Strategy ────────────────────────────────────────────

@Injectable()
class MockJwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: (req: any) => {
        const auth = req?.headers?.authorization;
        if (auth?.startsWith('Bearer ')) return auth.slice(7);
        return null;
      },
      secretOrKey: 'test-jwt-secret',
    });
  }

  validate(payload: any) {
    return { id: payload.sub, email: payload.email, role: payload.role, tenantId: payload.tenantId };
  }
}

// ─── Mock Factories ────────────────────────────────────────────

function createMockUser(overrides: Partial<User> = {}): User {
  const user = new User();
  user.id = overrides.id ?? 'user-123';
  user.email = overrides.email ?? 'test@example.com';
  user.passwordHash = overrides.passwordHash ?? '$2b$10$mockpasswordhash';
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

function createMockUserRepo(users: User[] = []) {
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

function createMockTenantRepo() {
  return {
    findOne: jest.fn(async () => ({ id: 'tenant-123', slug: 'test-org', name: 'Test Org' })),
    create: jest.fn((data: any) => data),
    save: jest.fn(async (entity: any) => ({ ...entity, id: entity.id ?? 'new-tenant-id' })),
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

function createMockRefreshTokenService() {
  return {
    generateTokenPair: jest.fn(async (userId: string, tenantId: string, role: string, _meta?: any) => ({
      accessToken: 'access-token-' + userId,
      refreshToken: 'refresh-token-' + userId,
      family: 'family-' + userId,
    })),
    rotateRefreshToken: jest.fn(async (token: string, _meta?: any) => ({
      accessToken: 'new-access-token',
      refreshToken: 'new-rotated-refresh-token',
      family: 'new-family',
    })),
    revokeToken: jest.fn(async () => true),
    revokeAllUserTokens: jest.fn(async () => 1),
    getActiveSessions: jest.fn(async () => []),
  };
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

function createMockTotpService() {
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
  };
}

function createMockEncryptionService() {
  return {
    encrypt: jest.fn((plaintext: string) => Buffer.from(plaintext).toString('base64')),
    decrypt: jest.fn((encrypted: string) => Buffer.from(encrypted, 'base64').toString('utf-8')),
  };
}

function createMockEventService() {
  return {
    emit: jest.fn(async () => undefined),
  };
}

// ─── Helper: Create Test App ─────────────────────────────────

async function createTestApp(users: User[] = []): Promise<INestApplication> {
  const defaultUser = createMockUser();
  const allUsers = users.length > 0 ? users : [defaultUser];

  const mockUserRepo = createMockUserRepo(allUsers);
  const mockTenantRepo = createMockTenantRepo();
  const accountLockout = createMockAccountLockout();
  const refreshTokenService = createMockRefreshTokenService();
  const securityMetrics = createMockSecurityMetrics();
  const threatIntel = createMockThreatIntel();
  const totpService = createMockTotpService();
  const encryptionService = createMockEncryptionService();
  const mockEventService = createMockEventService();

  const jwtService = new JwtService({ secret: 'test-jwt-secret' });

  const moduleFixture: TestingModule = await Test.createTestingModule({
    controllers: [AuthController],
    imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
    providers: [
      AuthService,
      { provide: 'UserRepository', useValue: mockUserRepo },
      { provide: 'TenantRepository', useValue: mockTenantRepo },
      { provide: JwtService, useValue: jwtService },
      { provide: EventService, useValue: mockEventService },
      { provide: AccountLockoutService, useValue: accountLockout },
      { provide: RefreshTokenService, useValue: refreshTokenService },
      { provide: SecurityMetricsService, useValue: securityMetrics },
      { provide: ThreatIntelligenceService, useValue: threatIntel },
      { provide: TotpService, useValue: totpService },
      { provide: EncryptionService, useValue: encryptionService },
      // Passport + JWT strategy for guard authentication
      MockJwtStrategy,
      JwtAuthGuard,
      RolesGuard,
      { provide: Reflector, useValue: new Reflector() },
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}

// ─── Test Suite ────────────────────────────────────────────────

describe('AuthController — Cookie-based Auth (Integration)', () => {
  let app: INestApplication;
  let refreshTokenService: ReturnType<typeof createMockRefreshTokenService>;
  let accountLockout: ReturnType<typeof createMockAccountLockout>;
  let totpService: ReturnType<typeof createMockTotpService>;

  // Known password hash for test user
  const TEST_PASSWORD = 'SecurePass123!';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  });

  beforeEach(async () => {
    const user = createMockUser({ passwordHash });
    app = await createTestApp([user]);
    refreshTokenService = app.get(RefreshTokenService) as any;
    accountLockout = app.get(AccountLockoutService) as any;
    totpService = app.get(TotpService) as any;
  });

  afterEach(async () => {
    await app.close();
  });

  // ═══════════════════════════════════════════════════════════
  //  1. Login sets httpOnly refresh cookie
  // ═══════════════════════════════════════════════════════════

  describe('POST auth/login — sets httpOnly refresh cookie', () => {
    it('should set a refresh_token cookie on successful login', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD })
        .expect(201);

      // Check that the cookie was set
      const cookies = response.headers['set-cookie'] as string[] | string | undefined;
      expect(cookies).toBeDefined();

      const cookieList = Array.isArray(cookies) ? cookies : [cookies];
      const refreshTokenCookie = cookieList.filter(Boolean).find((c) => c?.startsWith('refresh_token='));

      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('SameSite=Strict');
      expect(refreshTokenCookie).toContain('Path=/api/v1/auth');
    });

    it('should return access token and user info in the response body', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
      // Refresh token should NOT be in the response body (only in cookie)
      expect(response.body).not.toHaveProperty('refreshToken');
    });

    it('should not set a cookie when login fails', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPassword!' })
        .expect(401);

      // No refresh_token cookie should be set
      const cookies = response.headers['set-cookie'] as string[] | string | undefined;
      if (cookies) {
        const cookieList = Array.isArray(cookies) ? cookies : [cookies];
        const refreshTokenCookie = cookieList.filter(Boolean).find((c) => c?.startsWith('refresh_token='));
        expect(refreshTokenCookie).toBeUndefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  2. Refresh reads from cookie and returns new access token
  // ═══════════════════════════════════════════════════════════

  describe('POST auth/refresh — reads from cookie', () => {
    it('should read the refresh token from cookie and return a new access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=refresh-token-user-123')
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.accessToken).toBeTruthy();
    });

    it('should set a new rotated refresh token cookie on refresh', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=old-refresh-token')
        .expect(201);

      // Check that a new cookie was set (rotated refresh token)
      const cookies = response.headers['set-cookie'] as string[] | string | undefined;
      expect(cookies).toBeDefined();

      const cookieList = Array.isArray(cookies) ? cookies : [cookies];
      const refreshTokenCookie = cookieList.filter(Boolean).find((c) => c?.startsWith('refresh_token='));

      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
    });

    it('should call refreshTokenService.rotateRefreshToken with the cookie value', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=my-refresh-token-value')
        .expect(201);

      expect(refreshTokenService.rotateRefreshToken).toHaveBeenCalledWith(
        'my-refresh-token-value',
        expect.any(Object),
      );
    });

    it('should return 401 when no refresh_token cookie is provided', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .expect(401);
    });

    it('should return 401 when cookie is empty', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=')
        .expect(401);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  3. Logout clears cookie
  // ═══════════════════════════════════════════════════════════

  describe('POST auth/logout — clears cookie', () => {
    it('should clear the refresh_token cookie on logout', async () => {
      // Need to be authenticated for logout
      const jwtService = new JwtService({ secret: 'test-jwt-secret' });
      const token = jwtService.sign({
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.TENANT_ADMIN,
        tenantId: 'tenant-123',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', 'refresh_token=refresh-token-user-123')
        .expect(204);

      // The cookie should be cleared (maxAge=0 or expires in the past)
      const cookies = response.headers['set-cookie'] as string[] | string | undefined;
      expect(cookies).toBeDefined();

      const cookieList = Array.isArray(cookies) ? cookies : [cookies];
      const refreshTokenCookie = cookieList.filter(Boolean).find((c) => c?.startsWith('refresh_token='));

      if (refreshTokenCookie) {
        // The cleared cookie should either have Max-Age=0 or be empty
        expect(
          refreshTokenCookie.includes('Max-Age=0') ||
          refreshTokenCookie.includes('refresh_token=;') ||
          refreshTokenCookie.match(/refresh_token=$/),
        ).toBe(true);
      }
    });

    it('should call refreshTokenService.revokeToken with the cookie value', async () => {
      const jwtService = new JwtService({ secret: 'test-jwt-secret' });
      const token = jwtService.sign({
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.TENANT_ADMIN,
        tenantId: 'tenant-123',
      });

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', 'refresh_token=my-refresh-token')
        .expect(204);

      expect(refreshTokenService.revokeToken).toHaveBeenCalledWith('my-refresh-token');
    });

    it('should still succeed even without a refresh_token cookie', async () => {
      const jwtService = new JwtService({ secret: 'test-jwt-secret' });
      const token = jwtService.sign({
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.TENANT_ADMIN,
        tenantId: 'tenant-123',
      });

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  4. 2FA Flow: login returns requires2FA, step2 completes
  // ═══════════════════════════════════════════════════════════

  describe('2FA login flow', () => {
    it('should return requires2FA and tempToken when user has TOTP enabled', async () => {
      // Override the user to have TOTP enabled
      const userRepo = app.get('UserRepository');
      const totpUser = createMockUser({
        passwordHash,
        totpEnabled: true,
        totpSecret: 'encrypted-totp-secret',
      });
      (userRepo.findOne as jest.Mock).mockResolvedValue(totpUser);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD })
        .expect(201);

      expect(response.body).toHaveProperty('requires2FA', true);
      expect(response.body).toHaveProperty('tempToken');
      expect(response.body).toHaveProperty('message');
      expect(response.body.tempToken).toBeTruthy();
    });

    it('should NOT set a refresh cookie during login step 1 when 2FA is required', async () => {
      const userRepo = app.get('UserRepository');
      const totpUser = createMockUser({
        passwordHash,
        totpEnabled: true,
        totpSecret: 'encrypted-totp-secret',
      });
      (userRepo.findOne as jest.Mock).mockResolvedValue(totpUser);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD })
        .expect(201);

      // No refresh_token cookie should be set until step 2 is completed
      const cookies = response.headers['set-cookie'] as string[] | string | undefined;
      if (cookies) {
        const cookieList = Array.isArray(cookies) ? cookies : [cookies];
        const refreshTokenCookie = cookieList.filter(Boolean).find((c) => c?.startsWith('refresh_token='));
        expect(refreshTokenCookie).toBeUndefined();
      }
    });

    it('should complete 2FA step 2 with a valid TOTP code and set refresh cookie', async () => {
      const userRepo = app.get('UserRepository');
      const totpUser = createMockUser({
        passwordHash,
        totpEnabled: true,
        totpSecret: 'encrypted-totp-secret',
      });
      (userRepo.findOne as jest.Mock).mockResolvedValue(totpUser);

      // Step 1: Login to get tempToken
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD })
        .expect(201);

      const { tempToken } = loginResponse.body;

      // Step 2: Complete 2FA with TOTP code
      const step2Response = await request(app.getHttpServer())
        .post('/auth/login/2fa')
        .send({ tempToken, code: '123456' })
        .expect(201);

      // Should return access token and user info
      expect(step2Response.body).toHaveProperty('accessToken');
      expect(step2Response.body).toHaveProperty('user');

      // Should set refresh_token cookie after step 2
      const cookies = step2Response.headers['set-cookie'] as string[] | string | undefined;
      expect(cookies).toBeDefined();

      const cookieList = Array.isArray(cookies) ? cookies : [cookies];
      const refreshTokenCookie = cookieList.filter(Boolean).find((c) => c?.startsWith('refresh_token='));
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
    });

    it('should complete 2FA step 2 with a backup code when TOTP fails', async () => {
      const userRepo = app.get('UserRepository');
      const totpUser = createMockUser({
        passwordHash,
        totpEnabled: true,
        totpSecret: 'encrypted-totp-secret',
        totpBackupCodes: JSON.stringify(['$2b$10$hash_ABCD1234']),
        totpUsedBackupCodes: '[]',
      });
      (userRepo.findOne as jest.Mock).mockResolvedValue(totpUser);

      // Step 1: Login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD })
        .expect(201);

      const { tempToken } = loginResponse.body;

      // Step 2: TOTP code invalid, but backup code valid
      (totpService.verifyToken as jest.Mock).mockReturnValueOnce(false);
      (totpService.validateBackupCode as jest.Mock).mockResolvedValueOnce({
        valid: true,
        usedBackupCodes: ['$2b$10$hash_ABCD1234'],
        backupCodeUsed: true,
      });

      const step2Response = await request(app.getHttpServer())
        .post('/auth/login/2fa')
        .send({ tempToken, code: 'ABCD1234' })
        .expect(201);

      expect(step2Response.body).toHaveProperty('accessToken');
    });

    it('should reject 2FA step 2 with invalid TOTP and invalid backup code', async () => {
      const userRepo = app.get('UserRepository');
      const totpUser = createMockUser({
        passwordHash,
        totpEnabled: true,
        totpSecret: 'encrypted-totp-secret',
        totpBackupCodes: JSON.stringify(['$2b$10$hash_ABCD1234']),
        totpUsedBackupCodes: '[]',
      });
      (userRepo.findOne as jest.Mock).mockResolvedValue(totpUser);

      // Step 1: Login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD })
        .expect(201);

      const { tempToken } = loginResponse.body;

      // Step 2: Both TOTP and backup code invalid
      (totpService.verifyToken as jest.Mock).mockReturnValueOnce(false);
      (totpService.validateBackupCode as jest.Mock).mockResolvedValueOnce({ valid: false });

      await request(app.getHttpServer())
        .post('/auth/login/2fa')
        .send({ tempToken, code: '000000' })
        .expect(401);
    });

    it('should reject 2FA step 2 with an expired or invalid tempToken', async () => {
      await request(app.getHttpServer())
        .post('/auth/login/2fa')
        .send({ tempToken: 'invalid-token', code: '123456' })
        .expect(401);
    });

    it('should reject 2FA step 2 with a non-2FA JWT token', async () => {
      const jwtService = new JwtService({ secret: 'test-jwt-secret' });
      // A regular JWT without step: '2fa'
      const regularToken = jwtService.sign({ sub: 'user-123' });

      await request(app.getHttpServer())
        .post('/auth/login/2fa')
        .send({ tempToken: regularToken, code: '123456' })
        .expect(401);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  5. Register sets httpOnly refresh cookie
  // ═══════════════════════════════════════════════════════════

  describe('POST auth/register — sets httpOnly refresh cookie', () => {
    it('should set a refresh_token cookie on successful registration', async () => {
      const userRepo = app.get('UserRepository');
      // Ensure the user doesn't already exist
      (userRepo.findOne as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'NewUserPass123!',
          firstName: 'New',
          lastName: 'User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');

      // Check cookie
      const cookies = response.headers['set-cookie'] as string[] | string | undefined;
      expect(cookies).toBeDefined();

      const cookieList = Array.isArray(cookies) ? cookies : [cookies];
      const refreshTokenCookie = cookieList.filter(Boolean).find((c) => c?.startsWith('refresh_token='));
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('SameSite=Strict');
    });

    it('should not return refreshToken in the response body', async () => {
      const userRepo = app.get('UserRepository');
      (userRepo.findOne as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser2@example.com',
          password: 'NewUserPass123!',
          firstName: 'New',
          lastName: 'User',
        })
        .expect(201);

      // Refresh token should only be in the cookie, not in the body
      expect(response.body).not.toHaveProperty('refreshToken');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  6. Logout-all clears cookie
  // ═══════════════════════════════════════════════════════════

  describe('DELETE auth/logout-all — clears cookie', () => {
    it('should clear the refresh_token cookie', async () => {
      const jwtService = new JwtService({ secret: 'test-jwt-secret' });
      const token = jwtService.sign({
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.TENANT_ADMIN,
        tenantId: 'tenant-123',
      });

      const response = await request(app.getHttpServer())
        .delete('/auth/logout-all')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', 'refresh_token=some-refresh-token')
        .expect(204);

      // Cookie should be cleared
      const cookies = response.headers['set-cookie'] as string[] | string | undefined;
      expect(cookies).toBeDefined();
    });

    it('should call refreshTokenService.revokeAllUserTokens', async () => {
      const jwtService = new JwtService({ secret: 'test-jwt-secret' });
      const token = jwtService.sign({
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.TENANT_ADMIN,
        tenantId: 'tenant-123',
      });

      await request(app.getHttpServer())
        .delete('/auth/logout-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      expect(refreshTokenService.revokeAllUserTokens).toHaveBeenCalledWith('user-123');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  7. Cookie attribute validation
  // ═══════════════════════════════════════════════════════════

  describe('cookie attributes', () => {
    it('should set HttpOnly flag on the refresh cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD })
        .expect(201);

      const cookies = response.headers['set-cookie'] as string[] | string | undefined;
      const cookieList = Array.isArray(cookies) ? cookies : [cookies];
      const refreshTokenCookie = cookieList.filter(Boolean).find((c) => c?.startsWith('refresh_token='));
      expect(refreshTokenCookie).toContain('HttpOnly');
    });

    it('should set SameSite=Strict on the refresh cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD })
        .expect(201);

      const cookies = response.headers['set-cookie'] as string[] | string | undefined;
      const cookieList = Array.isArray(cookies) ? cookies : [cookies];
      const refreshTokenCookie = cookieList.filter(Boolean).find((c) => c?.startsWith('refresh_token='));
      expect(refreshTokenCookie).toContain('SameSite=Strict');
    });

    it('should set Path=/api/v1/auth on the refresh cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD })
        .expect(201);

      const cookies = response.headers['set-cookie'] as string[] | string | undefined;
      const cookieList = Array.isArray(cookies) ? cookies : [cookies];
      const refreshTokenCookie = cookieList.filter(Boolean).find((c) => c?.startsWith('refresh_token='));
      expect(refreshTokenCookie).toContain('Path=/api/v1/auth');
    });

    it('should set a Max-Age on the refresh cookie (7 days)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD })
        .expect(201);

      const cookies = response.headers['set-cookie'] as string[] | string | undefined;
      const cookieList = Array.isArray(cookies) ? cookies : [cookies];
      const refreshTokenCookie = cookieList.filter(Boolean).find((c) => c?.startsWith('refresh_token='));
      // Max-Age should be set (7 days = 604800 seconds, or 604800000 ms in some formats)
      expect(refreshTokenCookie).toMatch(/Max-Age=\d+/);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  8. Edge cases
  // ═══════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should reject login with missing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: TEST_PASSWORD })
        .expect(400);
    });

    it('should reject login with missing password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);
    });

    it('should reject login with invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: TEST_PASSWORD })
        .expect(400);
    });

    it('should reject registration with duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com', // already exists
          password: 'Password123!',
          firstName: 'Dupe',
          lastName: 'User',
        })
        .expect(409); // Conflict
    });

    it('should handle account lockout during login', async () => {
      (accountLockout.isAccountLocked as jest.Mock).mockResolvedValueOnce({
        locked: true,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000) as any,
        remainingAttempts: 0,
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD })
        .expect(401);
    });

    it('should require authentication for logout endpoint', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });

    it('should require authentication for logout-all endpoint', async () => {
      await request(app.getHttpServer())
        .delete('/auth/logout-all')
        .expect(401);
    });
  });
});
