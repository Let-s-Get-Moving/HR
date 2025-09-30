/**
 * SMART Timecard Import Service
 * 
 * Intelligently detects and parses various timecard Excel formats:
 * - Auto-detects pay periods, employee names, and data sections
 * - Flexible column detection (works with any column order)
 * - Handles multiple time formats and date formats
 * - Works with repeating employee sections
 */

import { q, pool } from '../db.js';
import {
    loadExcelWorkbook,
    getWorksheetData,
    cleanCellValue
} from './excelParser.js';

class ImportSummary {
    constructor(filename, sheetName) {
        this.file = filename;
        this.sheet = sheetName;
        this.pay_period_start = null;
        this.pay_period_end = null;
        this.timecards_created = 0;
        this.timecards_updated = 0;
        this.entries_inserted = 0;
        this.entries_skipped = 0;
        this.errors = [];
        this.warnings = [];
        this.debug_logs = [];
    }

    addError(employee, row, reason, data = {}) {
        this.errors.push({ employee, row, reason, ...data });
    }

    addWarning(message) {
        this.warnings.push(message);
    }

    addDebugLog(message) {
        this.debug_logs.push(`[${new Date().toISOString()}] ${message}`);
        console.log(message);
    }
}

/**
 * SMART time parser - handles multiple formats
 */
function parseTime(timeStr) {
    if (!timeStr) return null;
    
    const cleaned = String(timeStr).trim().toUpperCase();
    if (!cleaned || cleaned === '-' || cleaned === 'N/A' || cleaned === '') return null;
    
    // Format: "HH:MM AM/PM" or "HH:MM:SS AM/PM"
    let match = cleaned.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (match) {
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[4].toUpperCase();
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    }
    
    // Format: "HH:MM" or "HH:MM:SS" (24-hour)
    match = cleaned.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
        }
    }
    
    return null;
}

/**
 * SMART date parser - handles multiple formats
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    const cleaned = String(dateStr).trim();
    if (!cleaned || cleaned === '-') return null;
    
    // Format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return cleaned;
    }
    
    // Format: MM/DD/YYYY or M/D/YYYY
    let match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        const month = String(match[1]).padStart(2, '0');
        const day = String(match[2]).padStart(2, '0');
        return `${match[3]}-${month}-${day}`;
    }
    
    // Format: DD/MM/YYYY
    match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match && parseInt(match[1]) > 12) { // Day > 12 means it's DD/MM
        const day = String(match[1]).padStart(2, '0');
        const month = String(match[2]).padStart(2, '0');
        return `${match[3]}-${month}-${day}`;
    }
    
    // Try JavaScript Date parsing
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        // Sanity check
        if (year >= 2000 && year <= 2100) {
            return `${year}-${month}-${day}`;
        }
    }
    
    return null;
}

/**
 * SMART hours parser
 */
function parseHours(hoursStr) {
    if (!hoursStr) return null;
    
    const cleaned = String(hoursStr).trim();
    if (!cleaned || cleaned === '-') return null;
    
    // Format: HH:MM
    const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        return parseFloat((hours + (minutes / 60)).toFixed(2));
    }
    
    // Already decimal
    const decimal = parseFloat(cleaned);
    if (!isNaN(decimal) && decimal >= 0 && decimal <= 24) {
        return parseFloat(decimal.toFixed(2));
    }
    
    return null;
}

/**
 * SMART period parser - extracts dates from any format
 */
function parsePeriod(str) {
    if (!str) return null;
    
    const cleaned = String(str).trim();
    
    // Find all dates in the string (YYYY-MM-DD format)
    const dates = cleaned.match(/\d{4}-\d{2}-\d{2}/g);
    if (dates && dates.length >= 2) {
        return { start: dates[0], end: dates[1] };
    }
    
    // Try to find dates in other formats
    const allMatches = cleaned.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/g);
    if (allMatches && allMatches.length >= 2) {
        const start = parseDate(allMatches[0]);
        const end = parseDate(allMatches[1]);
        if (start && end) {
            return { start, end };
        }
    }
    
    return null;
}

/**
 * SMART column detector - identifies what each column contains
 */
function detectColumns(headerRow) {
    const columns = {
        date: -1,
        clockIn: -1,
        clockOut: -1,
        workTime: -1,
        dailyTotal: -1,
        notes: -1
    };
    
    for (let i = 0; i < headerRow.length; i++) {
        const cell = String(headerRow[i] || '').toLowerCase().trim();
        
        if (cell.includes('date') && columns.date === -1) {
            columns.date = i;
        } else if ((cell.includes('in') || cell === 'in') && !cell.includes('out') && columns.clockIn === -1) {
            columns.clockIn = i;
        } else if ((cell.includes('out') || cell === 'out') && columns.clockOut === -1) {
            columns.clockOut = i;
        } else if ((cell.includes('work') && cell.includes('time')) || cell === 'work time') {
            columns.workTime = i;
        } else if ((cell.includes('daily') && cell.includes('total')) || cell.includes('total')) {
            columns.dailyTotal = i;
        } else if (cell.includes('note') || cell.includes('comment')) {
            columns.notes = i;
        }
    }
    
    return columns;
}

/**
 * SMART data row detector - identifies if a row contains actual data
 */
function isDataRow(row, columns) {
    if (!row || row.length === 0) return false;
    
    // Check if row has a date
    if (columns.date >= 0 && columns.date < row.length) {
        const date = parseDate(row[columns.date]);
        if (date) return true;
    }
    
    // Fallback: check any column for date
    for (let i = 0; i < Math.min(row.length, 5); i++) {
        if (parseDate(row[i])) return true;
    }
    
    return false;
}

/**
 * Find employee by name
 */
async function findEmployeeByName(name, client) {
    if (!name) return null;
    
    const nameLower = name.trim().toLowerCase();
    
    // Exact match
    let result = await client.query(
        `SELECT id, first_name, last_name FROM employees 
         WHERE LOWER(CONCAT(first_name, ' ', last_name)) = $1
         LIMIT 1`,
        [nameLower]
    );
    
    if (result.rows.length > 0) return result.rows[0].id;
    
    // Fuzzy match (contains)
    result = await client.query(
        `SELECT id, first_name, last_name FROM employees 
         WHERE LOWER(CONCAT(first_name, ' ', last_name)) LIKE $1
         LIMIT 1`,
        [`%${nameLower}%`]
    );
    
    if (result.rows.length > 0) return result.rows[0].id;
    
    // Try first name only
    result = await client.query(
        `SELECT id, first_name, last_name FROM employees 
         WHERE LOWER(first_name) = $1
         LIMIT 1`,
        [nameLower.split(' ')[0]]
    );
    
    if (result.rows.length > 0) return result.rows[0].id;
    
    return null;
}

/**
 * SMART Excel parser - auto-detects everything
 */
function parseTimecardData(data, summary, manualPeriodStart, manualPeriodEnd) {
    const timecards = [];
    
    summary.addDebugLog(`🔍 Smart parsing ${data.length} rows...`);
    
    let currentEmployee = null;
    let currentPeriod = manualPeriodStart && manualPeriodEnd 
        ? { start: manualPeriodStart, end: manualPeriodEnd }
        : null;
    let currentEntries = [];
    let detectedColumns = null;
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        // Convert all cells to strings for analysis
        const rowStr = row.map(c => String(c || '').trim());
        const firstCell = rowStr[0].toLowerCase();
        const secondCell = rowStr[1];
        
        // 1. Detect Pay Period
        if (firstCell.includes('pay') && firstCell.includes('period')) {
            // Save previous employee
            if (currentEmployee && currentEntries.length > 0) {
                timecards.push({
                    employee_name: currentEmployee,
                    pay_period_start: currentPeriod?.start,
                    pay_period_end: currentPeriod?.end,
                    entries: [...currentEntries]
                });
                summary.addDebugLog(`✅ Saved ${currentEntries.length} entries for ${currentEmployee}`);
                currentEntries = [];
            }
            
            // Parse period from anywhere in the row
            if (!currentPeriod) {
                const rowText = rowStr.join(' ');
                currentPeriod = parsePeriod(rowText);
                if (currentPeriod) {
                    summary.addDebugLog(`📅 Detected period: ${currentPeriod.start} to ${currentPeriod.end}`);
                }
            }
            continue;
        }
        
        // 2. Detect Employee name
        if (firstCell === 'employee' || firstCell.includes('employee')) {
            // Save previous employee
            if (currentEmployee && currentEntries.length > 0) {
                timecards.push({
                    employee_name: currentEmployee,
                    pay_period_start: currentPeriod?.start,
                    pay_period_end: currentPeriod?.end,
                    entries: [...currentEntries]
                });
                summary.addDebugLog(`✅ Saved ${currentEntries.length} entries for ${currentEmployee}`);
                currentEntries = [];
            }
            
            currentEmployee = secondCell || rowStr[2]; // Name might be in column B or C
            summary.addDebugLog(`👤 Detected employee: ${currentEmployee}`);
            detectedColumns = null; // Reset columns for new employee
            continue;
        }
        
        // 3. Detect column headers
        if (!detectedColumns && rowStr.some(cell => {
            const lower = cell.toLowerCase();
            return lower.includes('date') || lower === 'in' || lower === 'out';
        })) {
            detectedColumns = detectColumns(rowStr);
            summary.addDebugLog(`📊 Detected columns: date=${detectedColumns.date}, in=${detectedColumns.clockIn}, out=${detectedColumns.clockOut}, total=${detectedColumns.dailyTotal}`);
            continue;
        }
        
        // 4. Detect Total Hours (end of employee section)
        if (firstCell.includes('total') && firstCell.includes('hour')) {
            if (currentEmployee && currentEntries.length > 0) {
                timecards.push({
                    employee_name: currentEmployee,
                    pay_period_start: currentPeriod?.start,
                    pay_period_end: currentPeriod?.end,
                    entries: [...currentEntries]
                });
                summary.addDebugLog(`✅ Saved ${currentEntries.length} entries for ${currentEmployee}`);
            }
            currentEmployee = null;
            currentEntries = [];
            detectedColumns = null;
            continue;
        }
        
        // 5. Parse data row
        if (currentEmployee && isDataRow(row, detectedColumns || {})) {
            // Use detected columns or fallback to common positions
            const dateIdx = detectedColumns?.date >= 0 ? detectedColumns.date : 1;
            const inIdx = detectedColumns?.clockIn >= 0 ? detectedColumns.clockIn : 2;
            const outIdx = detectedColumns?.clockOut >= 0 ? detectedColumns.clockOut : 3;
            const totalIdx = detectedColumns?.dailyTotal >= 0 ? detectedColumns.dailyTotal : 5;
            const noteIdx = detectedColumns?.notes >= 0 ? detectedColumns.notes : 6;
            
            const date = parseDate(row[dateIdx]);
            
            if (date) {
                const clockIn = parseTime(row[inIdx]);
                const clockOut = parseTime(row[outIdx]);
                const dailyTotal = parseHours(row[totalIdx]);
                const note = cleanCellValue(row[noteIdx]);
                
                currentEntries.push({
                    work_date: date,
                    clock_in: clockIn,
                    clock_out: clockOut,
                    hours_worked: dailyTotal,
                    notes: note
                });
            }
        }
    }
    
    // Save last employee
    if (currentEmployee && currentEntries.length > 0) {
        timecards.push({
            employee_name: currentEmployee,
            pay_period_start: currentPeriod?.start,
            pay_period_end: currentPeriod?.end,
            entries: [...currentEntries]
        });
        summary.addDebugLog(`✅ Saved ${currentEntries.length} entries for ${currentEmployee}`);
    }
    
    summary.addDebugLog(`🎉 Parsed ${timecards.length} timecards with ${timecards.reduce((sum, tc) => sum + tc.entries.length, 0)} total entries`);
    
    return timecards;
}

/**
 * Main import function
 */
export async function importTimecardsFromExcel(fileBuffer, filename, sheetName = null, manualPeriodStart = null, manualPeriodEnd = null) {
    const summary = new ImportSummary(filename, sheetName || 'default');
    
    try {
        // Load Excel
        const workbook = loadExcelWorkbook(fileBuffer);
        const actualSheetName = sheetName || workbook.SheetNames[0];
        summary.sheet = actualSheetName;
        
        summary.addDebugLog(`📂 Loading sheet: ${actualSheetName}`);
        
        const data = getWorksheetData(workbook, actualSheetName);
        summary.addDebugLog(`📊 Loaded ${data.length} rows`);
        
        // Parse with smart detection
        const timecards = parseTimecardData(data, summary, manualPeriodStart, manualPeriodEnd);
        
        if (timecards.length === 0) {
            throw new Error('No timecard data found. Please ensure the file contains employee names, dates, and time entries.');
        }
        
        // Import to database
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            for (const timecard of timecards) {
                try {
                    if (!timecard.pay_period_start || !timecard.pay_period_end) {
                        summary.addError(timecard.employee_name, 0, 'Missing pay period - please specify dates in upload form');
                        continue;
                    }
                    
                    if (!timecard.employee_name) {
                        summary.addError('Unknown', 0, 'Employee name missing');
                        continue;
                    }
                    
                    // Find employee
                    const employeeId = await findEmployeeByName(timecard.employee_name, client);
                    
                    if (!employeeId) {
                        summary.addError(timecard.employee_name, 0, 'Employee not found in database');
                        continue;
                    }
                    
                    // Check existing
                    const existingResult = await client.query(
                        `SELECT id FROM timecards 
                         WHERE employee_id = $1 
                           AND pay_period_start = $2 
                           AND pay_period_end = $3`,
                        [employeeId, timecard.pay_period_start, timecard.pay_period_end]
                    );
                    
                    let timecardId;
                    const totalHours = timecard.entries.reduce((sum, e) => sum + (parseFloat(e.hours_worked) || 0), 0);
                    
                    if (existingResult.rows.length > 0) {
                        timecardId = existingResult.rows[0].id;
                        await client.query(
                            `UPDATE timecards SET total_hours = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                            [totalHours, timecardId]
                        );
                        await client.query(`DELETE FROM timecard_entries WHERE timecard_id = $1`, [timecardId]);
                        summary.timecards_updated++;
                    } else {
                        const result = await client.query(
                            `INSERT INTO timecards (employee_id, pay_period_start, pay_period_end, total_hours, status)
                             VALUES ($1, $2, $3, $4, 'Draft') RETURNING id`,
                            [employeeId, timecard.pay_period_start, timecard.pay_period_end, totalHours]
                        );
                        timecardId = result.rows[0].id;
                        summary.timecards_created++;
                    }
                    
                    // Insert entries
                    for (const entry of timecard.entries) {
                        if (!entry.work_date) continue;
                        
                        await client.query(
                            `INSERT INTO timecard_entries 
                             (timecard_id, employee_id, work_date, clock_in, clock_out, hours_worked, notes)
                             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                            [timecardId, employeeId, entry.work_date, entry.clock_in, entry.clock_out, entry.hours_worked || 0, entry.notes]
                        );
                        
                        summary.entries_inserted++;
                    }
                    
                } catch (error) {
                    summary.addError(timecard.employee_name || 'Unknown', 0, error.message);
                    console.error('Error processing timecard:', error);
                }
            }
            
            await client.query('COMMIT');
            summary.addDebugLog('✅ Database import completed');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        summary.addError('SYSTEM', 0, error.message);
        console.error('Import failed:', error);
        throw error;
    }
    
    return summary;
}
