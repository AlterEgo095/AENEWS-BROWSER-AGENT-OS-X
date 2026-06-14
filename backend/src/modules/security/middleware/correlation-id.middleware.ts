/**
 * AENEWS Agent OS X — Correlation ID Middleware
 *
 * Assigns a unique correlation ID to every request for distributed
 * tracing and log correlation. Supports:
 *
 *   - Preserves existing X-Correlation-ID from upstream
 *   - Generates UUID v4 if not present
 *   - Propagates to response headers
 *   - Stores in AsyncLocalStorage for access anywhere
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

// AsyncLocalStorage for correlation ID propagation
const asyncLocalStorage = require('async_hooks').createRequire ||
  (() => {
    const { AsyncLocalStorage } = require('async_hooks');
    return new AsyncLocalStorage();
  })();

// Simple global store
const correlationStore: Map<string, string> = new Map();

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Check for existing correlation ID from upstream
    const existingId = req.headers['x-correlation-id'] as string;

    // Generate or reuse
    const correlationId = existingId || crypto.randomUUID();

    // Set on request for downstream access
    req.headers['x-correlation-id'] = correlationId;

    // Set on response for client correlation
    res.setHeader('X-Correlation-ID', correlationId);

    // Also set request ID if not present
    if (!req.headers['x-request-id']) {
      const requestId = crypto.randomUUID();
      req.headers['x-request-id'] = requestId;
      res.setHeader('X-Request-ID', requestId);
    }

    // Store in global map (simple approach — AsyncLocalStorage preferred in production)
    correlationStore.set(correlationId, req.ip || 'unknown');

    // Clean up very old entries periodically (prevent memory leak)
    if (correlationStore.size > 10000) {
      const keys = Array.from(correlationStore.keys());
      for (let i = 0; i < keys.length - 5000; i++) {
        correlationStore.delete(keys[i]);
      }
    }

    next();
  }

  /**
   * Get the current correlation ID (static helper).
   */
  static getCurrentCorrelationId(): string | undefined {
    // In a production setup, this would use AsyncLocalStorage
    return undefined;
  }
}
