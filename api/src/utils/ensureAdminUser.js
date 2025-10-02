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
            SELECT id, full_name, email, role 
            FROM users 
            WHERE full_name = $1 OR email = $2
            LIMIT 1
        `, [username, email]);
        
        if (existing.rows.length > 0) {
            const user = existing.rows[0];
            console.log(`✅ Admin user exists: ${user.full_name} (${user.email})`);
            
            // Verify role is correct
            if (user.role !== role) {
                await client.query(`
                    UPDATE users 
                    SET role = $1 
                    WHERE id = $2
                `, [role, user.id]);
                console.log(`✅ Updated admin role to ${role}`);
            }
            
            return;
        }
        
        // Admin user doesn't exist - create it
        console.log('⚠️ Admin user not found - creating...');
        
        const passwordHash = await bcrypt.hash(password, 10);
        
        await client.query(`
            INSERT INTO users (email, full_name, role, password_hash)
            VALUES ($1, $2, $3, $4)
        `, [email, username, role, passwordHash]);
        
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

