import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function applyEncryption() {
  try {
    console.log('🔐 Applying field-level encryption migration...\n');
    
    const sql = readFileSync(join(__dirname, '../db/init/027_field_encryption.sql'), 'utf8');
    await pool.query(sql);
    
    console.log('✅ Encryption schema created successfully!\n');
    
    // Verify
    const tables = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns
      WHERE table_name = 'employees' 
        AND column_name LIKE '%encrypted%'
      ORDER BY column_name
    `);
    
    console.log('✅ Encrypted columns added:');
    tables.rows.forEach(row => console.log(`   - ${row.column_name} (${row.data_type})`));
    
    console.log('\n🔍 Verifying PII access log table...');
    const piiLog = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'pii_access_log'
    `);
    console.log(piiLog.rows.length > 0 ? '✅ PII access log table created' : '❌ PII access log table missing');
    
    await pool.end();
    console.log('\n🎉 Field-level encryption is ready!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyEncryption();

