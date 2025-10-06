/**
 * Apply Password Expiry Migration
 * Adds password tracking and expiry functionality
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
    console.log('\n🔐 APPLYING PASSWORD EXPIRY MIGRATION\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../db/init/028_password_expiry.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('🚀 Executing migration...\n');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration executed successfully!\n');
    
    // Verify the changes
    console.log('📊 Verifying new columns...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('password_changed_at', 'password_expires_at', 'must_change_password', 'password_history')
      ORDER BY column_name
    `);
    
    console.table(columnsResult.rows);
    
    // Show password status for all users
    console.log('\n📋 Current password status for all users:');
    const statusResult = await client.query(`
      SELECT * FROM user_password_status ORDER BY id
    `);
    
    console.table(statusResult.rows);
    
    console.log('\n✅ PASSWORD EXPIRY SYSTEM IS NOW ACTIVE!\n');
    console.log('Features enabled:');
    console.log('  ✅ Password expiry tracking (90 days default)');
    console.log('  ✅ Automatic expiry calculation on password change');
    console.log('  ✅ Password history (prevents reuse of last 5 passwords)');
    console.log('  ✅ Force password change (admin feature)');
    console.log('  ✅ Expiry warnings (10 days before expiry)');
    console.log('  ✅ Real-time password status view\n');
    
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

