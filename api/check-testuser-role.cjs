const { Client } = require('pg');

const DATABASE_URL = 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4';

async function checkTestUserRole() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  try {
    // Check testuser's role
    const result = await client.query(`
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.employee_id,
        u.role_id,
        r.role_name,
        r.permissions->>'scope' as scope
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE u.username = 'testuser' OR u.full_name = 'Test User'
    `);
    
    console.log('\n📋 testuser details:\n');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
    // Check what the session endpoint would return
    const sessionId = 'a33a091a1745d7ae9097987419212fabac9ff32023f899c78e29f502359866b3';
    const sessionResult = await client.query(`
      SELECT 
        s.id, 
        s.user_id, 
        u.email, 
        u.username,
        u.employee_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.username, u.full_name) as full_name,
        COALESCE(r.role_name, 'user') as role,
        r.permissions->>'scope' as scope
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE s.id = $1 AND s.expires_at > NOW()
    `, [sessionId]);
    
    console.log('\n📋 What /api/auth/session returns for this session:\n');
    if (sessionResult.rows.length > 0) {
      console.log(JSON.stringify(sessionResult.rows[0], null, 2));
    } else {
      console.log('❌ Session not found or expired');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTestUserRole();

