import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { logAudit } from '@/lib/security/audit';
import type { DashboardWidget } from '@/types/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; widgetId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { widgetId } = await params;
    const body = await request.json();

    const db = getDb();
    const existing = await db<DashboardWidget>('dashboard_widgets').where('id', widgetId).first();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Widget not found' } },
        { status: 404 }
      );
    }

    const updates: Partial<DashboardWidget> = { updated_at: new Date().toISOString() };
    if (body.positionConfig !== undefined) updates.position_config = JSON.stringify(body.positionConfig);
    if (body.widgetConfig !== undefined) updates.widget_config = JSON.stringify(body.widgetConfig);
    if (body.reportId !== undefined) updates.report_id = body.reportId;
    if (body.chartId !== undefined) updates.chart_id = body.chartId;
    if (body.widgetType !== undefined) updates.widget_type = body.widgetType;

    await db<DashboardWidget>('dashboard_widgets').where('id', widgetId).update(updates);

    await logAudit({
      userId: session.user.id,
      action: 'update',
      resourceType: 'dashboard_widget',
      resourceId: widgetId,
    });

    const widget = await db<DashboardWidget>('dashboard_widgets').where('id', widgetId).first();

    return NextResponse.json({ success: true, data: widget });
  } catch (error) {
    console.error('Error updating widget:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update widget' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; widgetId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { widgetId } = await params;
    const db = getDb();

    await db<DashboardWidget>('dashboard_widgets').where('id', widgetId).delete();

    await logAudit({
      userId: session.user.id,
      action: 'delete',
      resourceType: 'dashboard_widget',
      resourceId: widgetId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting widget:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete widget' } },
      { status: 500 }
    );
  }
}
