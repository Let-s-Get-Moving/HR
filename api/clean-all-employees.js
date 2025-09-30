import pkg from 'pg';
const { Pool } = pkg;

async function cleanAllEmployees() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('❌ DATABASE_URL environment variable is not set.');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : false,
    });

    let client;
    try {
        console.log('🔌 Connecting to database...');
        client = await pool.connect();
        console.log('✅ Connected!');

        // Check current employee count
        console.log('\n📊 Current database status:');
        const employeeCount = await client.query(`SELECT COUNT(*) FROM employees`);
        const monthlyCount = await client.query(`SELECT COUNT(*) FROM employee_commission_monthly`);
        const agentCount = await client.query(`SELECT COUNT(*) FROM agent_commission_us`);
        const hourlyCount = await client.query(`SELECT COUNT(*) FROM hourly_payout`);

        console.log(`  - Employees: ${employeeCount.rows[0].count}`);
        console.log(`  - Monthly commissions: ${monthlyCount.rows[0].count}`);
        console.log(`  - Agent US commissions: ${agentCount.rows[0].count}`);
        console.log(`  - Hourly payouts: ${hourlyCount.rows[0].count}`);

        console.log('\n⚠️  WARNING: This will DELETE ALL employee records and related data!');
        console.log('⚠️  This action CANNOT be undone!');
        
        // Delete all data (foreign key constraints will cascade)
        console.log('\n🗑️  Deleting all employee data...');

        // Delete commission data first (to be explicit)
        console.log('   → Deleting monthly commissions...');
        await client.query(`DELETE FROM employee_commission_monthly`);
        
        console.log('   → Deleting agent US commissions...');
        await client.query(`DELETE FROM agent_commission_us`);
        
        console.log('   → Deleting hourly payouts...');
        await client.query(`DELETE FROM hourly_payout`);
        
        // Delete all employees (this will cascade to other tables with FK constraints)
        console.log('   → Deleting all employees...');
        const result = await client.query(`DELETE FROM employees`);
        
        console.log(`\n✅ Cleanup complete!`);
        console.log(`   - Deleted ${result.rowCount} employees`);
        console.log(`   - All related commission data removed`);
        console.log('\n📤 Database is now clean. Re-import Excel files to populate fresh data.');

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

cleanAllEmployees();

