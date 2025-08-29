import { Router } from "express";
import { q } from "../db.js";

const r = Router();

// Get workforce metrics
r.get("/workforce", async (_req, res) => {
  try {
    const [totalEmployees, activeEmployees, fullTime, partTime, contract] = await Promise.all([
      q(`SELECT COUNT(*) as count FROM employees`),
      q(`SELECT COUNT(*) as count FROM employees WHERE status = 'Active'`),
      q(`SELECT COUNT(*) as count FROM employees WHERE status = 'Active' AND employment_type = 'Full-time'`),
      q(`SELECT COUNT(*) as count FROM employees WHERE status = 'Active' AND employment_type = 'Part-time'`),
      q(`SELECT COUNT(*) as count FROM employees WHERE status = 'Active' AND employment_type = 'Contract'`)
    ]);

    res.json({
      total: parseInt(activeEmployees.rows[0].count),
      breakdown: {
        full_time: parseInt(fullTime.rows[0].count),
        part_time: parseInt(partTime.rows[0].count),
        contract: parseInt(contract.rows[0].count)
      }
    });
  } catch (error) {
    console.error("Error fetching workforce metrics:", error);
    res.status(500).json({ error: "Failed to fetch workforce metrics" });
  }
});

// Get attendance metrics
r.get("/attendance", async (_req, res) => {
  try {
    const [totalEntries, lateEntries, earlyDepartures, avgHours] = await Promise.all([
      q(`SELECT COUNT(*) as count FROM time_entries`),
      q(`SELECT COUNT(*) as count FROM time_entries WHERE was_late = true`),
      q(`SELECT COUNT(*) as count FROM time_entries WHERE left_early = true`),
      q(`SELECT COALESCE(AVG(hours_worked), 0) as avg FROM time_entries WHERE work_date >= CURRENT_DATE - INTERVAL '7 days'`)
    ]);

    // Calculate absenteeism rate (simplified)
    const absenteeismRate = 0; // Since we don't have comprehensive attendance data

    res.json({
      absenteeism_rate: absenteeismRate,
      avg_hours_week: parseFloat(avgHours.rows[0].avg).toFixed(1),
      late_arrivals: parseInt(lateEntries.rows[0].count),
      early_leaves: parseInt(earlyDepartures.rows[0].count)
    });
  } catch (error) {
    console.error("Error fetching attendance metrics:", error);
    res.status(500).json({ error: "Failed to fetch attendance metrics" });
  }
});

// Get compliance metrics
r.get("/compliance", async (_req, res) => {
  try {
    const [totalAlerts, resolvedAlerts, contractsSigned, whmisValid] = await Promise.all([
      q(`SELECT COUNT(*) as count FROM alerts`),
      q(`SELECT COUNT(*) as count FROM alerts WHERE resolved = true`),
      q(`SELECT ROUND(100.0 * COUNT(*) / GREATEST((SELECT COUNT(*) FROM employees WHERE status = 'Active'), 1), 2) as pct FROM documents WHERE doc_type = 'Contract' AND signed = true`),
      q(`SELECT ROUND(100.0 * COUNT(*) / GREATEST((SELECT COUNT(*) FROM employees WHERE status = 'Active'), 1), 2) as pct FROM training_records tr JOIN trainings t ON t.id = tr.training_id WHERE t.code = 'WHMIS' AND (tr.expires_on IS NULL OR tr.expires_on >= CURRENT_DATE)`)
    ]);

    res.json({
      contracts_signed_pct: parseFloat(contractsSigned.rows[0].pct || 0),
      whmis_valid_pct: parseFloat(whmisValid.rows[0].pct || 0)
    });
  } catch (error) {
    console.error("Error fetching compliance metrics:", error);
    res.status(500).json({ error: "Failed to fetch compliance metrics" });
  }
});

export default r;
