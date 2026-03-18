/**
 * Commission Draft Engine
 *
 * Two-phase draft creation:
 *
 * Phase 1 — createDraftSkeleton() [fast, synchronous]
 *   Runs after file ingestion completes.
 *   Pulls booking_pct, invoiced, hourly_rate from staging tables / employees.
 *   Creates commission_drafts row (calculation_status = 'calculating').
 *   Creates commission_line_items rows with immediately-available fields set
 *   and SmartMoving-dependent fields (revenue_add_ons, revenue_deductions,
 *   total_revenue, commission_pct, commission_earned, total_due) left NULL.
 *   Returns immediately — response is sent to the client.
 *
 * Phase 2 — enrichDraftWithSmartMovingData() [async background, job-by-job]
 *   Called WITHOUT await after the HTTP response is sent.
 *   Processes each quote individually: fetches subtotal from SmartMoving API
 *   (or cache) one at a time, updating quotes_processed after each.
 *   Once all quotes are fetched, recalculates every line item's dependent fields
 *   and sets calculation_status = 'ready'.
 *   On failure sets calculation_status = 'error' with error message.
 *
 * Frontend polls GET /api/commission-drafts/:id every 3 s while
 * calculation_status === 'calculating' and shows "Gathering data…" for NULL cells.
 */

import { pool } from '../db.js';
import { getQuoteSubtotal } from '../services/smartmovingClient.js';
import { computeAgentRate, computeManagerBucketRate } from './salesCommissionCalculator.js';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — skeleton creation (called synchronously inside the route handler)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a draft skeleton with immediately-available fields.
 * SmartMoving-dependent columns remain NULL.
 *
 * @param {string} periodStart  YYYY-MM-DD
 * @param {string} periodEnd    YYYY-MM-DD
 * @param {number} createdBy    users.id of the requesting user
 * @returns {Promise<{ draftId: number, agentCount: number, managerCount: number, quotesTotal: number }>}
 */
export async function createDraftSkeleton(periodStart, periodEnd, createdBy) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Guard: only one draft-in-progress per period
        const existing = await client.query(
            `SELECT id FROM commission_drafts
             WHERE period_start = $1 AND period_end = $2 AND status = 'draft'`,
            [periodStart, periodEnd]
        );
        if (existing.rows.length > 0) {
            throw new Error(`A draft already exists for period ${periodStart} to ${periodEnd}`);
        }

        // Count quotes that will need SmartMoving API calls
        const quoteCountResult = await client.query(`
            SELECT COUNT(DISTINCT ls.quote_id) AS cnt
            FROM sales_lead_status_quotes ls
            WHERE ls.status_norm IN ('completed', 'closed')
              AND ls.directive_type IS NOT NULL
              AND ls.directive_type <> 'none'
              AND EXISTS (
                  SELECT 1 FROM sales_booked_opportunities_quotes bo
                  WHERE bo.quote_id = ls.quote_id
                    AND bo.service_date >= $1
                    AND bo.service_date <= $2
              )
        `, [periodStart, periodEnd]);
        const quotesTotal = parseInt(quoteCountResult.rows[0].cnt, 10);

        // Create the draft header
        const draftResult = await client.query(`
            INSERT INTO commission_drafts
                (period_start, period_end, status, calculation_status,
                 quotes_total, quotes_processed, created_by, created_at)
            VALUES ($1, $2, 'draft', 'calculating', $3, 0, $4, NOW())
            RETURNING id
        `, [periodStart, periodEnd, quotesTotal, createdBy]);
        const draftId = draftResult.rows[0].id;

        // Pull immediately-available agent data
        const agentData = await pullAgentData(client, periodStart, periodEnd);

        // Pull manager data
        const managerData = await pullManagerData(client);

        // Insert agent line items (SM-dependent fields are omitted → DEFAULT NULL)
        for (const agent of agentData) {
            await client.query(`
                INSERT INTO commission_line_items
                    (draft_id, employee_id, employee_name_raw, role,
                     hourly_rate, invoiced, booking_pct)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                draftId, agent.employee_id, agent.employee_name, agent.role,
                agent.hourly_rate, agent.invoiced, agent.booking_pct
            ]);
        }

        // Insert manager line items
        for (const manager of managerData) {
            await client.query(`
                INSERT INTO commission_line_items
                    (draft_id, employee_id, employee_name_raw, role,
                     hourly_rate, invoiced, booking_pct)
                VALUES ($1, $2, $3, $4, $5, 0, 0)
            `, [
                draftId, manager.employee_id, manager.employee_name, manager.role,
                manager.hourly_rate
            ]);
        }

        await client.query('COMMIT');

        return {
            draftId,
            agentCount: agentData.length,
            managerCount: managerData.length,
            quotesTotal
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — background enrichment (fired WITHOUT await after response is sent)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch SmartMoving subtotals job-by-job, then recalculate every line item.
 * Updates quotes_processed after each individual API call.
 *
 * @param {number} draftId
 * @param {string} periodStart  YYYY-MM-DD
 * @param {string} periodEnd    YYYY-MM-DD
 */
export async function enrichDraftWithSmartMovingData(draftId, periodStart, periodEnd) {
    try {
        // ── 1. Get all quotes that need SmartMoving data ────────────────────
        const quotesResult = await pool.query(`
            SELECT DISTINCT
                ls.quote_id,
                ls.sales_person_key,
                ls.directive_type,
                ls.target_name_key,
                ls.pct,
                ls.amount
            FROM sales_lead_status_quotes ls
            WHERE ls.status_norm IN ('completed', 'closed')
              AND ls.directive_type IS NOT NULL
              AND ls.directive_type <> 'none'
              AND EXISTS (
                  SELECT 1 FROM sales_booked_opportunities_quotes bo
                  WHERE bo.quote_id = ls.quote_id
                    AND bo.service_date >= $1
                    AND bo.service_date <= $2
              )
        `, [periodStart, periodEnd]);

        const directives = quotesResult.rows;
        const uniqueQuoteIds = [...new Set(directives.map(r => r.quote_id))];

        // Update total count (may differ from skeleton estimate due to race)
        await pool.query(
            `UPDATE commission_drafts SET quotes_total = $1 WHERE id = $2`,
            [uniqueQuoteIds.length, draftId]
        );

        // ── 2. Fetch each quote subtotal one by one ─────────────────────────
        // getQuoteSubtotal() checks the cache first; only calls the API on a miss.
        for (let i = 0; i < uniqueQuoteIds.length; i++) {
            const quoteId = uniqueQuoteIds[i];

            // Fire-and-forget pattern: fetch but don't wait for batch resolution
            await getQuoteSubtotal(quoteId);

            // Update progress counter so the frontend can show "X / Y"
            await pool.query(
                `UPDATE commission_drafts SET quotes_processed = $1 WHERE id = $2`,
                [i + 1, draftId]
            );
        }

        // ── 3. Calculate adjustments using now-cached subtotals ─────────────
        const adjustments = await calculateAdjustments(directives, periodStart, periodEnd);

        // ── 4. Pull agent / manager data again (same query as skeleton) ─────
        const client = await pool.connect();
        try {
            const agentData = await pullAgentData(client, periodStart, periodEnd);
            const managerData = await pullManagerData(client);

            // Build a map of employee_id → { adjustments }
            const adjById = adjustments;

            // ── 5. Update each agent line item ──────────────────────────────
            for (const agent of agentData) {
                const adj = adjById.get(agent.employee_id) || emptyAdj();
                const totalRevenue = agent.invoiced + adj.revenue_add_ons - adj.revenue_deductions;
                const rateInfo = computeAgentRate(agent.booking_pct, totalRevenue);
                const commissionEarned = round2(totalRevenue * rateInfo.rate / 100);

                await client.query(`
                    UPDATE commission_line_items
                    SET revenue_add_ons     = $1,
                        revenue_deductions  = $2,
                        total_revenue       = $3,
                        commission_pct      = $4,
                        commission_earned   = $5
                    WHERE draft_id = $6
                      AND employee_id = $7
                      AND role = $8
                `, [
                    adj.revenue_add_ons, adj.revenue_deductions,
                    totalRevenue, rateInfo.rate, commissionEarned,
                    draftId, agent.employee_id, agent.role
                ]);
            }

            // ── 6. Update each manager line item ────────────────────────────
            // Managers use pooled revenue = sum of all agent total_revenues
            const pooledRevenue = agentData.reduce((sum, agent) => {
                const adj = adjById.get(agent.employee_id) || emptyAdj();
                return sum + agent.invoiced + adj.revenue_add_ons - adj.revenue_deductions;
            }, 0);

            for (const manager of managerData) {
                const managerCommission = calculateManagerCommission(
                    manager, agentData, adjById, pooledRevenue
                );

                await client.query(`
                    UPDATE commission_line_items
                    SET invoiced           = $1,
                        total_revenue      = $2,
                        commission_pct     = $3,
                        commission_earned  = $4,
                        revenue_add_ons    = 0,
                        revenue_deductions = 0
                    WHERE draft_id = $5
                      AND employee_id = $6
                      AND role = 'manager'
                `, [
                    pooledRevenue, pooledRevenue,
                    managerCommission.rate || 0, managerCommission.amount,
                    draftId, manager.employee_id
                ]);
            }

        } finally {
            client.release();
        }

        // ── 7. Mark draft as ready ──────────────────────────────────────────
        await pool.query(
            `UPDATE commission_drafts
             SET calculation_status = 'ready', quotes_processed = quotes_total
             WHERE id = $1`,
            [draftId]
        );

    } catch (error) {
        console.error(`[commissionDraftEngine] Enrichment failed for draft ${draftId}:`, error);

        // Record the error so the frontend can show a meaningful message
        await pool.query(
            `UPDATE commission_drafts
             SET calculation_status = 'error', calculation_error = $1
             WHERE id = $2`,
            [error.message, draftId]
        ).catch(() => {}); // Don't throw if this update also fails
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pull immediately-available agent data from staging tables and employees.
 */
async function pullAgentData(client, periodStart, periodEnd) {
    const result = await client.query(`
        SELECT
            e.id AS employee_id,
            COALESCE(e.first_name || ' ' || e.last_name, e.nickname, e.nickname_2, e.nickname_3) AS employee_name,
            e.sales_role AS role,
            COALESCE(e.hourly_rate, 0) AS hourly_rate,
            COALESCE(sp.booked_pct, 0) AS booking_pct,
            COALESCE(cs.invoiced_before_tax, 0) AS invoiced
        FROM employees e
        INNER JOIN departments d ON e.department_id = d.id
        LEFT JOIN sales_performance_staging sp ON (
            sp.period_start = $1 AND sp.period_end = $2
            AND (
                normalize_nickname(e.nickname)  = sp.name_key OR
                normalize_nickname(e.nickname_2) = sp.name_key OR
                normalize_nickname(e.nickname_3) = sp.name_key
            )
        )
        LEFT JOIN sales_commission_summary_staging cs ON (
            cs.period_start = $1 AND cs.period_end = $2
            AND (
                normalize_nickname(e.nickname)  = cs.sales_person_key OR
                normalize_nickname(e.nickname_2) = cs.sales_person_key OR
                normalize_nickname(e.nickname_3) = cs.sales_person_key
            )
        )
        WHERE d.name ILIKE '%sales%'
          AND e.sales_commission_enabled = true
          AND e.sales_role IN ('agent', 'international_closer')
          AND (e.nickname IS NOT NULL OR e.nickname_2 IS NOT NULL OR e.nickname_3 IS NOT NULL)
    `, [periodStart, periodEnd]);

    return result.rows;
}

/**
 * Pull manager data (booking_pct and revenue come from pooled agents, not staging).
 */
async function pullManagerData(client) {
    const result = await client.query(`
        SELECT
            e.id AS employee_id,
            COALESCE(e.first_name || ' ' || e.last_name, e.nickname) AS employee_name,
            e.sales_role AS role,
            COALESCE(e.hourly_rate, 0) AS hourly_rate,
            e.sales_manager_fixed_pct
        FROM employees e
        INNER JOIN departments d ON e.department_id = d.id
        WHERE d.name ILIKE '%sales%'
          AND e.sales_commission_enabled = true
          AND e.sales_role = 'manager'
    `);

    return result.rows;
}

/**
 * Calculate per-employee revenue adjustments using cached SmartMoving subtotals.
 * Returns Map<employee_id, { revenue_add_ons, revenue_deductions, booking_bonus_plus, booking_bonus_minus }>
 */
async function calculateAdjustments(directives, periodStart, periodEnd) {
    // Build nickname → employee_id lookup
    const empResult = await pool.query(`
        SELECT
            id AS employee_id,
            normalize_nickname(nickname)  AS key1,
            normalize_nickname(nickname_2) AS key2,
            normalize_nickname(nickname_3) AS key3
        FROM employees
        WHERE nickname IS NOT NULL OR nickname_2 IS NOT NULL OR nickname_3 IS NOT NULL
    `);

    const nicknameToEmp = new Map();
    for (const row of empResult.rows) {
        if (row.key1) nicknameToEmp.set(row.key1, row.employee_id);
        if (row.key2) nicknameToEmp.set(row.key2, row.employee_id);
        if (row.key3) nicknameToEmp.set(row.key3, row.employee_id);
    }

    const adjustments = new Map();

    for (const row of directives) {
        // Subtotal is now cached — synchronous DB read via getQuoteSubtotal
        const subtotal = await getQuoteSubtotal(row.quote_id);
        if (subtotal === 0) continue;

        const originalId = nicknameToEmp.get(row.sales_person_key);
        const targetId   = nicknameToEmp.get(row.target_name_key);

        let transferAmount = 0;
        if (row.directive_type === 'percent_split') {
            transferAmount = round2(subtotal * row.pct / 100);
        } else if (row.directive_type === 'fixed_rev_transfer' || row.directive_type === 'fixed_booking_transfer') {
            transferAmount = parseFloat(row.amount) || 0;
        }
        if (transferAmount === 0) continue;

        const isBooking = row.directive_type === 'fixed_booking_transfer';

        if (originalId) {
            ensureAdj(adjustments, originalId);
            if (isBooking) adjustments.get(originalId).booking_bonus_minus += transferAmount;
            else           adjustments.get(originalId).revenue_deductions  += transferAmount;
        }

        if (targetId) {
            ensureAdj(adjustments, targetId);
            if (isBooking) adjustments.get(targetId).booking_bonus_plus += transferAmount;
            else           adjustments.get(targetId).revenue_add_ons    += transferAmount;
        }
    }

    return adjustments;
}

/**
 * Calculate a manager's commission (bucket-sum or fixed rate).
 */
function calculateManagerCommission(manager, agentData, adjById, pooledRevenue) {
    if (manager.sales_manager_fixed_pct) {
        return {
            method: 'fixed',
            rate: manager.sales_manager_fixed_pct,
            amount: round2(pooledRevenue * manager.sales_manager_fixed_pct / 100)
        };
    }

    let total = 0;
    for (const agent of agentData) {
        const adj = adjById.get(agent.employee_id) || emptyAdj();
        const agentRevenue = agent.invoiced + adj.revenue_add_ons - adj.revenue_deductions;
        const bucketRate = computeManagerBucketRate(agent.booking_pct);
        total += round2(agentRevenue * bucketRate / 100);
    }

    return { method: 'bucket_sum', rate: null, amount: total };
}

function ensureAdj(map, id) {
    if (!map.has(id)) map.set(id, emptyAdj());
}

function emptyAdj() {
    return { revenue_add_ons: 0, revenue_deductions: 0, booking_bonus_plus: 0, booking_bonus_minus: 0 };
}

function round2(n) {
    return Math.round((n || 0) * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read helpers (used by routes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a draft by ID with all line items.
 */
export async function getDraftById(draftId) {
    const draft = await pool.query(
        `SELECT * FROM commission_drafts WHERE id = $1`,
        [draftId]
    );
    if (draft.rows.length === 0) return null;

    const lineItems = await pool.query(
        `SELECT * FROM commission_line_items WHERE draft_id = $1 ORDER BY role, employee_name_raw`,
        [draftId]
    );

    return { ...draft.rows[0], lineItems: lineItems.rows };
}

/**
 * List all drafts (newest first), with line-item count.
 */
export async function listDrafts() {
    const result = await pool.query(`
        SELECT
            cd.*,
            COUNT(cli.id) AS line_item_count
        FROM commission_drafts cd
        LEFT JOIN commission_line_items cli ON cd.id = cli.draft_id
        GROUP BY cd.id
        ORDER BY cd.period_start DESC, cd.created_at DESC
    `);
    return result.rows;
}

/**
 * Finalize a draft (lock it — no further manual edits).
 * Only allowed when calculation_status = 'ready'.
 */
export async function finalizeDraft(draftId, finalizedBy) {
    // Block finalization if enrichment hasn't finished
    const check = await pool.query(
        `SELECT calculation_status FROM commission_drafts WHERE id = $1`,
        [draftId]
    );
    if (check.rows.length === 0) throw new Error('Draft not found');
    if (check.rows[0].calculation_status !== 'ready') {
        throw new Error('Cannot finalize — data gathering is still in progress');
    }

    const result = await pool.query(`
        UPDATE commission_drafts
        SET status = 'finalized', finalized_at = NOW(), finalized_by = $2
        WHERE id = $1 AND status = 'draft'
        RETURNING *
    `, [draftId, finalizedBy]);

    if (result.rows.length === 0) throw new Error('Draft not found or already finalized');
    return result.rows[0];
}
