import { Router } from "express";
import { q } from "../db.js";
import { z } from "zod";

const r = Router();

r.get("/", async (_req, res) => {
  const { rows } = await q(
    `SELECT e.*, 
     e.first_name || ' ' || e.last_name AS name,
     d.name AS department, 
     l.name AS location
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN locations l ON l.id = e.location_id
     WHERE e.status <> 'Terminated'
     ORDER BY e.first_name, e.last_name`
  );
  res.json(rows);
});

r.get("/departments", async (_req, res) => {
  const { rows } = await q(`SELECT * FROM departments ORDER BY name`);
  res.json(rows);
});

r.get("/locations", async (_req, res) => {
  const { rows } = await q(`SELECT * FROM locations WHERE is_active = true ORDER BY name`);
  res.json(rows);
});

r.get("/time-entries", async (_req, res) => {
  const { rows } = await q(
    `SELECT * FROM time_entries ORDER BY work_date DESC, employee_id`
  );
  res.json(rows);
});

const employeeSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  gender: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional(),
  hire_date: z.string(),
  employment_type: z.enum(["Full-time","Part-time","Contract"]),
  department_id: z.number().int().nullable().optional(),
  location_id: z.number().int().nullable().optional(),
  role_title: z.string().optional(),
  probation_end: z.string().nullable().optional(),
  hourly_rate: z.number().min(0).optional()
});

r.post("/", async (req, res) => {
  const data = employeeSchema.parse(req.body);
  const { rows } = await q(
    `INSERT INTO employees
     (first_name,last_name,email,phone,gender,birth_date,hire_date,employment_type,department_id,location_id,role_title,probation_end,hourly_rate)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      data.first_name, data.last_name, data.email, data.phone ?? null,
      data.gender ?? null, data.birth_date ?? null, data.hire_date,
      data.employment_type, data.department_id, data.location_id,
      data.role_title ?? null, data.probation_end ?? null, data.hourly_rate ?? 25
    ]
  );
  res.status(201).json(rows[0]);
});

r.delete("/:id", async (req, res) => {
  await q(`UPDATE employees SET status='Terminated', termination_date=CURRENT_DATE WHERE id=$1`, [req.params.id]);
  res.sendStatus(204);
});

// Update employee
r.put("/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  
  try {
    const { rows } = await q(
      `UPDATE employees 
       SET first_name = $1, last_name = $2, email = $3, phone = $4, 
           role_title = $5, hourly_rate = $6, employment_type = $7,
           department_id = $8, location_id = $9, hire_date = $10,
           gender = $11, birth_date = $12, status = $13, probation_end = $14
       WHERE id = $15
       RETURNING *`,
      [
        data.first_name, data.last_name, data.email, data.phone,
        data.role_title, data.hourly_rate, data.employment_type,
        data.department_id, data.location_id || null, data.hire_date,
        data.gender, data.birth_date, data.status, data.probation_end, id
      ]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating employee:", error);
    console.error("Error details:", error.message);
    res.status(500).json({ error: "Failed to update employee", details: error.message });
  }
});

// Get single employee with department and location info
r.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await q(
      `SELECT e.*, d.name as department_name, l.name as location_name,
              COALESCE(e.hourly_rate, comp.regular_rate) AS hourly_rate
       FROM employees e 
       LEFT JOIN departments d ON e.department_id = d.id 
       LEFT JOIN locations l ON e.location_id = l.id 
       LEFT JOIN LATERAL (
         SELECT regular_rate
         FROM employee_compensation ec
         WHERE ec.employee_id = e.id
         ORDER BY ec.effective_date DESC, ec.id DESC
         LIMIT 1
       ) comp ON TRUE
       WHERE e.id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee', details: error.message });
  }
});

// Get employee time entries (from BOTH old time_entries AND new timecard_entries)
r.get("/:id/time-entries", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await q(
      `SELECT 
         te.id,
         te.employee_id,
         te.work_date,
         te.clock_in::text as clock_in,
         te.clock_out::text as clock_out,
         te.hours_worked,
         te.overtime_hours,
         te.was_late,
         NULL as notes,
         'old' as source
       FROM time_entries te
       WHERE te.employee_id = $1
       
       UNION ALL
       
       SELECT 
         tce.id,
         tc.employee_id,
         tce.work_date,
         tce.clock_in::text as clock_in,
         tce.clock_out::text as clock_out,
         tce.hours_worked,
         0 as overtime_hours,
         false as was_late,
         tce.notes,
         'timecard' as source
       FROM timecard_entries tce
       JOIN timecards tc ON tce.timecard_id = tc.id
       WHERE tc.employee_id = $1
       
       ORDER BY work_date ASC`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: 'Failed to fetch time entries', details: error.message });
  }
});

// Get employee documents
r.get("/:id/documents", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await q(
      `SELECT * FROM documents WHERE employee_id = $1 ORDER BY uploaded_on DESC`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
  }
});

// Get employee training records
r.get("/:id/training-records", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await q(
      `SELECT tr.*, t.name as training_name, t.validity_months 
       FROM training_records tr 
       JOIN trainings t ON tr.training_id = t.id 
       WHERE tr.employee_id = $1 ORDER BY tr.completed_on DESC`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching training records:', error);
    res.status(500).json({ error: 'Failed to fetch training records', details: error.message });
  }
});

// Get employee payroll history (from payroll_calculations + payroll_periods)
r.get("/:id/payroll-history", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await q(
      `SELECT 
         pc.id,
         pp.start_date AS pay_period_start,
         pp.end_date AS pay_period_end,
         pc.base_hours + COALESCE(pc.overtime_hours,0) AS total_hours,
         pc.regular_rate AS hourly_rate,
         pc.total_gross AS gross_pay,
         pc.deductions AS total_deductions,
         pc.net_pay AS net_pay,
         pc.commission_amount,
         pc.bonus_amount,
         pc.status
       FROM payroll_calculations pc
       JOIN payroll_periods pp ON pp.id = pc.period_id
       WHERE pc.employee_id = $1
       ORDER BY pp.start_date DESC`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching payroll history:', error);
    res.status(500).json({ error: 'Failed to fetch payroll history', details: error.message });
  }
});

// Get extended HR details
r.get("/:id/hr-details", async (req, res) => {
  const { id } = req.params;
  try {
    const [addresses, contacts, banks, identifiers, compensation, statusHistory] = await Promise.all([
      q(`SELECT * FROM employee_addresses WHERE employee_id=$1 ORDER BY effective_from DESC NULLS LAST, id DESC`, [id]),
      q(`SELECT * FROM employee_emergency_contacts WHERE employee_id=$1 ORDER BY is_primary DESC, id DESC`, [id]),
      q(`SELECT * FROM employee_bank_accounts WHERE employee_id=$1 ORDER BY is_primary DESC, effective_date DESC NULLS LAST, id DESC`, [id]),
      q(`SELECT * FROM employee_identifiers WHERE employee_id=$1 ORDER BY id_type`, [id]),
      q(`SELECT * FROM employee_compensation WHERE employee_id=$1 ORDER BY effective_date DESC, id DESC`, [id]),
      q(`SELECT * FROM employee_status_history WHERE employee_id=$1 ORDER BY status_date DESC, id DESC`, [id])
    ]);
    res.json({
      addresses: addresses.rows,
      emergency_contacts: contacts.rows,
      bank_accounts: banks.rows,
      identifiers: identifiers.rows,
      compensation_history: compensation.rows,
      status_history: statusHistory.rows
    });
  } catch (e) {
    console.error("hr-details error", e);
    res.status(500).json({ error: e.message });
  }
});

export default r;
