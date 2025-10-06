import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  // Check all users
  const users = await pool.query(`
    SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.is_active, r.role_name
    FROM users u
    LEFT JOIN hr_roles r ON u.role_id = r.id
    ORDER BY u.id
  `);
  
  console.log(`Total users: ${users.rows.length}\n`);
  users.rows.forEach(u => {
    console.log(`User ID: ${u.id}`);
    console.log(`  Username: ${u.username}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Name: ${u.first_name} ${u.last_name}`);
    console.log(`  Role: ${u.role_name}`);
    console.log(`  Active: ${u.is_active}`);
    console.log('---');
  });
  
  await pool.end();
}

check().catch(e => console.error('Error:', e.message));
