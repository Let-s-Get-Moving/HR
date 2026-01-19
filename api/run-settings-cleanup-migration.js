import { q } from './src/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCleanupMigration() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 Running Settings Cleanup Migration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const migrationPath = path.join(__dirname, '../db/migrations/cleanup-non-functional-settings.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('\n📋 Executing migration...\n');
    
    // Execute the migration
    await q(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Removed non-functional notification settings (push_notifications, sms_notifications)');
    console.log('   - Removed non-functional security settings (session_timeout, login_attempts, etc.)');
    console.log('   - Removed entire maintenance category (no functionality)');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runCleanupMigration();
