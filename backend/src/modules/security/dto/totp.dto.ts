/**
 * AENEWS Agent OS X — TOTP Data Transfer Objects
 *
 * DTOs for the TOTP two-factor authentication endpoints.
 * Uses class-validator decorators for request validation.
 *
 * @module security/dto/totp
 */

import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for initiating TOTP setup.
 *
 * No fields are required — the user identity is derived from the JWT token.
 * The setup endpoint generates a new TOTP secret, QR code, and backup codes.
 *
 * @example
 * ```ts
 * POST /security/totp/setup
 * {} // empty body, user from JWT
 * ```
 */
export class SetupTotpDto {}

/**
 * DTO for verifying a TOTP code.
 *
 * Used during the login flow step 2 to verify the user's TOTP code
 * or backup code submission.
 *
 * @example
 * ```ts
 * POST /security/totp/verify
 * {
 *   "code": "123456"   // 6-digit TOTP code
 * }
 * // or
 * {
 *   "code": "ABCD1234" // 8-character backup code
 * }
 * ```
 */
export class VerifyTotpDto {
  /**
   * The TOTP verification code.
   * Can be either:
   *   - A 6-digit TOTP code from the authenticator app
   *   - An 8-character alphanumeric backup code
   */
  @ApiProperty({
    description: '6-digit TOTP code or 8-character backup code',
    example: '123456',
  })
  @IsString({ message: 'Code must be a string' })
  @IsNotEmpty({ message: 'Code is required' })
  @MinLength(6, { message: 'Code must be at least 6 characters' })
  @MaxLength(8, { message: 'Code must not exceed 8 characters' })
  code: string;
}

/**
 * DTO for enabling TOTP two-factor authentication.
 *
 * After setup, the user must verify they can generate valid TOTP codes
 * before 2FA is fully enabled on their account.
 *
 * @example
 * ```ts
 * POST /security/totp/enable
 * {
 *   "code": "123456"
 * }
 * ```
 */
export class EnableTotpDto {
  /**
   * A valid TOTP code to prove the user has successfully
   * configured their authenticator app.
   */
  @ApiProperty({
    description: 'Verification code to confirm authenticator setup',
    example: '123456',
  })
  @IsString({ message: 'Code must be a string' })
  @IsNotEmpty({ message: 'Code is required' })
  @MinLength(6, { message: 'Code must be at least 6 characters' })
  @MaxLength(8, { message: 'Code must not exceed 8 characters' })
  code: string;
}

/**
 * DTO for disabling TOTP two-factor authentication.
 *
 * Requires both a valid TOTP code (or backup code) AND the user's
 * current password as an additional security measure.
 *
 * @example
 * ```ts
 * POST /security/totp/disable
 * {
 *   "code": "123456",
 *   "password": "current-password"
 * }
 * ```
 */
export class DisableTotpDto {
  /**
   * A valid TOTP code or backup code to verify the user
   * still has access to their second factor.
   */
  @ApiProperty({
    description: 'Verification code (TOTP or backup code)',
    example: '123456',
  })
  @IsString({ message: 'Code must be a string' })
  @IsNotEmpty({ message: 'Code is required' })
  @MinLength(6, { message: 'Code must be at least 6 characters' })
  @MaxLength(8, { message: 'Code must not exceed 8 characters' })
  code: string;

  /**
   * The user's current password for additional confirmation.
   * This prevents an attacker who gains temporary access to an
   * authenticated session from disabling 2FA.
   */
  @ApiProperty({
    description: 'Current password for additional security confirmation',
    example: 'current-password',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required to disable 2FA' })
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

/**
 * DTO for the login 2FA step.
 *
 * Used when a user with TOTP enabled attempts to log in.
 * After successful password authentication, a temporary token is issued.
 * The client must then submit this temporary token along with a TOTP code
 * to complete the login process.
 *
 * @example
 * ```ts
 * POST /auth/login/2fa
 * {
 *   "tempToken": "eyJhbGciOiJIUzI1NiIs...",
 *   "code": "123456"
 * }
 * ```
 */
export class Login2faDto {
  /**
   * The temporary token received from the login response when
   * 2FA is required. This token is short-lived (5 minutes) and
   * only valid for completing the 2FA step.
   */
  @ApiProperty({
    description: 'Temporary token from login step 1 (short-lived, 5 minutes)',
    example: 'eyJhbGciOiJIUzI1NiIs...',
  })
  @IsString({ message: 'Temporary token must be a string' })
  @IsNotEmpty({ message: 'Temporary token is required' })
  tempToken: string;

  /**
   * The TOTP code from the authenticator app or a backup code.
   */
  @ApiProperty({
    description: '6-digit TOTP code or 8-character backup code',
    example: '123456',
  })
  @IsString({ message: 'Code must be a string' })
  @IsNotEmpty({ message: 'Code is required' })
  @MinLength(6, { message: 'Code must be at least 6 characters' })
  @MaxLength(8, { message: 'Code must not exceed 8 characters' })
  code: string;
}
