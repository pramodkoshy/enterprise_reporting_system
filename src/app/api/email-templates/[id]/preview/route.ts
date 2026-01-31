import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import type { EmailTemplate } from '@/lib/email/email-service';
import { renderTemplate } from '@/lib/email/email-service';
import { getConnection } from '@/lib/db/connection-manager';
import type { DataSource } from '@/types/database';

export async function POST(
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
    const { action = 'preview' } = body;

    const db = getDb();

    // Fetch template
    const template = await db<EmailTemplate>('email_templates').where('id', id).first();
    if (!template) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } },
        { status: 404 }
      );
    }

    // Parse column mappings
    const columnMappings = template.columnMappings ? JSON.parse(template.columnMappings) : {};

    if (!template.queryId) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_QUERY', message: 'This template has no associated query' } },
        { status: 400 }
      );
    }

    // Fetch the saved query
    const query = await db('saved_queries').where('id', template.queryId).first();
    if (!query) {
      return NextResponse.json(
        { success: false, error: { code: 'QUERY_NOT_FOUND', message: 'Associated query not found' } },
        { status: 404 }
      );
    }

    // Get data source
    const dataSource = await db<DataSource>('data_sources')
      .where('id', query.data_source_id)
      .where('is_active', true)
      .first();

    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: { code: 'DATASOURCE_NOT_FOUND', message: 'Data source not found' } },
        { status: 404 }
      );
    }

    // Get connection and execute query
    const connection = await getConnection(dataSource);
    const result = await connection.raw(query.sql_content);

    // Extract rows
    let rows: Record<string, unknown>[] = [];
    if (Array.isArray(result)) {
      rows = result;
    } else if (result.rows) {
      rows = result.rows;
    } else if (result[0]) {
      rows = Array.isArray(result[0]) ? result[0] : [result[0]];
    }

    if (action === 'preview') {
      // Return preview for each row
      const previews = rows.slice(0, 5).map((row, index) => {
        // Map row data using column mappings
        const variables = {
          ...row,
          // Add common variables
          _rowNumber: index + 1,
          _totalRows: rows.length,
        };

        return {
          rowIndex: index,
          data: row,
          preview: renderTemplate(template.htmlBody, variables, null),
          subjectPreview: renderTemplate(template.subject, variables, null),
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          templateName: template.name,
          totalRows: rows.length,
          previewingFirst: Math.min(5, rows.length),
          previews,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'Invalid action' } },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error previewing email template:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to preview template' } },
      { status: 500 }
    );
  }
}
