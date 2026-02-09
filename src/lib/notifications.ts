import { getDb } from './db/config';

export async function createNotification(params: {
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}) {
  const db = getDb();
  const [notification] = await db('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    })
    .returning('*');
  return notification;
}

export async function createNotificationForAllUsers(params: {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}) {
  const db = getDb();
  const users = await db('users').where('is_active', true).select('id');

  const notifications = await Promise.all(
    users.map((user) =>
      db('notifications').insert({
        user_id: user.id,
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      })
    )
  );

  return notifications;
}
