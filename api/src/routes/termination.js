import { Router } from "express";
import { q } from "../db.js";
import { z } from "zod";
import { requireRole, ROLES } from "../middleware/rbac.js";

const r = Router();

// Termination details schema - matching frontend field names
const terminationSchema = z.object({
  employee_id: z.number().int().positive(),
  termination_date: z.string(),
  termination_reason: z.string().min(1),
  termination_type: z.enum(['Voluntary', 'Involuntary', 'Retirement', 'End of Contract']),
  notice_period_days: z.number().int().min(0).optional(),
  last_working_day: z.string().optional(),
  exit_interview_date: z.string().optional(),
  exit_interview_conducted_by: z.string().optional(),
  exit_interview_notes: z.string().optional(),
  final_pay_date: z.string().optional(),
  severance_paid: z.boolean().optional(),
  severance_amount: z.number().min(0).optional(),
  vacation_payout: z.number().min(0).optional(),
  benefits_end_date: z.string().optional(),
  equipment_returned: z.boolean().optional(),
  equipment_return_date: z.string().optional(),
  equipment_return_notes: z.string().optional(),
  access_revoked: z.boolean().optional(),
  access_revoked_date: z.string().optional(),
  reason_category: z.string().optional(),
  initiated_by: z.string().min(1)
});

// Create termination details - Manager/Admin only
r.post("/details", requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    console.log("Received termination request:", req.body);
    
    const validatedData = terminationSchema.parse(req.body);
    
    // Check if employee exists and is active
    const employee = await q(
      "SELECT id, status FROM employees WHERE id = $1",
      [validatedData.employee_id]
    );
    
    if (employee.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    if (employee.rows[0].status !== 'Active') {
      return res.status(400).json({ error: "Employee is not active" });
    }

    // Insert termination details
    const terminationResult = await q(`
      INSERT INTO termination_details (
        employee_id, termination_date, termination_reason, termination_type,
        notice_period_days, last_working_day, exit_interview_date, 
        exit_interview_conducted_by, exit_interview_notes, final_pay_date,
        severance_paid, severance_amount, vacation_payout, benefits_end_date,
        equipment_returned, equipment_return_date, equipment_return_notes,
        access_revoked, access_revoked_date, reason_category, initiated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING id
    `, [
      validatedData.employee_id,
      validatedData.termination_date,
      validatedData.termination_reason,
      validatedData.termination_type,
      validatedData.notice_period_days || null,
      validatedData.last_working_day || null,
      validatedData.exit_interview_date || null,
      validatedData.exit_interview_conducted_by || null,
      validatedData.exit_interview_notes || null,
      validatedData.final_pay_date || null,
      validatedData.severance_paid || false,
      validatedData.severance_amount || 0,
      validatedData.vacation_payout || 0,
      validatedData.benefits_end_date || null,
      validatedData.equipment_returned || false,
      validatedData.equipment_return_date || null,
      validatedData.equipment_return_notes || null,
      validatedData.access_revoked || false,
      validatedData.access_revoked_date || null,
      validatedData.reason_category || null,
      validatedData.initiated_by
    ]);

    // Update employee status with reason and type
    await q(
      "UPDATE employees SET status = 'Terminated', termination_date = $1, termination_reason = $2, termination_type = $3 WHERE id = $4",
      [validatedData.termination_date, validatedData.termination_reason, validatedData.termination_type, validatedData.employee_id]
    );

    res.status(201).json({
      message: "Termination processed successfully",
      terminationId: terminationResult.rows[0].id
    });

  } catch (error) {
    console.error("Error processing termination:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: "Failed to process termination" });
  }
});

// Get termination details
r.get("/details/:employeeId", async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    
    if (isNaN(employeeId)) {
      return res.status(400).json({ error: "Invalid employee ID" });
    }

    const termination = await q(`
      SELECT 
        td.*,
        e.first_name,
        e.last_name,
        e.email,
        e.role_title
      FROM termination_details td
      JOIN employees e ON td.employee_id = e.id
      WHERE td.employee_id = $1
    `, [employeeId]);

    if (termination.rows.length === 0) {
      return res.status(404).json({ error: "Termination details not found" });
    }

    res.json(termination.rows[0]);

  } catch (error) {
    console.error("Error fetching termination details:", error);
    res.status(500).json({ error: "Failed to fetch termination details" });
  }
});

// Get all terminations
r.get("/list", async (req, res) => {
  try {
    const terminations = await q(`
      SELECT 
        td.id,
        td.employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        e.role_title,
        td.termination_date,
        td.termination_type,
        td.termination_reason,
        CASE WHEN td.exit_interview_date IS NOT NULL THEN true ELSE false END as exit_interview_completed,
        td.equipment_returned,
        td.access_revoked
      FROM termination_details td
      JOIN employees e ON td.employee_id = e.id
      ORDER BY td.termination_date DESC
    `);

    res.json(terminations.rows);

  } catch (error) {
    console.error("Error fetching terminations:", error);
    res.status(500).json({ error: "Failed to fetch terminations" });
  }
});

// Get checklist template  
r.get("/checklist-template", async (req, res) => {
  try {
    console.log("Checklist template requested");
    // Return a standard checklist template
    const template = [
      { id: 1, task: "Collect company equipment (laptop, phone, keys)", category: "Equipment", completed: false, required: true },
      { id: 2, task: "Revoke system access and accounts", category: "IT Security", completed: false, required: true },
      { id: 3, task: "Process final payroll and benefits", category: "Payroll", completed: false, required: true },
      { id: 4, task: "Conduct exit interview", category: "HR", completed: false, required: true },
      { id: 5, task: "Complete ROE (Record of Employment)", category: "Government", completed: false, required: true },
      { id: 6, task: "Return company credit cards", category: "Finance", completed: false, required: false },
      { id: 7, task: "Transfer knowledge and handover tasks", category: "Operations", completed: false, required: true },
      { id: 8, task: "Update organizational chart", category: "HR", completed: false, required: false }
    ];
    
    res.json(template);
  } catch (error) {
    console.error("Error fetching checklist template:", error);
    res.status(500).json({ error: "Failed to fetch checklist template" });
  }
});

// Create termination checklist
r.post("/checklist", async (req, res) => {
  try {
    const { employee_id, termination_detail_id, checklist_items } = req.body;
    
    if (!employee_id || !checklist_items) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // For now, just return success since we don't have a checklist table
    // In a real system, you'd save each checklist item to a termination_checklist table
    
    res.status(201).json({
      message: "Checklist created successfully",
      checklistId: Date.now() // Mock ID
    });

  } catch (error) {
    console.error("Error creating checklist:", error);
    res.status(500).json({ error: "Failed to create checklist" });
  }
});

// Upload termination document
r.post("/documents", async (req, res) => {
  try {
    const { employee_id, document_type, termination_detail_id } = req.body;
    
    if (!employee_id || !document_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // For now, just simulate document upload
    // In a real system, you'd save to file storage and store reference in DB
    const documentResult = await q(`
      INSERT INTO termination_documents (
        employee_id, document_type, document_name, upload_date
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING id
    `, [employee_id, document_type, `${document_type}_${Date.now()}.pdf`]);

    res.status(201).json({
      message: "Document uploaded successfully",
      documentId: documentResult.rows[0].id
    });

  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

export default r;
