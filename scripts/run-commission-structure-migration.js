/**
 * Run Commission Structure Settings Migration
 * This script inserts the configurable commission structure settings
 * into the application_settings table.
 */

import pkg from 'pg';
const { Pool } = pkg;

// Render DB connection
const pool = new Pool({
  host: 'dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com',
  user: 'hr',
  password: 'bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn',
  database: 'hrcore_42l4',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('Starting commission structure settings migration...');
    
    const sql = `
      INSERT INTO application_settings (key, value, type, category, description, default_value)
      SELECT * FROM (VALUES
        ('sales_agent_threshold_1', '30,115000,3.5', 'text', 'system', 'Sales Agent Threshold 1: Lead conversion %, Revenue threshold, Commission %', '30,115000,3.5'),
        ('sales_agent_threshold_2', '30,115000,4', 'text', 'system', 'Sales Agent Threshold 2: Lead conversion %, Revenue threshold, Commission %', '30,115000,4'),
        ('sales_agent_threshold_3', '30,115000,4', 'text', 'system', 'Sales Agent Threshold 3: Lead conversion %, Revenue threshold, Commission %', '30,115000,4'),
        ('sales_agent_threshold_4', '30,115000,4.5', 'text', 'system', 'Sales Agent Threshold 4: Lead conversion %, Revenue threshold, Commission %', '30,115000,4.5'),
        ('sales_agent_threshold_5', '35,160000,5', 'text', 'system', 'Sales Agent Threshold 5: Lead conversion %, Revenue threshold, Commission %', '35,160000,5'),
        ('sales_agent_threshold_6', '40,200000,5.5', 'text', 'system', 'Sales Agent Threshold 6: Lead conversion %, Revenue threshold, Commission %', '40,200000,5.5'),
        ('sales_agent_threshold_7', '55,250000,6', 'text', 'system', 'Sales Agent Threshold 7: Lead conversion %, Revenue threshold, Commission % (with vacation package if >= 55%)', '55,250000,6'),
        ('sales_agent_vacation_package_value', '5000', 'text', 'system', 'Sales Agent Vacation Package Value (for threshold with >= 55% leads & >= $250k revenue)', '5000'),
        ('sales_manager_threshold_1', '0,19,0.25', 'text', 'system', 'Sales Manager Threshold 1: Min booking %, Max booking %, Commission %', '0,19,0.25'),
        ('sales_manager_threshold_2', '20,24,0.275', 'text', 'system', 'Sales Manager Threshold 2: Min booking %, Max booking %, Commission %', '20,24,0.275'),
        ('sales_manager_threshold_3', '25,29,0.30', 'text', 'system', 'Sales Manager Threshold 3: Min booking %, Max booking %, Commission %', '25,29,0.30'),
        ('sales_manager_threshold_4', '30,34,0.35', 'text', 'system', 'Sales Manager Threshold 4: Min booking %, Max booking %, Commission %', '30,34,0.35'),
        ('sales_manager_threshold_5', '35,39,0.40', 'text', 'system', 'Sales Manager Threshold 5: Min booking %, Max booking %, Commission %', '35,39,0.40'),
        ('sales_manager_threshold_6', '40,100,0.45', 'text', 'system', 'Sales Manager Threshold 6: Min booking %, Max booking %, Commission %', '40,100,0.45')
      ) AS v(key, value, type, category, description, default_value)
      WHERE NOT EXISTS (
        SELECT 1 FROM application_settings WHERE application_settings.key = v.key
      )
    `;
    
    const result = await pool.query(sql);
    
    console.log('Migration completed successfully');
    console.log('Rows inserted:', result.rowCount);
    
    const verifyResult = await pool.query(`
      SELECT key, value 
      FROM application_settings 
      WHERE key LIKE 'sales_agent_threshold_%' 
         OR key LIKE 'sales_manager_threshold_%'
         OR key = 'sales_agent_vacation_package_value'
      ORDER BY key
    `);
    
    console.log('\nVerification - Inserted settings:');
    for (const row of verifyResult.rows) {
      console.log('  ' + row.key + ': ' + row.value);
    }
    
    console.log('\nTotal settings found:', verifyResult.rows.length);
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
