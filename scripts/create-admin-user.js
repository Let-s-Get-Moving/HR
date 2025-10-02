#!/usr/bin/env node

/**
 * Create or Reset Admin User
 * 
 * This script ensures the default admin user (Avneet) exists in the database.
 * Run this if you can't log in.
 * 
 * Usage: node create-admin-user.js
 */

import pkg from 'pg';
const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('   Set it with: export DATABASE_URL="your-database-url"');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createAdminUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 Creating/Resetting Admin User...\n');
    
    // First, check what columns exist in the users table
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current users table columns:');
    const columns = columnsResult.rows.map(r => r.column_name);
    columns.forEach(col => console.log(`   - ${col}`));
    
    // Determine which schema we're using
    const hasUsername = columns.includes('username');
    const hasIsActive = columns.includes('is_active');
    const hasFullName = columns.includes('full_name');
    
    console.log('\n📊 Schema type:', hasUsername ? 'Secure (010_secure_users.sql)' : 'Basic (001_schema.sql)');
    
    // Delete existing Avneet user if exists
    await client.query(`DELETE FROM users WHERE email = 'admin@hrsystem.com' OR ${hasUsername ? "username = 'Avneet'" : "full_name ILIKE '%Avneet%'"}`);
    
    // Insert admin user based on schema
    if (hasUsername) {
      // Using secure schema from 010_secure_users.sql
      console.log('\n✅ Using secure schema - creating user with username...');
      await client.query(`
        INSERT INTO users (username, email, full_name, password_hash, role, is_active) 
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'Avneet',
        'admin@hrsystem.com',
        'Avneet Admin',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/4Qz8K2K', // password123
        'Admin',
        true
      ]);
    } else {
      // Using basic schema from 001_schema.sql
      console.log('\n✅ Using basic schema - creating user without username...');
      await client.query(`
        INSERT INTO users (email, full_name, password_hash, role) 
        VALUES ($1, $2, $3, $4)
      `, [
        'admin@hrsystem.com',
        'Avneet Admin',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/4Qz8K2K', // password123
        'Admin'
      ]);
    }
    
    // Verify user was created
    const verifyResult = await client.query(`
      SELECT * FROM users WHERE email = 'admin@hrsystem.com'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('\n✅ Admin user created successfully!');
      console.log('\n📝 Login Credentials:');
      if (hasUsername) {
        console.log('   Username: Avneet');
      } else {
        console.log('   Email: admin@hrsystem.com');
      }
      console.log('   Password: password123');
      console.log('\n🌐 You can now log in at http://localhost:5173');
    } else {
      console.log('\n❌ Failed to create admin user');
    }
    
  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    console.error('\nDetails:', error);
    
    // Provide helpful suggestions
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure DATABASE_URL is set correctly');
    console.log('   2. Ensure the database is running');
    console.log('   3. Check that the users table exists');
    console.log('   4. You may need to rebuild the database schema');
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
createAdminUser()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });

