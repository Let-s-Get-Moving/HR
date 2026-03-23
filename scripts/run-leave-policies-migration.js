#!/usr/bin/env node
/**
 * Run leave policies table extension migration
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
    console.log('Running leave policies table extension migration...');
    
    // Read the SQL file
    const sqlPath = join(__dirname, '..', 'db', 'migrations', 'extend-leave-policies-table.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully');
    
    // Verify columns were added
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'leave_policies'
      ORDER BY ordinal_position
    `);
    
    console.log(`\nLeave policies table now has ${result.rows.length} columns:`);
    for (const row of result.rows) {
      console.log(`  ${row.column_name} (${row.data_type})`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
