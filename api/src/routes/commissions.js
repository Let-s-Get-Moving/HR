import { Router } from "express";
import { q } from "../db.js";
import { z } from "zod";
import { formatCurrency, formatNumber } from "../utils/formatting.js";

const r = Router();

// Commission schema
const commissionSchema = z.object({
  employee_id: z.number().int().positive(),
  commission_rate: z.number().min(0).max(100),
  threshold_amount: z.number().min(0).optional(),
  deal_amount: z.number().positive(),
  commission_amount: z.number().positive(),
  period: z.string().min(1),
  status: z.enum(['Pending', 'Approved', 'Paid']).default('Pending')
});

// Get all commissions
r.get("/", async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT 
        c.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.role_title,
        d.name as department
      FROM commissions c
      JOIN employees e ON c.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY c.created_at DESC
    `);
    
    const formattedRows = rows.map(row => ({
      ...row,
      commission_rate: formatNumber(row.commission_rate, 1),
      threshold_amount: formatCurrency(row.threshold_amount),
      deal_amount: formatCurrency(row.deal_amount),
      commission_amount: formatCurrency(row.commission_amount)
    }));
    
    res.json(formattedRows);
  } catch (error) {
    console.error("Error fetching commissions:", error);
    res.status(500).json({ error: "Failed to fetch commissions" });
  }
});

// Create new commission
r.post("/", async (req, res) => {
  try {
    const validatedData = commissionSchema.parse(req.body);
    
    const { rows } = await q(`
      INSERT INTO commissions (
        employee_id, commission_rate, threshold_amount, deal_amount, 
        commission_amount, period, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      validatedData.employee_id,
      validatedData.commission_rate,
      validatedData.threshold_amount || 0,
      validatedData.deal_amount,
      validatedData.commission_amount,
      validatedData.period,
      validatedData.status
    ]);
    
    res.status(201).json({
      message: "Commission created successfully",
      commission: rows[0]
    });
  } catch (error) {
    console.error("Error creating commission:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: "Failed to create commission" });
  }
});

// Update commission status
r.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['Pending', 'Approved', 'Paid'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const { rows } = await q(`
      UPDATE commissions 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Commission not found" });
    }
    
    res.json({
      message: "Commission updated successfully",
      commission: rows[0]
    });
  } catch (error) {
    console.error("Error updating commission:", error);
    res.status(500).json({ error: "Failed to update commission" });
  }
});

export default r;
