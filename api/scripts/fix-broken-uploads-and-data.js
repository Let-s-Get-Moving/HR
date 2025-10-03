#!/usr/bin/env node
/**
 * Fix broken upload records and verify data integrity
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function fix() {
  console.log('🔧 Fixing broken uploads and data...\n');
  
  try {
    // Step 1: Find broken uploads (processed but no data)
    console.log('📋 Step 1: Finding broken uploads...');
    
    const brokenUploads = await pool.query(`
      SELECT tu.id, tu.filename, tu.employee_count, tu.status,
             COUNT(t.id) as actual_timecards
      FROM timecard_uploads tu
      LEFT JOIN timecards t ON t.upload_id = tu.id
      WHERE tu.status = 'processed'
      GROUP BY tu.id, tu.filename, tu.employee_count, tu.status
      HAVING COUNT(t.id) = 0
    `);
    
    if (brokenUploads.rows.length > 0) {
      console.log(`\n❌ Found ${brokenUploads.rows.length} broken uploads:`);
      brokenUploads.rows.forEach(row => {
        console.log(`   Upload #${row.id}: ${row.filename}`);
        console.log(`      Expected: ${row.expected_employees} employees`);
        console.log(`      Found: 0 timecards`);
      });
      
      console.log('\n🗑️  Deleting broken uploads...');
      for (const upload of brokenUploads.rows) {
        await pool.query('DELETE FROM timecard_uploads WHERE id = $1', [upload.id]);
        console.log(`   ✅ Deleted upload #${upload.id}`);
      }
    } else {
      console.log('✅ No broken uploads found');
    }
    
    // Step 2: Fix total_hours in timecard_uploads if missing
    console.log('\n📋 Step 2: Updating total_hours for uploads...');
    
    const uploadsToFix = await pool.query(`
      SELECT tu.id, SUM(t.total_hours) as calculated_hours
      FROM timecard_uploads tu
      JOIN timecards t ON t.upload_id = tu.id
      WHERE tu.status = 'processed'
      GROUP BY tu.id
    `);
    
    for (const upload of uploadsToFix.rows) {
      await pool.query(
        'UPDATE timecard_uploads SET total_hours = $1 WHERE id = $2',
        [upload.calculated_hours, upload.id]
      );
      console.log(`   ✅ Updated upload #${upload.id}: ${upload.calculated_hours} hours`);
    }
    
    // Step 3: Verify data integrity
    console.log('\n📋 Step 3: Verifying data integrity...');
    
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM timecard_uploads WHERE status = 'processed') as uploads,
        (SELECT COUNT(*) FROM timecards) as timecards,
        (SELECT COUNT(*) FROM timecard_entries) as entries
    `);
    
    console.log('\n📊 Current Database State:');
    console.log(`   Processed uploads: ${stats.rows[0].uploads}`);
    console.log(`   Timecards: ${stats.rows[0].timecards}`);
    console.log(`   Entries: ${stats.rows[0].entries}`);
    
    if (stats.rows[0].uploads > 0 && stats.rows[0].timecards === '0') {
      console.error('\n❌ CRITICAL: Uploads exist but no timecards!');
      console.error('   You need to re-upload your files.');
    } else if (stats.rows[0].timecards > 0) {
      console.log('\n✅ Data looks good!');
    }
    
    // Step 4: Check commission data too
    console.log('\n📋 Step 4: Checking commission data...');
    
    const commissions = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM employee_commission_monthly) as monthly,
        (SELECT COUNT(*) FROM agent_commission_us) as agents,
        (SELECT COUNT(*) FROM hourly_payout) as hourly
    `);
    
    console.log('\n📊 Commission Data:');
    console.log(`   Monthly commissions: ${commissions.rows[0].monthly}`);
    console.log(`   Agent US commissions: ${commissions.rows[0].agents}`);
    console.log(`   Hourly payouts: ${commissions.rows[0].hourly}`);
    
    if (commissions.rows[0].hourly === '0') {
      console.warn('\n⚠️  No hourly payout data found.');
      console.warn('   If your commission file has hourly data, re-upload it.');
    }
    
  } catch (e) {
    console.error('\n❌ Error:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
}

fix();

