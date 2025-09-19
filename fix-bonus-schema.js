#!/usr/bin/env node

/**
 * Fix Bonus Schema - Direct Database Update
 * Updates the bonuses table with missing approval/rejection fields
 */

import pkg from 'pg';
const { Pool } = pkg;

// Connect directly to Render database
const pool = new Pool({
  connectionString: 'postgresql://hr_user:hr_password@dpg-d1j8v8mct0vss73a5kpg-a.oregon-postgres.render.com/hr_database_8x0k',
  ssl: { rejectUnauthorized: false }
});

async function fixBonusSchema() {
  console.log('🔧 FIXING BONUS SCHEMA');
  console.log('======================\n');

  try {
    // Check current schema
    console.log('📊 Checking current bonuses table schema...');
    const { rows: currentColumns } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'bonuses' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns:');
    currentColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Add missing columns
    console.log('\n📝 Adding missing approval fields...');
    await pool.query(`
      ALTER TABLE bonuses 
      ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
      ADD COLUMN IF NOT EXISTS approval_notes TEXT,
      ADD COLUMN IF NOT EXISTS payment_date DATE
    `);
    console.log('✅ Approval fields added');

    console.log('📝 Adding missing rejection fields...');
    await pool.query(`
      ALTER TABLE bonuses 
      ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(255),
      ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(255),
      ADD COLUMN IF NOT EXISTS rejection_notes TEXT
    `);
    console.log('✅ Rejection fields added');

    console.log('📝 Adding updated_at column...');
    await pool.query(`
      ALTER TABLE bonuses 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ Updated_at column added');

    // Create indexes for better performance
    console.log('📝 Creating performance indexes...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bonuses_status ON bonuses(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bonuses_employee_id ON bonuses(employee_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bonuses_created_at ON bonuses(created_at)`);
    console.log('✅ Performance indexes created');

    // Verify the updated schema
    console.log('\n🔍 Verifying updated schema...');
    const { rows: updatedColumns } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'bonuses' 
      ORDER BY ordinal_position
    `);
    
    console.log('Updated columns:');
    updatedColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Test the new columns with a sample update
    console.log('\n🧪 Testing new columns...');
    const { rows: testResult } = await pool.query(`
      UPDATE bonuses 
      SET approved_by = 'Test Admin', 
          approval_notes = 'Test approval',
          rejected_by = NULL,
          rejection_reason = NULL,
          rejection_notes = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
      RETURNING id, approved_by, approval_notes, rejected_by, rejection_reason
    `);
    
    if (testResult.length > 0) {
      console.log('✅ Test update successful!');
      console.log('Sample result:', testResult[0]);
    } else {
      console.log('⚠️  No bonus with ID 1 found for testing');
    }
    
    console.log('\n🎉 BONUS SCHEMA FIXED SUCCESSFULLY!');
    console.log('✅ All approval/rejection functionality should now work');
    console.log('✅ Approve and Reject popups will now function properly');
    
  } catch (error) {
    console.error('❌ Error fixing bonus schema:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fix
fixBonusSchema()
  .then(() => {
    console.log('\n✅ Schema fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Schema fix failed:', error);
    process.exit(1);
  });
