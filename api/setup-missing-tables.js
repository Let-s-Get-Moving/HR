import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function setupMissingTables() {
  let client;
  try {
    console.log('🔗 Connecting to Render database...');
    client = await pool.connect();
    console.log('✅ Connected to database successfully');

    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '..', 'db', 'init', '012_recruiting_benefits_bonuses_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Reading schema file...');
    console.log('📊 Schema file size:', schemaSQL.length, 'characters');

    // Split the SQL into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`🔧 Executing ${statements.length} SQL statements...`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await client.query(statement);
          successCount++;
          if (i % 10 === 0) {
            console.log(`   Progress: ${i + 1}/${statements.length} statements executed`);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          // Continue with other statements even if one fails
        }
      }
    }

    console.log('\n📈 Execution Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    // Verify tables were created
    console.log('\n🔍 Verifying table creation...');
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'job_postings', 'candidates', 'job_applications', 'interviews',
        'insurance_plans', 'retirement_plans', 'benefits_enrollments',
        'bonus_structures', 'commission_structures', 'bonuses', 'commissions'
      )
      ORDER BY table_name;
    `;
    
    const result = await client.query(tableCheckQuery);
    console.log('📋 Created tables:');
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });

    if (result.rows.length === 11) {
      console.log('\n🎉 All required tables created successfully!');
    } else {
      console.log(`\n⚠️  Expected 11 tables, found ${result.rows.length}`);
    }

  } catch (error) {
    console.error('❌ Error setting up tables:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the setup
setupMissingTables()
  .then(() => {
    console.log('\n✅ Database setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Database setup failed:', error);
    process.exit(1);
  });
