const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4'
});

async function checkUsers() {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.full_name, u.email, u.is_active, u.employee_id,
             r.role_name, r.display_name as role_display_name,
             r.permissions->>'scope' as scope,
             e.first_name, e.last_name
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      LEFT JOIN employees e ON u.employee_id = e.id
      ORDER BY u.id
    `);
    
    console.log('=== USER ACCOUNTS ===');
    result.rows.forEach(user => {
      console.log(`\nID: ${user.id}`);
      console.log(`Username: ${user.username || 'N/A'}`);
      console.log(`Full Name: ${user.full_name || 'N/A'}`);
      console.log(`Email: ${user.email || 'N/A'}`);
      console.log(`Role: ${user.role_name || 'N/A'} (${user.role_display_name || 'N/A'})`);
      console.log(`Scope: ${user.scope || 'N/A'}`);
      console.log(`Employee ID: ${user.employee_id || 'N/A'}`);
      console.log(`Employee Name: ${user.first_name || 'N/A'} ${user.last_name || 'N/A'}`);
      console.log(`Active: ${user.is_active}`);
      console.log('---');
    });
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkUsers();
