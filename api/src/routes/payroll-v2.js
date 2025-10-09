import express from "express";
import { z } from "zod";
import { q } from "../db.js";

const r = express.Router();

// =====================================================
// PAYROLL VIEWING (Auto-calculated from timecards)
// =====================================================

/**
 * Get next pay period dates
 * Based on bi-weekly schedule (last payout: Sept 26, 2025)
 */
r.get("/next-pay-period", async (req, res) => {
  try {
    const { rows } = await q(`SELECT * FROM get_next_pay_period()`);
    res.json(rows[0]);
  } catch (error) {
    console.error("Error getting next pay period:", error);
    res.status(500).json({ error: "Failed to get next pay period" });
  }
});

/**
 * Get current pay period dates
 */
r.get("/current-pay-period", async (req, res) => {
  try {
    const { rows } = await q(`SELECT * FROM get_current_pay_period()`);
    res.json(rows[0]);
  } catch (error) {
    console.error("Error getting current pay period:", error);
    res.status(500).json({ error: "Failed to get current pay period" });
  }
});

// =====================================================
// PAYROLL RECORDS
// =====================================================

/**
 * Get all payroll records with filters
 * Payroll is automatically calculated when ALL timecards for an employee/period are approved
 */
r.get("/", async (req, res) => {
  try {
    const { employee_id, pay_period_start, pay_period_end, start_date, end_date } = req.query;

    let query = `
      SELECT * FROM payroll_summary
      WHERE 1=1
    `;
    const params = [];

    if (employee_id) {
      params.push(employee_id);
      query += ` AND employee_id = $${params.length}`;
    }

    if (pay_period_start) {
      params.push(pay_period_start);
      query += ` AND pay_period_start >= $${params.length}`;
    }

    if (pay_period_end) {
      params.push(pay_period_end);
      query += ` AND pay_period_end <= $${params.length}`;
    }

    // Date range filter (for filtering by pay_date)
    if (start_date) {
      params.push(start_date);
      query += ` AND pay_date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND pay_date <= $${params.length}`;
    }

    query += ` ORDER BY pay_date DESC, last_name, first_name`;

    const { rows } = await q(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching payrolls:", error);
    res.status(500).json({ error: "Failed to fetch payrolls" });
  }
});

/**
 * Get a specific payroll record
 */
r.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await q(`SELECT * FROM payroll_summary WHERE id = $1`, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Payroll not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching payroll:", error);
    res.status(500).json({ error: "Failed to fetch payroll" });
  }
});

/**
 * Get payroll summary by pay period
 */
r.get("/summary/by-period", async (req, res) => {
  try {
    const { pay_period_start, pay_period_end } = req.query;

    if (!pay_period_start || !pay_period_end) {
      return res.status(400).json({ error: "pay_period_start and pay_period_end are required" });
    }

    const { rows } = await q(
      `
      SELECT 
        pay_period_start,
        pay_period_end,
        pay_date,
        COUNT(*) as employee_count,
        SUM(regular_hours) as total_regular_hours,
        SUM(overtime_hours) as total_overtime_hours,
        SUM(regular_hours + overtime_hours) as total_hours,
        SUM(gross_pay) as total_gross_pay,
        SUM(vacation_pay_accrued) as total_vacation_accrued,
        SUM(deductions) as total_deductions,
        SUM(net_pay) as total_net_pay
      FROM payrolls
      WHERE pay_period_start = $1 AND pay_period_end = $2
      GROUP BY pay_period_start, pay_period_end, pay_date
      `,
      [pay_period_start, pay_period_end]
    );

    res.json(rows[0] || null);
  } catch (error) {
    console.error("Error fetching payroll summary:", error);
    res.status(500).json({ error: "Failed to fetch payroll summary" });
  }
});

/**
 * Get all unique pay periods
 */
r.get("/periods/list", async (req, res) => {
  try {
    const { rows } = await q(
      `
      SELECT DISTINCT
        pay_period_start,
        pay_period_end,
        pay_date,
        COUNT(*) as employee_count,
        SUM(gross_pay) as total_gross_pay,
        SUM(net_pay) as total_net_pay,
        SUM(vacation_pay_accrued) as total_vacation_accrued
      FROM payrolls
      GROUP BY pay_period_start, pay_period_end, pay_date
      ORDER BY pay_date DESC
      `
    );

    res.json(rows);
  } catch (error) {
    console.error("Error fetching pay periods:", error);
    res.status(500).json({ error: "Failed to fetch pay periods" });
  }
});

// =====================================================
// VACATION MANAGEMENT
// =====================================================

/**
 * Get vacation balance for all employees
 */
r.get("/vacation/balances", async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT * FROM employee_vacation_summary
      ORDER BY last_name, first_name
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching vacation balances:", error);
    res.status(500).json({ error: "Failed to fetch vacation balances" });
  }
});

/**
 * Get vacation balance for a specific employee
 */
r.get("/vacation/balance/:employee_id", async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { rows } = await q(
      `SELECT * FROM employee_vacation_summary WHERE employee_id = $1`,
      [employee_id]
    );

    if (rows.length === 0) {
      return res.json({
        employee_id: parseInt(employee_id),
        vacation_hours_balance: 0,
        vacation_pay_balance: 0,
        vacation_hours_earned: 0,
        vacation_pay_earned: 0,
        vacation_hours_paid: 0,
        vacation_pay_paid: 0,
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching vacation balance:", error);
    res.status(500).json({ error: "Failed to fetch vacation balance" });
  }
});

/**
 * Request vacation payout for an employee
 */
r.post("/vacation/payout", async (req, res) => {
  const schema = z.object({
    employee_id: z.number(),
    vacation_hours_paid: z.number().positive(),
    payout_date: z.string(),
    notes: z.string().optional(),
    approved_by: z.number().optional(),
  });

  try {
    const data = schema.parse(req.body);

    // Get employee's current vacation balance and hourly rate
    const { rows: balanceRows } = await q(
      `
      SELECT 
        vb.vacation_hours_balance,
        vb.vacation_pay_balance,
        e.hourly_rate
      FROM employee_vacation_balance vb
      JOIN employees e ON vb.employee_id = e.id
      WHERE vb.employee_id = $1
      `,
      [data.employee_id]
    );

    if (balanceRows.length === 0) {
      return res.status(404).json({ error: "Employee vacation balance not found" });
    }

    const balance = balanceRows[0];

    // Check if employee has enough vacation balance
    if (balance.vacation_hours_balance < data.vacation_hours_paid) {
      return res.status(400).json({
        error: "Insufficient vacation balance",
        available: balance.vacation_hours_balance,
        requested: data.vacation_hours_paid,
      });
    }

    // Calculate payout amount at current hourly rate
    const vacationPayAmount = data.vacation_hours_paid * parseFloat(balance.hourly_rate);

    // Create vacation payout record
    const { rows: payoutRows } = await q(
      `
      INSERT INTO vacation_payouts (
        employee_id,
        payout_date,
        vacation_hours_paid,
        vacation_pay_amount,
        hourly_rate_at_payout,
        notes,
        approved_by,
        approved_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [
        data.employee_id,
        data.payout_date,
        data.vacation_hours_paid,
        vacationPayAmount,
        balance.hourly_rate,
        data.notes || null,
        data.approved_by || null,
      ]
    );

    console.log(`🏖️  Vacation payout created: ${data.vacation_hours_paid} hours ($${vacationPayAmount.toFixed(2)}) for employee ${data.employee_id}`);

    res.json(payoutRows[0]);
  } catch (error) {
    console.error("Error creating vacation payout:", error);
    res.status(500).json({ error: "Failed to create vacation payout: " + error.message });
  }
});

/**
 * Get vacation payout history for an employee
 */
r.get("/vacation/payouts/:employee_id", async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { rows } = await q(
      `
      SELECT 
        vp.*,
        e.first_name,
        e.last_name,
        u.username as approved_by_name
      FROM vacation_payouts vp
      JOIN employees e ON vp.employee_id = e.id
      LEFT JOIN users u ON vp.approved_by = u.id
      WHERE vp.employee_id = $1
      ORDER BY vp.payout_date DESC
      `,
      [employee_id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching vacation payouts:", error);
    res.status(500).json({ error: "Failed to fetch vacation payouts" });
  }
});

export default r;
