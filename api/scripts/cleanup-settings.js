#!/usr/bin/env node

import pg from 'pg';
const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function cleanupSettings() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting settings cleanup...');
    
    // Delete the removed settings
    const deleteResult = await client.query(`
      DELETE FROM application_settings 
      WHERE key IN ('dashboard_layout', 'sms_notifications', 'maintenance_mode')
      RETURNING key, category
    `);
    
    console.log(`✅ Deleted ${deleteResult.rowCount} settings:`);
    deleteResult.rows.forEach(row => {
      console.log(`   - ${row.key} (${row.category})`);
    });
    
    // Show remaining settings in affected categories
    const remainingResult = await client.query(`
      SELECT key, category, value, user_id 
      FROM application_settings 
      WHERE category IN ('preferences', 'notifications', 'maintenance')
      ORDER BY category, key, user_id NULLS FIRST
    `);
    
    console.log(`\n📋 Remaining settings (${remainingResult.rowCount} rows):`);
    remainingResult.rows.forEach(row => {
      const userInfo = row.user_id ? ` [user: ${row.user_id}]` : ' [system default]';
      console.log(`   ${row.category}.${row.key} = ${row.value}${userInfo}`);
    });
    
    console.log('\n✅ Cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupSettings().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

