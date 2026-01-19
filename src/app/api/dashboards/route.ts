import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { logAudit } from '@/lib/security/audit';
import { v4 as uuidv4 } from 'uuid';
import type { DashboardLayout } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const db = getDb();
    const dashboards = await db<DashboardLayout>('dashboard_layouts')
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset(page * pageSize);

    const countResult = await db<DashboardLayout>('dashboard_layouts').count('* as count').first();
    const total = Number(countResult?.count || 0);

    return NextResponse.json({
      success: true,
      data: {
        items: dashboards,
        meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch dashboards' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, layoutConfig, themeConfig, refreshConfig, isPublic } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Name is required' } },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = uuidv4();

    await db<DashboardLayout>('dashboard_layouts').insert({
      id,
      name,
      description,
      layout_config: JSON.stringify(layoutConfig || { cols: { lg: 12, md: 10, sm: 6, xs: 4 }, rowHeight: 100, layouts: {} }),
      theme_config: themeConfig ? JSON.stringify(themeConfig) : undefined,
      refresh_config: refreshConfig ? JSON.stringify(refreshConfig) : undefined,
      is_public: isPublic || false,
      created_by: session.user.id,
    });

    await logAudit({
      userId: session.user.id,
      action: 'create',
      resourceType: 'dashboard',
      resourceId: id,
      details: { name },
    });

    const dashboard = await db<DashboardLayout>('dashboard_layouts').where('id', id).first();

    return NextResponse.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create dashboard' } },
      { status: 500 }
    );
  }
}
