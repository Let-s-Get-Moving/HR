import { Router } from "express";
import { q } from "../db.js";

const r = Router();




// Get all compliance alerts
r.get("/alerts", async (_req, res) => {
  const { rows } = await q(`
    SELECT a.*, e.first_name, e.last_name, e.email, d.name as department
    FROM alerts a
    JOIN employees e ON a.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE a.resolved = false
    ORDER BY a.due_date ASC
  `);
  res.json(rows);
});

// Get alerts by type
r.get("/alerts/:type", async (req, res) => {
  const { type } = req.params;
  const { rows } = await q(`
    SELECT a.*, e.first_name, e.last_name, e.email
    FROM alerts a
    JOIN employees e ON a.employee_id = e.id
    WHERE a.type = $1 AND a.resolved = false
    ORDER BY a.due_date ASC
  `, [type]);
  res.json(rows);
});

// Get all trainings
r.get("/trainings", async (_req, res) => {
  try {
    const { rows } = await q(`
      SELECT * FROM trainings ORDER BY name
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all documents
r.get("/documents", async (_req, res) => {
  try {
    const { rows } = await q(`
      SELECT d.*, e.first_name, e.last_name, e.email
      FROM documents d
      JOIN employees e ON d.employee_id = e.id
      ORDER BY d.uploaded_on DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all training records
r.get("/training-records", async (_req, res) => {
  try {
    const { rows } = await q(`
      SELECT tr.*, t.name as training_name, t.validity_months, e.first_name, e.last_name, e.email
      FROM training_records tr
      JOIN trainings t ON tr.training_id = t.id
      JOIN employees e ON tr.employee_id = e.id
      ORDER BY tr.completed_on DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get employee compliance status
r.get("/employee/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const [alerts, documents, identifiers, training] = await Promise.all([
      q(`SELECT * FROM alerts WHERE employee_id = $1 AND resolved = false ORDER BY due_date`, [id]),
      q(`SELECT * FROM documents WHERE employee_id = $1 ORDER BY uploaded_on DESC`, [id]),
      q(`SELECT * FROM employee_identifiers WHERE employee_id = $1 ORDER BY expires_on NULLS LAST`, [id]),
      q(`SELECT tr.*, t.name as training_name, t.validity_months 
         FROM training_records tr 
         JOIN trainings t ON tr.training_id = t.id 
         WHERE tr.employee_id = $1 ORDER BY tr.completed_on DESC`, [id])
    ]);
    
    res.json({
      alerts: alerts.rows,
      documents: documents.rows,
      identifiers: identifiers.rows,
      training: training.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark alert as resolved
r.put("/alerts/:id/resolve", async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  
  try {
    const { rows } = await q(`
      UPDATE alerts 
      SET resolved = true, resolved_at = CURRENT_TIMESTAMP, notes = COALESCE($1, notes)
      WHERE id = $2
      RETURNING *
    `, [notes, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Alert not found" });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate compliance alerts
r.post("/generate-alerts", async (_req, res) => {
  try {
    // Add resolved_at column if it doesn't exist
    await q(`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP`).catch(() => {});
    
    // Clear old alerts (use a safer approach for missing resolved_at column)
    await q(`DELETE FROM alerts WHERE resolved = true AND id IN (
      SELECT id FROM alerts WHERE resolved = true ORDER BY id LIMIT 1000
    )`).catch(() => {});
    
    let alertsCreated = 0;
    
    // Probation end alerts (30 days before)
    const probationAlerts = await q(`
      INSERT INTO alerts (type, employee_id, due_date, notes)
      SELECT 'Probation End', e.id, e.probation_end, 'Employee probation period ending'
      FROM employees e
      WHERE e.probation_end IS NOT NULL 
      AND e.probation_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND e.status = 'Active'
      AND NOT EXISTS (
        SELECT 1 FROM alerts a 
        WHERE a.employee_id = e.id 
        AND a.type = 'Probation End' 
        AND a.due_date = e.probation_end
        AND a.resolved = false
      )
      RETURNING id
    `);
    alertsCreated += probationAlerts.rows.length;
    
    // Contract renewal alerts (60 days before)
    const contractAlerts = await q(`
      INSERT INTO alerts (type, employee_id, due_date, notes)
      SELECT 'Contract Renewal', e.id, e.hire_date + INTERVAL '1 year', 'Employment contract renewal due'
      FROM employees e
      WHERE e.employment_type = 'Contract'
      AND e.hire_date + INTERVAL '1 year' BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
      AND e.status = 'Active'
      AND NOT EXISTS (
        SELECT 1 FROM alerts a 
        WHERE a.employee_id = e.id 
        AND a.type = 'Contract Renewal' 
        AND a.due_date = e.hire_date + INTERVAL '1 year'
        AND a.resolved = false
      )
      RETURNING id
    `);
    alertsCreated += contractAlerts.rows.length;
    
    // SIN expiry alerts (90 days before)
    const sinAlerts = await q(`
      INSERT INTO alerts (type, employee_id, due_date, notes)
      SELECT 'SIN Expiry', ei.employee_id, ei.expires_on, 'SIN number expiring'
      FROM employee_identifiers ei
      WHERE ei.id_type = 'SIN' 
      AND ei.expires_on IS NOT NULL
      AND ei.expires_on BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
      AND NOT EXISTS (
        SELECT 1 FROM alerts a 
        WHERE a.employee_id = ei.employee_id 
        AND a.type = 'SIN Expiry' 
        AND a.due_date = ei.expires_on
        AND a.resolved = false
      )
      RETURNING id
    `);
    alertsCreated += sinAlerts.rows.length;
    
    // Work permit expiry alerts (90 days before)
    const permitAlerts = await q(`
      INSERT INTO alerts (type, employee_id, due_date, notes)
      SELECT 'Work Permit Expiry', ei.employee_id, ei.expires_on, 'Work permit expiring'
      FROM employee_identifiers ei
      WHERE ei.id_type IN ('WorkPermit', 'StudyPermit')
      AND ei.expires_on IS NOT NULL
      AND ei.expires_on BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
      AND NOT EXISTS (
        SELECT 1 FROM alerts a 
        WHERE a.employee_id = ei.employee_id 
        AND a.type = 'Work Permit Expiry' 
        AND a.due_date = ei.expires_on
        AND a.resolved = false
      )
      RETURNING id
    `);
    alertsCreated += permitAlerts.rows.length;
    
    // Training expiry alerts (30 days before)
    const trainingAlerts = await q(`
      INSERT INTO alerts (type, employee_id, due_date, notes)
      SELECT 'Training Expiry', tr.employee_id, tr.expires_on, t.name || ' training expiring'
      FROM training_records tr
      JOIN trainings t ON tr.training_id = t.id
      WHERE tr.expires_on IS NOT NULL
      AND tr.expires_on BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND NOT EXISTS (
        SELECT 1 FROM alerts a 
        WHERE a.employee_id = tr.employee_id 
        AND a.type = 'Training Expiry' 
        AND a.due_date = tr.expires_on
        AND a.resolved = false
      )
      RETURNING id
    `);
    alertsCreated += trainingAlerts.rows.length;
    
    res.json({ 
      message: `Generated ${alertsCreated} new alerts`,
      alerts_created: alertsCreated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get compliance dashboard
r.get("/dashboard", async (_req, res) => {
  try {
    // Initialize default values
    let totalAlerts = 0;
    let alertsByType = [];
    let expiringSoon = 0;
    let activeEmployees = 0;
    let totalDocs = 0;
    let signedDocs = 0;
    let totalTraining = 0;

    try {
      const alertsResult = await q(`SELECT COUNT(*) as total FROM alerts WHERE resolved = false`);
      totalAlerts = parseInt(alertsResult.rows[0]?.total || 0);
    } catch (e) {
      console.log("Alerts count failed:", e.message);
    }

    try {
      const alertsTypeResult = await q(`SELECT type, COUNT(*) as count FROM alerts WHERE resolved = false GROUP BY type ORDER BY count DESC`);
      alertsByType = alertsTypeResult.rows || [];
    } catch (e) {
      console.log("Alerts by type failed:", e.message);
    }

    try {
      const expiringSoonResult = await q(`SELECT COUNT(*) as count FROM alerts WHERE resolved = false AND due_date <= CURRENT_DATE + INTERVAL '7 days'`);
      expiringSoon = parseInt(expiringSoonResult.rows[0]?.count || 0);
    } catch (e) {
      console.log("Expiring soon failed:", e.message);
    }

    try {
      const employeesResult = await q(`SELECT COUNT(*) as total FROM employees WHERE status = 'Active'`);
      activeEmployees = parseInt(employeesResult.rows[0]?.total || 0);
    } catch (e) {
      console.log("Active employees failed:", e.message);
    }

    try {
      const docsResult = await q(`SELECT COUNT(*) as total FROM documents`);
      totalDocs = parseInt(docsResult.rows[0]?.total || 0);
    } catch (e) {
      console.log("Documents count failed:", e.message);
    }

    try {
      const signedDocsResult = await q(`SELECT COUNT(*) as signed FROM documents WHERE signed = true`);
      signedDocs = parseInt(signedDocsResult.rows[0]?.signed || 0);
    } catch (e) {
      console.log("Signed documents failed:", e.message);
    }

    try {
      const trainingResult = await q(`SELECT COUNT(*) as total FROM training_records`);
      totalTraining = parseInt(trainingResult.rows[0]?.total || 0);
    } catch (e) {
      console.log("Training count failed:", e.message);
    }
    
    res.json({
      total_alerts: totalAlerts,
      alerts_by_type: alertsByType,
      expiring_soon: expiringSoon,
      compliance_rate: {
        contract_compliance: totalDocs > 0 ? Math.round((signedDocs / totalDocs) * 100) : 100,
        training_compliance: activeEmployees > 0 && totalTraining > 0 ? Math.round((totalTraining / activeEmployees) * 100) : 0
      },
      active_employees: activeEmployees,
      total_documents: totalDocs,
      signed_documents: signedDocs,
      total_training_records: totalTraining
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: `Dashboard error: ${error.message}` });
  }
});

export default r;
