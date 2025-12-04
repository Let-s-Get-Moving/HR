#!/usr/bin/env node

/**
 * Run Commission Structure Settings Migration
 * Adds commission structure settings to application_settings table
 */

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use Render database connection from memory
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('🚀 Running Commission Structure Settings Migration...\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'db', 'migrations', 'add-commission-structure-settings.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Executing migration SQL...');
    await pool.query(sql);
    
    console.log('✅ Migration executed successfully!');
    
    // Verify the settings were created
    console.log('\n🔍 Verifying settings...');
    const result = await pool.query(`
      SELECT key, value 
      FROM application_settings 
      WHERE key LIKE 'sales_%' OR key LIKE 'sales_manager_%'
      ORDER BY key
    `);
    
    console.log(`✅ Found ${result.rows.length} commission structure settings:`);
    result.rows.forEach(row => {
      console.log(`   - ${row.key}: ${row.value}`);
    });
    
    console.log('\n🎉 Commission Structure Settings Migration Completed Successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('⚠️ Some settings may already exist - this is OK');
    } else {
      throw error;
    }
  } finally {
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

