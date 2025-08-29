import { Router } from "express";
import { q } from "../db.js";
import { z } from "zod";

const r = Router();

// Get all leave requests
r.get("/requests", async (_req, res) => {
  const { rows } = await q(`
    SELECT lr.*, e.first_name, e.last_name, e.email, lt.name as leave_type_name
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.id
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    ORDER BY lr.requested_at DESC
  `);
  res.json(rows);
});

// Get employee leave requests
r.get("/employee/:id", async (req, res) => {
  const { id } = req.params;
  const { rows } = await q(`
    SELECT lr.*, lt.name as leave_type_name
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    WHERE lr.employee_id = $1
    ORDER BY lr.requested_at DESC
  `, [id]);
  res.json(rows);
});

// Get leave balances
r.get("/balances/:id", async (req, res) => {
  const { id } = req.params;
  const { rows } = await q(`
    SELECT lb.*, lt.name as leave_type_name
    FROM leave_balances lb
    JOIN leave_types lt ON lb.leave_type_id = lt.id
    WHERE lb.employee_id = $1
    ORDER BY lt.name
  `, [id]);
  res.json(rows);
});

// Get leave calendar
r.get("/calendar", async (req, res) => {
  const { start_date, end_date } = req.query;
  const { rows } = await q(`
    SELECT lr.*, e.first_name, e.last_name, lt.name as leave_type_name
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.id
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    WHERE lr.status = 'Approved'
    AND lr.start_date >= $1 AND lr.end_date <= $2
    ORDER BY lr.start_date
  `, [start_date || '2025-01-01', end_date || '2025-12-31']);
  res.json(rows);
});

// Create leave request
const leaveRequestSchema = z.object({
  employee_id: z.number().int(),
  leave_type_id: z.number().int(),
  start_date: z.string(),
  end_date: z.string(),
  total_days: z.number().positive(),
  reason: z.string().optional(),
  notes: z.string().optional()
});

r.post("/requests", async (req, res) => {
  try {
    const data = leaveRequestSchema.parse(req.body);
    const { rows } = await q(`
      INSERT INTO leave_requests 
      (employee_id, leave_type_id, start_date, end_date, total_days, reason, notes, status, requested_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', CURRENT_TIMESTAMP)
      RETURNING *
    `, [data.employee_id, data.leave_type_id, data.start_date, data.end_date, data.total_days, data.reason, data.notes]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update leave request status
r.put("/requests/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, approved_by, notes } = req.body;
  
  try {
    const { rows } = await q(`
      UPDATE leave_requests 
      SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP, notes = COALESCE($3, notes)
      WHERE id = $4
      RETURNING *
    `, [status, approved_by, notes, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Leave request not found" });
    }
    
    // If approved, create leave record
    if (status === 'Approved') {
      const lr = rows[0];
      await q(`
        INSERT INTO leaves (employee_id, leave_type, start_date, end_date, approved_by, notes)
        VALUES ($1, (SELECT name FROM leave_types WHERE id = $2), $3, $4, $5, $6)
      `, [lr.employee_id, lr.leave_type_id, lr.start_date, lr.end_date, approved_by, lr.notes]);
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get leave analytics
r.get("/analytics", async (_req, res) => {
  try {
    const [requests, balances, calendar] = await Promise.all([
      q(`SELECT COUNT(*) as total_requests, 
                COUNT(*) FILTER (WHERE status = 'Pending') as pending,
                COUNT(*) FILTER (WHERE status = 'Approved') as approved,
                COUNT(*) FILTER (WHERE status = 'Rejected') as rejected
         FROM leave_requests`),
      q(`SELECT lt.name, SUM(lb.available_days) as total_available, SUM(lb.used_days) as total_used
         FROM leave_balances lb
         JOIN leave_types lt ON lb.leave_type_id = lt.id
         GROUP BY lt.id, lt.name`),
      q(`SELECT COUNT(*) as upcoming_leaves
         FROM leave_requests 
         WHERE status = 'Approved' 
         AND start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`)
    ]);
    
    res.json({
      requests: requests.rows[0],
      balances: balances.rows,
      upcoming: calendar.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default r;
