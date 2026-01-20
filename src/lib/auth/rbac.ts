import { auth } from './config';
import { getDb } from '@/lib/db/config';
import type { ResourcePermission, PermissionLevel, ResourceType } from '@/types/database';

export interface SecurityContext {
  userId: string;
  roles: string[];
  permissions: string[];
}

export async function getSecurityContext(): Promise<SecurityContext | null> {
  const session = await auth();
  if (!session?.user) return null;

  return {
    userId: session.user.id,
    roles: session.user.roles,
    permissions: session.user.permissions,
  };
}

export function hasPermission(
  context: SecurityContext,
  permission: string
): boolean {
  // Check for wildcard admin permission
  if (context.permissions.includes('admin:*')) return true;

  // Check for exact permission match
  if (context.permissions.includes(permission)) return true;

  // Check for wildcard permission (e.g., 'report:*' matches 'report:view')
  const [resource, action] = permission.split(':');
  if (context.permissions.includes(`${resource}:*`)) return true;

  return false;
}

export function hasAnyPermission(
  context: SecurityContext,
  permissions: string[]
): boolean {
  return permissions.some((permission) => hasPermission(context, permission));
}

export function hasAllPermissions(
  context: SecurityContext,
  permissions: string[]
): boolean {
  return permissions.every((permission) => hasPermission(context, permission));
}

export function hasRole(context: SecurityContext, role: string): boolean {
  return context.roles.includes(role);
}

export function hasAnyRole(context: SecurityContext, roles: string[]): boolean {
  return roles.some((role) => hasRole(context, role));
}

export async function canAccessResource(
  context: SecurityContext,
  resourceType: ResourceType,
  resourceId: string,
  requiredLevel: PermissionLevel
): Promise<boolean> {
  // Admin has full access
  if (hasPermission(context, 'admin:*')) return true;

  // Check general permission for the resource type
  const generalPermission = `${resourceType}:${requiredLevel}`;
  if (hasPermission(context, generalPermission)) return true;

  // Check specific resource permissions
  const db = getDb();

  const roleIds = await db('roles')
    .whereIn('name', context.roles)
    .pluck('id');

  if (roleIds.length === 0) return false;

  const permission = await db<ResourcePermission>('resource_permissions')
    .where('resource_type', resourceType)
    .where('resource_id', resourceId)
    .whereIn('role_id', roleIds)
    .first();

  if (!permission) return false;

  // Check permission hierarchy
  const levelHierarchy: PermissionLevel[] = ['view', 'edit', 'execute', 'admin'];
  const requiredIndex = levelHierarchy.indexOf(requiredLevel);
  const grantedIndex = levelHierarchy.indexOf(permission.permission_level);

  return grantedIndex >= requiredIndex;
}

export async function getAccessibleResourceIds(
  context: SecurityContext,
  resourceType: ResourceType,
  minimumLevel: PermissionLevel = 'view'
): Promise<string[]> {
  // Admin can access all resources
  if (hasPermission(context, 'admin:*')) {
    return []; // Empty means no filtering needed
  }

  const db = getDb();

  const roleIds = await db('roles')
    .whereIn('name', context.roles)
    .pluck('id');

  if (roleIds.length === 0) return [];

  const levelHierarchy: PermissionLevel[] = ['view', 'edit', 'execute', 'admin'];
  const minimumIndex = levelHierarchy.indexOf(minimumLevel);
  const validLevels = levelHierarchy.slice(minimumIndex);

  const permissions = await db<ResourcePermission>('resource_permissions')
    .where('resource_type', resourceType)
    .whereIn('role_id', roleIds)
    .whereIn('permission_level', validLevels)
    .select('resource_id');

  return [...new Set(permissions.map((p) => p.resource_id))];
}

export async function grantResourcePermission(
  resourceType: ResourceType,
  resourceId: string,
  roleId: string,
  permissionLevel: PermissionLevel
): Promise<void> {
  const db = getDb();

  await db('resource_permissions')
    .insert({
      id: crypto.randomUUID(),
      resource_type: resourceType,
      resource_id: resourceId,
      role_id: roleId,
      permission_level: permissionLevel,
    })
    .onConflict(['resource_type', 'resource_id', 'role_id'])
    .merge({ permission_level: permissionLevel });
}

export async function revokeResourcePermission(
  resourceType: ResourceType,
  resourceId: string,
  roleId: string
): Promise<void> {
  const db = getDb();

  await db('resource_permissions')
    .where('resource_type', resourceType)
    .where('resource_id', resourceId)
    .where('role_id', roleId)
    .delete();
}

export function requirePermission(permission: string) {
  return async function () {
    const context = await getSecurityContext();
    if (!context) {
      throw new Error('Unauthorized: Not authenticated');
    }
    if (!hasPermission(context, permission)) {
      throw new Error(`Forbidden: Missing permission ${permission}`);
    }
    return context;
  };
}

export function requireAnyPermission(permissions: string[]) {
  return async function () {
    const context = await getSecurityContext();
    if (!context) {
      throw new Error('Unauthorized: Not authenticated');
    }
    if (!hasAnyPermission(context, permissions)) {
      throw new Error(`Forbidden: Missing one of permissions ${permissions.join(', ')}`);
    }
    return context;
  };
}

// Type exports for tests
export const ResourceType = {
  REPORT: 'report',
  CHART: 'chart',
  DASHBOARD: 'dashboard',
  QUERY: 'query',
  DATA_SOURCE: 'data_source',
  USER: 'user',
  ROLE: 'role',
  JOB: 'job',
} as const;

export const PermissionLevel = {
  VIEW: 'view',
  EDIT: 'edit',
  EXECUTE: 'execute',
  DELETE: 'delete',
  ADMIN: 'admin',
} as const;

export type Permission = string;

// Helper functions that take permissions array directly
export function hasPermissionArray(permissions: string[], required: string): boolean {
  // Check for full wildcard
  if (permissions.includes('*:*')) return true;

  // Check exact match
  if (permissions.includes(required)) return true;

  // Check resource wildcard
  const [resource, action] = required.split(':');
  if (permissions.includes(`${resource}:*`)) return true;

  // Check admin wildcard
  if (permissions.includes('admin:*') && resource === 'admin') return true;

  return false;
}

export function hasAnyPermissionArray(permissions: string[], required: string[]): boolean {
  if (required.length === 0) return false;
  return required.some((r) => hasPermissionArray(permissions, r));
}

export function hasAllPermissionsArray(permissions: string[], required: string[]): boolean {
  if (required.length === 0) return true;
  return required.every((r) => hasPermissionArray(permissions, r));
}

export function checkResourceAccess(
  permissions: string[],
  resourceType: string,
  action: string,
  resource: { id: string; created_by?: string },
  userId: string
): boolean {
  const permission = `${resourceType}:${action}`;
  const ownPermission = `${resourceType}:${action}:own`;
  const allPermission = `${resourceType}:${action}:all`;

  // Check full wildcard
  if (permissions.includes('*:*')) return true;

  // Check resource wildcard
  if (permissions.includes(`${resourceType}:*`)) return true;

  // Check unscoped permission (grants all access)
  if (permissions.includes(permission)) return true;

  // Check "all" scoped permission
  if (permissions.includes(allPermission)) return true;

  // Check "own" scoped permission - only owner can access
  if (permissions.includes(ownPermission)) {
    return resource.created_by === userId;
  }

  return false;
}

export function filterByPermission<T extends { id: string; created_by?: string }>(
  permissions: string[],
  resourceType: string,
  action: string,
  resources: T[],
  userId: string
): T[] {
  return resources.filter((resource) =>
    checkResourceAccess(permissions, resourceType, action, resource, userId)
  );
}

// RBACManager class for tests
export class RBACManager {
  parsePermission(permission: string): { resource: string; action: string; scope?: string } {
    const parts = permission.split(':');
    return {
      resource: parts[0],
      action: parts[1] || '*',
      scope: parts[2],
    };
  }

  checkPermission(userPermissions: string[], required: string): boolean {
    return hasPermissionArray(userPermissions, required);
  }

  hasAnyPermission(userPermissions: string[], required: string[]): boolean {
    return hasAnyPermissionArray(userPermissions, required);
  }

  hasAllPermissions(userPermissions: string[], required: string[]): boolean {
    return hasAllPermissionsArray(userPermissions, required);
  }

  checkResourceAccess(
    userPermissions: string[],
    resourceType: string,
    action: string,
    resource: { id: string; created_by?: string },
    userId: string
  ): boolean {
    return checkResourceAccess(userPermissions, resourceType, action, resource, userId);
  }

  aggregateRolePermissions(roles: { name: string; permissions: string[] }[]): string[] {
    const allPermissions = roles.flatMap((r) => r.permissions);
    return [...new Set(allPermissions)];
  }

  isAdmin(permissions: string[]): boolean {
    return permissions.includes('admin:*');
  }

  isSuperAdmin(permissions: string[]): boolean {
    return permissions.includes('*:*');
  }

  isValidPermission(permission: string): boolean {
    if (!permission || permission.length === 0) return false;
    const parts = permission.split(':');
    if (parts.length < 2 || parts.length > 3) return false;
    return parts.every((p) => p.length > 0);
  }
}

// Note: hasPermission, hasAnyPermission, hasAllPermissions are already exported as context-based functions
// Use hasPermissionArray, hasAnyPermissionArray, hasAllPermissionsArray for array-based checks
