import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('❌ DATABASE_URL environment variable is not set.');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : false,
    });

    let client;
    try {
        console.log('🔌 Connecting to database...');
        client = await pool.connect();
        console.log('✅ Connected!');

        const migrationSqlPath = path.join(__dirname, '../db/init/027_restructure_hourly_payout.sql');
        const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');

        console.log('📝 Running migration to restructure hourly_payout table...');
        console.log('⚠️  This will DROP the existing hourly_payout table and recreate it!');
        await client.query(migrationSql);
        console.log('✅ Migration completed successfully!');

        // Verify the new structure
        console.log('🔍 Verifying new table structure...');
        const verifyResult = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'hourly_payout'
            ORDER BY ordinal_position;
        `);
        console.log('\n📊 New hourly_payout columns:');
        verifyResult.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });
        console.log('\n✅ All done! Re-import your Excel file to populate data.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

runMigration();
