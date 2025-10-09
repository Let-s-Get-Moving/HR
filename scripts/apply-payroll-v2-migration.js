import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4';

async function runMigration() {
  const client = new pg.Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Read the migration file
    const migrationPath = path.join(path.dirname(__dirname), 'db', 'init', '050_payroll_rework_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Running payroll system v2 migration...');
    console.log('================================================\n');

    await client.query(migrationSQL);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 New tables created:');
    console.log('  - payrolls');
    console.log('  - employee_vacation_balance');
    console.log('  - vacation_payouts');
    console.log('\n🔧 New functions created:');
    console.log('  - get_next_pay_period()');
    console.log('  - get_current_pay_period()');
    console.log('  - update_vacation_balance_from_payroll()');
    console.log('  - update_vacation_balance_from_payout()');
    console.log('\n📈 New views created:');
    console.log('  - payroll_summary');
    console.log('  - employee_vacation_summary');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

runMigration();

