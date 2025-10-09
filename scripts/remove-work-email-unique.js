const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
  try {
    console.log('🔧 Removing UNIQUE constraint from work_email...\n');
    
    const sqlPath = path.join(__dirname, '../db/init/053_remove_work_email_unique.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ UNIQUE constraint removed successfully!');
    console.log('✅ Non-unique index created for performance\n');
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    pool.end();
    process.exit(1);
  }
}

applyMigration();

