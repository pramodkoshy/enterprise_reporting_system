import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/config';
import { getConfigDB } from '@/lib/db/config';

// PUT update chart filter (target column or order)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; filterLinkId: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { target_column, filter_order } = body;

    const updateData: Record<string, unknown> = {};
    if (target_column !== undefined) updateData.target_column = target_column;
    if (filter_order !== undefined) updateData.filter_order = filter_order;

    const db = getConfigDB();
    const filterLink = await db('chart_filters')
      .where('id', params.filterLinkId)
      .where('chart_id', params.id)
      .update(updateData);

    if (!filterLink) {
      return NextResponse.json(
        { error: 'Chart filter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating chart filter:', error);
    return NextResponse.json(
      { error: 'Failed to update chart filter' },
      { status: 500 }
    );
  }
}

// DELETE remove filter from chart
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; filterLinkId: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getConfigDB();
    const filterLink = await db('chart_filters')
      .where('id', params.filterLinkId)
      .where('chart_id', params.id)
      .del();

    if (!filterLink) {
      return NextResponse.json(
        { error: 'Chart filter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chart filter:', error);
    return NextResponse.json(
      { error: 'Failed to delete chart filter' },
      { status: 500 }
    );
  }
}
