#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixTimeTrackingData() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing time tracking data...\n');

    // Clear existing time entries to start fresh
    await client.query('DELETE FROM time_entries');
    console.log('Cleared existing time entries');

    // Get all employees
    const employees = await client.query('SELECT id, first_name, last_name FROM employees ORDER BY id');
    console.log(`Found ${employees.rows.length} employees`);

    // Generate varied time entries for each employee over the last 30 days
    for (const emp of employees.rows) {
      console.log(`Adding time entries for ${emp.first_name} ${emp.last_name}...`);
      
      for (let i = 30; i >= 1; i--) {
        const workDate = new Date();
        workDate.setDate(workDate.getDate() - i);
        
        // Skip weekends
        if (workDate.getDay() === 0 || workDate.getDay() === 6) continue;
        
        // Vary the work patterns per employee
        const empId = emp.id;
        const baseStartHour = 8 + (empId % 3); // 8, 9, or 10 AM start
        const variation = Math.floor(Math.random() * 60); // 0-59 minutes variation
        
        const clockIn = new Date(workDate);
        clockIn.setHours(baseStartHour, variation);
        
        // Vary work duration (7.5 to 9.5 hours)
        const workHours = 7.5 + (Math.random() * 2);
        const clockOut = new Date(clockIn);
        clockOut.setTime(clockIn.getTime() + (workHours * 60 * 60 * 1000));
        
        const overtimeHours = Math.max(0, workHours - 8);
        const wasLate = clockIn.getHours() > 9 || (clockIn.getHours() === 9 && clockIn.getMinutes() > 15);
        const leftEarly = clockOut.getHours() < 17;
        
        await client.query(`
          INSERT INTO time_entries (
            employee_id, work_date, clock_in, clock_out, 
            was_late, left_early, overtime_hours
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          emp.id,
          workDate.toISOString().split('T')[0],
          clockIn,
          clockOut,
          wasLate,
          leftEarly,
          Math.round(overtimeHours * 100) / 100
        ]);
      }
    }

    // Check results
    const count = await client.query('SELECT COUNT(*) FROM time_entries');
    console.log(`\n✅ Created ${count.rows[0].count} varied time entries`);

    // Show sample data
    const sample = await client.query(`
      SELECT 
        e.first_name || ' ' || e.last_name as employee_name,
        te.work_date,
        te.clock_in::time as clock_in_time,
        te.clock_out::time as clock_out_time,
        ROUND(EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600, 2) as hours_worked,
        te.overtime_hours,
        CASE 
          WHEN te.was_late THEN 'Late'
          WHEN te.left_early THEN 'Early'
          ELSE 'On Time'
        END as status
      FROM time_entries te
      JOIN employees e ON te.employee_id = e.id
      ORDER BY e.id, te.work_date DESC
      LIMIT 10
    `);

    console.log('\n📋 Sample time entries:');
    sample.rows.forEach(row => {
      console.log(`${row.employee_name} | ${row.work_date} | ${row.clock_in_time}-${row.clock_out_time} | ${row.hours_worked}h | OT: ${row.overtime_hours} | ${row.status}`);
    });

  } catch (error) {
    console.error('❌ Error fixing time data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixTimeTrackingData();
