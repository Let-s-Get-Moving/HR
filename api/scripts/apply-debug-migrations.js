#!/usr/bin/env node
/**
 * Apply debug and performance migrations to Render Postgres
 * 
 * This script applies:
 * 1. Normalization function (app_norm)
 * 2. Performance indexes
 * 3. Probe table for debug endpoints
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { primaryPool } from '../src/db/pools.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrations = [
  {
    name: 'Normalization Function',
    file: '../../db/init/36_normalization_function.sql',
    required: true
  },
  {
    name: 'Performance Indexes',
    file: '../../db/init/37_performance_indexes.sql',
    required: true
  }
];

async function applyMigration(name, sqlContent) {
  console.log(`\n📦 Applying: ${name}`);
  
  try {
    const startTime = Date.now();
    await primaryPool.query(sqlContent);
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${name} applied successfully (${duration}ms)`);
    return { success: true, name, duration };
  } catch (error) {
    console.error(`❌ ${name} failed:`, error.message);
    return { success: false, name, error: error.message };
  }
}

async function main() {
  console.log('🚀 Applying Debug & Performance Migrations to Render Postgres\n');
  console.log('Database:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Unknown');
  console.log('-----------------------------------------------------------');

  const results = [];

  for (const migration of migrations) {
    try {
      const filePath = join(__dirname, migration.file);
      const sqlContent = readFileSync(filePath, 'utf-8');
      
      const result = await applyMigration(migration.name, sqlContent);
      results.push(result);
      
      if (!result.success && migration.required) {
        console.error(`\n⚠️  Required migration failed: ${migration.name}`);
        console.error('Stopping further migrations.');
        break;
      }
    } catch (error) {
      console.error(`\n❌ Failed to read migration file: ${migration.file}`);
      console.error(error.message);
      if (migration.required) break;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary\n');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    const time = r.duration ? `(${r.duration}ms)` : '';
    console.log(`${icon} ${r.name} ${time}`);
    if (!r.success && r.error) {
      console.log(`   Error: ${r.error}`);
    }
  });
  
  console.log(`\nTotal: ${successful} successful, ${failed} failed`);
  console.log('='.repeat(60));

  // Verify app_norm function exists
  console.log('\n🔍 Verifying installations...');
  
  try {
    const { rows } = await primaryPool.query(`
      SELECT app_norm('HR – West') as normalized
    `);
    console.log(`✅ app_norm() function working: "HR – West" → "${rows[0]?.normalized}"`);
  } catch (error) {
    console.error('❌ app_norm() function not available:', error.message);
  }

  try {
    const { rows } = await primaryPool.query(`
      SELECT COUNT(*) as index_count
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND (indexname LIKE 'idx_%' OR indexname LIKE 'idx_%')
    `);
    console.log(`✅ Found ${rows[0]?.index_count} indexes in public schema`);
  } catch (error) {
    console.error('❌ Could not verify indexes:', error.message);
  }

  console.log('\n✨ Migration process complete!\n');
  
  await primaryPool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});

