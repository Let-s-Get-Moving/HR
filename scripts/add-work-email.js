const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function addWorkEmail() {
  try {
    console.log('📧 Adding work_email column and migrating data...\n');
    
    const sqlPath = path.join(__dirname, '../db/init/052_add_work_email.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ work_email column added successfully!');
    console.log('✅ Existing @letsgetmovinggroup.com emails migrated to work_email');
    console.log('✅ Work emails auto-generated for all employees\n');
    
    console.log('📊 Checking results...\n');
    
    const { rows } = await pool.query(`
      SELECT 
        first_name,
        last_name,
        email as personal_email,
        work_email
      FROM employees
      ORDER BY first_name
      LIMIT 10
    `);
    
    console.log('Sample employees:');
    rows.forEach(r => {
      console.log(`  ${r.first_name} ${r.last_name}:`);
      console.log(`    Work: ${r.work_email}`);
      console.log(`    Personal: ${r.personal_email || '(none)'}`);
    });
    
    const { rows: counts } = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(email) as with_personal,
        COUNT(work_email) as with_work
      FROM employees
    `);
    
    console.log(`\n📈 Summary:`);
    console.log(`  Total employees: ${counts[0].total}`);
    console.log(`  With work email: ${counts[0].with_work}`);
    console.log(`  With personal email: ${counts[0].with_personal}`);
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    pool.end();
    process.exit(1);
  }
}

addWorkEmail();

