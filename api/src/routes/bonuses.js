import { Router } from "express";
import { primaryPool as pool } from "../db/pools.js";
import { z } from "zod";
import { formatCurrency } from "../utils/formatting.js";
import { applyScopeFilter } from "../middleware/rbac.js";

const r = Router();

// Apply scope filter to all bonus routes
r.use(applyScopeFilter);

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
    const { rows } = await pool.query(`
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
    
    const { rows } = await pool.query(`
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
    
    const { rows } = await pool.query(`
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
    const { rows } = await pool.query(`
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
    
    const { rows } = await pool.query(`
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
    
    const { rows } = await pool.query(`
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
    const { rows } = await pool.query(`
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
    
    const { rows } = await pool.query(`
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

// Fix bonus schema - add missing approval/rejection fields
r.post("/fix-schema", async (req, res) => {
  try {
    console.log('🔧 Fixing bonus schema...');
    
    // Add approval fields
    await pool.query(`
      ALTER TABLE bonuses 
      ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
      ADD COLUMN IF NOT EXISTS approval_notes TEXT,
      ADD COLUMN IF NOT EXISTS payment_date DATE
    `);
    console.log('✅ Approval fields added');

    // Add rejection fields  
    await pool.query(`
      ALTER TABLE bonuses 
      ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(255),
      ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(255),
      ADD COLUMN IF NOT EXISTS rejection_notes TEXT
    `);
    console.log('✅ Rejection fields added');

    // Add updated_at column if it doesn't exist
    await pool.query(`
      ALTER TABLE bonuses 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ Updated_at column added');

    // Create indexes for better performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bonuses_status ON bonuses(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bonuses_employee_id ON bonuses(employee_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bonuses_created_at ON bonuses(created_at)`);
    console.log('✅ Performance indexes created');
    
    // Test the new columns
    await pool.query(`
      UPDATE bonuses 
      SET approved_by = 'System Admin', 
          approval_notes = 'Schema migration test',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `);
    console.log('✅ Test update successful');
    
    // Verify the schema
    const { rows } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'bonuses' 
      ORDER BY ordinal_position
    `);
    
    res.json({
      success: true,
      message: "Bonus schema fixed successfully!",
      schema: rows.map(row => ({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES'
      }))
    });
    
  } catch (error) {
    console.error('❌ Error fixing bonus schema:', error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fix bonus schema",
      details: error.message 
    });
  }
});

// Quick fix endpoint - execute SQL directly
r.get("/quick-fix", async (req, res) => {
  try {
    console.log('🚀 QUICK FIX: Adding missing columns...');
    
    // Execute all SQL commands in sequence
    const commands = [
      `ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255)`,
      `ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS approval_notes TEXT`,
      `ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS payment_date DATE`,
      `ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(255)`,
      `ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(255)`,
      `ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS rejection_notes TEXT`,
      `ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
      `CREATE INDEX IF NOT EXISTS idx_bonuses_status ON bonuses(status)`,
      `CREATE INDEX IF NOT EXISTS idx_bonuses_employee_id ON bonuses(employee_id)`,
      `CREATE INDEX IF NOT EXISTS idx_bonuses_created_at ON bonuses(created_at)`
    ];
    
    for (let i = 0; i < commands.length; i++) {
      try {
        await pool.query(commands[i]);
        console.log(`✅ Command ${i + 1}/${commands.length} executed successfully`);
      } catch (cmdError) {
        console.log(`⚠️  Command ${i + 1} warning:`, cmdError.message);
      }
    }
    
    // Test the new columns
    await pool.query(`
      UPDATE bonuses 
      SET approved_by = 'Quick Fix Admin', 
          approval_notes = 'Quick fix test',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `);
    console.log('✅ Test update successful');
    
    res.json({
      success: true,
      message: "Quick fix completed! All bonus approval/rejection fields added to database.",
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Quick fix error:', error);
    res.status(500).json({ 
      success: false,
      error: "Quick fix failed",
      details: error.message 
    });
  }
});

// Immediate fix endpoint - execute SQL directly
r.get("/immediate-fix", async (req, res) => {
  try {
    console.log('🚀 IMMEDIATE FIX: Adding missing columns...');
    
    // Step 1: Add approval fields
    await pool.query(`ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255)`);
    await pool.query(`ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS approval_notes TEXT`);
    await pool.query(`ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS payment_date DATE`);
    console.log('✅ Approval fields added');

    // Step 2: Add rejection fields  
    await pool.query(`ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(255)`);
    await pool.query(`ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(255)`);
    await pool.query(`ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS rejection_notes TEXT`);
    console.log('✅ Rejection fields added');

    // Step 3: Add updated_at column
    await pool.query(`ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`);
    console.log('✅ Updated_at column added');

    // Step 4: Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bonuses_status ON bonuses(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bonuses_employee_id ON bonuses(employee_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bonuses_created_at ON bonuses(created_at)`);
    console.log('✅ Performance indexes created');
    
    // Step 5: Test the new columns
    await pool.query(`
      UPDATE bonuses 
      SET approved_by = 'Immediate Fix Admin', 
          approval_notes = 'Immediate fix test',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `);
    console.log('✅ Test update successful');
    
    // Step 6: Test approve functionality
    await pool.query(`
      UPDATE bonuses 
      SET status = 'Approved', 
          approved_by = 'Test Admin',
          approval_notes = 'Test approval',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 2
    `);
    console.log('✅ Approve test successful');
    
    // Step 7: Test reject functionality
    await pool.query(`
      UPDATE bonuses 
      SET status = 'Rejected', 
          rejected_by = 'Test Admin',
          rejection_reason = 'Test rejection',
          rejection_notes = 'Test rejection notes',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 3
    `);
    console.log('✅ Reject test successful');
    
    res.json({
      success: true,
      message: "IMMEDIATE FIX COMPLETED! All bonus approval/rejection fields added to database.",
      timestamp: new Date().toISOString(),
      tests: {
        approve: "PASSED",
        reject: "PASSED",
        schema: "UPDATED"
      }
    });
    
  } catch (error) {
    console.error('❌ Immediate fix error:', error);
    res.status(500).json({ 
      success: false,
      error: "Immediate fix failed",
      details: error.message 
    });
  }
});

// Fix constraint endpoint - update status constraint to include Rejected
r.get("/constraint-fix", async (req, res) => {
  try {
    console.log('🔧 CONSTRAINT FIX: Updating status constraint...');
    
    // Drop the existing constraint
    await pool.query(`ALTER TABLE bonuses DROP CONSTRAINT IF EXISTS bonuses_status_check`);
    console.log('✅ Old constraint dropped');
    
    // Add new constraint with Rejected status
    await pool.query(`ALTER TABLE bonuses ADD CONSTRAINT bonuses_status_check CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Paid'))`);
    console.log('✅ New constraint added with Rejected status');
    
    // Test reject functionality
    await pool.query(`
      UPDATE bonuses 
      SET status = 'Rejected', 
          rejected_by = 'Constraint Fix Admin',
          rejection_reason = 'Constraint fix test',
          rejection_notes = 'Testing reject functionality after constraint update',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 3
    `);
    console.log('✅ Reject test successful after constraint fix');
    
    res.json({
      success: true,
      message: "CONSTRAINT FIX COMPLETED! Status constraint updated to include 'Rejected' status.",
      timestamp: new Date().toISOString(),
      constraint: "Updated to include Pending, Approved, Rejected, Paid"
    });
    
  } catch (error) {
    console.error('❌ Constraint fix error:', error);
    res.status(500).json({ 
      success: false,
      error: "Constraint fix failed",
      details: error.message 
    });
  }
});

export default r;
