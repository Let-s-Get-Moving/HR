import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function check() {
  console.log('🔍 Checking upload vs actual data relationship...\n');
  
  try {
    // Check timecard_uploads
    const uploads = await pool.query(`
      SELECT id, filename, upload_date, employee_count, total_hours, status
      FROM timecard_uploads
      ORDER BY upload_date DESC
    `);
    
    console.log('📤 Timecard Uploads:');
    uploads.rows.forEach(row => {
      console.log(`   Upload #${row.id}: ${row.filename}`);
      console.log(`      - Date: ${row.upload_date}`);
      console.log(`      - Expected: ${row.employee_count} employees, ${row.total_hours} hours`);
      console.log(`      - Status: ${row.status}`);
    });
    
    // Check actual timecards for each upload
    console.log('\n📋 Actual Timecards per Upload:');
    for (const upload of uploads.rows) {
      const timecards = await pool.query(`
        SELECT COUNT(*) as count, COUNT(DISTINCT employee_id) as unique_emp
        FROM timecards
        WHERE upload_id = $1
      `, [upload.id]);
      
      console.log(`   Upload #${upload.id} (${upload.filename}):`);
      console.log(`      - Timecards in DB: ${timecards.rows[0].count}`);
      console.log(`      - Unique employees: ${timecards.rows[0].unique_emp}`);
      
      if (timecards.rows[0].count === '0') {
        console.error(`      ❌ MISMATCH: Upload says ${upload.employee_count} employees, but 0 timecards found!`);
      }
    }
    
    // Check timecard_entries
    const entries = await pool.query('SELECT COUNT(*) as count FROM timecard_entries');
    console.log(`\n⏱️  Timecard Entries: ${entries.rows[0].count} records`);
    
    // Check if problem is NULL upload_id
    const nullUploads = await pool.query(`
      SELECT COUNT(*) as count FROM timecards WHERE upload_id IS NULL
    `);
    console.log(`\n🔍 Timecards with NULL upload_id: ${nullUploads.rows[0].count}`);
    
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await pool.end();
  }
}

check();
