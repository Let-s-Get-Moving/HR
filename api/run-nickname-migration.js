/**
 * Run nickname migration on Render production database
 * Adds nickname column to employees table
 */

import pkg from 'pg';
const { Pool } = pkg;

// Use Render database connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function runNicknameMigration() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting nickname migration on production database...');
    
    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'nickname'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ Nickname column already exists!');
      return;
    }
    
    console.log('📝 Column does not exist, running migration...');
    
    // Execute the migration
    await client.query('BEGIN');
    
    // Add nickname column
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS nickname TEXT`);
    console.log('✅ Added nickname column');
    
    // Create index
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employees_nickname ON employees(LOWER(TRIM(nickname))) WHERE nickname IS NOT NULL`);
    console.log('✅ Created index');
    
    // Add comment
    await client.query(`COMMENT ON COLUMN employees.nickname IS 'Alternative name/nickname for employee matching in imports (e.g., "Dmytro Benz" for "Dmytro Brovko")'`);
    console.log('✅ Added column comment');
    
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the column was created
    const verifyColumn = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'nickname'
    `);
    
    if (verifyColumn.rows.length > 0) {
      console.log('✅ Verification successful!');
      console.log('Column details:', verifyColumn.rows[0]);
    } else {
      console.log('⚠️  Warning: Column not found after migration');
    }
    
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runNicknameMigration();

