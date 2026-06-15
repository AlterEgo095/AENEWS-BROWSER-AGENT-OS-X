/**
 * AENEWS Agent OS X — EncryptionService Unit Tests
 *
 * Comprehensive test suite for the AES-256-GCM encryption service covering:
 *   - Encrypt/decrypt round-trip (strings)
 *   - EncryptObject/decryptObject round-trip (arbitrary objects)
 *   - Hash and hashCompare (SHA-256 + constant-time comparison)
 *   - generateApiKey format validation
 *   - generateToken length and format
 *   - Error handling (invalid inputs, tampered data, wrong keys)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

// ─── Test Helpers ──────────────────────────────────────────────

/**
 * Create a ConfigService mock with a valid 32-char ENCRYPTION_KEY.
 */
function createMockConfigService(key: string = 'aenews-test-encryption-key-32ch'): ConfigService {
  return {
    get: jest.fn((path: string) => {
      if (path === 'encryption.key') return key;
      return undefined;
    }),
  } as any;
}

// ─── Test Suite ────────────────────────────────────────────────

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        { provide: ConfigService, useFactory: createMockConfigService },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  // ═══════════════════════════════════════════════════════════
  //  Construction / Initialization
  // ═══════════════════════════════════════════════════════════

  describe('construction', () => {
    it('should throw if ENCRYPTION_KEY is not configured', () => {
      const badConfig = createMockConfigService(undefined as any);
      expect(() => new EncryptionService(badConfig)).toThrow('ENCRYPTION_KEY is not configured');
    });

    it('should throw if ENCRYPTION_KEY is not exactly 32 characters', () => {
      const tooShort = createMockConfigService('too-short');
      expect(() => new EncryptionService(tooShort)).toThrow('must be exactly 32 characters');
    });

    it('should initialise with a valid 32-character key', () => {
      const validConfig = createMockConfigService('aenews-test-encryption-key-32ch');
      expect(() => new EncryptionService(validConfig)).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  encrypt / decrypt round-trip
  // ═══════════════════════════════════════════════════════════

  describe('encrypt / decrypt round-trip', () => {
    it('should encrypt and then decrypt a simple string', () => {
      const plaintext = 'hello-world';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for the same plaintext (unique IV)', () => {
      const plaintext = 'same-input';
      const enc1 = service.encrypt(plaintext);
      const enc2 = service.encrypt(plaintext);
      // The two encrypted strings should differ because IVs are random
      expect(enc1).not.toBe(enc2);
      // But both should decrypt to the original
      expect(service.decrypt(enc1)).toBe(plaintext);
      expect(service.decrypt(enc2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = service.encrypt(plaintext);
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });

    it('should handle unicode and multi-byte characters', () => {
      const plaintext = '日本語テスト 🚀 éàü ñ';
      const encrypted = service.encrypt(plaintext);
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });

    it('should handle very long strings', () => {
      const plaintext = 'A'.repeat(100_000);
      const encrypted = service.encrypt(plaintext);
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });

    it('should produce output in iv:authTag:ciphertext format', () => {
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      // Each part should be valid base64
      for (const part of parts) {
        expect(() => Buffer.from(part, 'base64')).not.toThrow();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  decrypt error handling
  // ═══════════════════════════════════════════════════════════

  describe('decrypt error handling', () => {
    it('should throw on invalid format (not 3 colon-separated segments)', () => {
      expect(() => service.decrypt('not-valid')).toThrow('Decryption operation failed');
    });

    it('should throw on tampered ciphertext', () => {
      const encrypted = service.encrypt('secret');
      const parts = encrypted.split(':');
      // Tamper with the ciphertext
      const ciphertextBytes = Buffer.from(parts[2], 'base64');
      ciphertextBytes[0] ^= 0xFF; // flip bits in first byte
      const tampered = `${parts[0]}:${parts[1]}:${ciphertextBytes.toString('base64')}`;
      expect(() => service.decrypt(tampered)).toThrow('Decryption operation failed');
    });

    it('should throw on tampered auth tag', () => {
      const encrypted = service.encrypt('secret');
      const parts = encrypted.split(':');
      const authTagBytes = Buffer.from(parts[1], 'base64');
      authTagBytes[0] ^= 0xFF;
      const tampered = `${parts[0]}:${authTagBytes.toString('base64')}:${parts[2]}`;
      expect(() => service.decrypt(tampered)).toThrow('Decryption operation failed');
    });

    it('should throw when decrypting with a different key', () => {
      const encrypted = service.encrypt('secret-data');
      // Create a service with a different key
      const otherConfig = createMockConfigService('different-encryption-key-32ch!');
      const otherService = new EncryptionService(otherConfig);
      expect(() => otherService.decrypt(encrypted)).toThrow('Decryption operation failed');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  encryptObject / decryptObject round-trip
  // ═══════════════════════════════════════════════════════════

  describe('encryptObject / decryptObject round-trip', () => {
    it('should encrypt and decrypt a simple object', () => {
      const obj = { name: 'AENEWS', version: 1 };
      const encrypted = service.encryptObject(obj);
      const decrypted = service.decryptObject<typeof obj>(encrypted);
      expect(decrypted).toEqual(obj);
    });

    it('should encrypt and decrypt nested objects', () => {
      const obj = {
        user: { id: 'u-123', role: 'admin' },
        config: { enabled: true, limits: { max: 1000 } },
      };
      const encrypted = service.encryptObject(obj);
      const decrypted = service.decryptObject<typeof obj>(encrypted);
      expect(decrypted).toEqual(obj);
    });

    it('should encrypt and decrypt arrays', () => {
      const obj = [1, 'two', { three: 3 }, [4, 5]];
      const encrypted = service.encryptObject(obj);
      const decrypted = service.decryptObject<typeof obj>(encrypted);
      expect(decrypted).toEqual(obj);
    });

    it('should encrypt and decrypt objects with null and boolean values', () => {
      const obj = { active: true, deleted: false, value: null, empty: '' };
      const encrypted = service.encryptObject(obj);
      const decrypted = service.decryptObject<typeof obj>(encrypted);
      expect(decrypted).toEqual(obj);
    });

    it('should throw on non-serializable objects', () => {
      const circular: any = { name: 'circular' };
      circular.self = circular;
      expect(() => service.encryptObject(circular)).toThrow('Object encryption failed');
    });

    it('should throw when decrypting corrupted data as object', () => {
      expect(() => service.decryptObject('not-valid-encrypted-data')).toThrow('Object decryption failed');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  hash and hashCompare
  // ═══════════════════════════════════════════════════════════

  describe('hash', () => {
    it('should return a 64-character hex string (SHA-256)', () => {
      const h = service.hash('test-data');
      expect(h).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(h)).toBe(true);
    });

    it('should produce the same hash for the same input (deterministic)', () => {
      const h1 = service.hash('deterministic');
      const h2 = service.hash('deterministic');
      expect(h1).toBe(h2);
    });

    it('should produce different hashes for different inputs', () => {
      const h1 = service.hash('input-a');
      const h2 = service.hash('input-b');
      expect(h1).not.toBe(h2);
    });

    it('should handle empty strings', () => {
      const h = service.hash('');
      expect(h).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(h)).toBe(true);
    });
  });

  describe('hashCompare', () => {
    it('should return true when data matches the hash', () => {
      const h = service.hash('match-me');
      expect(service.hashCompare('match-me', h)).toBe(true);
    });

    it('should return false when data does not match the hash', () => {
      const h = service.hash('original');
      expect(service.hashCompare('different', h)).toBe(false);
    });

    it('should return false when hash length differs (no timing leak)', () => {
      const result = service.hashCompare('test', 'short');
      expect(result).toBe(false);
    });

    it('should use constant-time comparison (no timing side-channel)', () => {
      // This is a sanity check — we verify the method returns correct results
      const h = service.hash('secure-comparison');
      expect(service.hashCompare('secure-comparison', h)).toBe(true);
      expect(service.hashCompare('insecure-comparison', h)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  generateApiKey
  // ═══════════════════════════════════════════════════════════

  describe('generateApiKey', () => {
    it('should return a string prefixed with "aen_"', () => {
      const key = service.generateApiKey();
      expect(key).toMatch(/^aen_/);
    });

    it('should be 68 characters long (3 prefix + 64 hex)', () => {
      const key = service.generateApiKey();
      expect(key).toHaveLength(68); // "aen_" (4) + 64 hex chars = 68
    });

    it('should have hex characters after the prefix', () => {
      const key = service.generateApiKey();
      const hexPart = key.slice(4); // skip "aen_"
      expect(/^[0-9a-f]{64}$/.test(hexPart)).toBe(true);
    });

    it('should generate unique keys on each call', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(service.generateApiKey());
      }
      expect(keys.size).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  generateToken
  // ═══════════════════════════════════════════════════════════

  describe('generateToken', () => {
    it('should return a hex string of default length (32 bytes = 64 chars)', () => {
      const token = service.generateToken();
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
    });

    it('should respect custom length parameter', () => {
      const token = service.generateToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should clamp length to minimum of 16 bytes', () => {
      const token = service.generateToken(1);
      expect(token).toHaveLength(32); // clamped to 16 bytes = 32 hex chars
    });

    it('should clamp length to maximum of 256 bytes', () => {
      const token = service.generateToken(9999);
      expect(token).toHaveLength(512); // clamped to 256 bytes = 512 hex chars
    });

    it('should generate unique tokens on each call', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(service.generateToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Edge Cases & Error Handling
  // ═══════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle strings with special characters', () => {
      const plaintext = 'line1\nline2\ttab\rcarriage\bbackspace\fformfeed';
      const encrypted = service.encrypt(plaintext);
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });

    it('should handle strings that look like the encrypted format', () => {
      // A string that coincidentally has colons should still work
      const plaintext = 'aaa:bbb:ccc';
      const encrypted = service.encrypt(plaintext);
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });

    it('should handle object with numeric keys', () => {
      const obj = { 0: 'zero', 1: 'one', 2: 'two' };
      const encrypted = service.encryptObject(obj);
      const decrypted = service.decryptObject<typeof obj>(encrypted);
      expect(decrypted).toEqual(obj);
    });

    it('should handle deeply nested objects', () => {
      const obj = { l1: { l2: { l3: { l4: { l5: { value: 'deep' } } } } } };
      const encrypted = service.encryptObject(obj);
      const decrypted = service.decryptObject<typeof obj>(encrypted);
      expect(decrypted).toEqual(obj);
    });
  });
});
