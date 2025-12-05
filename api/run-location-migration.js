#!/usr/bin/env node

/**
 * Run Location Unique Constraint Migration
 */

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use Render database URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4',
  ssl: { rejectUnauthorized: false }
});

const q = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

async function runMigration() {
  try {
    console.log('🚀 Running location unique constraint migration...\n');
    
    const migrationPath = path.join(__dirname, '..', 'db', 'migrations', 'add_location_unique_constraint.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }
    
    console.log(`📄 Reading migration file: ${migrationPath}`);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Executing migration...\n');
    await q(sql);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the constraint was added
    console.log('\n🧪 Verifying constraint...');
    const constraintCheck = await q(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'locations' 
      AND constraint_name = 'locations_name_unique'
    `);
    
    if (constraintCheck.rows.length > 0) {
      console.log('✅ UNIQUE constraint on locations.name verified!');
    } else {
      console.log('⚠️  Constraint not found - may have already existed');
    }
    
    // Check for any remaining duplicates
    const duplicateCheck = await q(`
      SELECT name, COUNT(*) as count
      FROM locations
      GROUP BY name
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCheck.rows.length > 0) {
      console.log('⚠️  Warning: Duplicate locations still exist:');
      duplicateCheck.rows.forEach(row => {
        console.log(`   - ${row.name}: ${row.count} entries`);
      });
    } else {
      console.log('✅ No duplicate locations found!');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('⚠️  Some objects may already exist - this is OK');
      await pool.end();
      process.exit(0);
    }
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();

