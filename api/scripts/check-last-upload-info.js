import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function check() {
  console.log('📋 Checking last upload information...\n');
  
  try {
    // Get source files and counts
    const result = await pool.query(`
      SELECT 
        'employee_commission_monthly' as table_name,
        source_file,
        sheet_name,
        COUNT(*) as records,
        MAX(created_at) as uploaded_at
      FROM employee_commission_monthly
      WHERE source_file IS NOT NULL
      GROUP BY source_file, sheet_name
      
      UNION ALL
      
      SELECT 
        'hourly_payout' as table_name,
        source_file,
        sheet_name,
        COUNT(*) as records,
        MAX(created_at) as uploaded_at
      FROM hourly_payout
      WHERE source_file IS NOT NULL
      GROUP BY source_file, sheet_name
      
      ORDER BY uploaded_at DESC
      LIMIT 10
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No upload metadata found');
    } else {
      console.log('📊 Recent Uploads:\n');
      result.rows.forEach(row => {
        console.log(`Table: ${row.table_name}`);
        console.log(`  File: ${row.source_file}`);
        console.log(`  Sheet: ${row.sheet_name}`);
        console.log(`  Records: ${row.records}`);
        console.log(`  Uploaded: ${new Date(row.uploaded_at).toLocaleString()}`);
        console.log('');
      });
    }
    
    // Check what sheets were in the file
    const sheets = await pool.query(`
      SELECT DISTINCT sheet_name
      FROM employee_commission_monthly
      WHERE source_file IS NOT NULL
      ORDER BY sheet_name
    `);
    
    console.log('📄 Sheets found in commission files:');
    sheets.rows.forEach(row => {
      console.log(`   - ${row.sheet_name}`);
    });
    
  } catch (e) {
    console.error('\n❌ Error:', e.message);
  } finally {
    await pool.end();
  }
}

check();
