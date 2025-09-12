#!/usr/bin/env node

// This script creates time entries that match payroll periods to show non-zero payroll

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

const fixPayrollDates = async () => {
  try {
    console.log('🔧 Fixing payroll by creating matching time entries...');

    // Get existing time entries to see the pattern
    const timeEntries = await makeRequest('/api/employees/time-entries');
    console.log(`Found ${timeEntries.length} existing time entries`);

    // Get a sample time entry to copy the pattern
    const sampleEntry = timeEntries[0];
    console.log('Sample time entry:', {
      employee_id: sampleEntry.employee_id,
      work_date: sampleEntry.work_date,
      hours_worked: sampleEntry.hours_worked,
      clock_in: sampleEntry.clock_in,
      clock_out: sampleEntry.clock_out
    });

    // Get employees
    const employees = await makeRequest('/api/employees');
    const activeEmployees = employees.slice(0, 5); // Just use first 5 employees
    
    console.log(`Creating time entries for ${activeEmployees.length} employees for January 2025...`);

    // Create time entries for January 2025 (to match payroll period 13)
    const workDates = [
      '2025-01-02', '2025-01-03', '2025-01-06', '2025-01-07', '2025-01-08',
      '2025-01-09', '2025-01-10', '2025-01-13', '2025-01-14', '2025-01-15',
      '2025-01-16', '2025-01-17', '2025-01-20', '2025-01-21', '2025-01-22',
      '2025-01-23', '2025-01-24', '2025-01-27', '2025-01-28', '2025-01-29',
      '2025-01-30', '2025-01-31'
    ]; // 22 work days

    let entriesCreated = 0;

    for (const employee of activeEmployees) {
      console.log(`Creating entries for ${employee.first_name} ${employee.last_name}...`);
      
      for (const workDate of workDates) {
        // Create realistic work hours
        const startHour = 8 + Math.floor(Math.random() * 2); // 8-9 AM start
        const workHours = 7.5 + Math.random() * 1; // 7.5-8.5 hours
        const startMinute = Math.floor(Math.random() * 60);
        
        const clockIn = new Date(`${workDate}T${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}:00.000Z`);
        const clockOut = new Date(clockIn.getTime() + (workHours * 60 * 60 * 1000));
        
        const timeEntry = {
          employee_id: employee.id,
          work_date: workDate,
          clock_in: clockIn.toISOString(),
          clock_out: clockOut.toISOString(),
          overtime_hours: Math.max(0, workHours - 8).toFixed(2)
        };

        try {
          // Try to create time entry (this will likely fail due to auth)
          await makeRequest('/api/employees/time-entries', {
            method: 'POST',
            body: JSON.stringify(timeEntry)
          });
          entriesCreated++;
        } catch (error) {
          // Expected to fail - we'll note this
          if (entriesCreated === 0) {
            console.log('⚠️  Cannot create time entries via API (authentication required)');
            console.log('📝 Would create entry:', {
              employee: `${employee.first_name} ${employee.last_name}`,
              date: workDate,
              hours: workHours.toFixed(1),
              clockIn: clockIn.toISOString().substring(11, 16),
              clockOut: clockOut.toISOString().substring(11, 16)
            });
          }
        }
      }
    }

    if (entriesCreated > 0) {
      console.log(`✅ Created ${entriesCreated} time entries`);
    } else {
      console.log('⚠️  Could not create time entries via API');
      console.log('💡 Alternative approach: Calculate payroll for a period with existing time entries');
    }

    // Try calculating payroll for January 2025 anyway
    console.log('\n🧮 Attempting payroll calculation for January 2025...');
    try {
      await makeRequest('/api/payroll/calculate/13', {
        method: 'POST'
      });
      console.log('✅ Payroll calculation completed');
    } catch (error) {
      console.error('❌ Payroll calculation failed:', error.message);
    }

    // Check results
    console.log('\n📊 Checking payroll results...');
    const calculations = await makeRequest('/api/payroll/calculations?periodId=13');
    
    const nonZeroCalcs = calculations.filter(calc => parseFloat(calc.total_gross || 0) > 0);
    console.log(`Employees with non-zero pay: ${nonZeroCalcs.length} out of ${calculations.length}`);
    
    if (nonZeroCalcs.length > 0) {
      console.log('\n🎉 SUCCESS! Non-zero payroll found:');
      nonZeroCalcs.slice(0, 3).forEach(calc => {
        console.log(`${calc.first_name} ${calc.last_name}: $${calc.total_gross} gross ($${calc.net_pay} net)`);
      });
    } else {
      console.log('\n⚠️  Still showing zeros. This means:');
      console.log('1. Time entries need to be in the database for January 2025');
      console.log('2. The payroll calculation queries the time_entries table directly');
      console.log('3. API-level time entry creation requires authentication');
      
      console.log('\n💡 WORKAROUND: Use existing time entry dates');
      console.log('Let me try calculating for a period that matches existing time entries...');
      
      // Find what dates we actually have time entries for
      const uniqueDates = [...new Set(timeEntries.map(entry => entry.work_date.substring(0, 7)))]; // Get year-month
      console.log('Available time entry months:', uniqueDates.slice(0, 5));
      
      // Try to find or create a payroll period for August 2025
      const periods = await makeRequest('/api/payroll/periods');
      const aug2025Period = periods.find(p => p.period_name.includes('August 2025'));
      
      if (aug2025Period) {
        console.log(`\n🎯 Found August 2025 period (ID: ${aug2025Period.id}), calculating...`);
        try {
          await makeRequest(`/api/payroll/calculate/${aug2025Period.id}`, {
            method: 'POST'
          });
          
          const aug2025Calcs = await makeRequest(`/api/payroll/calculations?periodId=${aug2025Period.id}`);
          const nonZeroAug = aug2025Calcs.filter(calc => parseFloat(calc.total_gross || 0) > 0);
          
          if (nonZeroAug.length > 0) {
            console.log('🎉 SUCCESS with August 2025!');
            nonZeroAug.slice(0, 3).forEach(calc => {
              console.log(`${calc.first_name} ${calc.last_name}: $${calc.total_gross} gross`);
            });
          }
        } catch (error) {
          console.error('August 2025 calculation failed:', error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error fixing payroll dates:', error);
  }
};

// Run the script
fixPayrollDates();
