import { q } from './src/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runJobTitleCleanupMigration() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 Removing Unused Job Title Fields');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const migrationPath = path.join(__dirname, '../db/migrations/remove-job-title-unused-fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('\n📋 Executing migration...\n');
    
    // Execute the migration
    await q(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Removed fields:');
    console.log('   - level_grade (never used)');
    console.log('   - reports_to_id (organizational hierarchy not implemented)');
    console.log('   - min_salary (not displayed or validated)');
    console.log('   - max_salary (not displayed or validated)');
    console.log('\n✅ Job titles now only have: name, description, department');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runJobTitleCleanupMigration();
