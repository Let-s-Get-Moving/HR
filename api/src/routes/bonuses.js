import { Router } from "express";
import { q } from "../db.js";
import { z } from "zod";
import { formatCurrency } from "../utils/formatting.js";

const r = Router();

// Bonus schema
const bonusSchema = z.object({
  employee_id: z.number().int().positive(),
  bonus_type: z.string().min(1),
  amount: z.number().positive(),
  period: z.string().min(1),
  criteria: z.string().optional(),
  status: z.enum(['Pending', 'Approved', 'Paid']).default('Pending')
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
    const { status } = req.body;
    
    if (!['Pending', 'Approved', 'Paid'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const { rows } = await q(`
      UPDATE bonuses 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Bonus not found" });
    }
    
    res.json({
      message: "Bonus updated successfully",
      bonus: rows[0]
    });
  } catch (error) {
    console.error("Error updating bonus:", error);
    res.status(500).json({ error: "Failed to update bonus" });
  }
});

export default r;
