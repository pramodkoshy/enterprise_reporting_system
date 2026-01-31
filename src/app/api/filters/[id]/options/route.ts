import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/config';
import { getConfigDB } from '@/lib/db/config';
import { getConnectionManager } from '@/lib/db/connection-manager';

// GET filter options (executes filter query)
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

    // Get connection to the data source
    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnection(filter.data_source_id);

    if (!connection) {
      return NextResponse.json(
        { error: 'Data source not found or not connected' },
        { status: 404 }
      );
    }

    // Execute filter query
    const results = await connection.raw(filter.filter_query);

    // Extract rows from different database drivers
    const rows = Array.isArray(results) ? results : results?.rows || [];

    // Map results to filter options
    const options = rows.map((row: Record<string, unknown>) => ({
      value: row[filter.value_field],
      label: String(row[filter.display_field] || ''),
    }));

    return NextResponse.json(options);
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter options', details: String(error) },
      { status: 500 }
    );
  }
}
