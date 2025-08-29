import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get all SQL files from db/init directory
    const initDir = path.join(__dirname, '../../db/init');
    const sqlFiles = fs.readdirSync(initDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Execute in alphabetical order

    for (const file of sqlFiles) {
      console.log(`Executing ${file}...`);
      const sqlContent = fs.readFileSync(path.join(initDir, file), 'utf8');
      
      try {
        await client.query(sqlContent);
        console.log(`✓ ${file} executed successfully`);
      } catch (error) {
        // Check if error is about already existing tables/data
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key value')) {
          console.log(`⚠ ${file} - Tables/data already exist, skipping...`);
        } else {
          console.error(`✗ Error executing ${file}:`, error.message);
          // Don't throw error, continue with other files
        }
      }
    }

    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase();
}

export default initializeDatabase;