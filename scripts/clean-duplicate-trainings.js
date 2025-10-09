const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function cleanDuplicateTrainings() {
  const client = await pool.connect();
  
  try {
    console.log('\n🧹 Cleaning duplicate training records...\n');
    
    // Check current state
    const before = await client.query('SELECT COUNT(*) as count FROM trainings');
    console.log(`📊 Total training records BEFORE: ${before.rows[0].count}`);
    
    // Find duplicates
    const duplicates = await client.query(`
      SELECT name, mandatory, validity_months, COUNT(*) as count
      FROM trainings
      GROUP BY name, mandatory, validity_months
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `);
    
    console.log(`\n❌ Found ${duplicates.rows.length} duplicate training types:\n`);
    duplicates.rows.forEach(d => {
      console.log(`  • ${d.name}: ${d.count} duplicates`);
    });
    
    await client.query('BEGIN');
    
    // For each set of duplicates, keep only the one with the lowest ID
    for (const dup of duplicates.rows) {
      // Find all IDs for this training
      const ids = await client.query(`
        SELECT id 
        FROM trainings 
        WHERE name = $1 AND mandatory = $2 AND validity_months = $3
        ORDER BY id
      `, [dup.name, dup.mandatory, dup.validity_months]);
      
      const keepId = ids.rows[0].id;
      const deleteIds = ids.rows.slice(1).map(r => r.id);
      
      if (deleteIds.length > 0) {
        console.log(`\n🔄 Processing "${dup.name}":`);
        console.log(`   Keeping ID ${keepId}, deleting ${deleteIds.length} duplicates`);
        
        // Update any training_records that reference the duplicates
        const updateResult = await client.query(`
          UPDATE training_records 
          SET training_id = $1 
          WHERE training_id = ANY($2::int[])
        `, [keepId, deleteIds]);
        
        if (updateResult.rowCount > 0) {
          console.log(`   ✅ Updated ${updateResult.rowCount} training_records references`);
        }
        
        // Delete the duplicates
        const deleteResult = await client.query(`
          DELETE FROM trainings 
          WHERE id = ANY($1::int[])
        `, [deleteIds]);
        
        console.log(`   ✅ Deleted ${deleteResult.rowCount} duplicate records`);
      }
    }
    
    await client.query('COMMIT');
    
    // Check final state
    const after = await client.query('SELECT COUNT(*) as count FROM trainings');
    const unique = await client.query(`
      SELECT name, mandatory, validity_months 
      FROM trainings 
      ORDER BY name
    `);
    
    console.log(`\n\n═══════════════════════════════════════`);
    console.log(`📊 CLEANUP RESULTS:`);
    console.log(`═══════════════════════════════════════`);
    console.log(`Before: ${before.rows[0].count} records`);
    console.log(`After:  ${after.rows[0].count} records`);
    console.log(`Removed: ${before.rows[0].count - after.rows[0].count} duplicates`);
    
    console.log(`\n✅ Remaining unique trainings:\n`);
    unique.rows.forEach(t => {
      console.log(`   • ${t.name} (mandatory: ${t.mandatory}, valid for: ${t.validity_months} months)`);
    });
    
    console.log(`\n✅ Training duplicates cleaned successfully!\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error cleaning trainings:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanDuplicateTrainings();

