const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function applyOvertimeTrigger() {
  try {
    console.log('🔧 Applying automatic overtime trigger...\n');
    
    const sqlPath = path.join(__dirname, '../db/init/051_auto_overtime_trigger.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Trigger applied successfully!');
    console.log('✅ All existing entries updated with correct OT flags');
    console.log('\n📊 Checking results...');
    
    const { rows } = await pool.query(`
      SELECT 
        work_date,
        COUNT(*) as total_entries,
        SUM(CASE WHEN is_overtime THEN 1 ELSE 0 END) as ot_entries,
        SUM(hours_worked) as total_hours
      FROM timecard_entries
      WHERE hours_worked IS NOT NULL
      GROUP BY work_date
      ORDER BY work_date DESC
      LIMIT 10
    `);
    
    console.log('\nRecent days:');
    rows.forEach(r => {
      console.log(`  ${r.work_date.toISOString().split('T')[0]}: ${r.total_entries} entries, ${r.ot_entries} marked OT, ${parseFloat(r.total_hours).toFixed(2)} total hours`);
    });
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    pool.end();
    process.exit(1);
  }
}

applyOvertimeTrigger();

