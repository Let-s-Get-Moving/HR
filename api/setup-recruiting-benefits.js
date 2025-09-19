// Setup script for recruiting and benefits schema
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

const pool = new Pool({
  connectionString: 'postgres://hr_database_user:hr_database_password@dpg-d0j8v8k6g7s73f8a1qkg-a.oregon-postgres.render.com/hr_database_8x9k',
  ssl: { rejectUnauthorized: false }
});

async function setupRecruitingBenefits() {
  try {
    console.log('Setting up recruiting and benefits schema...');
    
    // Read the schema file
    const schema = fs.readFileSync('../db/init/012_recruiting_benefits_schema.sql', 'utf8');
    
    // Execute the schema
    await pool.query(schema);
    
    console.log('✅ Recruiting and benefits schema created successfully!');
    
    // Test the new tables
    const tables = [
      'job_postings',
      'candidates', 
      'job_applications',
      'interviews',
      'benefits_plans',
      'retirement_plans',
      'benefits_enrollments',
      'retirement_enrollments'
    ];
    
    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`✅ ${table}: ${result.rows[0].count} records`);
    }
    
  } catch (error) {
    console.error('❌ Error setting up schema:', error.message);
  } finally {
    await pool.end();
  }
}

setupRecruitingBenefits();
