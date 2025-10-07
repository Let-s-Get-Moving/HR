/**
 * Fix Settings Table - Create missing application_settings table
 */

import { q } from './src/db.js';
import fs from 'fs';

async function createSettingsTable() {
  try {
    console.log('🔧 Creating application_settings table...');
    
    const sql = fs.readFileSync('./create-settings-table.sql', 'utf8');
    await q(sql);
    
    console.log('✅ application_settings table created successfully');
    
    // Test the table
    const testResult = await q(`
      SELECT COUNT(*) as count 
      FROM application_settings 
      WHERE category = 'system'
    `);
    
    console.log(`📊 System settings count: ${testResult.rows[0].count}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error creating settings table:', error.message);
    return false;
  }
}

// Run the fix
createSettingsTable().then(success => {
  if (success) {
    console.log('🎉 Settings table fix completed successfully!');
    process.exit(0);
  } else {
    console.log('💥 Settings table fix failed!');
    process.exit(1);
  }
});
