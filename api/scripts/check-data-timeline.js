import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function check() {
  console.log('📅 Checking data timeline and upload patterns...\n');
  
  try {
    // Check if there are records that were created then disappeared
    const timeline = await pool.query(`
      SELECT 
        source_file,
        sheet_name,
        period_month,
        COUNT(*) as current_records,
        MIN(created_at) as first_created,
        MAX(created_at) as last_created,
        MAX(updated_at) as last_updated
      FROM employee_commission_monthly
      WHERE source_file IS NOT NULL
      GROUP BY source_file, sheet_name, period_month
      ORDER BY last_created DESC
    `);
    
    console.log('📊 Upload History (employee_commission_monthly):\n');
    timeline.rows.forEach(row => {
      const created = new Date(row.first_created).toLocaleString();
      const updated = new Date(row.last_updated).toLocaleString();
      console.log(`Period: ${row.period_month?.toLocaleDateString()}`);
      console.log(`  File: ${row.source_file}`);
      console.log(`  Current records: ${row.current_records}`);
      console.log(`  First created: ${created}`);
      console.log(`  Last updated: ${updated}`);
      console.log(`  Updated after creation? ${row.first_created !== row.last_updated ? '✅ YES' : '❌ NO'}`);
      console.log('');
    });
    
    // Check hourly payout
    const hourlyTimeline = await pool.query(`
      SELECT 
        COUNT(*) as total,
        MIN(created_at) as first_created,
        MAX(created_at) as last_created,
        MAX(updated_at) as last_updated
      FROM hourly_payout
    `);
    
    console.log('📊 Hourly Payout Timeline:\n');
    const hp = hourlyTimeline.rows[0];
    if (hp.total > 0) {
      console.log(`  Total records: ${hp.total}`);
      console.log(`  First created: ${new Date(hp.first_created).toLocaleString()}`);
      console.log(`  Last updated: ${new Date(hp.last_updated).toLocaleString()}`);
    } else {
      console.log('  ❌ No records found');
      console.log('  💡 This could mean:');
      console.log('     1. Never uploaded');
      console.log('     2. Uploaded then deleted');
      console.log('     3. Upload failed/rolled back');
    }
    
  } catch (e) {
    console.error('\n❌ Error:', e.message);
  } finally {
    await pool.end();
  }
}

check();
