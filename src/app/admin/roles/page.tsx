'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldPlus, Shield, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import type { Role } from '@/types/database';

const PERMISSION_OPTIONS = [
  { value: 'data_source:view', label: 'Data Sources - View' },
  { value: 'data_source:*', label: 'Data Sources - Full Access' },
  { value: 'query:view', label: 'Queries - View' },
  { value: 'query:*', label: 'Queries - Full Access' },
  { value: 'report:view', label: 'Reports - View' },
  { value: 'report:export', label: 'Reports - Export' },
  { value: 'report:*', label: 'Reports - Full Access' },
  { value: 'chart:view', label: 'Charts - View' },
  { value: 'chart:*', label: 'Charts - Full Access' },
  { value: 'dashboard:view', label: 'Dashboards - View' },
  { value: 'dashboard:edit', label: 'Dashboards - Edit' },
  { value: 'dashboard:*', label: 'Dashboards - Full Access' },
  { value: 'job:view', label: 'Jobs - View' },
  { value: 'job:execute', label: 'Jobs - Execute' },
  { value: 'job:*', label: 'Jobs - Full Access' },
  { value: 'user:*', label: 'Users - Full Access (Admin)' },
];

const PERMISSION_CATEGORIES = {
  'Data Sources': ['data_source:view', 'data_source:*'],
  'Queries': ['query:view', 'query:*'],
  'Reports': ['report:view', 'report:export', 'report:*'],
  'Charts': ['chart:view', 'chart:*'],
  'Dashboards': ['dashboard:view', 'dashboard:edit', 'dashboard:*'],
  'Jobs': ['job:view', 'job:execute', 'job:*'],
  'Administration': ['user:*'],
};

export default function RolesManagementPage() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Fetch roles
  const { data: roles, isLoading } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      return data.data || [];
    },
  });

  // Create role mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleName,
          description: roleDescription,
          permissions: JSON.stringify(selectedPermissions),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to create role');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Role created successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update role mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRole) return;
      const res = await fetch(`/api/admin/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: roleDescription,
          permissions: JSON.stringify(selectedPermissions),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to update role');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setEditDialogOpen(false);
      setSelectedRole(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete role mutation
  const deleteMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const res = await fetch(`/api/admin/roles/${roleId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to delete role');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Role deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions([]);
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    try {
      const perms = JSON.parse(role.permissions);
      setSelectedPermissions(perms);
    } catch {
      setSelectedPermissions([]);
    }
    setEditDialogOpen(true);
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const getRoleBadgeColor = (roleName: string) => {
    if (roleName === 'Admin') return 'default';
    if (roleName === 'Analyst') return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">
            Manage roles and their permissions
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <ShieldPlus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            All Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading roles...</div>
          ) : !roles || roles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No roles found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">
                      <Badge variant={getRoleBadgeColor(role.name)}>{role.name}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {role.description || 'No description'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {(() => {
                          try {
                            const perms = JSON.parse(role.permissions);
                            return perms.slice(0, 3).map((perm: string) => (
                              <Badge key={perm} variant="outline" className="text-xs">
                                {perm}
                              </Badge>
                            ));
                          } catch {
                            return null;
                          }
                        })()}
                        {(() => {
                          try {
                            const perms = JSON.parse(role.permissions);
                            return perms.length > 3 ? (
                              <Badge variant="outline" className="text-xs">
                                +{perms.length - 3} more
                              </Badge>
                            ) : null;
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(role)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (role.name === 'Admin') {
                            toast.error('Cannot delete Admin role');
                            return;
                          }
                          if (confirm(`Are you sure you want to delete role "${role.name}"?`)) {
                            deleteMutation.mutate(role.id);
                          }
                        }}
                        disabled={role.name === 'Admin'}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Role</DialogTitle>
            <DialogDescription>
              Create a new role and define its permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name *</Label>
              <Input
                id="role-name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g., Viewer, Editor, Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Textarea
                id="role-description"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Describe what this role can do..."
                rows={2}
              />
            </div>

            <div className="space-y-4">
              <Label>Permissions</Label>
              {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-medium">{category}</h4>
                  <div className="space-y-2 pl-4">
                    {perms.map((perm) => (
                      <div key={perm} className="flex items-center space-x-2">
                        <Checkbox
                          id={`perm-${perm}`}
                          checked={selectedPermissions.includes(perm)}
                          onCheckedChange={() => togglePermission(perm)}
                        />
                        <label
                          htmlFor={`perm-${perm}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {perm.replace(/:/g, ' → ')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!roleName || selectedPermissions.length === 0 || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role permissions for <strong>{selectedRole?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role-description">Description</Label>
              <Textarea
                id="edit-role-description"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Describe what this role can do..."
                rows={2}
              />
            </div>

            <div className="space-y-4">
              <Label>Permissions</Label>
              {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-medium">{category}</h4>
                  <div className="space-y-2 pl-4">
                    {perms.map((perm) => (
                      <div key={perm} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-perm-${perm}`}
                          checked={selectedPermissions.includes(perm)}
                          onCheckedChange={() => togglePermission(perm)}
                        />
                        <label
                          htmlFor={`edit-perm-${perm}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {perm.replace(/:/g, ' → ')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={selectedPermissions.length === 0 || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
