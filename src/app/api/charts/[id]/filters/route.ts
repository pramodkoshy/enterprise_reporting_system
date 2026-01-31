import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/config';
import { getConfigDB } from '@/lib/db/config';
import { randomUUID } from 'crypto';

// GET all filters for a chart
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getConfigDB();
    const filters = await db('chart_filters as cf')
      .join('filter_definitions as fd', 'cf.filter_id', 'fd.id')
      .select(
        'cf.id',
        'cf.chart_id',
        'cf.filter_id',
        'cf.target_column',
        'cf.filter_order',
        'fd.name as filter_name',
        'fd.description',
        'fd.data_source_id',
        'fd.filter_query',
        'fd.display_field',
        'fd.value_field'
      )
      .where('cf.chart_id', params.id)
      .orderBy('cf.filter_order');

    return NextResponse.json(filters);
  } catch (error) {
    console.error('Error fetching chart filters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart filters' },
      { status: 500 }
    );
  }
}

// POST add filter to chart
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { filter_id, target_column } = body;

    // Validation
    if (!filter_id || !target_column) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if chart exists
    const db = getConfigDB();
    const chart = await db('chart_definitions')
      .where('id', params.id)
      .first();

    if (!chart) {
      return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
    }

    // Get the highest filter_order for this chart
    const maxOrderResult = await db('chart_filters')
      .where('chart_id', params.id)
      .max('filter_order as max_order')
      .first();

    const nextOrder = (maxOrderResult?.max_order ?? -1) + 1;

    const newChartFilter = {
      id: randomUUID(),
      chart_id: params.id,
      filter_id,
      target_column,
      filter_order: nextOrder,
      created_at: new Date().toISOString(),
    };

    await db('chart_filters').insert(newChartFilter);

    return NextResponse.json(newChartFilter, { status: 201 });
  } catch (error) {
    console.error('Error adding chart filter:', error);
    return NextResponse.json(
      { error: 'Failed to add chart filter' },
      { status: 500 }
    );
  }
}

// DELETE all filters for a chart (bulk delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getConfigDB();
    await db('chart_filters')
      .where('chart_id', params.id)
      .del();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chart filters:', error);
    return NextResponse.json(
      { error: 'Failed to delete chart filters' },
      { status: 500 }
    );
  }
}
