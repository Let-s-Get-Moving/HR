/**
 * Check trusted devices in database
 */

import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4",
  ssl: { rejectUnauthorized: false }
});

async function checkDevices() {
  try {
    console.log('🔍 Checking trusted devices...\n');
    
    // First check table structure
    const structure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'trusted_devices'
      ORDER BY ordinal_position
    `);
    
    console.log('Table structure:');
    structure.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    console.log('');
    
    const result = await pool.query(`
      SELECT *
      FROM trusted_devices
      ORDER BY trusted_at DESC
    `);
    
    console.log(`Total devices: ${result.rows.length}\n`);
    
    result.rows.forEach((device, i) => {
      console.log(`Device ${i + 1}:`);
      console.log(JSON.stringify(device, null, 2));
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDevices();
