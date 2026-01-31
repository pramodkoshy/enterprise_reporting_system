import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/config';
import { getConfigDB } from '@/lib/db/config';
import { randomUUID } from 'crypto';

// GET all filters for a report
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
    const filters = await db('report_filters as rf')
      .join('filter_definitions as fd', 'rf.filter_id', 'fd.id')
      .select(
        'rf.id',
        'rf.report_id',
        'rf.filter_id',
        'rf.target_column',
        'rf.filter_order',
        'fd.name as filter_name',
        'fd.description',
        'fd.data_source_id',
        'fd.filter_query',
        'fd.display_field',
        'fd.value_field'
      )
      .where('rf.report_id', params.id)
      .orderBy('rf.filter_order');

    return NextResponse.json(filters);
  } catch (error) {
    console.error('Error fetching report filters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report filters' },
      { status: 500 }
    );
  }
}

// POST add filter to report
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

    // Check if report exists
    const db = getConfigDB();
    const report = await db('report_definitions')
      .where('id', params.id)
      .first();

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Get the highest filter_order for this report
    const maxOrderResult = await db('report_filters')
      .where('report_id', params.id)
      .max('filter_order as max_order')
      .first();

    const nextOrder = (maxOrderResult?.max_order ?? -1) + 1;

    const newReportFilter = {
      id: randomUUID(),
      report_id: params.id,
      filter_id,
      target_column,
      filter_order: nextOrder,
      created_at: new Date().toISOString(),
    };

    await db('report_filters').insert(newReportFilter);

    return NextResponse.json(newReportFilter, { status: 201 });
  } catch (error) {
    console.error('Error adding report filter:', error);
    return NextResponse.json(
      { error: 'Failed to add report filter' },
      { status: 500 }
    );
  }
}

// DELETE all filters for a report (bulk delete)
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
    await db('report_filters')
      .where('report_id', params.id)
      .del();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting report filters:', error);
    return NextResponse.json(
      { error: 'Failed to delete report filters' },
      { status: 500 }
    );
  }
}
