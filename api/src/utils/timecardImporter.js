/**
 * Timecard Import Service
 * 
 * Imports timecard data from Excel files with the format:
 * - Pay Period header row
 * - Employee name row
 * - Column headers: Employee, Date, IN, OUT, Work Time, Daily Total, Note
 * - Multiple clock-in/out pairs per day
 * - Repeating for each employee
 */

import { q, pool } from '../db.js';
import {
    loadExcelWorkbook,
    getWorksheetData,
    cleanCellValue
} from './excelParser.js';

/**
 * Import summary structure
 */
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
 * Parse time from various formats (08:45 AM, 02:46 PM, etc.)
 */
function parseTime(timeStr) {
    if (!timeStr) return null;
    
    const cleaned = String(timeStr).trim().toUpperCase();
    if (!cleaned || cleaned === '-' || cleaned === '') return null;
    
    // Check for AM/PM format
    const ampmMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (ampmMatch) {
        let hours = parseInt(ampmMatch[1]);
        const minutes = parseInt(ampmMatch[2]);
        const period = ampmMatch[3].toUpperCase();
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    }
    
    // Check for 24-hour format
    const timeMatch = cleaned.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    return null;
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    const cleaned = String(dateStr).trim();
    if (!cleaned) return null;
    
    // Try parsing as YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return cleaned;
    }
    
    // Try parsing as MM/DD/YYYY or M/D/YYYY
    const dateMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dateMatch) {
        const month = String(dateMatch[1]).padStart(2, '0');
        const day = String(dateMatch[2]).padStart(2, '0');
        const year = dateMatch[3];
        return `${year}-${month}-${day}`;
    }
    
    // Try parsing as Excel date
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    return null;
}

/**
 * Parse hours from format like "08:01" (8 hours 1 minute) to decimal hours
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
        return hours + (minutes / 60);
    }
    
    // Already a decimal number
    const decimal = parseFloat(cleaned);
    if (!isNaN(decimal)) return decimal;
    
    return null;
}

/**
 * Parse pay period from header like "2025-09-08-2025-09-21" or "September 8 - September 21, 2025"
 */
function parsePeriodFromString(periodStr, manualStart = null, manualEnd = null) {
    if (manualStart && manualEnd) {
        return { start: manualStart, end: manualEnd };
    }
    
    if (!periodStr) return null;
    
    const cleaned = String(periodStr).trim();
    
    // Format: YYYY-MM-DD-YYYY-MM-DD or YYYY-MM-DD - YYYY-MM-DD
    const isoMatch = cleaned.match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) {
        return { start: isoMatch[1], end: isoMatch[2] };
    }
    
    // Format: "September 8 - September 21, 2025"
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                        'july', 'august', 'september', 'october', 'november', 'december'];
    
    const yearMatch = cleaned.match(/\b(20\d{2})\b/);
    if (yearMatch) {
        const year = yearMatch[1];
        
        // Look for month names and day numbers
        const months = [];
        const days = [];
        
        for (let i = 0; i < monthNames.length; i++) {
            const regex = new RegExp(`\\b${monthNames[i]}\\b`, 'i');
            const match = cleaned.match(regex);
            if (match) {
                months.push(i + 1);
            }
        }
        
        const dayMatches = cleaned.match(/\b(\d{1,2})\b/g);
        if (dayMatches) {
            dayMatches.forEach(d => {
                const day = parseInt(d);
                if (day >= 1 && day <= 31) {
                    days.push(day);
                }
            });
        }
        
        if (months.length >= 1 && days.length >= 2) {
            const startMonth = String(months[0]).padStart(2, '0');
            const endMonth = String(months.length > 1 ? months[1] : months[0]).padStart(2, '0');
            const startDay = String(days[0]).padStart(2, '0');
            const endDay = String(days[1]).padStart(2, '0');
            
            return {
                start: `${year}-${startMonth}-${startDay}`,
                end: `${year}-${endMonth}-${endDay}`
            };
        }
    }
    
    return null;
}

/**
 * Find employee by name (flexible matching)
 */
async function findEmployeeByName(name, client) {
    if (!name) return null;
    
    const nameLower = name.trim().toLowerCase();
    
    // Try exact match on full name
    let result = await client.query(
        `SELECT id FROM employees 
         WHERE LOWER(CONCAT(first_name, ' ', last_name)) = $1
         LIMIT 1`,
        [nameLower]
    );
    
    if (result.rows.length > 0) return result.rows[0].id;
    
    // Try fuzzy match
    result = await client.query(
        `SELECT id FROM employees 
         WHERE LOWER(CONCAT(first_name, ' ', last_name)) LIKE $1
         LIMIT 1`,
        [`%${nameLower}%`]
    );
    
    if (result.rows.length > 0) return result.rows[0].id;
    
    return null;
}

/**
 * Parse timecard data from Excel sheet
 */
function parseTimecardData(data, summary) {
    const timecards = [];
    let i = 0;
    
    summary.addDebugLog(`Parsing sheet with ${data.length} rows`);
    
    while (i < data.length) {
        const row = data[i];
        
        // Look for "Pay Period" header
        if (row && row[0]) {
            const cellValue = String(row[0]).trim();
            
            if (cellValue.toLowerCase().includes('pay period')) {
                // Found a pay period section
                const periodValue = row[1] || cellValue;
                const period = parsePeriodFromString(String(periodValue), summary.pay_period_start, summary.pay_period_end);
                
                if (period) {
                    summary.addDebugLog(`Found pay period: ${period.start} to ${period.end} at row ${i + 1}`);
                    
                    // Next row should have employee name
                    i++;
                    if (i >= data.length) break;
                    
                    const employeeRow = data[i];
                    if (employeeRow && employeeRow[0] && String(employeeRow[0]).trim().toLowerCase() === 'employee') {
                        const employeeName = cleanCellValue(employeeRow[1]);
                        
                        summary.addDebugLog(`Found employee: ${employeeName}`);
                        
                        // Next row should have headers (Date, IN, OUT, etc.)
                        i++;
                        if (i >= data.length) break;
                        
                        // Skip header row
                        i++;
                        
                        // Now parse entries until we hit empty row or next section
                        const entries = [];
                        let totalHours = 0;
                        
                        while (i < data.length) {
                            const entryRow = data[i];
                            
                            // Check if this is end of section
                            if (!entryRow || !entryRow[1]) { // No date
                                // Check if it's a "Total Hours" row
                                if (entryRow && entryRow[0] && String(entryRow[0]).toLowerCase().includes('total hours')) {
                                    totalHours = parseHours(entryRow[5]) || 0;
                                    summary.addDebugLog(`Total hours: ${totalHours}`);
                                }
                                i++;
                                break;
                            }
                            
                            // Check if this is a new section
                            const firstCell = String(entryRow[0] || '').trim().toLowerCase();
                            if (firstCell.includes('pay period')) {
                                break; // Start of new section
                            }
                            
                            // Parse entry
                            const dayOfWeek = cleanCellValue(entryRow[0]);
                            const date = parseDate(entryRow[1]);
                            const clockIn = parseTime(entryRow[2]);
                            const clockOut = parseTime(entryRow[3]);
                            const workTime = cleanCellValue(entryRow[4]);
                            const dailyTotal = parseHours(entryRow[5]);
                            const note = cleanCellValue(entryRow[6]);
                            
                            // Only add if we have a date
                            if (date) {
                                entries.push({
                                    work_date: date,
                                    clock_in: clockIn,
                                    clock_out: clockOut,
                                    hours_worked: dailyTotal,
                                    notes: note
                                });
                            }
                            
                            i++;
                        }
                        
                        if (employeeName && entries.length > 0) {
                            timecards.push({
                                employee_name: employeeName,
                                pay_period_start: period.start,
                                pay_period_end: period.end,
                                total_hours: totalHours,
                                entries: entries
                            });
                            
                            summary.addDebugLog(`Parsed ${entries.length} entries for ${employeeName}`);
                        }
                        
                        continue;
                    }
                }
            }
        }
        
        i++;
    }
    
    summary.addDebugLog(`Parsed ${timecards.length} timecards total`);
    return timecards;
}

/**
 * Main import function
 */
export async function importTimecardsFromExcel(fileBuffer, filename, sheetName = null, manualPeriodStart = null, manualPeriodEnd = null) {
    const summary = new ImportSummary(filename, sheetName || 'default');
    
    if (manualPeriodStart) summary.pay_period_start = manualPeriodStart;
    if (manualPeriodEnd) summary.pay_period_end = manualPeriodEnd;
    
    try {
        // Load Excel workbook
        const workbook = loadExcelWorkbook(fileBuffer);
        const actualSheetName = sheetName || workbook.SheetNames[0];
        summary.sheet = actualSheetName;
        
        summary.addDebugLog(`Loading sheet: ${actualSheetName}`);
        
        // Get worksheet data
        const data = getWorksheetData(workbook, actualSheetName);
        summary.addDebugLog(`Loaded ${data.length} rows from Excel`);
        
        // Parse timecard data
        const timecards = parseTimecardData(data, summary);
        
        if (timecards.length === 0) {
            throw new Error('No timecard data found in Excel file');
        }
        
        // Import to database
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            for (const timecard of timecards) {
                try {
                    // Find employee
                    const employeeId = await findEmployeeByName(timecard.employee_name, client);
                    
                    if (!employeeId) {
                        summary.addError(timecard.employee_name, 0, 'Employee not found in database');
                        continue;
                    }
                    
                    // Check if timecard exists
                    const existingResult = await client.query(
                        `SELECT id FROM timecards 
                         WHERE employee_id = $1 
                           AND pay_period_start = $2 
                           AND pay_period_end = $3`,
                        [employeeId, timecard.pay_period_start, timecard.pay_period_end]
                    );
                    
                    let timecardId;
                    
                    if (existingResult.rows.length > 0) {
                        // Update existing timecard
                        timecardId = existingResult.rows[0].id;
                        
                        await client.query(
                            `UPDATE timecards 
                             SET total_hours = $1, updated_at = CURRENT_TIMESTAMP
                             WHERE id = $2`,
                            [timecard.total_hours, timecardId]
                        );
                        
                        // Delete existing entries
                        await client.query(
                            `DELETE FROM timecard_entries WHERE timecard_id = $1`,
                            [timecardId]
                        );
                        
                        summary.timecards_updated++;
                    } else {
                        // Create new timecard
                        const result = await client.query(
                            `INSERT INTO timecards 
                             (employee_id, pay_period_start, pay_period_end, total_hours, status)
                             VALUES ($1, $2, $3, $4, 'Draft')
                             RETURNING id`,
                            [employeeId, timecard.pay_period_start, timecard.pay_period_end, timecard.total_hours]
                        );
                        
                        timecardId = result.rows[0].id;
                        summary.timecards_created++;
                    }
                    
                    // Insert entries
                    for (const entry of timecard.entries) {
                        await client.query(
                            `INSERT INTO timecard_entries 
                             (timecard_id, employee_id, work_date, clock_in, clock_out, hours_worked, notes)
                             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                            [timecardId, employeeId, entry.work_date, entry.clock_in, entry.clock_out, entry.hours_worked, entry.notes]
                        );
                        
                        summary.entries_inserted++;
                    }
                    
                } catch (error) {
                    summary.addError(timecard.employee_name, 0, error.message);
                }
            }
            
            await client.query('COMMIT');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
        summary.addDebugLog('Import completed successfully');
        
    } catch (error) {
        summary.addError('SYSTEM', 0, error.message);
        throw error;
    }
    
    return summary;
}

