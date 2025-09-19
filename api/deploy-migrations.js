// Deploy database migrations to Render
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function deployMigrations() {
  try {
    console.log('🚀 Deploying database migrations to Render...\n');
    
    // List of migrations to apply
    const migrations = [
      '019_fix_payroll_submissions.sql',
      '020_security_audit_logs.sql'
    ];
    
    for (const migration of migrations) {
      const migrationPath = path.join(__dirname, '..', 'db', 'init', migration);
      
      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️ Migration file not found: ${migration}`);
        continue;
      }
      
      console.log(`📄 Applying migration: ${migration}`);
      
      try {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        await q(sql);
        console.log(`✅ ${migration} applied successfully`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`⚠️ ${migration} - Some objects already exist, continuing...`);
        } else {
          console.error(`❌ Error applying ${migration}:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('\n🎉 All migrations deployed successfully!');
    
    // Test the new tables
    console.log('\n🧪 Testing new tables...');
    
    // Test payroll_submissions table
    const submissionsResult = await q('SELECT COUNT(*) FROM payroll_submissions');
    console.log(`📊 payroll_submissions: ${submissionsResult.rows[0].count} records`);
    
    // Test audit_logs table
    const auditResult = await q('SELECT COUNT(*) FROM audit_logs');
    console.log(`📊 audit_logs: ${auditResult.rows[0].count} records`);
    
    // Test security_events table
    const securityResult = await q('SELECT COUNT(*) FROM security_events');
    console.log(`📊 security_events: ${securityResult.rows[0].count} records`);
    
    console.log('\n✅ Database deployment completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration deployment:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

deployMigrations();
