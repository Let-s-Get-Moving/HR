#!/usr/bin/env node

/**
 * Update Schema Endpoint
 * Creates a temporary endpoint to update the database schema
 */

import { q } from './src/db.js';

async function updateBonusSchema() {
  console.log('🔄 Updating Bonus Schema via API...');
  console.log('====================================\n');

  try {
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
    
    console.log('\n🎉 Bonus schema updated successfully!');
    console.log('✅ All bonus approval/rejection functionality should now work');
    
    // Verify the schema
    console.log('\n🔍 Verifying schema...');
    const { rows } = await q(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'bonuses' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Current bonuses table schema:');
    rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
  } catch (error) {
    console.error('❌ Error updating bonus schema:', error);
    throw error;
  }
}

// Run the update
updateBonusSchema()
  .then(() => {
    console.log('\n✅ Schema update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Schema update failed:', error);
    process.exit(1);
  });
