#!/usr/bin/env node
/**
 * Diagnose hourly_payout table schema on Render
 * 
 * Checks:
 * 1. Does hourly_payout table exist?
 * 2. What columns does it have?
 * 3. Does it have date_periods (JSONB) or period_label (TEXT)?
 * 4. How many rows are in the table?
 * 5. What's a sample row structure?
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function diagnose() {
  console.log('🔍 Diagnosing hourly_payout table schema on Render...\n');
  console.log('Database:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Unknown');
  console.log('='.repeat(70));

  try {
    // 1. Check if table exists
    console.log('\n📋 Step 1: Check if hourly_payout table exists');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'hourly_payout'
      ) as exists
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('❌ Table hourly_payout DOES NOT EXIST!');
      console.log('\n💡 Solution: Run database migrations');
      process.exit(1);
    }
    console.log('✅ Table hourly_payout exists');

    // 2. Get all columns
    console.log('\n📋 Step 2: Check table columns');
    const columns = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'hourly_payout'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Table Structure:');
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`   - ${col.column_name.padEnd(20)} ${col.data_type.toUpperCase().padEnd(15)} ${nullable}`);
    });

    // 3. Check for critical columns
    console.log('\n📋 Step 3: Check for critical columns');
    const columnNames = columns.rows.map(c => c.column_name);
    
    const hasDatePeriods = columnNames.includes('date_periods');
    const hasPeriodLabel = columnNames.includes('period_label');
    const hasNameRaw = columnNames.includes('name_raw');
    
    console.log(`   date_periods (JSONB): ${hasDatePeriods ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   period_label (TEXT):  ${hasPeriodLabel ? '⚠️  EXISTS (OLD SCHEMA)' : '✅ Not present'}`);
    console.log(`   name_raw (TEXT):      ${hasNameRaw ? '✅ EXISTS' : '❌ MISSING'}`);

    if (!hasDatePeriods) {
      console.error('\n❌ SCHEMA MISMATCH: table is missing date_periods column!');
      console.error('   The importer expects date_periods JSONB but table has old schema.');
      console.error('\n💡 Solution: Apply migration 038_rebuild_hourly_payout_table.sql');
      if (hasPeriodLabel) {
        console.error('   (Table has period_label - this is the OLD schema from migration 025)');
      }
    }

    // 4. Check row count
    console.log('\n📋 Step 4: Check data in table');
    const countResult = await pool.query('SELECT COUNT(*) as count FROM hourly_payout');
    const rowCount = parseInt(countResult.rows[0].count);
    console.log(`   Total rows: ${rowCount}`);

    if (rowCount === 0) {
      console.warn('   ⚠️  Table is EMPTY - no data has been uploaded yet');
    } else {
      // 5. Get sample row
      console.log('\n📋 Step 5: Sample row structure');
      const sample = await pool.query(`
        SELECT * FROM hourly_payout LIMIT 1
      `);
      
      if (sample.rows.length > 0) {
        const row = sample.rows[0];
        console.log('   Sample row:');
        Object.keys(row).forEach(key => {
          const value = row[key];
          const valueStr = value === null 
            ? 'NULL' 
            : typeof value === 'object' 
              ? JSON.stringify(value).substring(0, 100) 
              : String(value).substring(0, 100);
          console.log(`      ${key.padEnd(20)}: ${valueStr}`);
        });
      }

      // 6. Check if employee_id links are present
      console.log('\n📋 Step 6: Check employee linkage');
      const linkage = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(employee_id) as with_link,
          COUNT(*) - COUNT(employee_id) as without_link
        FROM hourly_payout
      `);
      const link = linkage.rows[0];
      console.log(`   Total records:         ${link.total}`);
      console.log(`   With employee_id:      ${link.with_link} (${Math.round(link.with_link / link.total * 100)}%)`);
      console.log(`   Without employee_id:   ${link.without_link} (${Math.round(link.without_link / link.total * 100)}%)`);

      if (link.without_link > 0) {
        console.warn(`   ⚠️  ${link.without_link} records have no employee link (name matching failed)`);
      }

      // 7. Check unique constraint
      console.log('\n📋 Step 7: Check unique constraints and indexes');
      const indexes = await pool.query(`
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' 
        AND tablename = 'hourly_payout'
      `);
      
      console.log(`   Found ${indexes.rows.length} indexes:`);
      indexes.rows.forEach(idx => {
        console.log(`      - ${idx.indexname}`);
      });
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 DIAGNOSIS SUMMARY\n');
    
    if (hasDatePeriods && hasNameRaw) {
      console.log('✅ Schema is CORRECT (migration 038 applied)');
      console.log('   - date_periods column exists (JSONB)');
      console.log('   - name_raw column exists');
      
      if (rowCount === 0) {
        console.log('\n⚠️  BUT table is empty - upload commission data');
      } else {
        console.log(`\n✅ Table has ${rowCount} rows of data`);
      }
    } else {
      console.log('❌ Schema is INCORRECT (needs migration 038)');
      console.log('\n🔧 Fix Required:');
      console.log('   1. Apply migration: db/init/038_rebuild_hourly_payout_table.sql');
      console.log('   2. Re-upload commission data');
      console.log('\n💡 Run this to fix:');
      console.log('   psql $DATABASE_URL < db/init/038_rebuild_hourly_payout_table.sql');
    }

    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

diagnose();

