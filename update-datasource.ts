import { getDb } from './src/lib/db/config';

async function updateDataSource() {
  const db = getDb();

  // Delete old data source
  await db('data_sources').where('name', 'Sample SQLite Database').del();

  // Create new one with correct path
  await db('data_sources').insert({
    id: 'ds_test_001',
    name: 'Sample SQLite Database',
    description: 'Sample database with users, orders, and products',
    client_type: 'sqlite3',
    connection_config: JSON.stringify({
      filename: '/Users/pramodkoshy/projects/dynamic/test/enterprise_reporting_system/database/sample.db',
    }),
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  console.log('✅ Data source updated with absolute path');
}

updateDataSource().then(() => process.exit(0)).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
