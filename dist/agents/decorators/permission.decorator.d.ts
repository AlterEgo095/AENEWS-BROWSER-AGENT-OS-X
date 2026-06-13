import { PermissionAction, PermissionResource, PermissionScope } from '../interfaces/agent-permission.interface';
export declare const PERMISSION_METADATA_KEY = "agent:permission";
export declare const PERMISSIONS_METADATA_KEY = "agent:permissions";
export interface PermissionRequirement {
    action: PermissionAction | string;
    resource: PermissionResource | string;
    scope?: PermissionScope;
    description?: string;
}
export interface RequirePermissionOptions {
    action: PermissionAction | string;
    resource: PermissionResource | string;
    scope?: PermissionScope;
    description?: string;
    mode?: 'all' | 'any';
}
export declare function RequirePermission(options: RequirePermissionOptions | RequirePermissionOptions[]): MethodDecorator;
export declare function RequirePermission(resource: string, action: string): MethodDecorator;
export declare function getPermissionRequirements(target: Function): Array<{
    requirements: PermissionRequirement[];
    mode: string;
    methodName: string;
}>;
export declare function RequireAllPermissions(...perms: Array<{
    action: PermissionAction | string;
    resource: PermissionResource | string;
}>): MethodDecorator;
export declare function RequireAnyPermission(...perms: Array<{
    action: PermissionAction | string;
    resource: PermissionResource | string;
}>): MethodDecorator;
