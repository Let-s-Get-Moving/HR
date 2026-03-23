#!/usr/bin/env node
/**
 * Check active sales employees and their nicknames
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

async function checkEmployees() {
  try {
    console.log('Active Sales Employees with Commission Enabled:\n');
    
    const result = await pool.query(`
      SELECT 
        e.id,
        e.first_name || ' ' || e.last_name as full_name,
        e.sales_role,
        e.nickname,
        e.nickname_2,
        e.nickname_3,
        e.termination_date,
        e.sales_commission_enabled
      FROM employees e
      INNER JOIN departments d ON e.department_id = d.id
      WHERE d.name ILIKE '%sales%'
        AND e.sales_commission_enabled = true
        AND e.termination_date IS NULL
      ORDER BY e.sales_role, e.first_name
    `);
    
    console.log(`Found ${result.rows.length} active employees:\n`);
    
    for (const emp of result.rows) {
      console.log(`${emp.id}\t${emp.full_name.padEnd(25)} [${emp.sales_role}]`);
      console.log(`\tNicknames: ${emp.nickname || 'null'}, ${emp.nickname_2 || 'null'}, ${emp.nickname_3 || 'null'}`);
    }
    
    console.log('\n---\n');
    console.log('Recently Terminated Employees:\n');
    
    const terminated = await pool.query(`
      SELECT 
        e.id,
        e.first_name || ' ' || e.last_name as full_name,
        e.sales_role,
        e.nickname,
        e.termination_date
      FROM employees e
      INNER JOIN departments d ON e.department_id = d.id
      WHERE d.name ILIKE '%sales%'
        AND e.sales_commission_enabled = true
        AND e.termination_date IS NOT NULL
        AND e.termination_date >= '2026-01-01'
      ORDER BY e.termination_date DESC
    `);
    
    console.log(`Found ${terminated.rows.length} recently terminated:\n`);
    
    for (const emp of terminated.rows) {
      console.log(`${emp.id}\t${emp.full_name.padEnd(25)} [${emp.sales_role}] - terminated ${emp.termination_date}`);
      console.log(`\tNickname: ${emp.nickname || 'null'}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkEmployees();
