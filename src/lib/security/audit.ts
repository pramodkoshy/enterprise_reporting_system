import { getDb } from '@/lib/db/config';
import type { AuditAction, ResourceType, AuditLog } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  const db = getDb();

  await db<AuditLog>('audit_log').insert({
    id: uuidv4(),
    user_id: entry.userId,
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId,
    details: entry.details ? JSON.stringify(entry.details) : undefined,
    ip_address: entry.ipAddress,
    user_agent: entry.userAgent,
  });
}

export async function getAuditLogs(options: {
  userId?: string;
  resourceType?: ResourceType;
  resourceId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLog[]; total: number }> {
  const db = getDb();

  let query = db<AuditLog>('audit_log');

  if (options.userId) {
    query = query.where('user_id', options.userId);
  }
  if (options.resourceType) {
    query = query.where('resource_type', options.resourceType);
  }
  if (options.resourceId) {
    query = query.where('resource_id', options.resourceId);
  }
  if (options.action) {
    query = query.where('action', options.action);
  }
  if (options.startDate) {
    query = query.where('created_at', '>=', options.startDate.toISOString());
  }
  if (options.endDate) {
    query = query.where('created_at', '<=', options.endDate.toISOString());
  }

  const countResult = await query.clone().count('* as count').first();
  const total = Number(countResult?.count || 0);

  const logs = await query
    .orderBy('created_at', 'desc')
    .limit(options.limit || 50)
    .offset(options.offset || 0);

  return { logs, total };
}

export async function getResourceHistory(
  resourceType: ResourceType,
  resourceId: string
): Promise<AuditLog[]> {
  const db = getDb();

  return db<AuditLog>('audit_log')
    .where('resource_type', resourceType)
    .where('resource_id', resourceId)
    .orderBy('created_at', 'desc');
}

export async function getUserActivity(
  userId: string,
  limit: number = 50
): Promise<AuditLog[]> {
  const db = getDb();

  return db<AuditLog>('audit_log')
    .where('user_id', userId)
    .orderBy('created_at', 'desc')
    .limit(limit);
}

export function createAuditMiddleware(resourceType: ResourceType) {
  return {
    onCreate: async (userId: string, resourceId: string, data: Record<string, unknown>) => {
      await logAudit({
        userId,
        action: 'create',
        resourceType,
        resourceId,
        details: { data },
      });
    },
    onUpdate: async (
      userId: string,
      resourceId: string,
      before: Record<string, unknown>,
      after: Record<string, unknown>
    ) => {
      await logAudit({
        userId,
        action: 'update',
        resourceType,
        resourceId,
        details: { before, after },
      });
    },
    onDelete: async (userId: string, resourceId: string, data: Record<string, unknown>) => {
      await logAudit({
        userId,
        action: 'delete',
        resourceType,
        resourceId,
        details: { data },
      });
    },
    onView: async (userId: string, resourceId: string) => {
      await logAudit({
        userId,
        action: 'view',
        resourceType,
        resourceId,
      });
    },
    onExecute: async (userId: string, resourceId: string, parameters?: Record<string, unknown>) => {
      await logAudit({
        userId,
        action: 'execute',
        resourceType,
        resourceId,
        details: parameters ? { parameters } : undefined,
      });
    },
    onExport: async (userId: string, resourceId: string, format: string) => {
      await logAudit({
        userId,
        action: 'export',
        resourceType,
        resourceId,
        details: { format },
      });
    },
  };
}
