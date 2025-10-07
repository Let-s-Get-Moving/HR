/**
 * Fix All Tables - Create missing tables for settings and MFA
 */

import { q } from './src/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createAllTables() {
  try {
    console.log('🔧 Creating all missing tables...');
    
    // 1. Create application_settings table
    console.log('📋 Creating application_settings table...');
    const settingsSQL = fs.readFileSync(path.join(__dirname, 'create-settings-table.sql'), 'utf8');
    await q(settingsSQL);
    console.log('✅ application_settings table created');
    
    // 2. Create user_mfa table
    console.log('🔐 Creating user_mfa table...');
    const mfaSQL = fs.readFileSync(path.join(__dirname, 'create-mfa-table.sql'), 'utf8');
    await q(mfaSQL);
    console.log('✅ user_mfa table created');
    
    // 3. Test both tables
    console.log('🧪 Testing tables...');
    
    const settingsTest = await q(`
      SELECT COUNT(*) as count 
      FROM application_settings 
      WHERE category = 'system'
    `);
    console.log(`📊 System settings count: ${settingsTest.rows[0].count}`);
    
    const mfaTest = await q(`
      SELECT COUNT(*) as count 
      FROM user_mfa
    `);
    console.log(`🔐 MFA records count: ${mfaTest.rows[0].count}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the fix
createAllTables().then(success => {
  if (success) {
    console.log('🎉 All tables created successfully!');
    process.exit(0);
  } else {
    console.log('💥 Table creation failed!');
    process.exit(1);
  }
});
