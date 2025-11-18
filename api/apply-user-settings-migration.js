/**
 * Apply migration to add user_id column to application_settings table
 * This enables per-user settings storage
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Database connection - use Render database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: {
    rejectUnauthorized: false
  }
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Applying user settings migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../db/migrations/add-user-id-to-settings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Migration applied successfully!');
    console.log('📝 User-specific settings are now enabled.');
    console.log('   - Each user can have their own theme, language, timezone, etc.');
    console.log('   - Settings persist across logins');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration().catch(console.error);

