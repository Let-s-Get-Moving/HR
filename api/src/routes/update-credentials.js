/**
 * One-time script to update all employee credentials
 * Run this endpoint once after deployment to update all existing employees
 */

import express from 'express';
import { q } from '../db.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.post('/update-all-credentials', async (req, res) => {
  try {
    console.log('🔄 Starting credential update for all employees...\n');
    
    // Get all employees
    const employees = await q(`
      SELECT id, first_name, last_name, email, work_email 
      FROM employees 
      WHERE first_name IS NOT NULL AND last_name IS NOT NULL
      ORDER BY id
    `);
    
    console.log(`Found ${employees.rows.length} employees`);
    
    // Get user role ID
    const userRoleResult = await q(`SELECT id FROM hr_roles WHERE role_name = 'user'`);
    const userRoleId = userRoleResult.rows[0].id;
    
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let updated = 0;
    let skipped = 0;
    let created = 0;
    const results = [];
    
    for (const employee of employees.rows) {
      const { id, first_name, last_name, email, work_email } = employee;
      const username = `${first_name}${last_name}`;
      const full_name = `${first_name} ${last_name}`;
      
      // Skip Avneet (manager)
      if (first_name === 'Avneet' || username.includes('Avneet')) {
        console.log(`⏭️  Skipping ${full_name} (Manager)`);
        results.push({ name: full_name, action: 'skipped', reason: 'Manager - keep existing credentials' });
        skipped++;
        continue;
      }
      
      // Check if user account exists
      const existingUser = await q(`SELECT id FROM users WHERE employee_id = $1`, [id]);
      
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
        
        console.log(`✅ Updated: ${full_name} → ${username}`);
        results.push({ name: full_name, username, action: 'updated' });
        updated++;
      } else {
        // Create new user account
        await q(`
          INSERT INTO users (username, password, full_name, email, role_id, employee_id, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [username, hashedPassword, full_name, work_email || email, userRoleId, id]);
        
        console.log(`🆕 Created: ${full_name} → ${username}`);
        results.push({ name: full_name, username, action: 'created' });
        created++;
      }
    }
    
    res.json({
      success: true,
      message: 'Credential update complete',
      summary: {
        total: employees.rows.length,
        created,
        updated,
        skipped
      },
      results,
      instructions: 'All employees (except Avneet) can now log in with Username: FirstnameLastname, Password: password123'
    });
  } catch (error) {
    console.error('❌ Error updating credentials:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update credentials', 
      details: error.message 
    });
  }
});

export default router;

