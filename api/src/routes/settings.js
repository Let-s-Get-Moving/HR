import express from "express";
import { z } from "zod";
import { q } from "../db.js";
import { requireAuth, optionalAuth } from "../session.js";
import { requireRole, ROLES } from "../middleware/rbac.js";

const r = express.Router();

// Get all system settings (from database)
r.get("/system", async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT key, value, type, description
      FROM application_settings
      WHERE category = 'system'
      ORDER BY key
    `);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching system settings:", error);
    
    // If table doesn't exist, return default settings
    if (error.message.includes('relation "application_settings" does not exist')) {
      console.log("📋 Settings table not found, returning default settings");
      res.json([
        { key: 'company_name', value: 'C&C Logistics', type: 'string', description: 'Company name' },
        { key: 'timezone', value: 'UTC', type: 'string', description: 'Default timezone' },
        { key: 'date_format', value: 'MM/DD/YYYY', type: 'string', description: 'Date format' },
        { key: 'currency', value: 'USD', type: 'string', description: 'Default currency' }
      ]);
    } else {
      res.status(500).json({ error: "Failed to fetch system settings" });
    }
  }
});

// Update system setting (saves to database)
r.put("/system/:key", async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  try {
    console.log(`💾 Updating setting ${key} = ${value}`);
    
    // Update setting in database
    const result = await q(`
      UPDATE application_settings 
      SET value = $1, updated_at = NOW()
      WHERE key = $2 AND category = 'system'
      RETURNING *
    `, [value, key]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Setting not found" });
    }
    
    console.log(`✅ Setting ${key} updated successfully`);
    
    res.json({ 
      message: "Setting updated successfully",
      setting: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating system setting:", error);
    res.status(500).json({ error: "Failed to update system setting" });
  }
});

// Get user preferences (from database) - per-user settings with system defaults fallback
r.get("/preferences", optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    
    // Get system defaults (user_id IS NULL) - these are the base settings
    const systemDefaults = await q(`
      SELECT key, value, type, description
      FROM application_settings
      WHERE category = 'preferences' AND user_id IS NULL
      ORDER BY key
    `).catch(() => ({ rows: [] }));
    
    let rows = systemDefaults.rows;
    
    // If user is logged in, get their overrides and merge with system defaults
    if (userId) {
      const userOverrides = await q(`
        SELECT key, value, type, description
        FROM application_settings
        WHERE category = 'preferences' AND user_id = $1
        ORDER BY key
      `, [userId]).catch(() => ({ rows: [] }));
      
      // Merge: user-specific settings override system defaults
      const userSettingsMap = new Map(userOverrides.rows.map(s => [s.key, s]));
      rows = systemDefaults.rows.map(s => userSettingsMap.get(s.key) || s);
    }
    
    // If no settings exist at all, return hardcoded defaults
    if (rows.length === 0) {
      rows = [
        { key: 'theme', value: 'dark', type: 'select', description: 'UI theme (light/dark)' },
        { key: 'language', value: 'en', type: 'select', description: 'Interface language' },
        { key: 'timezone', value: 'UTC', type: 'select', description: 'User timezone' },
        { key: 'dashboard_layout', value: 'grid', type: 'select', description: 'Dashboard layout preference' }
      ];
    }
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    res.status(500).json({ error: "Failed to fetch user preferences" });
  }
});

// Update user preference (saves to database) - per-user settings
r.put("/preferences/:key", requireAuth, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  try {
    console.log(`💾 Updating preference ${key} = ${value} for user ${userId}`);
    console.log(`📊 User ID type: ${typeof userId}, value: ${userId}`);
    
    // Get the setting type and description from defaults or existing setting
    const defaultSetting = await q(`
      SELECT type, description, category
      FROM application_settings
      WHERE key = $1 AND category = 'preferences' AND user_id IS NULL
      LIMIT 1
    `, [key]).catch(() => ({ rows: [] }));
    
    console.log(`📊 Default setting found: ${defaultSetting.rows.length > 0}`);
    
    const settingType = defaultSetting.rows[0]?.type || 'select';
    const description = defaultSetting.rows[0]?.description || '';
    
    console.log(`📊 Type: ${settingType}, Description: ${description}`);
    
    // Use INSERT ... ON CONFLICT to create or update per-user setting
    // ON CONFLICT must match the partial unique index with WHERE clause
    const result = await q(`
      INSERT INTO application_settings (key, value, type, category, description, user_id, updated_at)
      VALUES ($1, $2, $3, 'preferences', $4, $5, NOW())
      ON CONFLICT (key, user_id) WHERE user_id IS NOT NULL
      DO UPDATE SET 
        value = EXCLUDED.value,
        updated_at = NOW()
      RETURNING *
    `, [key, value, settingType, description, userId]);
    
    console.log(`✅ Preference ${key} saved successfully for user ${userId}`);
    
    res.json({ 
      message: "Preference updated successfully",
      setting: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Error updating user preference:", error);
    console.error("❌ Error details:", error.message);
    console.error("❌ Stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to update user preference",
      details: error.message 
    });
  }
});

// Get notification settings (from database) - per-user settings with system defaults fallback
// NOTE: Only functional notifications are returned. Removed: push_notifications, sms_notifications (not implemented)
r.get("/notifications", optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    
    // Get system defaults (user_id IS NULL)
    const systemDefaults = await q(`
      SELECT key, value, type, description
      FROM application_settings
      WHERE category = 'notifications' AND user_id IS NULL
      ORDER BY key
    `).catch(() => ({ rows: [] }));
    
    let rows = systemDefaults.rows;
    
    // If user is logged in, get their overrides and merge with system defaults
    if (userId) {
      const userOverrides = await q(`
        SELECT key, value, type, description
        FROM application_settings
        WHERE category = 'notifications' AND user_id = $1
        ORDER BY key
      `, [userId]).catch(() => ({ rows: [] }));
      
      // Merge: user-specific settings override system defaults
      const userSettingsMap = new Map(userOverrides.rows.map(s => [s.key, s]));
      rows = systemDefaults.rows.map(s => userSettingsMap.get(s.key) || s);
    }
    
    // If no settings exist at all, return hardcoded defaults
    if (rows.length === 0) {
      rows = [
        { key: 'email_notifications', value: 'true', type: 'boolean', description: 'Enable email notifications' }
      ];
    }
    
    // Filter out non-functional notification settings
    const functionalNotifications = ['email_notifications'];
    rows = rows.filter(setting => functionalNotifications.includes(setting.key));
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    res.status(500).json({ error: "Failed to fetch notification settings" });
  }
});

// Update notification setting (saves to database) - per-user settings
r.put("/notifications/:key", requireAuth, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  try {
    console.log(`💾 Updating notification ${key} = ${value} for user ${userId}`);
    console.log(`📊 User ID type: ${typeof userId}, value: ${userId}`);
    
    // Get the setting type and description from defaults or existing setting
    const defaultSetting = await q(`
      SELECT type, description, category
      FROM application_settings
      WHERE key = $1 AND category = 'notifications' AND user_id IS NULL
      LIMIT 1
    `, [key]).catch(() => ({ rows: [] }));
    
    console.log(`📊 Default setting found: ${defaultSetting.rows.length > 0}`);
    
    const settingType = defaultSetting.rows[0]?.type || 'boolean';
    const description = defaultSetting.rows[0]?.description || '';
    
    console.log(`📊 Type: ${settingType}, Description: ${description}`);
    
    // Use INSERT ... ON CONFLICT to create or update per-user setting
    // ON CONFLICT must match the partial unique index with WHERE clause
    const result = await q(`
      INSERT INTO application_settings (key, value, type, category, description, user_id, updated_at)
      VALUES ($1, $2, $3, 'notifications', $4, $5, NOW())
      ON CONFLICT (key, user_id) WHERE user_id IS NOT NULL
      DO UPDATE SET 
        value = EXCLUDED.value,
        updated_at = NOW()
      RETURNING *
    `, [key, value, settingType, description, userId]);
    
    console.log(`✅ Notification ${key} saved successfully for user ${userId}`);
    
    res.json({ 
      message: "Notification setting updated successfully",
      setting: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Error updating notification setting:", error);
    console.error("❌ Error details:", error.message);
    console.error("❌ Stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to update notification setting",
      details: error.message 
    });
  }
});

// Get security settings (from database, requires auth to see MFA status)
// NOTE: Only returns settings that are actually enforced by the backend.
// Removed non-functional settings that were hardcoded:
// - session_timeout_minutes (hardcoded to 8 hours in auth.js:71)
// - max_login_attempts/login_attempts_limit (hardcoded to 5 in account-lockout.js:13)
// - lockout_duration_minutes (hardcoded to 30 min in account-lockout.js:14)
// - password_min_length (hardcoded to 8 chars in auth-mfa.js:612)
r.get("/security", requireAuth, async (req, res) => {
  try {
    console.log('🔍 [SETTINGS] GET /security called');
    console.log('🔍 [SETTINGS] User ID:', req.user?.id);
    console.log('🔍 [SETTINGS] Username:', req.user?.username);
    
    // Get settings from database - mix of user-specific and system-wide
    // Some security settings are per-user (like session_timeout), others are system-wide
    const userId = req.user.id;
    
    // Get user-specific security settings
    const userRows = await q(`
      SELECT key, value, type, description
      FROM application_settings
      WHERE category = 'security' AND user_id = $1
      ORDER BY key
    `, [userId]).catch(() => ({ rows: [] }));
    
    // Get system-wide security settings (user_id IS NULL) as defaults
    const systemRows = await q(`
      SELECT key, value, type, description
      FROM application_settings
      WHERE category = 'security' AND user_id IS NULL
      ORDER BY key
    `).catch(() => ({ rows: [] }));
    
    // Merge: user-specific settings override system defaults
    const userSettingsMap = new Map(userRows.rows.map(s => [s.key, s]));
    const rows = systemRows.rows.map(s => userSettingsMap.get(s.key) || s);
    
    // Filter out non-functional security settings (hardcoded values that UI can't actually change)
    const functionalSecuritySettings = ['two_factor_auth', 'password_expiry_days'];
    let filteredRows = rows.filter(setting => functionalSecuritySettings.includes(setting.key));
    
    // ALWAYS check actual MFA status from database (user is authenticated via requireAuth)
    try {
      const { MFAService } = await import('../services/mfa.js');
      const mfaEnabled = await MFAService.isMFAEnabled(req.user.id);
      
      console.log('🔍 [SETTINGS] MFA Status from database:', mfaEnabled);
      
      // Update the two_factor_auth value with actual status
      const mfaSetting = filteredRows.find(r => r.key === 'two_factor_auth');
      if (mfaSetting) {
        mfaSetting.value = mfaEnabled ? 'true' : 'false';
        console.log('✅ [SETTINGS] Updated MFA toggle to:', mfaSetting.value);
      }
    } catch (error) {
      console.error('❌ [SETTINGS] Error checking MFA status:', error);
      // Continue with default value if check fails
    }
    
    res.json(filteredRows);
  } catch (error) {
    console.error("Error fetching security settings:", error);
    
    // If table doesn't exist, return default security settings (only functional ones)
    if (error.message.includes('relation "application_settings" does not exist')) {
      console.log("📋 Settings table not found, returning default security settings");
      res.json([
        { key: 'two_factor_auth', value: 'false', type: 'boolean', description: 'Enable two-factor authentication' }
      ]);
    } else {
      res.status(500).json({ error: "Failed to fetch security settings" });
    }
  }
});

// Update security setting
r.put("/security/:key", requireAuth, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 [SETTINGS] PUT /security/:key called');
  console.log(`🔧 [SETTINGS] Key: ${key}`);
  console.log(`🔧 [SETTINGS] Value: ${value}`);
  console.log(`🔧 [SETTINGS] User ID: ${req.user?.id}`);
  console.log(`🔧 [SETTINGS] Username: ${req.user?.username}`);
  console.log(`🔧 [SETTINGS] Session ID: ${req.session?.id?.substring(0, 15)}...`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // Special handling for two_factor_auth
    if (key === 'two_factor_auth') {
      // Import MFAService at the top if not already imported
      const { MFAService } = await import('../services/mfa.js');
      
      if (value === 'true' || value === true) {
        // Enable MFA - check if already set up
        const isEnabled = await MFAService.isMFAEnabled(req.user.id);
        
        if (isEnabled) {
          return res.json({ 
            message: "MFA already enabled",
            key,
            value: true,
            status: 'already_enabled'
          });
        }
        
        // Return setup instructions
        return res.json({
          message: "MFA setup required. Please visit the MFA setup page.",
          key,
          value: false,
          status: 'setup_required',
          setupEndpoint: '/api/auth/mfa/setup'
        });
      } else {
        // Disable MFA
        await MFAService.disableMFA(req.user.id);
        return res.json({ 
          message: "MFA disabled successfully",
          key,
          value: false,
          status: 'disabled'
        });
      }
    }
    
    // Generic handler for other security settings - save per-user where applicable
    console.log(`💾 Updating security setting ${key} = ${value} for user ${userId}`);
    console.log(`📊 User ID type: ${typeof userId}, value: ${userId}`);
    
    // Get the setting type and description from system defaults
    const defaultSetting = await q(`
      SELECT type, description, category
      FROM application_settings
      WHERE key = $1 AND category = 'security' AND user_id IS NULL
      LIMIT 1
    `, [key]).catch(() => ({ rows: [] }));
    
    console.log(`📊 Default setting found: ${defaultSetting.rows.length > 0}`);
    
    const settingType = defaultSetting.rows[0]?.type || 'text';
    const description = defaultSetting.rows[0]?.description || '';
    
    console.log(`📊 Type: ${settingType}, Description: ${description}`);
    
    // Save as per-user setting (some security settings can be per-user)
    // Note: two_factor_auth is handled separately via MFA service
    // ON CONFLICT must match the partial unique index with WHERE clause
    const result = await q(`
      INSERT INTO application_settings (key, value, type, category, description, user_id, updated_at)
      VALUES ($1, $2, $3, 'security', $4, $5, NOW())
      ON CONFLICT (key, user_id) WHERE user_id IS NOT NULL
      DO UPDATE SET 
        value = EXCLUDED.value,
        updated_at = NOW()
      RETURNING *
    `, [key, value, settingType, description, userId]);
    
    console.log(`✅ Security setting ${key} saved successfully for user ${userId}`);
    
    res.json({ 
      message: "Security setting updated successfully",
      setting: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Error updating security setting:", error);
    console.error("❌ Error details:", error.message);
    console.error("❌ Stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to update security setting",
      details: error.message 
    });
  }
});

// ============================================================================
// MAINTENANCE ENDPOINTS REMOVED (2026-01-19)
// ============================================================================
// The maintenance tab and all its settings were non-functional UI placeholders:
// - backup_enabled: no backup system exists
// - backup_frequency_days: no scheduled backups
// - cleanup_enabled: no cleanup jobs
// - retention_days: nothing checks this value
// - maintenance_mode: no access blocking when "enabled"
//
// These settings were stored in the database but never read or enforced by any code.
// ============================================================================

// MFA Setup - Generate QR Code
r.post("/security/mfa/setup", requireAuth, async (req, res) => {
  try {
    const { MFAService } = await import('../services/mfa.js');
    const { UserManagementService } = await import('../services/user-management.js');
    
    const userId = req.user.id;
    const user = await UserManagementService.getUserById(userId);
    
    const mfaData = await MFAService.setupMFA(userId, user.email);
    
    res.json({
      success: true,
      message: "MFA setup initiated. Scan the QR code with your authenticator app.",
      qrCode: mfaData.qrCode,
      secret: mfaData.secret,
      backupCodes: mfaData.backupCodes
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: "MFA setup failed: " + error.message });
  }
});

// MFA Verify - Enable MFA
r.post("/security/mfa/verify", requireAuth, async (req, res) => {
  try {
    const { MFAService } = await import('../services/mfa.js');
    const { code } = req.body;
    const userId = req.user.id;
    
    if (!code) {
      return res.status(400).json({ error: "Verification code required" });
    }
    
    const verified = await MFAService.verifyAndEnableMFA(userId, code);
    
    if (!verified) {
      return res.status(401).json({ error: "Invalid verification code" });
    }
    
    res.json({
      success: true,
      message: "MFA enabled successfully",
      enabled: true
    });
  } catch (error) {
    console.error('MFA verify error:', error);
    res.status(500).json({ error: "MFA verification failed: " + error.message });
  }
});

// MFA Disable
r.post("/security/mfa/disable", requireAuth, async (req, res) => {
  try {
    const { MFAService } = await import('../services/mfa.js');
    const userId = req.user.id;
    
    await MFAService.disableMFA(userId);
    
    res.json({
      success: true,
      message: "MFA disabled successfully",
      enabled: false
    });
  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(500).json({ error: "MFA disable failed: " + error.message });
  }
});

// MFA Status
r.get("/security/mfa/status", requireAuth, async (req, res) => {
  try {
    const { MFAService } = await import('../services/mfa.js');
    const userId = req.user.id;
    
    const enabled = await MFAService.isMFAEnabled(userId);
    
    res.json({
      enabled,
      message: enabled ? "MFA is enabled" : "MFA is not enabled"
    });
  } catch (error) {
    console.error('MFA status check error:', error);
    res.status(500).json({ error: "Failed to check MFA status" });
  }
});

// Export settings
r.get("/export", requireAuth, async (req, res) => {
  try {
    const [systemSettings, userPreferences, notifications, security] = await Promise.all([
      q(`SELECT 'company_name' as key, 'C&C Logistics' as value, 'system' as category`),
      q(`SELECT 'theme' as key, 'dark' as value, 'preference' as category`),
      q(`SELECT 'email_notifications' as key, 'true' as value, 'notification' as category`),
      q(`SELECT 'two_factor_auth' as key, 'false' as value, 'security' as category`)
    ]);
    
    const allSettings = [
      ...systemSettings.rows,
      ...userPreferences.rows,
      ...notifications.rows,
      ...security.rows
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

// ============================================================================
// Job Titles/Positions Endpoints
// ============================================================================

r.get("/job-titles", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT jt.*, d.name as department_name,
        (SELECT COUNT(*) FROM employees WHERE role_title = jt.name) as employee_count
      FROM job_titles jt
      LEFT JOIN departments d ON jt.department_id = d.id
      ORDER BY jt.name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching job titles:', error);
    res.status(500).json({ error: 'Failed to fetch job titles' });
  }
});

r.post("/job-titles", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { name, description, department_id, level_grade, reports_to_id, min_salary, max_salary } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Job title name is required' });
    }
    
    const result = await q(`
      INSERT INTO job_titles (name, description, department_id, level_grade, reports_to_id, min_salary, max_salary)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name.trim(), description || null, department_id || null, level_grade || null, reports_to_id || null, min_salary || null, max_salary || null]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Job title with this name already exists in this department' });
    }
    console.error('Error creating job title:', error);
    res.status(500).json({ error: 'Failed to create job title' });
  }
});

r.put("/job-titles/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, department_id, level_grade, reports_to_id, min_salary, max_salary } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid job title ID' });
    }
    
    const result = await q(`
      UPDATE job_titles
      SET name = $1, description = $2, department_id = $3, level_grade = $4, reports_to_id = $5, min_salary = $6, max_salary = $7
      WHERE id = $8
      RETURNING *
    `, [name, description || null, department_id || null, level_grade || null, reports_to_id || null, min_salary || null, max_salary || null, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job title not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating job title:', error);
    res.status(500).json({ error: 'Failed to update job title' });
  }
});

r.delete("/job-titles/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid job title ID' });
    }
    
    // Check if any employees are assigned to this job title
    const employeeCheck = await q(`
      SELECT COUNT(*) as count FROM employees WHERE role_title = (SELECT name FROM job_titles WHERE id = $1)
    `, [id]);
    
    if (parseInt(employeeCheck.rows[0].count, 10) > 0) {
      return res.status(400).json({ error: 'Cannot delete job title with assigned employees' });
    }
    
    const result = await q(`DELETE FROM job_titles WHERE id = $1 RETURNING *`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job title not found' });
    }
    
    res.json({ message: 'Job title deleted successfully' });
  } catch (error) {
    console.error('Error deleting job title:', error);
    res.status(500).json({ error: 'Failed to delete job title' });
  }
});

// ============================================================================
// Benefits Packages Endpoints
// ============================================================================

r.get("/benefits-packages", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT bp.*,
        (SELECT COUNT(*) FROM employees WHERE benefits_package_id = bp.id) as employee_count
      FROM benefits_packages bp
      ORDER BY bp.name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching benefits packages:', error);
    res.status(500).json({ error: 'Failed to fetch benefits packages' });
  }
});

r.post("/benefits-packages", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { name, description, benefit_types, coverage_level, employee_cost, employer_cost } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Package name is required' });
    }
    
    const result = await q(`
      INSERT INTO benefits_packages (name, description, benefit_types, coverage_level, employee_cost, employer_cost)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name.trim(), description || null, JSON.stringify(benefit_types || []), coverage_level || 'Standard', employee_cost || 0, employer_cost || 0]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Benefits package with this name already exists' });
    }
    console.error('Error creating benefits package:', error);
    res.status(500).json({ error: 'Failed to create benefits package' });
  }
});

r.put("/benefits-packages/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, benefit_types, coverage_level, employee_cost, employer_cost } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid benefits package ID' });
    }
    
    const result = await q(`
      UPDATE benefits_packages
      SET name = $1, description = $2, benefit_types = $3, coverage_level = $4, employee_cost = $5, employer_cost = $6
      WHERE id = $7
      RETURNING *
    `, [name, description || null, JSON.stringify(benefit_types || []), coverage_level || 'Standard', employee_cost || 0, employer_cost || 0, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Benefits package not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating benefits package:', error);
    res.status(500).json({ error: 'Failed to update benefits package' });
  }
});

r.delete("/benefits-packages/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid benefits package ID' });
    }
    
    // Check if any employees are assigned to this package
    const employeeCheck = await q(`
      SELECT COUNT(*) as count FROM employees WHERE benefits_package_id = $1
    `, [id]);
    
    if (parseInt(employeeCheck.rows[0].count, 10) > 0) {
      return res.status(400).json({ error: 'Cannot delete benefits package assigned to employees' });
    }
    
    const result = await q(`DELETE FROM benefits_packages WHERE id = $1 RETURNING *`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Benefits package not found' });
    }
    
    res.json({ message: 'Benefits package deleted successfully' });
  } catch (error) {
    console.error('Error deleting benefits package:', error);
    res.status(500).json({ error: 'Failed to delete benefits package' });
  }
});

// ============================================================================
// Work Schedules Endpoints
// ============================================================================

r.get("/work-schedules", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT ws.*,
        (SELECT COUNT(*) FROM employees WHERE work_schedule_id = ws.id) as employee_count
      FROM work_schedules ws
      ORDER BY ws.name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching work schedules:', error);
    res.status(500).json({ error: 'Failed to fetch work schedules' });
  }
});

r.post("/work-schedules", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { name, description, start_time, end_time, days_of_week, break_duration_minutes, flexible_hours, max_hours_per_week } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Schedule name is required' });
    }
    
    if (!start_time || !end_time) {
      return res.status(400).json({ error: 'Start time and end time are required' });
    }
    
    const result = await q(`
      INSERT INTO work_schedules (name, description, start_time, end_time, days_of_week, break_duration_minutes, flexible_hours, max_hours_per_week)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name.trim(), description || null, start_time, end_time, JSON.stringify(days_of_week || []), break_duration_minutes || 0, flexible_hours || false, max_hours_per_week || 40]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Work schedule with this name already exists' });
    }
    console.error('Error creating work schedule:', error);
    res.status(500).json({ error: 'Failed to create work schedule' });
  }
});

r.put("/work-schedules/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, start_time, end_time, days_of_week, break_duration_minutes, flexible_hours, max_hours_per_week } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid work schedule ID' });
    }
    
    const result = await q(`
      UPDATE work_schedules
      SET name = $1, description = $2, start_time = $3, end_time = $4, days_of_week = $5, break_duration_minutes = $6, flexible_hours = $7, max_hours_per_week = $8
      WHERE id = $9
      RETURNING *
    `, [name, description || null, start_time, end_time, JSON.stringify(days_of_week || []), break_duration_minutes || 0, flexible_hours || false, max_hours_per_week || 40, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work schedule not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating work schedule:', error);
    res.status(500).json({ error: 'Failed to update work schedule' });
  }
});

r.delete("/work-schedules/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid work schedule ID' });
    }
    
    // Check if any employees are assigned to this schedule
    const employeeCheck = await q(`
      SELECT COUNT(*) as count FROM employees WHERE work_schedule_id = $1
    `, [id]);
    
    if (parseInt(employeeCheck.rows[0].count, 10) > 0) {
      return res.status(400).json({ error: 'Cannot delete work schedule assigned to employees' });
    }
    
    const result = await q(`DELETE FROM work_schedules WHERE id = $1 RETURNING *`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work schedule not found' });
    }
    
    res.json({ message: 'Work schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting work schedule:', error);
    res.status(500).json({ error: 'Failed to delete work schedule' });
  }
});

// ============================================================================
// Overtime Policies Endpoints
// ============================================================================

r.get("/overtime-policies", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT op.*,
        CASE 
          WHEN op.applies_to_type = 'Department' THEN d.name
          WHEN op.applies_to_type = 'JobTitle' THEN jt.name
          ELSE NULL
        END as applies_to_name
      FROM overtime_policies op
      LEFT JOIN departments d ON op.applies_to_type = 'Department' AND op.applies_to_id = d.id
      LEFT JOIN job_titles jt ON op.applies_to_type = 'JobTitle' AND op.applies_to_id = jt.id
      ORDER BY op.name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching overtime policies:', error);
    res.status(500).json({ error: 'Failed to fetch overtime policies' });
  }
});

r.post("/overtime-policies", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { name, description, weekly_threshold_hours, daily_threshold_hours, multiplier, requires_approval, applies_to_type, applies_to_id } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Policy name is required' });
    }
    
    const result = await q(`
      INSERT INTO overtime_policies (name, description, weekly_threshold_hours, daily_threshold_hours, multiplier, requires_approval, applies_to_type, applies_to_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name.trim(), description || null, weekly_threshold_hours || 40.0, daily_threshold_hours || 8.0, multiplier || 1.5, requires_approval !== false, applies_to_type || 'All', applies_to_id || null]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Overtime policy with this name already exists' });
    }
    console.error('Error creating overtime policy:', error);
    res.status(500).json({ error: 'Failed to create overtime policy' });
  }
});

r.put("/overtime-policies/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, weekly_threshold_hours, daily_threshold_hours, multiplier, requires_approval, applies_to_type, applies_to_id } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid overtime policy ID' });
    }
    
    const result = await q(`
      UPDATE overtime_policies
      SET name = $1, description = $2, weekly_threshold_hours = $3, daily_threshold_hours = $4, multiplier = $5, requires_approval = $6, applies_to_type = $7, applies_to_id = $8
      WHERE id = $9
      RETURNING *
    `, [name, description || null, weekly_threshold_hours || 40.0, daily_threshold_hours || 8.0, multiplier || 1.5, requires_approval !== false, applies_to_type || 'All', applies_to_id || null, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Overtime policy not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating overtime policy:', error);
    res.status(500).json({ error: 'Failed to update overtime policy' });
  }
});

r.delete("/overtime-policies/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid overtime policy ID' });
    }
    
    const result = await q(`DELETE FROM overtime_policies WHERE id = $1 RETURNING *`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Overtime policy not found' });
    }
    
    res.json({ message: 'Overtime policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting overtime policy:', error);
    res.status(500).json({ error: 'Failed to delete overtime policy' });
  }
});

// ============================================================================
// Attendance Policies Endpoints
// ============================================================================

r.get("/attendance-policies", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT ap.*,
        CASE 
          WHEN ap.applies_to_type = 'Department' THEN d.name
          WHEN ap.applies_to_type = 'JobTitle' THEN jt.name
          ELSE NULL
        END as applies_to_name
      FROM attendance_policies ap
      LEFT JOIN departments d ON ap.applies_to_type = 'Department' AND ap.applies_to_id = d.id
      LEFT JOIN job_titles jt ON ap.applies_to_type = 'JobTitle' AND ap.applies_to_id = jt.id
      ORDER BY ap.name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching attendance policies:', error);
    res.status(500).json({ error: 'Failed to fetch attendance policies' });
  }
});

r.post("/attendance-policies", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { name, description, late_grace_period_minutes, absence_limit_per_month, tardiness_penalty_points, absence_penalty_points, point_threshold_termination, applies_to_type, applies_to_id } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Policy name is required' });
    }
    
    const result = await q(`
      INSERT INTO attendance_policies (name, description, late_grace_period_minutes, absence_limit_per_month, tardiness_penalty_points, absence_penalty_points, point_threshold_termination, applies_to_type, applies_to_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [name.trim(), description || null, late_grace_period_minutes || 15, absence_limit_per_month || 3, tardiness_penalty_points || 1, absence_penalty_points || 3, point_threshold_termination || 10, applies_to_type || 'All', applies_to_id || null]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Attendance policy with this name already exists' });
    }
    console.error('Error creating attendance policy:', error);
    res.status(500).json({ error: 'Failed to create attendance policy' });
  }
});

r.put("/attendance-policies/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, late_grace_period_minutes, absence_limit_per_month, tardiness_penalty_points, absence_penalty_points, point_threshold_termination, applies_to_type, applies_to_id } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid attendance policy ID' });
    }
    
    const result = await q(`
      UPDATE attendance_policies
      SET name = $1, description = $2, late_grace_period_minutes = $3, absence_limit_per_month = $4, tardiness_penalty_points = $5, absence_penalty_points = $6, point_threshold_termination = $7, applies_to_type = $8, applies_to_id = $9
      WHERE id = $10
      RETURNING *
    `, [name, description || null, late_grace_period_minutes || 15, absence_limit_per_month || 3, tardiness_penalty_points || 1, absence_penalty_points || 3, point_threshold_termination || 10, applies_to_type || 'All', applies_to_id || null, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance policy not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating attendance policy:', error);
    res.status(500).json({ error: 'Failed to update attendance policy' });
  }
});

r.delete("/attendance-policies/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid attendance policy ID' });
    }
    
    const result = await q(`DELETE FROM attendance_policies WHERE id = $1 RETURNING *`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance policy not found' });
    }
    
    res.json({ message: 'Attendance policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting attendance policy:', error);
    res.status(500).json({ error: 'Failed to delete attendance policy' });
  }
});

// ============================================================================
// Remote Work Policies Endpoints
// ============================================================================

r.get("/remote-work-policies", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT rwp.*,
        CASE 
          WHEN rwp.eligibility_type = 'Department' THEN d.name
          WHEN rwp.eligibility_type = 'JobTitle' THEN jt.name
          ELSE NULL
        END as eligibility_name
      FROM remote_work_policies rwp
      LEFT JOIN departments d ON rwp.eligibility_type = 'Department' AND rwp.eligibility_id = d.id
      LEFT JOIN job_titles jt ON rwp.eligibility_type = 'JobTitle' AND rwp.eligibility_id = jt.id
      ORDER BY rwp.name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching remote work policies:', error);
    res.status(500).json({ error: 'Failed to fetch remote work policies' });
  }
});

r.post("/remote-work-policies", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { name, description, eligibility_type, eligibility_id, days_per_week_allowed, requires_approval, equipment_provided, equipment_policy } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Policy name is required' });
    }
    
    const result = await q(`
      INSERT INTO remote_work_policies (name, description, eligibility_type, eligibility_id, days_per_week_allowed, requires_approval, equipment_provided, equipment_policy)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name.trim(), description || null, eligibility_type || 'All', eligibility_id || null, days_per_week_allowed || 5, requires_approval !== false, equipment_provided || null, equipment_policy || null]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Remote work policy with this name already exists' });
    }
    console.error('Error creating remote work policy:', error);
    res.status(500).json({ error: 'Failed to create remote work policy' });
  }
});

r.put("/remote-work-policies/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, eligibility_type, eligibility_id, days_per_week_allowed, requires_approval, equipment_provided, equipment_policy } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid remote work policy ID' });
    }
    
    const result = await q(`
      UPDATE remote_work_policies
      SET name = $1, description = $2, eligibility_type = $3, eligibility_id = $4, days_per_week_allowed = $5, requires_approval = $6, equipment_provided = $7, equipment_policy = $8
      WHERE id = $9
      RETURNING *
    `, [name, description || null, eligibility_type || 'All', eligibility_id || null, days_per_week_allowed || 5, requires_approval !== false, equipment_provided || null, equipment_policy || null, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Remote work policy not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating remote work policy:', error);
    res.status(500).json({ error: 'Failed to update remote work policy' });
  }
});

r.delete("/remote-work-policies/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid remote work policy ID' });
    }
    
    const result = await q(`DELETE FROM remote_work_policies WHERE id = $1 RETURNING *`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Remote work policy not found' });
    }
    
    res.json({ message: 'Remote work policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting remote work policy:', error);
    res.status(500).json({ error: 'Failed to delete remote work policy' });
  }
});

export default r;
