const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

const mergePairs = [
  { from: 3, to: 69, name: 'Avneet Sidhu' },
  { from: 4, to: 70, name: 'Simranjit Rikhra' },
  { from: 20, to: 97, name: 'Lawrence Wasin' },
  { from: 44, to: 96, name: 'Colin Christian' }
];

async function mergeEmployees() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Merging 4 terminated employees...\n');
    
    for (const pair of mergePairs) {
      console.log(`\n📋 Processing: ${pair.name} (ID ${pair.from} → ID ${pair.to})`);
      
      // 1. Move timecard_entries
      const entriesResult = await client.query(
        'UPDATE timecard_entries SET employee_id = $1 WHERE employee_id = $2 RETURNING id',
        [pair.to, pair.from]
      );
      console.log(`   ✓ Moved ${entriesResult.rows.length} timecard entries`);
      
      // 2. Move timecards
      const timecardsResult = await client.query(
        'UPDATE timecards SET employee_id = $1 WHERE employee_id = $2 RETURNING id',
        [pair.to, pair.from]
      );
      console.log(`   ✓ Moved ${timecardsResult.rows.length} timecards`);
      
      // 3. Update termination reason to proper format
      await client.query(
        "UPDATE employees SET termination_reason = $1 WHERE id = $2",
        [`Merged into ID ${pair.to}`, pair.from]
      );
      console.log(`   ✓ Updated termination reason`);
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ All 4 employees merged successfully!');
    console.log('✅ Timecards and entries moved to active employees');
    console.log('✅ Termination reasons updated to standard format\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during merge:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

mergeEmployees();

