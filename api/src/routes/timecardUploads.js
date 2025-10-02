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
    const startTime = Date.now();
    try {
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log(`📊 [Upload Stats] Request received at ${new Date().toISOString()}`);
        
        // Check cache first
        const now = Date.now();
        if (statsCache && (now - statsCacheTime) < CACHE_DURATION) {
            const cacheAge = Math.round((now - statsCacheTime) / 1000);
            console.log(`📊 [Upload Stats] ✅ Returning CACHED data (${cacheAge}s old)`);
            console.log(`📊 [Upload Stats] Cache contains:`);
            console.log(`   - Total Uploads: ${statsCache.summary.total_uploads}`);
            console.log(`   - Total Employees: ${statsCache.summary.total_employees}`);
            console.log(`   - Total Hours: ${statsCache.summary.total_hours}`);
            console.log(`   - Avg Hours/Employee: ${statsCache.summary.avg_hours_per_employee}`);
            console.log(`   - Top Employees: ${statsCache.topEmployees.length} records`);
            console.log(`   - Missing Punches: ${statsCache.missingPunches}`);
            console.log(`   - Latest Upload: ${statsCache.latestUpload?.filename || 'None'}`);
            console.log('═══════════════════════════════════════════════════════════\n');
            return res.json(statsCache);
        }
        
        console.log('📊 [Upload Stats] Cache MISS - fetching fresh data from database...');
        
        // DIAGNOSTIC: Check timecards table state BEFORE running main queries
        const diagnosticStart = Date.now();
        console.log('🔍 [Upload Stats] Running diagnostics...');
        
        const [uploadCheck, timecardCheck, linkCheck] = await Promise.all([
            q(`SELECT COUNT(*) as count, SUM(employee_count) as total_emp FROM timecard_uploads WHERE status = 'processed'`),
            q(`SELECT COUNT(*) as count, COUNT(DISTINCT employee_id) as unique_emp FROM timecards`),
            q(`SELECT 
                tu.id as upload_id, 
                tu.filename,
                tu.employee_count as expected_employees,
                COUNT(t.id) as actual_timecards,
                COUNT(DISTINCT t.employee_id) as unique_employees
               FROM timecard_uploads tu
               LEFT JOIN timecards t ON t.upload_id = tu.id
               WHERE tu.status = 'processed'
               GROUP BY tu.id, tu.filename, tu.employee_count`)
        ]);
        
        const diagTime = Date.now() - diagnosticStart;
        console.log(`🔍 [Upload Stats] Diagnostics completed in ${diagTime}ms:`);
        console.log(`   - Uploads table: ${uploadCheck.rows[0].count} processed uploads, ${uploadCheck.rows[0].total_emp} total employees expected`);
        console.log(`   - Timecards table: ${timecardCheck.rows[0].count} total records, ${timecardCheck.rows[0].unique_emp} unique employees`);
        console.log(`   - Join analysis:`);
        linkCheck.rows.forEach(row => {
            console.log(`      Upload #${row.upload_id} (${row.filename})`);
            console.log(`         Expected: ${row.expected_employees} employees`);
            console.log(`         Found: ${row.actual_timecards} timecards, ${row.unique_employees} unique employees`);
            if (row.unique_employees === '0') {
                console.error(`         ❌ WARNING: No timecards found for this upload!`);
            }
        });
        
        // Optimized: Run queries in parallel
        const queryStart = Date.now();
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
        
        const queryTime = Date.now() - queryStart;
        console.log(`📊 [Upload Stats] ✅ All queries executed in ${queryTime}ms`);
        
        const result = {
            summary: stats.rows[0],
            topEmployees: topEmployees.rows,
            missingPunches: missingPunches.rows[0].count,
            latestUpload: latestUpload.rows[0] || null
        };
        
        // Log what we got
        console.log(`📊 [Upload Stats] ✅ Data fetched:`);
        console.log(`   - Total Uploads: ${result.summary.total_uploads}`);
        console.log(`   - Total Employees: ${result.summary.total_employees}`);
        console.log(`   - Total Hours: ${result.summary.total_hours}`);
        console.log(`   - Avg Hours/Employee: ${result.summary.avg_hours_per_employee}`);
        console.log(`   - Top Employees: ${result.topEmployees.length} records`);
        if (result.topEmployees.length > 0) {
            result.topEmployees.forEach((emp, idx) => {
                console.log(`      ${idx + 1}. ${emp.name}: ${emp.total_hours} hours`);
            });
        } else {
            console.log(`      ⚠️ WARNING: No top employees found!`);
        }
        console.log(`   - Missing Punches: ${result.missingPunches}`);
        console.log(`   - Latest Upload: ${result.latestUpload?.filename || 'None'}`);
        
        // Cache the result
        statsCache = result;
        statsCacheTime = now;
        
        const totalTime = Date.now() - startTime;
        console.log(`📊 [Upload Stats] ✅ Total request time: ${totalTime}ms`);
        console.log(`📊 [Upload Stats] ✅ Data cached for 30 seconds`);
        console.log('═══════════════════════════════════════════════════════════\n');
        
        res.json(result);
    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error('\n═══════════════════════════════════════════════════════════');
        console.error(`❌ [Upload Stats] ERROR after ${totalTime}ms:`, error.message);
        console.error(`❌ [Upload Stats] Stack:`, error.stack);
        console.error('═══════════════════════════════════════════════════════════\n');
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

export default router;

