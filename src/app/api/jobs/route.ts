import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { addJob } from '@/lib/jobs/queue';
import { logAudit } from '@/lib/security/audit';
import { v4 as uuidv4 } from 'uuid';
import type { JobDefinition, JobExecution } from '@/types/database';

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
    const jobs = await db<JobDefinition>('job_definitions')
      .orderBy('created_at', 'desc');

    return NextResponse.json({
      success: true,
      data: { items: jobs, meta: { total: jobs.length } },
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch jobs' } },
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
    const { jobType, targetId, parameters, priority } = body;

    if (!jobType || !targetId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Job type and target ID are required' } },
        { status: 400 }
      );
    }

    // Create job execution record
    const db = getDb();
    const executionId = uuidv4();

    await db<JobExecution>('job_executions').insert({
      id: executionId,
      job_definition_id: null,
      status: 'pending',
    });

    // Queue the job
    const jobData = {
      type: `${jobType}:generate` as const,
      [`${jobType}Id`]: targetId,
      userId: session.user.id,
      parameters,
    };

    const job = await addJob(jobData as any, { priority, jobId: executionId });

    await logAudit({
      userId: session.user.id,
      action: 'execute',
      resourceType: jobType,
      resourceId: targetId,
      details: { jobId: executionId },
    });

    return NextResponse.json({
      success: true,
      data: { jobId: executionId, status: 'pending' },
    });
  } catch (error) {
    console.error('Error queueing job:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to queue job' } },
      { status: 500 }
    );
  }
}
