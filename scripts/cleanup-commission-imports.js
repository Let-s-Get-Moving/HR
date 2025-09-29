#!/usr/bin/env node
/**
 * Cleanup script to delete commission import data
 * Use this to clear out bad imports before re-importing
 */

import pkg from 'pg';
const { Client } = pkg;

async function cleanupCommissions() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected!');

        // Ask for confirmation
        console.log('\n⚠️  WARNING: This will delete ALL commission import data!');
        console.log('\nData to be deleted:');
        
        const counts = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM employee_commission_monthly) as main_count,
                (SELECT COUNT(*) FROM agent_commission_us) as agent_count,
                (SELECT COUNT(*) FROM hourly_payout) as hourly_count
        `);
        
        console.log(`  - Main Commission: ${counts.rows[0].main_count} records`);
        console.log(`  - Agent US: ${counts.rows[0].agent_count} records`);
        console.log(`  - Hourly Payout: ${counts.rows[0].hourly_count} records`);
        
        console.log('\n🗑️  Deleting commission data...');
        
        await client.query('BEGIN');
        
        await client.query('DELETE FROM hourly_payout');
        console.log('  ✅ Deleted hourly payout data');
        
        await client.query('DELETE FROM agent_commission_us');
        console.log('  ✅ Deleted agent US commission data');
        
        await client.query('DELETE FROM employee_commission_monthly');
        console.log('  ✅ Deleted main commission data');
        
        await client.query('COMMIT');
        
        console.log('\n✅ All commission data cleaned up!');
        console.log('\nYou can now re-import your Excel file.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Cleanup failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

cleanupCommissions();
