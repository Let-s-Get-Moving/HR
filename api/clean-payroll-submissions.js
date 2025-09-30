import pkg from 'pg';
const { Pool } = pkg;

async function cleanPayrollSubmissions() {
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

        // Check current payroll submission count
        console.log('\n📊 Current database status:');
        const submissionCount = await client.query(`SELECT COUNT(*) FROM payroll_submissions`);
        const calculationCount = await client.query(`SELECT COUNT(*) FROM payroll_calculations`);

        console.log(`  - Payroll submissions: ${submissionCount.rows[0].count}`);
        console.log(`  - Payroll calculations: ${calculationCount.rows[0].count}`);

        // List all submissions
        const submissions = await client.query(`
            SELECT id, period_name, submission_date, status
            FROM payroll_submissions
            ORDER BY submission_date DESC
        `);

        console.log('\n📋 Current payroll submissions:');
        submissions.rows.forEach(sub => {
            console.log(`  - ID ${sub.id}: ${sub.period_name} (${sub.submission_date.toLocaleDateString()}) - ${sub.status}`);
        });

        console.log('\n⚠️  WARNING: This will DELETE ALL payroll submissions and calculations!');
        console.log('⚠️  This action CANNOT be undone!');
        
        // Delete all payroll data
        console.log('\n🗑️  Deleting all payroll submissions and calculations...');

        // First delete calculations (foreign key constraint)
        const calcResult = await client.query(`DELETE FROM payroll_calculations`);
        console.log(`   ✓ Deleted ${calcResult.rowCount} payroll calculations`);
        
        // Then delete submissions
        const subResult = await client.query(`DELETE FROM payroll_submissions`);
        console.log(`   ✓ Deleted ${subResult.rowCount} payroll submissions`);

        console.log('\n✅ Cleanup complete!');
        console.log('📤 Database is now clean. Import real payroll data via the Payroll page.');

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

cleanPayrollSubmissions();

