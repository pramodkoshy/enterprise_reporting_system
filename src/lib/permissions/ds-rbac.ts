import { getDb } from '@/lib/db/config';
import type {
  DsRole,
  DsUserRole,
  DsUserRoleJoinRow,
  DsEntityPermission,
  DsEntityPermissionLevel,
  ParsedSqlEntity,
  AccessCheckDetail,
  UserRolePermissionRow,
  DsUserRoleWithRoleInfo,
} from '@/types/database';

/**
 * Get all data source roles for a specific data source
 */
export async function getDsRoles(dataSourceId: string): Promise<DsRole[]> {
  const db = getDb();
  return db<DsRole>('ds_roles')
    .where('data_source_id', dataSourceId)
    .where('is_active', true)
    .orderBy('name');
}

/**
 * Get a specific data source role by ID
 */
export async function getDsRole(roleId: string): Promise<DsRole | undefined> {
  const db = getDb();
  return db<DsRole>('ds_roles').where('id', roleId).first();
}

/**
 * Create a new data source role
 */
export async function createDsRole(
  dataSourceId: string,
  name: string,
  description: string | undefined,
  createdBy: string
): Promise<DsRole> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db('ds_roles').insert({
    id,
    data_source_id: dataSourceId,
    name,
    description,
    is_active: true,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  return db<DsRole>('ds_roles').where('id', id).first() as Promise<DsRole>;
}

/**
 * Update a data source role
 */
export async function updateDsRole(
  roleId: string,
  updates: { name?: string; description?: string; is_active?: boolean }
): Promise<DsRole | undefined> {
  const db = getDb();
  await db('ds_roles')
    .where('id', roleId)
    .update({ ...updates, updated_at: new Date().toISOString() });
  return db<DsRole>('ds_roles').where('id', roleId).first();
}

/**
 * Delete a data source role
 */
export async function deleteDsRole(roleId: string): Promise<void> {
  const db = getDb();
  await db('ds_roles').where('id', roleId).delete();
}

/**
 * Get all user-role assignments for a data source
 */
export async function getDsUserRoles(dataSourceId: string): Promise<DsUserRoleJoinRow[]> {
  const db = getDb();
  return db('ds_user_roles')
    .join('users', 'ds_user_roles.user_id', 'users.id')
    .join('ds_roles', 'ds_user_roles.ds_role_id', 'ds_roles.id')
    .where('ds_user_roles.data_source_id', dataSourceId)
    .select(
      'ds_user_roles.*',
      'users.email as user_email',
      'users.display_name as user_display_name',
      'ds_roles.name as role_name'
    ) as Promise<DsUserRoleJoinRow[]>;
}

/**
 * Assign a user to a data source role
 */
export async function assignDsUserRole(
  dataSourceId: string,
  userId: string,
  dsRoleId: string
): Promise<void> {
  const db = getDb();
  await db('ds_user_roles')
    .insert({
      data_source_id: dataSourceId,
      user_id: userId,
      ds_role_id: dsRoleId,
      assigned_at: new Date().toISOString(),
    })
    .onConflict(['data_source_id', 'user_id', 'ds_role_id'])
    .ignore();
}

/**
 * Remove a user from a data source role
 */
export async function removeDsUserRole(
  dataSourceId: string,
  userId: string,
  dsRoleId: string
): Promise<void> {
  const db = getDb();
  await db('ds_user_roles')
    .where('data_source_id', dataSourceId)
    .where('user_id', userId)
    .where('ds_role_id', dsRoleId)
    .delete();
}

/**
 * Get entity permissions for a data source role
 */
export async function getDsEntityPermissions(
  dataSourceId: string,
  dsRoleId?: string
): Promise<DsEntityPermission[]> {
  const db = getDb();
  let query = db<DsEntityPermission>('ds_entity_permissions')
    .where('data_source_id', dataSourceId);

  if (dsRoleId) {
    query = query.where('ds_role_id', dsRoleId);
  }

  return query.orderBy('entity_name');
}

/**
 * Create or update an entity permission
 */
export async function upsertDsEntityPermission(
  dataSourceId: string,
  dsRoleId: string,
  entityName: string,
  entityType: 'table' | 'view',
  permissionLevel: DsEntityPermissionLevel,
  entitySchema?: string,
  columnRestrictions?: string[],
  rowFilter?: string,
  createdBy?: string
): Promise<DsEntityPermission> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db('ds_entity_permissions')
    .insert({
      id,
      data_source_id: dataSourceId,
      ds_role_id: dsRoleId,
      entity_name: entityName,
      entity_type: entityType,
      entity_schema: entitySchema || null,
      permission_level: permissionLevel,
      column_restrictions: columnRestrictions ? JSON.stringify(columnRestrictions) : null,
      row_filter: rowFilter || null,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    })
    .onConflict(['data_source_id', 'ds_role_id', 'entity_name', 'entity_schema'])
    .merge({
      permission_level: permissionLevel,
      column_restrictions: columnRestrictions ? JSON.stringify(columnRestrictions) : null,
      row_filter: rowFilter || null,
      updated_at: now,
    });

  return db<DsEntityPermission>('ds_entity_permissions')
    .where('data_source_id', dataSourceId)
    .where('ds_role_id', dsRoleId)
    .where('entity_name', entityName)
    .where(function() {
      if (entitySchema) {
        this.where('entity_schema', entitySchema);
      } else {
        this.whereNull('entity_schema');
      }
    })
    .first() as Promise<DsEntityPermission>;
}

/**
 * Delete an entity permission
 */
export async function deleteDsEntityPermission(permissionId: string): Promise<void> {
  const db = getDb();
  await db('ds_entity_permissions').where('id', permissionId).delete();
}

/**
 * Check if a user has access to specific entities in a data source.
 * Returns detailed access check results for each entity.
 */
export async function checkEntityAccess(
  userId: string,
  dataSourceId: string,
  entities: ParsedSqlEntity[]
): Promise<AccessCheckDetail[]> {
  const db = getDb();

  // First check if user is a system admin
  const userRoles: UserRolePermissionRow[] = await db('user_roles')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('user_roles.user_id', userId)
    .select('roles.permissions');

  const isSystemAdmin = userRoles.some((r: UserRolePermissionRow) => {
    const perms: string[] = JSON.parse(r.permissions);
    return perms.includes('admin:*');
  });

  if (isSystemAdmin) {
    return entities.map((entity) => ({
      entity: entity.name,
      entitySchema: entity.schema,
      hasAccess: true,
      grantedBy: 'System Admin',
      permissionLevel: 'all' as DsEntityPermissionLevel,
    }));
  }

  // Get user's DS roles for this data source
  const dsUserRoles: DsUserRoleWithRoleInfo[] = await db('ds_user_roles')
    .join('ds_roles', 'ds_user_roles.ds_role_id', 'ds_roles.id')
    .where('ds_user_roles.data_source_id', dataSourceId)
    .where('ds_user_roles.user_id', userId)
    .where('ds_roles.is_active', true)
    .select('ds_roles.id as role_id', 'ds_roles.name as role_name');

  if (dsUserRoles.length === 0) {
    return entities.map((entity) => ({
      entity: entity.name,
      entitySchema: entity.schema,
      hasAccess: false,
    }));
  }

  const roleIds = dsUserRoles.map((r: DsUserRoleWithRoleInfo) => r.role_id);

  // Get all entity permissions for user's DS roles
  const permissions = await db<DsEntityPermission>('ds_entity_permissions')
    .where('data_source_id', dataSourceId)
    .whereIn('ds_role_id', roleIds)
    .select('*');

  // Check each entity
  return entities.map((entity) => {
    if (entity.type === 'subquery') {
      return {
        entity: entity.name,
        entitySchema: entity.schema,
        hasAccess: true,
        grantedBy: 'Subquery (no direct table access)',
      };
    }

    const matchingPerms = permissions.filter((p) => {
      const nameMatch = p.entity_name.toLowerCase() === entity.name.toLowerCase();
      const schemaMatch = entity.schema
        ? p.entity_schema?.toLowerCase() === entity.schema.toLowerCase()
        : true;
      return nameMatch && schemaMatch;
    });

    if (matchingPerms.length === 0) {
      return {
        entity: entity.name,
        entitySchema: entity.schema,
        hasAccess: false,
      };
    }

    // Find the highest permission level
    const levelHierarchy: DsEntityPermissionLevel[] = ['select', 'insert', 'update', 'delete', 'all'];
    let bestPerm = matchingPerms[0];
    let bestLevel = levelHierarchy.indexOf(bestPerm.permission_level);

    for (const perm of matchingPerms) {
      const level = levelHierarchy.indexOf(perm.permission_level);
      if (level > bestLevel) {
        bestLevel = level;
        bestPerm = perm;
      }
    }

    const grantingRole = dsUserRoles.find((r: DsUserRoleWithRoleInfo) => r.role_id === bestPerm.ds_role_id);
    const columnRestrictions: string[] | undefined = bestPerm.column_restrictions
      ? JSON.parse(bestPerm.column_restrictions)
      : undefined;

    return {
      entity: entity.name,
      entitySchema: entity.schema,
      hasAccess: true,
      grantedBy: grantingRole?.role_name,
      permissionLevel: bestPerm.permission_level,
      columnRestrictions,
      rowFilter: bestPerm.row_filter || undefined,
    };
  });
}

/**
 * Get all entities a user has access to in a data source
 */
export async function getUserAccessibleEntities(
  userId: string,
  dataSourceId: string
): Promise<DsEntityPermission[]> {
  const db = getDb();

  // Check system admin
  const userRoles: UserRolePermissionRow[] = await db('user_roles')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('user_roles.user_id', userId)
    .select('roles.permissions');

  const isSystemAdmin = userRoles.some((r: UserRolePermissionRow) => {
    const perms: string[] = JSON.parse(r.permissions);
    return perms.includes('admin:*');
  });

  if (isSystemAdmin) {
    // Return empty array - admin has access to everything
    return [];
  }

  // Get user's DS roles
  const dsRoleIds: string[] = await db('ds_user_roles')
    .join('ds_roles', 'ds_user_roles.ds_role_id', 'ds_roles.id')
    .where('ds_user_roles.data_source_id', dataSourceId)
    .where('ds_user_roles.user_id', userId)
    .where('ds_roles.is_active', true)
    .pluck('ds_roles.id');

  if (dsRoleIds.length === 0) return [];

  return db<DsEntityPermission>('ds_entity_permissions')
    .where('data_source_id', dataSourceId)
    .whereIn('ds_role_id', dsRoleIds)
    .select('*');
}
