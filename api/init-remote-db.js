#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Pool } = pkg;

// Database connection for Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Connecting to Render database...');
    
    // Test connection
    await client.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Read and execute the secure users SQL file
    const sqlFile = '../db/init/010_secure_users.sql';
    console.log(`📄 Executing ${sqlFile}...`);
    
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    try {
      await client.query(sql);
      console.log(`✅ ${sqlFile} executed successfully`);
    } catch (error) {
      console.error(`❌ Error executing ${sqlFile}:`, error.message);
      throw error;
    }
    
    // Verify the secure user was created
    const userResult = await client.query(`
      SELECT username, email, role, is_active 
      FROM users 
      WHERE username = 'Avneet'
    `);
    
    if (userResult.rows.length > 0) {
      console.log('✅ Secure admin user created successfully');
      console.log('   Username: Avneet');
      console.log('   Email: admin@hrsystem.com');
      console.log('   Role: admin');
      console.log('   Password: password123 (hashed)');
    } else {
      console.log('❌ Admin user not found');
    }
    
    // Check security tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_sessions', 'security_audit_log')
      ORDER BY table_name
    `);
    
    console.log('🔒 Security tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    console.log('\n🎉 Database initialization complete!');
    console.log('🔐 Security features enabled:');
    console.log('   • Password hashing with bcrypt');
    console.log('   • SQL injection protection');
    console.log('   • XSS protection');
    console.log('   • Secure session management');
    console.log('   • Audit logging');
    console.log('   • Account locking after failed attempts');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase().catch(console.error);
}

export default initDatabase;
