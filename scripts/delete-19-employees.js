const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

// IDs to delete (357-376, excluding 373 which doesn't exist)
const idsToDelete = [357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 374, 375, 376];

async function deleteEmployees() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`🗑️  Deleting 19 terminated employees...\n`);
    
    let totalEntriesDeleted = 0;
    let totalTimecardsDeleted = 0;
    let totalEmployeesDeleted = 0;
    
    for (const id of idsToDelete) {
      // Get employee name first
      const empResult = await client.query('SELECT first_name, last_name FROM employees WHERE id = $1', [id]);
      if (empResult.rows.length === 0) {
        console.log(`   ⚠️  Employee ID ${id} not found, skipping...`);
        continue;
      }
      
      const name = `${empResult.rows[0].first_name} ${empResult.rows[0].last_name}`;
      console.log(`\n📋 Deleting: ID ${id} - ${name}`);
      
      // 1. Delete timecard_entries
      const entriesResult = await client.query(
        'DELETE FROM timecard_entries WHERE employee_id = $1 RETURNING id',
        [id]
      );
      const entriesCount = entriesResult.rows.length;
      totalEntriesDeleted += entriesCount;
      console.log(`   ✓ Deleted ${entriesCount} timecard entries`);
      
      // 2. Delete timecards
      const timecardsResult = await client.query(
        'DELETE FROM timecards WHERE employee_id = $1 RETURNING id',
        [id]
      );
      const timecardsCount = timecardsResult.rows.length;
      totalTimecardsDeleted += timecardsCount;
      console.log(`   ✓ Deleted ${timecardsCount} timecards`);
      
      // 3. Delete employee
      await client.query('DELETE FROM employees WHERE id = $1', [id]);
      totalEmployeesDeleted++;
      console.log(`   ✓ Deleted employee record`);
    }
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ DELETION COMPLETE!');
    console.log('='.repeat(50));
    console.log(`📊 Summary:`);
    console.log(`   - Employees deleted: ${totalEmployeesDeleted}`);
    console.log(`   - Timecards deleted: ${totalTimecardsDeleted}`);
    console.log(`   - Timecard entries deleted: ${totalEntriesDeleted}`);
    console.log('');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during deletion:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

deleteEmployees();

