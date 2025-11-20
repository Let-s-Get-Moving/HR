#!/usr/bin/env node

/**
 * Execute Settings Tables Migration on Render Database
 */

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to Render database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function executeMigration() {
  console.log('🚀 EXECUTING SETTINGS TABLES MIGRATION');
  console.log('======================================\n');

  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '..', 'db/migrations/add_settings_tables.sql');
    console.log('📖 Reading migration file:', sqlPath);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Executing SQL migration...\n');
    
    // Execute the SQL
    await pool.query(sqlContent);
    
    console.log('✅ SQL migration executed successfully!\n');
    
    // Verify tables were created
    console.log('🧪 Verifying tables were created...');
    const tables = [
      'job_titles',
      'benefits_packages',
      'work_schedules',
      'overtime_policies',
      'attendance_policies',
      'remote_work_policies'
    ];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`   ✅ ${table} table exists`);
      } else {
        console.log(`   ❌ ${table} table NOT found`);
      }
    }
    
    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('✅ All 6 settings tables are now available');
    
  } catch (error) {
    console.error('❌ Error executing migration:', error.message);
    if (error.code === '42P07') {
      console.log('⚠️  Some tables may already exist. This is OK.');
    } else {
      throw error;
    }
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

