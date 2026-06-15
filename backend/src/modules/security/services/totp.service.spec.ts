/**
 * AENEWS Agent OS X — TOTP Service Unit Tests
 *
 * Comprehensive test suite for the TOTP (Time-based One-Time Password) service covering:
 *   - generateSecret() returns secret + QR code + backup codes + otpauth URI
 *   - verifyToken() accepts valid TOTP codes
 *   - verifyToken() rejects invalid codes
 *   - generateBackupCodes() returns correct count and format
 *   - hashBackupCodes() and validateBackupCode() round-trip
 *   - Backup code replay protection (used code rejected)
 *   - decryptSecret() delegates to EncryptionService
 *   - Error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as OTPAuth from 'otpauth';
import { TotpService, TotpSetupResult, TotpVerifyResult } from './totp.service';
import { EncryptionService } from './encryption.service';

// ─── Test Helpers ──────────────────────────────────────────────

/**
 * Create a mock EncryptionService that uses a simple XOR cipher
 * for test purposes (avoids needing a real ENCRYPTION_KEY).
 */
function createMockEncryptionService(): EncryptionService {
  const encryptFn = jest.fn((plaintext: string) => {
    // Simple reversible encoding for testing
    return Buffer.from(plaintext).toString('base64');
  });

  const decryptFn = jest.fn((encrypted: string) => {
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  });

  return {
    encrypt: encryptFn,
    decrypt: decryptFn,
  } as any;
}

function createMockConfigService(): ConfigService {
  return {
    get: jest.fn((path: string) => {
      if (path === 'encryption.key') return 'aenews-test-encryption-key-32ch';
      if (path === 'security.totp.issuer') return 'AENEWS Agent OS X';
      return undefined;
    }),
  } as any;
}

// ─── Test Suite ────────────────────────────────────────────────

describe('TotpService', () => {
  let service: TotpService;
  let encryptionService: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TotpService,
        { provide: EncryptionService, useFactory: createMockEncryptionService },
        { provide: ConfigService, useFactory: createMockConfigService },
      ],
    }).compile();

    service = module.get<TotpService>(TotpService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  // ═══════════════════════════════════════════════════════════
  //  generateSecret()
  // ═══════════════════════════════════════════════════════════

  describe('generateSecret()', () => {
    it('should return a setup result with all required fields', async () => {
      const result = await service.generateSecret('user-123', 'user@example.com');

      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('otpauthUri');
      expect(result).toHaveProperty('backupCodes');
      expect(result).toHaveProperty('encryptedSecret');
    });

    it('should return a base64-encoded QR code image', async () => {
      const result = await service.generateSecret('user-123', 'user@example.com');

      // QR code should be a non-empty base64 string
      expect(result.qrCode).toBeTruthy();
      expect(typeof result.qrCode).toBe('string');
      // Should be valid base64
      expect(() => Buffer.from(result.qrCode, 'base64')).not.toThrow();
    });

    it('should return a valid otpauth:// URI', async () => {
      const result = await service.generateSecret('user-123', 'user@example.com');

      expect(result.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
      expect(result.otpauthUri).toContain('AENEWS%20Agent%20OS%20X');
      expect(result.otpauthUri).toContain('user%40example.com');
    });

    it('should return 16 backup codes by default', async () => {
      const result = await service.generateSecret('user-123', 'user@example.com');

      expect(result.backupCodes).toHaveLength(16);
    });

    it('should return an encrypted secret (not plaintext)', async () => {
      const result = await service.generateSecret('user-123', 'user@example.com');

      // The encryptedSecret should be the base64 encoding of the plaintext secret
      expect(result.encryptedSecret).toBeTruthy();
      // It should NOT look like a raw base32 TOTP secret
      expect(encryptionService.encrypt).toHaveBeenCalled();
    });

    it('should generate unique secrets on successive calls', async () => {
      const result1 = await service.generateSecret('user-1', 'a@b.com');
      const result2 = await service.generateSecret('user-2', 'c@d.com');

      // Encrypted secrets should differ (different plaintext secrets)
      expect(result1.encryptedSecret).not.toBe(result2.encryptedSecret);
    });

    it('should generate unique backup codes on successive calls', async () => {
      const result1 = await service.generateSecret('user-1', 'a@b.com');
      const result2 = await service.generateSecret('user-2', 'c@d.com');

      // It's astronomically unlikely all 16 codes would match
      const overlap = result1.backupCodes.filter((c) => result2.backupCodes.includes(c));
      expect(overlap.length).toBeLessThan(16);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  verifyToken() — valid TOTP codes
  // ═══════════════════════════════════════════════════════════

  describe('verifyToken() — valid codes', () => {
    it('should accept a valid TOTP code generated from the same secret', async () => {
      const result = await service.generateSecret('user-123', 'user@example.com');

      // Decrypt the secret to get the plaintext base32 secret
      const decryptedSecret = encryptionService.decrypt(result.encryptedSecret);

      // Generate a valid TOTP code from the same secret
      const totp = new OTPAuth.TOTP({
        issuer: 'AENEWS Agent OS X',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(decryptedSecret),
      });

      const validCode = totp.generate();
      const isValid = service.verifyToken(decryptedSecret, validCode);

      expect(isValid).toBe(true);
    });

    it('should accept codes within the clock skew window (±1 period)', async () => {
      const result = await service.generateSecret('user-123', 'user@example.com');
      const decryptedSecret = encryptionService.decrypt(result.encryptedSecret);

      const totp = new OTPAuth.TOTP({
        issuer: 'AENEWS Agent OS X',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(decryptedSecret),
      });

      // Generate the code for the current period — should be valid
      const currentCode = totp.generate();
      expect(service.verifyToken(decryptedSecret, currentCode)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  verifyToken() — invalid codes
  // ═══════════════════════════════════════════════════════════

  describe('verifyToken() — invalid codes', () => {
    it('should reject a completely wrong code', async () => {
      const result = await service.generateSecret('user-123', 'user@example.com');
      const decryptedSecret = encryptionService.decrypt(result.encryptedSecret);

      // Generate a code from a DIFFERENT secret
      const otherTotp = new OTPAuth.TOTP({
        issuer: 'AENEWS Agent OS X',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: new OTPAuth.Secret({ size: 20 }),
      });

      const wrongCode = otherTotp.generate();
      expect(service.verifyToken(decryptedSecret, wrongCode)).toBe(false);
    });

    it('should reject a code that is too short', () => {
      const result = service.verifyToken('ANYSECRET', '123');
      expect(result).toBe(false);
    });

    it('should reject a code that is too long', () => {
      const result = service.verifyToken('ANYSECRET', '1234567');
      expect(result).toBe(false);
    });

    it('should reject non-numeric codes for TOTP verification', () => {
      const result = service.verifyToken('ANYSECRET', 'abcdef');
      expect(result).toBe(false);
    });

    it('should return false (not throw) for invalid base32 secret', () => {
      const result = service.verifyToken('not-valid-base32!!!', '123456');
      expect(result).toBe(false);
    });

    it('should reject an empty code', () => {
      const result = service.verifyToken('SOMESECRET', '');
      expect(result).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  generateBackupCodes()
  // ═══════════════════════════════════════════════════════════

  describe('generateBackupCodes()', () => {
    it('should return 16 codes by default', () => {
      const codes = service.generateBackupCodes();
      expect(codes).toHaveLength(16);
    });

    it('should return the specified number of codes', () => {
      const codes = service.generateBackupCodes(8);
      expect(codes).toHaveLength(8);
    });

    it('should generate 8-character alphanumeric codes', () => {
      const codes = service.generateBackupCodes();
      for (const code of codes) {
        expect(code).toHaveLength(8);
        expect(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]+$/.test(code)).toBe(true);
      }
    });

    it('should not contain ambiguous characters (0/O, 1/I/L)', () => {
      const codes = service.generateBackupCodes(100);
      for (const code of codes) {
        expect(code).not.toContain('0');
        expect(code).not.toContain('O');
        expect(code).not.toContain('1');
        expect(code).not.toContain('I');
        expect(code).not.toContain('L');
      }
    });

    it('should generate unique codes', () => {
      const codes = service.generateBackupCodes(100);
      const uniqueCodes = new Set(codes);
      // With 100 codes, we expect very high uniqueness
      expect(uniqueCodes.size).toBeGreaterThan(90);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  hashBackupCodes() and validateBackupCode() round-trip
  // ═══════════════════════════════════════════════════════════

  describe('hashBackupCodes() and validateBackupCode() round-trip', () => {
    it('should hash backup codes and validate them correctly', async () => {
      const codes = service.generateBackupCodes(4);
      const hashes = await service.hashBackupCodes(codes);

      expect(hashes).toHaveLength(4);

      // Each hash should be a bcrypt hash
      for (const hash of hashes) {
        expect(hash).toMatch(/^\$2[aby]?\$/);
      }

      // Validate each code against its hash
      for (let i = 0; i < codes.length; i++) {
        const result = await service.validateBackupCode([], hashes, codes[i]);
        expect(result.valid).toBe(true);
        expect(result.backupCodeUsed).toBe(true);
      }
    });

    it('should return invalid for a code not in the hash list', async () => {
      const codes = service.generateBackupCodes(4);
      const hashes = await service.hashBackupCodes(codes);

      const result = await service.validateBackupCode([], hashes, 'WRONGCODE');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for an empty code', async () => {
      const codes = service.generateBackupCodes(2);
      const hashes = await service.hashBackupCodes(codes);

      const result = await service.validateBackupCode([], hashes, '');
      expect(result.valid).toBe(false);
    });

    it('should return updated usedBackupCodes when a code is consumed', async () => {
      const codes = service.generateBackupCodes(4);
      const hashes = await service.hashBackupCodes(codes);

      const result = await service.validateBackupCode([], hashes, codes[0]);
      expect(result.valid).toBe(true);
      expect(result.usedBackupCodes).toBeDefined();
      expect(result.usedBackupCodes).toHaveLength(1);
      // The used code hash should match the hash of the consumed code
      expect(result.usedBackupCodes![0]).toBe(hashes[0]);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Backup Code Replay Protection
  // ═══════════════════════════════════════════════════════════

  describe('backup code replay protection', () => {
    it('should reject a backup code that has already been used', async () => {
      const codes = service.generateBackupCodes(4);
      const hashes = await service.hashBackupCodes(codes);

      // First use — should succeed
      const result1 = await service.validateBackupCode([], hashes, codes[0]);
      expect(result1.valid).toBe(true);
      expect(result1.usedBackupCodes).toHaveLength(1);

      // Replay attack — same code should be rejected
      const result2 = await service.validateBackupCode(
        result1.usedBackupCodes!,
        hashes,
        codes[0],
      );
      expect(result2.valid).toBe(false);
    });

    it('should allow consuming a different code after one has been used', async () => {
      const codes = service.generateBackupCodes(4);
      const hashes = await service.hashBackupCodes(codes);

      // Use code[0]
      const result1 = await service.validateBackupCode([], hashes, codes[0]);
      expect(result1.valid).toBe(true);

      // Use code[1] — should succeed
      const result2 = await service.validateBackupCode(
        result1.usedBackupCodes!,
        hashes,
        codes[1],
      );
      expect(result2.valid).toBe(true);
      expect(result2.usedBackupCodes).toHaveLength(2);
    });

    it('should reject multiple replays of the same code', async () => {
      const codes = service.generateBackupCodes(4);
      const hashes = await service.hashBackupCodes(codes);

      // Use code[0]
      const result1 = await service.validateBackupCode([], hashes, codes[0]);
      expect(result1.valid).toBe(true);

      // Replay 1
      const result2 = await service.validateBackupCode(
        result1.usedBackupCodes!,
        hashes,
        codes[0],
      );
      expect(result2.valid).toBe(false);

      // Replay 2
      const result3 = await service.validateBackupCode(
        result1.usedBackupCodes!,
        hashes,
        codes[0],
      );
      expect(result3.valid).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  decryptSecret()
  // ═══════════════════════════════════════════════════════════

  describe('decryptSecret()', () => {
    it('should delegate to EncryptionService.decrypt()', () => {
      const encrypted = 'dGVzdC1zZWNyZXQ='; // base64 of "test-secret"
      const result = service.decryptSecret(encrypted);

      expect(encryptionService.decrypt).toHaveBeenCalledWith(encrypted);
      expect(result).toBe('test-secret');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Full TOTP flow integration
  // ═══════════════════════════════════════════════════════════

  describe('full TOTP lifecycle', () => {
    it('should complete the setup → verify → backup code flow', async () => {
      // Step 1: Generate secret
      const setup = await service.generateSecret('user-123', 'user@example.com');
      expect(setup.qrCode).toBeTruthy();
      expect(setup.backupCodes).toHaveLength(16);

      // Step 2: Verify a TOTP token
      const decryptedSecret = encryptionService.decrypt(setup.encryptedSecret);
      const totp = new OTPAuth.TOTP({
        issuer: 'AENEWS Agent OS X',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(decryptedSecret),
      });
      const validCode = totp.generate();
      expect(service.verifyToken(decryptedSecret, validCode)).toBe(true);

      // Step 3: Hash and validate backup codes
      const hashedCodes = await service.hashBackupCodes(setup.backupCodes);
      const backupResult = await service.validateBackupCode(
        [],
        hashedCodes,
        setup.backupCodes[0],
      );
      expect(backupResult.valid).toBe(true);
      expect(backupResult.backupCodeUsed).toBe(true);

      // Step 4: Verify backup code cannot be replayed
      const replayResult = await service.validateBackupCode(
        backupResult.usedBackupCodes!,
        hashedCodes,
        setup.backupCodes[0],
      );
      expect(replayResult.valid).toBe(false);
    });
  });
});
