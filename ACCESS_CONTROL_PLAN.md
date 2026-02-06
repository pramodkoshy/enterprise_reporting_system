# Access Control System Design

## Overview
Implement a comprehensive permission-based access control system that restricts user access to dashboards, reports, charts, and filters based on user roles and explicit permissions.

## Architecture

### Permission Levels
- `view` - Can view the resource
- `edit` - Can edit the resource configuration
- `execute` - Can execute/run the resource
- `admin` - Full control including delete and grant permissions

### Permission Sources (Combined with OR logic)
1. **Role Permissions** - Defined in `roles.permissions` as JSON array of permission strings
   - Format: `"{resource_type}:{action}"`
   - Wildcard support: `{resource_type}:*`, `admin:*`
   - Example: `["dashboard:view", "report:*", "chart:view"]`

2. **Resource-Level Permissions** - Defined in `resource_permissions` table
   - Links a specific resource instance to a role
   - Grants specific permission level on that resource
   - Example: role "Viewer" gets "view" access to dashboard ID "123"

### Access Control Flow
```
User Request
    ↓
Check if user is Admin (role: Admin) → Full Access
    ↓
Check Resource-Level Permissions (resource_permissions table)
    ↓
Check Role Permissions (roles.permissions JSON)
    ↓
Grant/Deny Access
```

## Implementation Plan

### Phase 1: Backend Permission System
1. **Permission Helper Functions** (`lib/permissions/`)
   - `getUserPermissions()` - Get all permissions for a user
   - `hasPermission()` - Check if user has specific permission
   - `hasResourceAccess()` - Check access to specific resource
   - `filterAccessibleResources()` - Filter list of resources

2. **API Middleware**
   - Middleware to check permissions before processing requests
   - Automatic 403 responses for unauthorized access

3. **API Route Updates**
   - Add permission checks to all routes:
     - `/api/dashboards/*`
     - `/api/reports/*`
     - `/api/charts/*`
     - `/api/filters/*`

### Phase 2: Frontend Permission System
1. **Permission Hooks** (`hooks/usePermissions.ts`)
   - `usePermissions()` - Get user's permissions
   - `useCanView()` - Check if can view resource
   - `useCanEdit()` - Check if can edit resource
   - `useCanDelete()` - Check if can delete resource

2. **Component Updates**
   - Filter lists based on permissions
   - Hide/disable action buttons
   - Show "Access Denied" messages

### Phase 3: Admin Interfaces
1. **User Management** (`/admin/users`)
   - List all users
   - Create/edit users
   - Assign roles to users
   - Reset passwords

2. **Role Management** (`/admin/roles`)
   - List all roles
   - Create/edit roles
   - Set role permissions (checkbox matrix)
   - Delete roles (except admin)

3. **Permission Management** (`/admin/permissions`)
   - Resource-level permission matrix
   - Grant permissions by role
   - Bulk operations

## Database Schema Updates

### Already Exists:
- `users` - User accounts
- `roles` - Role definitions with permissions JSON
- `user_roles` - User-role junction table
- `resource_permissions` - Resource-to-role permissions

### No schema changes needed - using existing tables!

## Permission Matrix

### Admin Role
```
admin:* - Full system access
```

### Analyst Role
```
data_source:view
query:* (create, edit, view, execute)
report:* (all actions)
chart:* (all actions)
dashboard:view, dashboard:edit
job:execute, job:view
```

### Viewer Role
```
data_source:view
query:view
report:view, report:export
chart:view
dashboard:view
```

### Resource-Level Override Example
Even if a Viewer role doesn't have `report:edit`, an admin can grant:
- role_id: "Viewer"
- resource_type: "report"
- resource_id: "abc-123"
- permission_level: "edit"

This allows Viewers to edit that specific report, overriding their default role permissions.

## Implementation Order

1. ✅ Permission helper functions
2. ✅ Update API routes with permission checks
3. ✅ Create permission hooks
4. ✅ Build user management UI
5. ✅ Build role management UI
6. ✅ Build permission management UI
7. ✅ Update frontend to use permissions
8. ✅ Test with different user roles

## Testing Strategy
1. Create test users with different roles
2. Verify API access control works
3. Verify frontend filtering works
4. Test permission inheritance
5. Test resource-level overrides
