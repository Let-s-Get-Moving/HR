const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

/**
 * Calculate 4-week period dates based on payday date
 * Given a payday (Friday), calculate the 4-week work period and both paydays
 */
function calculatePeriodFromPayday(paydayDate) {
  const payday2 = new Date(paydayDate);
  
  // Period 2 ends 5 days before payday 2 (Sunday before Friday payday)
  const period2End = new Date(payday2);
  period2End.setDate(payday2.getDate() - 5);
  
  // Period 2 starts 13 days before it ends (Monday, 2 weeks before)
  const period2Start = new Date(period2End);
  period2Start.setDate(period2End.getDate() - 13);
  
  // Payday 1 is 14 days before payday 2
  const payday1 = new Date(payday2);
  payday1.setDate(payday2.getDate() - 14);
  
  // Period 1 ends 5 days before payday 1
  const period1End = new Date(payday1);
  period1End.setDate(payday1.getDate() - 5);
  
  // Period 1 starts 13 days before it ends
  const periodStart = new Date(period1End);
  periodStart.setDate(period1End.getDate() - 13);
  
  // Period ends when period 2 ends
  const periodEnd = period2End;
  
  const formatDate = (d) => d.toISOString().split('T')[0];
  
  return {
    period_start: formatDate(periodStart),
    period_end: formatDate(periodEnd),
    payday_1: formatDate(payday1),
    payday_2: formatDate(payday2)
  };
}

/**
 * Map period_month (YYYY-MM-01) to the second payday of that month
 * Based on the payday schedule: Jun 6, Jun 20, Jul 4, Jul 18, Aug 1, Aug 15, Aug 29, Sep 12, Sep 26, Oct 10
 */
function getPaydayForPeriod(periodMonth) {
  // Extract year and month from period_month (can be Date object or string)
  const date = periodMonth instanceof Date ? periodMonth : new Date(periodMonth);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // 1-12
  
  // Map months to their second payday (the 4-week period is named after where it ends)
  const paydayMap = {
    '2025-05': '2025-06-06',  // May period ends with Jun 6 payday (May 19-Jun 1 & Jun 2-Jun 15 -> Jun 6 & Jun 20)
    '2025-06': '2025-06-20',  // June period ends with Jun 20 payday
    '2025-07': '2025-07-18',  // July period ends with Jul 18 payday
    '2025-08': '2025-08-29',  // August period ends with Aug 29 payday
    '2025-09': '2025-09-26',  // September period ends with Sep 26 payday
    '2025-10': '2025-10-24',  // October period ends with Oct 24 payday
    '2025-11': '2025-11-21',  // November period ends with Nov 21 payday
    '2025-12': '2025-12-19',  // December period ends with Dec 19 payday
  };
  
  const key = `${year}-${month.toString().padStart(2, '0')}`;
  return paydayMap[key] || null;
}

async function migrateExistingCommissionData() {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('MIGRATING EXISTING COMMISSION DATA');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Get all unique period_months from each table
    console.log('📊 Finding existing periods in commission tables...\n');
    
    const [monthlyPeriods, agentPeriods, hourlyPeriods] = await Promise.all([
      pool.query('SELECT DISTINCT period_month FROM employee_commission_monthly WHERE period_month IS NOT NULL ORDER BY period_month'),
      pool.query('SELECT DISTINCT period_month FROM agent_commission_us WHERE period_month IS NOT NULL ORDER BY period_month'),
      pool.query('SELECT DISTINCT period_month FROM hourly_payout WHERE period_month IS NOT NULL ORDER BY period_month')
    ]);
    
    console.log(`Found periods:`);
    console.log(`  - employee_commission_monthly: ${monthlyPeriods.rows.length} periods`);
    console.log(`  - agent_commission_us: ${agentPeriods.rows.length} periods`);
    console.log(`  - hourly_payout: ${hourlyPeriods.rows.length} periods\n`);
    
    // Combine all unique periods
    const allPeriods = new Set([
      ...monthlyPeriods.rows.map(r => r.period_month),
      ...agentPeriods.rows.map(r => r.period_month),
      ...hourlyPeriods.rows.map(r => r.period_month)
    ]);
    
    console.log(`Total unique periods to migrate: ${allPeriods.size}\n`);
    
    for (const periodMonth of allPeriods) {
      const periodStr = typeof periodMonth === 'string' ? periodMonth : periodMonth.toISOString().split('T')[0];
      
      console.log(`\n───────────────────────────────────────────────────────────`);
      console.log(`Processing period: ${periodStr}`);
      
      // Calculate period dates based on the second payday
      const payday2 = getPaydayForPeriod(periodStr);
      
      if (!payday2) {
        console.log(`⚠️  No payday mapping for ${periodStr}, skipping...`);
        continue;
      }
      
      const periodInfo = calculatePeriodFromPayday(payday2);
      
      console.log(`Calculated dates:`);
      console.log(`  Period: ${periodInfo.period_start} to ${periodInfo.period_end}`);
      console.log(`  Payday 1: ${periodInfo.payday_1}`);
      console.log(`  Payday 2: ${periodInfo.payday_2}`);
      
      // Update each table
      const [monthlyResult, agentResult, hourlyResult] = await Promise.all([
        pool.query(`
          UPDATE employee_commission_monthly
          SET period_start = $1,
              period_end = $2,
              payday_1 = $3,
              payday_2 = $4
          WHERE period_month = $5
            AND period_start IS NULL
        `, [periodInfo.period_start, periodInfo.period_end, periodInfo.payday_1, periodInfo.payday_2, periodStr]),
        
        pool.query(`
          UPDATE agent_commission_us
          SET period_start = $1,
              period_end = $2,
              payday_1 = $3,
              payday_2 = $4
          WHERE period_month = $5
            AND period_start IS NULL
        `, [periodInfo.period_start, periodInfo.period_end, periodInfo.payday_1, periodInfo.payday_2, periodStr]),
        
        pool.query(`
          UPDATE hourly_payout
          SET period_start = $1,
              period_end = $2,
              payday_1 = $3,
              payday_2 = $4
          WHERE period_month = $5
            AND period_start IS NULL
        `, [periodInfo.period_start, periodInfo.period_end, periodInfo.payday_1, periodInfo.payday_2, periodStr])
      ]);
      
      console.log(`Updated records:`);
      console.log(`  - employee_commission_monthly: ${monthlyResult.rowCount}`);
      console.log(`  - agent_commission_us: ${agentResult.rowCount}`);
      console.log(`  - hourly_payout: ${hourlyResult.rowCount}`);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

migrateExistingCommissionData();

