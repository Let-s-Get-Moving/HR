import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';

// Create connection pool for Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Query function
const q = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

async function applyMigration() {
  try {
    console.log('🔄 Applying payroll submissions migration...');
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), '..', 'db', 'init', '017_payroll_submissions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await q(migrationSQL);
    
    console.log('✅ Payroll submissions migration applied successfully!');
    
    // Test the new endpoints
    console.log('🧪 Testing payroll submissions endpoints...');
    
    // Test GET /api/payroll/submissions
    const submissions = await q('SELECT * FROM payroll_submissions ORDER BY submission_date DESC LIMIT 5');
    console.log(`📊 Found ${submissions.rows.length} payroll submissions`);
    
    if (submissions.rows.length > 0) {
      console.log('Sample submission:', submissions.rows[0]);
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
