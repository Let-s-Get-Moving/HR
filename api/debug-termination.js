#!/usr/bin/env node

/**
 * DEBUG TERMINATION API
 * Debug the termination API issues
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
});

async function debugTermination() {
  console.log('🔍 DEBUGGING TERMINATION API');
  console.log('============================\n');

  try {
    // Test 1: Check if termination_details table exists
    console.log('1. Checking if termination_details table exists...');
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'termination_details'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ termination_details table does not exist!');
      return;
    }
    console.log('✅ termination_details table exists');

    // Test 2: Check table structure
    console.log('\n2. Checking table structure...');
    const structureCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'termination_details'
      ORDER BY ordinal_position
    `);
    
    console.log('Table columns:');
    structureCheck.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Test 3: Try to query termination_details
    console.log('\n3. Testing termination_details query...');
    const terminationQuery = await pool.query(`
      SELECT 
        td.id,
        td.employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        e.role_title,
        td.termination_date,
        td.termination_type,
        td.termination_reason,
        td.equipment_returned,
        td.access_revoked
      FROM termination_details td
      JOIN employees e ON td.employee_id = e.id
      ORDER BY td.termination_date DESC
    `);
    
    console.log(`✅ Query successful, found ${terminationQuery.rows.length} terminations`);
    
    if (terminationQuery.rows.length > 0) {
      console.log('Sample termination:');
      console.log(JSON.stringify(terminationQuery.rows[0], null, 2));
    }

    // Test 4: Check if employees table has required fields
    console.log('\n4. Checking employees table structure...');
    const employeeCheck = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'employees'
      AND column_name IN ('first_name', 'last_name', 'role_title')
      ORDER BY column_name
    `);
    
    console.log('Required employee columns:');
    employeeCheck.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Test 5: Test a simple termination_details query without JOIN
    console.log('\n5. Testing simple termination_details query...');
    const simpleQuery = await pool.query(`
      SELECT * FROM termination_details LIMIT 1
    `);
    
    console.log(`✅ Simple query successful, found ${simpleQuery.rows.length} records`);

  } catch (error) {
    console.error('❌ Error during debugging:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

debugTermination().catch(console.error);
