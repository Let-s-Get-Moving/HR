/**
 * Clean ALL employees from the database
 * WARNING: This is destructive and will cascade delete all related data
 * 
 * Run from API directory: cd api && node ../scripts/clean-all-employees.js
 */

import { pool } from '../api/src/db.js';

async function cleanAllEmployees() {
    const client = await pool.connect();
    
    try {
        console.log('🗑️  Starting employee cleanup...');
        
        await client.query('BEGIN');
        
        // Get count before deletion
        const beforeCount = await client.query('SELECT COUNT(*) FROM employees');
        console.log(`📊 Current employee count: ${beforeCount.rows[0].count}`);
        
        // Delete all employees (this will cascade to all related tables)
        console.log('🔥 Deleting all employees...');
        const deleteResult = await client.query('DELETE FROM employees');
        console.log(`✅ Deleted ${deleteResult.rowCount} employees`);
        
        // Reset the auto-increment sequence
        console.log('🔄 Resetting employee ID sequence...');
        await client.query('ALTER SEQUENCE employees_id_seq RESTART WITH 1');
        console.log('✅ Sequence reset to 1');
        
        // Show what was affected (cascade deletes)
        const tables = [
            'time_entries',
            'timecard_entries',
            'timecards',
            'payroll_calculations',
            'employee_addresses',
            'employee_bank_accounts',
            'employee_emergency_contacts',
            'employee_identifiers',
            'employee_compensation',
            'employee_status_history',
            'leave_requests',
            'performance_reviews',
            'documents',
            'training_records',
            'bonuses',
            'agent_commission',
            'employee_commission_monthly',
            'hourly_payout',
            'termination_details'
        ];
        
        console.log('\n📋 Checking cascade deletions:');
        for (const table of tables) {
            try {
                const count = await client.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`   ${table}: ${count.rows[0].count} records remaining`);
            } catch (err) {
                console.log(`   ${table}: (table doesn't exist or error)`);
            }
        }
        
        await client.query('COMMIT');
        
        console.log('\n✅ Employee cleanup complete!');
        console.log('💡 Database is now empty and ready for fresh timecard imports');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error cleaning employees:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the cleanup
cleanAllEmployees()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Failed:', error.message);
        process.exit(1);
    });

