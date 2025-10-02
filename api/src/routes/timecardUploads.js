import express from 'express';
import multer from 'multer';
import { q } from '../db.js';
import { importTimecardsForDisplay } from '../utils/timecardDisplayImporter.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all timecard uploads (for list/dashboard)
router.get('/uploads', async (req, res) => {
    try {
        const uploads = await q(`
            SELECT 
                id,
                filename,
                pay_period_start,
                pay_period_end,
                upload_date,
                employee_count,
                total_hours,
                status
            FROM timecard_uploads
            ORDER BY upload_date DESC
        `);
        
        res.json(uploads.rows);
    } catch (error) {
        console.error('Error fetching uploads:', error);
        res.status(500).json({ error: 'Failed to fetch uploads' });
    }
});

// Get single upload details
router.get('/uploads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const upload = await q(`
            SELECT *
            FROM timecard_uploads
            WHERE id = $1
        `, [id]);
        
        if (upload.rows.length === 0) {
            return res.status(404).json({ error: 'Upload not found' });
        }
        
        res.json(upload.rows[0]);
    } catch (error) {
        console.error('Error fetching upload:', error);
        res.status(500).json({ error: 'Failed to fetch upload' });
    }
});

// Get all employees for an upload
router.get('/uploads/:id/employees', async (req, res) => {
    try {
        const { id } = req.params;
        
        const employees = await q(`
            SELECT DISTINCT
                e.id,
                e.first_name,
                e.last_name,
                e.first_name || ' ' || e.last_name as full_name,
                t.total_hours
            FROM timecards t
            JOIN employees e ON t.employee_id = e.id
            WHERE t.upload_id = $1
            ORDER BY e.first_name, e.last_name
        `, [id]);
        
        res.json(employees.rows);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

// Get timecard entries for specific employee in an upload
router.get('/uploads/:uploadId/employees/:employeeId/entries', async (req, res) => {
    try {
        const { uploadId, employeeId } = req.params;
        
        // Get the timecard
        const timecard = await q(`
            SELECT id, pay_period_start, pay_period_end, total_hours
            FROM timecards
            WHERE upload_id = $1 AND employee_id = $2
        `, [uploadId, employeeId]);
        
        if (timecard.rows.length === 0) {
            return res.status(404).json({ error: 'Timecard not found' });
        }
        
        // Get all entries
        const entries = await q(`
            SELECT 
                id,
                work_date,
                day_of_week,
                clock_in,
                clock_out,
                hours_worked,
                daily_total,
                notes,
                row_order,
                is_first_row
            FROM timecard_entries
            WHERE timecard_id = $1
            ORDER BY work_date, row_order
        `, [timecard.rows[0].id]);
        
        res.json({
            timecard: timecard.rows[0],
            entries: entries.rows
        });
    } catch (error) {
        console.error('Error fetching entries:', error);
        res.status(500).json({ error: 'Failed to fetch entries' });
    }
});

// Upload new timecard file
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const filename = req.file.originalname;
        const fileBuffer = req.file.buffer;
        
        console.log(`📤 Uploading timecard file: ${filename}`);
        
        // Import and save for display
        const result = await importTimecardsForDisplay(fileBuffer, filename);
        
        if (result.error) {
            return res.status(400).json({ error: result.error, details: result.details });
        }
        
        // Invalidate stats cache after successful upload
        invalidateStatsCache();
        
        res.json({
            success: true,
            uploadId: result.uploadId,
            employeeCount: result.employeeCount,
            totalHours: result.totalHours,
            message: `Successfully uploaded timecard for ${result.employeeCount} employees`
        });
        
    } catch (error) {
        console.error('Error uploading timecard:', error);
        res.status(500).json({ error: 'Failed to upload timecard', details: error.message });
    }
});

// Cache for stats (refreshed every 30 seconds or on new upload)
let statsCache = null;
let statsCacheTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Helper to invalidate cache
function invalidateStatsCache() {
    statsCache = null;
    statsCacheTime = 0;
    console.log('📊 [Stats] Cache invalidated');
}

// Get dashboard statistics (optimized with caching)
router.get('/stats', async (req, res) => {
    try {
        // Check cache first
        const now = Date.now();
        if (statsCache && (now - statsCacheTime) < CACHE_DURATION) {
            console.log('📊 [Stats] Returning cached data');
            return res.json(statsCache);
        }
        
        console.log('📊 [Stats] Fetching fresh data...');
        
        // Optimized: Run queries in parallel
        const [stats, topEmployees, missingPunches, latestUpload] = await Promise.all([
            // Summary stats
            q(`
                SELECT
                    COUNT(DISTINCT tu.id) as total_uploads,
                    COUNT(DISTINCT t.employee_id) as total_employees,
                    COALESCE(SUM(tu.total_hours), 0) as total_hours,
                    COALESCE(AVG(tu.total_hours / NULLIF(tu.employee_count, 0)), 0) as avg_hours_per_employee
                FROM timecard_uploads tu
                LEFT JOIN timecards t ON t.upload_id = tu.id
                WHERE tu.status = 'processed'
            `),
            
            // Top 5 employees (simplified query)
            q(`
                SELECT 
                    e.id,
                    e.first_name || ' ' || e.last_name as name,
                    SUM(t.total_hours) as total_hours
                FROM timecards t
                JOIN employees e ON t.employee_id = e.id
                WHERE t.upload_id IS NOT NULL
                GROUP BY e.id, e.first_name, e.last_name
                ORDER BY total_hours DESC
                LIMIT 5
            `),
            
            // Missing punches count (optimized)
            q(`
                SELECT COUNT(*) as count
                FROM timecard_entries
                WHERE notes ILIKE '%Missing%'
            `),
            
            // Latest upload
            q(`
                SELECT upload_date, filename
                FROM timecard_uploads
                WHERE status = 'processed'
                ORDER BY upload_date DESC
                LIMIT 1
            `)
        ]);
        
        const result = {
            summary: stats.rows[0],
            topEmployees: topEmployees.rows,
            missingPunches: missingPunches.rows[0].count,
            latestUpload: latestUpload.rows[0] || null
        };
        
        // Cache the result
        statsCache = result;
        statsCacheTime = now;
        
        console.log('📊 [Stats] Fresh data cached');
        res.json(result);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

export default router;

