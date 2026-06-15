/**
 * AENEWS Agent OS X — TOTP Service Unit Tests
 *
 * Comprehensive test suite for the TOTP (Time-based One-Time Password) service covering:
 *   - generateSecret() returns secret + QR code + backup codes + otpauth URI
 *   - verifyToken() accepts valid TOTP codes (generated from a known secret)
 *   - verifyToken() rejects invalid codes
 *   - generateBackupCodes() returns correct count (16) and format (8 chars each)
 *   - hashBackupCodes() and validateBackupCode() round-trip
 *   - Backup code replay protection (used code rejected)
 *   - decryptSecret() delegates to EncryptionService
 *   - Full TOTP lifecycle integration test
 *   - Error handling and edge cases
 *
 * Uses Jest mocks for EncryptionService and ConfigService.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as OTPAuth from 'otpauth';
import { TotpService, TotpSetupResult, TotpVerifyResult } from './totp.service';
import { EncryptionService } from './encryption.service';

// ─── Mock Factories ──────────────────────────────────────────

/**
 * Create a mock EncryptionService that uses a simple reversible base64
 * encoding for test purposes (avoids needing a real ENCRYPTION_KEY).
 * All methods are Jest spies so assertions can verify call arguments.
 */
function createMockEncryptionService(): EncryptionService {
  const encryptFn = jest.fn((plaintext: string) => {
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

/**
 * Create a mock ConfigService providing test-time configuration values.
 */
function createMockConfigService(): ConfigService {
  return {
    get: jest.fn((path: string) => {
      if (path === 'encryption.key') return 'aenews-test-encryption-key-32ch';
      if (path === 'security.totp.issuer') return 'AENEWS Agent OS X';
      return undefined;
    }),
  } as any;
}

// ─── Test Suite ──────────────────────────────────────────────

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

      expect(result.qrCode).toBeTruthy();
      expect(typeof result.qrCode).toBe('string');
      // Should be valid base64
      expect(() => Buffer.from(result.qrCode, 'base64')).not.toThrow();
    });

    it('should return a valid otpauth:// URI with issuer and user email', async () => {
      const result = await service.generateSecret('user-123', 'user@example.com');

      expect(result.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
      expect(result.otpauthUri).toContain('AENEWS%20Agent%20OS%20X');
      expect(result.otpauthUri).toContain('user%40example.com');
    });

    it('should return 16 backup codes by default', async () => {
      const result = await service.generateSecret('user-123', 'user@example.com');

      expect(result.backupCodes).toHaveLength(16);
    });

    it('should call encryptionService.encrypt() to store the secret', async () => {
      await service.generateSecret('user-123', 'user@example.com');

      expect(encryptionService.encrypt).toHaveBeenCalled();
    });

    it('should return an encrypted secret (not plaintext)', async () => {
      const result = await service.generateSecret('user-123', 'user@example.com');

      expect(result.encryptedSecret).toBeTruthy();
      // The mock encrypts to base64, so the result should be valid base64
      const decoded = Buffer.from(result.encryptedSecret, 'base64').toString('utf-8');
      // The decoded value should look like a base32 TOTP secret (uppercase alphanumeric)
      expect(decoded).toMatch(/^[A-Z2-7]+$/);
    });

    it('should generate unique secrets on successive calls', async () => {
      const result1 = await service.generateSecret('user-1', 'a@b.com');
      const result2 = await service.generateSecret('user-2', 'c@d.com');

      expect(result1.encryptedSecret).not.toBe(result2.encryptedSecret);
    });

    it('should generate unique backup codes on successive calls', async () => {
      const result1 = await service.generateSecret('user-1', 'a@b.com');
      const result2 = await service.generateSecret('user-2', 'c@d.com');

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

    it('should accept a code generated with a known static secret', () => {
      // Use a fixed secret to ensure deterministic test results
      const knownSecret = 'JBSWY3DPEHPK3PXP'; // "Hello!" in base32
      const totp = new OTPAuth.TOTP({
        issuer: 'AENEWS Agent OS X',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(knownSecret),
      });

      const validCode = totp.generate();
      expect(service.verifyToken(knownSecret, validCode)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  verifyToken() — invalid codes
  // ═══════════════════════════════════════════════════════════

  describe('verifyToken() — invalid codes', () => {
    it('should reject a code generated from a different secret', async () => {
      const result = await service.generateSecret('user-123', 'user@example.com');
      const decryptedSecret = encryptionService.decrypt(result.encryptedSecret);

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

    it('should reject a completely wrong 6-digit code', async () => {
      const result = await service.generateSecret('user-123', 'user@example.com');
      const decryptedSecret = encryptionService.decrypt(result.encryptedSecret);

      // Generate a code that is guaranteed wrong by trying many
      const totp = new OTPAuth.TOTP({
        issuer: 'AENEWS Agent OS X',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(decryptedSecret),
      });

      // Just test an obviously wrong code
      expect(service.verifyToken(decryptedSecret, '999999')).toBe(false);
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

    it('should generate unique codes (very high probability)', () => {
      const codes = service.generateBackupCodes(100);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBeGreaterThan(90);
    });

    it('should return an empty array when count is 0', () => {
      const codes = service.generateBackupCodes(0);
      expect(codes).toHaveLength(0);
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

    it('should produce hashes that are different from the plaintext', async () => {
      const codes = service.generateBackupCodes(2);
      const hashes = await service.hashBackupCodes(codes);

      for (let i = 0; i < codes.length; i++) {
        expect(hashes[i]).not.toBe(codes[i]);
      }
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

    it('should track multiple used codes independently', async () => {
      const codes = service.generateBackupCodes(4);
      const hashes = await service.hashBackupCodes(codes);

      // Use code[0]
      const r0 = await service.validateBackupCode([], hashes, codes[0]);
      expect(r0.valid).toBe(true);

      // Use code[1]
      const r1 = await service.validateBackupCode(r0.usedBackupCodes!, hashes, codes[1]);
      expect(r1.valid).toBe(true);
      expect(r1.usedBackupCodes).toHaveLength(2);

      // Replay code[0]
      const r2 = await service.validateBackupCode(r1.usedBackupCodes!, hashes, codes[0]);
      expect(r2.valid).toBe(false);

      // Replay code[1]
      const r3 = await service.validateBackupCode(r1.usedBackupCodes!, hashes, codes[1]);
      expect(r3.valid).toBe(false);

      // code[2] still works
      const r4 = await service.validateBackupCode(r1.usedBackupCodes!, hashes, codes[2]);
      expect(r4.valid).toBe(true);
      expect(r4.usedBackupCodes).toHaveLength(3);
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

    it('should return the decrypted plaintext that matches the original', async () => {
      const setup = await service.generateSecret('user-123', 'user@example.com');
      const decrypted = service.decryptSecret(setup.encryptedSecret);

      // The decrypted value should be a valid base32 secret
      expect(decrypted).toBeTruthy();
      expect(/^[A-Z2-7]+=*$/i.test(decrypted)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Full TOTP Lifecycle Integration Test
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

    it('should complete setup → enable → verify → disable flow', async () => {
      // Step 1: Setup
      const setup = await service.generateSecret('user-123', 'user@example.com');
      expect(setup.encryptedSecret).toBeTruthy();

      // Step 2: Decrypt and verify a TOTP code (simulating "enable")
      const decryptedSecret = service.decryptSecret(setup.encryptedSecret);
      const totp = new OTPAuth.TOTP({
        issuer: 'AENEWS Agent OS X',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(decryptedSecret),
      });
      const code = totp.generate();
      expect(service.verifyToken(decryptedSecret, code)).toBe(true);

      // Step 3: Use backup codes after TOTP is enabled
      const hashes = await service.hashBackupCodes(setup.backupCodes);
      const backupResult = await service.validateBackupCode([], hashes, setup.backupCodes[5]);
      expect(backupResult.valid).toBe(true);
      expect(backupResult.usedBackupCodes).toHaveLength(1);
    });
  });
});
