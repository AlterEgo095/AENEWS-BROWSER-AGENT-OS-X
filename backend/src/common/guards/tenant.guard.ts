import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.get(IS_PUBLIC_KEY, context.getHandler());
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];
    const user = request.user;

    if (!tenantId && !user?.tenantId) {
      throw new ForbiddenException('Tenant ID required');
    }

    // Ensure user can only access their own tenant
    if (user && user.tenantId && tenantId && user.tenantId !== tenantId) {
      throw new ForbiddenException('Tenant access denied');
    }

    request.tenantId = tenantId || user?.tenantId;
    return true;
  }
}
