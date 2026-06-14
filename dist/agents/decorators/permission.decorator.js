"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSIONS_METADATA_KEY = exports.PERMISSION_METADATA_KEY = void 0;
exports.RequirePermission = RequirePermission;
exports.getPermissionRequirements = getPermissionRequirements;
exports.RequireAllPermissions = RequireAllPermissions;
exports.RequireAnyPermission = RequireAnyPermission;
const common_1 = require("@nestjs/common");
exports.PERMISSION_METADATA_KEY = 'agent:permission';
exports.PERMISSIONS_METADATA_KEY = 'agent:permissions';
function RequirePermission(optionsOrResource, action) {
    let requirements;
    let mode = 'all';
    if (typeof optionsOrResource === 'string') {
        requirements = [
            {
                action: action,
                resource: optionsOrResource,
            },
        ];
    }
    else if (Array.isArray(optionsOrResource)) {
        requirements = optionsOrResource.map((opt) => ({
            action: opt.action,
            resource: opt.resource,
            scope: opt.scope,
            description: opt.description,
        }));
        mode = 'all';
    }
    else {
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
    return (target, propertyKey, descriptor) => {
        const permissionMeta = {
            requirements,
            mode,
            methodName: typeof propertyKey === 'symbol' ? propertyKey.toString() : propertyKey,
        };
        (0, common_1.SetMetadata)(exports.PERMISSION_METADATA_KEY, permissionMeta)(target, propertyKey, descriptor);
        const existingPermissions = Reflect.getMetadata(exports.PERMISSIONS_METADATA_KEY, target.constructor) || [];
        existingPermissions.push(permissionMeta);
        Reflect.defineMetadata(exports.PERMISSIONS_METADATA_KEY, existingPermissions, target.constructor);
        const originalMethod = descriptor.value;
        const methodName = typeof propertyKey === 'symbol' ? propertyKey.toString() : propertyKey;
        descriptor.value = async function (...args) {
            if (typeof this.checkPermission === 'function') {
                for (const req of requirements) {
                    try {
                        await this.checkPermission(req.action, req.resource);
                    }
                    catch (error) {
                        const agentError = error;
                        this.logger?.warn?.(`Permission denied for ${methodName}: ${req.action}:${req.resource} - ${agentError.message}`);
                        throw error;
                    }
                }
            }
            return originalMethod.apply(this, args);
        };
        return descriptor;
    };
}
function getPermissionRequirements(target) {
    return Reflect.getMetadata(exports.PERMISSIONS_METADATA_KEY, target) || [];
}
function RequireAllPermissions(...perms) {
    return RequirePermission(perms.map((p) => ({
        action: p.action,
        resource: p.resource,
        mode: 'all',
    })));
}
function RequireAnyPermission(...perms) {
    return RequirePermission(perms.map((p) => ({
        action: p.action,
        resource: p.resource,
        mode: 'any',
    })));
}
//# sourceMappingURL=permission.decorator.js.map