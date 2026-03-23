#!/usr/bin/env node
/**
 * Check SmartMoving cache for specific quote
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: 'dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com',
  user: 'hr',
  password: 'bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn',
  database: 'hrcore_42l4',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function checkQuote() {
  try {
    const quoteId = 317119;
    
    console.log(`Checking cache for quote ${quoteId}...`);
    
    const result = await pool.query(
      'SELECT * FROM smartmoving_quote_cache WHERE quote_number = $1',
      [quoteId]
    );
    
    if (result.rows.length === 0) {
      console.log('NOT IN CACHE - will need to call API');
    } else {
      console.log('FOUND IN CACHE:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }
    
    console.log('\nChecking if quote exists in directives...');
    const directiveResult = await pool.query(
      'SELECT * FROM sales_lead_status_quotes WHERE quote_id = $1',
      [quoteId]
    );
    
    if (directiveResult.rows.length === 0) {
      console.log('NOT FOUND in sales_lead_status_quotes');
    } else {
      console.log('FOUND in sales_lead_status_quotes:');
      console.log(JSON.stringify(directiveResult.rows[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkQuote();
