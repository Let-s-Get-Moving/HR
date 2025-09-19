import pkg from 'pg';
const { Pool } = pkg;

// Create connection pool for Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Query function
const q = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

async function fixPayrollSubmissionsTable() {
  try {
    console.log('🔄 Creating payroll_submissions table...');
    
    // Create payroll_submissions table
    await q(`
      CREATE TABLE IF NOT EXISTS payroll_submissions (
        id SERIAL PRIMARY KEY,
        period_name VARCHAR(255) NOT NULL,
        notes TEXT,
        submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Processed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ payroll_submissions table created');
    
    // Add submission_id to payroll_calculations table if it doesn't exist
    await q(`
      ALTER TABLE payroll_calculations 
      ADD COLUMN IF NOT EXISTS submission_id INTEGER REFERENCES payroll_submissions(id) ON DELETE CASCADE
    `);
    
    console.log('✅ submission_id column added to payroll_calculations');
    
    // Create indexes
    await q(`
      CREATE INDEX IF NOT EXISTS idx_payroll_submissions_date ON payroll_submissions(submission_date)
    `);
    
    await q(`
      CREATE INDEX IF NOT EXISTS idx_payroll_calculations_submission ON payroll_calculations(submission_id)
    `);
    
    console.log('✅ Indexes created');
    
    // Insert some sample data
    await q(`
      INSERT INTO payroll_submissions (period_name, notes, submission_date, status) VALUES
      ('August 2025', 'Monthly payroll for August 2025', '2025-08-31 10:00:00', 'Processed'),
      ('September 2025', 'Monthly payroll for September 2025', '2025-09-30 10:00:00', 'Processed'),
      ('October 2025', 'Monthly payroll for October 2025', '2025-10-31 10:00:00', 'Processed')
      ON CONFLICT DO NOTHING
    `);
    
    console.log('✅ Sample data inserted');
    
    // Test the table
    const result = await q('SELECT COUNT(*) FROM payroll_submissions');
    console.log(`📊 payroll_submissions table has ${result.rows[0].count} records`);
    
    console.log('🎉 Payroll submissions table fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing payroll submissions table:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixPayrollSubmissionsTable();
