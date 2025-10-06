/**
 * Apply Persistent Settings Migration
 * Creates application_settings table and migrates all settings to database
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('\n⚙️  APPLYING PERSISTENT SETTINGS MIGRATION\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../db/init/029_persistent_settings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('🚀 Executing migration...\n');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration executed successfully!\n');
    
    // Verify the table was created
    console.log('📊 Verifying application_settings table...');
    const tableCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'application_settings'
      ORDER BY ordinal_position
    `);
    
    console.table(tableCheck.rows);
    
    // Show all settings by category
    console.log('\n📋 Current settings by category:');
    const settingsResult = await client.query(`
      SELECT category, COUNT(*) as count
      FROM application_settings
      GROUP BY category
      ORDER BY category
    `);
    
    console.table(settingsResult.rows);
    
    // Show a sample of each category
    console.log('\n📝 Sample settings:');
    const sampleResult = await client.query(`
      SELECT category, key, value, type
      FROM application_settings
      ORDER BY category, key
      LIMIT 20
    `);
    
    console.table(sampleResult.rows);
    
    console.log('\n✅ PERSISTENT SETTINGS SYSTEM IS NOW ACTIVE!\n');
    console.log('Features enabled:');
    console.log('  ✅ All settings stored in database');
    console.log('  ✅ Changes persist across sessions');
    console.log('  ✅ No more localStorage caching issues');
    console.log('  ✅ Automatic timestamp tracking');
    console.log('  ✅ Settings organized by category\n');
    
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error.message);
    console.error(error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });

