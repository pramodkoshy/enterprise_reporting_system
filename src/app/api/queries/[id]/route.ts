import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { logAudit } from '@/lib/security/audit';
import type { SavedQuery } from '@/types/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const queryId = params.id;

    // Check if query exists
    const db = getDb();
    const query = await db<SavedQuery>('saved_queries').where('id', queryId).first();

    if (!query) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Query not found' } },
        { status: 404 }
      );
    }

    // Delete the query
    await db<SavedQuery>('saved_queries').where('id', queryId).del();

    // Log the deletion
    await logAudit({
      userId: session.user.id,
      action: 'delete',
      resourceType: 'query',
      resourceId: queryId,
      details: { queryName: query.name },
    });

    return NextResponse.json({ success: true, data: { id: queryId } });
  } catch (error) {
    console.error('Error deleting query:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete query' } },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const queryId = params.id;
    const db = getDb();
    const query = await db<SavedQuery>('saved_queries').where('id', queryId).first();

    if (!query) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Query not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: query });
  } catch (error) {
    console.error('Error fetching query:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch query' } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const queryId = params.id;
    const body = await request.json();

    const { name, description, dataSourceId, sqlContent } = body;

    if (!name || !dataSourceId || !sqlContent) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if query exists
    const existingQuery = await db<SavedQuery>('saved_queries').where('id', queryId).first();
    if (!existingQuery) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Query not found' } },
        { status: 404 }
      );
    }

    // Update the query
    const updatedQuery = {
      name,
      description: description || null,
      data_source_id: dataSourceId,
      sql_content: sqlContent,
      updated_at: new Date().toISOString(),
    };

    await db<SavedQuery>('saved_queries').where('id', queryId).update(updatedQuery);

    // Log the update
    await logAudit({
      userId: session.user.id,
      action: 'update',
      resourceType: 'query',
      resourceId: queryId,
      details: { queryName: name },
    });

    // Fetch and return the updated query
    const query = await db<SavedQuery>('saved_queries').where('id', queryId).first();

    return NextResponse.json({ success: true, data: query });
  } catch (error) {
    console.error('Error updating query:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update query' } },
      { status: 500 }
    );
  }
}
