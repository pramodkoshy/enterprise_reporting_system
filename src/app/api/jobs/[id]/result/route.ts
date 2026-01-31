import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { promises as fs } from 'fs';
import path from 'path';
import type { JobExecution } from '@/types/database';

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

    // Get job execution
    const execution = await db<JobExecution>('job_executions').where('id', id).first();
    if (!execution) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Job execution not found' } },
        { status: 404 }
      );
    }

    if (!execution.result_location) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_RESULT', message: 'Job result not available' } },
        { status: 404 }
      );
    }

    // Get file path from result_location
    const filePath = execution.result_location;

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_NOT_FOUND', message: 'Result file not found' } },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);

    // Determine content type
    let contentType = 'application/octet-stream';
    if (fileName.endsWith('.csv')) {
      contentType = 'text/csv';
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (fileName.endsWith('.pdf')) {
      contentType = 'application/pdf';
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading job result:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to download result' } },
      { status: 500 }
    );
  }
}
