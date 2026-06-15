import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../user/entities/user.entity';

/**
 * TenantIsolationMiddleware
 *
 * Extracts the authenticated user's tenantId from the JWT payload
 * (already attached to `request.user` by the JwtAuthGuard) and sets
 * `request.tenantId` so that downstream controllers and services can
 * scope their queries to the correct tenant.
 *
 * Behaviour by role:
 * - SUPER_ADMIN → tenantId is NOT set (null), allowing cross-tenant access.
 * - All other roles → tenantId is set to the user's own tenant, enforcing isolation.
 */
@Injectable()
export class TenantIsolationMiddleware implements NestMiddleware {
  use(req: Request & { user?: any; tenantId?: string }, _res: Response, next: NextFunction): void {
    const user = req.user;

    if (!user) {
      // No authenticated user — skip tenant scoping.
      // The JwtAuthGuard will have already rejected the request
      // for protected endpoints, so this mainly covers public routes.
      return next();
    }

    // SUPER_ADMIN bypasses tenant isolation — they can access all tenants.
    if (user.role === UserRole.SUPER_ADMIN) {
      req.tenantId = undefined; // Explicitly undefined = no tenant filter
    } else {
      // All other roles are scoped to their own tenant.
      req.tenantId = user.tenantId ?? null;
    }

    next();
  }
}
