import { q } from './src/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runDepartmentsMigration() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏢 Adding Missing Departments');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const migrationPath = path.join(__dirname, '../db/migrations/add-missing-departments.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('\n📋 Executing migration...\n');
    
    // Execute the migration
    await q(sql);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify departments
    const result = await q('SELECT name FROM departments ORDER BY name');
    console.log('\n📊 All departments:');
    result.rows.forEach(dept => {
      console.log(`   - ${dept.name}`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runDepartmentsMigration();
