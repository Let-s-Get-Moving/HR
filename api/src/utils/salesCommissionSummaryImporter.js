/**
 * Sales Commission Summary Importer
 * 
 * Imports Sales Commission Summary Excel files into sales_commission_summary_staging table.
 * 
 * Expected Excel columns:
 *   Sales Person, Total Estimated, Invoiced (before taxes and tip), 
 *   Total Invoiced (including taxes and tip), Commission Base, 
 *   Calculated Commissions, Lump Sums, Deductions, Net Commissions
 * 
 * Key behaviors:
 *   - Upserts by (period_start, period_end, sales_person_key)
 *   - Uses normalizeNameKey() for name matching
 */

import { pool } from '../db.js';
import {
    loadExcelWorkbook,
    getWorksheetData,
    parseMoney,
    normalizeNameKey,
    cleanCellValue
} from './excelParser.js';

// Expected headers for Sales Commission Summary report
const EXPECTED_HEADERS = [
    'Sales Person',
    'Total Estimated',
    'Invoiced (before taxes and tip)',
    'Total Invoiced (including taxes and tip)',
    'Commission Base',
    'Calculated Commissions',
    'Lump Sums',
    'Deductions',
    'Net Commissions'
];

/**
 * Import Sales Commission Summary file
 * 
 * @param {Buffer} fileBuffer - Excel file buffer
 * @param {string} periodStart - Period start date (YYYY-MM-DD)
 * @param {string} periodEnd - Period end date (YYYY-MM-DD)
 * @returns {Promise<object>} Import result summary
 */
export async function importSalesCommissionSummary(fileBuffer, periodStart, periodEnd) {
    const workbook = await loadExcelWorkbook(fileBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    if (!worksheet) {
        throw new Error('No worksheet found in file');
    }
    
    const data = getWorksheetData(worksheet);
    
    if (data.length === 0) {
        throw new Error('No data found in worksheet');
    }
    
    // Validate headers
    const headers = data[0];
    console.log('[SalesCommissionSummary] Raw headers:', headers);
    const headerMap = buildHeaderMap(headers);
    console.log('[SalesCommissionSummary] Mapped headers:', Object.keys(headerMap));
    
    validateHeaders(headerMap);
    
    // Parse data rows
    const rows = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        // Skip empty rows
        if (!row || row.every(cell => !cell)) {
            continue;
        }
        
        const salesPersonRaw = cleanCellValue(row[headerMap['Sales Person']]);
        
        // Skip rows without a sales person name
        if (!salesPersonRaw) {
            continue;
        }
        
        const salesPersonKey = normalizeNameKey(salesPersonRaw);
        
        const parsed = {
            sales_person_raw: salesPersonRaw,
            sales_person_key: salesPersonKey,
            total_estimated: parseMoney(row[headerMap['Total Estimated']]),
            invoiced_before_tax: parseMoney(row[headerMap['Invoiced (before taxes and tip)']]),
            total_invoiced: parseMoney(row[headerMap['Total Invoiced (including taxes and tip)']]),
            commission_base: parseMoney(row[headerMap['Commission Base']]),
            calculated_commissions: parseMoney(row[headerMap['Calculated Commissions']]),
            lump_sums: parseMoney(row[headerMap['Lump Sums']]),
            deductions: parseMoney(row[headerMap['Deductions']]),
            net_commissions: parseMoney(row[headerMap['Net Commissions']])
        };
        
        rows.push(parsed);
    }
    
    if (rows.length === 0) {
        throw new Error('No valid data rows found in file');
    }
    
    // Import into database
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Delete existing data for this period (will be replaced)
        await client.query(
            'DELETE FROM sales_commission_summary_staging WHERE period_start = $1 AND period_end = $2',
            [periodStart, periodEnd]
        );
        
        // Insert new rows
        for (const row of rows) {
            await client.query(`
                INSERT INTO sales_commission_summary_staging (
                    period_start,
                    period_end,
                    sales_person_raw,
                    sales_person_key,
                    total_estimated,
                    invoiced_before_tax,
                    total_invoiced,
                    commission_base,
                    calculated_commissions,
                    lump_sums,
                    deductions,
                    net_commissions
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (period_start, period_end, sales_person_key)
                DO UPDATE SET
                    sales_person_raw = EXCLUDED.sales_person_raw,
                    total_estimated = EXCLUDED.total_estimated,
                    invoiced_before_tax = EXCLUDED.invoiced_before_tax,
                    total_invoiced = EXCLUDED.total_invoiced,
                    commission_base = EXCLUDED.commission_base,
                    calculated_commissions = EXCLUDED.calculated_commissions,
                    lump_sums = EXCLUDED.lump_sums,
                    deductions = EXCLUDED.deductions,
                    net_commissions = EXCLUDED.net_commissions,
                    created_at = NOW()
            `, [
                periodStart,
                periodEnd,
                row.sales_person_raw,
                row.sales_person_key,
                row.total_estimated,
                row.invoiced_before_tax,
                row.total_invoiced,
                row.commission_base,
                row.calculated_commissions,
                row.lump_sums,
                row.deductions,
                row.net_commissions
            ]);
        }
        
        await client.query('COMMIT');
        
        return {
            success: true,
            rowsImported: rows.length,
            period: { start: periodStart, end: periodEnd }
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Build a map of header name to column index
 * Handles slight variations in header names
 */
function buildHeaderMap(headers) {
    const map = {};
    
    for (let i = 0; i < headers.length; i++) {
        const header = cleanCellValue(headers[i]);
        if (!header) continue;
        
        const normalized = header.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ''); // Remove special chars
        
        // Map common variations - be VERY flexible
        if (normalized.includes('sales') && (normalized.includes('person') || normalized.includes('agent'))) {
            map['Sales Person'] = i;
        } else if (normalized.includes('total') && normalized.includes('estimated')) {
            map['Total Estimated'] = i;
        } else if (normalized.includes('invoiced') && normalized.includes('before') && !normalized.includes('total')) {
            // Matches: "invoiced before taxes", "invoiced before tax and tip", etc.
            map['Invoiced (before taxes and tip)'] = i;
        } else if ((normalized.includes('total') && normalized.includes('invoiced')) || 
                   (normalized.includes('invoiced') && normalized.includes('including'))) {
            map['Total Invoiced (including taxes and tip)'] = i;
        } else if (normalized.includes('commission') && normalized.includes('base')) {
            map['Commission Base'] = i;
        } else if ((normalized.includes('calculated') && normalized.includes('commission')) || 
                   (normalized === 'commissions' || normalized === 'commission')) {
            map['Calculated Commissions'] = i;
        } else if (normalized.includes('lump')) {
            map['Lump Sums'] = i;
        } else if (normalized.includes('deduction')) {
            map['Deductions'] = i;
        } else if (normalized.includes('net') && normalized.includes('commission')) {
            map['Net Commissions'] = i;
        }
    }
    
    return map;
}

/**
 * Validate that all required headers are present
 */
function validateHeaders(headerMap) {
    const missing = [];
    
    for (const requiredHeader of EXPECTED_HEADERS) {
        if (!(requiredHeader in headerMap)) {
            missing.push(requiredHeader);
        }
    }
    
    if (missing.length > 0) {
        const foundHeaders = Object.keys(headerMap);
        throw new Error(
            `Missing required columns: ${missing.join(', ')}. ` +
            `Found columns: ${foundHeaders.length > 0 ? foundHeaders.join(', ') : 'none'}. ` +
            `Expected all of: ${EXPECTED_HEADERS.join(', ')}`
        );
    }
}

/**
 * Get summary of staged data for a period
 * 
 * @param {string} periodStart
 * @param {string} periodEnd
 * @returns {Promise<object>}
 */
export async function getStagedSummary(periodStart, periodEnd) {
    const result = await pool.query(`
        SELECT 
            COUNT(*) as total_agents,
            SUM(invoiced_before_tax) as total_invoiced,
            SUM(net_commissions) as total_net_commissions
        FROM sales_commission_summary_staging
        WHERE period_start = $1 AND period_end = $2
    `, [periodStart, periodEnd]);
    
    return result.rows[0];
}
