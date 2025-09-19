#!/usr/bin/env node

/**
 * Execute SQL Migration on Render Database
 * Directly executes the bonus schema fix SQL
 */

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';

// Connect directly to Render database
const pool = new Pool({
  connectionString: 'postgresql://hr_user:hr_password@dpg-d1j8v8mct0vss73a5kpg-a.oregon-postgres.render.com/hr_database_8x0k',
  ssl: { rejectUnauthorized: false }
});

async function executeMigration() {
  console.log('🚀 EXECUTING SQL MIGRATION');
  console.log('==========================\n');

  try {
    // Read the SQL migration file
    const sqlPath = path.join(process.cwd(), 'db/init/015_fix_bonus_approval_fields.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Executing SQL migration...');
    console.log('SQL Content:');
    console.log(sqlContent);
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Execute the SQL
    const result = await pool.query(sqlContent);
    
    console.log('✅ SQL migration executed successfully!');
    console.log('Result:', result);
    
    // Test the new columns
    console.log('\n🧪 Testing new columns...');
    const testResult = await pool.query(`
      SELECT id, approved_by, approval_notes, rejected_by, rejection_reason
      FROM bonuses 
      WHERE id = 1
    `);
    
    if (testResult.rows.length > 0) {
      console.log('✅ Test query successful!');
      console.log('Sample result:', testResult.rows[0]);
    }
    
    // Verify schema
    console.log('\n🔍 Verifying schema...');
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'bonuses' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Current bonuses table schema:');
    schemaResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('✅ All bonus approval/rejection functionality should now work');
    
  } catch (error) {
    console.error('❌ Error executing migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
executeMigration()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
