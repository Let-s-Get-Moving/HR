import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('   Set it with: export DATABASE_URL="your-database-url"');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixAdminLogin() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting permanent admin login fix...\n');
    
    // 1. Ensure users table exists with correct schema
    console.log('📋 Step 1: Checking users table schema...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table ready\n');
    
    // 2. Delete ALL existing users to start fresh
    console.log('🗑️  Step 2: Clearing all existing users...');
    const deleteResult = await client.query('DELETE FROM users');
    console.log(`✅ Deleted ${deleteResult.rowCount} existing user(s)\n`);
    
    // 3. Create the ONE admin user with guaranteed correct credentials
    console.log('👤 Step 3: Creating admin user...');
    const username = 'Avneet';
    const password = 'password123';
    const email = 'avneet@hr.local';
    const role = 'Admin';
    
    // Generate fresh password hash
    const passwordHash = await bcrypt.hash(password, 10);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Email: ${email}`);
    console.log(`   Role: ${role}`);
    console.log(`   Hash generated: ${passwordHash.substring(0, 20)}...`);
    
    await client.query(`
      INSERT INTO users (email, full_name, role, password_hash)
      VALUES ($1, $2, $3, $4)
    `, [email, username, role, passwordHash]);
    console.log('✅ Admin user created\n');
    
    // 4. Verify the user was created correctly
    console.log('🔍 Step 4: Verifying user creation...');
    const verifyResult = await client.query(`
      SELECT id, email, full_name, role, password_hash
      FROM users
      WHERE full_name = $1
    `, [username]);
    
    if (verifyResult.rows.length === 0) {
      throw new Error('User verification failed - user not found after creation');
    }
    
    const user = verifyResult.rows[0];
    console.log('✅ User found in database:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Full Name: ${user.full_name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Password Hash: ${user.password_hash.substring(0, 20)}...`);
    console.log('');
    
    // 5. Test password verification
    console.log('🔐 Step 5: Testing password verification...');
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Password verification failed - hash does not match password');
    }
    console.log('✅ Password verification successful\n');
    
    // 6. Check for user_sessions table (optional but good to have)
    console.log('📋 Step 6: Ensuring user_sessions table exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Sessions table ready\n');
    
    // 7. Clean up old sessions
    console.log('🗑️  Step 7: Cleaning up old sessions...');
    await client.query('DELETE FROM user_sessions WHERE expires_at < NOW()');
    console.log('✅ Old sessions cleaned\n');
    
    console.log('════════════════════════════════════════════════════════');
    console.log('✅ ADMIN LOGIN FIXED PERMANENTLY!');
    console.log('════════════════════════════════════════════════════════');
    console.log('');
    console.log('🎯 Login Credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log('');
    console.log('📝 What was done:');
    console.log('   ✓ Users table schema verified');
    console.log('   ✓ All old users deleted');
    console.log('   ✓ Fresh admin user created');
    console.log('   ✓ Password hash verified');
    console.log('   ✓ Sessions table ready');
    console.log('   ✓ Old sessions cleaned');
    console.log('');
    console.log('🚀 You can now login at: https://hr-wbzs.onrender.com');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error fixing admin login:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAdminLogin().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

