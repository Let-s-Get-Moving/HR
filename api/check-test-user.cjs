const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTestUser() {
  try {
    console.log('🔍 Checking for user "test test" or username "TestTest"...\n');
    
    // Check users table
    const userQuery = `
      SELECT u.id, u.username, u.full_name, u.email, u.password_hash, u.role_id, u.employee_id, u.is_active, u.created_at,
             r.role_name, r.display_name as role_display
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE u.full_name ILIKE '%test%' OR u.username ILIKE '%test%'
      ORDER BY u.created_at DESC
    `;
    const users = await pool.query(userQuery);
    
    if (users.rows.length === 0) {
      console.log('❌ No users found matching "test"');
    } else {
      console.log(`✅ Found ${users.rows.length} user(s):\n`);
      users.rows.forEach(user => {
        console.log(`User ID: ${user.id}`);
        console.log(`Username: ${user.username}`);
        console.log(`Full Name: ${user.full_name}`);
        console.log(`Email: ${user.email || 'None'}`);
        console.log(`Password Hash: ${user.password_hash ? '✅ SET (length: ' + user.password_hash.length + ')' : '❌ NOT SET'}`);
        console.log(`Role ID: ${user.role_id || 'NOT SET'}`);
        console.log(`Role Name: ${user.role_name || 'NOT SET'}`);
        console.log(`Role Display: ${user.role_display || 'NOT SET'}`);
        console.log(`Employee ID: ${user.employee_id || 'NOT SET'}`);
        console.log(`Is Active: ${user.is_active}`);
        console.log(`Created: ${user.created_at}`);
        console.log('---');
      });
    }
    
    // Check employees table for "test test"
    console.log('\n🔍 Checking employees table...\n');
    const empQuery = `
      SELECT id, first_name, last_name, work_email, hire_date, employment_type, department_id
      FROM employees
      WHERE first_name ILIKE '%test%' OR last_name ILIKE '%test%'
      ORDER BY id DESC
    `;
    const employees = await pool.query(empQuery);
    
    if (employees.rows.length === 0) {
      console.log('❌ No employees found matching "test"');
    } else {
      console.log(`✅ Found ${employees.rows.length} employee(s):\n`);
      employees.rows.forEach(emp => {
        console.log(`Employee ID: ${emp.id}`);
        console.log(`Name: ${emp.first_name} ${emp.last_name}`);
        console.log(`Email: ${emp.work_email}`);
        console.log(`Hire Date: ${emp.hire_date}`);
        console.log(`Type: ${emp.employment_type}`);
        console.log(`Department: ${emp.department_id || 'None'}`);
        console.log('---');
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkTestUser();
