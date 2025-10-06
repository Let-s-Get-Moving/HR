import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  console.log('Checking session table and recent sessions...\n');
  
  // Check table structure
  const schema = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns
    WHERE table_name = 'user_sessions'
    ORDER BY ordinal_position
  `);
  
  console.log('user_sessions table columns:');
  schema.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
  
  // Check active sessions
  const sessions = await pool.query(`
    SELECT id, user_id, expires_at, created_at, last_activity
    FROM user_sessions
    WHERE expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 5
  `);
  
  console.log(`\nActive sessions: ${sessions.rows.length}`);
  if (sessions.rows.length > 0) {
    sessions.rows.forEach(s => {
      console.log(`  Session ID: ${s.id?.substring(0, 15)}...`);
      console.log(`  User ID: ${s.user_id}`);
      console.log(`  Expires: ${s.expires_at}`);
      console.log(`  ---`);
    });
  }
  
  // Check users table to ensure role structure matches
  const userCheck = await pool.query(`
    SELECT u.id, u.username, u.email, r.role_name
    FROM users u
    LEFT JOIN hr_roles r ON u.role_id = r.id
    WHERE u.username = 'Avneet' OR u.email = 'Avneet'
    LIMIT 1
  `);
  
  console.log('\nUser check (Avneet):');
  if (userCheck.rows.length > 0) {
    const user = userCheck.rows[0];
    console.log(`  User ID: ${user.id}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role_name}`);
  } else {
    console.log('  ❌ User not found!');
  }
  
  await pool.end();
}

check().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

