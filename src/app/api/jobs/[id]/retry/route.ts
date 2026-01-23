import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { retryJob } from '@/lib/queue';
import { logAudit } from '@/lib/security/audit';

interface RouteContext {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = params;
    await retryJob(id);

    await logAudit({
      userId: session.user.id,
      action: 'retry',
      resourceType: 'job',
      resourceId: id,
      details: {},
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Job retrying successfully' },
    });
  } catch (error) {
    console.error('Error retrying job:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to retry job' } },
      { status: 500 }
    );
  }
}
