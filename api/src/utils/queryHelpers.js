/**
 * Query helpers for using the new pool system with normalization
 * 
 * This file provides examples and utilities for migrating routes to use:
 * 1. The new timedQuery with performance logging
 * 2. Text normalization with app_norm()
 * 3. Proper pool selection (read vs write)
 */

import { primaryPool, readerPool, timedQuery } from '../db/pools.js';

/**
 * Example: Fetch timecards with normalized group filter
 * 
 * BEFORE (using old db.js):
 *   const { rows } = await q(`SELECT * FROM timecards WHERE group_name = $1`, [groupName]);
 * 
 * AFTER (using new pools + normalization):
 *   const timecards = await fetchTimecardsByGroup(groupName, startDate, endDate);
 */
export async function fetchTimecardsByGroup(groupName, startDate, endDate) {
  const query = `
    SELECT 
      t.*,
      e.first_name,
      e.last_name,
      e.email,
      CONCAT(e.first_name, ' ', e.last_name) as employee_name
    FROM timecards t
    JOIN employees e ON t.employee_id = e.id
    WHERE app_norm(t.group_name) = app_norm($1)
      AND t.pay_period_start >= $2::DATE
      AND t.pay_period_end <= $3::DATE
    ORDER BY t.pay_period_start DESC, e.last_name
    LIMIT 500
  `;

  const { rows } = await timedQuery(
    readerPool(),
    query,
    [groupName, startDate, endDate],
    { op: 'fetch_timecards_by_group', group: groupName }
  );

  return rows;
}

/**
 * Example: Fetch employees by fuzzy name search
 * Uses trigram index for fast ILIKE queries
 */
export async function searchEmployeesByName(searchTerm, limit = 50) {
  const query = `
    SELECT 
      id,
      first_name,
      last_name,
      email,
      status,
      role_title,
      CONCAT(first_name, ' ', last_name) as full_name
    FROM employees
    WHERE 
      first_name ILIKE '%' || $1 || '%'
      OR last_name ILIKE '%' || $1 || '%'
    ORDER BY last_name, first_name
    LIMIT $2
  `;

  const { rows } = await timedQuery(
    readerPool(),
    query,
    [searchTerm, limit],
    { op: 'search_employees', term: searchTerm }
  );

  return rows;
}

/**
 * Example: Insert timecard records with explicit transaction
 * 
 * Key points:
 * - Use primaryPool for writes
 * - Keep transactions short (< 5 seconds)
 * - Always COMMIT or ROLLBACK
 * - Release client back to pool
 */
export async function insertTimecards(timecards, uploadId) {
  const client = await primaryPool.connect();
  
  try {
    await client.query('BEGIN');

    let insertedCount = 0;
    
    for (const tc of timecards) {
      await client.query(
        `INSERT INTO timecards (
          employee_id, 
          pay_period_start, 
          pay_period_end, 
          regular_hours,
          overtime_hours,
          upload_id,
          group_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (employee_id, pay_period_start, pay_period_end) 
        DO UPDATE SET
          regular_hours = EXCLUDED.regular_hours,
          overtime_hours = EXCLUDED.overtime_hours,
          upload_id = EXCLUDED.upload_id,
          group_name = EXCLUDED.group_name,
          updated_at = now()
        `,
        [
          tc.employee_id,
          tc.pay_period_start,
          tc.pay_period_end,
          tc.regular_hours || 0,
          tc.overtime_hours || 0,
          uploadId,
          tc.group_name
        ]
      );
      insertedCount++;
    }

    await client.query('COMMIT');
    
    return { 
      success: true, 
      count: insertedCount,
      upload_id: uploadId 
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Example: Fetch payroll with normalized filters
 */
export async function fetchPayrollByPeriod(startDate, endDate, groupName = null) {
  let query = `
    SELECT 
      p.*,
      e.first_name,
      e.last_name,
      e.email,
      CONCAT(e.first_name, ' ', e.last_name) as employee_name
    FROM payroll p
    LEFT JOIN employees e ON e.id = p.employee_id
    WHERE p.period_start >= $1::DATE 
      AND p.period_end <= $2::DATE
  `;

  const params = [startDate, endDate];

  if (groupName) {
    query += ` AND app_norm(p.group_name) = app_norm($3)`;
    params.push(groupName);
  }

  query += ` ORDER BY p.period_start DESC, e.last_name, e.first_name LIMIT 500`;

  const { rows } = await timedQuery(
    readerPool(),
    query,
    params,
    { op: 'fetch_payroll', start: startDate, end: endDate, group: groupName }
  );

  return rows;
}

/**
 * Utility: Build WHERE clause for normalized text matching
 * Helps avoid SQL injection when dynamically building queries
 */
export function buildNormalizedFilter(columnName, paramIndex) {
  return `app_norm(${columnName}) = app_norm($${paramIndex})`;
}

/**
 * Utility: Verify upload visibility (use after ingestion)
 * Returns count of rows for a specific upload_id
 */
export async function verifyUploadVisibility(tableName, uploadId) {
  const query = `
    SELECT COUNT(*)::int as count,
           MIN(created_at) as first_created,
           MAX(created_at) as last_created
    FROM ${tableName}
    WHERE upload_id = $1
  `;

  const { rows } = await timedQuery(
    readerPool(),
    query,
    [uploadId],
    { op: 'verify_upload', table: tableName, upload_id: uploadId }
  );

  return rows[0] || { count: 0, first_created: null, last_created: null };
}

/**
 * Migration helper: Convert old q() calls to new timedQuery()
 * 
 * Step 1: Import the new functions
 *   import { readerPool, primaryPool, timedQuery } from '../db/pools.js';
 * 
 * Step 2: Replace q() with timedQuery()
 *   OLD: const { rows } = await q(sql, params);
 *   NEW: const { rows } = await timedQuery(readerPool(), sql, params, { op: 'description' });
 * 
 * Step 3: Use primaryPool for writes
 *   const client = await primaryPool.connect();
 *   try {
 *     await client.query('BEGIN');
 *     // ... your inserts/updates ...
 *     await client.query('COMMIT');
 *   } catch (e) {
 *     await client.query('ROLLBACK');
 *     throw e;
 *   } finally {
 *     client.release();
 *   }
 * 
 * Step 4: Add app_norm() to text filters
 *   WHERE app_norm(group_name) = app_norm($1)
 */

export const MIGRATION_CHECKLIST = `
✅ Route Migration Checklist:

1. [ ] Import new pool functions:
   import { readerPool, primaryPool, timedQuery } from '../db/pools.js';

2. [ ] Replace read queries:
   OLD: const { rows } = await q(sql, params);
   NEW: const { rows } = await timedQuery(readerPool(), sql, params, { op: 'route_action' });

3. [ ] Replace write queries with explicit transactions:
   - Use primaryPool.connect()
   - BEGIN → inserts/updates → COMMIT
   - ROLLBACK on error
   - Release client in finally

4. [ ] Add text normalization:
   - WHERE clauses: app_norm(column) = app_norm($1)
   - Handles Unicode dashes, spaces, quotes, case

5. [ ] Add timing metadata:
   - Include { op: 'action_name', ...context } in timedQuery
   - Shows in logs when DEBUG_DATA_DRIFT=true

6. [ ] Test on Render:
   - Upload data
   - Verify with /debug/sql-count?upload_id=xxx
   - Check query times in logs

7. [ ] Update docs:
   - Document any new query patterns
   - Note performance improvements
`;

