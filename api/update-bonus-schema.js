#!/usr/bin/env node

/**
 * Update Bonus Schema
 * Adds missing approval/rejection fields to the bonuses table
 */

import pkg from 'pg';
const { Pool } = pkg;

// Database connection - Use Render database only
const pool = new Pool({
  connectionString: 'postgresql://hr_user:hr_password@dpg-d1j8v8mct0vss73a5kpg-a.oregon-postgres.render.com/hr_database_8x0k',
  ssl: { rejectUnauthorized: false }
});

async function updateBonusSchema() {
  console.log('🔄 Updating Bonus Schema...');
  console.log('============================\n');

  try {
    // Read the migration file
    const fs = await import('fs');
    const migrationSQL = fs.readFileSync('../db/init/014_bonus_approval_fields.sql', 'utf8');
    
    console.log('📝 Applying migration: 014_bonus_approval_fields.sql');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Bonus schema updated successfully!');
    console.log('📋 Added fields:');
    console.log('   - approved_by (VARCHAR)');
    console.log('   - approval_notes (TEXT)');
    console.log('   - payment_date (DATE)');
    console.log('   - rejected_by (VARCHAR)');
    console.log('   - rejection_reason (VARCHAR)');
    console.log('   - rejection_notes (TEXT)');
    console.log('   - updated_at (TIMESTAMP)');
    console.log('   - Performance indexes');
    
    // Verify the schema
    console.log('\n🔍 Verifying schema...');
    const { rows } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'bonuses' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Current bonuses table schema:');
    rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('\n🎉 Database schema update complete!');
    console.log('✅ All bonus approval/rejection functionality should now work');
    
  } catch (error) {
    console.error('❌ Error updating bonus schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateBonusSchema();
