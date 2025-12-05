import pkg from 'pg';
const { Pool } = pkg;

async function deleteAllLeaveRequests() {
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

        // Check current leave request count
        console.log('\n📊 Current database status:');
        const countResult = await client.query(`SELECT COUNT(*) FROM leave_requests`);
        const currentCount = countResult.rows[0].count;
        console.log(`  - Leave requests: ${currentCount}`);

        if (currentCount === '0') {
            console.log('\n✅ No leave requests to delete. Database is already clean.');
            return;
        }

        console.log('\n⚠️  WARNING: This will DELETE ALL leave requests!');
        console.log('⚠️  This action CANNOT be undone!');
        
        // Delete all leave requests
        console.log('\n🗑️  Deleting all leave requests...');
        const deleteResult = await client.query(`DELETE FROM leave_requests`);
        
        console.log(`\n✅ Cleanup complete!`);
        console.log(`   - Deleted ${deleteResult.rowCount} leave request(s)`);
        console.log('\n📤 All leave request data has been removed from the database.');

    } catch (error) {
        console.error('❌ Deletion failed:', error);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

deleteAllLeaveRequests();

