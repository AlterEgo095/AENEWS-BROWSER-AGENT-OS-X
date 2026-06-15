import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used to mark a controller or handler as tenant-scoped.
 * When present, the TenantGuard will enforce tenant isolation on queries.
 */
export const TENANT_SCOPED_KEY = 'tenantScoped';

/**
 * @TenantScoped() decorator
 *
 * Apply at the class level on a controller to indicate that all its
 * endpoints must enforce tenant isolation. The TenantGuard reads this
 * metadata and, when set, automatically filters queries by the
 * authenticated user's tenantId.
 *
 * SUPER_ADMIN users are exempt — they can access data across tenants.
 *
 * @example
 * ```ts
 * @Controller('agents')
 * @TenantScoped()
 * export class AgentController { ... }
 * ```
 */
export const TenantScoped = () => SetMetadata(TENANT_SCOPED_KEY, true);
