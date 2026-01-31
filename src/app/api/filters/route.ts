import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/config';
import { getConfigDB } from '@/lib/db/config';
import type { FilterDefinition } from '@/types/database';
import { randomUUID } from 'crypto';

// GET all filters
export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getConfigDB();
    const filters = await db('filter_definitions')
      .select('*')
      .orderBy('name');

    return NextResponse.json(filters);
  } catch (error) {
    console.error('Error fetching filters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filters' },
      { status: 500 }
    );
  }
}

// POST create new filter
export async function POST(req: NextRequest) {
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

    const newFilter: FilterDefinition = {
      id: randomUUID(),
      name,
      description: description || null,
      data_source_id,
      filter_query,
      display_field,
      value_field,
      created_by: session.user?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const db = getConfigDB();
    await db('filter_definitions').insert(newFilter);

    return NextResponse.json(newFilter, { status: 201 });
  } catch (error) {
    console.error('Error creating filter:', error);
    return NextResponse.json(
      { error: 'Failed to create filter' },
      { status: 500 }
    );
  }
}
