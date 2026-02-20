/**
 * API Route: Get/Update Datasource Config
 * GET /api/data-sources/[id]/config - Get datasource configuration
 * PUT /api/data-sources/[id]/config - Update datasource configuration (admin only)
 *
 * Manages datasource configuration including is_editable flag.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/config';
import { hasPermission, getSecurityContext } from '@/lib/auth/rbac';
import type { DataSource } from '@/types/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getSecurityContext();
    if (!context) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const canView = hasPermission(context, 'data_source', 'view') ??
      context.permissions.includes('data_source:view') ??
      context.permissions.includes('datasource:view');

    if (!canView) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    const dataSource = await getDb()('data_sources')
      .where('id', params.id)
      .first() as DataSource | undefined;

    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Return only configuration-related fields
    return NextResponse.json({
      success: true,
      data: {
        id: dataSource.id,
        name: dataSource.name,
        is_editable: dataSource.is_editable,
      },
    });
  } catch (error) {
    console.error('Error getting datasource config:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get datasource config',
        },
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getSecurityContext();
    if (!context) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const canAdmin = hasPermission(context, 'data_source', 'admin') ??
      context.permissions.includes('data_source:admin') ??
      context.permissions.includes('datasource:admin');

    if (!canAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    const dataSource = await getDb()('data_sources')
      .where('id', params.id)
      .first() as DataSource | undefined;

    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { is_editable } = body;

    // Validate input
    if (is_editable === undefined || typeof is_editable !== 'boolean') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'is_editable must be a boolean' } },
        { status: 400 }
      );
    }

    // Update datasource
    await getDb()('data_sources')
      .where('id', params.id)
      .update({ is_editable });

    // Audit log
    if (context.userId) {
      await getDb()('audit_log').insert({
        user_id: context.userId,
        action: 'update',
        resource_type: 'data_source',
        resource_id: params.id,
        details: JSON.stringify({
          field: 'is_editable',
          old_value: dataSource.is_editable,
          new_value: is_editable,
        }),
        created_at: getDb().fn.now(),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: dataSource.id,
        name: dataSource.name,
        is_editable,
      },
    });
  } catch (error) {
    console.error('Error updating datasource config:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update datasource config',
        },
      },
      { status: 500 }
    );
  }
}
