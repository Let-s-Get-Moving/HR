#!/usr/bin/env node
/**
 * Clear SmartMoving cache for all quotes with subtotal=0
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

async function clearCache() {
  try {
    console.log('Clearing cache for all quotes with subtotal_cad = 0...');
    
    const result = await pool.query(
      'DELETE FROM smartmoving_quote_cache WHERE subtotal_cad = 0 RETURNING quote_number'
    );
    
    console.log(`Deleted ${result.rowCount} cached entries with 0 subtotal`);
    
    if (result.rows.length > 0) {
      console.log(`Quote numbers cleared: ${result.rows.map(r => r.quote_number).join(', ')}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

clearCache();
