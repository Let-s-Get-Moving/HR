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

r.get("/terminated", async (_req, res) => {
  const { rows } = await q(
    `SELECT e.*, 
     e.first_name || ' ' || e.last_name AS name,
     d.name AS department, 
     l.name AS location
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN locations l ON l.id = e.location_id
     WHERE e.status = 'Terminated'
     ORDER BY e.termination_date DESC NULLS LAST, e.first_name, e.last_name`
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
  work_email: z.string().email(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional(),
  hire_date: z.string(),
  employment_type: z.enum(["Full-time","Part-time","Contract"]),
  department_id: z.number().int().nullable().optional(),
  location_id: z.number().int().nullable().optional(),
  role_title: z.string().nullable().optional(),
  probation_end: z.string().nullable().optional(),
  hourly_rate: z.number().min(0).optional(),
  // Personal details from onboarding
  full_address: z.string().nullable().optional(),
  sin_number: z.string().nullable().optional(),
  sin_expiry_date: z.string().nullable().optional(),
  bank_name: z.string().nullable().optional(),
  bank_account_number: z.string().nullable().optional(),
  bank_transit_number: z.string().nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_phone: z.string().nullable().optional()
});

r.post("/", async (req, res) => {
  try {
    const data = employeeSchema.parse(req.body);
    const { rows } = await q(
      `INSERT INTO employees
       (first_name,last_name,work_email,email,phone,gender,birth_date,hire_date,employment_type,department_id,location_id,role_title,probation_end,hourly_rate,full_address,sin_number,sin_expiry_date,bank_name,bank_account_number,bank_transit_number,emergency_contact_name,emergency_contact_phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING *`,
      [
        data.first_name, data.last_name, data.work_email, data.email ?? null,
        data.phone ?? null, data.gender ?? null, data.birth_date ?? null, data.hire_date,
        data.employment_type, data.department_id ?? null, data.location_id ?? null,
        data.role_title ?? null, data.probation_end ?? null, data.hourly_rate ?? 25,
        data.full_address ?? null, data.sin_number ?? null, data.sin_expiry_date ?? null,
        data.bank_name ?? null, data.bank_account_number ?? null, data.bank_transit_number ?? null,
        data.emergency_contact_name ?? null, data.emergency_contact_phone ?? null
      ]
    );
    console.log('✅ [API] Employee created:', rows[0]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('❌ [API] Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee', details: error.message });
  }
});

r.delete("/:id", async (req, res) => {
  await q(`UPDATE employees SET status='Terminated', termination_date=CURRENT_DATE, termination_reason='Terminated via HR system' WHERE id=$1`, [req.params.id]);
  res.sendStatus(204);
});

// Update employee
r.put("/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  
  // Helper function to convert empty strings to null
  const nullIfEmpty = (value) => (value === '' || value === undefined) ? null : value;
  
  try {
    // Validate required fields
    if (!data.first_name || !data.last_name || !data.email || !data.hire_date || !data.employment_type || !data.status) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        details: "first_name, last_name, email, hire_date, employment_type, and status are required" 
      });
    }
    
    const { rows } = await q(
      `UPDATE employees 
       SET first_name = $1, last_name = $2, email = $3, work_email = $4, phone = $5, 
           role_title = $6, hourly_rate = $7, employment_type = $8,
           department_id = $9, location_id = $10, hire_date = $11,
           gender = $12, birth_date = $13, status = $14, probation_end = $15,
           full_address = $16, emergency_contact_name = $17, emergency_contact_phone = $18,
           sin_number = $19, sin_expiry_date = $20, bank_name = $21,
           bank_transit_number = $22, bank_account_number = $23,
           contract_status = $24, contract_signed_date = $25, gift_card_sent = $26
       WHERE id = $27
       RETURNING *`,
      [
        data.first_name,
        data.last_name,
        nullIfEmpty(data.email),
        nullIfEmpty(data.work_email),
        nullIfEmpty(data.phone),
        nullIfEmpty(data.role_title),
        data.hourly_rate || 25,
        data.employment_type,
        nullIfEmpty(data.department_id),
        nullIfEmpty(data.location_id),
        data.hire_date, // Required field - don't null it
        nullIfEmpty(data.gender),
        nullIfEmpty(data.birth_date),
        data.status, // Required field - don't null it
        nullIfEmpty(data.probation_end),
        // New onboarding fields
        nullIfEmpty(data.full_address),
        nullIfEmpty(data.emergency_contact_name),
        nullIfEmpty(data.emergency_contact_phone),
        nullIfEmpty(data.sin_number),
        nullIfEmpty(data.sin_expiry_date),
        nullIfEmpty(data.bank_name),
        nullIfEmpty(data.bank_transit_number),
        nullIfEmpty(data.bank_account_number),
        nullIfEmpty(data.contract_status),
        nullIfEmpty(data.contract_signed_date),
        data.gift_card_sent || false,
        id
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
    console.log(`📄 [API] Fetching documents for employee ${id}`);
    const { rows } = await q(
      `SELECT id, employee_id, doc_type, file_name, uploaded_on, signed, 
              file_url, file_size, mime_type, document_category, notes,
              CASE WHEN file_data IS NOT NULL THEN true ELSE false END as has_file_data
       FROM documents 
       WHERE employee_id = $1 
       ORDER BY uploaded_on DESC`,
      [id]
    );
    console.log(`✅ [API] Found ${rows.length} documents for employee ${id}`);
    console.log(`📋 [API] Document details:`, rows.map(r => ({
      id: r.id,
      doc_type: r.doc_type,
      file_name: r.file_name,
      has_file_data: r.has_file_data,
      file_url: r.file_url ? 'Present' : 'None'
    })));
    res.json(rows);
  } catch (error) {
    console.error('❌ [API] Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
  }
});

// Upload new document for employee
r.post("/:id/documents", async (req, res) => {
  try {
    const { id } = req.params;
    const { doc_type, file_name, file_data_base64, mime_type, notes, document_category, signed } = req.body;
    
    console.log(`📤 [API] Upload request for employee ${id}:`, {
      doc_type,
      file_name,
      mime_type,
      document_category,
      signed,
      base64_length: file_data_base64?.length || 0,
      has_notes: !!notes
    });
    
    // Validate required fields
    if (!doc_type || !file_name || !file_data_base64) {
      console.error(`❌ [API] Missing required fields for upload`);
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'doc_type, file_name, and file_data_base64 are required' 
      });
    }
    
    console.log(`🔄 [API] Converting base64 to buffer...`);
    // Convert base64 to buffer
    const fileBuffer = Buffer.from(file_data_base64, 'base64');
    console.log(`✅ [API] Buffer created, size: ${fileBuffer.length} bytes (${(fileBuffer.length / 1024).toFixed(2)} KB)`);
    
    console.log(`💾 [API] Inserting into database...`);
    // Insert document
    const { rows } = await q(
      `INSERT INTO documents (
        employee_id, doc_type, file_name, file_data, file_size, mime_type,
        document_category, notes, signed, uploaded_on, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)
      RETURNING id, employee_id, doc_type, file_name, uploaded_on, signed, 
                file_size, mime_type, document_category, notes`,
      [
        id,
        doc_type,
        file_name,
        fileBuffer,
        fileBuffer.length,
        mime_type || 'application/octet-stream',
        document_category || 'Other',
        notes || null,
        signed || false,
        req.user?.id || null
      ]
    );
    
    console.log(`✅ [API] Document uploaded successfully:`, {
      document_id: rows[0].id,
      employee_id: id,
      file_name,
      file_size: rows[0].file_size,
      doc_type,
      category: rows[0].document_category
    });
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('❌ [API] Error uploading document:', error);
    console.error('❌ [API] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to upload document', details: error.message });
  }
});

// Download specific document
r.get("/:id/documents/:docId/download", async (req, res) => {
  try {
    const { id, docId } = req.params;
    
    console.log(`📥 [API] Download request for document ${docId} of employee ${id}`);
    
    const { rows } = await q(
      `SELECT file_data, file_name, mime_type, file_url
       FROM documents 
       WHERE id = $1 AND employee_id = $2`,
      [docId, id]
    );
    
    if (rows.length === 0) {
      console.error(`❌ [API] Document not found: ${docId}`);
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const doc = rows[0];
    
    console.log(`📄 [API] Document found:`, {
      file_name: doc.file_name,
      mime_type: doc.mime_type,
      has_file_data: !!doc.file_data,
      has_file_url: !!doc.file_url,
      file_size: doc.file_data?.length || 0
    });
    
    // If we have file data, serve it
    if (doc.file_data) {
      console.log(`✅ [API] Serving file data, size: ${doc.file_data.length} bytes`);
      res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
      res.send(doc.file_data);
    } 
    // If we only have a URL, redirect to it
    else if (doc.file_url) {
      console.log(`🔗 [API] Returning external URL`);
      res.json({ 
        message: 'Document is stored externally',
        url: doc.file_url,
        file_name: doc.file_name 
      });
    } 
    else {
      console.error(`❌ [API] Document has neither file_data nor file_url`);
      res.status(404).json({ error: 'Document file not available' });
    }
  } catch (error) {
    console.error('❌ [API] Error downloading document:', error);
    console.error('❌ [API] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to download document', details: error.message });
  }
});

// Delete document
r.delete("/:id/documents/:docId", async (req, res) => {
  try {
    const { id, docId } = req.params;
    
    console.log(`🗑️ [API] Delete request for document ${docId} of employee ${id}`);
    
    const { rowCount } = await q(
      `DELETE FROM documents WHERE id = $1 AND employee_id = $2`,
      [docId, id]
    );
    
    if (rowCount === 0) {
      console.error(`❌ [API] Document not found for deletion: ${docId}`);
      return res.status(404).json({ error: 'Document not found' });
    }
    
    console.log(`✅ [API] Document deleted successfully: ${docId}`);
    res.sendStatus(204);
  } catch (error) {
    console.error('❌ [API] Error deleting document:', error);
    console.error('❌ [API] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to delete document', details: error.message });
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
