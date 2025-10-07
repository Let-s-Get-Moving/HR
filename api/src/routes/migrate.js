/**
 * Database Migration Endpoint
 * Run this to set up all required tables on Render
 */

import express from "express";
import { q } from "../db.js";

const r = express.Router();

// Migration endpoint - run this once on Render
r.post("/run-migrations", async (req, res) => {
  try {
    console.log('🚀 Starting Render database migrations...');
    
    // 1. Create application_settings table with correct constraints
    console.log('📋 Creating application_settings table...');
    const settingsSQL = `
      -- Drop existing table if it exists to fix constraints
      DROP TABLE IF EXISTS application_settings CASCADE;

      CREATE TABLE application_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        value TEXT,
        type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'number', 'boolean', 'select', 'textarea')),
        description TEXT,
        category VARCHAR(50) NOT NULL CHECK (category IN ('system', 'preferences', 'notifications', 'security', 'maintenance')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Insert default settings with correct types and categories
      INSERT INTO application_settings (key, value, type, description, category) VALUES
      -- System settings
      ('company_name', 'C&C Logistics', 'text', 'Company name displayed in the system', 'system'),
      ('timezone', 'UTC', 'text', 'Default timezone for the system', 'system'),
      ('date_format', 'MM/DD/YYYY', 'text', 'Default date format', 'system'),
      ('currency', 'USD', 'text', 'Default currency', 'system'),

      -- Security settings
      ('session_timeout_minutes', '30', 'number', 'Session timeout in minutes', 'security'),
      ('password_min_length', '8', 'number', 'Minimum password length', 'security'),
      ('two_factor_auth', 'false', 'boolean', 'Enable two-factor authentication', 'security'),
      ('login_attempts_limit', '5', 'number', 'Maximum login attempts before lockout', 'security'),
      ('lockout_duration_minutes', '30', 'number', 'Account lockout duration in minutes', 'security'),

      -- User preferences
      ('theme', 'dark', 'text', 'Default theme (dark/light)', 'preferences'),
      ('language', 'en', 'text', 'Default language', 'preferences'),
      ('notifications_enabled', 'true', 'boolean', 'Enable notifications', 'preferences'),

      -- Notification settings
      ('email_notifications', 'true', 'boolean', 'Enable email notifications', 'notifications'),
      ('new_employee_notification', 'true', 'boolean', 'Notify when new employee is added', 'notifications'),
      ('payroll_notification', 'true', 'boolean', 'Notify when payroll is processed', 'notifications'),
      ('leave_request_notification', 'true', 'boolean', 'Notify when leave is requested', 'notifications'),

      -- Maintenance settings
      ('backup_frequency_days', '7', 'number', 'Backup frequency in days', 'maintenance'),
      ('log_retention_days', '90', 'number', 'Log retention period in days', 'maintenance'),
      ('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', 'maintenance');

      -- Add indexes
      CREATE INDEX IF NOT EXISTS idx_application_settings_category ON application_settings(category);
      CREATE INDEX IF NOT EXISTS idx_application_settings_key ON application_settings(key);
    `;
    
    await q(settingsSQL);
    console.log('✅ application_settings table created');
    
    // 2. Create user_mfa table
    console.log('🔐 Creating user_mfa table...');
    const mfaSQL = `
      CREATE TABLE IF NOT EXISTS user_mfa (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mfa_secret VARCHAR(255) NOT NULL,
        backup_codes TEXT[] NOT NULL DEFAULT '{}',
        mfa_enabled BOOLEAN NOT NULL DEFAULT false,
        mfa_verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id)
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_user_mfa_user_id ON user_mfa(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_mfa_enabled ON user_mfa(mfa_enabled);
    `;
    
    await q(mfaSQL);
    console.log('✅ user_mfa table created');
    
    // 3. Create mfa_attempts table
    console.log('📊 Creating mfa_attempts table...');
    const attemptsSQL = `
      CREATE TABLE IF NOT EXISTS mfa_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        attempt_type VARCHAR(20) NOT NULL,
        code_used VARCHAR(50) NOT NULL,
        success BOOLEAN NOT NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_mfa_attempts_user_id ON mfa_attempts(user_id);
      CREATE INDEX IF NOT EXISTS idx_mfa_attempts_created_at ON mfa_attempts(created_at);
      CREATE INDEX IF NOT EXISTS idx_mfa_attempts_success ON mfa_attempts(success);
    `;
    
    await q(attemptsSQL);
    console.log('✅ mfa_attempts table created');
    
    // 4. Test all tables
    console.log('🧪 Testing all tables...');
    
    const settingsTest = await q(`
      SELECT COUNT(*) as count 
      FROM application_settings 
      WHERE category = 'system'
    `);
    console.log(`📊 System settings: ${settingsTest.rows[0].count}`);
    
    const mfaTest = await q(`
      SELECT COUNT(*) as count 
      FROM user_mfa
    `);
    console.log(`🔐 MFA records: ${mfaTest.rows[0].count}`);
    
    const attemptsTest = await q(`
      SELECT COUNT(*) as count 
      FROM mfa_attempts
    `);
    console.log(`📊 MFA attempts: ${attemptsTest.rows[0].count}`);
    
    res.json({
      success: true,
      message: 'All Render migrations completed successfully!',
      results: {
        systemSettings: settingsTest.rows[0].count,
        mfaRecords: mfaTest.rows[0].count,
        mfaAttempts: attemptsTest.rows[0].count
      }
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Migration failed: ' + error.message
    });
  }
});

export default r;
