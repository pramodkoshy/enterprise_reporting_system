import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { retryJob, removeJob } from '@/lib/queue';
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
    const body = await request.json().catch(() => ({}));
    const action = body.action;

    if (action === 'retry') {
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
    }

    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'Invalid action' } },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error performing job action:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to perform action' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = params;
    await removeJob(id);

    await logAudit({
      userId: session.user.id,
      action: 'delete',
      resourceType: 'job',
      resourceId: id,
      details: {},
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Job deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete job' } },
      { status: 500 }
    );
  }
}
