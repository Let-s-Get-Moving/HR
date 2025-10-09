import express from "express";
import { z } from "zod";
import { q } from "../db.js";
import multer from "multer";
import { importTimecardsFromExcel } from "../utils/timecardImporter.js";

const r = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all timecards with filters
r.get("/", async (req, res) => {
  const startTime = Date.now();
  try {
    const { employee_id, pay_period_start, pay_period_end, status } = req.query;
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`📊 [Timecards GET] Request received at ${new Date().toISOString()}`);
    console.log(`📊 [Timecards GET] Filters:`, { employee_id, pay_period_start, pay_period_end, status });
    
    // SIMPLIFIED QUERY: No complex OR logic, just match exactly what we need
    let query = `
      SELECT 
        t.*,
        e.first_name,
        e.last_name,
        e.email,
        e.role_title,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name
      FROM timecards t
      JOIN employees e ON t.employee_id = e.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (employee_id) {
      query += ` AND t.employee_id = $${paramCount}`;
      params.push(employee_id);
      console.log(`📊 [Timecards GET] Added employee_id filter: ${employee_id}`);
      paramCount++;
    }
    
    if (pay_period_start && pay_period_end) {
      // Simple exact match on timecard dates
      query += ` AND t.pay_period_start = $${paramCount}::DATE AND t.pay_period_end = $${paramCount + 1}::DATE`;
      params.push(pay_period_start);
      params.push(pay_period_end);
      console.log(`📊 [Timecards GET] Added period filter: ${pay_period_start} to ${pay_period_end}`);
      paramCount += 2;
    } else if (pay_period_start) {
      query += ` AND t.pay_period_start >= $${paramCount}::DATE`;
      params.push(pay_period_start);
      console.log(`📊 [Timecards GET] Added start date filter: >= ${pay_period_start}`);
      paramCount++;
    } else if (pay_period_end) {
      query += ` AND t.pay_period_end <= $${paramCount}::DATE`;
      params.push(pay_period_end);
      console.log(`📊 [Timecards GET] Added end date filter: <= ${pay_period_end}`);
      paramCount++;
    }
    
    if (status) {
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
      console.log(`📊 [Timecards GET] Added status filter: ${status}`);
      paramCount++;
    }
    
    query += ` ORDER BY t.pay_period_start DESC, e.first_name, e.last_name`;
    
    console.log(`📊 [Timecards GET] Final query params:`, params);
    
    const queryStart = Date.now();
    const { rows } = await q(query, params);
    const queryTime = Date.now() - queryStart;
    
    console.log(`📊 [Timecards GET] ✅ Query executed in ${queryTime}ms`);
    console.log(`📊 [Timecards GET] ✅ Found ${rows.length} timecards`);
    
    // DEBUG: If no results but we expected some, check the database
    if (rows.length === 0 && pay_period_start && pay_period_end) {
      console.log(`⚠️ [Timecards GET] No results found - running diagnostics...`);
      
      const debugCheck = await q(`
        SELECT COUNT(*) as count, 
               MIN(pay_period_start) as min_start, 
               MAX(pay_period_end) as max_end 
        FROM timecards
      `);
      console.log(`🔍 [Timecards GET] Total timecards in DB:`, debugCheck.rows[0]);
      
      const periodCheck = await q(`
        SELECT COUNT(*) as count 
        FROM timecards 
        WHERE pay_period_start::TEXT LIKE $1 AND pay_period_end::TEXT LIKE $2
      `, [`%${pay_period_start}%`, `%${pay_period_end}%`]);
      console.log(`🔍 [Timecards GET] Fuzzy match count:`, periodCheck.rows[0].count);
      
      // Check exact date values in DB
      const sampleCheck = await q(`
        SELECT DISTINCT 
          pay_period_start::TEXT as start_text, 
          pay_period_end::TEXT as end_text
        FROM timecards
        LIMIT 5
      `);
      console.log(`🔍 [Timecards GET] Sample date formats in DB:`, sampleCheck.rows);
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`📊 [Timecards GET] ✅ Total request time: ${totalTime}ms`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    res.json(rows);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error(`❌ [Timecards GET] ERROR after ${totalTime}ms:`, error.message);
    console.error(`❌ [Timecards GET] Stack:`, error.stack);
    console.error('═══════════════════════════════════════════════════════════\n');
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all timecard entries for a specific day
 * Shows all employees who worked on that day
 */
r.get("/day-view/:date", async (req, res) => {
  try {
    const { date } = req.params;
    
    console.log(`\n🌅 [Day View] Getting data for ${date}`);
    
    const { rows } = await q(`
      SELECT 
        e.id as employee_id,
        e.first_name,
        e.last_name,
        e.email,
        d.name as department,
        te.id as entry_id,
        te.work_date,
        te.clock_in,
        te.clock_out,
        te.hours_worked,
        te.is_overtime,
        te.notes,
        t.status as timecard_status,
        te.day_of_week
      FROM timecard_entries te
      JOIN timecards t ON te.timecard_id = t.id
      JOIN employees e ON t.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE te.work_date = $1::date
      ORDER BY e.last_name, e.first_name, te.clock_in
    `, [date]);
    
    console.log(`🌅 [Day View] Found ${rows.length} entries for ${date}`);
    
    res.json(rows);
  } catch (error) {
    console.error("❌ [Day View] Error:", error);
    res.status(500).json({ error: "Failed to fetch day view" });
  }
});

/**
 * Get list of dates with timecard entries (for date picker)
 */
r.get("/dates-with-data", async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT DISTINCT work_date::date
      FROM timecard_entries
      ORDER BY work_date DESC
      LIMIT 365
    `);
    
    // Format dates as YYYY-MM-DD strings for date picker
    const formattedDates = rows.map(r => {
      const date = new Date(r.work_date);
      return date.toISOString().split('T')[0];
    });
    
    console.log(`📅 [Dates API] Found ${formattedDates.length} dates, latest: ${formattedDates[0]}`);
    
    res.json(formattedDates);
  } catch (error) {
    console.error("❌ [Dates] Error:", error);
    res.status(500).json({ error: "Failed to fetch dates" });
  }
});

// Get timecard by ID with all entries
r.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get timecard details
    const { rows: timecards } = await q(
      `SELECT 
        t.*,
        e.first_name,
        e.last_name,
        e.email,
        e.role_title,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name
      FROM timecards t
      JOIN employees e ON t.employee_id = e.id
      WHERE t.id = $1`,
      [id]
    );
    
    if (timecards.length === 0) {
      return res.status(404).json({ error: "Timecard not found" });
    }
    
    // Get all entries for this timecard
    const { rows: entries } = await q(
      `SELECT * FROM timecard_entries 
       WHERE timecard_id = $1 
       ORDER BY work_date, clock_in`,
      [id]
    );
    
    const timecard = timecards[0];
    timecard.entries = entries;
    
    res.json(timecard);
  } catch (error) {
    console.error("Error fetching timecard:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get timecard entries for a specific employee and pay period
r.get("/employee/:employee_id/period", async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { pay_period_start, pay_period_end } = req.query;
    
    if (!pay_period_start || !pay_period_end) {
      return res.status(400).json({ error: "pay_period_start and pay_period_end required" });
    }
    
    const { rows } = await q(
      `SELECT 
        t.*,
        e.first_name,
        e.last_name,
        e.email,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name
      FROM timecards t
      JOIN employees e ON t.employee_id = e.id
      WHERE t.employee_id = $1 
        AND t.pay_period_start = $2 
        AND t.pay_period_end = $3`,
      [employee_id, pay_period_start, pay_period_end]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Timecard not found" });
    }
    
    // Get entries
    const { rows: entries } = await q(
      `SELECT * FROM timecard_entries 
       WHERE timecard_id = $1 
       ORDER BY work_date, clock_in`,
      [rows[0].id]
    );
    
    const timecard = rows[0];
    timecard.entries = entries;
    
    res.json(timecard);
  } catch (error) {
    console.error("Error fetching timecard:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get summary statistics (for dashboard)
r.get("/stats/summary", async (req, res) => {
  try {
    const { pay_period_start, pay_period_end } = req.query;
    
    if (!pay_period_start || !pay_period_end) {
      return res.status(400).json({ error: "pay_period_start and pay_period_end required" });
    }
    
    // Get totals by employee
    const { rows: employeeTotals } = await q(
      `SELECT 
        e.id as employee_id,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        t.total_hours,
        t.overtime_hours,
        t.status,
        (
          SELECT COUNT(*) 
          FROM timecard_entries te 
          WHERE te.timecard_id = t.id 
            AND (te.clock_out IS NULL OR te.notes ILIKE '%missing%')
        ) as missing_punches_count
      FROM timecards t
      JOIN employees e ON t.employee_id = e.id
      WHERE t.pay_period_start = $1 AND t.pay_period_end = $2
      ORDER BY e.first_name, e.last_name`,
      [pay_period_start, pay_period_end]
    );
    
    // Calculate overall statistics
    const totalHours = employeeTotals.reduce((sum, emp) => sum + parseFloat(emp.total_hours || 0), 0);
    const totalOvertime = employeeTotals.reduce((sum, emp) => sum + parseFloat(emp.overtime_hours || 0), 0);
    const totalMissingPunches = employeeTotals.reduce((sum, emp) => sum + parseInt(emp.missing_punches_count || 0), 0);
    const employeesWithOvertime = employeeTotals.filter(emp => parseFloat(emp.overtime_hours || 0) > 0).length;
    
    res.json({
      period: {
        start: pay_period_start,
        end: pay_period_end
      },
      summary: {
        total_employees: employeeTotals.length,
        total_hours: totalHours,
        total_overtime: totalOvertime,
        total_missing_punches: totalMissingPunches,
        employees_with_overtime: employeesWithOvertime
      },
      employees: employeeTotals
    });
  } catch (error) {
    console.error("Error fetching timecard stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all pay periods that have timecards (from uploads)
r.get("/periods/list", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`📅 [Periods LIST] Request received at ${new Date().toISOString()}`);
    
    const { rows } = await q(
      `SELECT DISTINCT 
        pay_period_start,
        pay_period_end,
        TO_CHAR(pay_period_start, 'YYYY-MM-DD') || ' - ' || TO_CHAR(pay_period_end, 'YYYY-MM-DD') as period_label,
        employee_count as timecard_count
      FROM timecard_uploads
      WHERE status = 'processed'
      ORDER BY pay_period_start DESC`
    );
    
    const totalTime = Date.now() - startTime;
    console.log(`📅 [Periods LIST] ✅ Query executed in ${totalTime}ms`);
    console.log(`📅 [Periods LIST] ✅ Found ${rows.length} periods`);
    
    if (rows.length > 0) {
      console.log(`📅 [Periods LIST] Periods returned:`);
      rows.forEach((period, idx) => {
        console.log(`   ${idx + 1}. ${period.period_label} (${period.timecard_count} timecards)`);
        console.log(`      - Start: ${period.pay_period_start}`);
        console.log(`      - End: ${period.pay_period_end}`);
      });
    } else {
      console.log(`⚠️ [Periods LIST] WARNING: No periods found in timecard_uploads table`);
      
      // Check if there are ANY uploads at all
      const uploadCheck = await q(`SELECT COUNT(*) as count, status FROM timecard_uploads GROUP BY status`);
      console.log(`🔍 [Periods LIST] Upload status breakdown:`, uploadCheck.rows);
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
    res.json(rows);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error(`❌ [Periods LIST] ERROR after ${totalTime}ms:`, error.message);
    console.error(`❌ [Periods LIST] Stack:`, error.stack);
    console.error('═══════════════════════════════════════════════════════════\n');
    res.status(500).json({ error: error.message });
  }
});

// Excel import endpoint
r.post("/import", upload.single('excel_file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No Excel file uploaded" });
    }

    const { sheet_name, pay_period_start, pay_period_end } = req.body;
    
    console.log(`Starting timecard import for file: ${req.file.originalname}`);
    
    const summary = await importTimecardsFromExcel(
      req.file.buffer, 
      req.file.originalname,
      sheet_name,
      pay_period_start,
      pay_period_end
    );
    
    console.log(`Timecard import completed:`, summary);
    
    res.json({
      message: "Timecard import completed successfully",
      summary: summary
    });
    
  } catch (error) {
    console.error("Timecard import failed:", error);
    res.status(500).json({ 
      error: "Timecard import failed", 
      details: error.message 
    });
  }
});

// Create or update timecard entry (for admin edits)
r.post("/entries", async (req, res) => {
  try {
    const entrySchema = z.object({
      timecard_id: z.number().optional(),
      employee_id: z.number(),
      work_date: z.string(),
      clock_in: z.string().nullable(),
      clock_out: z.string().nullable(),
      notes: z.string().optional().nullable()
    });
    
    const data = entrySchema.parse(req.body);
    
    // Calculate hours worked
    let hours_worked = null;
    if (data.clock_in && data.clock_out) {
      const inTime = new Date(`${data.work_date}T${data.clock_in}`);
      const outTime = new Date(`${data.work_date}T${data.clock_out}`);
      const diff = (outTime - inTime) / (1000 * 60 * 60); // Convert to hours
      hours_worked = Math.round(diff * 100) / 100; // Round to 2 decimals
    }
    
    // If timecard_id not provided, find or create timecard
    let timecard_id = data.timecard_id;
    if (!timecard_id) {
      // Try to find existing timecard or create one
      const { rows: existingTimecard } = await q(
        `SELECT id FROM timecards 
         WHERE employee_id = $1 
           AND $2 BETWEEN pay_period_start AND pay_period_end`,
        [data.employee_id, data.work_date]
      );
      
      if (existingTimecard.length > 0) {
        timecard_id = existingTimecard[0].id;
      } else {
        // Need pay period info to create timecard
        return res.status(400).json({ 
          error: "No timecard found for this employee and date. Please provide timecard_id or pay period." 
        });
      }
    }
    
    const { rows } = await q(
      `INSERT INTO timecard_entries 
       (timecard_id, employee_id, work_date, clock_in, clock_out, hours_worked, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [timecard_id, data.employee_id, data.work_date, data.clock_in, data.clock_out, hours_worked, data.notes]
    );
    
    res.json(rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    console.error("Error creating timecard entry:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update timecard entry
r.put("/entries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const entrySchema = z.object({
      work_date: z.string().optional(),
      clock_in: z.string().nullable().optional(),
      clock_out: z.string().nullable().optional(),
      notes: z.string().nullable().optional()
    });
    
    const data = entrySchema.parse(req.body);
    
    // Get existing entry
    const { rows: existing } = await q(
      `SELECT * FROM timecard_entries WHERE id = $1`,
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }
    
    const entry = existing[0];
    const work_date = data.work_date || entry.work_date;
    const clock_in = data.clock_in !== undefined ? data.clock_in : entry.clock_in;
    const clock_out = data.clock_out !== undefined ? data.clock_out : entry.clock_out;
    
    // Recalculate hours
    let hours_worked = null;
    if (clock_in && clock_out) {
      const inTime = new Date(`${work_date}T${clock_in}`);
      const outTime = new Date(`${work_date}T${clock_out}`);
      const diff = (outTime - inTime) / (1000 * 60 * 60);
      hours_worked = Math.round(diff * 100) / 100;
    }
    
    const { rows } = await q(
      `UPDATE timecard_entries 
       SET work_date = $1, clock_in = $2, clock_out = $3, 
           hours_worked = $4, notes = $5
       WHERE id = $6
       RETURNING *`,
      [work_date, clock_in, clock_out, hours_worked, data.notes, id]
    );
    
    res.json(rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    console.error("Error updating timecard entry:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete timecard entry
r.delete("/entries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await q(
      `DELETE FROM timecard_entries WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }
    
    res.json({ message: "Entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting timecard entry:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update a timecard entry (clock times, notes)
 * Recalculates hours automatically
 */
r.put("/entries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { clock_in, clock_out, notes } = req.body;
    
    console.log(`\n✏️ [Edit Entry] Updating entry ${id}`);
    console.log(`   Request body:`, req.body);
    console.log(`   Clock In: ${clock_in}, Clock Out: ${clock_out}`);
    
    // Normalize time format (add :00 seconds if missing)
    const normalizeTime = (time) => {
      if (!time) return null;
      // If format is HH:MM, add :00 seconds
      if (time.length === 5 && time.match(/^\d{2}:\d{2}$/)) {
        return time + ':00';
      }
      return time;
    };
    
    const normalizedClockIn = normalizeTime(clock_in);
    const normalizedClockOut = normalizeTime(clock_out);
    
    console.log(`   Normalized Clock In: ${normalizedClockIn}`);
    console.log(`   Normalized Clock Out: ${normalizedClockOut}`);
    
    // Calculate hours if both times provided
    let hours_worked = null;
    let is_overtime = false;
    
    if (normalizedClockIn && normalizedClockOut) {
      console.log(`   Creating date objects with:
         - clockIn: 1970-01-01T${normalizedClockIn}
         - clockOut: 1970-01-01T${normalizedClockOut}`);
      
      // Parse the times - split by colon and create date manually
      const [inHour, inMin, inSec = '00'] = normalizedClockIn.split(':');
      const [outHour, outMin, outSec = '00'] = normalizedClockOut.split(':');
      
      console.log(`   Parsed clock in: ${inHour}:${inMin}:${inSec}`);
      console.log(`   Parsed clock out: ${outHour}:${outMin}:${outSec}`);
      
      // Create dates using specific components (more reliable than string parsing)
      const start = new Date(1970, 0, 1, parseInt(inHour), parseInt(inMin), parseInt(inSec));
      const end = new Date(1970, 0, 1, parseInt(outHour), parseInt(outMin), parseInt(outSec));
      
      console.log(`   Start date object: ${start}`);
      console.log(`   End date object: ${end}`);
      console.log(`   Start timestamp: ${start.getTime()}`);
      console.log(`   End timestamp: ${end.getTime()}`);
      console.log(`   Start is valid: ${!isNaN(start.getTime())}`);
      console.log(`   End is valid: ${!isNaN(end.getTime())}`);
      
      // Check if dates are valid before calculation
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error(`❌ [Edit Entry] Invalid date objects - cannot parse times`);
        return res.status(400).json({ error: "Invalid time format - cannot parse times" });
      }
      
      // Handle overnight shifts
      if (end < start) {
        end.setDate(end.getDate() + 1);
        console.log(`   Overnight shift detected, adjusted end: ${end}`);
      }
      
      const millisDiff = end.getTime() - start.getTime();
      hours_worked = millisDiff / (1000 * 60 * 60); // Convert to hours
      
      console.log(`   Milliseconds difference: ${millisDiff}`);
      console.log(`   Calculated hours_worked: ${hours_worked}`);
      console.log(`   Is NaN: ${isNaN(hours_worked)}`);
      
      // CRITICAL: If result is NaN, something went wrong
      if (isNaN(hours_worked) || hours_worked === null || hours_worked === undefined) {
        console.error(`❌ [Edit Entry] Calculation resulted in NaN/null/undefined`);
        console.error(`   This should not happen - check time parsing`);
        return res.status(400).json({ error: "Failed to calculate hours - invalid time values" });
      }
      
      is_overtime = hours_worked > 8;
      console.log(`   Final hours: ${hours_worked.toFixed(2)}, Overtime: ${is_overtime}`);
    }
    
    // Update the entry
    console.log(`   Executing UPDATE query...`);
    const { rows } = await q(`
      UPDATE timecard_entries
      SET 
        clock_in = $1,
        clock_out = $2,
        hours_worked = $3,
        is_overtime = $4,
        notes = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [normalizedClockIn, normalizedClockOut, hours_worked, is_overtime, notes, id]);
    
    if (rows.length === 0) {
      console.error(`❌ [Edit Entry] Entry ${id} not found`);
      return res.status(404).json({ error: "Entry not found" });
    }
    
    console.log(`✅ [Edit Entry] Entry ${id} updated successfully`);
    console.log(`   Updated entry:`, rows[0]);
    
    res.json(rows[0]);
  } catch (error) {
    console.error("❌ [Edit Entry] Error:", error);
    console.error("   Stack:", error.stack);
    res.status(500).json({ error: "Failed to update entry" });
  }
});

export default r;
