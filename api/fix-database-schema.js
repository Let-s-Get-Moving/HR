// Fix database schema endpoint
import express from "express";
import { q } from "./src/db.js";

const app = express();
app.use(express.json());

// Endpoint to fix payroll submissions table
app.post("/fix-payroll-submissions", async (req, res) => {
  try {
    console.log('🔧 Fixing payroll submissions table...');
    
    // Step 1: Create payroll_submissions table if it doesn't exist
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
    
    // Step 2: Add submission_id column to payroll_calculations if it doesn't exist
    await q(`
      ALTER TABLE payroll_calculations 
      ADD COLUMN IF NOT EXISTS submission_id INTEGER
    `);
    
    // Step 3: Add foreign key constraint if it doesn't exist
    try {
      await q(`
        ALTER TABLE payroll_calculations 
        ADD CONSTRAINT fk_payroll_calculation_submission
        FOREIGN KEY (submission_id) REFERENCES payroll_submissions(id) ON DELETE SET NULL
      `);
    } catch (error) {
      if (error.code !== '42710') { // constraint already exists
        throw error;
      }
    }
    
    // Step 4: Create indexes
    await q(`
      CREATE INDEX IF NOT EXISTS idx_payroll_submissions_date ON payroll_submissions(submission_date DESC)
    `);
    await q(`
      CREATE INDEX IF NOT EXISTS idx_payroll_calculations_submission ON payroll_calculations(submission_id)
    `);
    
    // Step 5: Insert sample data if table is empty
    const countResult = await q('SELECT COUNT(*) as count FROM payroll_submissions');
    const count = parseInt(countResult.rows[0].count);
    
    if (count === 0) {
      await q(`
        INSERT INTO payroll_submissions (period_name, notes, submission_date, status) VALUES
        ('August 2025', 'Monthly payroll for August 2025', '2025-08-31 10:00:00', 'Processed'),
        ('September 2025', 'Monthly payroll for September 2025', '2025-09-30 10:00:00', 'Processed'),
        ('October 2025', 'Monthly payroll for October 2025', '2025-10-31 10:00:00', 'Processed')
      `);
    }
    
    // Test the query
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
    
    res.json({
      success: true,
      message: 'Payroll submissions table fixed successfully',
      submissions_count: result.rows.length,
      sample_data: result.rows.slice(0, 2)
    });
    
  } catch (error) {
    console.error('Error fixing payroll submissions table:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Database fix server running on port ${PORT}`);
});
