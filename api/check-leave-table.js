import { q } from './src/db.js';

async function checkTable() {
  try {
    const result = await q(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'leave_requests' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== Columns in leave_requests table ===');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTable();

