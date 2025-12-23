/**
 * Run Overtime Multiplier Migration
 * Updates the auto_create_payroll_from_timecards() function to use overtime policy multiplier
 */

import { q } from './src/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🚀 Starting overtime multiplier migration...');
    console.log('📖 Reading migration file...');
    
    const migrationPath = path.join(__dirname, '../db/migrations/fix_overtime_multiplier_trigger.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Executing migration...');
    await q(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ The payroll trigger function now uses overtime policy multipliers from settings');
    
    // Verify the function was updated
    console.log('\n🔍 Verifying function update...');
    const verifyResult = await q(`
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE proname = 'auto_create_payroll_from_timecards'
    `);
    
    if (verifyResult.rows.length > 0) {
      const definition = verifyResult.rows[0].definition;
      if (definition.includes('v_overtime_multiplier') && definition.includes('overtime_policies')) {
        console.log('✅ Function successfully updated with overtime policy support');
      } else {
        console.log('⚠️  Function may not have been updated correctly');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run migration
runMigration().then(success => {
  if (success) {
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  } else {
    console.log('\n❌ Migration failed!');
    process.exit(1);
  }
});



