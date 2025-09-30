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

export default r;

