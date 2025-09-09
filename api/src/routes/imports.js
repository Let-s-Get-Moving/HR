import { Router } from "express";
import { q } from "../db.js";
import dbPool from "../utils/dbPool.js";
import { parse } from "csv-parse/sync";

const r = Router();

// POST /api/imports/time-entries  (raw CSV text in body {csv: "..."} )
r.post("/time-entries", async (req, res) => {
  const csv = req.body.csv;
  if (!csv) return res.status(400).json({ error: "csv required" });
  const rows = parse(csv, { columns: true, skip_empty_lines: true });

  try {
    // Use the database pool's transaction method
    const result = await dbPool.transaction(async (client) => {
      let insertedCount = 0;
      for (const row of rows) {
        await client.query(
          `INSERT INTO time_entries (employee_id, work_date, clock_in, clock_out, was_late, left_early, overtime_hours)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            Number(row.employee_id),
            row.work_date,
            row.clock_in || null,
            row.clock_out || null,
            row.was_late?.toLowerCase() === "true",
            row.left_early?.toLowerCase() === "true",
            Number(row.overtime_hours || 0)
          ]
        );
        insertedCount++;
      }
      return insertedCount;
    });
    
    res.json({ inserted: result });
  } catch (e) {
    console.error("Error importing time entries:", e);
    res.status(500).json({ error: e.message });
  }
});

export default r;
