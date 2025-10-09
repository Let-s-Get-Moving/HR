import pg from 'pg';

const connectionString = 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4';

async function updatePayroll() {
  const client = new pg.Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    console.log('📄 Updating payroll system v2...');
    console.log('================================================\n');

    // Drop and recreate tables
    console.log('1. Dropping existing payroll v2 tables...');
    await client.query(`
      DROP TABLE IF EXISTS vacation_payouts CASCADE;
      DROP TABLE IF EXISTS employee_vacation_balance CASCADE;
      DROP TABLE IF EXISTS payrolls CASCADE;
      DROP VIEW IF EXISTS payroll_summary CASCADE;
      DROP VIEW IF EXISTS employee_vacation_summary CASCADE;
    `);
    console.log('   ✅ Tables dropped\n');

    // Read and execute the full migration
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationPath = path.join(path.dirname(__dirname), 'db', 'init', '050_payroll_rework_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('2. Creating new tables and triggers...');
    await client.query(migrationSQL);
    console.log('   ✅ Tables created\n');

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Tables created/updated:');
    console.log('  - payrolls (with calculated_at column)');
    console.log('  - employee_vacation_balance');
    console.log('  - vacation_payouts');
    console.log('\n🔧 Triggers created:');
    console.log('  - auto_create_payroll_from_timecards (on timecards table)');
    console.log('  - update_vacation_balance (on payrolls table)');
    console.log('  - update_vacation_balance_payout (on vacation_payouts table)');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

updatePayroll();
