import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { cleanOldJobs } from '@/lib/queue';
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

    await cleanOldJobs();

    await logAudit({
      userId: session.user.id,
      action: 'clean',
      resourceType: 'queue',
      resourceId: 'reporting',
      details: {},
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Old jobs cleaned successfully' },
    });
  } catch (error) {
    console.error('Error cleaning old jobs:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to clean old jobs' } },
      { status: 500 }
    );
  }
}
