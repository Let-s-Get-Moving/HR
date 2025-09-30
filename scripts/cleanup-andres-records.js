import pkg from 'pg';
const { Pool } = pkg;

async function cleanupAndresRecords() {
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

        // Find all employees named "andres" (case-insensitive)
        console.log('\n🔍 Finding employees with "andres" in their name...');
        const employeeResult = await client.query(`
            SELECT id, first_name, last_name, email, role_title
            FROM employees
            WHERE LOWER(first_name) LIKE '%andres%' OR LOWER(last_name) LIKE '%andres%'
            ORDER BY first_name, last_name
        `);

        console.log(`\n📋 Found ${employeeResult.rows.length} employees:`);
        employeeResult.rows.forEach(emp => {
            console.log(`  - ID ${emp.id}: "${emp.first_name} ${emp.last_name}" (${emp.email})`);
        });

        // Delete commission data for period 2025-07-01 for all "andres" variations
        console.log('\n🗑️  Deleting commission data for July 2025...');
        
        const monthlyResult = await client.query(`
            DELETE FROM employee_commission_monthly
            WHERE period_month = '2025-07-01'
            AND employee_id IN (
                SELECT id FROM employees
                WHERE LOWER(first_name) LIKE '%andres%' OR LOWER(last_name) LIKE '%andres%'
            )
        `);
        console.log(`   ✓ Deleted ${monthlyResult.rowCount} monthly commission records`);

        const agentResult = await client.query(`
            DELETE FROM agent_commission_us
            WHERE period_month = '2025-07-01'
            AND employee_id IN (
                SELECT id FROM employees
                WHERE LOWER(first_name) LIKE '%andres%' OR LOWER(last_name) LIKE '%andres%'
            )
        `);
        console.log(`   ✓ Deleted ${agentResult.rowCount} agent US commission records`);

        const hourlyResult = await client.query(`
            DELETE FROM hourly_payout
            WHERE period_month = '2025-07-01'
            AND employee_id IN (
                SELECT id FROM employees
                WHERE LOWER(first_name) LIKE '%andres%' OR LOWER(last_name) LIKE '%andres%'
            )
        `);
        console.log(`   ✓ Deleted ${hourlyResult.rowCount} hourly payout records`);

        console.log('\n✅ Cleanup complete! Re-import the Excel file to restore correct data.');

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

cleanupAndresRecords();
