import { Router } from "express";
import { q } from "../db.js";

const r = Router();

// Admin endpoint to update bonus schema
r.post("/update-bonus-schema", async (req, res) => {
  try {
    console.log('🔄 Updating Bonus Schema via API...');
    
    // Add approval fields
    console.log('📝 Adding approval fields...');
    await q(`
      ALTER TABLE bonuses 
      ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
      ADD COLUMN IF NOT EXISTS approval_notes TEXT,
      ADD COLUMN IF NOT EXISTS payment_date DATE
    `);
    console.log('✅ Approval fields added');

    // Add rejection fields  
    console.log('📝 Adding rejection fields...');
    await q(`
      ALTER TABLE bonuses 
      ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(255),
      ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(255),
      ADD COLUMN IF NOT EXISTS rejection_notes TEXT
    `);
    console.log('✅ Rejection fields added');

    // Add updated_at column if it doesn't exist
    console.log('📝 Adding updated_at column...');
    await q(`
      ALTER TABLE bonuses 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ Updated_at column added');

    // Create indexes for better performance
    console.log('📝 Creating performance indexes...');
    await q(`CREATE INDEX IF NOT EXISTS idx_bonuses_status ON bonuses(status)`);
    await q(`CREATE INDEX IF NOT EXISTS idx_bonuses_employee_id ON bonuses(employee_id)`);
    await q(`CREATE INDEX IF NOT EXISTS idx_bonuses_created_at ON bonuses(created_at)`);
    console.log('✅ Performance indexes created');
    
    // Verify the schema
    const { rows } = await q(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'bonuses' 
      ORDER BY ordinal_position
    `);
    
    res.json({
      success: true,
      message: "Bonus schema updated successfully!",
      schema: rows.map(row => ({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES'
      }))
    });
    
  } catch (error) {
    console.error('❌ Error updating bonus schema:', error);
    res.status(500).json({ 
      success: false,
      error: "Failed to update bonus schema",
      details: error.message 
    });
  }
});

export default r;
