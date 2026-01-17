import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { logAudit } from '@/lib/security/audit';
import type { ReportDefinition } from '@/types/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const db = getDb();
    const report = await db<ReportDefinition>('report_definitions').where('id', id).first();

    if (!report) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch report' } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, savedQueryId, columnConfig, filterConfig, sortConfig, paginationConfig, exportFormats } = body;

    const db = getDb();
    const existing = await db<ReportDefinition>('report_definitions').where('id', id).first();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } },
        { status: 404 }
      );
    }

    await db<ReportDefinition>('report_definitions')
      .where('id', id)
      .update({
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        saved_query_id: savedQueryId !== undefined ? savedQueryId : existing.saved_query_id,
        column_config: columnConfig ? JSON.stringify(columnConfig) : existing.column_config,
        filter_config: filterConfig ? JSON.stringify(filterConfig) : existing.filter_config,
        sort_config: sortConfig ? JSON.stringify(sortConfig) : existing.sort_config,
        pagination_config: paginationConfig ? JSON.stringify(paginationConfig) : existing.pagination_config,
        export_formats: exportFormats ? JSON.stringify(exportFormats) : existing.export_formats,
        updated_at: new Date().toISOString(),
      });

    await logAudit({
      userId: session.user.id,
      action: 'update',
      resourceType: 'report',
      resourceId: id,
    });

    const report = await db<ReportDefinition>('report_definitions').where('id', id).first();

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update report' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const db = getDb();

    await db<ReportDefinition>('report_definitions').where('id', id).delete();

    await logAudit({
      userId: session.user.id,
      action: 'delete',
      resourceType: 'report',
      resourceId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete report' } },
      { status: 500 }
    );
  }
}
