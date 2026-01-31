import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { logAudit } from '@/lib/security/audit';
import type { EmailTemplate } from '@/lib/email/email-service';
import { renderTemplate } from '@/lib/email/email-service';
import { getConnection } from '@/lib/db/connection-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const db = getDb();

    const template = await db<EmailTemplate>('email_templates').where('id', id).first();
    if (!template) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } },
        { status: 404 }
      );
    }

    // Parse column mappings
    template.columnMappings = template.columnMappings ? JSON.parse(template.columnMappings) : {};

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error fetching email template:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch template' } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, subject, htmlBody, queryId, columnMappings } = body;

    const db = getDb();
    const existing = await db<EmailTemplate>('email_templates').where('id', id).first();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } },
        { status: 404 }
      );
    }

    await db<EmailTemplate>('email_templates')
      .where('id', id)
      .update({
        name: name || existing.name,
        subject: subject || existing.subject,
        htmlBody: htmlBody || existing.htmlBody,
        queryId: queryId !== undefined ? queryId : existing.queryId,
        columnMappings: columnMappings !== undefined ? JSON.stringify(columnMappings) : existing.columnMappings,
        updated_at: new Date().toISOString(),
      });

    await logAudit({
      userId: session.user.id,
      action: 'update',
      resourceType: 'email_template',
      resourceId: id,
    });

    const updated = await db<EmailTemplate>('email_templates').where('id', id).first();
    updated.columnMappings = updated.columnMappings ? JSON.parse(updated.columnMappings) : {};

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating email template:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update template' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const db = getDb();

    await db<EmailTemplate>('email_templates').where('id', id).delete();

    await logAudit({
      userId: session.user.id,
      action: 'delete',
      resourceType: 'email_template',
      resourceId: id,
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Template deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting email template:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete template' } },
      { status: 500 }
    );
  }
}
