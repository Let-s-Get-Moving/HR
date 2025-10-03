#!/usr/bin/env node
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function check() {
  console.log('🔍 Checking all commission and timecard tables...\n');
  
  try {
    const tables = [
      { name: 'hourly_payout', description: 'Hourly Payout Data' },
      { name: 'employee_commission_monthly', description: 'Monthly Commission Data' },
      { name: 'agent_commission_us', description: 'Agent US Commission Data' },
      { name: 'timecards', description: 'Timecard Records' },
      { name: 'timecard_entries', description: 'Timecard Entry Details' }
    ];

    console.log('📊 Row Counts:\n');
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table.name}`);
        const count = result.rows[0].count;
        const icon = count === '0' ? '❌' : '✅';
        console.log(`   ${icon} ${table.description.padEnd(30)} ${count.padStart(8)} rows`);
      } catch (e) {
        console.log(`   ❌ ${table.description.padEnd(30)} [TABLE NOT FOUND]`);
      }
    }

    // Check for recent uploads
    console.log('\n📅 Recent Data Activity:\n');
    
    try {
      const recent = await pool.query(`
        SELECT 
          'hourly_payout' as table_name,
          MAX(created_at) as last_insert
        FROM hourly_payout
        UNION ALL
        SELECT 
          'employee_commission_monthly',
          MAX(created_at)
        FROM employee_commission_monthly
        UNION ALL
        SELECT 
          'agent_commission_us',
          MAX(created_at)
        FROM agent_commission_us
        UNION ALL
        SELECT 
          'timecards',
          MAX(created_at)
        FROM timecards
        ORDER BY last_insert DESC NULLS LAST
      `);
      
      recent.rows.forEach(row => {
        const date = row.last_insert ? new Date(row.last_insert).toLocaleString() : 'Never';
        console.log(`   ${row.table_name.padEnd(30)} ${date}`);
      });
    } catch (e) {
      console.log('   (Could not check recent activity)');
    }

  } catch (e) {
    console.error('\n❌ Error:', e.message);
  } finally {
    await pool.end();
  }
}

check();

