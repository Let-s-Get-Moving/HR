#!/usr/bin/env node
/**
 * Check specific employee termination status
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: 'dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com',
  user: 'hr',
  password: 'bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn',
  database: 'hrcore_42l4',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

const namesToCheck = [
  'Darrius Skerritt',
  'Greg Mutsinzi',
  'Kim Lawal',
  'Neeyomi Zaveri'
];

async function checkSpecific() {
  try {
    for (const name of namesToCheck) {
      const [firstName, lastName] = name.split(' ');
      
      const result = await pool.query(`
        SELECT 
          id,
          first_name,
          last_name,
          employment_status,
          termination_date,
          sales_commission_enabled,
          sales_role
        FROM employees
        WHERE first_name = $1 AND last_name = $2
      `, [firstName, lastName]);
      
      if (result.rows.length > 0) {
        const emp = result.rows[0];
        console.log(`\n${name} (ID: ${emp.id}):`);
        console.log(`  Employment Status: ${emp.employment_status}`);
        console.log(`  Termination Date: ${emp.termination_date || 'NULL (Active)'}`);
        console.log(`  Commission Enabled: ${emp.sales_commission_enabled}`);
        console.log(`  Sales Role: ${emp.sales_role}`);
      } else {
        console.log(`\n${name}: NOT FOUND`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSpecific();
