#!/usr/bin/env node
/**
 * Delete a commission draft by period or ID
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

async function deleteDraft() {
  try {
    const periodStart = '2026-02-01';
    const periodEnd = '2026-02-28';
    
    console.log(`Looking for draft with period ${periodStart} to ${periodEnd}...`);
    
    // Find the draft
    const findResult = await pool.query(
      'SELECT id, status, calculation_status FROM commission_drafts WHERE period_start = $1 AND period_end = $2',
      [periodStart, periodEnd]
    );
    
    if (findResult.rows.length === 0) {
      console.log('❌ No draft found for this period');
      return;
    }
    
    const draft = findResult.rows[0];
    console.log(`Found draft ID: ${draft.id}, status: ${draft.status}, calculation: ${draft.calculation_status}`);
    
    if (draft.status === 'finalized') {
      console.log('⚠️  Warning: This draft is finalized. Deleting anyway...');
    }
    
    // Delete line items first
    const lineItemsResult = await pool.query(
      'DELETE FROM commission_line_items WHERE draft_id = $1 RETURNING id',
      [draft.id]
    );
    console.log(`✅ Deleted ${lineItemsResult.rowCount} line items`);
    
    // Delete the draft
    await pool.query('DELETE FROM commission_drafts WHERE id = $1', [draft.id]);
    console.log(`✅ Deleted draft ${draft.id}`);
    
    console.log('\n🎉 Draft successfully deleted. You can now create a new draft for this period.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

deleteDraft();
