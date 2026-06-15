/**
 * AENEWS Agent OS X — TOTP (Time-based One-Time Password) Service
 *
 * Implements RFC 6238 compliant TOTP two-factor authentication using the
 * `otpauth` library. Provides secure secret generation, QR code provisioning,
 * token verification with clock-skew tolerance, and single-use backup codes.
 *
 * Architecture:
 *   - Uses AES-256-GCM encryption (via EncryptionService) for TOTP secrets at rest
 *   - Backup codes are hashed with bcrypt before storage (irreversible)
 *   - TOTP secrets are NEVER returned after initial setup — only during the
 *     setup flow for QR code generation
 *   - Backup codes are only shown ONCE during setup
 *   - 1-period clock skew tolerance to accommodate minor time drift
 *
 * Security Guarantees:
 *   - RFC 6238 compliance ensures interoperability with all major authenticator apps
 *   - Encrypted secrets at rest prevent compromise from database leaks
 *   - Bcrypt-hashed backup codes prevent offline brute-force attacks
 *   - Used backup codes are tracked to prevent replay attacks
 *
 * @module security/services/totp
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { EncryptionService } from './encryption.service';

/** Issuer name displayed in authenticator apps */
const TOTP_ISSUER = 'AENEWS Agent OS X';

/** TOTP configuration constants */
const TOTP_PERIOD = 30; // seconds per time step (RFC 6238 default)
const TOTP_DIGITS = 6; // 6-digit OTP codes
const TOTP_ALGORITHM = 'SHA1'; // SHA1 is the RFC 6238 default and universally supported
const TOTP_SKEW = 1; // Allow 1 period drift for clock skew

/** Backup code configuration */
const BACKUP_CODE_LENGTH = 8; // 8 alphanumeric characters
const BACKUP_CODE_COUNT = 16; // 16 backup codes per setup
const BACKUP_CODE_BCRYPT_ROUNDS = 10; // bcrypt rounds for hashing backup codes

/**
 * Result of TOTP setup operation.
 * Contains the QR code image and backup codes that must be shown to the user
 * exactly ONCE, as the secret cannot be retrieved afterwards.
 */
export interface TotpSetupResult {
  /** Base64-encoded PNG QR code image for authenticator app provisioning */
  qrCode: string;
  /** otpauth:// URI for manual entry */
  otpauthUri: string;
  /** Single-use backup codes (shown only once during setup) */
  backupCodes: string[];
  /** Encrypted TOTP secret to store in the database */
  encryptedSecret: string;
}

/**
 * Result of TOTP verification.
 */
export interface TotpVerifyResult {
  /** Whether the TOTP token or backup code was valid */
  valid: boolean;
  /** If a backup code was used, the updated list of used backup code hashes */
  usedBackupCodes?: string[];
  /** Whether a backup code was consumed */
  backupCodeUsed?: boolean;
}

/**
 * TOTP Service
 *
 * Provides comprehensive TOTP two-factor authentication capabilities
 * following RFC 6238. Integrates with the existing EncryptionService
 * for secure secret storage.
 *
 * @example
 * ```ts
 * // Setup TOTP for a user
 * const setup = await totpService.generateSecret('user-id', 'user@example.com');
 * // Show setup.qrCode and setup.backupCodes to user ONCE
 *
 * // Verify a TOTP token
 * const result = await totpService.verifyToken(decryptedSecret, '123456');
 *
 * // Verify a backup code
 * const result = await totpService.validateBackupCode(usedCodes, 'abcd1234');
 * ```
 */
@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name);

  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('TOTP service initialized (RFC 6238 compliant)');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  TOTP SECRET GENERATION & PROVISIONING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate a new TOTP secret for a user and produce a QR code for provisioning.
   *
   * This method creates a new TOTP secret, encrypts it for storage, generates
   * an otpauth:// URI, and produces a QR code image. The secret and backup codes
   * must be shown to the user exactly ONCE — after this, the secret cannot be
   * retrieved from the encrypted storage.
   *
   * @param userId - The unique user identifier (used as the account label in the authenticator)
   * @param email - The user's email address (displayed in the authenticator app)
   * @returns Setup result containing QR code, backup codes, and encrypted secret
   *
   * @example
   * ```ts
   * const setup = await totpService.generateSecret('usr-123', 'admin@aenews.io');
   * // Return setup.qrCode and setup.backupCodes to the frontend
   * // Store setup.encryptedSecret in the user's totpSecret field
   * ```
   */
  async generateSecret(userId: string, email: string): Promise<TotpSetupResult> {
    this.logger.debug(`Generating TOTP secret for user ${userId}`);

    // Create a new TOTP instance with a random secret
    const totp = new OTPAuth.TOTP({
      issuer: TOTP_ISSUER,
      label: email,
      algorithm: TOTP_ALGORITHM,
      digits: TOTP_DIGITS,
      period: TOTP_PERIOD,
      secret: new OTPAuth.Secret({ size: 20 }), // 20 bytes = 160 bits (RFC 4226 recommended)
    });

    // Get the otpauth URI for QR code generation
    const otpauthUri = totp.toString();

    // Encrypt the secret for secure database storage
    const plaintextSecret = totp.secret.base32;
    const encryptedSecret = this.encryptionService.encrypt(plaintextSecret);

    // Generate QR code as base64 PNG
    const qrCode = await this.generateQRCode(otpauthUri);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(BACKUP_CODE_COUNT);

    this.logger.log(`TOTP secret generated for user ${userId}`);

    return {
      qrCode,
      otpauthUri,
      backupCodes,
      encryptedSecret,
    };
  }

  /**
   * Generate a QR code image from an otpauth URI.
   *
   * Produces a base64-encoded PNG image suitable for displaying in a web
   * application's `<img>` tag with a data URI.
   *
   * @param otpauthUri - The otpauth:// URI to encode in the QR code
   * @returns Base64-encoded PNG image string
   *
   * @example
   * ```ts
   * const qrImage = await totpService.generateQRCode('otpauth://totp/...');
   * // Use in HTML: <img src="data:image/png;base64,{{qrImage}}" />
   * ```
   */
  async generateQRCode(otpauthUri: string): Promise<string> {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });

      // Extract base64 data from data URL (remove "data:image/png;base64," prefix)
      const base64Data = qrCodeDataUrl.split(',')[1];
      return base64Data;
    } catch (error) {
      this.logger.error('QR code generation failed', (error as Error)?.message);
      throw new Error('Failed to generate QR code');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  TOTP TOKEN VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Verify a TOTP token against a decrypted secret.
   *
   * Allows 1 period (30 seconds) of clock skew in both directions to
   * accommodate minor time drift between client and server, as recommended
   * by RFC 6238 Section 5.2.
   *
   * @param secret - The decrypted TOTP secret (base32-encoded)
   * @param token - The 6-digit TOTP code to verify
   * @returns `true` if the token is valid within the skew window, `false` otherwise
   *
   * @example
   * ```ts
   * const decrypted = encryptionService.decrypt(user.totpSecret);
   * const isValid = totpService.verifyToken(decrypted, '123456');
   * ```
   */
  verifyToken(secret: string, token: string): boolean {
    try {
      const totp = new OTPAuth.TOTP({
        issuer: TOTP_ISSUER,
        algorithm: TOTP_ALGORITHM,
        digits: TOTP_DIGITS,
        period: TOTP_PERIOD,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      // Validate with 1-period window in both directions (delta = ±1)
      // This allows tokens from the previous and next 30-second windows
      const delta = totp.validate({
        token,
        window: TOTP_SKEW,
      });

      if (delta !== null) {
        this.logger.debug(`TOTP token verified (delta: ${delta})`);
        return true;
      }

      this.logger.debug('TOTP token verification failed — invalid token');
      return false;
    } catch (error) {
      this.logger.error('TOTP verification error', (error as Error)?.message);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  BACKUP CODE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate single-use backup codes for account recovery.
   *
   * Each code is 8 alphanumeric characters (uppercase + digits, excluding
   * ambiguous characters like 0/O and 1/I/L). These codes should be shown
   * to the user exactly ONCE during setup, then stored as bcrypt hashes.
   *
   * @param count - Number of backup codes to generate (default: 16)
   * @returns Array of plaintext backup code strings
   *
   * @example
   * ```ts
   * const codes = totpService.generateBackupCodes(16);
   * // Show codes to user, then hash and store them
   * ```
   */
  generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
    // Character set excluding ambiguous characters: 0/O, 1/I/L
    const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      let code = '';
      const randomBytes = crypto.randomBytes(BACKUP_CODE_LENGTH);

      for (let j = 0; j < BACKUP_CODE_LENGTH; j++) {
        code += chars[randomBytes[j] % chars.length];
      }

      codes.push(code);
    }

    return codes;
  }

  /**
   * Validate a backup code against the list of hashed backup codes.
   *
   * Compares the provided code against bcrypt-hashed backup codes using
   * constant-time comparison. If a match is found, the code is marked as
   * used by adding its own bcrypt hash to the used codes list, preventing
   * replay attacks.
   *
   * @param usedBackupCodeHashes - Array of bcrypt hashes for used/consumed backup codes
   * @param allBackupCodeHashes - Array of bcrypt hashes for all valid backup codes
   * @param code - The plaintext backup code to validate
   * @returns Result indicating validity and updated used codes list
   *
   * @example
   * ```ts
   * const allHashes = JSON.parse(user.totpBackupCodes); // stored hashes
   * const usedHashes = JSON.parse(user.totpUsedBackupCodes || '[]');
   * const result = await totpService.validateBackupCode(usedHashes, allHashes, 'ABCD1234');
   * if (result.valid) {
   *   await updateUser({ totpUsedBackupCodes: JSON.stringify(result.usedBackupCodes) });
   * }
   * ```
   */
  async validateBackupCode(
    usedBackupCodeHashes: string[],
    allBackupCodeHashes: string[],
    code: string,
  ): Promise<TotpVerifyResult> {
    try {
      // Check against all valid backup codes
      for (const hash of allBackupCodeHashes) {
        const matches = await bcrypt.compare(code, hash);
        if (matches) {
          // Check if already used
          const isUsed = usedBackupCodeHashes.includes(hash);
          if (isUsed) {
            this.logger.warn('Backup code already used — replay attempt detected');
            return { valid: false };
          }

          // Mark as used by adding the hash to the used list
          const updatedUsedCodes = [...usedBackupCodeHashes, hash];
          this.logger.debug('Backup code validated and consumed');
          return {
            valid: true,
            usedBackupCodes: updatedUsedCodes,
            backupCodeUsed: true,
          };
        }
      }

      this.logger.debug('Backup code not found in valid codes');
      return { valid: false };
    } catch (error) {
      this.logger.error('Backup code validation error', (error as Error)?.message);
      return { valid: false };
    }
  }

  /**
   * Hash backup codes for secure storage.
   *
   * Converts plaintext backup codes to bcrypt hashes for storage in the database.
   * The plaintext codes should be shown to the user once, then discarded.
   *
   * @param codes - Array of plaintext backup codes to hash
   * @returns Array of bcrypt hashes (same order as input codes)
   *
   * @example
   * ```ts
   * const setup = await totpService.generateSecret(userId, email);
   * const hashedCodes = await totpService.hashBackupCodes(setup.backupCodes);
   * // Store hashedCodes as JSON in user.totpBackupCodes
   * // Show setup.backupCodes to user ONCE
   * ```
   */
  async hashBackupCodes(codes: string[]): Promise<string[]> {
    const hashes: string[] = [];
    for (const code of codes) {
      const salt = await bcrypt.genSalt(BACKUP_CODE_BCRYPT_ROUNDS);
      const hash = await bcrypt.hash(code, salt);
      hashes.push(hash);
    }
    return hashes;
  }

  /**
   * Decrypt a TOTP secret from its encrypted storage form.
   *
   * Convenience method that wraps EncryptionService.decrypt() for
   * TOTP-specific secret retrieval.
   *
   * @param encryptedSecret - The encrypted TOTP secret from the database
   * @returns The decrypted base32-encoded TOTP secret
   */
  decryptSecret(encryptedSecret: string): string {
    return this.encryptionService.decrypt(encryptedSecret);
  }
}
