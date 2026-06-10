/**
 * AENEWS Agent OS X - @RequirePermission() Decorator
 * Guards agent methods with permission checks.
 * Supports both simplified (resource + action strings) and full options.
 */

import { SetMetadata } from '@nestjs/common';
import {
  PermissionAction,
  PermissionResource,
  PermissionScope,
  PermissionDefinition,
} from '../interfaces/agent-permission.interface';

// ─── Permission Metadata Key ──────────────────────────────────────
export const PERMISSION_METADATA_KEY = 'agent:permission';
export const PERMISSIONS_METADATA_KEY = 'agent:permissions';

// ─── Permission Requirement ───────────────────────────────────────
export interface PermissionRequirement {
  action: PermissionAction | string;
  resource: PermissionResource | string;
  scope?: PermissionScope;
  description?: string;
}

// ─── RequirePermission Options ────────────────────────────────────
export interface RequirePermissionOptions {
  /** Required action */
  action: PermissionAction | string;

  /** Required resource */
  resource: PermissionResource | string;

  /** Permission scope (default: SELF) */
  scope?: PermissionScope;

  /** Description of why the permission is needed */
  description?: string;

  /** Whether to check all permissions or any (for multiple requirements) */
  mode?: 'all' | 'any';
}

/**
 * @RequirePermission() decorator
 *
 * Marks a method as requiring specific permissions before execution.
 * The permission check is performed at runtime by the agent framework.
 *
 * Supports three calling conventions:
 *
 * 1. Full options object:
 * @example
 * ```typescript
 * @RequirePermission({
 *   action: PermissionAction.EXECUTE,
 *   resource: PermissionResource.BROWSER,
 *   scope: PermissionScope.CLUSTER,
 * })
 * async launchBrowser(params: any) {
 *   // Only executed if agent has browser:execute permission
 * }
 * ```
 *
 * 2. Simplified (resource + action strings):
 * @example
 * ```typescript
 * @RequirePermission('browser', 'execute')
 * async launchBrowser(params: any) {
 *   // Only executed if agent has execute:browser permission
 * }
 * ```
 *
 * 3. Array of options (all must pass):
 * @example
 * ```typescript
 * @RequirePermission([
 *   { action: PermissionAction.EXECUTE, resource: PermissionResource.BROWSER },
 *   { action: PermissionAction.READ, resource: PermissionResource.NETWORK },
 * ])
 * async launchBrowserWithNetwork(params: any) {
 *   // Only executed if agent has both permissions
 * }
 * ```
 */
export function RequirePermission(
  options: RequirePermissionOptions | RequirePermissionOptions[],
): MethodDecorator;
export function RequirePermission(resource: string, action: string): MethodDecorator;
export function RequirePermission(
  optionsOrResource: RequirePermissionOptions | RequirePermissionOptions[] | string,
  action?: string,
): MethodDecorator {
  let requirements: PermissionRequirement[];
  let mode: 'all' | 'any' = 'all';

  if (typeof optionsOrResource === 'string') {
    // Simplified signature: RequirePermission(resource, action)
    requirements = [
      {
        action: action!,
        resource: optionsOrResource,
      },
    ];
  } else if (Array.isArray(optionsOrResource)) {
    // Array of options
    requirements = optionsOrResource.map((opt) => ({
      action: opt.action,
      resource: opt.resource,
      scope: opt.scope,
      description: opt.description,
    }));
    mode = 'all';
  } else {
    // Single options object
    requirements = [
      {
        action: optionsOrResource.action,
        resource: optionsOrResource.resource,
        scope: optionsOrResource.scope,
        description: optionsOrResource.description,
      },
    ];
    mode = optionsOrResource.mode || 'all';
  }

  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const permissionMeta = {
      requirements,
      mode,
      methodName: typeof propertyKey === 'symbol' ? propertyKey.toString() : propertyKey,
    };

    SetMetadata(PERMISSION_METADATA_KEY, permissionMeta)(target, propertyKey, descriptor);

    // Accumulate permissions on the class
    const existingPermissions: any[] =
      Reflect.getMetadata(PERMISSIONS_METADATA_KEY, target.constructor) || [];

    existingPermissions.push(permissionMeta);
    Reflect.defineMetadata(PERMISSIONS_METADATA_KEY, existingPermissions, target.constructor);

    // Wrap the original method with permission check
    const originalMethod = descriptor.value;
    const methodName = typeof propertyKey === 'symbol' ? propertyKey.toString() : propertyKey;

    descriptor.value = async function (...args: any[]) {
      // Check if the agent instance has a permission checking method
      if (typeof (this as any).checkPermission === 'function') {
        for (const req of requirements) {
          try {
            await (this as any).checkPermission(req.action, req.resource);
          } catch (error) {
            const agentError = error as Error;
            (this as any).logger?.warn?.(
              `Permission denied for ${methodName}: ${req.action}:${req.resource} - ${agentError.message}`,
            );
            throw error;
          }
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Helper to extract permission requirements from a class.
 */
export function getPermissionRequirements(
  target: Function,
): Array<{
  requirements: PermissionRequirement[];
  mode: string;
  methodName: string;
}> {
  return Reflect.getMetadata(PERMISSIONS_METADATA_KEY, target) || [];
}

/**
 * @RequireAllPermissions() shorthand decorator
 * Requires ALL listed permissions to execute the method.
 */
export function RequireAllPermissions(
  ...perms: Array<{ action: PermissionAction | string; resource: PermissionResource | string }>
): MethodDecorator {
  return RequirePermission(
    perms.map((p) => ({
      action: p.action,
      resource: p.resource,
      mode: 'all' as const,
    })),
  );
}

/**
 * @RequireAnyPermission() shorthand decorator
 * Requires AT LEAST ONE of the listed permissions to execute the method.
 */
export function RequireAnyPermission(
  ...perms: Array<{ action: PermissionAction | string; resource: PermissionResource | string }>
): MethodDecorator {
  return RequirePermission(
    perms.map((p) => ({
      action: p.action,
      resource: p.resource,
      mode: 'any' as const,
    })),
  );
}
