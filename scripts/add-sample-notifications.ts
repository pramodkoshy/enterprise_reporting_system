import path from 'path';
import { fileURLToPath } from 'url';

// Set DATABASE_PATH before importing getDb
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.env.DATABASE_PATH = path.join(__dirname, '../src/lib/db/data/config.sqlite');

import { getDb } from '../src/lib/db/config';

async function addSampleNotifications() {
  const db = getDb();

  // Get the admin user
  const adminUser = await db('users').where('email', 'admin@admin.com').first();

  if (!adminUser) {
    console.log('Admin user not found. Please run seed first.');
    return;
  }

  // Create sample notifications
  const notifications = [
    {
      user_id: adminUser.id,
      type: 'info',
      title: 'Welcome to the Reporting System',
      message: 'You have access to dashboards, reports, and data sources. Start by connecting a data source.',
      metadata: JSON.stringify({ action: 'connect_datasource' }),
    },
    {
      user_id: adminUser.id,
      type: 'success',
      title: 'System Ready',
      message: 'All services are running correctly. Redis connection established.',
      is_read: true,
    },
    {
      user_id: adminUser.id,
      type: 'warning',
      title: 'Scheduled Job Report',
      message: 'Your daily sales report is scheduled to run at 8:00 AM.',
    },
    {
      user_id: adminUser.id,
      type: 'info',
      title: 'New Dashboard Available',
      message: 'Check out the new Sales Analytics dashboard template.',
    },
    {
      user_id: adminUser.id,
      type: 'error',
      title: 'Data Source Connection Failed',
      message: 'Connection to "Production DB" failed. Retrying in 5 minutes.',
      is_read: true,
    },
  ];

  await db('notifications').insert(notifications);

  console.log('Sample notifications created successfully!');
  console.log(`Created ${notifications.length} notifications for user: ${adminUser.email}`);
}

addSampleNotifications()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
