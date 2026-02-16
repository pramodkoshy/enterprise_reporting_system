import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';

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
    const dataSourceId = searchParams.get('data_source_id');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const db = getDb();
    let query = db('nl_query_history')
      .where('user_id', session.user.id)
      .orderBy('created_at', 'desc')
      .limit(limit);

    if (dataSourceId) {
      query = query.where('data_source_id', dataSourceId);
    }

    const history = await query;

    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching NL query history:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}
