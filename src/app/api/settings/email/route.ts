import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { sendTestEmail, verifyEmailConfig } from '@/lib/email/email-service';
import { getDb } from '@/lib/db/config';
import { logAudit } from '@/lib/security/audit';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Return current email configuration (without sensitive data)
    const config = {
      host: process.env.SMTP_HOST || null,
      port: process.env.SMTP_PORT || null,
      secure: process.env.SMTP_SECURE === 'true',
      from: process.env.EMAIL_FROM || null,
      fromName: process.env.EMAIL_FROM_NAME || null,
      configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
    };

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error fetching email config:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch email configuration' } },
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
    const { action } = body;

    if (action === 'test') {
      const { to } = body;

      if (!to) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Email address is required' } },
          { status: 400 }
        );
      }

      const result = await sendTestEmail(to);

      await logAudit({
        userId: session.user.id,
        action: 'test_email',
        resourceType: 'email',
        resourceId: to,
        details: { success: result.success },
      });

      return NextResponse.json(result);
    }

    if (action === 'verify') {
      const result = await verifyEmailConfig();

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'Invalid action' } },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing email request:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to process request' } },
      { status: 500 }
    );
  }
}
