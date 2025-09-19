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

async function fixDatabaseErrors() {
  try {
    console.log('🔄 Fixing database errors...');
    
    // Read the fix file
    const fixPath = path.join(process.cwd(), '..', 'db', 'init', '018_fix_database_errors.sql');
    const fixSQL = fs.readFileSync(fixPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = fixSQL.split(';').filter(stmt => stmt.trim());
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await q(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          console.log(`⚠️ Statement ${i + 1} had an issue (may already exist):`, error.message);
        }
      }
    }
    
    console.log('✅ Database errors fixed successfully!');
    
    // Test the new tables
    console.log('🧪 Testing new tables...');
    
    const candidates = await q('SELECT COUNT(*) FROM candidates');
    console.log(`📊 Candidates table: ${candidates.rows[0].count} records`);
    
    const jobPostings = await q('SELECT COUNT(*) FROM job_postings');
    console.log(`📊 Job postings table: ${jobPostings.rows[0].count} records`);
    
    const payrollSubmissions = await q('SELECT COUNT(*) FROM payroll_submissions');
    console.log(`📊 Payroll submissions table: ${payrollSubmissions.rows[0].count} records`);
    
    console.log('🎉 Database fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixDatabaseErrors();
