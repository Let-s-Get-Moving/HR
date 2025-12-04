/**
 * Create login credentials for all employees
 * - Username format: FirstnameLastname (e.g., AakashNavaney)
 * - Default password: password123
 * - Role: user (for all employees)
 * - Link manager account to Avneet Sidhu employee record
 * - Do NOT modify manager account credentials
 */

import { q } from './src/db.js';
import { hashPassword } from './src/utils/security.js';

async function createAllEmployeeCredentials() {
  try {
    console.log('🔄 Starting credential creation for all employees...\n');
    
    // Get all employees
    const employees = await q(`
      SELECT id, first_name, last_name, email, work_email 
      FROM employees 
      WHERE first_name IS NOT NULL AND last_name IS NOT NULL
      ORDER BY id
    `);
    
    console.log(`Found ${employees.rows.length} employees\n`);
    
    // Get role IDs
    const userRoleResult = await q(`SELECT id FROM hr_roles WHERE role_name = 'user'`);
    if (userRoleResult.rows.length === 0) {
      throw new Error('User role not found in hr_roles table');
    }
    const userRoleId = userRoleResult.rows[0].id;
    
    const managerRoleResult = await q(`SELECT id FROM hr_roles WHERE role_name = 'manager'`);
    if (managerRoleResult.rows.length === 0) {
      throw new Error('Manager role not found in hr_roles table');
    }
    const managerRoleId = managerRoleResult.rows[0].id;
    
    console.log(`✅ User role ID: ${userRoleId}`);
    console.log(`✅ Manager role ID: ${managerRoleId}\n`);
    
    // Hash password once for all employees
    const password = 'password123';
    const hashedPassword = await hashPassword(password);
    
    let updated = 0;
    let skipped = 0;
    let created = 0;
    let errors = 0;
    
    // Find Avneet Sidhu employee
    let avneetSidhuEmployee = null;
    
    // Process all employees
    for (const employee of employees.rows) {
      const { id, first_name, last_name, email, work_email } = employee;
      const username = `${first_name}${last_name}`; // FirstnameLastname format
      const full_name = `${first_name} ${last_name}`;
      
      // Check if this is Avneet Sidhu
      if (first_name === 'Avneet' && last_name === 'Sidhu') {
        avneetSidhuEmployee = employee;
        console.log(`⏭️  Skipping ${full_name} (Manager - will link existing manager account)`);
        skipped++;
        continue;
      }
      
      // Check if user account exists - prioritize employee_id match
      const existingByEmployeeId = await q(`
        SELECT id, username, employee_id FROM users 
        WHERE employee_id = $1
        LIMIT 1
      `, [id]);
      
      if (existingByEmployeeId.rows.length > 0) {
        // User exists for this employee - update it
        const user = existingByEmployeeId.rows[0];
        
        // Check if username is already taken by another user
        const usernameCheck = await q(`
          SELECT id FROM users WHERE username = $1 AND id != $2
        `, [username, user.id]);
        
        let finalUsername = username;
        if (usernameCheck.rows.length > 0) {
          // Username taken - find available variant
          let counter = 1;
          while (true) {
            const checkDup = await q(`SELECT id FROM users WHERE username = $1`, [`${username}${counter}`]);
            if (checkDup.rows.length === 0) {
              finalUsername = `${username}${counter}`;
              break;
            }
            counter++;
          }
        }
        
        await q(`
          UPDATE users 
          SET username = $1, 
              password_hash = $2, 
              full_name = $3,
              first_name = $4,
              last_name = $5,
              email = COALESCE($6, email),
              role_id = $7,
              is_active = true
          WHERE id = $8
        `, [finalUsername, hashedPassword, full_name, first_name, last_name, work_email || email, userRoleId, user.id]);
        
        if (finalUsername !== username) {
          console.log(`✅ Updated: ${full_name} → Username: ${finalUsername} (duplicate resolved) | Password: password123`);
        } else {
          console.log(`✅ Updated: ${full_name} → Username: ${finalUsername} | Password: password123`);
        }
        updated++;
      } else {
        // No user exists for this employee - check if email already has a user account
        const emailToUse = work_email || email;
        const existingByEmail = await q(`
          SELECT id, username, employee_id FROM users WHERE email = $1
        `, [emailToUse]);
        
        if (existingByEmail.rows.length > 0) {
          // User exists with this email - update it instead of creating new
          const user = existingByEmail.rows[0];
          
          // Check if username is already taken by another user
          const usernameCheck = await q(`
            SELECT id FROM users WHERE username = $1 AND id != $2
          `, [username, user.id]);
          
          let finalUsername = username;
          if (usernameCheck.rows.length > 0) {
            // Username taken - find available variant
            let counter = 1;
            while (true) {
              const checkDup = await q(`SELECT id FROM users WHERE username = $1`, [`${username}${counter}`]);
              if (checkDup.rows.length === 0) {
                finalUsername = `${username}${counter}`;
                break;
              }
              counter++;
            }
          }
          
          await q(`
            UPDATE users 
            SET username = $1, 
                password_hash = $2, 
                full_name = $3,
                first_name = $4,
                last_name = $5,
                role_id = $6,
                employee_id = $7,
                is_active = true
            WHERE id = $8
          `, [finalUsername, hashedPassword, full_name, first_name, last_name, userRoleId, id, user.id]);
          
          if (finalUsername !== username) {
            console.log(`✅ Updated (by email): ${full_name} → Username: ${finalUsername} (duplicate resolved) | Password: password123`);
          } else {
            console.log(`✅ Updated (by email): ${full_name} → Username: ${finalUsername} | Password: password123`);
          }
          updated++;
        } else {
          // No user exists - check if username is available
          let finalUsername = username;
          const usernameCheck = await q(`SELECT id FROM users WHERE username = $1`, [username]);
          if (usernameCheck.rows.length > 0) {
            // Username exists - append number
            let counter = 1;
            while (true) {
              const checkDup = await q(`SELECT id FROM users WHERE username = $1`, [`${username}${counter}`]);
              if (checkDup.rows.length === 0) {
                finalUsername = `${username}${counter}`;
                break;
              }
              counter++;
            }
          }
          
          // Create new user account
          await q(`
            INSERT INTO users (username, password_hash, full_name, first_name, last_name, email, role_id, employee_id, is_active, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          `, [finalUsername, hashedPassword, full_name, first_name, last_name, emailToUse, userRoleId, id, true]);
          
          if (finalUsername !== username) {
            console.log(`🆕 Created: ${full_name} → Username: ${finalUsername} (duplicate resolved) | Password: password123`);
          } else {
            console.log(`🆕 Created: ${full_name} → Username: ${finalUsername} | Password: password123`);
          }
          created++;
        }
      }
    }
    
    // Link manager account to Avneet Sidhu employee
    console.log('\n🔗 Linking manager account to Avneet Sidhu employee...');
    
    if (!avneetSidhuEmployee) {
      console.log('⚠️  Warning: Avneet Sidhu employee record not found');
    } else {
      // Find existing manager account
      const managerAccount = await q(`
        SELECT id, username, full_name, email, password_hash, role_id, employee_id
        FROM users 
        WHERE username = 'Avneet' 
           OR full_name ILIKE '%Avneet%' 
           OR email ILIKE '%avneet%'
        ORDER BY id
        LIMIT 1
      `);
      
      if (managerAccount.rows.length === 0) {
        console.log('⚠️  Warning: Manager account not found. Expected username "Avneet"');
      } else {
        const manager = managerAccount.rows[0];
        
        // Update manager account: link to employee, ensure manager role, but DON'T change credentials
        await q(`
          UPDATE users 
          SET employee_id = $1,
              role_id = $2
          WHERE id = $3
        `, [avneetSidhuEmployee.id, managerRoleId, manager.id]);
        
        console.log(`✅ Linked manager account (ID: ${manager.id}, Username: ${manager.username}) to Avneet Sidhu employee (ID: ${avneetSidhuEmployee.id})`);
        console.log(`   Manager credentials unchanged: Username: ${manager.username}, Password: (unchanged)`);
        console.log(`   Manager role confirmed: manager (ID: ${managerRoleId})`);
      }
    }
    
    console.log(`\n✅ Credential creation complete!`);
    console.log(`   📊 Created: ${created} new accounts`);
    console.log(`   ✏️  Updated: ${updated} existing accounts`);
    console.log(`   ⏭️  Skipped: ${skipped} (Avneet Sidhu - manager)`);
    if (errors > 0) {
      console.log(`   ❌ Errors: ${errors}`);
    }
    console.log(`\n🔐 All employees can now log in with:`);
    console.log(`   Username: FirstnameLastname (e.g., AakashNavaney)`);
    console.log(`   Password: password123\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating credentials:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

createAllEmployeeCredentials();

