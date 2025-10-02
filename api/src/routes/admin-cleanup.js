/**
 * Admin Cleanup Routes
 * Destructive operations for database management
 */

import { Router } from "express";
import { q, pool } from "../db.js";

const r = Router();

/**
 * DELETE /api/admin-cleanup/employees
 * Delete ALL employees from the database (cascade deletes all related data)
 */
r.delete("/employees", async (req, res) => {
    console.log('🗑️ [ADMIN] Deleting ALL employees...');
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get count before deletion
        const beforeCount = await client.query('SELECT COUNT(*) FROM employees');
        const before = parseInt(beforeCount.rows[0].count);
        console.log(`📊 [ADMIN] Before: ${before} employees`);
        
        // Delete all employees (this will cascade to all related tables)
        const deleteResult = await client.query('DELETE FROM employees');
        console.log(`🔥 [ADMIN] Deleted ${deleteResult.rowCount} employees`);
        
        // Reset the auto-increment sequence
        await client.query('ALTER SEQUENCE employees_id_seq RESTART WITH 1');
        console.log('🔄 [ADMIN] Reset employee ID sequence to 1');
        
        // Get count after deletion
        const afterCount = await client.query('SELECT COUNT(*) FROM employees');
        const after = parseInt(afterCount.rows[0].count);
        
        // Get counts from related tables
        const relatedCounts = {};
        const tables = [
            'time_entries', 'timecard_entries', 'timecards',
            'payroll_calculations', 'agent_commission', 
            'employee_commission_monthly', 'hourly_payout'
        ];
        
        for (const table of tables) {
            try {
                const count = await client.query(`SELECT COUNT(*) FROM ${table}`);
                relatedCounts[table] = parseInt(count.rows[0].count);
            } catch (err) {
                relatedCounts[table] = 'N/A';
            }
        }
        
        await client.query('COMMIT');
        
        console.log('✅ [ADMIN] All employees deleted successfully!');
        
        res.json({
            success: true,
            message: 'All employees deleted successfully',
            deleted_count: deleteResult.rowCount,
            before_count: before,
            after_count: after,
            related_tables: relatedCounts,
            note: 'Database is now empty and ready for fresh timecard imports'
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ [ADMIN] Error deleting employees:', error);
        res.status(500).json({ 
            error: 'Failed to delete employees', 
            details: error.message 
        });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/admin-cleanup/all-data
 * Delete ALL data including employees, commissions, bonuses, hourly payouts
 */
r.delete("/all-data", async (req, res) => {
    console.log('🗑️ [ADMIN] Deleting ALL DATA (nuclear option)...');
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Delete in correct order to avoid foreign key issues
        const tables = [
            'timecard_entries',
            'timecards',
            'time_entries',
            'payroll_calculations',
            'hourly_payout',
            'agent_commission',
            'employee_commission_monthly',
            'bonuses',
            'employees'
        ];
        
        const deletedCounts = {};
        
        for (const table of tables) {
            try {
                const result = await client.query(`DELETE FROM ${table}`);
                deletedCounts[table] = result.rowCount;
                console.log(`🔥 [ADMIN] Deleted ${result.rowCount} records from ${table}`);
            } catch (err) {
                console.error(`⚠️ [ADMIN] Could not delete from ${table}:`, err.message);
                deletedCounts[table] = `Error: ${err.message}`;
            }
        }
        
        // Reset sequences
        await client.query('ALTER SEQUENCE employees_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE timecards_id_seq RESTART WITH 1');
        
        await client.query('COMMIT');
        
        console.log('✅ [ADMIN] All data deleted successfully!');
        
        res.json({
            success: true,
            message: 'All data deleted successfully (nuclear cleanup)',
            deleted_records: deletedCounts,
            note: 'Database is completely clean. Upload timecards to start fresh.'
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ [ADMIN] Error in nuclear cleanup:', error);
        res.status(500).json({ 
            error: 'Failed to delete all data', 
            details: error.message 
        });
    } finally {
        client.release();
    }
});

/**
 * POST /api/admin-cleanup/recreate-admin
 * Recreate or reset the admin user account
 */
r.post("/recreate-admin", async (req, res) => {
    console.log('🔐 [ADMIN] Recreating admin user...');
    
    try {
        // Default admin credentials
        const username = 'admin';
        const email = 'admin@hrsystem.com';
        const password = 'admin123';
        const role = 'Admin';
        
        // Hash password (simple for now - in production use bcrypt)
        const crypto = await import('crypto');
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
        
        // Check if admin user exists
        const existingUser = await q(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        
        if (existingUser.rows.length > 0) {
            // Update existing user
            await q(
                `UPDATE users 
                 SET password_hash = $1, role = $2, is_active = true, failed_login_attempts = 0, locked_until = NULL
                 WHERE username = $3 OR email = $4`,
                [passwordHash, role, username, email]
            );
            console.log('✅ [ADMIN] Updated existing admin user');
        } else {
            // Create new admin user
            await q(
                `INSERT INTO users (username, email, password_hash, role, is_active)
                 VALUES ($1, $2, $3, $4, true)`,
                [username, email, passwordHash, role]
            );
            console.log('✅ [ADMIN] Created new admin user');
        }
        
        res.json({
            success: true,
            message: 'Admin user recreated/reset successfully',
            credentials: {
                username: username,
                email: email,
                password: password,
                role: role
            },
            note: 'Use these credentials to log in'
        });
        
    } catch (error) {
        console.error('❌ [ADMIN] Error recreating admin user:', error);
        res.status(500).json({ 
            error: 'Failed to recreate admin user', 
            details: error.message 
        });
    }
});

/**
 * DELETE /api/admin-cleanup/time-tracking
 * Delete ALL time tracking data (timecards, entries, uploads)
 */
r.delete("/time-tracking", async (req, res) => {
    console.log('🗑️ [ADMIN] Deleting ALL time tracking data...');
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get counts before deletion
        const beforeUploads = await client.query('SELECT COUNT(*) FROM timecard_uploads');
        const beforeTimecards = await client.query('SELECT COUNT(*) FROM timecards');
        const beforeEntries = await client.query('SELECT COUNT(*) FROM timecard_entries');
        const beforeTimeEntries = await client.query('SELECT COUNT(*) FROM time_entries');
        
        console.log(`📊 [ADMIN] Before deletion:`);
        console.log(`   - Timecard uploads: ${beforeUploads.rows[0].count}`);
        console.log(`   - Timecards: ${beforeTimecards.rows[0].count}`);
        console.log(`   - Timecard entries: ${beforeEntries.rows[0].count}`);
        console.log(`   - Time entries: ${beforeTimeEntries.rows[0].count}`);
        
        // Delete in correct order (child tables first)
        await client.query('DELETE FROM timecard_entries');
        console.log('✅ [ADMIN] Deleted all timecard_entries');
        
        await client.query('DELETE FROM timecards');
        console.log('✅ [ADMIN] Deleted all timecards');
        
        await client.query('DELETE FROM timecard_uploads');
        console.log('✅ [ADMIN] Deleted all timecard_uploads');
        
        await client.query('DELETE FROM time_entries');
        console.log('✅ [ADMIN] Deleted all time_entries');
        
        // Reset sequences
        await client.query('ALTER SEQUENCE timecard_uploads_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE timecards_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE timecard_entries_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE time_entries_id_seq RESTART WITH 1');
        console.log('🔄 [ADMIN] Reset all time tracking sequences');
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'All time tracking data deleted successfully',
            deleted: {
                timecard_uploads: parseInt(beforeUploads.rows[0].count),
                timecards: parseInt(beforeTimecards.rows[0].count),
                timecard_entries: parseInt(beforeEntries.rows[0].count),
                time_entries: parseInt(beforeTimeEntries.rows[0].count)
            }
        });
        
        console.log('✅ [ADMIN] Time tracking cleanup completed successfully');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ [ADMIN] Error deleting time tracking data:', error);
        res.status(500).json({ 
            error: 'Failed to delete time tracking data', 
            details: error.message 
        });
    } finally {
        client.release();
    }
});

export default r;
