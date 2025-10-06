import express from "express";
import { z } from "zod";
import { q } from "../db.js";
import { requireAuth, optionalAuth } from "../session.js";

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
    res.status(500).json({ error: "Failed to fetch system settings" });
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

// Get user preferences (from database)
r.get("/preferences", optionalAuth, async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT key, value, type, description
      FROM application_settings
      WHERE category = 'preferences'
      ORDER BY key
    `);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    res.status(500).json({ error: "Failed to fetch user preferences" });
  }
});

// Update user preference (saves to database)
r.put("/preferences/:key", async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  try {
    console.log(`💾 Updating preference ${key} = ${value}`);
    
    const result = await q(`
      UPDATE application_settings 
      SET value = $1, updated_at = NOW()
      WHERE key = $2 AND category = 'preferences'
      RETURNING *
    `, [value, key]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Preference not found" });
    }
    
    console.log(`✅ Preference ${key} updated successfully`);
    
    res.json({ 
      message: "Preference updated successfully",
      setting: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating user preference:", error);
    res.status(500).json({ error: "Failed to update user preference" });
  }
});

// Get notification settings (from database)
r.get("/notifications", optionalAuth, async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT key, value, type, description
      FROM application_settings
      WHERE category = 'notifications'
      ORDER BY key
    `);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    res.status(500).json({ error: "Failed to fetch notification settings" });
  }
});

// Update notification setting (saves to database)
r.put("/notifications/:key", async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  try {
    console.log(`💾 Updating notification ${key} = ${value}`);
    
    const result = await q(`
      UPDATE application_settings 
      SET value = $1, updated_at = NOW()
      WHERE key = $2 AND category = 'notifications'
      RETURNING *
    `, [value, key]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Notification setting not found" });
    }
    
    console.log(`✅ Notification ${key} updated successfully`);
    
    res.json({ 
      message: "Notification setting updated successfully",
      setting: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating notification setting:", error);
    res.status(500).json({ error: "Failed to update notification setting" });
  }
});

// Get security settings (from database, requires auth to see MFA status)
r.get("/security", requireAuth, async (req, res) => {
  try {
    console.log('🔍 [SETTINGS] GET /security called');
    console.log('🔍 [SETTINGS] User ID:', req.user?.id);
    console.log('🔍 [SETTINGS] Username:', req.user?.username);
    
    // Get settings from database
    const { rows } = await q(`
      SELECT key, value, type, description
      FROM application_settings
      WHERE category = 'security'
      ORDER BY key
    `);
    
    // ALWAYS check actual MFA status from database (user is authenticated via requireAuth)
    try {
      const { MFAService } = await import('../services/mfa.js');
      const mfaEnabled = await MFAService.isMFAEnabled(req.user.id);
      
      console.log('🔍 [SETTINGS] MFA Status from database:', mfaEnabled);
      
      // Update the two_factor_auth value with actual status
      const mfaSetting = rows.find(r => r.key === 'two_factor_auth');
      if (mfaSetting) {
        mfaSetting.value = mfaEnabled ? 'true' : 'false';
        console.log('✅ [SETTINGS] Updated MFA toggle to:', mfaSetting.value);
      }
    } catch (error) {
      console.error('❌ [SETTINGS] Error checking MFA status:', error);
      // Continue with default value if check fails
    }
    
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
    
    // Generic handler for other security settings - save to database
    console.log(`💾 Updating security setting ${key} = ${value}`);
    
    const result = await q(`
      UPDATE application_settings 
      SET value = $1, updated_at = NOW()
      WHERE key = $2 AND category = 'security'
      RETURNING *
    `, [value, key]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Security setting not found" });
    }
    
    console.log(`✅ Security setting ${key} updated successfully`);
    
    res.json({ 
      message: "Security setting updated successfully",
      setting: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating security setting:", error);
    res.status(500).json({ error: "Failed to update security setting" });
  }
});

// Get backup and maintenance settings (from database)
r.get("/maintenance", optionalAuth, async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT key, value, type, description
      FROM application_settings
      WHERE category = 'maintenance'
      ORDER BY key
    `);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching maintenance settings:", error);
    res.status(500).json({ error: "Failed to fetch maintenance settings" });
  }
});

// Update maintenance setting (saves to database)
r.put("/maintenance/:key", requireAuth, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  try {
    console.log(`💾 Updating maintenance setting ${key} = ${value}`);
    
    const result = await q(`
      UPDATE application_settings 
      SET value = $1, updated_at = NOW()
      WHERE key = $2 AND category = 'maintenance'
      RETURNING *
    `, [value, key]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Maintenance setting not found" });
    }
    
    console.log(`✅ Maintenance setting ${key} updated successfully`);
    
    res.json({ 
      message: "Maintenance setting updated successfully",
      setting: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating maintenance setting:", error);
    res.status(500).json({ error: "Failed to update maintenance setting" });
  }
});

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
