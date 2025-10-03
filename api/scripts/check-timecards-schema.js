import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function check() {
  console.log('🔍 Checking timecards table schema...\n');
  
  try {
    // Get columns
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'timecards'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Timecards Table Columns:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    const hasUploadId = columns.rows.some(col => col.column_name === 'upload_id');
    console.log(`\n${hasUploadId ? '✅' : '❌'} upload_id column ${hasUploadId ? 'EXISTS' : 'MISSING'}`);
    
    // Check row count
    const count = await pool.query('SELECT COUNT(*) as count FROM timecards');
    console.log(`\n📋 Row count: ${count.rows[0].count}`);
    
    // Check a sample row if exists
    if (parseInt(count.rows[0].count) > 0) {
      const sample = await pool.query('SELECT * FROM timecards LIMIT 1');
      console.log('\n📋 Sample row columns:');
      Object.keys(sample.rows[0]).forEach(key => {
        console.log(`   - ${key}`);
      });
    }
    
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await pool.end();
  }
}

check();
