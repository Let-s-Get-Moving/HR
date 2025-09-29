#!/usr/bin/env node
/**
 * One-time migration script to increase commission field sizes
 * Run with: node scripts/run-commission-migration.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected!');

        // Read the migration file
        const migrationPath = join(__dirname, '../db/init/026_increase_commission_field_sizes.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf8');

        console.log('📝 Running migration to increase commission field sizes...');
        await client.query(migrationSQL);
        console.log('✅ Migration completed successfully!');

        // Verify the changes
        console.log('\n🔍 Verifying field sizes...');
        const result = await client.query(`
            SELECT column_name, data_type, numeric_precision, numeric_scale
            FROM information_schema.columns
            WHERE table_name = 'employee_commission_monthly'
            AND column_name IN ('rev_sm_all_locations', 'total_revenue_all', 'commission_earned')
            ORDER BY column_name;
        `);

        console.log('\nField sizes after migration:');
        result.rows.forEach(row => {
            console.log(`  ${row.column_name}: NUMERIC(${row.numeric_precision},${row.numeric_scale})`);
        });

        console.log('\n✅ All done! Your commission import should now work without field overflow errors.');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
