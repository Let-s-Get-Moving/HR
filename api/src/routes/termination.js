import { Router } from "express";
import { q } from "../db.js";
import { z } from "zod";

const r = Router();

// Termination details schema
const terminationSchema = z.object({
  employeeId: z.number().int().positive(),
  terminationDate: z.string(),
  terminationReason: z.string().min(1),
  terminationType: z.enum(['Voluntary', 'Involuntary', 'Retirement', 'End of Contract']),
  noticeGiven: z.boolean(),
  severancePay: z.number().min(0).optional(),
  notes: z.string().optional(),
  exitInterviewCompleted: z.boolean().optional(),
  equipmentReturned: z.boolean().optional(),
  accessRevoked: z.boolean().optional()
});

// Create termination details
r.post("/details", async (req, res) => {
  try {
    console.log("Received termination request:", req.body);
    
    const validatedData = terminationSchema.parse(req.body);
    
    // Check if employee exists and is active
    const employee = await q(
      "SELECT id, status FROM employees WHERE id = $1",
      [validatedData.employeeId]
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
        notice_given, severance_pay, notes, exit_interview_completed,
        equipment_returned, access_revoked
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      validatedData.employeeId,
      validatedData.terminationDate,
      validatedData.terminationReason,
      validatedData.terminationType,
      validatedData.noticeGiven,
      validatedData.severancePay || 0,
      validatedData.notes || '',
      validatedData.exitInterviewCompleted || false,
      validatedData.equipmentReturned || false,
      validatedData.accessRevoked || false
    ]);

    // Update employee status
    await q(
      "UPDATE employees SET status = 'Terminated', termination_date = $1 WHERE id = $2",
      [validatedData.terminationDate, validatedData.employeeId]
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
        td.exit_interview_completed,
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

// Upload termination document
r.post("/documents", async (req, res) => {
  try {
    const { employeeId, documentType, documentName, documentContent } = req.body;
    
    if (!employeeId || !documentType || !documentName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // For now, just simulate document upload
    // In a real system, you'd save to file storage and store reference in DB
    const documentResult = await q(`
      INSERT INTO termination_documents (
        employee_id, document_type, document_name, upload_date
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING id
    `, [employeeId, documentType, documentName]);

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
