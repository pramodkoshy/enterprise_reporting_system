import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { logAudit } from '@/lib/security/audit';
import type { DashboardLayout, DashboardWidget } from '@/types/database';

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

    const dashboard = await db<DashboardLayout>('dashboard_layouts').where('id', id).first();
    if (!dashboard) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Dashboard not found' } },
        { status: 404 }
      );
    }

    const widgets = await db<DashboardWidget>('dashboard_widgets')
      .where('dashboard_id', id)
      .orderBy('created_at');

    return NextResponse.json({
      success: true,
      data: { ...dashboard, widgets },
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch dashboard' } },
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

    const db = getDb();
    const existing = await db<DashboardLayout>('dashboard_layouts').where('id', id).first();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Dashboard not found' } },
        { status: 404 }
      );
    }

    const updates: Partial<DashboardLayout> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.layoutConfig !== undefined) updates.layout_config = JSON.stringify(body.layoutConfig);
    if (body.themeConfig !== undefined) updates.theme_config = JSON.stringify(body.themeConfig);
    if (body.refreshConfig !== undefined) updates.refresh_config = JSON.stringify(body.refreshConfig);
    if (body.isPublic !== undefined) updates.is_public = body.isPublic;

    await db<DashboardLayout>('dashboard_layouts').where('id', id).update(updates);

    await logAudit({
      userId: session.user.id,
      action: 'update',
      resourceType: 'dashboard',
      resourceId: id,
    });

    const dashboard = await db<DashboardLayout>('dashboard_layouts').where('id', id).first();
    const widgets = await db<DashboardWidget>('dashboard_widgets').where('dashboard_id', id);

    return NextResponse.json({ success: true, data: { ...dashboard, widgets } });
  } catch (error) {
    console.error('Error updating dashboard:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update dashboard' } },
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

    await db<DashboardLayout>('dashboard_layouts').where('id', id).delete();

    await logAudit({
      userId: session.user.id,
      action: 'delete',
      resourceType: 'dashboard',
      resourceId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete dashboard' } },
      { status: 500 }
    );
  }
}
