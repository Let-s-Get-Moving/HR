import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verifyCommissions() {
    const client = await pool.connect();
    
    try {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🔍 COMMISSION TABLES VERIFICATION');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        // Check hourly_payout schema
        console.log('📋 HOURLY_PAYOUT TABLE SCHEMA:');
        const schema = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'hourly_payout'
            ORDER BY ordinal_position
        `);
        schema.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
        const count = await client.query('SELECT COUNT(*) FROM hourly_payout');
        console.log(`\n💰 Total records in hourly_payout: ${count.rows[0].count}`);
        
        if (count.rows[0].count === '0') {
            console.log('\n⚠️ DIAGNOSIS:');
            console.log('   The hourly_payout table was wiped by migration 038_rebuild_hourly_payout_table.sql');
            console.log('   This migration dropped and recreated the table with a new schema.');
            console.log('   All previous hourly payout data was lost.');
            console.log('\n✅ SOLUTION:');
            console.log('   Re-upload the commission spreadsheet to populate the table.');
        }
        
        // Check other commission tables for comparison
        const monthly = await client.query('SELECT COUNT(*) FROM employee_commission_monthly');
        const agents = await client.query('SELECT COUNT(*) FROM agent_commission_us');
        
        console.log(`\n📊 OTHER COMMISSION TABLES:`);
        console.log(`   - employee_commission_monthly: ${monthly.rows[0].count} records`);
        console.log(`   - agent_commission_us: ${agents.rows[0].count} records`);
        
        console.log('\n═══════════════════════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyCommissions().catch(console.error);

