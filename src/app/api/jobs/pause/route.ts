import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { pauseQueue } from '@/lib/queue';
import { logAudit } from '@/lib/security/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    await pauseQueue();

    await logAudit({
      userId: session.user.id,
      action: 'pause',
      resourceType: 'queue',
      resourceId: 'reporting',
      details: {},
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Queue paused successfully' },
    });
  } catch (error) {
    console.error('Error pausing queue:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to pause queue' } },
      { status: 500 }
    );
  }
}
