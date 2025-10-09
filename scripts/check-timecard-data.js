import pg from 'pg';

const connectionString = 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4';

async function checkData() {
  const client = new pg.Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected\n');

    // Check employees
    const { rows: employees } = await client.query(`
      SELECT COUNT(*) as count, 
             COUNT(CASE WHEN hourly_rate > 0 THEN 1 END) as with_rate
      FROM employees 
      WHERE status = 'Active'
    `);
    console.log('👥 Employees:');
    console.log(`   Total Active: ${employees[0].count}`);
    console.log(`   With Hourly Rate: ${employees[0].with_rate}`);

    // Check timecards
    const { rows: timecards } = await client.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total_hours) as total_hours
      FROM timecards
      GROUP BY status
    `);
    console.log('\n⏰ Timecards:');
    timecards.forEach(t => {
      console.log(`   ${t.status}: ${t.count} timecards, ${parseFloat(t.total_hours || 0).toFixed(2)} hours`);
    });

    // Check if we can calculate payroll
    const { rows: payrollData } = await client.query(`
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.hourly_rate,
        COALESCE(SUM(t.total_hours), 0) as total_hours
      FROM employees e
      LEFT JOIN timecards t ON e.id = t.employee_id AND t.status = 'Approved'
      WHERE e.status = 'Active'
      GROUP BY e.id, e.first_name, e.last_name, e.hourly_rate
      HAVING COALESCE(SUM(t.total_hours), 0) > 0
      ORDER BY e.last_name
      LIMIT 5
    `);
    
    console.log('\n💰 Sample Payroll Data:');
    if (payrollData.length === 0) {
      console.log('   ❌ NO DATA - Need approved timecards!');
    } else {
      payrollData.forEach(p => {
        const pay = parseFloat(p.total_hours) * parseFloat(p.hourly_rate || 0);
        console.log(`   ${p.first_name} ${p.last_name}: ${parseFloat(p.total_hours).toFixed(2)} hrs @ $${parseFloat(p.hourly_rate || 0).toFixed(2)}/hr = $${pay.toFixed(2)}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkData();
