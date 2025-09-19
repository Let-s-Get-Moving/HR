import { Router } from "express";
import { q } from "../db.js";
import { z } from "zod";
import { formatCurrency } from "../utils/formatting.js";

const r = Router();

// Bonus schema for creation
const bonusSchema = z.object({
  employee_id: z.number().int().positive(),
  bonus_type: z.string().min(1),
  amount: z.number().positive(),
  period: z.string().min(1),
  criteria: z.string().optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Paid']).default('Pending'),
  approved_by: z.string().optional(),
  approval_notes: z.string().optional(),
  payment_date: z.string().optional(),
  rejected_by: z.string().optional(),
  rejection_reason: z.string().optional(),
  rejection_notes: z.string().optional()
});

// Stricter bonus schema for updates
const bonusUpdateSchema = z.object({
  employee_id: z.number().int().positive().optional(),
  bonus_type: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  period: z.string().min(1).optional(),
  criteria: z.string().optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Paid']).optional(),
  approved_by: z.string().optional(),
  approval_notes: z.string().optional(),
  payment_date: z.string().optional(),
  rejected_by: z.string().optional(),
  rejection_reason: z.string().optional(),
  rejection_notes: z.string().optional()
}).refine((data) => {
  // Require at least one field to be provided
  return Object.keys(data).length > 0;
}, {
  message: "At least one field must be provided for update"
});

// Get all bonuses
r.get("/", async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT 
        b.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.role_title,
        d.name as department
      FROM bonuses b
      JOIN employees e ON b.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY b.created_at DESC
    `);
    
    const formattedRows = rows.map(row => ({
      ...row,
      amount: formatCurrency(row.amount)
    }));
    
    res.json(formattedRows);
  } catch (error) {
    console.error("Error fetching bonuses:", error);
    res.status(500).json({ error: "Failed to fetch bonuses" });
  }
});

// Create new bonus
r.post("/", async (req, res) => {
  try {
    const validatedData = bonusSchema.parse(req.body);
    
    const { rows } = await q(`
      INSERT INTO bonuses (
        employee_id, bonus_type, amount, period, criteria, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      validatedData.employee_id,
      validatedData.bonus_type,
      validatedData.amount,
      validatedData.period,
      validatedData.criteria || '',
      validatedData.status
    ]);
    
    res.status(201).json({
      message: "Bonus created successfully",
      bonus: rows[0]
    });
  } catch (error) {
    console.error("Error creating bonus:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: "Failed to create bonus" });
  }
});

// Update bonus status
r.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = bonusUpdateSchema.parse(req.body);
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No valid fields provided for update" });
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const { rows } = await q(`
      UPDATE bonuses 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Bonus not found" });
    }
    
    res.json({
      message: "Bonus updated successfully",
      bonus: rows[0]
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error updating bonus:", error);
    res.status(500).json({ error: "Failed to update bonus" });
  }
});

// Get bonus structures
r.get("/structures", async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT 
        bs.*,
        d.name as department_name
      FROM bonus_structures bs
      LEFT JOIN departments d ON bs.department_id = d.id
      ORDER BY bs.effective_date DESC
    `);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching bonus structures:", error);
    // Return empty array if table doesn't exist yet
    res.json([]);
  }
});

// Create bonus structure
r.post("/structures", async (req, res) => {
  try {
    const { name, base_amount, criteria, calculation_method, effective_date, department } = req.body;
    
    if (!name || !base_amount || !criteria) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const { rows } = await q(`
      INSERT INTO bonus_structures (name, base_amount, criteria, calculation_method, effective_date, department_id)
      VALUES ($1, $2, $3, $4, $5, (SELECT id FROM departments WHERE name = $6 LIMIT 1))
      RETURNING *
    `, [name, base_amount, criteria, calculation_method, effective_date, department]);
    
    res.status(201).json({
      message: "Bonus structure created successfully",
      structure: rows[0]
    });
  } catch (error) {
    console.error("Error creating bonus structure:", error);
    res.status(500).json({ error: "Failed to create bonus structure" });
  }
});

// Update bonus structure
r.put("/structures/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, base_amount, criteria, calculation_method, effective_date } = req.body;
    
    const { rows } = await q(`
      UPDATE bonus_structures 
      SET name = $1, base_amount = $2, criteria = $3, calculation_method = $4, effective_date = $5
      WHERE id = $6
      RETURNING *
    `, [name, base_amount, criteria, calculation_method, effective_date, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Bonus structure not found" });
    }
    
    res.json({
      message: "Bonus structure updated successfully",
      structure: rows[0]
    });
  } catch (error) {
    console.error("Error updating bonus structure:", error);
    res.status(500).json({ error: "Failed to update bonus structure" });
  }
});

// Get commission structures
r.get("/commission-structures", async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT 
        cs.*,
        d.name as department_name
      FROM commission_structures cs
      LEFT JOIN departments d ON cs.department_id = d.id
      ORDER BY cs.effective_date DESC
    `);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching commission structures:", error);
    // Return empty array if table doesn't exist yet
    res.json([]);
  }
});

// Create commission structure
r.post("/commission-structures", async (req, res) => {
  try {
    const { name, commission_rate, base_amount, criteria, calculation_method, effective_date, department } = req.body;
    
    if (!name || !commission_rate || !criteria) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const { rows } = await q(`
      INSERT INTO commission_structures (name, commission_rate, base_amount, criteria, calculation_method, effective_date, department_id)
      VALUES ($1, $2, $3, $4, $5, $6, (SELECT id FROM departments WHERE name = $7 LIMIT 1))
      RETURNING *
    `, [name, commission_rate, base_amount, criteria, calculation_method, effective_date, department]);
    
    res.status(201).json({
      message: "Commission structure created successfully",
      structure: rows[0]
    });
  } catch (error) {
    console.error("Error creating commission structure:", error);
    res.status(500).json({ error: "Failed to create commission structure" });
  }
});

export default r;
