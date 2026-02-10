/**
 * Unit Tests for Role Permissions API Endpoint
 * Tests /api/admin/roles/[id]/permissions
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/admin/roles/[id]/permissions/route';
import { getDb } from '@/lib/db/config';

// Mock the auth module
jest.mock('@/lib/auth/config', () => ({
  auth: jest.fn(),
}));

// Mock the permissions module
jest.mock('@/lib/permissions/permissions', () => ({
  isAdmin: jest.fn().mockResolvedValue(true),
}));

// Mock the database
jest.mock('@/lib/db/config', () => ({
  getDb: jest.fn(),
}));

describe('/api/admin/roles/[id]/permissions', () => {
  let mockDb: any;

  beforeEach(() => {
    // Setup mock database
    mockDb = jest.fn();

    mockDb.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      first: jest.fn().mockResolvedValue({ id: 'test-role-id', name: 'Test Role' }),
    });

    (getDb as jest.Mock).mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/roles/[id]/permissions', () => {
    it('should return 401 if not authenticated', async () => {
      const { auth } = require('@/lib/auth/config');
      (auth as jest.Mock).mockResolvedValue(null);

      const { req } = createMocks({
        method: 'GET',
        params: { id: 'test-role-id' },
      });

      const response = await GET(req as any, { params: Promise.resolve({ id: 'test-role-id' }) });

      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 if not admin', async () => {
      const { auth } = require('@/lib/auth/config');
      const { isAdmin } = require('@/lib/permissions/permissions');

      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-id' } });
      (isAdmin as jest.Mock).mockResolvedValue(false);

      const { req } = createMocks({
        method: 'GET',
        params: { id: 'test-role-id' },
      });

      const response = await GET(req as any, { params: Promise.resolve({ id: 'test-role-id' }) });

      expect(response.status).toBe(403);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('should fetch resources and permissions for a role', async () => {
      const { auth } = require('@/lib/auth/config');
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'admin-id' } });

      const mockResources = {
        reports: [{ id: 'report-1', title: 'Report 1', type: 'report' }],
        charts: [{ id: 'chart-1', title: 'Chart 1', type: 'chart' }],
        dashboards: [{ id: 'dashboard-1', title: 'Dashboard 1', type: 'dashboard' }],
      };

      const mockPermissions = [
        { id: 'perm-1', role_id: 'test-role-id', resource_type: 'report', resource_id: 'report-1', permission_level: 'view' },
      ];

      // Setup mock chain for resources
      const dbInstance = mockDb();
      dbInstance.select = jest.fn().mockReturnValue(dbInstance);
      dbInstance.where = jest.fn().mockReturnValue(dbInstance);
      dbInstance.join = jest.fn().mockReturnValue(dbInstance);

      // Mock Promise.all to return resources
      jest.spyOn(Promise, 'all').mockResolvedValueOnce([
        mockResources.reports,
        mockResources.charts,
        mockResources.dashboards,
      ]);

      // Mock resource permissions query
      dbInstance.select = jest.fn().mockReturnValue(dbInstance);
      dbInstance.join = jest.fn().mockReturnValue(dbInstance);
      dbInstance.where = jest.fn().mockResolvedValue(mockPermissions);

      const { req } = createMocks({
        method: 'GET',
        params: { id: 'test-role-id' },
      });

      const response = await GET(req as any, { params: Promise.resolve({ id: 'test-role-id' }) });

      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty('resources');
      expect(json.data).toHaveProperty('resourcePermissions');
      expect(json.data.resourcePermissions).toEqual(mockPermissions);
    });

    it('should handle server errors gracefully', async () => {
      const { auth } = require('@/lib/auth/config');
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'admin-id' } });

      // Mock database to throw error
      (getDb as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const { req } = createMocks({
        method: 'GET',
        params: { id: 'test-role-id' },
      });

      const response = await GET(req as any, { params: Promise.resolve({ id: 'test-role-id' }) });

      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('SERVER_ERROR');
    });
  });

  describe('POST /api/admin/roles/[id]/permissions', () => {
    it('should return 401 if not authenticated', async () => {
      const { auth } = require('@/lib/auth/config');
      (auth as jest.Mock).mockResolvedValue(null);

      const requestBody = {
        permissions: [
          { resourceType: 'report', resourceId: 'report-1', permissionLevel: 'view' },
        ],
      };

      const { req } = createMocks({
        method: 'POST',
        body: requestBody,
        params: { id: 'test-role-id' },
      });

      // Mock req.json()
      req.json = async () => requestBody;

      const response = await POST(req as any, { params: Promise.resolve({ id: 'test-role-id' }) });

      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 if not admin', async () => {
      const { auth } = require('@/lib/auth/config');
      const { isAdmin } = require('@/lib/permissions/permissions');

      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-id' } });
      (isAdmin as jest.Mock).mockResolvedValue(false);

      const requestBody = {
        permissions: [
          { resourceType: 'report', resourceId: 'report-1', permissionLevel: 'view' },
        ],
      };

      const { req } = createMocks({
        method: 'POST',
        body: requestBody,
        params: { id: 'test-role-id' },
      });

      req.json = async () => requestBody;

      const response = await POST(req as any, { params: Promise.resolve({ id: 'test-role-id' }) });

      expect(response.status).toBe(403);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 if permissions is not an array', async () => {
      const { auth } = require('@/lib/auth/config');
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'admin-id' } });

      const requestBody = {
        permissions: 'not-an-array',
      };

      const { req } = createMocks({
        method: 'POST',
        body: requestBody,
        params: { id: 'test-role-id' },
      });

      req.json = async () => requestBody;

      const response = await POST(req as any, { params: Promise.resolve({ id: 'test-role-id' }) });

      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_INPUT');
    });

    it('should return 404 if role does not exist', async () => {
      const { auth } = require('@/lib/auth/config');
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'admin-id' } });

      const dbInstance = mockDb();
      dbInstance.first = jest.fn().mockResolvedValue(null);

      const requestBody = {
        permissions: [
          { resourceType: 'report', resourceId: 'report-1', permissionLevel: 'view' },
        ],
      };

      const { req } = createMocks({
        method: 'POST',
        body: requestBody,
        params: { id: 'non-existent-role' },
      });

      req.json = async () => requestBody;

      const response = await POST(req as any, { params: Promise.resolve({ id: 'non-existent-role' }) });

      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('should update resource permissions for a role', async () => {
      const { auth } = require('@/lib/auth/config');
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'admin-id' } });

      const dbInstance = mockDb();

      // Mock delete
      dbInstance.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      // Mock insert
      dbInstance.insert = jest.fn().mockResolvedValue(undefined);

      const requestBody = {
        permissions: [
          { resourceType: 'report', resourceId: 'report-1', permissionLevel: 'view' },
          { resourceType: 'chart', resourceId: 'chart-1', permissionLevel: 'edit' },
          { resourceType: 'dashboard', resourceId: 'dashboard-1', permissionLevel: 'admin' },
        ],
      };

      const { req } = createMocks({
        method: 'POST',
        body: requestBody,
        params: { id: 'test-role-id' },
      });

      req.json = async () => requestBody;

      const response = await POST(req as any, { params: Promise.resolve({ id: 'test-role-id' }) });

      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(dbInstance.delete).toHaveBeenCalled();
      expect(dbInstance.insert).toHaveBeenCalled();
    });

    it('should clear all permissions when empty array is provided', async () => {
      const { auth } = require('@/lib/auth/config');
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'admin-id' } });

      const dbInstance = mockDb();

      // Mock delete
      dbInstance.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const requestBody = {
        permissions: [],
      };

      const { req } = createMocks({
        method: 'POST',
        body: requestBody,
        params: { id: 'test-role-id' },
      });

      req.json = async () => requestBody;

      const response = await POST(req as any, { params: Promise.resolve({ id: 'test-role-id' }) });

      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(dbInstance.delete).toHaveBeenCalled();
      // Insert should not be called for empty array
      expect(dbInstance.insert).not.toHaveBeenCalled();
    });

    it('should handle permission levels: view, edit, admin, delete', async () => {
      const { auth } = require('@/lib/auth/config');
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'admin-id' } });

      const dbInstance = mockDb();

      dbInstance.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      dbInstance.insert = jest.fn().mockResolvedValue(undefined);

      const requestBody = {
        permissions: [
          { resourceType: 'report', resourceId: 'report-1', permissionLevel: 'view' },
          { resourceType: 'report', resourceId: 'report-2', permissionLevel: 'edit' },
          { resourceType: 'chart', resourceId: 'chart-1', permissionLevel: 'admin' },
          { resourceType: 'dashboard', resourceId: 'dashboard-1', permissionLevel: 'delete' },
        ],
      };

      const { req } = createMocks({
        method: 'POST',
        body: requestBody,
        params: { id: 'test-role-id' },
      });

      req.json = async () => requestBody;

      const response = await POST(req as any, { params: Promise.resolve({ id: 'test-role-id' }) });

      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);

      // Verify insert was called with correct permission levels
      const insertCall = dbInstance.insert;
      expect(insertCall).toHaveBeenCalled();
    });

    it('should handle server errors gracefully', async () => {
      const { auth } = require('@/lib/auth/config');
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'admin-id' } });

      // Mock database to throw error
      (getDb as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const requestBody = {
        permissions: [
          { resourceType: 'report', resourceId: 'report-1', permissionLevel: 'view' },
        ],
      };

      const { req } = createMocks({
        method: 'POST',
        body: requestBody,
        params: { id: 'test-role-id' },
      });

      req.json = async () => requestBody;

      const response = await POST(req as any, { params: Promise.resolve({ id: 'test-role-id' }) });

      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('SERVER_ERROR');
    });
  });
});
