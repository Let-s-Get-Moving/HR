#!/usr/bin/env node
/**
 * Run commission structure settings migration
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  host: 'dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com',
  user: 'hr',
  password: 'bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn',
  database: 'hrcore_42l4',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('Running commission structure settings migration...');
    
    // Read the SQL file
    const sqlPath = join(__dirname, '..', 'db', 'migrations', 'add-commission-structure-settings.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully');
    
    // Verify settings were inserted
    const result = await pool.query(`
      SELECT key, value 
      FROM application_settings 
      WHERE key LIKE 'sales_agent_threshold_%' 
         OR key LIKE 'sales_manager_threshold_%'
         OR key = 'sales_agent_vacation_package_value'
      ORDER BY key
    `);
    
    console.log(`\nFound ${result.rows.length} commission settings in database:`);
    for (const row of result.rows) {
      console.log(`  ${row.key}: ${row.value}`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
