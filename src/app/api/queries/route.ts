import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { logAudit } from '@/lib/security/audit';
import { v4 as uuidv4 } from 'uuid';
import type { SavedQuery } from '@/types/database';

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
    const queries = await db<SavedQuery>('saved_queries')
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset(page * pageSize);

    const countResult = await db<SavedQuery>('saved_queries').count('* as count').first();
    const total = Number(countResult?.count || 0);

    return NextResponse.json({
      success: true,
      data: {
        items: queries,
        meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (error) {
    console.error('Error fetching queries:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch queries' } },
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
    const { name, description, dataSourceId, sqlContent, parametersSchema } = body;

    if (!name || !dataSourceId || !sqlContent) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = uuidv4();

    await db<SavedQuery>('saved_queries').insert({
      id,
      name,
      description,
      data_source_id: dataSourceId,
      sql_content: sqlContent,
      parameters_schema: parametersSchema ? JSON.stringify(parametersSchema) : undefined,
      created_by: session.user.id,
    });

    await logAudit({
      userId: session.user.id,
      action: 'create',
      resourceType: 'query',
      resourceId: id,
      details: { name },
    });

    const query = await db<SavedQuery>('saved_queries').where('id', id).first();

    return NextResponse.json({ success: true, data: query });
  } catch (error) {
    console.error('Error creating query:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create query' } },
      { status: 500 }
    );
  }
}
