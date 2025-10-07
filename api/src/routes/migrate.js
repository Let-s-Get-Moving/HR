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
    
    // 1. Check if application_settings table exists and has correct structure
    console.log('📋 Checking application_settings table...');
    const settingsCheck = await q(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'application_settings' 
      ORDER BY ordinal_position
    `);
    
    if (settingsCheck.rows.length === 0) {
      console.log('❌ application_settings table does not exist - this should not happen');
      return res.status(500).json({
        success: false,
        error: 'application_settings table missing'
      });
    }
    
    console.log('✅ application_settings table exists with', settingsCheck.rows.length, 'columns');
    
    // 2. Create user_mfa table (check if it exists first)
    console.log('🔐 Creating user_mfa table...');
    
    const mfaExists = await q(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_mfa'
      )
    `);
    
    if (!mfaExists.rows[0].exists) {
      const mfaSQL = `
        CREATE TABLE user_mfa (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          mfa_secret VARCHAR(255) NOT NULL,
          backup_codes TEXT[] NOT NULL DEFAULT '{}',
          mfa_enabled BOOLEAN NOT NULL DEFAULT false,
          mfa_verified_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id)
        )
      `;
      
      await q(mfaSQL);
      console.log('✅ user_mfa table created');
      
      // Create indexes
      await q('CREATE INDEX IF NOT EXISTS idx_user_mfa_user_id ON user_mfa(user_id)');
      await q('CREATE INDEX IF NOT EXISTS idx_user_mfa_enabled ON user_mfa(mfa_enabled)');
      console.log('✅ user_mfa indexes created');
    } else {
      console.log('✅ user_mfa table already exists');
    }
    
    // 3. Create mfa_attempts table (check if it exists first)
    console.log('📊 Creating mfa_attempts table...');
    
    const attemptsExists = await q(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'mfa_attempts'
      )
    `);
    
    if (!attemptsExists.rows[0].exists) {
      const attemptsSQL = `
        CREATE TABLE mfa_attempts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          attempt_type VARCHAR(20) NOT NULL,
          code_used VARCHAR(50) NOT NULL,
          success BOOLEAN NOT NULL,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      await q(attemptsSQL);
      console.log('✅ mfa_attempts table created');
      
      // Create indexes
      await q('CREATE INDEX IF NOT EXISTS idx_mfa_attempts_user_id ON mfa_attempts(user_id)');
      await q('CREATE INDEX IF NOT EXISTS idx_mfa_attempts_created_at ON mfa_attempts(created_at)');
      await q('CREATE INDEX IF NOT EXISTS idx_mfa_attempts_success ON mfa_attempts(success)');
      console.log('✅ mfa_attempts indexes created');
    } else {
      console.log('✅ mfa_attempts table already exists');
    }
    
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
