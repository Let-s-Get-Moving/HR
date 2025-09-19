// Fix database issues directly
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
});

async function fixDatabaseIssues() {
  try {
    console.log('🔧 Fixing database issues...');
    
    // 1. Create payroll_submissions table
    console.log('📊 Creating payroll_submissions table...');
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
    
    // 2. Create payroll_calculations table
    console.log('📊 Creating payroll_calculations table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payroll_calculations (
          id SERIAL PRIMARY KEY,
          employee_id INT NOT NULL,
          period_id INT,
          submission_id INT,
          work_date DATE,
          base_hours DECIMAL(5,2) DEFAULT 0,
          overtime_hours DECIMAL(5,2) DEFAULT 0,
          regular_rate DECIMAL(10,2) DEFAULT 0,
          overtime_rate DECIMAL(10,2) DEFAULT 0,
          gross_pay DECIMAL(10,2) DEFAULT 0,
          commission_amount DECIMAL(10,2) DEFAULT 0,
          bonus_amount DECIMAL(10,2) DEFAULT 0,
          total_gross DECIMAL(10,2) DEFAULT 0,
          deductions DECIMAL(10,2) DEFAULT 0,
          net_pay DECIMAL(10,2) DEFAULT 0,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ payroll_calculations table created');
    
    // 3. Add status column to interviews table
    console.log('📊 Adding status column to interviews table...');
    await pool.query(`
      ALTER TABLE interviews ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Scheduled'
    `);
    console.log('✅ status column added to interviews table');
    
    // 4. Test the endpoints
    console.log('🧪 Testing payroll submissions...');
    const submissionsResult = await pool.query(`
      SELECT 
        ps.*,
        COUNT(pc.id) as employee_count,
        COALESCE(SUM(pc.gross_pay), 0) as total_amount
      FROM payroll_submissions ps
      LEFT JOIN payroll_calculations pc ON ps.id = pc.submission_id
      GROUP BY ps.id
      ORDER BY ps.submission_date DESC
    `);
    console.log(`✅ Payroll submissions query successful, found ${submissionsResult.rows.length} submissions`);
    
    console.log('🧪 Testing interviews status...');
    const interviewsResult = await pool.query(`
      SELECT id, status FROM interviews LIMIT 5
    `);
    console.log(`✅ Interviews query successful, found ${interviewsResult.rows.length} interviews`);
    
    console.log('🎉 All database issues fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database issues:', error);
  } finally {
    await pool.end();
  }
}

fixDatabaseIssues();
