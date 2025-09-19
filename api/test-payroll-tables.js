// Test payroll tables existence
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
});

async function testPayrollTables() {
  try {
    console.log('🔍 Checking payroll tables...');
    
    // Check if payroll_submissions table exists
    const submissionsCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'payroll_submissions'
    `);
    
    console.log('📊 payroll_submissions table exists:', submissionsCheck.rows.length > 0);
    
    if (submissionsCheck.rows.length === 0) {
      console.log('❌ payroll_submissions table does not exist, creating it...');
      
      // Create payroll_submissions table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS payroll_submissions (
            id SERIAL PRIMARY KEY,
            submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            period_name VARCHAR(255),
            notes TEXT,
            status VARCHAR(50) DEFAULT 'Processed',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ payroll_submissions table created');
    }
    
    // Check if payroll_calculations table exists
    const calculationsCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'payroll_calculations'
    `);
    
    console.log('📊 payroll_calculations table exists:', calculationsCheck.rows.length > 0);
    
    // Test the query that's failing
    console.log('🧪 Testing payroll submissions query...');
    const testQuery = await pool.query(`
      SELECT 
        ps.*,
        COUNT(pc.id) as employee_count,
        SUM(pc.gross_pay) as total_amount
      FROM payroll_submissions ps
      LEFT JOIN payroll_calculations pc ON ps.id = pc.submission_id
      GROUP BY ps.id
      ORDER BY ps.submission_date DESC
    `);
    
    console.log('✅ Query successful, found', testQuery.rows.length, 'submissions');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testPayrollTables();
