import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/config';
import { getConfigDB } from '@/lib/db/config';

// GET single filter
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
    const filter = await db('filter_definitions')
      .where('id', params.id)
      .first();

    if (!filter) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 });
    }

    return NextResponse.json(filter);
  } catch (error) {
    console.error('Error fetching filter:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter' },
      { status: 500 }
    );
  }
}

// PUT update filter
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      data_source_id,
      filter_query,
      display_field,
      value_field,
    } = body;

    // Validation
    if (!name || !data_source_id || !filter_query || !display_field || !value_field) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const updateData = {
      name,
      description: description || null,
      data_source_id,
      filter_query,
      display_field,
      value_field,
      updated_at: new Date().toISOString(),
    };

    const db = getConfigDB();
    const filter = await db('filter_definitions')
      .where('id', params.id)
      .update(updateData);

    if (!filter) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 });
    }

    return NextResponse.json({ ...updateData, id: params.id });
  } catch (error) {
    console.error('Error updating filter:', error);
    return NextResponse.json(
      { error: 'Failed to update filter' },
      { status: 500 }
    );
  }
}

// DELETE filter
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
    const filter = await db('filter_definitions')
      .where('id', params.id)
      .del();

    if (!filter) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting filter:', error);
    return NextResponse.json(
      { error: 'Failed to delete filter' },
      { status: 500 }
    );
  }
}
