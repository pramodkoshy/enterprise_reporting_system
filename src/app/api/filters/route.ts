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
    console.log('[POST /api/filters] Received body:', JSON.stringify(body, null, 2));

    const {
      name,
      description,
      data_source_id,
      filter_query,
      display_field,
      value_field,
      field_type,
      operator,
      date_validation_config,
    } = body;

    // Validation
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!data_source_id) missingFields.push('data_source_id');
    if (!filter_query) missingFields.push('filter_query');
    if (!display_field) missingFields.push('display_field');
    if (!value_field) missingFields.push('value_field');

    if (missingFields.length > 0) {
      console.error('[POST /api/filters] Missing required fields:', missingFields);
      return NextResponse.json(
        { error: 'Missing required fields', missingFields },
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
      field_type,
      operator,
      date_validation_config,
      created_by: session.user?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('[POST /api/filters] Creating filter:', JSON.stringify(newFilter, null, 2));

    const db = getConfigDB();
    await db('filter_definitions').insert(newFilter);

    return NextResponse.json(newFilter, { status: 201 });
  } catch (error) {
    console.error('[POST /api/filters] Error creating filter:', error);
    return NextResponse.json(
      { error: 'Failed to create filter', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
