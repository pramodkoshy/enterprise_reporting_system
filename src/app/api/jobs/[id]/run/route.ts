import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { addJob } from '@/lib/jobs/queue';
import { logAudit } from '@/lib/security/audit';
import { v4 as uuidv4 } from 'uuid';
import type { JobDefinition, JobExecution } from '@/types/database';

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
    const db = getDb();

    // Get job definition
    const jobDefinition = await db<JobDefinition>('job_definitions').where('id', id).first();
    if (!jobDefinition) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Job definition not found' } },
        { status: 404 }
      );
    }

    // Create job execution record
    const executionId = uuidv4();
    await db<JobExecution>('job_executions').insert({
      id: executionId,
      job_definition_id: id,
      status: 'pending',
    });

    // Parse parameters
    const parameters = JSON.parse(jobDefinition.parameters || '{}');

    // Queue the job in BullMQ
    await addJob(
      {
        type: 'data:export',
        queryId: jobDefinition.target_id,
        userId: session.user.id,
        format: parameters.format || 'csv',
      } as any,
      { jobId: executionId }
    );

    await logAudit({
      userId: session.user.id,
      action: 'execute',
      resourceType: 'job_definition',
      resourceId: id,
      details: { executionId },
    });

    return NextResponse.json({
      success: true,
      data: {
        executionId,
        status: 'pending',
        message: 'Job started successfully',
      },
    });
  } catch (error) {
    console.error('Error running job:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to run job' } },
      { status: 500 }
    );
  }
}
