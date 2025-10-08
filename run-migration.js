const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const migrationFile = process.argv[2] || 'db/init/011_onboarding_fields.sql';
  
  try {
    console.log('🔌 Connecting to database...');
    
    console.log('📖 Reading migration file:', migrationFile);
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log('🚀 Executing migration...');
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();

