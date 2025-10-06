import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  console.log('Fixing username for user ID 32...\n');
  
  // Update username
  await pool.query(`
    UPDATE users 
    SET username = 'Avneet'
    WHERE id = 32
  `);
  
  console.log('✅ Username set to "Avneet"');
  
  // Verify
  const result = await pool.query(`
    SELECT id, username, email, first_name, last_name
    FROM users
    WHERE id = 32
  `);
  
  console.log('\nVerified user data:');
  const user = result.rows[0];
  console.log(`  ID: ${user.id}`);
  console.log(`  Username: ${user.username}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Name: ${user.first_name} ${user.last_name}`);
  
  await pool.end();
  console.log('\n✅ Fix complete!');
}

fix().catch(e => console.error('Error:', e.message));
