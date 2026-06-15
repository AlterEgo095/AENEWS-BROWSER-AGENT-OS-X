/**
 * AENEWS Agent OS X — Encryption at Rest Service
 *
 * Inspired by Odysseus's secret_storage.py (Fernet encryption), this service provides
 * comprehensive AES-256-GCM encryption for data at rest using only Node.js built-in
 * `crypto` module — zero external crypto dependencies.
 *
 * Architecture:
 *   - Uses AES-256-GCM (authenticated encryption) for confidentiality + integrity
 *   - Derives the actual encryption key from the env-supplied `ENCRYPTION_KEY` via HKDF
 *     (HMAC-based Key Derivation Function) with a static info string, ensuring the
 *     operational key is cryptographically distinct from the config value.
 *   - Each encryption operation generates a fresh 96-bit IV (nonce), guaranteeing
 *     unique keystreams even for identical plaintexts.
 *   - The encrypted output is base64-encoded as `iv:authTag:ciphertext`, making it
 *     safe for storage in text columns, JSON fields, or environment variables.
 *
 * Security Guarantees:
 *   - AES-256-GCM provides both confidentiality (CTR mode) and integrity (GHASH tag).
 *   - Constant-time comparison prevents timing side-channel attacks on hash verification.
 *   - HKDF key derivation ensures forward secrecy is not compromised by config exposure.
 *   - Defensive error handling: all methods catch and rethrow safely without leaking
 *     internal state or partial plaintext.
 *
 * @module security/services/encryption
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * HKDF derivation parameters.
 * These are constant across the application lifetime to ensure deterministic key derivation.
 */
const HKDF_SALT = Buffer.from('aenews-agent-os-x-encryption-salt-v1', 'utf-8');
const HKDF_INFO = Buffer.from('aes-256-gcm-encryption-key', 'utf-8');

/**
 * Algorithm constants.
 */
const AES_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for GCM (recommended by NIST SP 800-38D)
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag
const KEY_LENGTH = 32; // 256-bit key for AES-256

/**
 * Encryption at Rest Service
 *
 * Provides AES-256-GCM symmetric encryption for sensitive data stored at rest.
 * All methods are defensive — errors are caught, logged, and rethrown without
 * leaking cryptographic internals.
 *
 * @example
 * ```ts
 * // Encrypt a simple string
 * const encrypted = encryptionService.encrypt('sensitive-data');
 * // → 'iv_base64:authTag_base64:ciphertext_base64'
 *
 * // Decrypt it back
 * const decrypted = encryptionService.decrypt(encrypted);
 * // → 'sensitive-data'
 *
 * // Encrypt an arbitrary object
 * const enc = encryptionService.encryptObject({ apiKey: 'sk-xxx', ttl: 3600 });
 * const obj = encryptionService.decryptObject<{ apiKey: string; ttl: number }>(enc);
 * ```
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);

  /**
   * The derived encryption key (32 bytes). Derived once at construction time
   * from the env-supplied ENCRYPTION_KEY using HKDF-SHA256.
   */
  private readonly derivedKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const envKey = this.configService.get<string>('encryption.key');

    if (!envKey) {
      throw new Error(
        '[EncryptionService] ENCRYPTION_KEY is not configured. ' +
        'Set the ENCRYPTION_KEY environment variable (must be exactly 32 characters).',
      );
    }

    if (envKey.length !== 32) {
      throw new Error(
        `[EncryptionService] ENCRYPTION_KEY must be exactly 32 characters, got ${envKey.length}.`,
      );
    }

    // Derive a cryptographically strong 256-bit key from the env key using HKDF.
    // This ensures the operational key is distinct from the config value and
    // adds an extra layer of key separation.
    this.derivedKey = Buffer.from(
      crypto.hkdfSync(
        'sha256',
        Buffer.from(envKey, 'utf-8'),
        HKDF_SALT,
        HKDF_INFO,
        KEY_LENGTH,
      ),
    );

    this.logger.log('Encryption service initialized (AES-256-GCM with HKDF key derivation)');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  SYMMETRIC ENCRYPTION (AES-256-GCM)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Encrypt a plaintext string using AES-256-GCM.
   *
   * The output is a base64-encoded string in the format `iv:authTag:ciphertext`,
   * where each component is independently base64-encoded. This format is safe
   * for storage in database text columns, JSON fields, or environment variables.
   *
   * @param plaintext - The raw string to encrypt.
   * @returns Base64-encoded string in `iv:authTag:ciphertext` format.
   * @throws {Error} If encryption fails (e.g., invalid key, crypto runtime error).
   *
   * @example
   * ```ts
   * const encrypted = service.encrypt('my-secret');
   * // → 'aGVsbG8=:d29ybGQ=:c2VjcmV0'
   * ```
   */
  encrypt(plaintext: string): string {
    try {
      // Generate a fresh 96-bit IV for each encryption operation.
      // A unique IV is critical for GCM security — reusing an IV with the same key
      // catastrophically breaks both confidentiality and integrity.
      const iv = crypto.randomBytes(IV_LENGTH);

      const cipher = crypto.createCipheriv(AES_ALGORITHM, this.derivedKey, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });

      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf-8'),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      // Format: iv:authTag:ciphertext (each component base64-encoded)
      return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
    } catch (error) {
      this.logger.error('Encryption failed', (error as Error)?.message);
      throw new Error('Encryption operation failed');
    }
  }

  /**
   * Decrypt an encrypted string that was produced by {@link encrypt}.
   *
   * Parses the `iv:authTag:ciphertext` format, verifies the authentication tag,
   * and returns the original plaintext.
   *
   * @param encrypted - The base64-encoded `iv:authTag:ciphertext` string.
   * @returns The original plaintext string.
   * @throws {Error} If decryption fails (tampered data, wrong key, corrupted format).
   *
   * @example
   * ```ts
   * const plaintext = service.decrypt('aGVsbG8=:d29ybGQ=:c2VjcmV0');
   * // → 'my-secret'
   * ```
   */
  decrypt(encrypted: string): string {
    try {
      const parts = encrypted.split(':');

      if (parts.length !== 3) {
        throw new Error(
          'Invalid encrypted format. Expected `iv:authTag:ciphertext` (3 base64 segments separated by colons).',
        );
      }

      const [ivB64, authTagB64, ciphertextB64] = parts;
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(authTagB64, 'base64');
      const ciphertext = Buffer.from(ciphertextB64, 'base64');

      // Validate IV length to prevent subtle crypto errors.
      if (iv.length !== IV_LENGTH) {
        throw new Error(
          `Invalid IV length: expected ${IV_LENGTH} bytes, got ${iv.length}.`,
        );
      }

      // Validate auth tag length.
      if (authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error(
          `Invalid auth tag length: expected ${AUTH_TAG_LENGTH} bytes, got ${authTag.length}.`,
        );
      }

      const decipher = crypto.createDecipheriv(AES_ALGORITHM, this.derivedKey, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });

      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return decrypted.toString('utf-8');
    } catch (error) {
      this.logger.error('Decryption failed', (error as Error)?.message);
      throw new Error('Decryption operation failed — data may be corrupted or tampered');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  OBJECT ENCRYPTION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Encrypt an arbitrary JavaScript object.
   *
   * The object is serialized to JSON (via `JSON.stringify`) and then encrypted
   * using AES-256-GCM. This is useful for encrypting structured data like
   * configuration objects, credentials, or API responses.
   *
   * @param obj - Any JSON-serializable value.
   * @returns Base64-encoded `iv:authTag:ciphertext` string.
   * @throws {Error} If the object cannot be serialized or encryption fails.
   *
   * @example
   * ```ts
   * const enc = service.encryptObject({ apiKey: 'sk-xxx', region: 'us-east-1' });
   * ```
   */
  encryptObject(obj: any): string {
    try {
      const json = JSON.stringify(obj);
      return this.encrypt(json);
    } catch (error) {
      this.logger.error('Object encryption failed', (error as Error)?.message);
      throw new Error('Object encryption failed — object may not be serializable');
    }
  }

  /**
   * Decrypt an encrypted string back into a typed JavaScript object.
   *
   * Decrypts the `iv:authTag:ciphertext` format and parses the resulting
   * JSON string into the specified type `T`.
   *
   * @typeParam T - The expected type of the decrypted object.
   * @param encrypted - The base64-encoded `iv:authTag:ciphertext` string.
   * @returns The deserialized object of type `T`.
   * @throws {Error} If decryption fails or the decrypted JSON is invalid.
   *
   * @example
   * ```ts
   * const config = service.decryptObject<{ apiKey: string; region: string }>(enc);
   * ```
   */
  decryptObject<T>(encrypted: string): T {
    try {
      const json = this.decrypt(encrypted);
      return JSON.parse(json) as T;
    } catch (error) {
      this.logger.error('Object decryption failed', (error as Error)?.message);
      throw new Error('Object decryption failed — data may be corrupted or not a valid JSON object');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  ONE-WAY HASHING (SHA-256)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Compute a SHA-256 hash of the given data.
   *
   * This is a one-way (non-reversible) hash suitable for:
   *   - Data integrity verification
   *   - Fingerprinting content
   *   - Comparing values without storing the original
   *
   * **NOT suitable for passwords** — use bcrypt or argon2 for password hashing.
   *
   * @param data - The string to hash.
   * @returns Hex-encoded SHA-256 hash (64 characters).
   *
   * @example
   * ```ts
   * const h = service.hash('some-data');
   * // → '1307990e6ba5ca145eb35e99182a9bec46531bc54ddf...'
   * ```
   */
  hash(data: string): string {
    try {
      return crypto.createHash('sha256').update(data, 'utf-8').digest('hex');
    } catch (error) {
      this.logger.error('Hashing failed', (error as Error)?.message);
      throw new Error('Hash operation failed');
    }
  }

  /**
   * Compare a plaintext value against a known SHA-256 hash using constant-time comparison.
   *
   * Uses `crypto.timingSafeEqual` to prevent timing side-channel attacks,
   * ensuring that an attacker cannot infer hash contents based on response time.
   *
   * @param data - The plaintext string to verify.
   * @param hash - The expected hex-encoded SHA-256 hash.
   * @returns `true` if the hash of `data` matches the provided `hash`, `false` otherwise.
   *
   * @example
   * ```ts
   * const h = service.hash('my-data');
   * service.hashCompare('my-data', h); // → true
   * service.hashCompare('wrong-data', h); // → false
   * ```
   */
  hashCompare(data: string, hash: string): boolean {
    try {
      const computedHash = crypto.createHash('sha256').update(data, 'utf-8').digest('hex');

      // Ensure both buffers are the same length for timingSafeEqual.
      const computedBuf = Buffer.from(computedHash, 'utf-8');
      const expectedBuf = Buffer.from(hash, 'utf-8');

      if (computedBuf.length !== expectedBuf.length) {
        // Length mismatch — return false without leaking timing info about *where* the mismatch is.
        return false;
      }

      return crypto.timingSafeEqual(computedBuf, expectedBuf);
    } catch (error) {
      this.logger.error('Hash comparison failed', (error as Error)?.message);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  SECURE RANDOM GENERATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate a cryptographically secure API key.
   *
   * The key is 32 bytes of randomness encoded as a hex string (64 characters),
   * prefixed with `aen_` for easy identification as an AENEWS API key.
   *
   * @returns A secure API key string in the format `aen_<64 hex chars>`.
   *
   * @example
   * ```ts
   * const key = service.generateApiKey();
   * // → 'aen_3a7b1f9e2d4c...'
   * ```
   */
  generateApiKey(): string {
    try {
      const bytes = crypto.randomBytes(32);
      return `aen_${bytes.toString('hex')}`;
    } catch (error) {
      this.logger.error('API key generation failed', (error as Error)?.message);
      throw new Error('API key generation failed');
    }
  }

  /**
   * Generate a cryptographically secure random token.
   *
   * Useful for:
   *   - Password reset tokens
   *   - Email verification tokens
   *   - CSRF tokens
   *   - One-time use tokens
   *
   * @param length - The number of random bytes to generate (default: 32).
   *                  The resulting hex string will be twice this length.
   * @returns A hex-encoded random token string.
   *
   * @example
   * ```ts
   * const token = service.generateToken(); // 64-char hex string (32 bytes)
   * const short = service.generateToken(16); // 32-char hex string (16 bytes)
   * ```
   */
  generateToken(length: number = 32): string {
    try {
      // Clamp length to reasonable bounds to prevent abuse.
      const safeLength = Math.max(16, Math.min(length, 256));
      return crypto.randomBytes(safeLength).toString('hex');
    } catch (error) {
      this.logger.error('Token generation failed', (error as Error)?.message);
      throw new Error('Token generation failed');
    }
  }
}
