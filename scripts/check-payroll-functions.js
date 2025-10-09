import pg from 'pg';

const connectionString = 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4';

async function checkFunctions() {
  const client = new pg.Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected\n');

    // Check if function exists
    const { rows } = await client.query(`
      SELECT proname, pronargs 
      FROM pg_proc 
      WHERE proname IN ('get_next_pay_period', 'get_current_pay_period', 'auto_create_payroll_from_timecards')
    `);

    console.log('📋 Functions found:');
    rows.forEach(r => console.log(`  - ${r.proname}(${r.pronargs} args)`));

    if (rows.length === 0) {
      console.log('\n❌ No payroll functions found!');
    } else {
      console.log('\n✅ Functions exist');
      
      // Try to execute the function
      console.log('\n🧪 Testing get_next_pay_period()...');
      try {
        const result = await client.query('SELECT * FROM get_next_pay_period()');
        console.log('✅ Result:', result.rows[0]);
      } catch (err) {
        console.log('❌ Error:', err.message);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkFunctions();
