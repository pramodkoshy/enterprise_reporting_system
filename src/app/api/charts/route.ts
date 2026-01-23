import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { logAudit } from '@/lib/security/audit';
import { v4 as uuidv4 } from 'uuid';
import type { ChartDefinition } from '@/types/database';

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
    const charts = await db<ChartDefinition>('chart_definitions')
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset(page * pageSize);

    const countResult = await db<ChartDefinition>('chart_definitions').count('* as count').first();
    const total = Number((countResult as { count?: string })?.count || 0);

    return NextResponse.json({
      success: true,
      data: {
        items: charts,
        meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (error) {
    console.error('Error fetching charts:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch charts' } },
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
    const { name, description, savedQueryId, chartType, chartConfig, dataMapping, refreshInterval } = body;

    if (!name || !chartType) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Name and chart type are required' } },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = uuidv4();

    await db<ChartDefinition>('chart_definitions').insert({
      id,
      name,
      description,
      saved_query_id: savedQueryId,
      chart_type: chartType,
      chart_config: JSON.stringify(chartConfig || {}),
      data_mapping: JSON.stringify(dataMapping || { xAxis: { field: '' }, yAxis: [] }),
      refresh_interval: refreshInterval,
      created_by: session.user.id,
    });

    await logAudit({
      userId: session.user.id,
      action: 'create',
      resourceType: 'chart',
      resourceId: id,
      details: { name, chartType },
    });

    const chart = await db<ChartDefinition>('chart_definitions').where('id', id).first();

    return NextResponse.json({ success: true, data: chart });
  } catch (error) {
    console.error('Error creating chart:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create chart' } },
      { status: 500 }
    );
  }
}
