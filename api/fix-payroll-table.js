import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
});

async function fixPayrollTable() {
  console.log('🔧 Fixing payroll_submissions table...');
  const client = await pool.connect();
  try {
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'payroll_submissions'
      );
    `);
    
    console.log('Table exists:', tableCheck.rows[0].exists);
    
    if (!tableCheck.rows[0].exists) {
      console.log('📊 Creating payroll_submissions table...');
      await client.query(`
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
    } else {
      console.log('✅ payroll_submissions table already exists');
    }
    
    // Test the query that's failing
    const result = await client.query(`
      SELECT 
        ps.*,
        COUNT(pc.id) as employee_count,
        COALESCE(SUM(pc.gross_pay), 0) as total_amount
      FROM payroll_submissions ps
      LEFT JOIN payroll_calculations pc ON ps.id = pc.submission_id
      GROUP BY ps.id
      ORDER BY ps.submission_date DESC
    `);
    
    console.log('✅ Query successful, found', result.rows.length, 'submissions');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixPayrollTable();
