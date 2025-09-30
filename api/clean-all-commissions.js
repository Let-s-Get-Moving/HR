import pkg from 'pg';
const { Pool } = pkg;

async function cleanAllCommissions() {
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

        // Check current commission counts
        console.log('\n📊 Current database status:');
        const monthlyCount = await client.query(`SELECT COUNT(*) FROM employee_commission_monthly`);
        const agentCount = await client.query(`SELECT COUNT(*) FROM agent_commission_us`);
        const hourlyCount = await client.query(`SELECT COUNT(*) FROM hourly_payout`);

        console.log(`  - Monthly commissions: ${monthlyCount.rows[0].count}`);
        console.log(`  - Agent US commissions: ${agentCount.rows[0].count}`);
        console.log(`  - Hourly payouts: ${hourlyCount.rows[0].count}`);

        // List available periods
        const periods = await client.query(`
            SELECT DISTINCT period_month, COUNT(*) as count
            FROM employee_commission_monthly
            GROUP BY period_month
            ORDER BY period_month DESC
        `);

        if (periods.rows.length > 0) {
            console.log('\n📅 Commission periods found:');
            periods.rows.forEach(p => {
                const date = new Date(p.period_month);
                const monthName = date.toLocaleString('default', { month: 'long' });
                const year = date.getFullYear();
                console.log(`  - ${monthName} ${year}: ${p.count} records`);
            });
        }

        console.log('\n⚠️  WARNING: This will DELETE ALL commission data!');
        console.log('⚠️  This action CANNOT be undone!');
        
        // Delete all commission data
        console.log('\n🗑️  Deleting all commission data...');

        const monthlyResult = await client.query(`DELETE FROM employee_commission_monthly`);
        console.log(`   ✓ Deleted ${monthlyResult.rowCount} monthly commission records`);
        
        const agentResult = await client.query(`DELETE FROM agent_commission_us`);
        console.log(`   ✓ Deleted ${agentResult.rowCount} agent US commission records`);
        
        const hourlyResult = await client.query(`DELETE FROM hourly_payout`);
        console.log(`   ✓ Deleted ${hourlyResult.rowCount} hourly payout records`);

        console.log('\n✅ Cleanup complete!');
        console.log('📤 Database is clean. Re-upload Excel files to import fresh commission data.');

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

cleanAllCommissions();

