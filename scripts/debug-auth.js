#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function debugAuth() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debugging authentication...');
    
    // Test database connection
    await client.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Check if user exists
    const userResult = await client.query(`
      SELECT id, username, email, password_hash, role, is_active 
      FROM users 
      WHERE username = $1
    `, ['Avneet']);
    
    console.log(`📊 Found ${userResult.rows.length} user(s) with username 'Avneet'`);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No user found with username Avneet');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('👤 User details:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Is Active: ${user.is_active}`);
    console.log(`   Password Hash: ${user.password_hash.substring(0, 20)}...`);
    
    // Test password comparison
    const testPassword = 'password123';
    console.log(`\n🔐 Testing password comparison...`);
    console.log(`   Test password: ${testPassword}`);
    console.log(`   Stored hash: ${user.password_hash}`);
    
    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    console.log(`   Password valid: ${isValid}`);
    
    if (isValid) {
      console.log('✅ Password verification successful!');
    } else {
      console.log('❌ Password verification failed!');
      
      // Let's try to hash the password again and compare
      console.log('\n🔄 Testing with fresh hash...');
      const freshHash = await bcrypt.hash(testPassword, 12);
      console.log(`   Fresh hash: ${freshHash.substring(0, 20)}...`);
      
      const freshIsValid = await bcrypt.compare(testPassword, freshHash);
      console.log(`   Fresh hash valid: ${freshIsValid}`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

debugAuth();
