#!/usr/bin/env node
/**
 * Run hourly_earned column migration
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
    console.log('Running hourly_earned column migration...');
    
    const sqlPath = join(__dirname, '..', 'db', 'migrations', 'add-hourly-earned-to-line-items.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully');
    
    // Verify column was added
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'commission_line_items'
        AND column_name = 'hourly_earned'
    `);
    
    if (result.rows.length > 0) {
      console.log('\nColumn details:');
      console.log(`  Name: ${result.rows[0].column_name}`);
      console.log(`  Type: ${result.rows[0].data_type}`);
      console.log(`  Default: ${result.rows[0].column_default}`);
    } else {
      console.log('⚠️  Column not found after migration');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
