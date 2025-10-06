/**
 * Apply Option B Migrations
 * - Multi-user RBAC system
 * - MFA/TOTP tables
 */

import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function applyMigrations() {
  console.log('🚀 Applying Option B Migrations...\n');
  
  try {
    // Migration 1: Multi-user RBAC
    console.log('📊 Migration 1: Multi-user RBAC system...');
    const rbacSQL = readFileSync(join(__dirname, '../db/init/025_multi_user_rbac.sql'), 'utf8');
    await pool.query(rbacSQL);
    console.log('✅ RBAC system created\n');
    
    // Migration 2: MFA/TOTP
    console.log('🔐 Migration 2: MFA/TOTP system...');
    const mfaSQL = readFileSync(join(__dirname, '../db/init/026_mfa_totp.sql'), 'utf8');
    await pool.query(mfaSQL);
    console.log('✅ MFA system created\n');
    
    // Verify migrations
    console.log('🔍 Verifying migrations...');
    
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('hr_roles', 'user_mfa', 'mfa_attempts', 'trusted_devices', 'user_activity_log')
      ORDER BY table_name
    `);
    
    console.log('\n✅ Created tables:');
    tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    
    // Check roles
    const roles = await pool.query(`SELECT role_name, display_name FROM hr_roles ORDER BY id`);
    console.log('\n✅ Created roles:');
    roles.rows.forEach(row => console.log(`   - ${row.role_name}: ${row.display_name}`));
    
    // Update existing admin user
    console.log('\n🔄 Updating existing admin user...');
    await pool.query(`
      UPDATE users 
      SET role_id = (SELECT id FROM hr_roles WHERE role_name = 'hr_admin' LIMIT 1),
          first_name = 'Admin',
          last_name = 'User',
          is_active = true
      WHERE id = (SELECT MIN(id) FROM users)
    `);
    console.log('✅ Admin user updated\n');
    
    console.log('🎉 All migrations applied successfully!\n');
    console.log('📋 Summary:');
    console.log('   ✅ Multi-user RBAC system ready');
    console.log('   ✅ 3 HR roles created (Admin, Manager, User)');
    console.log('   ✅ MFA/TOTP system ready');
    console.log('   ✅ Trusted devices support added');
    console.log('   ✅ User activity logging enabled\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigrations();

