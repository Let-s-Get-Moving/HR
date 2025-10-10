/**
 * Automatic Admin User Management
 * Ensures admin user always exists on server startup
 */

import bcrypt from 'bcryptjs';
import { pool } from '../db.js';

export async function ensureAdminUser() {
    const client = await pool.connect();
    
    try {
        console.log('🔐 Checking manager user (Avneet)...');
        
        // Fixed credentials - Avneet as Manager
        const username = 'Avneet';
        const password = 'password123';
        const email = 'avneet@hr.local';
        const role = 'manager';
        
        // Check if admin user exists
        const existing = await client.query(`
            SELECT u.id, u.full_name, u.email, r.role_name
            FROM users u
            LEFT JOIN hr_roles r ON u.role_id = r.id
            WHERE u.full_name = $1 OR u.email = $2
            LIMIT 1
        `, [username, email]);
        
        if (existing.rows.length > 0) {
            const user = existing.rows[0];
            console.log(`✅ Manager user exists: ${user.full_name} (${user.email})`);
            
            // Verify role is correct - check if role_id points to manager role
            const managerRole = await client.query(`
                SELECT id FROM hr_roles WHERE role_name = $1
            `, [role]);
            
            if (managerRole.rows.length > 0) {
                const managerRoleId = managerRole.rows[0].id;
                await client.query(`
                    UPDATE users 
                    SET role_id = $1, username = $2
                    WHERE id = $3
                `, [managerRoleId, username, user.id]);
                console.log(`✅ Updated user to manager role (ID: ${managerRoleId})`);
            }
            
            return;
        }
        
        // Manager user doesn't exist - create it
        console.log('⚠️ Manager user not found - creating...');
        
        // First, ensure manager role exists
        const managerRole = await client.query(`
            SELECT id FROM hr_roles WHERE role_name = $1
        `, [role]);
        
        let managerRoleId;
        if (managerRole.rows.length === 0) {
            // Create manager role if it doesn't exist (should exist from migration)
            const newRole = await client.query(`
                INSERT INTO hr_roles (role_name, display_name, description, permissions)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, [role, 'Manager', 'Full system access', '{"all": true}']);
            managerRoleId = newRole.rows[0].id;
            console.log(`✅ Created manager role with ID: ${managerRoleId}`);
        } else {
            managerRoleId = managerRole.rows[0].id;
            console.log(`✅ Found manager role with ID: ${managerRoleId}`);
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        
        await client.query(`
            INSERT INTO users (email, full_name, username, role_id, password_hash, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [email, username, username, managerRoleId, passwordHash, true]);
        
        console.log(`✅ Manager user (Avneet) created successfully`);
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
        console.log(`   Email: ${email}`);
        
    } catch (error) {
        console.error('❌ Error ensuring manager user:', error.message);
        // Don't throw - let the server start anyway
    } finally {
        client.release();
    }
}

