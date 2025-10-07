/**
 * Remove pointless notification settings from database
 * Run this once to clean up existing installations
 */

import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4",
  ssl: { rejectUnauthorized: false }
});

async function removeUselessNotifications() {
  try {
    console.log('🧹 Removing pointless notification settings...');
    
    const result = await pool.query(`
      DELETE FROM application_settings
      WHERE key IN (
        'new_employee_notification',
        'payroll_notification',
        'leave_request_notification'
      )
      RETURNING key
    `);
    
    if (result.rows.length > 0) {
      console.log(`✅ Removed ${result.rows.length} useless notifications:`);
      result.rows.forEach(row => console.log(`   - ${row.key}`));
    } else {
      console.log('✅ No useless notifications found (already clean)');
    }
    
    console.log('🎉 Cleanup complete!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

removeUselessNotifications();
