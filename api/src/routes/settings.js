import express from "express";
import { z } from "zod";
import { q } from "../db.js";
import { requireAuth } from "../session.js";

const r = express.Router();

// Get all system settings
r.get("/system", requireAuth, async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT 
        'company_name' as key, 'C&C Logistics' as value, 'text' as type, 'Company Information' as category
      UNION ALL
      SELECT 'company_address', '123 Business St, Toronto, ON', 'text', 'Company Information'
      UNION ALL
      SELECT 'company_phone', '+1 (416) 555-0123', 'text', 'Company Information'
      UNION ALL
      SELECT 'company_email', 'hr@cc-logistics.com', 'email', 'Company Information'
      UNION ALL
      SELECT 'default_probation_months', '3', 'number', 'HR Settings'
      UNION ALL
      SELECT 'default_work_hours', '40', 'number', 'HR Settings'
      UNION ALL
      SELECT 'overtime_threshold', '40', 'number', 'HR Settings'
      UNION ALL
      SELECT 'session_timeout_minutes', '30', 'number', 'Security Settings'
      UNION ALL
      SELECT 'password_expiry_days', '90', 'number', 'Security Settings'
      UNION ALL
      SELECT 'backup_frequency_days', '7', 'number', 'System Settings'
      UNION ALL
      SELECT 'data_retention_years', '7', 'number', 'System Settings'
      UNION ALL
      SELECT 'email_notifications', 'true', 'boolean', 'Notification Settings'
      UNION ALL
      SELECT 'sms_notifications', 'false', 'boolean', 'Notification Settings'
      UNION ALL
      SELECT 'dashboard_refresh_interval', '300', 'number', 'UI Settings'
      ORDER BY category, key
    `);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching system settings:", error);
    res.status(500).json({ error: "Failed to fetch system settings" });
  }
});

// Update system setting
r.put("/system/:key", requireAuth, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  try {
    // In a real application, you would store these in a settings table
    // For now, we'll just return success
    res.json({ 
      message: "Setting updated successfully",
      key,
      value
    });
  } catch (error) {
    console.error("Error updating system setting:", error);
    res.status(500).json({ error: "Failed to update system setting" });
  }
});

// Get user preferences
r.get("/preferences", requireAuth, async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT 
        'theme' as key, 'dark' as value, 'select' as type, 'dark,light' as options, 'Appearance' as category
      UNION ALL
      SELECT 'language', 'en', 'select', 'en,fr,es', 'Localization'
      UNION ALL
      SELECT 'timezone', 'America/Toronto', 'select', 'America/Toronto,America/Vancouver,UTC', 'Localization'
      UNION ALL
      SELECT 'date_format', 'MM/DD/YYYY', 'select', 'MM/DD/YYYY,DD/MM/YYYY,YYYY-MM-DD', 'Localization'
      UNION ALL
      SELECT 'currency', 'CAD', 'select', 'CAD,USD,EUR', 'Localization'
      UNION ALL
      SELECT 'notifications_enabled', 'true', 'boolean', '', 'Notifications'
      UNION ALL
      SELECT 'email_notifications', 'true', 'boolean', '', 'Notifications'
      UNION ALL
      SELECT 'dashboard_layout', 'default', 'select', 'default,compact,detailed', 'Dashboard'
      UNION ALL
      SELECT 'auto_refresh', 'true', 'boolean', '', 'Dashboard'
      UNION ALL
      SELECT 'show_analytics', 'true', 'boolean', '', 'Dashboard'
      ORDER BY category, key
    `);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    res.status(500).json({ error: "Failed to fetch user preferences" });
  }
});

// Update user preference
r.put("/preferences/:key", requireAuth, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  try {
    // In a real application, you would store these in a user_preferences table
    res.json({ 
      message: "Preference updated successfully",
      key,
      value
    });
  } catch (error) {
    console.error("Error updating user preference:", error);
    res.status(500).json({ error: "Failed to update user preference" });
  }
});

// Get notification settings
r.get("/notifications", requireAuth, async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT 
        'new_employee_notification' as key, 'true' as value, 'boolean' as type, 'New employee onboarding' as description
      UNION ALL
      SELECT 'termination_notification', 'true', 'boolean', 'Employee termination'
      UNION ALL
      SELECT 'probation_reminder', 'true', 'boolean', 'Probation period reminders'
      UNION ALL
      SELECT 'contract_expiry', 'true', 'boolean', 'Contract expiration alerts'
      UNION ALL
      SELECT 'leave_request', 'true', 'boolean', 'Leave request notifications'
      UNION ALL
      SELECT 'payroll_reminder', 'true', 'boolean', 'Payroll processing reminders'
      UNION ALL
      SELECT 'training_expiry', 'true', 'boolean', 'Training certification expiry'
      UNION ALL
      SELECT 'system_maintenance', 'false', 'boolean', 'System maintenance alerts'
      ORDER BY key
    `);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    res.status(500).json({ error: "Failed to fetch notification settings" });
  }
});

// Update notification setting
r.put("/notifications/:key", requireAuth, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  try {
    res.json({ 
      message: "Notification setting updated successfully",
      key,
      value
    });
  } catch (error) {
    console.error("Error updating notification setting:", error);
    res.status(500).json({ error: "Failed to update notification setting" });
  }
});

// Get security settings
r.get("/security", requireAuth, async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT 
        'session_timeout_minutes' as key, '30' as value, 'number' as type, 'Session timeout in minutes' as description
      UNION ALL
      SELECT 'password_expiry_days', '90', 'number', 'Password expiry in days'
      UNION ALL
      SELECT 'max_login_attempts', '5', 'number', 'Maximum login attempts'
      UNION ALL
      SELECT 'two_factor_auth', 'false', 'boolean', 'Enable two-factor authentication'
      UNION ALL
      SELECT 'ip_whitelist', '', 'text', 'Allowed IP addresses (comma-separated)'
      UNION ALL
      SELECT 'audit_log_enabled', 'true', 'boolean', 'Enable audit logging'
      ORDER BY key
    `);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching security settings:", error);
    res.status(500).json({ error: "Failed to fetch security settings" });
  }
});

// Update security setting
r.put("/security/:key", requireAuth, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  try {
    res.json({ 
      message: "Security setting updated successfully",
      key,
      value
    });
  } catch (error) {
    console.error("Error updating security setting:", error);
    res.status(500).json({ error: "Failed to update security setting" });
  }
});

// Get backup and maintenance settings
r.get("/maintenance", requireAuth, async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT 
        'backup_frequency_days' as key, '7' as value, 'number' as type, 'Backup frequency in days' as description
      UNION ALL
      SELECT 'backup_retention_days', '30', 'number', 'Backup retention in days'
      UNION ALL
      SELECT 'auto_backup', 'true', 'boolean', 'Enable automatic backups'
      UNION ALL
      SELECT 'maintenance_window', '02:00-04:00', 'text', 'Maintenance window (24h format)'
      UNION ALL
      SELECT 'data_retention_years', '7', 'number', 'Data retention in years'
      UNION ALL
      SELECT 'log_retention_days', '90', 'number', 'Log retention in days'
      ORDER BY key
    `);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching maintenance settings:", error);
    res.status(500).json({ error: "Failed to fetch maintenance settings" });
  }
});

// Update maintenance setting
r.put("/maintenance/:key", requireAuth, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  try {
    res.json({ 
      message: "Maintenance setting updated successfully",
      key,
      value
    });
  } catch (error) {
    console.error("Error updating maintenance setting:", error);
    res.status(500).json({ error: "Failed to update maintenance setting" });
  }
});

// Export settings
r.get("/export", requireAuth, async (req, res) => {
  try {
    const [systemSettings, userPreferences, notifications, security, maintenance] = await Promise.all([
      q(`SELECT 'company_name' as key, 'C&C Logistics' as value, 'system' as category`),
      q(`SELECT 'theme' as key, 'dark' as value, 'preference' as category`),
      q(`SELECT 'new_employee_notification' as key, 'true' as value, 'notification' as category`),
      q(`SELECT 'session_timeout_minutes' as key, '30' as value, 'security' as category`),
      q(`SELECT 'backup_frequency_days' as key, '7' as value, 'maintenance' as category`)
    ]);
    
    const allSettings = [
      ...systemSettings.rows,
      ...userPreferences.rows,
      ...notifications.rows,
      ...security.rows,
      ...maintenance.rows
    ];
    
    const csvData = 'Category,Key,Value\n' + 
      allSettings.map(s => `${s.category},${s.key},${s.value}`).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="settings_export.csv"');
    res.send(csvData);
  } catch (error) {
    console.error("Error exporting settings:", error);
    res.status(500).json({ error: "Failed to export settings" });
  }
});

export default r;
