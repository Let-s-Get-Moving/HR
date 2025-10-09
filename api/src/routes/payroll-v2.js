import express from "express";
import { z } from "zod";
import { q } from "../db.js";

const r = express.Router();

// =====================================================
// PAYROLL GENERATION
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

/**
 * Generate payroll for a specific pay period
 * Calculates payroll for all active employees based on their timecards
 */
r.post("/generate", async (req, res) => {
  const schema = z.object({
    pay_period_start: z.string(),
    pay_period_end: z.string(),
    pay_date: z.string(),
    employee_ids: z.array(z.number()).optional(), // Optional: generate for specific employees only
  });

  try {
    const { pay_period_start, pay_period_end, pay_date, employee_ids } = schema.parse(req.body);

    console.log(`\n🔄 Generating payroll for period: ${pay_period_start} to ${pay_period_end}`);
    console.log(`💰 Pay date: ${pay_date}`);

    // Get active employees
    let employeesQuery = `
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.email,
        COALESCE(e.hourly_rate, 0) as hourly_rate,
        e.status
      FROM employees e
      WHERE e.status = 'Active'
    `;

    const queryParams = [];
    if (employee_ids && employee_ids.length > 0) {
      employeesQuery += ` AND e.id = ANY($1)`;
      queryParams.push(employee_ids);
    }

    const { rows: employees } = await q(employeesQuery, queryParams);

    console.log(`👥 Found ${employees.length} active employees`);

    const results = {
      success: [],
      errors: [],
      summary: {
        total_employees: employees.length,
        total_regular_hours: 0,
        total_overtime_hours: 0,
        total_gross_pay: 0,
        total_vacation_accrued: 0,
      },
    };

    // Generate payroll for each employee
    for (const employee of employees) {
      try {
        console.log(`\n  Processing: ${employee.first_name} ${employee.last_name} (ID: ${employee.id})`);

        // Get approved timecards for this period
        const { rows: timecards } = await q(
          `
          SELECT 
            SUM(total_hours) as total_hours,
            SUM(overtime_hours) as overtime_hours
          FROM timecards
          WHERE employee_id = $1
            AND pay_period_start >= $2
            AND pay_period_end <= $3
            AND status = 'Approved'
          `,
          [employee.id, pay_period_start, pay_period_end]
        );

        const totalHours = parseFloat(timecards[0]?.total_hours || 0);
        const overtimeHours = parseFloat(timecards[0]?.overtime_hours || 0);
        const regularHours = Math.max(0, totalHours - overtimeHours);

        console.log(`    ⏰ Hours: ${regularHours} regular, ${overtimeHours} overtime`);

        const hourlyRate = parseFloat(employee.hourly_rate);
        const regularPay = regularHours * hourlyRate;
        const overtimePay = overtimeHours * hourlyRate * 1.5; // 1.5x for overtime
        const grossPay = regularPay + overtimePay;

        // Calculate vacation accrual (4% of hours and pay)
        const vacationHoursAccrued = totalHours * 0.04;
        const vacationPayAccrued = grossPay * 0.04;

        console.log(`    💵 Pay: $${regularPay.toFixed(2)} regular + $${overtimePay.toFixed(2)} overtime = $${grossPay.toFixed(2)}`);
        console.log(`    🏖️  Vacation accrued: ${vacationHoursAccrued.toFixed(2)} hours ($${vacationPayAccrued.toFixed(2)})`);

        // No deductions for now
        const deductions = 0;
        const netPay = grossPay - deductions;

        // Insert or update payroll record
        const { rows: payrollRows } = await q(
          `
          INSERT INTO payrolls (
            employee_id,
            pay_period_start,
            pay_period_end,
            pay_date,
            regular_hours,
            overtime_hours,
            hourly_rate,
            regular_pay,
            overtime_pay,
            gross_pay,
            vacation_hours_accrued,
            vacation_pay_accrued,
            deductions,
            net_pay,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Draft')
          ON CONFLICT (employee_id, pay_period_start, pay_period_end)
          DO UPDATE SET
            pay_date = EXCLUDED.pay_date,
            regular_hours = EXCLUDED.regular_hours,
            overtime_hours = EXCLUDED.overtime_hours,
            hourly_rate = EXCLUDED.hourly_rate,
            regular_pay = EXCLUDED.regular_pay,
            overtime_pay = EXCLUDED.overtime_pay,
            gross_pay = EXCLUDED.gross_pay,
            vacation_hours_accrued = EXCLUDED.vacation_hours_accrued,
            vacation_pay_accrued = EXCLUDED.vacation_pay_accrued,
            deductions = EXCLUDED.deductions,
            net_pay = EXCLUDED.net_pay,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
          `,
          [
            employee.id,
            pay_period_start,
            pay_period_end,
            pay_date,
            regularHours,
            overtimeHours,
            hourlyRate,
            regularPay,
            overtimePay,
            grossPay,
            vacationHoursAccrued,
            vacationPayAccrued,
            deductions,
            netPay,
          ]
        );

        results.success.push({
          employee_id: employee.id,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          payroll_id: payrollRows[0].id,
          gross_pay: grossPay,
          net_pay: netPay,
        });

        // Update summary
        results.summary.total_regular_hours += regularHours;
        results.summary.total_overtime_hours += overtimeHours;
        results.summary.total_gross_pay += grossPay;
        results.summary.total_vacation_accrued += vacationPayAccrued;

        console.log(`    ✅ Payroll created (ID: ${payrollRows[0].id})`);
      } catch (employeeError) {
        console.error(`    ❌ Error processing employee ${employee.id}:`, employeeError);
        results.errors.push({
          employee_id: employee.id,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          error: employeeError.message,
        });
      }
    }

    console.log(`\n✅ Payroll generation complete!`);
    console.log(`   Success: ${results.success.length} employees`);
    console.log(`   Errors: ${results.errors.length} employees`);
    console.log(`   Total Gross Pay: $${results.summary.total_gross_pay.toFixed(2)}`);
    console.log(`   Total Vacation Accrued: $${results.summary.total_vacation_accrued.toFixed(2)}`);

    res.json(results);
  } catch (error) {
    console.error("Error generating payroll:", error);
    res.status(500).json({ error: "Failed to generate payroll: " + error.message });
  }
});

// =====================================================
// PAYROLL MANAGEMENT
// =====================================================

/**
 * Get all payroll records with filters
 */
r.get("/", async (req, res) => {
  try {
    const { employee_id, status, pay_period_start, pay_period_end } = req.query;

    let query = `
      SELECT * FROM payroll_summary
      WHERE 1=1
    `;
    const params = [];

    if (employee_id) {
      params.push(employee_id);
      query += ` AND employee_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (pay_period_start) {
      params.push(pay_period_start);
      query += ` AND pay_period_start >= $${params.length}`;
    }

    if (pay_period_end) {
      params.push(pay_period_end);
      query += ` AND pay_period_end <= $${params.length}`;
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
 * Approve a payroll (moves status from Draft to Approved)
 * This triggers vacation balance update
 */
r.post("/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by } = req.body;

    const { rows } = await q(
      `
      UPDATE payrolls
      SET 
        status = 'Approved',
        approved_by = $2,
        approved_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [id, approved_by || null]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Payroll not found" });
    }

    console.log(`✅ Payroll ${id} approved`);
    res.json(rows[0]);
  } catch (error) {
    console.error("Error approving payroll:", error);
    res.status(500).json({ error: "Failed to approve payroll" });
  }
});

/**
 * Approve multiple payrolls at once
 */
r.post("/bulk-approve", async (req, res) => {
  const schema = z.object({
    payroll_ids: z.array(z.number()),
    approved_by: z.number().optional(),
  });

  try {
    const { payroll_ids, approved_by } = schema.parse(req.body);

    const { rows } = await q(
      `
      UPDATE payrolls
      SET 
        status = 'Approved',
        approved_by = $2,
        approved_at = CURRENT_TIMESTAMP
      WHERE id = ANY($1)
      RETURNING *
      `,
      [payroll_ids, approved_by || null]
    );

    console.log(`✅ Approved ${rows.length} payrolls`);
    res.json({ approved_count: rows.length, payrolls: rows });
  } catch (error) {
    console.error("Error bulk approving payrolls:", error);
    res.status(500).json({ error: "Failed to bulk approve payrolls" });
  }
});

/**
 * Mark payroll as paid
 */
r.post("/:id/mark-paid", async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await q(
      `
      UPDATE payrolls
      SET status = 'Paid'
      WHERE id = $1 AND status = 'Approved'
      RETURNING *
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Payroll not found or not approved" });
    }

    console.log(`✅ Payroll ${id} marked as paid`);
    res.json(rows[0]);
  } catch (error) {
    console.error("Error marking payroll as paid:", error);
    res.status(500).json({ error: "Failed to mark payroll as paid" });
  }
});

/**
 * Delete a payroll (only if status is Draft)
 */
r.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await q(
      `
      DELETE FROM payrolls
      WHERE id = $1 AND status = 'Draft'
      RETURNING *
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Payroll not found or cannot be deleted (not in Draft status)" });
    }

    console.log(`🗑️  Payroll ${id} deleted`);
    res.json({ message: "Payroll deleted successfully" });
  } catch (error) {
    console.error("Error deleting payroll:", error);
    res.status(500).json({ error: "Failed to delete payroll" });
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
        status,
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
      GROUP BY pay_period_start, pay_period_end, pay_date, status
      `,
      [pay_period_start, pay_period_end]
    );

    res.json(rows[0] || null);
  } catch (error) {
    console.error("Error fetching payroll summary:", error);
    res.status(500).json({ error: "Failed to fetch payroll summary" });
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

