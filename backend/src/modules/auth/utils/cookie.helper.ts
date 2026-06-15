/**
 * AENEWS Agent OS X — Cookie Helper Utilities
 *
 * Provides secure httpOnly cookie management for refresh tokens.
 * Handles both development (localhost without Secure) and production
 * (with Secure flag) environments.
 *
 * Cookie attributes:
 *   - HttpOnly:  Prevents JavaScript access (XSS protection)
 *   - Secure:   Only sent over HTTPS (production only)
 *   - SameSite: Strict — prevents CSRF by not sending on cross-site requests
 *   - Path:     /api/v1/auth — cookie only sent to auth endpoints
 *   - Max-Age:  604800 (7 days in seconds)
 */

import { Response } from 'express';

const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
const COOKIE_PATH = '/api/v1/auth';

/**
 * Determine if the current environment is production.
 * In production, the Secure flag is added to the cookie.
 */
function isProduction(): boolean {
  const env = process.env.NODE_ENV || process.env.APP_ENV || 'development';
  return env === 'production';
}

/**
 * Set the refresh token as an httpOnly cookie on the response.
 *
 * @param res - Express Response object
 * @param token - The refresh token value
 */
export function setRefreshTokenCookie(res: Response, token: string): void {
  const cookieOptions: Record<string, unknown> = {
    httpOnly: true,
    sameSite: 'strict',
    path: COOKIE_PATH,
    maxAge: REFRESH_TOKEN_MAX_AGE * 1000, // Express uses milliseconds for maxAge
  };

  // Only set Secure flag in production (HTTPS required)
  if (isProduction()) {
    cookieOptions.secure = true;
  }

  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, cookieOptions);
}

/**
 * Clear the refresh token cookie from the response.
 *
 * Uses the same path and security attributes as when the cookie was set,
 * ensuring the browser correctly identifies and removes it.
 *
 * @param res - Express Response object
 */
export function clearRefreshTokenCookie(res: Response): void {
  const cookieOptions: Record<string, unknown> = {
    httpOnly: true,
    sameSite: 'strict',
    path: COOKIE_PATH,
    maxAge: 0, // Immediately expire
  };

  if (isProduction()) {
    cookieOptions.secure = true;
  }

  res.cookie(REFRESH_TOKEN_COOKIE_NAME, '', cookieOptions);
}

/**
 * Read the refresh token from the request cookies.
 *
 * @param req - Express Request object
 * @returns The refresh token string, or undefined if not present
 */
export function getRefreshTokenFromCookie(req: { cookies?: Record<string, string | undefined> }): string | undefined {
  return req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
}
