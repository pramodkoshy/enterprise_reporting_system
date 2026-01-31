import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { logAudit } from '@/lib/security/audit';
import { v4 as uuidv4 } from 'uuid';
import type { DashboardWidget } from '@/types/database';

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

    const { id: dashboardId } = await params;
    const db = getDb();

    const widgets = await db<DashboardWidget>('dashboard_widgets')
      .where('dashboard_id', dashboardId)
      .orderBy('created_at');

    return NextResponse.json({
      success: true,
      data: { items: widgets },
    });
  } catch (error) {
    console.error('Error fetching widgets:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch widgets' } },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const { id: dashboardId } = await params;
    const body = await request.json();
    const {
      widgetType,
      reportId,
      chartId,
      positionConfig,
      widgetConfig,
      title,
    } = body;

    if (!widgetType || !positionConfig) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'widgetType and positionConfig are required' } },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = uuidv4();

    await db<DashboardWidget>('dashboard_widgets').insert({
      id,
      dashboard_id: dashboardId,
      widget_type: widgetType,
      report_id: reportId || undefined,
      chart_id: chartId || undefined,
      position_config: JSON.stringify(positionConfig),
      widget_config: widgetConfig ? JSON.stringify(widgetConfig) : undefined,
    });

    await logAudit({
      userId: session.user.id,
      action: 'create',
      resourceType: 'dashboard_widget',
      resourceId: id,
      details: { dashboardId, widgetType },
    });

    const widget = await db<DashboardWidget>('dashboard_widgets').where('id', id).first();

    return NextResponse.json({ success: true, data: widget });
  } catch (error) {
    console.error('Error creating widget:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create widget' } },
      { status: 500 }
    );
  }
}
