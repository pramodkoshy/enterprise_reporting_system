import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeRead = searchParams.get('includeRead') === 'true';

    const db = getDb();

    const query = db('notifications')
      .where('user_id', session.user.id)
      .orderBy('created_at', 'desc')
      .limit(50);

    // Only show unread by default
    if (!includeRead) {
      query.where('is_read', false);
    }

    const notifications = await query;

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch notifications' } },
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
    const { type, title, message, metadata } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Type, title, and message are required' } },
        { status: 400 }
      );
    }

    const db = getDb();

    const [notification] = await db('notifications')
      .insert({
        user_id: session.user.id,
        type,
        title,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .returning('*');

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create notification' } },
      { status: 500 }
    );
  }
}
