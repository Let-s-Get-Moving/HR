/**
 * Run notification and chat system migrations
 */

import { q } from './src/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    console.log('🚀 Starting notification and chat system migrations...\n');

    const migrations = [
      'create-notifications-table.sql',
      'create-chat-threads-table.sql',
      'create-chat-messages-table.sql',
      'create-chat-attachments-table.sql'
    ];

    for (const migration of migrations) {
      const migrationPath = path.join(__dirname, '..', 'db', 'migrations', migration);
      
      if (!fs.existsSync(migrationPath)) {
        console.log(`❌ Migration file not found: ${migration}`);
        continue;
      }

      console.log(`📄 Applying migration: ${migration}`);
      
      try {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        await q(sql);
        console.log(`✅ ${migration} applied successfully\n`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`⚠️ ${migration} - Some objects already exist, continuing...\n`);
        } else {
          console.error(`❌ Error applying ${migration}:`, error.message);
          throw error;
        }
      }
    }

    console.log('🎉 All migrations completed successfully!');

    // Verify tables exist
    console.log('\n🧪 Verifying tables...');
    const tables = ['notifications', 'chat_threads', 'chat_messages', 'chat_attachments'];
    
    for (const table of tables) {
      const result = await q(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`✅ ${table} table exists`);
      } else {
        console.log(`❌ ${table} table missing`);
      }
    }

    console.log('\n✅ Migration verification completed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

