import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TENANT_SCOPED_KEY } from '../decorators/tenant-scoped.decorator';
import { UserRole } from '../../user/entities/user.entity';

/**
 * TenantGuard
 *
 * Reads the @TenantScoped() metadata on a controller/handler.
 * When present, ensures that non-SUPER_ADMIN users cannot access
 * data outside their own tenant.
 *
 * This guard works in concert with TenantIsolationMiddleware:
 *   - The middleware sets `request.tenantId` based on the JWT user.
 *   - This guard enforces that tenant-scoped endpoints cannot be
 *     called without a valid tenant context (unless SUPER_ADMIN).
 *
 * The actual query filtering is done in controllers/services by
 * reading `request.tenantId` and passing it to service methods.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if @TenantScoped() is set on the handler or class
    const isTenantScoped = this.reflector.getAllAndOverride<boolean>(TENANT_SCOPED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If not tenant-scoped, allow access
    if (!isTenantScoped) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      // No user attached — JwtAuthGuard should have caught this,
      // but as a safety net we reject.
      throw new ForbiddenException('Authentication required for tenant-scoped resource');
    }

    // SUPER_ADMIN can access any tenant's data
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // For all other roles, verify that tenantId is present
    if (!user.tenantId) {
      throw new ForbiddenException('User is not associated with a tenant');
    }

    return true;
  }
}
