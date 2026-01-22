/**
 * Revenue Source Comparison API
 * 
 * Compares Booked Opportunities invoiced amounts vs Sales Performance booked totals
 */

import { Router } from 'express';
import { q } from '../db.js';
import { requireRole, ROLES } from '../middleware/rbac.js';
import { requireAuth } from '../session.js';

const r = Router();

/**
 * GET /api/revenue-comparison
 * Compare revenue sources for a given period
 * 
 * Query params:
 *   period_start: YYYY-MM-DD
 *   period_end: YYYY-MM-DD
 */
r.get('/', requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
    try {
        const { period_start, period_end } = req.query;
        
        if (!period_start || !period_end) {
            return res.status(400).json({
                error: 'Missing required parameters',
                details: 'period_start and period_end are required (YYYY-MM-DD format)'
            });
        }
        
        console.log(`[RevenueComparison] Comparing sources for ${period_start} to ${period_end}`);
        
        // Query 1: Sum invoiced amounts from Booked Opportunities by service date
        const bookedOppQuery = `
            SELECT 
                sales_person_raw,
                branch_name,
                COUNT(*) as quote_count,
                SUM(invoiced_amount) as total_invoiced,
                SUM(CASE WHEN branch_name LIKE '%🇺🇸%' THEN invoiced_amount ELSE 0 END) as us_invoiced,
                SUM(CASE WHEN branch_name NOT LIKE '%🇺🇸%' THEN invoiced_amount ELSE 0 END) as ca_invoiced
            FROM sales_booked_opportunities_quotes
            WHERE service_date >= $1 
              AND service_date <= $2
              AND invoiced_amount IS NOT NULL
            GROUP BY sales_person_raw, branch_name
            ORDER BY total_invoiced DESC
        `;
        
        const bookedOppResult = await q(bookedOppQuery, [period_start, period_end]);
        
        // Aggregate by sales person (ignoring branch)
        const bookedOppBySalesPerson = new Map();
        let bookedOppGrandTotal = 0;
        let usGrandTotal = 0;
        let caGrandTotal = 0;
        
        for (const row of bookedOppResult.rows) {
            const salesPerson = row.sales_person_raw || '(Unknown)';
            const totalInvoiced = parseFloat(row.total_invoiced) || 0;
            const usInvoiced = parseFloat(row.us_invoiced) || 0;
            const caInvoiced = parseFloat(row.ca_invoiced) || 0;
            
            if (!bookedOppBySalesPerson.has(salesPerson)) {
                bookedOppBySalesPerson.set(salesPerson, {
                    total: 0,
                    us: 0,
                    ca: 0,
                    quoteCount: 0
                });
            }
            
            const entry = bookedOppBySalesPerson.get(salesPerson);
            entry.total += totalInvoiced;
            entry.us += usInvoiced;
            entry.ca += caInvoiced;
            entry.quoteCount += parseInt(row.quote_count) || 0;
            
            bookedOppGrandTotal += totalInvoiced;
            usGrandTotal += usInvoiced;
            caGrandTotal += caInvoiced;
        }
        
        // Query 2: Sum booked totals from Sales Performance staging
        const salesPerfQuery = `
            SELECT 
                name_raw,
                name_key,
                booked_total,
                booked_count
            FROM sales_performance_staging
            WHERE period_start = $1 
              AND period_end = $2
            ORDER BY booked_total DESC
        `;
        
        const salesPerfResult = await q(salesPerfQuery, [period_start, period_end]);
        
        const salesPerfByName = new Map();
        let salesPerfGrandTotal = 0;
        
        for (const row of salesPerfResult.rows) {
            const name = row.name_raw || '(Unknown)';
            const bookedTotal = parseFloat(row.booked_total) || 0;
            
            salesPerfByName.set(name, {
                bookedTotal,
                bookedCount: parseInt(row.booked_count) || 0,
                nameKey: row.name_key
            });
            
            salesPerfGrandTotal += bookedTotal;
        }
        
        // Calculate difference
        const difference = bookedOppGrandTotal - salesPerfGrandTotal;
        const percentDiff = salesPerfGrandTotal !== 0 
            ? ((difference / salesPerfGrandTotal) * 100)
            : 0;
        
        // Build per-person comparison
        const allNames = new Set([
            ...bookedOppBySalesPerson.keys(),
            ...salesPerfByName.keys()
        ]);
        
        const byPerson = [];
        let discrepancyCount = 0;
        
        for (const name of allNames) {
            const bookedOpp = bookedOppBySalesPerson.get(name);
            const salesPerf = salesPerfByName.get(name);
            
            const bookedOppTotal = bookedOpp ? bookedOpp.total : 0;
            const salesPerfTotal = salesPerf ? salesPerf.bookedTotal : 0;
            const diff = bookedOppTotal - salesPerfTotal;
            
            let status = 'match';
            if (Math.abs(diff) > 100) {
                status = 'significant';
                discrepancyCount++;
            } else if (Math.abs(diff) > 0.01) {
                status = 'minor';
            }
            
            byPerson.push({
                name,
                booked_opportunities_total: bookedOppTotal,
                sales_performance_total: salesPerfTotal,
                difference: diff,
                status,
                quote_count: bookedOpp ? bookedOpp.quoteCount : 0,
                booked_count: salesPerf ? salesPerf.bookedCount : 0
            });
        }
        
        // Sort by absolute difference descending
        byPerson.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
        
        // Determine overall status
        let overallStatus = 'match';
        if (Math.abs(difference) > 100) {
            overallStatus = 'significant_difference';
        } else if (Math.abs(difference) > 0.01) {
            overallStatus = 'minor_difference';
        }
        
        const response = {
            period: {
                start: period_start,
                end: period_end
            },
            totals: {
                booked_opportunities: bookedOppGrandTotal,
                booked_opportunities_us: usGrandTotal,
                booked_opportunities_ca: caGrandTotal,
                sales_performance: salesPerfGrandTotal,
                difference: difference,
                percent_difference: percentDiff
            },
            counts: {
                booked_opp_people: bookedOppBySalesPerson.size,
                sales_perf_people: salesPerfByName.size,
                discrepancies: discrepancyCount
            },
            status: overallStatus,
            by_person: byPerson,
            recommendations: []
        };
        
        // Add recommendations based on findings
        if (overallStatus === 'significant_difference') {
            response.recommendations.push('Verify US branch invoiced amounts were converted (should be ×1.25)');
            response.recommendations.push('Check if both imports cover the exact same date range');
            response.recommendations.push('Investigate name matching between sources');
            response.recommendations.push('Confirm both sources use the same definition of "revenue"');
        }
        
        if (usGrandTotal > 0 && Math.abs(difference) > 100) {
            response.recommendations.push('US branch amounts detected - verify USD→CAD conversion was applied');
        }
        
        if (discrepancyCount > 0) {
            response.recommendations.push(`${discrepancyCount} sales people have differences > $100 - review individual records`);
        }
        
        res.json(response);
        
    } catch (error) {
        console.error('[RevenueComparison] Error:', error);
        res.status(500).json({
            error: 'Revenue comparison failed',
            details: error.message
        });
    }
});

export default r;
