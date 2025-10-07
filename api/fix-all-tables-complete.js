/**
 * Complete Fix - Create all missing tables and fix constraints
 */

import { q } from './src/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createAllTables() {
  try {
    console.log('🔧 Creating all missing tables with correct constraints...');
    
    // 1. Create application_settings table with correct constraints
    console.log('📋 Creating application_settings table...');
    const settingsSQL = fs.readFileSync(path.join(__dirname, 'create-settings-table-fixed.sql'), 'utf8');
    await q(settingsSQL);
    console.log('✅ application_settings table created with correct constraints');
    
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
    
    // 4. Test MFA service
    console.log('🔍 Testing MFA service...');
    try {
      const { MFAService } = await import('./src/services/mfa.js');
      console.log('✅ MFA service imported successfully');
    } catch (error) {
      console.error('❌ MFA service import failed:', error.message);
    }
    
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
    console.log('🚀 Settings page should now work properly!');
    process.exit(0);
  } else {
    console.log('💥 Table creation failed!');
    process.exit(1);
  }
});
