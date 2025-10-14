/**
 * Update all employees' login credentials to FirstnameLastname / password123
 * Except Avneet (manager/HR) - keep her credentials unchanged
 */

import { q } from './src/db.js';
import bcrypt from 'bcrypt';

async function updateEmployeeCredentials() {
  try {
    console.log('🔄 Starting credential update for all employees...\n');
    
    // Get all employees
    const employees = await q(`
      SELECT id, first_name, last_name, email, work_email 
      FROM employees 
      WHERE first_name IS NOT NULL AND last_name IS NOT NULL
      ORDER BY id
    `);
    
    console.log(`Found ${employees.rows.length} employees\n`);
    
    // Get user role ID
    const userRoleResult = await q(`SELECT id FROM hr_roles WHERE role_name = 'user'`);
    const userRoleId = userRoleResult.rows[0].id;
    
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let updated = 0;
    let skipped = 0;
    let created = 0;
    
    for (const employee of employees.rows) {
      const { id, first_name, last_name, email, work_email } = employee;
      const username = `${first_name}${last_name}`; // FirstnameLastname format
      const full_name = `${first_name} ${last_name}`;
      
      // Skip Avneet (manager)
      if (first_name === 'Avneet' || username === 'AvneetKaur' || username === 'Avneet') {
        console.log(`⏭️  Skipping ${full_name} (Manager - keep existing credentials)`);
        skipped++;
        continue;
      }
      
      // Check if user account exists
      const existingUser = await q(`
        SELECT id, username FROM users WHERE employee_id = $1
      `, [id]);
      
      if (existingUser.rows.length > 0) {
        // Update existing user
        await q(`
          UPDATE users 
          SET username = $1, 
              password = $2, 
              full_name = $3,
              email = COALESCE($4, email),
              role_id = $5
          WHERE employee_id = $6
        `, [username, hashedPassword, full_name, work_email || email, userRoleId, id]);
        
        console.log(`✅ Updated: ${full_name} → Username: ${username} | Password: password123`);
        updated++;
      } else {
        // Create new user account
        await q(`
          INSERT INTO users (username, password, full_name, email, role_id, employee_id, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [username, hashedPassword, full_name, work_email || email, userRoleId, id]);
        
        console.log(`🆕 Created: ${full_name} → Username: ${username} | Password: password123`);
        created++;
      }
    }
    
    console.log(`\n✅ Credential update complete!`);
    console.log(`   📊 Created: ${created} new accounts`);
    console.log(`   ✏️  Updated: ${updated} existing accounts`);
    console.log(`   ⏭️  Skipped: ${skipped} (Avneet - manager)`);
    console.log(`\n🔐 All employees (except Avneet) can now log in with:`);
    console.log(`   Username: FirstnameLastname (e.g., KelvinAnil)`);
    console.log(`   Password: password123\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating credentials:', error);
    process.exit(1);
  }
}

updateEmployeeCredentials();

