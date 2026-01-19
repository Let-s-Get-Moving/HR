/**
 * Sales Performance Import Service
 * 
 * Imports sales-person-performance.xlsx files into the sales_performance_staging table.
 * 
 * Expected Excel schema (16 columns):
 *   Name, # Leads Received, Bad, % Bad, Sent, % Sent, Pending, % Pending,
 *   Booked, % Booked, Lost, % Lost, Cancelled, % Cancelled, Booked Total, Average Booking
 * 
 * Requires period_start and period_end from the upload request (file has no date info).
 */

import { pool } from '../db.js';
import {
    loadExcelWorkbook,
    getWorksheetData,
    parseMoney,
    parsePercent,
    normalizeNameKey,
    cleanCellValue
} from './excelParser.js';

// Expected headers for sales performance file (exact match required)
const EXPECTED_HEADERS = [
    'Name',
    '# Leads Received',
    'Bad',
    '% Bad',
    'Sent',
    '% Sent',
    'Pending',
    '% Pending',
    'Booked',
    '% Booked',
    'Lost',
    '% Lost',
    'Cancelled',
    '% Cancelled',
    'Booked Total',
    'Average Booking'
];

/**
 * Detect if the worksheet has the expected sales performance headers
 * @param {Array} firstRow - First row of the worksheet (header row)
 * @returns {boolean} - True if headers match
 */
export function detectSalesPerformanceHeaders(firstRow) {
    if (!firstRow || !Array.isArray(firstRow)) {
        return false;
    }
    
    // Check if all expected headers are present (exact match)
    for (let i = 0; i < EXPECTED_HEADERS.length; i++) {
        const expected = EXPECTED_HEADERS[i];
        const actual = firstRow[i];
        
        if (!actual || String(actual).trim() !== expected) {
            console.log(`[detectSalesPerformanceHeaders] Mismatch at column ${i}: expected "${expected}", got "${actual}"`);
            return false;
        }
    }
    
    console.log('[detectSalesPerformanceHeaders] All headers match');
    return true;
}

/**
 * Parse an integer from a cell value
 * @param {*} value - Cell value
 * @returns {number|null} - Parsed integer or null
 */
function parseInt_(value) {
    if (value === null || value === undefined || value === '') return null;
    
    const cleaned = String(value).replace(/,/g, '').trim();
    if (!cleaned || cleaned === '-') return null;
    
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? null : num;
}

/**
 * Import summary class
 */
class ImportSummary {
    constructor(filename, sheetName, periodStart, periodEnd) {
        this.file = filename;
        this.sheet = sheetName;
        this.period_start = periodStart;
        this.period_end = periodEnd;
        this.inserted = 0;
        this.updated = 0;
        this.skipped = 0;
        this.errors = [];
    }

    addError(row, reason, data = {}) {
        this.errors.push({ row, reason, ...data });
    }
}

/**
 * Main import function
 * @param {Buffer} fileBuffer - Excel file buffer
 * @param {string} filename - Original filename
 * @param {string} periodStart - Period start date (YYYY-MM-DD)
 * @param {string} periodEnd - Period end date (YYYY-MM-DD)
 * @param {string|null} sheetName - Optional sheet name (defaults to first sheet)
 * @returns {Promise<ImportSummary>} - Import summary
 */
export async function importSalesPerformanceFromExcel(fileBuffer, filename, periodStart, periodEnd, sheetName = null) {
    // Load workbook
    const workbook = loadExcelWorkbook(fileBuffer, filename);
    const actualSheetName = sheetName || workbook.SheetNames[0];
    
    const summary = new ImportSummary(filename, actualSheetName, periodStart, periodEnd);
    
    // Get worksheet data as 2D array
    const data = getWorksheetData(workbook, actualSheetName);
    
    if (!data || data.length < 2) {
        throw new Error('File contains no data rows');
    }
    
    // Validate headers
    const headerRow = data[0];
    if (!detectSalesPerformanceHeaders(headerRow)) {
        throw new Error('File does not match expected sales-person-performance format. Expected headers: ' + EXPECTED_HEADERS.join(', '));
    }
    
    console.log(`[importSalesPerformance] Processing ${data.length - 1} data rows for period ${periodStart} to ${periodEnd}`);
    
    // Start transaction
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Process each data row (skip header row)
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const rowNum = i + 1; // 1-based for logging
            
            try {
                // Extract name
                const nameRaw = cleanCellValue(row[0]);
                if (!nameRaw) {
                    summary.addError(rowNum, 'Missing name');
                    summary.skipped++;
                    continue;
                }
                
                const nameKey = normalizeNameKey(nameRaw);
                if (!nameKey) {
                    summary.addError(rowNum, 'Name normalizes to empty string', { nameRaw });
                    summary.skipped++;
                    continue;
                }
                
                // Parse all columns
                const rowData = {
                    period_start: periodStart,
                    period_end: periodEnd,
                    name_raw: nameRaw,
                    name_key: nameKey,
                    leads_received: parseInt_(row[1]),
                    bad_count: parseInt_(row[2]),
                    bad_pct: parsePercent(row[3]),
                    sent_count: parseInt_(row[4]),
                    sent_pct: parsePercent(row[5]),
                    pending_count: parseInt_(row[6]),
                    pending_pct: parsePercent(row[7]),
                    booked_count: parseInt_(row[8]),
                    booked_pct: parsePercent(row[9]),
                    lost_count: parseInt_(row[10]),
                    lost_pct: parsePercent(row[11]),
                    cancelled_count: parseInt_(row[12]),
                    cancelled_pct: parsePercent(row[13]),
                    booked_total: parseMoney(row[14]),
                    avg_booking: parseMoney(row[15]),
                    source_file: filename,
                    sheet_name: actualSheetName
                };
                
                // Upsert into staging table
                const result = await client.query(`
                    INSERT INTO sales_performance_staging (
                        period_start, period_end, name_raw, name_key,
                        leads_received, bad_count, bad_pct, sent_count, sent_pct,
                        pending_count, pending_pct, booked_count, booked_pct,
                        lost_count, lost_pct, cancelled_count, cancelled_pct,
                        booked_total, avg_booking, source_file, sheet_name,
                        created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                        $14, $15, $16, $17, $18, $19, $20, $21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                    ON CONFLICT (period_start, period_end, name_key)
                    DO UPDATE SET
                        name_raw = EXCLUDED.name_raw,
                        leads_received = EXCLUDED.leads_received,
                        bad_count = EXCLUDED.bad_count,
                        bad_pct = EXCLUDED.bad_pct,
                        sent_count = EXCLUDED.sent_count,
                        sent_pct = EXCLUDED.sent_pct,
                        pending_count = EXCLUDED.pending_count,
                        pending_pct = EXCLUDED.pending_pct,
                        booked_count = EXCLUDED.booked_count,
                        booked_pct = EXCLUDED.booked_pct,
                        lost_count = EXCLUDED.lost_count,
                        lost_pct = EXCLUDED.lost_pct,
                        cancelled_count = EXCLUDED.cancelled_count,
                        cancelled_pct = EXCLUDED.cancelled_pct,
                        booked_total = EXCLUDED.booked_total,
                        avg_booking = EXCLUDED.avg_booking,
                        source_file = EXCLUDED.source_file,
                        sheet_name = EXCLUDED.sheet_name,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) AS inserted
                `, [
                    rowData.period_start,
                    rowData.period_end,
                    rowData.name_raw,
                    rowData.name_key,
                    rowData.leads_received,
                    rowData.bad_count,
                    rowData.bad_pct,
                    rowData.sent_count,
                    rowData.sent_pct,
                    rowData.pending_count,
                    rowData.pending_pct,
                    rowData.booked_count,
                    rowData.booked_pct,
                    rowData.lost_count,
                    rowData.lost_pct,
                    rowData.cancelled_count,
                    rowData.cancelled_pct,
                    rowData.booked_total,
                    rowData.avg_booking,
                    rowData.source_file,
                    rowData.sheet_name
                ]);
                
                // Track insert vs update
                if (result.rows[0].inserted) {
                    summary.inserted++;
                } else {
                    summary.updated++;
                }
                
            } catch (rowError) {
                console.error(`[importSalesPerformance] Error processing row ${rowNum}:`, rowError.message);
                summary.addError(rowNum, rowError.message);
                summary.skipped++;
            }
        }
        
        await client.query('COMMIT');
        
        console.log(`[importSalesPerformance] Import complete: ${summary.inserted} inserted, ${summary.updated} updated, ${summary.skipped} skipped`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[importSalesPerformance] Transaction rolled back:', error.message);
        throw error;
    } finally {
        client.release();
    }
    
    return summary;
}
