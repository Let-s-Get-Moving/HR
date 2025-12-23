#!/usr/bin/env node

/**
 * Clean all leave records from database
 * Removes all leave_requests and leaves table records
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function cleanLeaves() {
  try {
    console.log('🔌 Connecting to database...');
    
    const sqlPath = path.join(__dirname, 'db/migrations/clean_all_leaves.sql');
    console.log('📖 Reading SQL file:', sqlPath);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🚀 Executing cleanup...');
    console.log('⚠️  WARNING: This will delete ALL leave records!');
    
    // Execute the SQL
    const result = await pool.query(sql);
    
    // Check how many records were deleted
    const leaveRequestsCount = await pool.query('SELECT COUNT(*) FROM leave_requests');
    const leavesCount = await pool.query('SELECT COUNT(*) FROM leaves');
    
    console.log('✅ Cleanup completed successfully!');
    console.log(`   - leave_requests table: ${leaveRequestsCount.rows[0].count} records remaining`);
    console.log(`   - leaves table: ${leavesCount.rows[0].count} records remaining`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanLeaves();

