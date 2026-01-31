import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { logAudit } from '@/lib/security/audit';
import { v4 as uuidv4 } from 'uuid';
import type { EmailTemplate } from '@/lib/email/email-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const db = getDb();
    const templates = await db<EmailTemplate>('email_templates')
      .orderBy('created_at', 'desc');

    return NextResponse.json({
      success: true,
      data: { items: templates, meta: { total: templates.length } },
    });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch templates' } },
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
    const { name, subject, htmlBody, queryId, columnMappings } = body;

    if (!name || !subject || !htmlBody) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Name, subject, and HTML body are required' } },
        { status: 400 }
      );
    }

    const db = getDb();
    const templateId = uuidv4();

    await db<EmailTemplate>('email_templates').insert({
      id: templateId,
      name,
      subject,
      htmlBody,
      queryId: queryId || null,
      columnMappings: columnMappings ? JSON.stringify(columnMappings) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await logAudit({
      userId: session.user.id,
      action: 'create',
      resourceType: 'email_template',
      resourceId: templateId,
      details: { name },
    });

    const template = await db<EmailTemplate>('email_templates').where('id', templateId).first();

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error creating email template:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create template' } },
      { status: 500 }
    );
  }
}
