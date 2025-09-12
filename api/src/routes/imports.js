import { Router } from "express";
import { q } from "../db.js";
import dbPool from "../utils/dbPool.js";
import { parse } from "csv-parse/sync";

const r = Router();

// POST /api/imports/time-entries  (raw CSV text in body {csv: "..."} )
r.post("/time-entries", async (req, res) => {
  const csv = req.body.csv;
  if (!csv) return res.status(400).json({ error: "csv required" });
  
  try {
    const rows = parse(csv, { columns: true, skip_empty_lines: true });
    console.log(`📥 Importing ${rows.length} time entries from CSV`);
    
    if (rows.length === 0) {
      return res.status(400).json({ error: "No data found in CSV file" });
    }
    
    // Log the column headers for debugging
    console.log('📋 CSV Columns:', Object.keys(rows[0]));
    
    // Use the database pool's transaction method
    const result = await dbPool.transaction(async (client) => {
      let insertedCount = 0;
      let skippedCount = 0;
      
      for (const row of rows) {
        try {
          // Calculate hours_worked from clock_in and clock_out if not provided
          let hoursWorked = parseFloat(row.hours_worked) || 0;
          
          if (!hoursWorked && row.clock_in && row.clock_out) {
            const clockIn = new Date(`${row.work_date}T${row.clock_in}`);
            const clockOut = new Date(`${row.work_date}T${row.clock_out}`);
            const diffMs = clockOut - clockIn;
            hoursWorked = Math.max(0, diffMs / (1000 * 60 * 60)); // Convert to hours
          }
          
          // Validate required fields
          if (!row.employee_id || !row.work_date) {
            console.log(`⚠️ Skipping row - missing employee_id or work_date:`, row);
            skippedCount++;
            continue;
          }
          
          await client.query(
            `INSERT INTO time_entries 
             (employee_id, work_date, clock_in, clock_out, hours_worked, was_late, left_early, overtime_hours)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (employee_id, work_date) 
             DO UPDATE SET 
               clock_in = EXCLUDED.clock_in,
               clock_out = EXCLUDED.clock_out,
               hours_worked = EXCLUDED.hours_worked,
               was_late = EXCLUDED.was_late,
               left_early = EXCLUDED.left_early,
               overtime_hours = EXCLUDED.overtime_hours`,
            [
              Number(row.employee_id),
              row.work_date,
              row.clock_in || null,
              row.clock_out || null,
              hoursWorked,
              row.was_late?.toLowerCase() === "true" || false,
              row.left_early?.toLowerCase() === "true" || false,
              Number(row.overtime_hours || 0)
            ]
          );
          insertedCount++;
          
        } catch (rowError) {
          console.error(`❌ Error processing row:`, row, rowError);
          skippedCount++;
        }
      }
      
      return { inserted: insertedCount, skipped: skippedCount };
    });
    
    console.log(`✅ Import completed: ${result.inserted} inserted, ${result.skipped} skipped`);
    res.json({ 
      inserted: result.inserted, 
      skipped: result.skipped,
      total: rows.length,
      message: `Successfully imported ${result.inserted} time entries` 
    });
    
  } catch (e) {
    console.error("Error importing time entries:", e);
    res.status(500).json({ error: e.message });
  }
});

export default r;
