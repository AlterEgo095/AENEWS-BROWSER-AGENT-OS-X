import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if the endpoint is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Otherwise, require JWT authentication
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: TUser, info: any): TUser {
    // Handle invalid/expired tokens gracefully
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired authentication token');
    }
    return user;
  }
}
