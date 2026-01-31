import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { addScheduledJob, removeScheduledJob } from '@/lib/jobs/queue';
import { logAudit } from '@/lib/security/audit';
import type { JobDefinition } from '@/types/database';

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
    const { name, schedule_cron, parameters, notification_config, is_active } = body;

    const db = getDb();
    const existingJob = await db<JobDefinition>('job_definitions').where('id', id).first();

    if (!existingJob) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Job definition not found' } },
        { status: 404 }
      );
    }

    // Update job definition
    await db<JobDefinition>('job_definitions')
      .where('id', id)
      .update({
        name: name || existingJob.name,
        schedule_cron: schedule_cron || existingJob.schedule_cron,
        parameters: parameters !== undefined ? JSON.stringify(parameters) : existingJob.parameters,
        notification_config: notification_config !== undefined ? JSON.stringify(notification_config) : existingJob.notification_config,
        is_active: is_active !== undefined ? is_active : existingJob.is_active,
        updated_at: new Date().toISOString(),
      });

    // Update BullMQ scheduling
    if (is_active !== undefined || schedule_cron) {
      try {
        // Remove old scheduled job
        await removeScheduledJob(id);

        // Add new scheduled job if active
        if ((is_active !== undefined ? is_active : existingJob.is_active) && (schedule_cron || existingJob.schedule_cron)) {
          const params = parameters !== undefined ? parameters : JSON.parse(existingJob.parameters || '{}');
          await addScheduledJob(
            {
              type: 'data:export',
              queryId: existingJob.target_id,
              userId: session.user.id,
              format: params?.format || 'csv',
            } as any,
            schedule_cron || existingJob.schedule_cron!,
            { jobId: id }
          );
        }
      } catch (error) {
        console.error('Error updating job schedule in BullMQ:', error);
      }
    }

    await logAudit({
      userId: session.user.id,
      action: 'update',
      resourceType: 'job_definition',
      resourceId: id,
    });

    const updatedJob = await db<JobDefinition>('job_definitions').where('id', id).first();

    return NextResponse.json({
      success: true,
      data: updatedJob,
    });
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update job' } },
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

    const existingJob = await db<JobDefinition>('job_definitions').where('id', id).first();
    if (!existingJob) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Job definition not found' } },
        { status: 404 }
      );
    }

    // Remove from BullMQ
    try {
      await removeScheduledJob(id);
    } catch (error) {
      console.error('Error removing job from BullMQ:', error);
    }

    // Delete from database
    await db<JobDefinition>('job_definitions').where('id', id).delete();

    await logAudit({
      userId: session.user.id,
      action: 'delete',
      resourceType: 'job_definition',
      resourceId: id,
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
