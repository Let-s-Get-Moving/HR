/**
 * Automatic Admin User Management
 * Ensures admin user always exists on server startup
 */

import bcrypt from 'bcryptjs';
import { pool } from '../db.js';

export async function ensureAdminUser() {
    const client = await pool.connect();
    
    try {
        console.log('🔐 Checking admin user...');
        
        // Fixed credentials
        const username = 'Avneet';
        const password = 'password123';
        const email = 'avneet@hr.local';
        const role = 'Admin';
        
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
            console.log(`✅ Admin user exists: ${user.full_name} (${user.email})`);
            
            // Verify role is correct - check if role_id points to Admin role
            const adminRole = await client.query(`
                SELECT id FROM hr_roles WHERE role_name = $1
            `, [role]);
            
            if (adminRole.rows.length > 0) {
                const adminRoleId = adminRole.rows[0].id;
                await client.query(`
                    UPDATE users 
                    SET role_id = $1 
                    WHERE id = $2
                `, [adminRoleId, user.id]);
                console.log(`✅ Updated admin role_id to ${adminRoleId}`);
            }
            
            return;
        }
        
        // Admin user doesn't exist - create it
        console.log('⚠️ Admin user not found - creating...');
        
        // First, ensure Admin role exists
        const adminRole = await client.query(`
            SELECT id FROM hr_roles WHERE role_name = $1
        `, [role]);
        
        let adminRoleId;
        if (adminRole.rows.length === 0) {
            // Create Admin role if it doesn't exist
            const newRole = await client.query(`
                INSERT INTO hr_roles (role_name, display_name, description, permissions)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, [role, 'Administrator', 'Full system access', '{"all": true}']);
            adminRoleId = newRole.rows[0].id;
            console.log(`✅ Created Admin role with ID: ${adminRoleId}`);
        } else {
            adminRoleId = adminRole.rows[0].id;
            console.log(`✅ Found Admin role with ID: ${adminRoleId}`);
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        
        await client.query(`
            INSERT INTO users (email, full_name, role_id, password_hash, is_active)
            VALUES ($1, $2, $3, $4, $5)
        `, [email, username, adminRoleId, passwordHash, true]);
        
        console.log(`✅ Admin user created successfully`);
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
        console.log(`   Email: ${email}`);
        
    } catch (error) {
        console.error('❌ Error ensuring admin user:', error.message);
        // Don't throw - let the server start anyway
    } finally {
        client.release();
    }
}

