/**
 * Check US Branch Invoiced Amounts (RAW - No Conversion)
 * 
 * This script sums the invoiced amounts for US branch jobs exactly as stored
 * in the database, without any conversion. This helps verify if USD→CAD
 * conversion was already applied during import.
 * 
 * If conversion WAS applied: total should be ~1.25× the original USD
 * If conversion NOT applied: total is still in USD
 */

import { pool } from './src/db.js';

const PERIOD_START = '2025-12-29';
const PERIOD_END = '2026-01-11';

async function checkUSAmounts() {
    console.log('='.repeat(80));
    console.log('🇺🇸 US BRANCH INVOICED AMOUNTS (RAW STORED VALUES)');
    console.log(`Period: ${PERIOD_START} to ${PERIOD_END}`);
    console.log('='.repeat(80));
    console.log();

    try {
        // Query US branch jobs - get raw stored values
        const result = await pool.query(`
            SELECT 
                quote_id,
                branch_name,
                sales_person_raw,
                service_date,
                invoiced_amount,
                updated_at
            FROM sales_booked_opportunities_quotes
            WHERE branch_name LIKE '%🇺🇸%'
              AND service_date >= $1
              AND service_date <= $2
              AND invoiced_amount IS NOT NULL
            ORDER BY invoiced_amount DESC
        `, [PERIOD_START, PERIOD_END]);
        
        console.log(`Found ${result.rows.length} US branch quotes\n`);
        
        if (result.rows.length === 0) {
            console.log('No US branch data found for this period.');
            return;
        }
        
        // Calculate totals
        let totalInvoiced = 0;
        const branchTotals = new Map();
        
        for (const row of result.rows) {
            const amount = parseFloat(row.invoiced_amount) || 0;
            totalInvoiced += amount;
            
            const branch = row.branch_name || 'Unknown';
            branchTotals.set(branch, (branchTotals.get(branch) || 0) + amount);
        }
        
        // Show sample records
        console.log('📋 SAMPLE RECORDS (top 10 by amount):');
        console.log('-'.repeat(80));
        console.log('Quote ID'.padEnd(12) + 'Branch'.padEnd(30) + 'Amount'.padStart(15) + '  Updated');
        console.log('-'.repeat(80));
        
        for (const row of result.rows.slice(0, 10)) {
            const amount = parseFloat(row.invoiced_amount) || 0;
            console.log(
                String(row.quote_id).padEnd(12) +
                row.branch_name.substring(0, 29).padEnd(30) +
                `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`.padStart(15) +
                `  ${row.updated_at.toISOString().split('T')[0]}`
            );
        }
        
        if (result.rows.length > 10) {
            console.log(`... and ${result.rows.length - 10} more records`);
        }
        
        console.log();
        console.log('='.repeat(80));
        console.log('📊 TOTALS BY BRANCH');
        console.log('='.repeat(80));
        console.log();
        
        const sortedBranches = Array.from(branchTotals.entries())
            .sort((a, b) => b[1] - a[1]);
        
        for (const [branch, total] of sortedBranches) {
            const count = result.rows.filter(r => r.branch_name === branch).length;
            console.log(`${branch}`);
            console.log(`  ${count} quotes, Total: $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
            console.log();
        }
        
        console.log('='.repeat(80));
        console.log('💰 GRAND TOTAL (RAW STORED VALUES)');
        console.log('='.repeat(80));
        console.log();
        console.log(`Total US Branch Invoiced Amount: $${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        console.log();
        
        // Analysis
        console.log('='.repeat(80));
        console.log('🔍 CONVERSION VERIFICATION');
        console.log('='.repeat(80));
        console.log();
        
        const expectedIfNotConverted = totalInvoiced / 1.25;
        const expectedIfConverted = totalInvoiced;
        
        console.log('If these amounts are ALREADY converted from USD to CAD:');
        console.log(`  - Stored total (CAD): $${expectedIfConverted.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        console.log(`  - Original USD would have been: $${expectedIfNotConverted.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        console.log();
        console.log('If these amounts are STILL in USD (not converted):');
        console.log(`  - Stored total (USD): $${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        console.log(`  - Should be converted to: $${(totalInvoiced * 1.25).toLocaleString('en-US', { minimumFractionDigits: 2 })} CAD`);
        console.log();
        console.log('To verify which case is true:');
        console.log('  1. Check your original Excel file for a few of the quote IDs above');
        console.log('  2. Compare the Excel USD amounts to the stored amounts');
        console.log('  3. If stored = Excel × 1.25 → conversion WAS applied ✅');
        console.log('  4. If stored = Excel (same) → conversion NOT applied yet ❌');
        console.log();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

checkUSAmounts().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
