/**
 * Emergency Fix: Add metadata column to user_sessions table
 * This column is needed for MFA temporary tokens
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function fixDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔧 FIXING USER_SESSIONS TABLE\n');
    
    // Check if column exists
    console.log('1. Checking if metadata column exists...');
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions' 
      AND column_name = 'metadata'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ metadata column already exists!');
      return;
    }
    
    console.log('❌ metadata column missing. Adding it now...');
    
    // Add metadata column
    await client.query(`
      ALTER TABLE user_sessions 
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL
    `);
    
    console.log('✅ Added metadata column to user_sessions table');
    
    // Add last_activity column if it doesn't exist (also needed)
    console.log('\n2. Checking if last_activity column exists...');
    const checkActivity = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions' 
      AND column_name = 'last_activity'
    `);
    
    if (checkActivity.rows.length === 0) {
      console.log('❌ last_activity column missing. Adding it now...');
      await client.query(`
        ALTER TABLE user_sessions 
        ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT NOW()
      `);
      console.log('✅ Added last_activity column to user_sessions table');
    } else {
      console.log('✅ last_activity column already exists!');
    }
    
    // Show current table structure
    console.log('\n3. Current user_sessions table structure:');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions'
      ORDER BY ordinal_position
    `);
    
    console.table(tableInfo.rows);
    
    console.log('\n✅ USER_SESSIONS TABLE FIXED!\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixDatabase()
  .then(() => {
    console.log('🎉 Database fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database fix failed:', error);
    process.exit(1);
  });

