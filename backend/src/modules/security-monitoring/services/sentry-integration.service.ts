/**
 * AENEWS Agent OS X — Sentry Integration Service
 *
 * Provides error tracking and performance monitoring via Sentry.
 * Uses the SENTRY_DSN environment variable already configured.
 *
 * Features:
 *   - Automatic exception capture
 *   - Performance transaction tracking
 *   - User context enrichment
 *   - Custom breadcrumb tracking
 *   - Release tracking
 *   - Environment-based filtering
 */

import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SentryConfig {
  dsn: string;
  environment: string;
  release: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  maxBreadcrumbs: number;
  attachStacktrace: boolean;
  enabled: boolean;
}

@Injectable()
export class SentryIntegrationService implements OnModuleInit {
  private readonly logger = new Logger(SentryIntegrationService.name);
  private readonly config: SentryConfig;
  private initialized = false;

  constructor(@Optional() private readonly configService?: ConfigService) {
    const dsn = this.configService?.get<string>('monitoring.sentryDsn') || '';

    this.config = {
      dsn,
      environment: this.configService?.get<string>('app.env') || 'development',
      release: this.configService?.get<string>('app.version') || '0.1.0',
      tracesSampleRate: this.configService?.get<number>('monitoring.sentryTracesSampleRate') ?? 0.1,
      profilesSampleRate: this.configService?.get<number>('monitoring.sentryProfilesSampleRate') ?? 0.1,
      maxBreadcrumbs: 50,
      attachStacktrace: true,
      enabled: !!dsn,
    };
  }

  async onModuleInit(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.log('Sentry integration DISABLED (no DSN configured)');
      return;
    }

    try {
      // Dynamic import to avoid hard dependency
      const Sentry = await import('@sentry/node');

      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,
        tracesSampleRate: this.config.tracesSampleRate,
        profilesSampleRate: this.config.profilesSampleRate,
        maxBreadcrumbs: this.config.maxBreadcrumbs,
        attachStacktrace: this.config.attachStacktrace,
        integrations: [
          Sentry.httpIntegration(),
          Sentry.expressIntegration(),
          Sentry.postgresIntegration(),
        ],
        beforeSend(event) {
          // Don't send events in development unless explicitly configured
          if (event.environment === 'development' && !process.env.SENTRY_ENABLE_DEV) {
            return null;
          }
          // Scrub sensitive data
          if (event.request) {
            delete event.request.cookies;
            if (event.request.headers) {
              delete event.request.headers.authorization;
              delete event.request.headers.cookie;
            }
          }
          return event;
        },
      });

      this.initialized = true;
      this.logger.log(`Sentry integration ENABLED: env=${this.config.environment}, release=${this.config.release}`);
    } catch (error) {
      this.logger.warn(`Sentry initialization failed: ${error.message}. Error tracking will be limited.`);
      this.config.enabled = false;
    }
  }

  /**
   * Capture an exception in Sentry.
   */
  async captureException(error: Error, context?: Record<string, any>): Promise<string | null> {
    if (!this.config.enabled || !this.initialized) return null;

    try {
      const Sentry = await import('@sentry/node');
      const eventId = Sentry.captureException(error, {
        extra: context,
      });
      return eventId;
    } catch {
      return null;
    }
  }

  /**
   * Capture a message in Sentry.
   */
  async captureMessage(message: string, level: 'info' | 'warning' | 'error' | 'fatal' = 'info', context?: Record<string, any>): Promise<string | null> {
    if (!this.config.enabled || !this.initialized) return null;

    try {
      const Sentry = await import('@sentry/node');
      const eventId = Sentry.captureMessage(message, level, {
        extra: context,
      });
      return eventId;
    } catch {
      return null;
    }
  }

  /**
   * Set user context for Sentry events.
   */
  async setUser(user: { id: string; email?: string; role?: string; tenantId?: string }): Promise<void> {
    if (!this.config.enabled || !this.initialized) return;

    try {
      const Sentry = await import('@sentry/node');
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.role,
        tenantId: user.tenantId,
      });
    } catch {
      // Silently fail
    }
  }

  /**
   * Add a breadcrumb for debugging.
   */
  async addBreadcrumb(breadcrumb: { category: string; message: string; level?: string; data?: Record<string, any> }): Promise<void> {
    if (!this.config.enabled || !this.initialized) return;

    try {
      const Sentry = await import('@sentry/node');
      Sentry.addBreadcrumb({
        category: breadcrumb.category,
        message: breadcrumb.message,
        level: breadcrumb.level as any || 'info',
        data: breadcrumb.data,
        timestamp: Date.now() / 1000,
      });
    } catch {
      // Silently fail
    }
  }

  /**
   * Start a performance transaction.
   */
  async startTransaction(name: string, op: string): Promise<any> {
    if (!this.config.enabled || !this.initialized) return null;

    try {
      const Sentry = await import('@sentry/node');
      return Sentry.startTransaction({ name, op });
    } catch {
      return null;
    }
  }

  /**
   * Check if Sentry is enabled and initialized.
   */
  isEnabled(): boolean {
    return this.config.enabled && this.initialized;
  }
}
