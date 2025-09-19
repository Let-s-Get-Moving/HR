// Test database tables
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
});

async function testTables() {
  try {
    console.log('🔍 Checking database tables...');
    
    // Check if payroll_submissions table exists
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%payroll%'
      ORDER BY table_name
    `);
    
    console.log('📊 Payroll-related tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check payroll_submissions specifically
    const submissionsCheck = await pool.query(`
      SELECT COUNT(*) as count FROM payroll_submissions
    `).catch(err => {
      console.log('❌ payroll_submissions table does not exist or has issues');
      return { rows: [{ count: 0 }] };
    });
    
    console.log(`📈 payroll_submissions has ${submissionsCheck.rows[0].count} records`);
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
  } finally {
    await pool.end();
  }
}

testTables();
