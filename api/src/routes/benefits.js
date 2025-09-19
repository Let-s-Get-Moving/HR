import { Router } from "express";
import { q } from "../db.js";
import { z } from "zod";

const r = Router();

// Get all benefits plans
r.get("/plans", async (_req, res) => {
  try {
    const { rows } = await q(`
      SELECT bp.*, d.name as department_name
      FROM benefits_plans bp
      LEFT JOIN departments d ON bp.department_id = d.id
      ORDER BY bp.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all employee enrollments
r.get("/enrollments", async (_req, res) => {
  try {
    const { rows } = await q(`
      SELECT be.*, e.first_name, e.last_name, e.email,
             bp.plan_name, bp.provider, bp.type
      FROM benefits_enrollments be
      JOIN employees e ON be.employee_id = e.id
      JOIN benefits_plans bp ON be.plan_id = bp.id
      ORDER BY be.enrollment_date DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get retirement plans
r.get("/retirement-plans", async (_req, res) => {
  try {
    const { rows } = await q(`
      SELECT rp.*, d.name as department_name
      FROM retirement_plans rp
      LEFT JOIN departments d ON rp.department_id = d.id
      ORDER BY rp.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create benefits plan
const benefitsPlanSchema = z.object({
  plan_name: z.string(),
  provider: z.string(),
  type: z.enum(['Health', 'Dental', 'Vision', 'Life', 'Disability', 'Other']),
  employee_cost: z.number(),
  employer_cost: z.number(),
  coverage_details: z.string(),
  department_id: z.number().int().optional()
});

r.post("/plans", async (req, res) => {
  try {
    const data = benefitsPlanSchema.parse(req.body);
    const { rows } = await q(`
      INSERT INTO benefits_plans 
      (plan_name, provider, type, employee_cost, employer_cost, coverage_details, department_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [data.plan_name, data.provider, data.type, data.employee_cost, data.employer_cost, data.coverage_details, data.department_id]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create retirement plan
const retirementPlanSchema = z.object({
  plan_name: z.string(),
  provider: z.string(),
  plan_type: z.enum(['401k', '403b', 'Pension', 'IRA', 'Other']),
  employer_match_percentage: z.number(),
  vesting_schedule: z.string(),
  contribution_limit: z.number(),
  department_id: z.number().int().optional()
});

r.post("/retirement-plans", async (req, res) => {
  try {
    const data = retirementPlanSchema.parse(req.body);
    const { rows } = await q(`
      INSERT INTO retirement_plans 
      (plan_name, provider, plan_type, employer_match_percentage, vesting_schedule, contribution_limit, department_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [data.plan_name, data.provider, data.plan_type, data.employer_match_percentage, data.vesting_schedule, data.contribution_limit, data.department_id]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Enroll employee in benefits
const enrollmentSchema = z.object({
  employee_id: z.number().int(),
  plan_id: z.number().int(),
  enrollment_date: z.string(),
  coverage_start_date: z.string(),
  coverage_end_date: z.string().optional(),
  status: z.enum(['Active', 'Inactive', 'Terminated']).default('Active')
});

r.post("/enrollments", async (req, res) => {
  try {
    const data = enrollmentSchema.parse(req.body);
    const { rows } = await q(`
      INSERT INTO benefits_enrollments 
      (employee_id, plan_id, enrollment_date, coverage_start_date, coverage_end_date, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [data.employee_id, data.plan_id, data.enrollment_date, data.coverage_start_date, data.coverage_end_date, data.status]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update enrollment
r.put("/enrollments/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  try {
    const fields = Object.keys(updateData).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = Object.values(updateData);
    values.push(id);
    
    const { rows } = await q(`
      UPDATE benefits_enrollments 
      SET ${fields}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
      RETURNING *
    `, values);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Enrollment not found" });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manage retirement plan (update settings)
r.put("/retirement-plans/:id/manage", async (req, res) => {
  const { id } = req.params;
  const { 
    employer_match_percentage, 
    vesting_schedule, 
    contribution_limit,
    investment_options,
    management_fees
  } = req.body;
  
  try {
    const { rows } = await q(`
      UPDATE retirement_plans 
      SET employer_match_percentage = $1, 
          vesting_schedule = $2, 
          contribution_limit = $3,
          investment_options = $4,
          management_fees = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [employer_match_percentage, vesting_schedule, contribution_limit, investment_options, management_fees, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Retirement plan not found" });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get benefits analytics
r.get("/analytics", async (_req, res) => {
  try {
    const [enrollmentStats, costStats, planStats] = await Promise.all([
      q(`SELECT 
          COUNT(*) as total_enrollments,
          COUNT(*) FILTER (WHERE status = 'Active') as active_enrollments,
          COUNT(*) FILTER (WHERE status = 'Inactive') as inactive_enrollments
         FROM benefits_enrollments`),
      q(`SELECT 
          SUM(employee_cost) as total_employee_cost,
          SUM(employer_cost) as total_employer_cost,
          AVG(employee_cost) as avg_employee_cost,
          AVG(employer_cost) as avg_employer_cost
         FROM benefits_plans bp
         JOIN benefits_enrollments be ON bp.id = be.plan_id
         WHERE be.status = 'Active'`),
      q(`SELECT 
          type, COUNT(*) as count
         FROM benefits_plans
         GROUP BY type
         ORDER BY count DESC`)
    ]);
    
    res.json({
      enrollments: enrollmentStats.rows[0],
      costs: costStats.rows[0],
      plans_by_type: planStats.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default r;
