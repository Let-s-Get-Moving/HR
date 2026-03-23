#!/usr/bin/env node
/**
 * Delete ALL commission drafts
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

async function deleteAllDrafts() {
  try {
    console.log('Finding all commission drafts...');
    
    // Find all drafts
    const draftsResult = await pool.query(
      'SELECT id, period_start, period_end, status, calculation_status FROM commission_drafts ORDER BY period_start DESC'
    );
    
    if (draftsResult.rows.length === 0) {
      console.log('✓ No drafts found');
      return;
    }
    
    console.log(`\nFound ${draftsResult.rows.length} draft(s):\n`);
    
    for (const draft of draftsResult.rows) {
      console.log(`  ID ${draft.id}: ${draft.period_start} to ${draft.period_end} - ${draft.status} (${draft.calculation_status})`);
    }
    
    console.log('\n🗑️  Deleting all drafts...\n');
    
    // Delete line items first (foreign key constraint)
    const lineItemsResult = await pool.query(
      'DELETE FROM commission_line_items WHERE draft_id IN (SELECT id FROM commission_drafts) RETURNING draft_id'
    );
    console.log(`✅ Deleted ${lineItemsResult.rowCount} line items`);
    
    // Delete all drafts
    const draftsDeleted = await pool.query('DELETE FROM commission_drafts RETURNING id');
    console.log(`✅ Deleted ${draftsDeleted.rowCount} draft(s)`);
    
    console.log('\n🎉 All commission drafts have been deleted.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

deleteAllDrafts();
