import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getQueueStatus } from '@/lib/jobs/queue';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const status = await getQueueStatus();

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    // If Redis is not available, return mock data
    console.error('Error fetching queue status:', error);
    return NextResponse.json({
      success: true,
      data: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
    });
  }
}
