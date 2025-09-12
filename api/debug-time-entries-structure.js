#!/usr/bin/env node

// Debug the time_entries table structure

const API_BASE = 'https://hr-api-wbzs.onrender.com';

const makeRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  
  return response.json();
};

const debugTimeEntries = async () => {
  try {
    console.log('🔍 DEBUGGING TIME ENTRIES STRUCTURE');
    console.log('=' .repeat(45));

    // Get time entries to see the actual structure
    const timeEntries = await makeRequest('/api/employees/time-entries');
    
    console.log(`⏰ Found ${timeEntries.length} total time entries`);

    if (timeEntries.length > 0) {
      const sampleEntry = timeEntries[0];
      console.log('\n📋 SAMPLE TIME ENTRY STRUCTURE:');
      console.log(JSON.stringify(sampleEntry, null, 2));

      console.log('\n🔑 AVAILABLE COLUMNS:');
      Object.keys(sampleEntry).forEach(key => {
        console.log(`  ${key}: ${typeof sampleEntry[key]} = ${sampleEntry[key]}`);
      });

      // Check for common column name variations
      const possibleHoursColumns = ['hours_worked', 'hours', 'total_hours', 'regular_hours'];
      const possibleOvertimeColumns = ['overtime_hours', 'overtime', 'ot_hours'];
      const possibleDateColumns = ['work_date', 'date', 'entry_date'];

      console.log('\n🔍 COLUMN ANALYSIS:');
      possibleHoursColumns.forEach(col => {
        if (sampleEntry.hasOwnProperty(col)) {
          console.log(`  ✅ Found hours column: ${col} = ${sampleEntry[col]}`);
        }
      });

      possibleOvertimeColumns.forEach(col => {
        if (sampleEntry.hasOwnProperty(col)) {
          console.log(`  ✅ Found overtime column: ${col} = ${sampleEntry[col]}`);
        }
      });

      possibleDateColumns.forEach(col => {
        if (sampleEntry.hasOwnProperty(col)) {
          console.log(`  ✅ Found date column: ${col} = ${sampleEntry[col]}`);
        }
      });

      // Look for 2025 entries specifically
      const entries2025 = timeEntries.filter(entry => {
        const dateCol = entry.work_date || entry.date || entry.entry_date;
        return dateCol && dateCol.includes('2025');
      });

      console.log(`\n📅 2025 entries: ${entries2025.length}`);

      if (entries2025.length > 0) {
        const sample2025 = entries2025[0];
        console.log('\n📋 SAMPLE 2025 ENTRY:');
        console.log(`  Employee ID: ${sample2025.employee_id}`);
        console.log(`  Date: ${sample2025.work_date || sample2025.date || sample2025.entry_date}`);
        console.log(`  Hours: ${sample2025.hours_worked || sample2025.hours || 'NOT FOUND'}`);
        console.log(`  Overtime: ${sample2025.overtime_hours || sample2025.overtime || 'NOT FOUND'}`);
        console.log(`  Clock In: ${sample2025.clock_in || 'NOT FOUND'}`);
        console.log(`  Clock Out: ${sample2025.clock_out || 'NOT FOUND'}`);

        // Try to calculate hours from clock in/out if hours_worked is missing
        if (sample2025.clock_in && sample2025.clock_out) {
          const clockIn = new Date(sample2025.clock_in);
          const clockOut = new Date(sample2025.clock_out);
          const diffMs = clockOut - clockIn;
          const hours = diffMs / (1000 * 60 * 60);
          console.log(`  Calculated Hours: ${hours.toFixed(2)}`);
        }
      }

      // Check August 2025 entries specifically
      const augustEntries = entries2025.filter(entry => {
        const dateCol = entry.work_date || entry.date || entry.entry_date;
        return dateCol && dateCol.includes('2025-08');
      });

      console.log(`\n🗓️ August 2025 entries: ${augustEntries.length}`);

      if (augustEntries.length > 0) {
        console.log('\n📊 AUGUST 2025 SUMMARY:');
        
        // Calculate total hours for August
        let totalHours = 0;
        let validEntries = 0;
        
        augustEntries.forEach(entry => {
          let hours = 0;
          
          if (entry.hours_worked) {
            hours = parseFloat(entry.hours_worked);
          } else if (entry.clock_in && entry.clock_out) {
            const clockIn = new Date(entry.clock_in);
            const clockOut = new Date(entry.clock_out);
            const diffMs = clockOut - clockIn;
            hours = diffMs / (1000 * 60 * 60);
          }
          
          if (hours > 0) {
            totalHours += hours;
            validEntries++;
          }
        });

        console.log(`  Valid entries with hours: ${validEntries}`);
        console.log(`  Total hours in August: ${totalHours.toFixed(2)}`);
        console.log(`  Average hours per entry: ${(totalHours / validEntries).toFixed(2)}`);

        // Show employee breakdown
        const employeeHours = {};
        augustEntries.forEach(entry => {
          const empId = entry.employee_id;
          if (!employeeHours[empId]) {
            employeeHours[empId] = 0;
          }
          
          let hours = 0;
          if (entry.hours_worked) {
            hours = parseFloat(entry.hours_worked);
          } else if (entry.clock_in && entry.clock_out) {
            const clockIn = new Date(entry.clock_in);
            const clockOut = new Date(entry.clock_out);
            const diffMs = clockOut - clockIn;
            hours = diffMs / (1000 * 60 * 60);
          }
          
          employeeHours[empId] += hours;
        });

        console.log('\n👥 EMPLOYEE HOURS IN AUGUST:');
        Object.entries(employeeHours).slice(0, 5).forEach(([empId, hours]) => {
          console.log(`  Employee ${empId}: ${hours.toFixed(2)} hours`);
        });
      }
    }

    console.log('\n🎯 DIAGNOSIS:');
    console.log('If hours_worked column exists and has values > 0, payroll should work');
    console.log('If hours_worked is missing or 0, need to calculate from clock_in/clock_out');
    console.log('The payroll calculation queries time_entries for hours_worked column');

  } catch (error) {
    console.error('❌ Error debugging time entries:', error);
  }
};

// Run the debug
debugTimeEntries();
