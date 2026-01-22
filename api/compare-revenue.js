/**
 * Revenue Source Comparison Script
 * Run from api directory: node compare-revenue.js
 */

import { pool } from './src/db.js';

const PERIOD_START = '2025-12-29';
const PERIOD_END = '2026-01-11';

async function compareRevenueSources() {
    console.log('='.repeat(80));
    console.log('📊 REVENUE SOURCE COMPARISON');
    console.log(`Period: ${PERIOD_START} to ${PERIOD_END}`);
    console.log('='.repeat(80));
    console.log();

    try {
        // Query 1: Booked Opportunities by service date
        console.log('🔍 Querying Booked Opportunities (by service_date)...');
        const bookedOppResult = await pool.query(`
            SELECT 
                sales_person_raw,
                COUNT(*) as quote_count,
                SUM(invoiced_amount) as total_invoiced,
                SUM(CASE WHEN branch_name LIKE '%🇺🇸%' THEN invoiced_amount ELSE 0 END) as us_invoiced,
                SUM(CASE WHEN branch_name NOT LIKE '%🇺🇸%' THEN invoiced_amount ELSE 0 END) as ca_invoiced
            FROM sales_booked_opportunities_quotes
            WHERE service_date >= $1 
              AND service_date <= $2
              AND invoiced_amount IS NOT NULL
            GROUP BY sales_person_raw
            ORDER BY total_invoiced DESC
        `, [PERIOD_START, PERIOD_END]);
        
        let bookedOppGrandTotal = 0;
        let usGrandTotal = 0;
        let caGrandTotal = 0;
        
        const bookedOppByPerson = new Map();
        for (const row of bookedOppResult.rows) {
            const total = parseFloat(row.total_invoiced) || 0;
            const us = parseFloat(row.us_invoiced) || 0;
            const ca = parseFloat(row.ca_invoiced) || 0;
            
            bookedOppByPerson.set(row.sales_person_raw || '(Unknown)', total);
            bookedOppGrandTotal += total;
            usGrandTotal += us;
            caGrandTotal += ca;
        }
        
        console.log(`✅ Found ${bookedOppResult.rows.length} sales people in Booked Opportunities`);
        console.log();

        // Query 2: Sales Performance staging
        console.log('🔍 Querying Sales Performance (by period)...');
        const salesPerfResult = await pool.query(`
            SELECT 
                name_raw,
                booked_total,
                booked_count
            FROM sales_performance_staging
            WHERE period_start = $1 
              AND period_end = $2
            ORDER BY booked_total DESC
        `, [PERIOD_START, PERIOD_END]);
        
        let salesPerfGrandTotal = 0;
        const salesPerfByPerson = new Map();
        
        for (const row of salesPerfResult.rows) {
            const total = parseFloat(row.booked_total) || 0;
            salesPerfByPerson.set(row.name_raw || '(Unknown)', total);
            salesPerfGrandTotal += total;
        }
        
        console.log(`✅ Found ${salesPerfResult.rows.length} sales people in Sales Performance`);
        console.log();

        // Calculate Sales Performance total for ONLY people who exist in Booked Opportunities
        const salesPerfNamesInBooked = new Set(bookedOppByPerson.keys());
        let salesPerfMatchedTotal = 0;
        let salesPerfUnmatchedTotal = 0;
        
        for (const [name, total] of salesPerfByPerson) {
            if (salesPerfNamesInBooked.has(name)) {
                salesPerfMatchedTotal += total;
            } else {
                salesPerfUnmatchedTotal += total;
            }
        }
        
        console.log('🔍 Filtering Sales Performance to matched names only...');
        console.log(`   - ${salesPerfNamesInBooked.size} people appear in BOTH sources`);
        console.log(`   - ${salesPerfByPerson.size - salesPerfNamesInBooked.size} people ONLY in Sales Performance`);
        console.log();

        // Compare totals
        console.log('='.repeat(80));
        console.log('📈 GRAND TOTALS');
        console.log('='.repeat(80));
        console.log();
        
        const fmt = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        console.log(`Booked Opportunities (invoiced_amount):  ${fmt(bookedOppGrandTotal)}`);
        console.log(`  - US branches (converted to CAD):      ${fmt(usGrandTotal)}`);
        console.log(`  - Non-US branches (CAD):               ${fmt(caGrandTotal)}`);
        console.log();
        console.log(`Sales Performance (all 63 people):       ${fmt(salesPerfGrandTotal)}`);
        console.log(`Sales Performance (matched 40 people):   ${fmt(salesPerfMatchedTotal)}`);
        console.log(`Sales Performance (unmatched 23 people): ${fmt(salesPerfUnmatchedTotal)}`);
        console.log();
        
        const differenceAll = bookedOppGrandTotal - salesPerfGrandTotal;
        const differenceMatched = bookedOppGrandTotal - salesPerfMatchedTotal;
        const percentDiffAll = salesPerfGrandTotal !== 0 
            ? ((differenceAll / salesPerfGrandTotal) * 100).toFixed(2)
            : 'N/A';
        const percentDiffMatched = salesPerfMatchedTotal !== 0 
            ? ((differenceMatched / salesPerfMatchedTotal) * 100).toFixed(2)
            : 'N/A';
        
        console.log(`Difference (vs all 63):                  ${fmt(differenceAll)} (${percentDiffAll}%)`);
        console.log(`Difference (vs matched 40):              ${fmt(differenceMatched)} (${percentDiffMatched}%)`);
        console.log();
        
        if (Math.abs(differenceMatched) < 0.01) {
            console.log('✅ MATCHED TOTALS ALIGN - When comparing same 40 people');
        } else if (Math.abs(differenceMatched) < 100) {
            console.log('⚠️  MINOR DIFFERENCE - Likely rounding or timing (when comparing same 40)');
        } else if (Math.abs(differenceMatched) < Math.abs(differenceAll)) {
            console.log('⚠️  CLOSER when comparing same people - unmatched names explain part of gap');
        } else {
            console.log('❌ STILL SIGNIFICANT DIFFERENCE - Even among matched names');
        }
        console.log();

        // Per-person comparison
        if (Math.abs(differenceMatched) > 100) {
            console.log('='.repeat(80));
            console.log('👤 TOP DISCREPANCIES BY PERSON');
            console.log('='.repeat(80));
            console.log();
            
            const allNames = new Set([...bookedOppByPerson.keys(), ...salesPerfByPerson.keys()]);
            const discrepancies = [];
            
            for (const name of allNames) {
                const booked = bookedOppByPerson.get(name) || 0;
                const perf = salesPerfByPerson.get(name) || 0;
                const diff = Math.abs(booked - perf);
                
                if (diff > 100) {
                    discrepancies.push({ name, booked, perf, diff });
                }
            }
            
            discrepancies.sort((a, b) => b.diff - a.diff);
            
            console.log('Name'.padEnd(25) + 'Booked Opp'.padStart(15) + 'Sales Perf'.padStart(15) + 'Diff'.padStart(15));
            console.log('-'.repeat(70));
            
            for (const d of discrepancies.slice(0, 10)) {
                console.log(
                    d.name.substring(0, 24).padEnd(25) +
                    fmt(d.booked).padStart(15) +
                    fmt(d.perf).padStart(15) +
                    fmt(d.diff).padStart(15)
                );
            }
            
            if (discrepancies.length > 10) {
                console.log(`... and ${discrepancies.length - 10} more`);
            }
            console.log();
        }

        // Recommendations
        console.log('='.repeat(80));
        console.log('💡 ANALYSIS');
        console.log('='.repeat(80));
        console.log();
        
        if (usGrandTotal > 0) {
            console.log(`✓ US branch data found: ${fmt(usGrandTotal)}`);
            console.log('  This amount should be 1.25× the original USD values');
            console.log();
        }
        
        if (Math.abs(differenceMatched) > 100) {
            console.log('⚠️  ACTION NEEDED:');
            console.log('  1. If US amounts look unconverted, re-import Booked Opportunities file');
            console.log('  2. Check that both sources cover same date range');
            console.log('  3. Verify name matching between sources');
            console.log('  4. After fixing, recalculate commissions');
        } else {
            console.log('✅ DATA SOURCES ALIGNED');
            console.log('  Commissions can be calculated with confidence.');
        }
        
        console.log();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

compareRevenueSources().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
