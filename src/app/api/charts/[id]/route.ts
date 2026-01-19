import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { logAudit } from '@/lib/security/audit';
import type { ChartDefinition } from '@/types/database';

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
    const chart = await db<ChartDefinition>('chart_definitions').where('id', id).first();

    if (!chart) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Chart not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: chart });
  } catch (error) {
    console.error('Error fetching chart:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch chart' } },
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
    const existing = await db<ChartDefinition>('chart_definitions').where('id', id).first();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Chart not found' } },
        { status: 404 }
      );
    }

    const updates: Partial<ChartDefinition> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.savedQueryId !== undefined) updates.saved_query_id = body.savedQueryId;
    if (body.chartType !== undefined) updates.chart_type = body.chartType;
    if (body.chartConfig !== undefined) updates.chart_config = JSON.stringify(body.chartConfig);
    if (body.dataMapping !== undefined) updates.data_mapping = JSON.stringify(body.dataMapping);
    if (body.refreshInterval !== undefined) updates.refresh_interval = body.refreshInterval;

    await db<ChartDefinition>('chart_definitions').where('id', id).update(updates);

    await logAudit({
      userId: session.user.id,
      action: 'update',
      resourceType: 'chart',
      resourceId: id,
    });

    const chart = await db<ChartDefinition>('chart_definitions').where('id', id).first();

    return NextResponse.json({ success: true, data: chart });
  } catch (error) {
    console.error('Error updating chart:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update chart' } },
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

    await db<ChartDefinition>('chart_definitions').where('id', id).delete();

    await logAudit({
      userId: session.user.id,
      action: 'delete',
      resourceType: 'chart',
      resourceId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chart:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete chart' } },
      { status: 500 }
    );
  }
}
