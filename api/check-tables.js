// Check what tables exist in the database
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function checkTables() {
  try {
    console.log('Checking existing tables...');
    
    const { rows } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Existing tables:');
    rows.forEach(row => console.log(`- ${row.table_name}`));
    
    // Check if recruiting tables exist
    const recruitingTables = rows.filter(row => 
      row.table_name.includes('job_') || 
      row.table_name.includes('candidate') ||
      row.table_name.includes('interview')
    );
    
    console.log('\nRecruiting-related tables:');
    recruitingTables.forEach(row => console.log(`- ${row.table_name}`));
    
    // Check if benefits tables exist
    const benefitsTables = rows.filter(row => 
      row.table_name.includes('benefit') ||
      row.table_name.includes('insurance') ||
      row.table_name.includes('retirement')
    );
    
    console.log('\nBenefits-related tables:');
    benefitsTables.forEach(row => console.log(`- ${row.table_name}`));
    
  } catch (error) {
    console.error('Error checking tables:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
