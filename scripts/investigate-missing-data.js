/**
 * COMPREHENSIVE DATA INVESTIGATION
 * Check what data exists and what might be deleting it
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: {
    rejectUnauthorized: false
  }
});

async function investigate() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 COMPREHENSIVE DATA INVESTIGATION');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // 1. CHECK EMPLOYEES
    console.log('1️⃣  EMPLOYEES TABLE:');
    const employees = await client.query('SELECT COUNT(*) as count, status FROM employees GROUP BY status');
    console.log('   Total employees by status:');
    employees.rows.forEach(row => {
      console.log(`   - ${row.status}: ${row.count}`);
    });
    
    // 2. CHECK TIMECARD UPLOADS
    console.log('\n2️⃣  TIMECARD_UPLOADS TABLE:');
    const uploads = await client.query(`
      SELECT id, filename, pay_period_start, pay_period_end, employee_count, status, created_at
      FROM timecard_uploads
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log(`   Total uploads: ${uploads.rows.length}`);
    uploads.rows.forEach(row => {
      console.log(`   - Upload #${row.id}: ${row.filename}`);
      console.log(`     Period: ${row.pay_period_start} to ${row.pay_period_end}`);
      console.log(`     Employees: ${row.employee_count}, Status: ${row.status}`);
      console.log(`     Created: ${row.created_at}`);
    });
    
    // 3. CHECK TIMECARDS
    console.log('\n3️⃣  TIMECARDS TABLE:');
    const timecards = await client.query('SELECT COUNT(*) as count FROM timecards');
    console.log(`   Total timecards: ${timecards.rows[0].count}`);
    
    const timecardsByPeriod = await client.query(`
      SELECT pay_period_start, pay_period_end, COUNT(*) as count
      FROM timecards
      GROUP BY pay_period_start, pay_period_end
      ORDER BY pay_period_start DESC
    `);
    console.log('   Timecards by period:');
    timecardsByPeriod.rows.forEach(row => {
      console.log(`   - ${row.pay_period_start} to ${row.pay_period_end}: ${row.count} timecards`);
    });
    
    // 4. CHECK TIMECARD_ENTRIES
    console.log('\n4️⃣  TIMECARD_ENTRIES TABLE:');
    const entries = await client.query('SELECT COUNT(*) as count FROM timecard_entries');
    console.log(`   Total timecard entries: ${entries.rows[0].count}`);
    
    // 5. CHECK HOURLY_PAYOUT
    console.log('\n5️⃣  HOURLY_PAYOUT TABLE:');
    const hourlyPayout = await client.query('SELECT COUNT(*) as count FROM hourly_payout');
    console.log(`   Total hourly_payout records: ${hourlyPayout.rows[0].count}`);
    
    if (parseInt(hourlyPayout.rows[0].count) > 0) {
      const hourlyByPeriod = await client.query(`
        SELECT period_month, COUNT(*) as count, SUM(total_for_month) as total_amount
        FROM hourly_payout
        GROUP BY period_month
        ORDER BY period_month DESC
      `);
      console.log('   Hourly payouts by period:');
      hourlyByPeriod.rows.forEach(row => {
        console.log(`   - ${row.period_month}: ${row.count} records, Total: $${row.total_amount}`);
      });
    } else {
      console.log('   ⚠️  HOURLY_PAYOUT TABLE IS EMPTY!');
    }
    
    // 6. CHECK EMPLOYEE_COMMISSION_MONTHLY
    console.log('\n6️⃣  EMPLOYEE_COMMISSION_MONTHLY TABLE:');
    const commissions = await client.query('SELECT COUNT(*) as count FROM employee_commission_monthly');
    console.log(`   Total commission records: ${commissions.rows[0].count}`);
    
    if (parseInt(commissions.rows[0].count) > 0) {
      const commByPeriod = await client.query(`
        SELECT period_month, COUNT(*) as count
        FROM employee_commission_monthly
        GROUP BY period_month
        ORDER BY period_month DESC
        LIMIT 5
      `);
      console.log('   Commissions by period (recent 5):');
      commByPeriod.rows.forEach(row => {
        console.log(`   - ${row.period_month}: ${row.count} records`);
      });
    }
    
    // 7. CHECK AGENT_COMMISSION_US
    console.log('\n7️⃣  AGENT_COMMISSION_US TABLE:');
    const agentComm = await client.query('SELECT COUNT(*) as count FROM agent_commission_us');
    console.log(`   Total agent commission records: ${agentComm.rows[0].count}`);
    
    // 8. CHECK FOR RECENT DELETES (if audit log exists)
    console.log('\n8️⃣  CHECKING FOR RECENT CHANGES:');
    try {
      const recentChanges = await client.query(`
        SELECT table_name, COUNT(*) as record_count
        FROM (
          SELECT 'timecards' as table_name FROM timecards WHERE updated_at > NOW() - INTERVAL '1 hour'
          UNION ALL
          SELECT 'timecard_entries' FROM timecard_entries WHERE created_at > NOW() - INTERVAL '1 hour'
          UNION ALL
          SELECT 'hourly_payout' FROM hourly_payout WHERE updated_at > NOW() - INTERVAL '1 hour'
          UNION ALL
          SELECT 'employee_commission_monthly' FROM employee_commission_monthly WHERE updated_at > NOW() - INTERVAL '1 hour'
        ) recent
        GROUP BY table_name
      `);
      
      if (recentChanges.rows.length > 0) {
        console.log('   Recent changes (last hour):');
        recentChanges.rows.forEach(row => {
          console.log(`   - ${row.table_name}: ${row.record_count} records modified`);
        });
      } else {
        console.log('   No recent changes in last hour');
      }
    } catch (err) {
      console.log('   (Could not check recent changes)');
    }
    
    // 9. CHECK STATS QUERY (the one that's returning 0)
    console.log('\n9️⃣  TESTING STATS QUERY:');
    const statsQuery = await client.query(`
      SELECT 
        COUNT(DISTINCT tu.id) as total_uploads,
        COUNT(DISTINCT t.employee_id) as total_employees,
        COALESCE(SUM(te.work_time), 0) as total_hours,
        CASE 
          WHEN COUNT(DISTINCT t.employee_id) > 0 
          THEN COALESCE(SUM(te.work_time), 0) / COUNT(DISTINCT t.employee_id)
          ELSE 0 
        END as avg_hours_per_employee
      FROM timecard_uploads tu
      LEFT JOIN timecards t ON t.upload_id = tu.id
      LEFT JOIN timecard_entries te ON te.timecard_id = t.id
      WHERE tu.status = 'processed'
    `);
    console.log('   Stats query result:');
    console.log(`   - total_uploads: ${statsQuery.rows[0].total_uploads}`);
    console.log(`   - total_employees: ${statsQuery.rows[0].total_employees}`);
    console.log(`   - total_hours: ${statsQuery.rows[0].total_hours}`);
    console.log(`   - avg_hours_per_employee: ${statsQuery.rows[0].avg_hours_per_employee}`);
    
    // 10. CHECK IF TIMECARD_ENTRIES HAVE VALID timecard_id
    console.log('\n🔟  CHECKING DATA INTEGRITY:');
    const orphanedEntries = await client.query(`
      SELECT COUNT(*) as count
      FROM timecard_entries te
      LEFT JOIN timecards t ON t.id = te.timecard_id
      WHERE t.id IS NULL
    `);
    console.log(`   Orphaned timecard_entries (no matching timecard): ${orphanedEntries.rows[0].count}`);
    
    const orphanedTimecards = await client.query(`
      SELECT COUNT(*) as count
      FROM timecards t
      LEFT JOIN timecard_uploads tu ON tu.id = t.upload_id
      WHERE tu.id IS NULL
    `);
    console.log(`   Orphaned timecards (no matching upload): ${orphanedTimecards.rows[0].count}`);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Investigation complete!\n');
    
  } catch (error) {
    console.error('❌ Error during investigation:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

investigate()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });

