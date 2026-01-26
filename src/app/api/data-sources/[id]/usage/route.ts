import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';

interface RouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = params;
    const db = getDb();

    // Check if data source exists
    const dataSource = await db('data_sources')
      .where('id', id)
      .where('is_deleted', false)
      .first();

    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Data source not found' } },
        { status: 404 }
      );
    }

    // Count usage in saved_queries
    const queryCount = await db('saved_queries')
      .where('data_source_id', id)
      .where('is_deleted', false)
      .count('id as count')
      .first();

    // Count usage in report_definitions (via saved_queries)
    const reportCount = await db('report_definitions')
      .join('saved_queries', 'report_definitions.saved_query_id', 'saved_queries.id')
      .where('saved_queries.data_source_id', id)
      .where('report_definitions.is_deleted', false)
      .where('saved_queries.is_deleted', false)
      .count('report_definitions.id as count')
      .first();

    // Count usage in chart_definitions (via saved_queries)
    const chartCount = await db('chart_definitions')
      .join('saved_queries', 'chart_definitions.saved_query_id', 'saved_queries.id')
      .where('saved_queries.data_source_id', id)
      .where('chart_definitions.is_deleted', false)
      .where('saved_queries.is_deleted', false)
      .count('chart_definitions.id as count')
      .first();

    const usage = {
      queries: Number(queryCount?.count || 0),
      reports: Number(reportCount?.count || 0),
      charts: Number(chartCount?.count || 0),
      total: Number(queryCount?.count || 0) + Number(reportCount?.count || 0) + Number(chartCount?.count || 0),
    };

    return NextResponse.json({
      success: true,
      data: usage,
    });
  } catch (error) {
    console.error('Error checking data source usage:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to check usage' } },
      { status: 500 }
    );
  }
}
