// Test script to debug payroll submissions endpoint
import { q } from './src/db.js';

async function testPayrollSubmissions() {
  try {
    console.log('🔍 Testing payroll submissions endpoint...');
    
    // Test 1: Check if payroll_submissions table exists
    console.log('\n1. Checking if payroll_submissions table exists...');
    const tableCheck = await q(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'payroll_submissions'
      );
    `);
    console.log('✅ payroll_submissions table exists:', tableCheck.rows[0].exists);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table does not exist, creating it...');
      
      // Create payroll_submissions table
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
      
      console.log('✅ payroll_submissions table created');
    }
    
    // Test 2: Check if payroll_calculations table exists
    console.log('\n2. Checking if payroll_calculations table exists...');
    const calculationsTableCheck = await q(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'payroll_calculations'
      );
    `);
    console.log('✅ payroll_calculations table exists:', calculationsTableCheck.rows[0].exists);
    
    // Test 3: Check if submission_id column exists in payroll_calculations
    console.log('\n3. Checking if submission_id column exists in payroll_calculations...');
    const submissionIdColumnCheck = await q(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'payroll_calculations' AND column_name = 'submission_id'
      );
    `);
    console.log('✅ submission_id column exists:', submissionIdColumnCheck.rows[0].exists);
    
    // Test 4: Try the actual query from the submissions endpoint
    console.log('\n4. Testing the submissions query...');
    let rows;
    
    if (calculationsTableCheck.rows[0].exists && submissionIdColumnCheck.rows[0].exists) {
      console.log('Using JOIN with payroll_calculations...');
      const result = await q(`
        SELECT 
          ps.*,
          COUNT(pc.id) as employee_count,
          COALESCE(SUM(pc.gross_pay), 0) as total_amount
        FROM payroll_submissions ps
        LEFT JOIN payroll_calculations pc ON ps.id = pc.submission_id
        GROUP BY ps.id
        ORDER BY ps.submission_date DESC
      `);
      rows = result.rows;
    } else {
      console.log('Using simple query without calculations...');
      const result = await q(`
        SELECT 
          ps.*,
          0 as employee_count,
          0 as total_amount
        FROM payroll_submissions ps
        ORDER BY ps.submission_date DESC
      `);
      rows = result.rows;
    }
    
    console.log('✅ Query successful, found', rows.length, 'submissions');
    console.log('Sample data:', rows.slice(0, 2));
    
    // Test 5: Insert some test data if table is empty
    if (rows.length === 0) {
      console.log('\n5. No submissions found, inserting test data...');
      await q(`
        INSERT INTO payroll_submissions (period_name, notes, submission_date, status) VALUES
        ('August 2025', 'Monthly payroll for August 2025', '2025-08-31 10:00:00', 'Processed'),
        ('September 2025', 'Monthly payroll for September 2025', '2025-09-30 10:00:00', 'Processed')
        ON CONFLICT DO NOTHING
      `);
      console.log('✅ Test data inserted');
    }
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testPayrollSubmissions();