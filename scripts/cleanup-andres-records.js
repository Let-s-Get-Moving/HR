import pkg from 'pg';
const { Pool } = pkg;

async function cleanupAllJuly2025Data() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('DATABASE_URL environment variable is not set.');
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

        // Check current data counts
        console.log('\n📊 Current July 2025 data:');
        const countMonthly = await client.query(`SELECT COUNT(*) FROM employee_commission_monthly WHERE period_month = '2025-07-01'`);
        const countAgent = await client.query(`SELECT COUNT(*) FROM agent_commission_us WHERE period_month = '2025-07-01'`);
        const countHourly = await client.query(`SELECT COUNT(*) FROM hourly_payout WHERE period_month = '2025-07-01'`);
        
        console.log(`  - Monthly commissions: ${countMonthly.rows[0].count} records`);
        console.log(`  - Agent US commissions: ${countAgent.rows[0].count} records`);
        console.log(`  - Hourly payouts: ${countHourly.rows[0].count} records`);

        // Delete ALL commission data for period 2025-07-01 (corrupted from bad parser)
        console.log('\n🗑️  Deleting ALL July 2025 commission data (corrupted from block overlap issue)...');
        console.log('⚠️  This will delete all records to ensure clean re-import.');
        
        const monthlyResult = await client.query(`
            DELETE FROM employee_commission_monthly WHERE period_month = '2025-07-01'
        `);
        console.log(`   ✓ Deleted ${monthlyResult.rowCount} monthly commission records`);

        const agentResult = await client.query(`
            DELETE FROM agent_commission_us WHERE period_month = '2025-07-01'
        `);
        console.log(`   ✓ Deleted ${agentResult.rowCount} agent US commission records`);

        const hourlyResult = await client.query(`
            DELETE FROM hourly_payout WHERE period_month = '2025-07-01'
        `);
        console.log(`   ✓ Deleted ${hourlyResult.rowCount} hourly payout records`);

        console.log('\n✅ Cleanup complete! All July 2025 data has been removed.');
        console.log('📤 Re-import the Excel file to create fresh, correct records with the fixed parser.');

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

cleanupAllJuly2025Data();
