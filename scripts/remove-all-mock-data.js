#!/usr/bin/env node

/**
 * Comprehensive Mock Data Cleanup Script
 * 
 * This script removes ALL employee records and related data from the database.
 * WARNING: This is destructive and cannot be undone!
 * 
 * Usage: cd scripts && node remove-all-mock-data.js
 */

import pkg from 'pg';
const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('   Set it with: export DATABASE_URL="your-database-url"');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function removeAllMockData() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Starting comprehensive mock data cleanup...\n');
    
    await client.query('BEGIN');
    
    // Get current counts
    console.log('📊 Current database status:');
    const tables = [
      'employees',
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
      'performance_goals',
      'documents',
      'training_records',
      'bonuses',
      'agent_commission_us',
      'employee_commission_monthly',
      'hourly_payout',
      'termination_details',
      'applications',
      'job_postings',
      'alerts'
    ];
    
    const counts = {};
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        counts[table] = parseInt(result.rows[0].count);
        console.log(`   ${table}: ${counts[table]} records`);
      } catch (err) {
        counts[table] = 0;
        console.log(`   ${table}: (table doesn't exist or error)`);
      }
    }
    
    console.log('\n⚠️  WARNING: This will DELETE ALL data from the tables above!');
    console.log('⚠️  This action CANNOT be undone!\n');
    console.log('🔥 Starting deletion in 3 seconds...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Delete data in order to respect foreign key constraints
    console.log('🗑️  Deleting data...\n');
    
    // 1. Delete alerts
    if (counts.alerts > 0) {
      console.log('   → Deleting alerts...');
      await client.query('DELETE FROM alerts');
    }
    
    // 2. Delete applications
    if (counts.applications > 0) {
      console.log('   → Deleting job applications...');
      await client.query('DELETE FROM applications');
    }
    
    // 3. Delete job postings
    if (counts.job_postings > 0) {
      console.log('   → Deleting job postings...');
      await client.query('DELETE FROM job_postings');
    }
    
    // 4. Delete training records
    if (counts.training_records > 0) {
      console.log('   → Deleting training records...');
      await client.query('DELETE FROM training_records');
    }
    
    // 5. Delete documents
    if (counts.documents > 0) {
      console.log('   → Deleting documents...');
      await client.query('DELETE FROM documents');
    }
    
    // 6. Delete performance goals
    if (counts.performance_goals > 0) {
      console.log('   → Deleting performance goals...');
      await client.query('DELETE FROM performance_goals');
    }
    
    // 7. Delete performance reviews
    if (counts.performance_reviews > 0) {
      console.log('   → Deleting performance reviews...');
      await client.query('DELETE FROM performance_reviews');
    }
    
    // 8. Delete leave requests
    if (counts.leave_requests > 0) {
      console.log('   → Deleting leave requests...');
      await client.query('DELETE FROM leave_requests');
    }
    
    // 9. Delete commission and payout data
    if (counts.employee_commission_monthly > 0) {
      console.log('   → Deleting monthly commissions...');
      await client.query('DELETE FROM employee_commission_monthly');
    }
    
    if (counts.agent_commission_us > 0) {
      console.log('   → Deleting agent US commissions...');
      await client.query('DELETE FROM agent_commission_us');
    }
    
    if (counts.hourly_payout > 0) {
      console.log('   → Deleting hourly payouts...');
      await client.query('DELETE FROM hourly_payout');
    }
    
    if (counts.bonuses > 0) {
      console.log('   → Deleting bonuses...');
      await client.query('DELETE FROM bonuses');
    }
    
    // 10. Delete termination details
    if (counts.termination_details > 0) {
      console.log('   → Deleting termination details...');
      await client.query('DELETE FROM termination_details');
    }
    
    // 11. Delete employee status history
    if (counts.employee_status_history > 0) {
      console.log('   → Deleting employee status history...');
      await client.query('DELETE FROM employee_status_history');
    }
    
    // 12. Delete employee compensation
    if (counts.employee_compensation > 0) {
      console.log('   → Deleting employee compensation...');
      await client.query('DELETE FROM employee_compensation');
    }
    
    // 13. Delete employee identifiers
    if (counts.employee_identifiers > 0) {
      console.log('   → Deleting employee identifiers...');
      await client.query('DELETE FROM employee_identifiers');
    }
    
    // 14. Delete employee emergency contacts
    if (counts.employee_emergency_contacts > 0) {
      console.log('   → Deleting employee emergency contacts...');
      await client.query('DELETE FROM employee_emergency_contacts');
    }
    
    // 15. Delete employee bank accounts
    if (counts.employee_bank_accounts > 0) {
      console.log('   → Deleting employee bank accounts...');
      await client.query('DELETE FROM employee_bank_accounts');
    }
    
    // 16. Delete employee addresses
    if (counts.employee_addresses > 0) {
      console.log('   → Deleting employee addresses...');
      await client.query('DELETE FROM employee_addresses');
    }
    
    // 17. Delete payroll calculations
    if (counts.payroll_calculations > 0) {
      console.log('   → Deleting payroll calculations...');
      await client.query('DELETE FROM payroll_calculations');
    }
    
    // 18. Delete timecard entries
    if (counts.timecard_entries > 0) {
      console.log('   → Deleting timecard entries...');
      await client.query('DELETE FROM timecard_entries');
    }
    
    // 19. Delete timecards
    if (counts.timecards > 0) {
      console.log('   → Deleting timecards...');
      await client.query('DELETE FROM timecards');
    }
    
    // 20. Delete time entries
    if (counts.time_entries > 0) {
      console.log('   → Deleting time entries...');
      await client.query('DELETE FROM time_entries');
    }
    
    // 21. Finally, delete all employees (this will cascade to any remaining related tables)
    if (counts.employees > 0) {
      console.log('   → Deleting all employees...');
      const result = await client.query('DELETE FROM employees');
      console.log(`   ✅ Deleted ${result.rowCount} employees`);
    }
    
    // Reset sequences
    console.log('\n🔄 Resetting ID sequences...');
    await client.query('ALTER SEQUENCE IF EXISTS employees_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS time_entries_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS leave_requests_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS performance_reviews_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS performance_goals_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS documents_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS job_postings_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS applications_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS alerts_id_seq RESTART WITH 1');
    console.log('   ✅ Sequences reset');
    
    await client.query('COMMIT');
    
    console.log('\n✅ Mock data cleanup complete!');
    console.log('💡 Database is now clean and ready for real data');
    console.log('\n📊 Summary:');
    console.log(`   Employees deleted: ${counts.employees}`);
    console.log(`   Time entries deleted: ${counts.time_entries}`);
    console.log(`   Leave requests deleted: ${counts.leave_requests}`);
    console.log(`   Performance reviews deleted: ${counts.performance_reviews}`);
    console.log(`   Documents deleted: ${counts.documents}`);
    console.log(`   All related data cascaded/deleted`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error removing mock data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the cleanup
removeAllMockData()
  .then(() => {
    console.log('\n🎉 Done! Database is clean.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error.message);
    process.exit(1);
  });

