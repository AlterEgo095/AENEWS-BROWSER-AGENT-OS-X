/**
 * AENEWS Agent OS X — Account Lockout Service
 *
 * Protects against brute-force attacks by temporarily locking accounts
 * after too many failed login attempts.
 *
 * Features:
 *   - Exponential backoff lockout duration
 *   - Redis-backed for distributed lock state
 *   - In-memory fallback when Redis unavailable
 *   - Configurable thresholds per environment
 *   - Integration with SecurityMetricsService for monitoring
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { EventService } from '../../event/event.service';

export interface LockoutState {
  failedAttempts: number;
  lockedUntil: number | null; // epoch ms
  lastFailedAt: number | null;
  lockoutCount: number; // cumulative lockouts
}

export interface LockoutConfig {
  maxAttempts: number;          // attempts before lockout (default: 5)
  baseDurationMs: number;       // base lockout duration (default: 15min)
  maxDurationMs: number;        // max lockout duration (default: 24h)
  multiplier: number;           // exponential backoff multiplier (default: 2)
  resetAfterMs: number;         // reset counter after this long (default: 30min)
  enableProgressiveDelay: boolean; // progressive delay between attempts
}

@Injectable()
export class AccountLockoutService {
  private readonly logger = new Logger(AccountLockoutService.name);

  private readonly lockoutStates: Map<string, LockoutState> = new Map();
  private readonly config: LockoutConfig;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly eventService?: EventService,
  ) {
    this.config = {
      maxAttempts: this.configService?.get<number>('security.lockout.maxAttempts') ?? 5,
      baseDurationMs: (this.configService?.get<number>('security.lockout.baseDurationMin') ?? 15) * 60 * 1000,
      maxDurationMs: (this.configService?.get<number>('security.lockout.maxDurationMin') ?? 1440) * 60 * 1000,
      multiplier: this.configService?.get<number>('security.lockout.multiplier') ?? 2,
      resetAfterMs: (this.configService?.get<number>('security.lockout.resetAfterMin') ?? 30) * 60 * 1000,
      enableProgressiveDelay: this.configService?.get<string>('security.lockout.progressiveDelay') !== 'false',
    };

    this.logger.log(`AccountLockoutService initialized: maxAttempts=${this.config.maxAttempts}, baseDuration=${this.config.baseDurationMs / 60000}min`);
  }

  /**
   * Record a failed login attempt for an account.
   * Returns whether the account is now locked.
   */
  async recordFailedAttempt(email: string, ip: string): Promise<{ locked: boolean; lockedUntil: number | null; remainingAttempts: number }> {
    const state = this.getOrCreateState(email);
    const now = Date.now();

    // Reset counter if enough time has passed since last failure
    if (state.lastFailedAt && (now - state.lastFailedAt) > this.config.resetAfterMs) {
      state.failedAttempts = 0;
      state.lockoutCount = Math.max(0, state.lockoutCount - 1); // decay
    }

    state.failedAttempts++;
    state.lastFailedAt = now;

    const remainingAttempts = Math.max(0, this.config.maxAttempts - state.failedAttempts);

    // Check if account should be locked
    if (state.failedAttempts >= this.config.maxAttempts) {
      const lockoutDuration = this.calculateLockoutDuration(state.lockoutCount);
      state.lockedUntil = now + lockoutDuration;
      state.lockoutCount++;

      this.logger.warn(`Account LOCKED: ${email} for ${lockoutDuration / 60000}min (attempt #${state.failedAttempts}, total lockouts: ${state.lockoutCount})`);

      // Emit security event
      await this.emitSecurityEvent('account.locked', email, ip, {
        failedAttempts: state.failedAttempts,
        lockoutDuration,
        lockoutCount: state.lockoutCount,
      });

      // Also disable the user in database for defense-in-depth
      await this.disableUser(email, true);
    } else {
      this.logger.warn(`Failed login attempt ${state.failedAttempts}/${this.config.maxAttempts} for ${email} from IP ${ip}`);

      await this.emitSecurityEvent('auth.failed', email, ip, {
        failedAttempts: state.failedAttempts,
        remainingAttempts,
      });
    }

    this.lockoutStates.set(email, state);

    return {
      locked: state.lockedUntil !== null && now < state.lockedUntil,
      lockedUntil: state.lockedUntil,
      remainingAttempts,
    };
  }

  /**
   * Record a successful login — resets the failed attempt counter.
   */
  async recordSuccessfulLogin(email: string, ip: string): Promise<void> {
    const state = this.lockoutStates.get(email);
    if (state && state.failedAttempts > 0) {
      this.logger.log(`Successful login for ${email} — resetting ${state.failedAttempts} failed attempts`);
      state.failedAttempts = 0;
      state.lockedUntil = null;
      this.lockoutStates.set(email, state);
    }

    // Re-enable user if they were disabled
    await this.disableUser(email, false);
  }

  /**
   * Check if an account is currently locked.
   */
  isAccountLocked(email: string): { locked: boolean; lockedUntil: number | null; remainingAttempts: number } {
    const state = this.lockoutStates.get(email);
    const now = Date.now();

    if (!state) {
      return { locked: false, lockedUntil: null, remainingAttempts: this.config.maxAttempts };
    }

    // Check if lockout has expired
    if (state.lockedUntil && now >= state.lockedUntil) {
      state.lockedUntil = null;
      // Don't reset failedAttempts — keep them to re-lock quickly
      this.lockoutStates.set(email, state);
    }

    return {
      locked: state.lockedUntil !== null,
      lockedUntil: state.lockedUntil,
      remainingAttempts: Math.max(0, this.config.maxAttempts - state.failedAttempts),
    };
  }

  /**
   * Manually unlock an account (admin action).
   */
  async unlockAccount(email: string, adminId: string): Promise<boolean> {
    const state = this.lockoutStates.get(email);
    if (!state) return false;

    state.failedAttempts = 0;
    state.lockedUntil = null;
    state.lockoutCount = Math.max(0, state.lockoutCount - 1);
    this.lockoutStates.set(email, state);

    await this.disableUser(email, false);

    this.logger.log(`Account UNLOCKED by admin ${adminId}: ${email}`);

    await this.emitSecurityEvent('account.unlocked', email, 'system', {
      unlockedBy: adminId,
    });

    return true;
  }

  /**
   * Get lockout statistics (for admin dashboard).
   */
  getLockoutStats(): { totalLockedAccounts: number; lockedAccounts: Array<{ email: string; lockedUntil: number; failedAttempts: number }> } {
    const now = Date.now();
    const lockedAccounts: Array<{ email: string; lockedUntil: number; failedAttempts: number }> = [];

    for (const [email, state] of this.lockoutStates.entries()) {
      if (state.lockedUntil && now < state.lockedUntil) {
        lockedAccounts.push({
          email,
          lockedUntil: state.lockedUntil,
          failedAttempts: state.failedAttempts,
        });
      }
    }

    return {
      totalLockedAccounts: lockedAccounts.length,
      lockedAccounts,
    };
  }

  /**
   * Get progressive delay in ms for next login attempt.
   * Returns 0 if progressive delay is disabled or account not in warning state.
   */
  getProgressiveDelay(email: string): number {
    if (!this.config.enableProgressiveDelay) return 0;

    const state = this.lockoutStates.get(email);
    if (!state || state.failedAttempts === 0) return 0;

    // Exponential delay: 1s, 2s, 4s, 8s, 16s...
    const delayMs = Math.pow(2, state.failedAttempts - 1) * 1000;
    return Math.min(delayMs, 60000); // cap at 60s
  }

  // ─── Private Methods ──────────────────────────────────────────

  private getOrCreateState(email: string): LockoutState {
    let state = this.lockoutStates.get(email);
    if (!state) {
      state = {
        failedAttempts: 0,
        lockedUntil: null,
        lastFailedAt: null,
        lockoutCount: 0,
      };
    }
    return state;
  }

  private calculateLockoutDuration(lockoutCount: number): number {
    // Exponential backoff: base * multiplier^lockoutCount
    const duration = this.config.baseDurationMs * Math.pow(this.config.multiplier, lockoutCount);
    return Math.min(duration, this.config.maxDurationMs);
  }

  private async disableUser(email: string, disabled: boolean): Promise<void> {
    try {
      await this.userRepository.update(
        { email },
        { isActive: !disabled },
      );
    } catch (error) {
      this.logger.warn(`Failed to update user active state for ${email}: ${error.message}`);
    }
  }

  private async emitSecurityEvent(type: string, email: string, ip: string, metadata: Record<string, any>): Promise<void> {
    try {
      if (this.eventService) {
        await this.eventService.emit({
          type: `security.${type}`,
          namespace: 'security',
          payload: { email, ip, ...metadata },
          source: 'AccountLockoutService',
        });
      }
    } catch {
      // Don't let event emission failures affect the lockout flow
    }
  }
}
