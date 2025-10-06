import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const sessionId = 'e707d5988615b079a6c7cf2b70aa616b6fe694bf6edb9230b9047ac8e153ecec';
  
  console.log('Checking session:', sessionId.substring(0, 20) + '...\n');
  
  // Check if session exists
  const result = await pool.query(`
    SELECT s.id, s.user_id, s.expires_at, s.created_at,
           u.username, u.email
    FROM user_sessions s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.id = $1
  `, [sessionId]);
  
  if (result.rows.length === 0) {
    console.log('❌ SESSION NOT FOUND IN DATABASE');
    console.log('\nThis session does not exist or was deleted.');
  } else {
    const session = result.rows[0];
    console.log('✅ SESSION FOUND:');
    console.log('  User ID:', session.user_id);
    console.log('  Username:', session.username);
    console.log('  Email:', session.email);
    console.log('  Created:', session.created_at);
    console.log('  Expires:', session.expires_at);
    console.log('  Expired?', new Date() > new Date(session.expires_at) ? 'YES ❌' : 'NO ✅');
  }
  
  await pool.end();
}

check().catch(e => console.error('Error:', e.message));
