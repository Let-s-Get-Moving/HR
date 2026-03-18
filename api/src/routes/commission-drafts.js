/**
 * Commission Drafts API Routes
 *
 * POST /ingest  — Import 3 files, create draft skeleton, fire async enrichment,
 *                 return immediately with draftId + calculation_status='calculating'.
 * GET  /        — List all drafts.
 * GET  /:id     — Draft + line items (used for polling progress).
 * PATCH /:draftId/line-items/:lineItemId — Save manual fields (auto-save).
 * POST /:id/finalize — Lock draft (only allowed when calculation_status='ready').
 */

import { Router } from 'express';
import multer from 'multer';
import { pool } from '../db.js';
import { requireAuth } from '../session.js';
import { requireRole, ROLES } from '../middleware/rbac.js';
import { validateFileContent } from '../utils/fileValidation.js';

import { importSalesPerformanceFromExcel } from '../utils/salesPerformanceImporter.js';
import { importSalesCommissionSummary }    from '../utils/salesCommissionSummaryImporter.js';
import { importLeadStatusFromExcel }       from '../utils/leadStatusImporter.js';
import {
    createDraftSkeleton,
    enrichDraftWithSmartMovingData,
    getDraftById,
    listDrafts,
    finalizeDraft,
} from '../utils/commissionDraftEngine.js';

const r = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
        const ok =
            file.mimetype.includes('sheet') ||
            file.originalname.endsWith('.xlsx') ||
            file.mimetype === 'text/csv' ||
            file.originalname.endsWith('.csv');
        cb(ok ? null : new Error('Only .xlsx and .csv files are allowed'), ok);
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/commission-drafts/ingest
// ─────────────────────────────────────────────────────────────────────────────
r.post(
    '/ingest',
    requireAuth,
    requireRole([ROLES.ADMIN, ROLES.MANAGER]),
    upload.fields([
        { name: 'performanceFile',      maxCount: 1 },
        { name: 'commissionSummaryFile', maxCount: 1 },
        { name: 'leadStatusFile',       maxCount: 1 },
    ]),
    async (req, res) => {
        const { periodStart, periodEnd } = req.body;

        if (!periodStart || !periodEnd) {
            return res.status(400).json({ error: 'periodStart and periodEnd are required' });
        }

        const perfFile    = req.files?.performanceFile?.[0];
        const summaryFile = req.files?.commissionSummaryFile?.[0];
        const leadFile    = req.files?.leadStatusFile?.[0];

        if (!perfFile || !summaryFile || !leadFile) {
            console.log('[commission-drafts/ingest] Missing files:', {
                hasPerf: !!perfFile,
                hasSummary: !!summaryFile,
                hasLead: !!leadFile
            });
            return res.status(400).json({
                error: 'All three files are required: performanceFile, commissionSummaryFile, leadStatusFile',
            });
        }

        console.log('[commission-drafts/ingest] Files received:', {
            performance: perfFile.originalname,
            summary: summaryFile.originalname,
            lead: leadFile.originalname,
            period: { start: periodStart, end: periodEnd }
        });

        // ── Validate ──────────────────────────────────────────────────────────
        try {
            await Promise.all([
                validateFileContent(perfFile.buffer,    perfFile.originalname),
                validateFileContent(summaryFile.buffer, summaryFile.originalname),
                validateFileContent(leadFile.buffer,    leadFile.originalname),
            ]);
        } catch (err) {
            return res.status(400).json({ error: 'File validation failed', details: err.message });
        }

        // ── Import files (fast — staging table upserts) ───────────────────────
        const importResults = {};

        try {
            importResults.performance = await importSalesPerformanceFromExcel(
                perfFile.buffer, perfFile.originalname, periodStart, periodEnd
            );
        } catch (err) {
            return res.status(400).json({ error: 'Failed to import Sales Performance file', details: err.message });
        }

        try {
            importResults.commissionSummary = await importSalesCommissionSummary(
                summaryFile.buffer, periodStart, periodEnd
            );
            console.log('[commission-drafts/ingest] Commission Summary imported:', importResults.commissionSummary);
        } catch (err) {
            console.error('[commission-drafts/ingest] Commission Summary import failed:', err);
            return res.status(400).json({ error: 'Failed to import Commission Summary file', details: err.message });
        }

        try {
            importResults.leadStatus = await importLeadStatusFromExcel(leadFile.buffer, leadFile.originalname);
            console.log('[commission-drafts/ingest] Lead Status imported:', importResults.leadStatus);
        } catch (err) {
            console.error('[commission-drafts/ingest] Lead Status import failed:', err);
            return res.status(400).json({ error: 'Failed to import Lead Status file', details: err.message });
        }

        // ── Create draft skeleton (inserts rows with NULL SM-dependent fields) ─
        let skeleton;
        try {
            skeleton = await createDraftSkeleton(periodStart, periodEnd, req.user.id);
        } catch (err) {
            console.error('[commission-drafts] skeleton creation failed:', err);
            return res.status(500).json({ error: 'Failed to create draft', details: err.message });
        }

        // ── Respond immediately ───────────────────────────────────────────────
        // The client receives the draftId + calculation_status='calculating'.
        // It should start polling GET /:id every 3 s to track progress.
        res.json({
            success: true,
            imports: importResults,
            draft: {
                draftId:           skeleton.draftId,
                agentCount:        skeleton.agentCount,
                managerCount:      skeleton.managerCount,
                quotesTotal:       skeleton.quotesTotal,
                calculationStatus: 'calculating',
            },
        });

        // ── Fire enrichment in background (no await) ──────────────────────────
        // Node will process this after the response has been flushed.
        // Jobs are fetched one by one; quotes_processed is incremented after each.
        enrichDraftWithSmartMovingData(skeleton.draftId, periodStart, periodEnd)
            .catch(err =>
                console.error(`[commission-drafts] enrichment error for draft ${skeleton.draftId}:`, err)
            );
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/commission-drafts
// ─────────────────────────────────────────────────────────────────────────────
r.get('/', requireAuth, requireRole([ROLES.ADMIN, ROLES.MANAGER]), async (_req, res) => {
    try {
        res.json(await listDrafts());
    } catch (err) {
        console.error('[commission-drafts] listDrafts:', err);
        res.status(500).json({ error: 'Failed to list drafts' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/commission-drafts/:id
// Used by frontend polling: returns draft + line items.
// calculation_status / quotes_processed / quotes_total tell the client progress.
// ─────────────────────────────────────────────────────────────────────────────
r.get('/:id', requireAuth, requireRole([ROLES.ADMIN, ROLES.MANAGER]), async (req, res) => {
    try {
        const draft = await getDraftById(parseInt(req.params.id, 10));
        if (!draft) return res.status(404).json({ error: 'Draft not found' });
        res.json(draft);
    } catch (err) {
        console.error('[commission-drafts] getDraftById:', err);
        res.status(500).json({ error: 'Failed to get draft' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/commission-drafts/:draftId/line-items/:lineItemId
// Manual-field auto-save. Recalculates total_due via DB trigger.
// ─────────────────────────────────────────────────────────────────────────────
r.patch(
    '/:draftId/line-items/:lineItemId',
    requireAuth,
    requireRole([ROLES.ADMIN, ROLES.MANAGER]),
    async (req, res) => {
        const draftId    = parseInt(req.params.draftId,    10);
        const lineItemId = parseInt(req.params.lineItemId, 10);

        // Gate checks
        const draftRow = await pool.query(
            `SELECT status, calculation_status FROM commission_drafts WHERE id = $1`,
            [draftId]
        );
        if (draftRow.rows.length === 0) return res.status(404).json({ error: 'Draft not found' });
        if (draftRow.rows[0].status !== 'draft') {
            return res.status(400).json({ error: 'Cannot edit a finalized draft' });
        }
        if (draftRow.rows[0].calculation_status !== 'ready') {
            return res.status(400).json({ error: 'Cannot edit while data gathering is in progress' });
        }

        const EDITABLE = [
            'spiff_bonus', 'revenue_bonus',
            'booking_bonus_5_10_plus', 'booking_bonus_5_10_minus',
            'hourly_paid_out', 'deduction_sales_manager', 'deduction_missing_punch',
            'deduction_customer_support', 'deduction_post_commission',
            'deduction_dispatch', 'deduction_other',
        ];

        const updates = {};
        for (const field of EDITABLE) {
            if (field in req.body) {
                const v = parseFloat(req.body[field]);
                if (!isNaN(v)) updates[field] = v;
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        const setClauses = Object.keys(updates).map((f, i) => `${f} = $${i + 3}`);
        const result = await pool.query(
            `UPDATE commission_line_items
             SET ${setClauses.join(', ')}
             WHERE id = $1 AND draft_id = $2
             RETURNING *`,
            [lineItemId, draftId, ...Object.values(updates)]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Line item not found' });
        res.json(result.rows[0]);
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/commission-drafts/:id/finalize
// ─────────────────────────────────────────────────────────────────────────────
r.post('/:id/finalize', requireAuth, requireRole([ROLES.ADMIN, ROLES.MANAGER]), async (req, res) => {
    try {
        const finalized = await finalizeDraft(parseInt(req.params.id, 10), req.user.id);
        res.json({ success: true, draft: finalized });
    } catch (err) {
        console.error('[commission-drafts] finalize:', err);
        res.status(400).json({ error: err.message });
    }
});

export default r;
