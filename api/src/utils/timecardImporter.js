/**
 * TRULY SMART Timecard Import Service
 * 
 * Zero assumptions about column positions - scans entire rows to find data
 */

import { q, pool } from '../db.js';
import { loadExcelWorkbook, getWorksheetData, cleanCellValue } from './excelParser.js';

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
        this.employees_created = 0;
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

// SMART parsers
function parseTime(timeStr) {
    if (!timeStr) return null;
    const cleaned = String(timeStr).trim().toUpperCase();
    if (!cleaned || cleaned === '-' || cleaned === '(EMPTY)') return null;
    
    const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3].toUpperCase();
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    }
    return null;
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const cleaned = String(dateStr).trim();
    if (!cleaned || cleaned === '-' || cleaned === '(empty)') return null;
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
    
    const date = new Date(cleaned);
    if (!isNaN(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return null;
}

function parseHours(hoursStr) {
    if (!hoursStr) return null;
    const cleaned = String(hoursStr).trim();
    if (!cleaned || cleaned === '-' || cleaned === '(empty)') return null;
    
    const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
        return parseFloat((parseInt(match[1]) + parseInt(match[2]) / 60).toFixed(2));
    }
    
    const decimal = parseFloat(cleaned);
    if (!isNaN(decimal) && decimal >= 0 && decimal <= 24) {
        return parseFloat(decimal.toFixed(2));
    }
    return null;
}

function parsePeriod(str) {
    if (!str) return null;
    const cleaned = String(str).trim();
    const dates = cleaned.match(/\d{4}-\d{2}-\d{2}/g);
    if (dates && dates.length >= 2) {
        return { start: dates[0], end: dates[1] };
    }
    return null;
}

async function findOrCreateEmployee(name, client, summary) {
    if (!name) return null;
    
    const nameLower = name.trim().toLowerCase();
    
    // Try exact match (check full name and all 3 nickname columns)
    let result = await client.query(
        `SELECT id FROM employees 
         WHERE LOWER(CONCAT(first_name, ' ', last_name)) = $1 
            OR normalize_nickname(nickname) = $1
            OR normalize_nickname(nickname_2) = $1
            OR normalize_nickname(nickname_3) = $1
         LIMIT 1`,
        [nameLower]
    );
    if (result.rows.length > 0) return result.rows[0].id;
    
    // Try fuzzy match (check full name and all 3 nickname columns)
    result = await client.query(
        `SELECT id FROM employees 
         WHERE LOWER(CONCAT(first_name, ' ', last_name)) LIKE $1 
            OR (nickname IS NOT NULL AND LOWER(TRIM(nickname)) LIKE $1)
            OR (nickname_2 IS NOT NULL AND LOWER(TRIM(nickname_2)) LIKE $1)
            OR (nickname_3 IS NOT NULL AND LOWER(TRIM(nickname_3)) LIKE $1)
         LIMIT 1`,
        [`%${nameLower}%`]
    );
    if (result.rows.length > 0) return result.rows[0].id;
    
    // Employee not found - DO NOT AUTO-CREATE
    // Employees must be added manually through the UI first
    summary.addError(name, 0, `Employee "${name}" not found in database. Add employee manually first.`);
    summary.employees_skipped++;
    
    return null; // Return null instead of creating
}

/**
 * TRULY SMART parser - finds data anywhere in the row
 */
function parseTimecardData(data, summary, manualPeriodStart, manualPeriodEnd) {
    const timecards = [];
    
    summary.addDebugLog(`🧠 SMART parsing ${data.length} rows (zero assumptions mode)`);
    summary.addDebugLog(`📋 First 20 rows:`);
    for (let i = 0; i < Math.min(20, data.length); i++) {
        const row = data[i] || [];
        const preview = row.slice(0, 7).map(c => {
            const s = String(c || '').substring(0, 15);
            return s || '·';
        }).join(' │ ');
        summary.addDebugLog(`  ${String(i + 1).padStart(2)}: ${preview}`);
    }
    
    let currentEmployee = null;
    let currentPeriod = manualPeriodStart && manualPeriodEnd 
        ? { start: manualPeriodStart, end: manualPeriodEnd }
        : null;
    let currentEntries = [];
    let headerCols = null;
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        // Search ENTIRE row for keywords
        let hasPayPeriod = false;
        let hasEmployee = false;
        let hasHeaders = false;
        let hasTotalHours = false;
        
        for (let col = 0; col < row.length; col++) {
            const cell = String(row[col] || '').toLowerCase().trim();
            
            if (cell.includes('pay') && cell.includes('period')) {
                hasPayPeriod = true;
                // Find dates ANYWHERE in this row
                if (!currentPeriod) {
                    for (let c = 0; c < row.length; c++) {
                        const parsed = parsePeriod(row[c]);
                        if (parsed) {
                            currentPeriod = parsed;
                            summary.addDebugLog(`✅ Row ${i+1}: Found period ${parsed.start} to ${parsed.end} in column ${String.fromCharCode(65+c)}`);
                            break;
                        }
                    }
                }
            }
            
            if (cell === 'employee') {
                hasEmployee = true;
                // Find name ANYWHERE in this row (skip the 'Employee' cell itself)
                for (let c = col + 1; c < row.length; c++) {
                    const name = String(row[c] || '').trim();
                    if (name && name !== '(empty)') {
                        currentEmployee = name.replace(/\(\d+\)/g, '').trim();
                        summary.addDebugLog(`✅ Row ${i+1}: Found employee "${currentEmployee}" in column ${String.fromCharCode(65+c)}`);
                        break;
                    }
                }
            }
            
            if ((cell === 'date' || cell === 'in' || cell === 'out') && !hasHeaders) {
                hasHeaders = true;
                // Map column positions
                headerCols = {};
                for (let c = 0; c < row.length; c++) {
                    const h = String(row[c] || '').toLowerCase().trim();
                    if (h === 'date') headerCols.date = c;
                    if (h === 'in') headerCols.in = c;
                    if (h === 'out') headerCols.out = c;
                    if (h.includes('daily') && h.includes('total')) headerCols.dailyTotal = c;
                    if (h === 'note' || h === 'notes') headerCols.note = c;
                }
                summary.addDebugLog(`✅ Row ${i+1}: Headers detected - Date:${headerCols.date}, IN:${headerCols.in}, OUT:${headerCols.out}, Total:${headerCols.dailyTotal}`);
            }
            
            if (cell.includes('total') && cell.includes('hour')) {
                hasTotalHours = true;
            }
        }
        
        // Handle special rows
        if (hasPayPeriod || hasEmployee || hasHeaders) continue;
        
        if (hasTotalHours) {
            if (currentEmployee && currentEntries.length > 0) {
                timecards.push({
                    employee_name: currentEmployee,
                    pay_period_start: currentPeriod?.start,
                    pay_period_end: currentPeriod?.end,
                    entries: [...currentEntries]
                });
                summary.addDebugLog(`💾 Saved ${currentEntries.length} entries for ${currentEmployee}`);
            }
            currentEmployee = null;
            currentEntries = [];
            headerCols = null;
            continue;
        }
        
        // Parse DATA row
        if (currentEmployee && headerCols) {
            // Find date in the row (usually in detected date column, or scan for it)
            let date = null;
            if (headerCols.date !== undefined) {
                date = parseDate(row[headerCols.date]);
            }
            // If not found in expected column, scan for it
            if (!date) {
                for (let c = 0; c < Math.min(row.length, 5); c++) {
                    date = parseDate(row[c]);
                    if (date) break;
                }
            }
            
            if (date) {
                const clockIn = parseTime(row[headerCols.in]);
                const clockOut = parseTime(row[headerCols.out]);
                const dailyTotal = parseHours(row[headerCols.dailyTotal]);
                const note = cleanCellValue(row[headerCols.note]);
                
                if (clockIn || clockOut || dailyTotal || note) {
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
    }
    
    // Save last employee
    if (currentEmployee && currentEntries.length > 0) {
        timecards.push({
            employee_name: currentEmployee,
            pay_period_start: currentPeriod?.start,
            pay_period_end: currentPeriod?.end,
            entries: [...currentEntries]
        });
        summary.addDebugLog(`💾 Saved ${currentEntries.length} entries for ${currentEmployee}`);
    }
    
    summary.addDebugLog(`🎉 Parsed ${timecards.length} timecards with ${timecards.reduce((s, t) => s + t.entries.length, 0)} total entries`);
    return timecards;
}

/**
 * Main import function
 */
export async function importTimecardsFromExcel(fileBuffer, filename, sheetName = null, manualPeriodStart = null, manualPeriodEnd = null) {
    const summary = new ImportSummary(filename, sheetName || 'default');
    
    try {
        const workbook = await loadExcelWorkbook(fileBuffer);
        const actualSheetName = sheetName || workbook.SheetNames[0];
        summary.sheet = actualSheetName;
        
        summary.addDebugLog(`📂 Sheet: ${actualSheetName}`);
        
        const data = getWorksheetData(workbook, actualSheetName);
        summary.addDebugLog(`📊 Total rows: ${data.length}`);
        
        const timecards = parseTimecardData(data, summary, manualPeriodStart, manualPeriodEnd);
        
        if (timecards.length === 0) {
            throw new Error('No timecard data found. Please check the file format.');
        }
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            for (const timecard of timecards) {
                try {
                    if (!timecard.pay_period_start || !timecard.pay_period_end) {
                        summary.addError(timecard.employee_name, 0, 'Missing pay period');
                        continue;
                    }
                    
                    const employeeId = await findOrCreateEmployee(timecard.employee_name, client, summary);
                    if (!employeeId) {
                        summary.addError(timecard.employee_name, 0, 'Could not find or create employee');
                        continue;
                    }
                    
                    const existingResult = await client.query(
                        `SELECT id FROM timecards WHERE employee_id = $1 AND pay_period_start = $2 AND pay_period_end = $3`,
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
                    
                    // Delete old time_entries for this employee/period to avoid conflicts (old table has unique constraint)
                    await client.query(
                        `DELETE FROM time_entries 
                         WHERE employee_id = $1 
                         AND work_date >= $2 
                         AND work_date <= $3`,
                        [employeeId, timecard.pay_period_start, timecard.pay_period_end]
                    );
                    
                    for (const entry of timecard.entries) {
                        if (!entry.work_date) continue;
                        
                        // Insert into new timecard_entries table
                        await client.query(
                            `INSERT INTO timecard_entries (timecard_id, employee_id, work_date, clock_in, clock_out, hours_worked, notes)
                             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                            [timecardId, employeeId, entry.work_date, entry.clock_in, entry.clock_out, entry.hours_worked || 0, entry.notes]
                        );
                        
                        // ALSO insert into old time_entries table for backward compatibility
                        // Note: old table has unique constraint on (employee_id, work_date), so only first entry per day goes here
                        const overtimeHours = Math.max(0, (entry.hours_worked || 0) - 8);
                        await client.query(
                            `INSERT INTO time_entries (employee_id, work_date, clock_in, clock_out, hours_worked, overtime_hours, notes)
                             VALUES ($1, $2, $3, $4, $5, $6, $7)
                             ON CONFLICT (employee_id, work_date) DO UPDATE SET
                               clock_in = EXCLUDED.clock_in,
                               clock_out = EXCLUDED.clock_out,
                               hours_worked = time_entries.hours_worked + EXCLUDED.hours_worked,
                               overtime_hours = time_entries.overtime_hours + EXCLUDED.overtime_hours`,
                            [employeeId, entry.work_date, entry.clock_in, entry.clock_out, entry.hours_worked || 0, overtimeHours, entry.notes]
                        );
                        
                        summary.entries_inserted++;
                    }
                } catch (error) {
                    summary.addError(timecard.employee_name || 'Unknown', 0, error.message);
                }
            }
            
            await client.query('COMMIT');
            summary.addDebugLog('✅ Import successful');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        summary.addError('SYSTEM', 0, error.message);
        throw error;
    }
    
    return summary;
}
