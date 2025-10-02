#!/usr/bin/env node

/**
 * Setup Single Admin User
 * Run this to create/reset the admin user if you can't log in
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4",
  ssl: { rejectUnauthorized: false } // Always use SSL for Render
});

async function setupAdminUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 Setting up admin user...\n');
    
    // Delete all existing users
    await client.query('DELETE FROM users');
    console.log('✅ Cleared existing users');
    
    // Insert the single admin user
    await client.query(`
      INSERT INTO users (email, full_name, password_hash, role) 
      VALUES ($1, $2, $3, $4)
    `, [
      'admin@hrsystem.com',
      'Avneet',
      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/4Qz8K2K', // password123
      'Admin'
    ]);
    
    console.log('✅ Created admin user\n');
    console.log('═══════════════════════════════════');
    console.log('📝 Login Credentials:');
    console.log('   Username: Avneet');
    console.log('   Password: password123');
    console.log('═══════════════════════════════════');
    console.log('\n🌐 Login at: http://localhost:5173\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupAdminUser();

