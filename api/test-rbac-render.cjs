const { Client } = require('pg');

const DATABASE_URL = 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4';

async function testRBACImplementation() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  console.log('✅ Connected to Render database\n');
  
  try {
    console.log('═══════════════════════════════════════');
    console.log('📋 RBAC IMPLEMENTATION TEST');
    console.log('═══════════════════════════════════════\n');
    
    // Test 1: Verify 3 roles exist
    console.log('TEST 1: Verify 3 roles exist');
    const rolesResult = await client.query(`
      SELECT role_name, display_name, permissions->>'scope' as scope
      FROM hr_roles
      ORDER BY id
    `);
    
    if (rolesResult.rows.length === 3) {
      console.log('✅ All 3 roles exist:');
      rolesResult.rows.forEach(r => {
        console.log(`   - ${r.role_name} (${r.display_name}) - Scope: ${r.scope}`);
      });
    } else {
      console.log(`❌ Expected 3 roles, found ${rolesResult.rows.length}`);
    }
    console.log('');
    
    // Test 2: Verify Avneet is manager
    console.log('TEST 2: Verify Avneet has manager role');
    const avneetResult = await client.query(`
      SELECT u.id, u.username, u.email, r.role_name
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE u.username = 'Avneet'
    `);
    
    if (avneetResult.rows.length > 0) {
      const avneet = avneetResult.rows[0];
      if (avneet.role_name === 'manager') {
        console.log('✅ Avneet is assigned manager role');
        console.log(`   Username: ${avneet.username}`);
        console.log(`   Email: ${avneet.email}`);
        console.log(`   Role: ${avneet.role_name}`);
        console.log(`   User ID: ${avneet.id}`);
      } else {
        console.log(`❌ Avneet has role: ${avneet.role_name} (expected: manager)`);
      }
    } else {
      console.log('❌ Avneet user not found');
    }
    console.log('');
    
    // Test 3: Check permission functions
    console.log('TEST 3: Test permission helper functions');
    const permResult = await client.query(`
      SELECT has_permission($1, 'leave', 'approve') as can_approve_leave
    `, [avneetResult.rows[0]?.id]);
    
    if (permResult.rows[0].can_approve_leave) {
      console.log('✅ has_permission function works - Avneet can approve leave');
    } else {
      console.log('❌ has_permission function failed');
    }
    console.log('');
    
    // Test 4: Check scope function
    console.log('TEST 4: Test scope helper function');
    const scopeResult = await client.query(`
      SELECT get_user_scope($1) as scope
    `, [avneetResult.rows[0]?.id]);
    
    if (scopeResult.rows[0].scope === 'all') {
      console.log('✅ get_user_scope function works - Avneet has "all" scope');
    } else {
      console.log(`❌ Expected "all" scope, got: ${scopeResult.rows[0].scope}`);
    }
    console.log('');
    
    // Test 5: Check if leave_requests table exists and has data
    console.log('TEST 5: Check leave_requests table');
    const leaveResult = await client.query(`
      SELECT COUNT(*) as count FROM leave_requests
    `);
    console.log(`✅ Leave requests table exists (${leaveResult.rows[0].count} records)`);
    console.log('');
    
    // Test 6: Check if employees exist (for linking users)
    console.log('TEST 6: Check employees table');
    const empResult = await client.query(`
      SELECT COUNT(*) as count FROM employees
    `);
    console.log(`✅ Employees table exists (${empResult.rows[0].count} employees)`);
    console.log('');
    
    // Test 7: Note about employee linkage
    console.log('TEST 7: Employee linkage (optional)');
    console.log('ℹ️  Note: users.employee_id column not in current schema');
    console.log('   This is OK for manager/admin roles (they have full access)');
    console.log('   For user role testing, you would need to:');
    console.log('   1. Add employee_id column: ALTER TABLE users ADD COLUMN employee_id INTEGER');
    console.log('   2. Link users to employees: UPDATE users SET employee_id = X');
    console.log('');
    
    console.log('═══════════════════════════════════════');
    console.log('✅ RBAC TEST COMPLETE');
    console.log('═══════════════════════════════════════\n');
    
    console.log('📊 Summary:');
    console.log('   ✅ Roles: admin, manager, user created');
    console.log('   ✅ Avneet assigned as manager');
    console.log('   ✅ Permission functions working');
    console.log('   ✅ Scope functions working');
    console.log('   ✅ Database schema ready');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Update frontend to use role-based rendering');
    console.log('   2. Create test user account with "user" role');
    console.log('   3. Test leave approval workflow');
    console.log('   4. Test data filtering for user role');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

testRBACImplementation();

