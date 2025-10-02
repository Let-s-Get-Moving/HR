import XLSX from 'xlsx';
import { pool } from '../db.js';

/**
 * Parse Excel file and save for display viewing
 * Preserves exact structure from Excel including multiple punches per day
 */

// Load Excel workbook
function loadExcelWorkbook(fileBuffer) {
    return XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
}

// Get worksheet data as 2D array
function getWorksheetData(workbook, sheetName) {
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
}

// Parse filename to get pay period dates
function parsePeriodFromFilename(filename) {
    // Examples: "September 08- September 21,2025" or "August 25, 2025 September 7, 2025"
    const patterns = [
        /(\w+)\s+(\d+)[-,]\s*(\w+)\s+(\d+),?\s*(\d{4})/i,  // "September 08- September 21,2025"
        /(\w+)\s+(\d+),\s*(\d{4})\s+(\w+)\s+(\d+),\s*(\d{4})/i  // "August 25, 2025 September 7, 2025"
    ];
    
    for (const pattern of patterns) {
        const match = filename.match(pattern);
        if (match) {
            let startMonth, startDay, endMonth, endDay, year;
            
            if (match.length === 6) {
                // First pattern
                [, startMonth, startDay, endMonth, endDay, year] = match;
            } else if (match.length === 7) {
                // Second pattern
                [, startMonth, startDay, , endMonth, endDay, year] = match;
            }
            
            const monthMap = {
                january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
                july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
            };
            
            const startMonthNum = monthMap[startMonth.toLowerCase()];
            const endMonthNum = monthMap[endMonth.toLowerCase()];
            
            if (startMonthNum && endMonthNum) {
                const start = `${year}-${String(startMonthNum).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
                const end = `${year}-${String(endMonthNum).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
                return { start, end };
            }
        }
    }
    
    return null;
}

// Parse pay period from Excel data
function findPayPeriod(data) {
    for (let i = 0; i < Math.min(20, data.length); i++) {
        const row = data[i];
        for (let col = 0; col < row.length; col++) {
            const cell = String(row[col] || '').trim();
            if (cell.toLowerCase().includes('pay period')) {
                // Next cell should have the dates
                for (let c = col + 1; c < row.length; c++) {
                    const dateCell = String(row[c] || '').trim();
                    const match = dateCell.match(/(\d{4})-(\d{2})-(\d{2})-(\d{4})-(\d{2})-(\d{2})/);
                    if (match) {
                        return {
                            start: `${match[1]}-${match[2]}-${match[3]}`,
                            end: `${match[4]}-${match[5]}-${match[6]}`
                        };
                    }
                }
            }
        }
    }
    return null;
}

// Find ALL employees in the entire sheet (2-pass system)
function findAllEmployees(data) {
    const employees = [];
    
    console.log(`📋 Scanning entire sheet for employees (${data.length} rows)...`);
    
    // Debug: Show first 20 rows to understand structure
    console.log('🔍 DEBUG: First 20 rows of Excel:');
    for (let i = 0; i < Math.min(20, data.length); i++) {
        const row = data[i];
        const rowPreview = row.slice(0, 10).map(cell => {
            const str = String(cell || '').trim();
            return str.length > 20 ? str.substring(0, 20) + '...' : str;
        });
        console.log(`   Row ${i}: [${rowPreview.join(' | ')}]`);
    }
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        for (let col = 0; col < row.length; col++) {
            const cell = String(row[col] || '').trim().toLowerCase();
            
            // Look for "Employee" or "Employee:" in any cell (more flexible matching)
            if (cell === 'employee' || 
                cell === 'employee:' || 
                cell.startsWith('employee:') ||
                cell === 'employee name' ||
                (cell.includes('employee') && cell.length < 20)) {
                
                console.log(`   🔍 Found "${row[col]}" at row ${i}, col ${col}`);
                
                // Next cell should have the name
                for (let c = col + 1; c < row.length; c++) {
                    let name = String(row[c] || '').trim();
                    if (name && name !== '(empty)' && name.toLowerCase() !== 'employee') {
                        // Remove numbers in parentheses like "(1)" and clean up
                        name = name.replace(/\(\d+\)/g, '').trim();
                        
                        // Avoid duplicates (sometimes "Employee" appears multiple times)
                        const isDuplicate = employees.some(e => 
                            e.name.toLowerCase() === name.toLowerCase() && 
                            Math.abs(e.headerRow - i) < 5
                        );
                        
                        if (!isDuplicate && name.length > 0) {
                            employees.push({ name, headerRow: i });
                            console.log(`   ✓ Found employee #${employees.length}: "${name}" at row ${i}`);
                        }
                        break;
                    }
                }
                break; // Found "Employee" in this row, move to next row
            }
        }
    }
    
    console.log(`📊 Total employees found: ${employees.length}`);
    return employees;
}

// Parse time entries for one employee
function parseEmployeeTimecard(data, employeeInfo, payPeriod) {
    const entries = [];
    let currentDate = null;
    let currentDay = null;
    let rowOrder = 0;
    let dailyTotal = null;
    
    // Find header row with Date, IN, OUT, etc.
    let headerRow = employeeInfo.headerRow + 1;
    let dateCol = -1, inCol = -1, outCol = -1, workTimeCol = -1, dailyTotalCol = -1, noteCol = -1;
    
    for (let i = headerRow; i < Math.min(headerRow + 5, data.length); i++) {
        const row = data[i];
        for (let col = 0; col < row.length; col++) {
            const cell = String(row[col] || '').trim().toLowerCase();
            if (cell === 'date') dateCol = col;
            if (cell === 'in') inCol = col;
            if (cell === 'out') outCol = col;
            if (cell.includes('work time')) workTimeCol = col;
            if (cell.includes('daily total')) dailyTotalCol = col;
            if (cell.includes('note')) noteCol = col;
        }
        if (dateCol >= 0 && inCol >= 0) {
            headerRow = i + 1;
            break;
        }
    }
    
    // Parse entries
    for (let i = headerRow; i < data.length; i++) {
        const row = data[i];
        
        // Check if we hit next employee or total hours
        const firstCell = String(row[0] || '').trim().toLowerCase();
        if (firstCell === 'employee' || firstCell.includes('total hours')) {
            break;
        }
        
        // Check for day of week in first column
        const dayOfWeek = String(row[0] || '').trim().toUpperCase();
        const isDayRow = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].includes(dayOfWeek);
        
        if (isDayRow && dateCol >= 0 && row[dateCol]) {
            // New day - validate the date is actually a date
            const dateStr = String(row[dateCol]).trim();
            
            // Skip if date looks invalid (e.g., "MON", empty, etc.)
            if (!dateStr || dateStr.length < 8 || ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].includes(dateStr.toUpperCase())) {
                continue; // Skip rows without valid dates
            }
            
            currentDay = dayOfWeek;
            currentDate = dateStr;
            rowOrder = 0;
            
            // Get daily total if present
            dailyTotal = dailyTotalCol >= 0 ? parseFloat(String(row[dailyTotalCol] || '').replace(':', '.')) || null : null;
        }
        
        // Check for clock in/out
        const clockIn = inCol >= 0 ? String(row[inCol] || '').trim() : '';
        const clockOut = outCol >= 0 ? String(row[outCol] || '').trim() : '';
        const note = noteCol >= 0 ? String(row[noteCol] || '').trim() : '';
        
        if (clockIn) {
            // Skip this entry if we don't have a valid date yet
            if (!currentDate) {
                console.log(`⚠️ Skipping entry with no date: clock_in=${clockIn}`);
                continue;
            }
            
            // Parse work time (convert HH:MM to decimal hours)
            let workTime = null;
            if (workTimeCol >= 0) {
                const wt = String(row[workTimeCol] || '').trim();
                if (wt) {
                    const parts = wt.split(':');
                    if (parts.length === 2) {
                        workTime = parseFloat(parts[0]) + parseFloat(parts[1]) / 60;
                    } else {
                        workTime = parseFloat(wt);
                    }
                }
            }
            
            entries.push({
                work_date: currentDate,
                day_of_week: currentDay,
                clock_in: clockIn || null,
                clock_out: clockOut || null,
                work_time: workTime,
                daily_total: rowOrder === 0 ? dailyTotal : null,
                note: note || null,
                row_order: rowOrder,
                is_first_row: rowOrder === 0
            });
            
            rowOrder++;
        }
    }
    
    return entries;
}

// Main import function
export async function importTimecardsForDisplay(fileBuffer, filename) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Load Excel
        const workbook = loadExcelWorkbook(fileBuffer);
        const employees = [];
        
        // Parse pay period from filename and Excel
        let payPeriod = parsePeriodFromFilename(filename);
        
        // Process each sheet (each sheet might have different employees)
        for (const sheetName of workbook.SheetNames) {
            const data = getWorksheetData(workbook, sheetName);
            
            // Get pay period from Excel if not from filename
            if (!payPeriod) {
                payPeriod = findPayPeriod(data);
            }
            
            if (!payPeriod) {
                throw new Error('Could not determine pay period from filename or Excel data');
            }
            
            console.log(`\n🔍 Processing sheet: "${sheetName}"`);
            
            // PASS 1: Find ALL employees in this sheet at once
            const employeeInfos = findAllEmployees(data);
            
            if (employeeInfos.length === 0) {
                console.log(`⚠️ No employees found in sheet "${sheetName}"`);
                continue;
            }
            
            console.log(`\n📝 PASS 2: Parsing timecards for ${employeeInfos.length} employees...`);
            
            // PASS 2: Parse each employee's data independently
            for (let i = 0; i < employeeInfos.length; i++) {
                const employeeInfo = employeeInfos[i];
                console.log(`   Processing ${i + 1}/${employeeInfos.length}: ${employeeInfo.name}...`);
                
                const entries = parseEmployeeTimecard(data, employeeInfo, payPeriod);
                
                if (entries.length > 0) {
                    employees.push({
                        name: employeeInfo.name,
                        entries: entries
                    });
                    console.log(`   ✅ Parsed ${entries.length} time entries for ${employeeInfo.name}`);
                } else {
                    console.log(`   ⚠️ No time entries found for ${employeeInfo.name}`);
                }
            }
        }
        
        if (employees.length === 0) {
            throw new Error('No employee timecards found in file');
        }
        
        console.log(`\n✅ SCAN COMPLETE: Found ${employees.length} employees total`);
        console.log(`📊 Employee list:`);
        employees.forEach((emp, idx) => {
            const totalHours = emp.entries.reduce((sum, e) => sum + (e.work_time || 0), 0);
            console.log(`   ${idx + 1}. ${emp.name} - ${emp.entries.length} entries, ${totalHours.toFixed(2)} hours`);
        });
        console.log('');
        
        // Create upload record
        const uploadResult = await client.query(`
            INSERT INTO timecard_uploads (filename, pay_period_start, pay_period_end, employee_count, status)
            VALUES ($1, $2, $3, $4, 'processed')
            RETURNING id
        `, [filename, payPeriod.start, payPeriod.end, employees.length]);
        
        const uploadId = uploadResult.rows[0].id;
        
        // Process each employee
        for (const emp of employees) {
            // Find or skip employee (must exist after our changes)
            // Find or create employee
            let employeeId;
            const empResult = await client.query(`
                SELECT id FROM employees
                WHERE LOWER(TRIM(first_name || ' ' || last_name)) = LOWER(TRIM($1))
                LIMIT 1
            `, [emp.name]);
            
            if (empResult.rows.length === 0) {
                // Auto-create employee if not found
                console.log(`➕ Creating new employee: ${emp.name}`);
                const nameParts = emp.name.trim().split(' ');
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(' ') || firstName;
                
                const createResult = await client.query(`
                    INSERT INTO employees (
                        first_name, last_name, email, hire_date, 
                        employment_type, status, role_title
                    )
                    VALUES ($1, $2, $3, $4, 'Full-time', 'Active', 'Employee')
                    RETURNING id
                `, [
                    firstName, 
                    lastName, 
                    `${firstName.toLowerCase()}.${lastName.toLowerCase()}@imported.local`,
                    payPeriod.start
                ]);
                
                employeeId = createResult.rows[0].id;
            } else {
                employeeId = empResult.rows[0].id;
            }
            
            // Calculate total hours
            const totalHours = emp.entries.reduce((sum, e) => sum + (e.work_time || 0), 0);
            
            // Delete existing timecard for this period (replace old data)
            await client.query(`
                DELETE FROM timecards
                WHERE employee_id = $1 AND pay_period_start = $2 AND pay_period_end = $3
            `, [employeeId, payPeriod.start, payPeriod.end]);
            
            // Create timecard
            const timecardResult = await client.query(`
                INSERT INTO timecards (
                    employee_id, pay_period_start, pay_period_end, 
                    total_hours, upload_id, status
                )
                VALUES ($1, $2, $3, $4, $5, 'Approved')
                RETURNING id
            `, [employeeId, payPeriod.start, payPeriod.end, totalHours, uploadId]);
            
            const timecardId = timecardResult.rows[0].id;
            
            // Insert entries
            for (const entry of emp.entries) {
                await client.query(`
                    INSERT INTO timecard_entries (
                        timecard_id, employee_id, work_date, day_of_week,
                        clock_in, clock_out, hours_worked, daily_total,
                        notes, row_order, is_first_row
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
                    timecardId, employeeId, entry.work_date, entry.day_of_week,
                    entry.clock_in, entry.clock_out, entry.work_time, entry.daily_total,
                    entry.note, entry.row_order, entry.is_first_row
                ]);
            }
        }
        
        await client.query('COMMIT');
        
        return {
            success: true,
            uploadId: uploadId,
            employeeCount: employees.length,
            totalHours: employees.reduce((sum, e) => sum + e.entries.reduce((s, entry) => s + (entry.work_time || 0), 0), 0)
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Import error:', error);
        return {
            error: error.message,
            details: error.stack
        };
    } finally {
        client.release();
    }
}

