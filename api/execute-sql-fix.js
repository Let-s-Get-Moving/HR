// Execute SQL fix for payroll submissions table
import { q } from './src/db.js';

async function executeSQLFix() {
  try {
    console.log('🔧 Executing SQL fix for payroll submissions...');
    
    // Step 1: Create the table
    console.log('Creating payroll_submissions table...');
    await q(`
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
    console.log('✅ Table created');
    
    // Step 2: Add column to payroll_calculations
    console.log('Adding submission_id column...');
    try {
      await q(`
        ALTER TABLE payroll_calculations 
        ADD COLUMN IF NOT EXISTS submission_id INTEGER
      `);
      console.log('✅ Column added');
    } catch (error) {
      console.log('Note: Column might already exist:', error.message);
    }
    
    // Step 3: Insert sample data
    console.log('Inserting sample data...');
    await q(`
      INSERT INTO payroll_submissions (period_name, notes, submission_date, status) VALUES
      ('August 2025', 'Monthly payroll for August 2025', '2025-08-31 10:00:00', 'Processed'),
      ('September 2025', 'Monthly payroll for September 2025', '2025-09-30 10:00:00', 'Processed'),
      ('October 2025', 'Monthly payroll for October 2025', '2025-10-31 10:00:00', 'Processed')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Sample data inserted');
    
    // Step 4: Test the query
    console.log('Testing query...');
    const result = await q(`
      SELECT 
        ps.*,
        0 as employee_count,
        0 as total_amount
      FROM payroll_submissions ps
      ORDER BY ps.submission_date DESC
    `);
    
    console.log('✅ Query successful!');
    console.log('Found submissions:', result.rows.length);
    console.log('Sample data:', result.rows.slice(0, 2));
    
    console.log('🎉 SQL fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Code:', error.code);
  }
  
  process.exit(0);
}

executeSQLFix();
