import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import type { JobExecution } from '@/types/database';

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
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const db = getDb();
    const executions = await db<JobExecution>('job_executions')
      .orderBy('created_at', 'desc')
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: { items: executions, meta: { total: executions.length } },
    });
  } catch (error) {
    console.error('Error fetching job executions:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch job executions' } },
      { status: 500 }
    );
  }
}
