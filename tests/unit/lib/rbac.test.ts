import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the auth and db modules before importing rbac
vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/db/config', () => ({
  getDb: vi.fn(),
}));

import {
  RBACManager,
  hasPermissionArray,
  hasAnyPermissionArray,
  hasAllPermissionsArray,
  checkResourceAccess,
  filterByPermission,
  Permission,
  ResourceType,
  PermissionLevel,
} from '@/lib/auth/rbac';

describe('RBACManager', () => {
  let rbac: RBACManager;

  beforeEach(() => {
    rbac = new RBACManager();
  });

  describe('Permission Parsing', () => {
    it('should parse simple permission string', () => {
      const parsed = rbac.parsePermission('report:view');
      expect(parsed.resource).toBe('report');
      expect(parsed.action).toBe('view');
      expect(parsed.scope).toBeUndefined();
    });

    it('should parse permission with scope', () => {
      const parsed = rbac.parsePermission('report:edit:own');
      expect(parsed.resource).toBe('report');
      expect(parsed.action).toBe('edit');
      expect(parsed.scope).toBe('own');
    });

    it('should parse wildcard permission', () => {
      const parsed = rbac.parsePermission('admin:*');
      expect(parsed.resource).toBe('admin');
      expect(parsed.action).toBe('*');
    });

    it('should parse full wildcard', () => {
      const parsed = rbac.parsePermission('*:*');
      expect(parsed.resource).toBe('*');
      expect(parsed.action).toBe('*');
    });
  });

  describe('Permission Checking', () => {
    it('should grant access with exact permission match', () => {
      const userPermissions = ['report:view', 'report:edit'];
      expect(rbac.checkPermission(userPermissions, 'report:view')).toBe(true);
    });

    it('should deny access without matching permission', () => {
      const userPermissions = ['report:view'];
      expect(rbac.checkPermission(userPermissions, 'report:delete')).toBe(false);
    });

    it('should grant access with wildcard action', () => {
      const userPermissions = ['report:*'];
      expect(rbac.checkPermission(userPermissions, 'report:view')).toBe(true);
      expect(rbac.checkPermission(userPermissions, 'report:edit')).toBe(true);
      expect(rbac.checkPermission(userPermissions, 'report:delete')).toBe(true);
    });

    it('should grant access with admin wildcard', () => {
      const userPermissions = ['admin:*'];
      expect(rbac.checkPermission(userPermissions, 'admin:users')).toBe(true);
      expect(rbac.checkPermission(userPermissions, 'admin:settings')).toBe(true);
    });

    it('should grant access with full wildcard', () => {
      const userPermissions = ['*:*'];
      expect(rbac.checkPermission(userPermissions, 'report:view')).toBe(true);
      expect(rbac.checkPermission(userPermissions, 'user:delete')).toBe(true);
      expect(rbac.checkPermission(userPermissions, 'admin:everything')).toBe(true);
    });

    it('should handle empty permissions array', () => {
      const userPermissions: string[] = [];
      expect(rbac.checkPermission(userPermissions, 'report:view')).toBe(false);
    });

    it('should handle scoped permissions', () => {
      const userPermissions = ['report:edit:own', 'report:view:all'];
      expect(rbac.checkPermission(userPermissions, 'report:edit:own')).toBe(true);
      expect(rbac.checkPermission(userPermissions, 'report:view:all')).toBe(true);
      expect(rbac.checkPermission(userPermissions, 'report:edit:all')).toBe(false);
    });
  });

  describe('Multiple Permission Checking', () => {
    it('should check if user has any of the required permissions', () => {
      const userPermissions = ['report:view', 'dashboard:view'];
      expect(rbac.hasAnyPermission(userPermissions, ['report:view', 'report:edit'])).toBe(true);
      expect(rbac.hasAnyPermission(userPermissions, ['report:delete', 'user:manage'])).toBe(false);
    });

    it('should check if user has all required permissions', () => {
      const userPermissions = ['report:view', 'report:edit', 'dashboard:view'];
      expect(rbac.hasAllPermissions(userPermissions, ['report:view', 'report:edit'])).toBe(true);
      expect(rbac.hasAllPermissions(userPermissions, ['report:view', 'report:delete'])).toBe(false);
    });

    it('should handle empty required permissions', () => {
      const userPermissions = ['report:view'];
      expect(rbac.hasAnyPermission(userPermissions, [])).toBe(false);
      expect(rbac.hasAllPermissions(userPermissions, [])).toBe(true);
    });
  });

  describe('Resource Access Control', () => {
    it('should check resource access for owner', () => {
      const userPermissions = ['report:edit:own'];
      const resource = { id: '1', created_by: 'user123' };
      const userId = 'user123';

      expect(rbac.checkResourceAccess(userPermissions, 'report', 'edit', resource, userId)).toBe(true);
    });

    it('should deny resource access for non-owner with own scope', () => {
      const userPermissions = ['report:edit:own'];
      const resource = { id: '1', created_by: 'other_user' };
      const userId = 'user123';

      expect(rbac.checkResourceAccess(userPermissions, 'report', 'edit', resource, userId)).toBe(false);
    });

    it('should grant resource access with all scope', () => {
      const userPermissions = ['report:edit:all'];
      const resource = { id: '1', created_by: 'other_user' };
      const userId = 'user123';

      expect(rbac.checkResourceAccess(userPermissions, 'report', 'edit', resource, userId)).toBe(true);
    });

    it('should grant access with unscoped permission', () => {
      const userPermissions = ['report:edit'];
      const resource = { id: '1', created_by: 'other_user' };
      const userId = 'user123';

      expect(rbac.checkResourceAccess(userPermissions, 'report', 'edit', resource, userId)).toBe(true);
    });
  });

  describe('Role-Based Permission Aggregation', () => {
    it('should aggregate permissions from multiple roles', () => {
      const roles = [
        { name: 'viewer', permissions: ['report:view', 'dashboard:view'] },
        { name: 'editor', permissions: ['report:edit', 'chart:edit'] },
      ];

      const aggregated = rbac.aggregateRolePermissions(roles);
      expect(aggregated).toContain('report:view');
      expect(aggregated).toContain('dashboard:view');
      expect(aggregated).toContain('report:edit');
      expect(aggregated).toContain('chart:edit');
    });

    it('should deduplicate permissions', () => {
      const roles = [
        { name: 'viewer', permissions: ['report:view', 'dashboard:view'] },
        { name: 'analyst', permissions: ['report:view', 'report:edit'] },
      ];

      const aggregated = rbac.aggregateRolePermissions(roles);
      const reportViewCount = aggregated.filter(p => p === 'report:view').length;
      expect(reportViewCount).toBe(1);
    });

    it('should handle empty roles', () => {
      const aggregated = rbac.aggregateRolePermissions([]);
      expect(aggregated).toHaveLength(0);
    });
  });

  describe('Permission Hierarchy', () => {
    it('should recognize admin permission includes all', () => {
      const userPermissions = ['admin:*'];
      expect(rbac.isAdmin(userPermissions)).toBe(true);
    });

    it('should recognize super admin', () => {
      const userPermissions = ['*:*'];
      expect(rbac.isSuperAdmin(userPermissions)).toBe(true);
    });

    it('should not falsely identify admin', () => {
      const userPermissions = ['report:*', 'dashboard:*'];
      expect(rbac.isAdmin(userPermissions)).toBe(false);
    });
  });

  describe('Permission Validation', () => {
    it('should validate correct permission format', () => {
      expect(rbac.isValidPermission('report:view')).toBe(true);
      expect(rbac.isValidPermission('report:edit:own')).toBe(true);
      expect(rbac.isValidPermission('admin:*')).toBe(true);
    });

    it('should reject invalid permission format', () => {
      expect(rbac.isValidPermission('invalid')).toBe(false);
      expect(rbac.isValidPermission('')).toBe(false);
      expect(rbac.isValidPermission('too:many:colons:here')).toBe(false);
    });
  });
});

describe('Helper Functions', () => {
  describe('hasPermissionArray', () => {
    it('should check single permission', () => {
      const permissions = ['report:view', 'dashboard:view'];
      expect(hasPermissionArray(permissions, 'report:view')).toBe(true);
      expect(hasPermissionArray(permissions, 'report:edit')).toBe(false);
    });
  });

  describe('hasAnyPermissionArray', () => {
    it('should check for any matching permission', () => {
      const permissions = ['report:view'];
      expect(hasAnyPermissionArray(permissions, ['report:view', 'report:edit'])).toBe(true);
      expect(hasAnyPermissionArray(permissions, ['report:delete', 'user:manage'])).toBe(false);
    });
  });

  describe('hasAllPermissionsArray', () => {
    it('should check for all matching permissions', () => {
      const permissions = ['report:view', 'report:edit'];
      expect(hasAllPermissionsArray(permissions, ['report:view', 'report:edit'])).toBe(true);
      expect(hasAllPermissionsArray(permissions, ['report:view', 'report:delete'])).toBe(false);
    });
  });

  describe('checkResourceAccess', () => {
    it('should check access to specific resource', () => {
      const permissions = ['report:edit:own'];
      const resource = { id: '1', created_by: 'user1' };

      expect(checkResourceAccess(permissions, 'report', 'edit', resource, 'user1')).toBe(true);
      expect(checkResourceAccess(permissions, 'report', 'edit', resource, 'user2')).toBe(false);
    });
  });

  describe('filterByPermission', () => {
    it('should filter resources based on permission', () => {
      const permissions = ['report:view:own'];
      const resources = [
        { id: '1', created_by: 'user1', name: 'Report 1' },
        { id: '2', created_by: 'user2', name: 'Report 2' },
        { id: '3', created_by: 'user1', name: 'Report 3' },
      ];

      const filtered = filterByPermission(permissions, 'report', 'view', resources, 'user1');
      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.id)).toContain('1');
      expect(filtered.map(r => r.id)).toContain('3');
    });

    it('should return all resources with wildcard permission', () => {
      const permissions = ['report:*'];
      const resources = [
        { id: '1', created_by: 'user1', name: 'Report 1' },
        { id: '2', created_by: 'user2', name: 'Report 2' },
      ];

      const filtered = filterByPermission(permissions, 'report', 'view', resources, 'user1');
      expect(filtered).toHaveLength(2);
    });

    it('should return empty array with no matching permission', () => {
      const permissions = ['dashboard:view'];
      const resources = [
        { id: '1', created_by: 'user1', name: 'Report 1' },
      ];

      const filtered = filterByPermission(permissions, 'report', 'view', resources, 'user1');
      expect(filtered).toHaveLength(0);
    });
  });
});

describe('Permission Types', () => {
  it('should have correct ResourceType values', () => {
    expect(ResourceType.REPORT).toBe('report');
    expect(ResourceType.CHART).toBe('chart');
    expect(ResourceType.DASHBOARD).toBe('dashboard');
    expect(ResourceType.QUERY).toBe('query');
    expect(ResourceType.DATA_SOURCE).toBe('data_source');
    expect(ResourceType.USER).toBe('user');
    expect(ResourceType.ROLE).toBe('role');
    expect(ResourceType.JOB).toBe('job');
  });

  it('should have correct PermissionLevel values', () => {
    expect(PermissionLevel.VIEW).toBe('view');
    expect(PermissionLevel.EDIT).toBe('edit');
    expect(PermissionLevel.EXECUTE).toBe('execute');
    expect(PermissionLevel.DELETE).toBe('delete');
    expect(PermissionLevel.ADMIN).toBe('admin');
  });
});

describe('Complex Permission Scenarios', () => {
  let rbac: RBACManager;

  beforeEach(() => {
    rbac = new RBACManager();
  });

  it('should handle analyst role permissions', () => {
    const analystPermissions = [
      'data_source:view',
      'query:*',
      'report:*',
      'chart:*',
      'dashboard:view',
      'dashboard:edit',
      'job:execute',
      'job:view',
    ];

    expect(rbac.checkPermission(analystPermissions, 'query:create')).toBe(true);
    expect(rbac.checkPermission(analystPermissions, 'report:delete')).toBe(true);
    expect(rbac.checkPermission(analystPermissions, 'dashboard:delete')).toBe(false);
    expect(rbac.checkPermission(analystPermissions, 'data_source:create')).toBe(false);
  });

  it('should handle viewer role permissions', () => {
    const viewerPermissions = [
      'data_source:view',
      'query:view',
      'report:view',
      'report:export',
      'chart:view',
      'dashboard:view',
    ];

    expect(rbac.checkPermission(viewerPermissions, 'report:view')).toBe(true);
    expect(rbac.checkPermission(viewerPermissions, 'report:export')).toBe(true);
    expect(rbac.checkPermission(viewerPermissions, 'report:edit')).toBe(false);
    expect(rbac.checkPermission(viewerPermissions, 'dashboard:edit')).toBe(false);
  });

  it('should handle admin role permissions', () => {
    const adminPermissions = ['admin:*'];

    expect(rbac.checkPermission(adminPermissions, 'admin:users')).toBe(true);
    expect(rbac.checkPermission(adminPermissions, 'admin:roles')).toBe(true);
    expect(rbac.checkPermission(adminPermissions, 'admin:settings')).toBe(true);
    // Admin doesn't automatically have non-admin permissions
    expect(rbac.checkPermission(adminPermissions, 'report:view')).toBe(false);
  });

  it('should handle combined admin and resource permissions', () => {
    const superUserPermissions = ['admin:*', 'report:*', 'dashboard:*', 'chart:*', 'query:*'];

    expect(rbac.checkPermission(superUserPermissions, 'admin:users')).toBe(true);
    expect(rbac.checkPermission(superUserPermissions, 'report:delete')).toBe(true);
    expect(rbac.checkPermission(superUserPermissions, 'dashboard:create')).toBe(true);
  });
});
